import { ApiError } from '../errors.js';

/**
 * In-memory repository with the same contract as the MongoDB one.
 * Used by the automated tests and by `wrangler dev` when ALLOW_MEMORY=true.
 * Data lives in the isolate, so it disappears on reload — never use it in production.
 */
export class MemoryRepository {
    constructor(seed = {}) {
        this.users = new Map();
        this.households = new Map();

        (seed.users || []).forEach(user => this.users.set(user.id, { ...user }));
        (seed.households || []).forEach(record => this.households.set(record._id, { ...record }));
    }

    async init() { /* nothing to prepare */ }

    // ---------- users ----------

    async countUsers() {
        return this.users.size;
    }

    async findUserByEmail(email) {
        const needle = String(email || '').toLowerCase();
        for (const user of this.users.values()) {
            if (user.email === needle) return { ...user };
        }
        return null;
    }

    async findUserById(id) {
        const user = this.users.get(id);
        return user ? { ...user } : null;
    }

    async createUser(user) {
        if ([...this.users.values()].some(existing => existing.email === user.email)) {
            throw ApiError.conflict('An account with that email already exists.');
        }
        this.users.set(user.id, { ...user });
        return { ...user };
    }

    async updateUser(id, patch) {
        const existing = this.users.get(id);
        if (!existing) return null;

        if (patch.email && patch.email !== existing.email
            && [...this.users.values()].some(user => user.email === patch.email && user.id !== id)) {
            throw ApiError.conflict('An account with that email already exists.');
        }

        const updated = { ...existing, ...patch, id };
        this.users.set(id, updated);
        return { ...updated };
    }

    async deleteUser(id) {
        return this.users.delete(id);
    }

    async listUsers() {
        return [...this.users.values()]
            .map(user => ({ ...user }))
            .sort((a, b) => a.email.localeCompare(b.email));
    }

    // ---------- households ----------

    async getHousehold(id) {
        const record = this.households.get(id);
        return record ? { ...record } : null;
    }

    /**
     * Write with optimistic concurrency: `expectedUpdatedAt` is the version the
     * caller read (null when creating). Returns a conflict instead of clobbering.
     */
    async upsertHousehold(doc, { expectedUpdatedAt = null } = {}) {
        const existing = this.households.get(doc._id);

        if (expectedUpdatedAt === null) {
            if (existing) {
                return { status: 'conflict', record: { ...existing } };
            }
        } else if (!existing || existing.updatedAt !== expectedUpdatedAt) {
            return { status: 'conflict', record: existing ? { ...existing } : null };
        }

        this.households.set(doc._id, { ...doc });
        return { status: existing ? 'updated' : 'created', record: { ...doc } };
    }

    async hardDeleteHousehold(id) {
        return this.households.delete(id);
    }

    async listHouseholds({
        since = null, includeDeleted = false, county = null, district = null,
        status = null, q = null, limit = 200
    } = {}) {
        let records = [...this.households.values()];

        if (!includeDeleted) records = records.filter(record => record.deleted !== true);
        if (since) records = records.filter(record => record.serverUpdatedAt > since);
        if (county) records = records.filter(record => record.county === county);
        if (district) records = records.filter(record => record.district === district);
        if (status) records = records.filter(record => record.houseStatus === status);
        if (q) {
            const needle = String(q).toLowerCase();
            records = records.filter(record => (record.searchText || '').includes(needle));
        }

        records.sort((a, b) => {
            if (a.serverUpdatedAt === b.serverUpdatedAt) return a._id.localeCompare(b._id);
            return a.serverUpdatedAt < b.serverUpdatedAt ? -1 : 1;
        });

        const page = records.slice(0, limit).map(record => ({ ...record }));

        return {
            records: page,
            hasMore: records.length > limit,
            nextSince: page.length > 0 ? page[page.length - 1].serverUpdatedAt : since
        };
    }

    async stats() {
        const active = [...this.households.values()].filter(record => record.deleted !== true);

        const totals = {
            households: active.length,
            residents: 0, male: 0, female: 0, minors: 0, seniors: 0, pwd: 0, consent: 0
        };
        const statuses = { owner: 0, renter: 0, caretaker: 0, vacant: 0, business: 0 };
        const counties = new Map();
        const services = { improvedWater: 0, flushOrVip: 0, electricity: 0, mobileMoney: 0 };

        const improvedWater = new Set([
            'lwsc_piped', 'kiosk', 'handpump', 'protected_well', 'rainwater'
        ]);

        active.forEach(record => {
            totals.residents += Number(record.totalPersons) || 0;
            totals.male += Number(record.totalMale) || 0;
            totals.female += Number(record.totalFemale) || 0;
            totals.minors += Number(record.totalMinors) || 0;
            totals.seniors += Number(record.totalSenior) || 0;
            totals.pwd += Number(record.totalPwd) || 0;
            if (record.consent) totals.consent += 1;

            if (statuses[record.houseStatus] !== undefined) statuses[record.houseStatus] += 1;

            const key = record.county || 'Not recorded';
            const entry = counties.get(key) || { county: key, households: 0, residents: 0 };
            entry.households += 1;
            entry.residents += Number(record.totalPersons) || 0;
            counties.set(key, entry);

            if (improvedWater.has(record.waterSource)) services.improvedWater += 1;
            if (['flush', 'vip'].includes(record.toiletType)) services.flushOrVip += 1;
            if (record.electricitySource && record.electricitySource !== 'none') services.electricity += 1;
            if (record.mobileMoney && record.mobileMoney !== 'none') services.mobileMoney += 1;
        });

        return {
            totals,
            statuses,
            counties: [...counties.values()].sort((a, b) => b.households - a.households),
            services,
            updatedAt: new Date().toISOString()
        };
    }
}
