import { ApiError } from './errors.js';
import { LIMITS } from './constants.js';
import {
    hashPassword, verifyPassword, signToken, randomToken, publicUser, assertRole
} from './auth.js';
import {
    normalizeHousehold, normalizeEmail, normalizeName, validatePassword, assertClientId
} from './validate.js';
import { clearUserCache } from './userCache.js';

const WRITE_ROLES = ['admin', 'enumerator'];

function nowIso() {
    return new Date().toISOString();
}

function newUserId() {
    return `usr_${randomToken(9)}`;
}

function assertCanWrite(user) {
    if (!WRITE_ROLES.includes(user.role)) {
        throw ApiError.forbidden('Your account is read-only. Ask an admin for enumerator access.');
    }
}

// -------------------------------------------------
// Setup / first admin
// -------------------------------------------------

export async function setupStatus(repo) {
    const users = await repo.countUsers();
    return {
        needsBootstrap: users === 0,
        userCount: users,
        setupHint: users === 0
            ? 'Create the first administrator with the BOOTSTRAP_TOKEN from your Worker secrets.'
            : null
    };
}

export async function bootstrap(repo, env, body) {
    if (await repo.countUsers() > 0) {
        throw ApiError.conflict('This deployment already has accounts. Sign in instead.');
    }

    const expected = env.BOOTSTRAP_TOKEN;
    if (!expected) {
        throw ApiError.forbidden(
            'BOOTSTRAP_TOKEN is not set on the Worker. Add it with: npx wrangler secret put BOOTSTRAP_TOKEN'
        );
    }
    if (String(body.token || '') !== String(expected)) {
        throw ApiError.forbidden('That setup token is not correct.');
    }

    const email = normalizeEmail(body.email);
    const name = normalizeName(body.name || 'Administrator', 'name');
    const password = validatePassword(body.password);

    const user = {
        id: newUserId(),
        email,
        name,
        role: 'admin',
        active: true,
        passwordHash: await hashPassword(password, env),
        createdAt: nowIso(),
        updatedAt: nowIso()
    };

    await repo.createUser(user);
    const session = await signToken(user, env);

    return { user: publicUser(user), ...session };
}

// -------------------------------------------------
// Auth
// -------------------------------------------------

export async function login(repo, env, body) {
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');

    const user = await repo.findUserByEmail(email);

    // Always run a hash check so a missing account and a wrong password take similar time.
    const storedHash = user?.passwordHash
        || 'pbkdf2$sha256$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const valid = await verifyPassword(password, storedHash, env);

    if (!user || !valid) {
        throw ApiError.unauthorized('Email or password is not correct.');
    }
    if (user.active === false) {
        throw ApiError.forbidden('This account has been deactivated. Contact an administrator.');
    }

    const session = await signToken(user, env);
    return { user: publicUser(user), ...session };
}

export async function changePassword(repo, env, user, body) {
    const current = await repo.findUserByEmail(user.email);
    if (!current) throw ApiError.notFound('Account not found.');

    const valid = await verifyPassword(String(body.currentPassword || ''), current.passwordHash, env);
    if (!valid) throw ApiError.unauthorized('Your current password is not correct.');

    const password = validatePassword(body.newPassword);
    const updated = await repo.updateUser(user.id, {
        passwordHash: await hashPassword(password, env),
        updatedAt: nowIso()
    });
    clearUserCache(user.id);

    const session = await signToken(updated, env);
    return { user: publicUser(updated), ...session };
}

// -------------------------------------------------
// Users (admin)
// -------------------------------------------------

export async function listUsers(repo, user) {
    assertRole(user, ['admin']);
    const users = await repo.listUsers();
    return { users: users.map(publicUser) };
}

export async function createUser(repo, env, user, body) {
    assertRole(user, ['admin']);

    const email = normalizeEmail(body.email);
    const name = normalizeName(body.name, 'name');
    const role = body.role || 'enumerator';
    if (!['admin', 'enumerator', 'viewer'].includes(role)) {
        throw ApiError.badRequest('Role must be admin, enumerator or viewer.');
    }
    const password = validatePassword(body.password);

    const created = {
        id: newUserId(),
        email,
        name,
        role,
        active: true,
        passwordHash: await hashPassword(password, env),
        createdAt: nowIso(),
        updatedAt: nowIso()
    };

    await repo.createUser(created);
    return { user: publicUser(created) };
}

