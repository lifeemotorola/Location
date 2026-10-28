import { MongoClient } from 'mongodb';
import { ApiError } from '../errors.js';

const USERS = 'users';
const HOUSEHOLDS = 'households';

/**
 * MongoDB Atlas repository.
 *
 * Connections are expensive from Workers (TCP + TLS + auth on every cold start),
 * so the client is created once per isolate and reused across requests. For a
 * shared pool across isolates, bind a Durable Object and hold the client there.
 */
export class MongoRepository {
    constructor({ uri, dbName, clientOptions = {} }) {
        if (!uri) {
            throw ApiError.server('MONGODB_URI is not configured on this Worker.');
        }
        if (!dbName) {
            throw ApiError.server('MONGODB_DB is not configured.');
        }

        this.dbName = dbName;
        this.client = new MongoClient(uri, {
            maxPoolSize: 5,
            minPoolSize: 0,
            maxIdleTimeMS: 30_000,
            serverSelectionTimeoutMS: 8_000,
            retryWrites: true,
            ...clientOptions
        });
        this.connected = null;
    }

    async init() {
        if (!this.connected) {
            this.connected = this.client.connect().then(async () => {
                const db = this.client.db(this.dbName);

                // Safe to call repeatedly: indexes are only created when missing.
                await Promise.all([
                    db.collection(USERS).createIndex({ email: 1 }, { unique: true }),
                    db.collection(HOUSEHOLDS).createIndex({ serverUpdatedAt: 1, _id: 1 }),
                    db.collection(HOUSEHOLDS).createIndex({ county: 1, community: 1 }),
                    db.collection(HOUSEHOLDS).createIndex({ ownerId: 1 }),
                    db.collection(HOUSEHOLDS).createIndex(
                        { searchText: 'text' },
                        { name: 'household_search', default_language: 'none' }
                    )
                ]);
                return db;
            }).catch(error => {
                this.connected = null;
                throw error;
            });
        }
        return this.connected;
    }

    async db() {
        await this.init();
        return this.client.db(this.dbName);
    }

    // ---------- users ----------

    async countUsers() {
        const db = await this.db();
        return db.collection(USERS).countDocuments({});
    }

    async findUserByEmail(email) {
        const db = await this.db();
        return db.collection(USERS).findOne(
            { email: String(email || '').toLowerCase() },
            { projection: { _id: 0 } }
        );
    }

    async findUserById(id) {
        const db = await this.db();
        return db.collection(USERS).findOne({ id }, { projection: { _id: 0 } });
    }

    async createUser(user) {
        const db = await this.db();
        try {
            await db.collection(USERS).insertOne({ ...user });
        } catch (error) {
            if (error?.code === 11000) {
                throw ApiError.conflict('An account with that email already exists.');
            }
            throw error;
        }
        return { ...user };
    }

    async updateUser(id, patch) {
        const db = await this.db();
        const updates = { ...patch };
        delete updates.id;

        try {
            const result = await db.collection(USERS).findOneAndUpdate(
                { id },
                { $set: updates },
                { returnDocument: 'after', projection: { _id: 0 } }
            );
            return result || null;
        } catch (error) {
            if (error?.code === 11000) {
                throw ApiError.conflict('An account with that email already exists.');
            }
            throw error;
        }
    }

    async deleteUser(id) {
        const db = await this.db();
        const result = await db.collection(USERS).deleteOne({ id });
        return result.deletedCount === 1;
    }

    async listUsers() {
        const db = await this.db();
        return db.collection(USERS)
            .find({}, { projection: { _id: 0, passwordHash: 0 } })
            .sort({ email: 1 })
            .toArray();
    }

    // ---------- households ----------

    async getHousehold(id) {
        const db = await this.db();
        return db.collection(HOUSEHOLDS).findOne({ _id: id });
    }

    /**
     * Insert or replace a household, guarded by the version the caller last saw.
     * `expectedUpdatedAt === null` means "this must not exist yet".
     */
    async upsertHousehold(doc, { expectedUpdatedAt = null } = {}) {
        const db = await this.db();
        const collection = db.collection(HOUSEHOLDS);

        if (expectedUpdatedAt === null) {
            try {
                await collection.insertOne({ ...doc });
                return { status: 'created', record: { ...doc } };
            } catch (error) {
                if (error?.code === 11000) {
                    const current = await collection.findOne({ _id: doc._id });
                    return { status: 'conflict', record: current };
                }
                throw error;
            }
        }

        const { _id, ...rest } = doc;
        const result = await collection.findOneAndUpdate(
            { _id, updatedAt: expectedUpdatedAt },
            { $set: rest },
            { returnDocument: 'after' }
        );

        if (result) return { status: 'updated', record: result };

        const current = await collection.findOne({ _id });
        return { status: 'conflict', record: current };
    }

