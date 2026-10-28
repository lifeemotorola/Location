import { ApiError } from '../errors.js';
import { MongoRepository, getMongoRepository } from './mongo.js';
import { MemoryRepository } from './memory.js';

/**
 * Choose a repository for this request.
 *
 * - MONGODB_URI set            → MongoDB Atlas (production)
 * - env.REPO injected          → used as-is (tests, or a Durable Object stub)
 * - ALLOW_MEMORY === 'true'    → in-memory store for local UI work only
 */
export function resolveRepository(env) {
    if (env.REPO) return env.REPO;

    if (env.MONGODB_URI) {
        return getMongoRepository(env);
    }

    if (env.ALLOW_MEMORY === 'true') {
        return getMemoryRepository();
    }

    throw new ApiError(
        503,
        'database_not_configured',
        'The API has no database. Set MONGODB_URI with: npx wrangler secret put MONGODB_URI'
    );
}

let memoryRepo = null;

export function getMemoryRepository(seed) {
    if (!memoryRepo) memoryRepo = new MemoryRepository(seed);
    return memoryRepo;
}

export function resetMemoryRepository() {
    memoryRepo = null;
}

export { MongoRepository, MemoryRepository };