export async function updateUser(repo, env, actor, targetId, body) {
    assertRole(actor, ['admin']);

    const target = await repo.findUserById(targetId);
    if (!target) throw ApiError.notFound('That account does not exist.');

    const patch = { updatedAt: nowIso() };

    if (body.name !== undefined) patch.name = normalizeName(body.name, 'name');
    if (body.email !== undefined) patch.email = normalizeEmail(body.email);
    if (body.role !== undefined) {
        if (!['admin', 'enumerator', 'viewer'].includes(body.role)) {
            throw ApiError.badRequest('Role must be admin, enumerator or viewer.');
        }
        if (target.id === actor.id && body.role !== 'admin') {
            throw ApiError.badRequest('You cannot remove your own admin access.');
        }
        patch.role = body.role;
    }
    if (body.active !== undefined) {
        if (target.id === actor.id && body.active === false) {
            throw ApiError.badRequest('You cannot deactivate your own account.');
        }
        patch.active = body.active === true;
    }
    if (body.password !== undefined) {
        patch.passwordHash = await hashPassword(validatePassword(body.password), env);
    }

    const updated = await repo.updateUser(targetId, patch);
    clearUserCache(targetId);
    return { user: publicUser(updated) };
}

export async function deleteUser(repo, actor, targetId) {
    assertRole(actor, ['admin']);
    if (targetId === actor.id) {
        throw ApiError.badRequest('You cannot delete your own account.');
    }

    const target = await repo.findUserById(targetId);
    if (!target) throw ApiError.notFound('That account does not exist.');

    const users = await repo.listUsers();
    if (target.role === 'admin' && users.filter(u => u.role === 'admin' && u.active !== false).length <= 1) {
        throw ApiError.badRequest('Keep at least one active administrator.');
    }

    await repo.deleteUser(targetId);
    clearUserCache(targetId);
    return { deleted: targetId };
}

// -------------------------------------------------
// Households
// -------------------------------------------------

function toApi(record) {
    if (!record) return null;
    const { _id, searchText, ...rest } = record;
    return { id: _id, ...rest };
}

export async function listHouseholds(repo, query) {
    const limit = Math.min(
        Math.max(Number(query.limit) || LIMITS.defaultListLimit, 1),
        LIMITS.maxListLimit
    );

    const result = await repo.listHouseholds({
        since: query.since || null,
        includeDeleted: query.includeDeleted === 'true',
        county: query.county || null,
        district: query.district || null,
        status: query.status || null,
        q: query.q || null,
        limit
    });

    return {
        ok: true,
        households: result.records.map(toApi),
        count: result.records.length,
        hasMore: result.hasMore,
        nextSince: result.nextSince || null,
        serverTime: nowIso()
    };
}

export async function getHousehold(repo, id) {
    const record = await repo.getHousehold(assertClientId(id));
    if (!record) throw ApiError.notFound('That household does not exist.');
    return { ok: true, household: toApi(record) };
}

/**
 * Create or update one household.
 *
 * Conflict handling is last-write-wins by `updatedAt`, with an optimistic guard on
 * the exact version that was read. A stale client gets 409 + the current record
 * instead of silently overwriting someone else's work.
 */
export async function saveHousehold(repo, user, id, body) {
    assertCanWrite(user);
    assertClientId(id);

    const existing = await repo.getHousehold(id);

    // Devices that track versions can say exactly which revision they edited.
    if (body?.baseUpdatedAt !== undefined && body.baseUpdatedAt !== null) {
        if (!existing) {
            return {
                ok: false,
                status: 'conflict',
                message: 'That household was deleted on the server.',
                household: null
            };
        }
        if (existing.updatedAt !== body.baseUpdatedAt) {
            return {
                ok: false,
                status: 'conflict',
                message: 'A newer version of this household is already stored.',
                household: toApi(existing)
            };
        }
    }

    const { record, warnings } = normalizeHousehold(body, {
        actorId: user.id,
        existing
    });

    if (!existing && record.deleted) {
        throw ApiError.badRequest('Refusing to create a record that is already marked deleted.');
    }

    // Server copy is newer than this device's change → report a conflict, do not write
    if (existing && record.updatedAt < existing.updatedAt) {
        return {
            ok: false,
            status: 'conflict',
            message: 'A newer version of this household is already stored.',
            household: toApi(existing),
            warnings
        };
    }

    const doc = {
        ...record,
        _id: id,
        rev: (existing?.rev || 0) + 1,
        serverUpdatedAt: nowIso(),
        ownerId: existing?.ownerId || user.id,
        updatedBy: user.id,
        deleted: record.deleted === true,
        deletedAt: record.deleted === true ? existing?.deletedAt || nowIso() : null
    };

    const result = await repo.upsertHousehold(doc, {
        expectedUpdatedAt: existing ? existing.updatedAt : null
    });

    if (result.status === 'conflict') {
        return {
            ok: false,
            status: 'conflict',
            message: 'This household changed on the server while you were editing.',
            household: toApi(result.record),
            warnings
        };
    }

    return {
        ok: true,
        status: result.status,
        household: toApi(result.record),
        warnings
    };
}