    async hardDeleteHousehold(id) {
        const db = await this.db();
        const result = await db.collection(HOUSEHOLDS).deleteOne({ _id: id });
        return result.deletedCount === 1;
    }

    async listHouseholds({
        since = null, includeDeleted = false, county = null, district = null,
        status = null, q = null, limit = 200
    } = {}) {
        const db = await this.db();
        const filter = {};

        if (!includeDeleted) filter.deleted = { $ne: true };
        if (since) filter.serverUpdatedAt = { $gt: since };
        if (county) filter.county = county;
        if (district) filter.district = district;
        if (status) filter.houseStatus = status;
        if (q) filter.searchText = { $regex: escapeRegex(String(q).toLowerCase()), $options: 'i' };

        const docs = await db.collection(HOUSEHOLDS)
            .find(filter)
            .sort({ serverUpdatedAt: 1, _id: 1 })
            .limit(limit + 1)
            .toArray();

        const hasMore = docs.length > limit;
        const page = docs.slice(0, limit);

        return {
            records: page,
            hasMore,
            nextSince: page.length > 0 ? page[page.length - 1].serverUpdatedAt : since
        };
    }

    async stats() {
        const db = await this.db();
        const match = { deleted: { $ne: true } };

        const [aggregate] = await db.collection(HOUSEHOLDS).aggregate([
            { $match: match },
            {
                $facet: {
                    totals: [{
                        $group: {
                            _id: null,
                            households: { $sum: 1 },
                            residents: { $sum: '$totalPersons' },
                            male: { $sum: '$totalMale' },
                            female: { $sum: '$totalFemale' },
                            minors: { $sum: '$totalMinors' },
                            seniors: { $sum: '$totalSenior' },
                            pwd: { $sum: '$totalPwd' },
                            consent: { $sum: { $cond: ['$consent', 1, 0] } },
                            improvedWater: {
                                $sum: {
                                    $cond: [{
                                        $in: ['$waterSource', [
                                            'lwsc_piped', 'kiosk', 'handpump',
                                            'protected_well', 'rainwater'
                                        ]]
                                    }, 1, 0]
                                }
                            },
                            flushOrVip: {
                                $sum: { $cond: [{ $in: ['$toiletType', ['flush', 'vip']] }, 1, 0] }
                            },
                            electricity: {
                                $sum: {
                                    $cond: [{
                                        $and: [
                                            { $ne: ['$electricitySource', 'none'] },
                                            { $ne: ['$electricitySource', ''] },
                                            { $ne: ['$electricitySource', null] }
                                        ]
                                    }, 1, 0]
                                }
                            },
                            mobileMoney: {
                                $sum: {
                                    $cond: [{
                                        $and: [
                                            { $ne: ['$mobileMoney', 'none'] },
                                            { $ne: ['$mobileMoney', ''] },
                                            { $ne: ['$mobileMoney', null] }
                                        ]
                                    }, 1, 0]
                                }
                            }
                        }
                    }],
                    statuses: [
                        { $group: { _id: '$houseStatus', count: { $sum: 1 } } }
                    ],
                    counties: [
                        {
                            $group: {
                                _id: '$county',
                                households: { $sum: 1 },
                                residents: { $sum: '$totalPersons' }
                            }
                        },
                        { $sort: { households: -1 } }
                    ]
                }
            }
        ]).toArray();

        const rawTotals = aggregate?.totals?.[0] || {};
        const statuses = { owner: 0, renter: 0, caretaker: 0, vacant: 0, business: 0 };
        (aggregate?.statuses || []).forEach(entry => {
            if (entry._id && statuses[entry._id] !== undefined) statuses[entry._id] = entry.count;
        });

        return {
            totals: {
                households: rawTotals.households || 0,
                residents: rawTotals.residents || 0,
                male: rawTotals.male || 0,
                female: rawTotals.female || 0,
                minors: rawTotals.minors || 0,
                seniors: rawTotals.seniors || 0,
                pwd: rawTotals.pwd || 0,
                consent: rawTotals.consent || 0
            },
            statuses,
            counties: (aggregate?.counties || []).map(entry => ({
                county: entry._id || 'Not recorded',
                households: entry.households,
                residents: entry.residents || 0
            })),
            services: {
                improvedWater: rawTotals.improvedWater || 0,
                flushOrVip: rawTotals.flushOrVip || 0,
                electricity: rawTotals.electricity || 0,
                mobileMoney: rawTotals.mobileMoney || 0
            },
            updatedAt: new Date().toISOString()
        };
    }
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Kept per isolate so warm requests skip TCP + TLS + auth.
let cached = null;

export function getMongoRepository(env) {
    const uri = env.MONGODB_URI;
    const dbName = env.MONGODB_DB || 'liberia_locator';
    const key = `${dbName}::${uri}`;

    if (cached && cached.key === key) return cached.repo;

    const repo = new MongoRepository({ uri, dbName });
    cached = { key, repo };
    return repo;
}
