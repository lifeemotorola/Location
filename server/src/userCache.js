// Short-lived cache of authenticated users so warm requests skip a database read.
// Invalidated whenever an account is changed by an administrator.
const TTL_MS = 30_000;
const entries = new Map();

export function getCachedUser(id) {
    const entry = entries.get(id);
    if (!entry) return null;
    if (Date.now() - entry.fetchedAt > TTL_MS) {
        entries.delete(id);
        return null;
    }
    return entry.user;
}

export function cacheUser(user) {
    entries.set(user.id, { user, fetchedAt: Date.now() });
    if (entries.size > 2000) entries.clear();
}

export function clearUserCache(id) {
    if (id) entries.delete(id);
    else entries.clear();
}