export async function deleteHousehold(repo, user, id) {
    assertCanWrite(user);
    assertClientId(id);

    const existing = await repo.getHousehold(id);
    if (!existing) throw ApiError.notFound('That household does not exist.');
    if (existing.deleted) return { ok: true, status: 'already_deleted', id };

    const doc = {
        ...existing,
        deleted: true,
        deletedAt: nowIso(),
        deletedBy: user.id,
        updatedAt: nowIso(),
        updatedBy: user.id,
        rev: (existing.rev || 0) + 1,
        serverUpdatedAt: nowIso()
    };

    const result = await repo.upsertHousehold(doc, { expectedUpdatedAt: existing.updatedAt });
    if (result.status === 'conflict') {
        return {
            ok: false,
            status: 'conflict',
            message: 'This household changed on the server. Re-sync and try again.',
            household: toApi(result.record)
        };
    }

    return { ok: true, status: 'deleted', id };
}

export async function restoreHousehold(repo, user, id) {
    assertCanWrite(user);
    assertClientId(id);

    const existing = await repo.getHousehold(id);
    if (!existing) throw ApiError.notFound('That household does not exist.');
    if (!existing.deleted) return { ok: true, status: 'active', household: toApi(existing) };

    const doc = {
        ...existing,
        deleted: false,
        deletedAt: null,
        deletedBy: null,
        updatedAt: nowIso(),
        updatedBy: user.id,
        rev: (existing.rev || 0) + 1,
        serverUpdatedAt: nowIso()
    };

    const result = await repo.upsertHousehold(doc, { expectedUpdatedAt: existing.updatedAt });
    if (result.status === 'conflict') {
        return { ok: false, status: 'conflict', household: toApi(result.record) };
    }
    return { ok: true, status: 'restored', household: toApi(result.record) };
}

export async function purgeHousehold(repo, user, id) {
    assertRole(user, ['admin']);
    assertClientId(id);

    const removed = await repo.hardDeleteHousehold(id);
    if (!removed) throw ApiError.notFound('That household does not exist.');
    return { ok: true, status: 'purged', id };
}

/**
 * Batch push from the offline queue.
 * Each item is independent: one invalid record never blocks the rest of the batch.
 */
export async function syncPush(repo, user, body) {
    assertCanWrite(user);

    const households = Array.isArray(body.households) ? body.households : null;
    if (!households) throw ApiError.badRequest('Send { "households": [...] }.');

    if (households.length > LIMITS.maxHouseholdsPerSync) {
        throw ApiError.badRequest(
            `Send at most ${LIMITS.maxHouseholdsPerSync} households per sync request.`
        );
    }

    const results = [];

    for (const item of households) {
        const id = item?.id || item?.record?.id;
        try {
            if (!id) throw ApiError.badRequest('Each queued household needs an id.');
            const payload = item.record || item;
            const outcome = await saveHousehold(repo, user, id, payload);
            results.push({
                id,
                status: outcome.status,
                ok: outcome.ok === true,
                household: outcome.household || null,
                warnings: outcome.warnings || []
            });
        } catch (error) {
            results.push({
                id: id || null,
                status: 'rejected',
                ok: false,
                error: {
                    code: error.code || 'server_error',
                    message: error.message || 'Could not save this household.',
                    details: error.details || null
                }
            });
        }
    }

    const summary = results.reduce((acc, entry) => {
        acc[entry.status] = (acc[entry.status] || 0) + 1;
        return acc;
    }, {});

    return {
        ok: true,
        results,
        summary,
        serverTime: nowIso(),
        latest: (await repo.listHouseholds({ limit: 1, since: null })).nextSince || null
    };
}

export async function stats(repo) {
    return { ok: true, stats: await repo.stats() };
}
