import { Router } from './router.js';
import { ApiError } from './errors.js';
import {
    json, errorResponse, corsHeaders, preflight, readJson, clientIp, createRateLimiter
} from './http.js';
import { resolveRepository } from './repo/index.js';
import { bearerToken, verifyToken, publicUser } from './auth.js';
import { getCachedUser, cacheUser } from './userCache.js';
import * as service from './service.js';

const API_PREFIX = '/api';

// 10 attempts / 10 minutes per IP+email.
// The maximum is overridable for local load/E2E testing only; production
// deployments leave LOGIN_RATE_LIMIT unset and get the default.
const limiters = new Map();
function limiter(name, { windowMs, max }) {
    if (!limiters.has(name)) limiters.set(name, createRateLimiter({ windowMs, max }));
    return limiters.get(name);
}
const loginMax = (env) => {
    const configured = Number(env?.LOGIN_RATE_LIMIT);
    return Number.isFinite(configured) && configured > 0 ? configured : 10;
};

const router = new Router();

// -------------------------------------------------
// Health & setup
// -------------------------------------------------
router.get('/api/health', async ({ env }) => {
    const repoName = env.REPO?.constructor?.name || '';
    const hasDb = Boolean(env.MONGODB_URI || env.REPO || env.ALLOW_MEMORY === 'true');

    const database = env.MONGODB_URI || repoName === 'MongoRepository'
        ? 'mongodb'
        : repoName === 'MemoryRepository' || env.ALLOW_MEMORY === 'true'
            ? 'memory'
            : 'unconfigured';

    // MONGODB_URI is only required when the repository actually talks to Atlas
    const requiredSecrets = ['JWT_SECRET'];
    if (!env.REPO && repoName !== 'MemoryRepository' && env.ALLOW_MEMORY !== 'true') {
        requiredSecrets.push('MONGODB_URI');
    }
    const missingSecrets = requiredSecrets.filter(name => !env[name]);

    return json({
        ok: hasDb && missingSecrets.length === 0,
        service: 'liberia-locator-api',
        version: '1.0.0',
        database,
        ...(missingSecrets.length > 0 ? { missingSecrets } : {}),
        time: new Date().toISOString(),
        ...(hasDb ? {} : {
            hint: 'Set MONGODB_URI with: npx wrangler secret put MONGODB_URI'
        })
    }, { status: hasDb && missingSecrets.length === 0 ? 200 : 503 });
});

router.get('/api/setup/status', async ({ repo }) => {
    return json({ ok: true, ...(await service.setupStatus(repo)) });
});

router.post('/api/setup/bootstrap', async ({ request, env, repo }) => {
    // 5 attempts / hour for the one-time bootstrap
    const limit = limiter('bootstrap', { windowMs: 60 * 60 * 1000, max: 5 })(clientIp(request));
    if (!limit.allowed) throw ApiError.tooMany('Too many setup attempts. Try again later.');

    const body = await readJson(request);
    return json({ ok: true, ...(await service.bootstrap(repo, env, body)) }, { status: 201 });
});

// -------------------------------------------------
// Auth
// -------------------------------------------------
router.post('/api/auth/login', async ({ request, env, repo }) => {
    const body = await readJson(request);
    const key = `${clientIp(request)}:${String(body.email || '').toLowerCase()}`;

    const limit = limiter(`login:${loginMax(env)}`, { windowMs: 10 * 60 * 1000, max: loginMax(env) })(key);
    if (!limit.allowed) {
        throw ApiError.tooMany('Too many sign-in attempts. Wait a few minutes and try again.');
    }

    return json({ ok: true, ...(await service.login(repo, env, body)) });
});

router.get('/api/auth/me', async ({ user, env }) => {
    return json({
        ok: true,
        user: publicUser(user),
        session: { role: user.role, expiresInSeconds: Number(env.AUTH_TTL_SECONDS || 604800) }
    });
});

router.post('/api/auth/password', async ({ request, env, repo, user }) => {
    const body = await readJson(request);
    return json({ ok: true, ...(await service.changePassword(repo, env, user, body)) });
});

// -------------------------------------------------
// Users (admin)
// -------------------------------------------------
router.get('/api/users', async ({ repo, user }) => {
    return json({ ok: true, ...(await service.listUsers(repo, user)) });
});

router.post('/api/users', async ({ request, env, repo, user }) => {
    const body = await readJson(request);
    return json({ ok: true, ...(await service.createUser(repo, env, user, body)) }, { status: 201 });
});

router.patch('/api/users/:id', async ({ request, env, repo, user, params }) => {
    const body = await readJson(request);
    return json({ ok: true, ...(await service.updateUser(repo, env, user, params.id, body)) });
});

router.delete('/api/users/:id', async ({ repo, user, params }) => {
    return json({ ok: true, ...(await service.deleteUser(repo, user, params.id)) });
});

// -------------------------------------------------
// Households
// -------------------------------------------------
router.get('/api/households', async ({ repo, request }) => {
    const query = Object.fromEntries(new URL(request.url).searchParams.entries());
    return json(await service.listHouseholds(repo, query));
});

router.get('/api/households/:id', async ({ repo, params }) => {
    return json(await service.getHousehold(repo, params.id));
});

router.post('/api/households/:id', async ({ request, repo, user, params }) => {
    const body = await readJson(request, 2_000_000);
    const result = await service.saveHousehold(repo, user, params.id, body);
    return json(result, { status: result.status === 'conflict' ? 409 : (result.status === 'created' ? 201 : 200) });
});

router.delete('/api/households/:id', async ({ repo, user, params }) => {
    const result = await service.deleteHousehold(repo, user, params.id);
    return json(result, { status: result.status === 'conflict' ? 409 : 200 });
});

router.post('/api/households/:id/restore', async ({ repo, user, params }) => {
    const result = await service.restoreHousehold(repo, user, params.id);
    return json(result, { status: result.status === 'conflict' ? 409 : 200 });
});

router.delete('/api/households/:id/purge', async ({ repo, user, params }) => {
    return json(await service.purgeHousehold(repo, user, params.id));
});

// -------------------------------------------------
// Offline sync
// -------------------------------------------------
router.post('/api/sync/push', async ({ request, repo, user }) => {
    const body = await readJson(request, 5_000_000);
    return json(await service.syncPush(repo, user, body));
});

// -------------------------------------------------
// Stats
// -------------------------------------------------
router.get('/api/stats', async ({ repo }) => {
    return json(await service.stats(repo));
});

// -------------------------------------------------
// Auth helper
// -------------------------------------------------
async function authenticate(request, env, repo) {
    const token = bearerToken(request);
    if (!token) throw ApiError.unauthorized('Sign in to continue.');

    const payload = await verifyToken(token, env);

    const cached = getCachedUser(payload.sub);
    if (cached) return cached;

    const user = await repo.findUserById(payload.sub);
    if (!user) throw ApiError.unauthorized('That account no longer exists.');
    if (user.active === false) throw ApiError.forbidden('This account has been deactivated.');

    const shaped = publicUser(user);
    cacheUser(shaped);
    return shaped;
}

function isPublic(routePath, method) {
    const publicRoutes = new Set([
        'GET /api/health',
        'GET /api/setup/status',
        'POST /api/setup/bootstrap',
        'POST /api/auth/login'
    ]);
    return publicRoutes.has(`${method} ${routePath}`);
}

// -------------------------------------------------
// Worker entry point
// -------------------------------------------------
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const started = Date.now();
        const requestId = crypto.randomUUID();
        const cors = corsHeaders(request, env);

        if (request.method === 'OPTIONS') return preflight(request, env);

        if (!url.pathname.startsWith(API_PREFIX)) {
            return json({
                ok: false,
                error: {
                    code: 'not_found',
                    message: 'This Worker only serves /api/*. The app itself is hosted on GitHub Pages.',
                    docs: '/api/health'
                },
                requestId
            }, { status: 404, headers: cors, requestId });
        }

        try {
            const matched = router.match(request.method, url.pathname);
            if (!matched) {
                throw ApiError.notFound(`No API route matches ${request.method} ${url.pathname}.`);
            }

            const publicRoute = isPublic(url.pathname, request.method);
            const context = {
                request,
                env,
                params: matched.params,
                url,
                user: null
            };

            // Resolved on first use so /api/health can report a missing database
            // instead of failing with the same error it is meant to describe.
            let repoInstance = null;
            Object.defineProperty(context, 'repo', {
                get() {
                    if (!repoInstance) repoInstance = resolveRepository(env);
                    return repoInstance;
                },
                enumerable: true
            });

            if (!publicRoute) {
                context.user = await authenticate(request, env, context.repo);
            }

            const response = await matched.handler(context);

            // Preserve handler headers, add CORS + request id
            const merged = new Headers(response.headers);
            Object.entries(cors).forEach(([key, value]) => merged.set(key, value));
            merged.set('X-Request-Id', requestId);

            ctx.waitUntil?.(Promise.resolve().then(() => {
                console.log(JSON.stringify({
                    requestId,
                    method: request.method,
                    path: url.pathname,
                    status: response.status,
                    ms: Date.now() - started,
                    user: context.user?.id || null
                }));
            }));

            return new Response(response.body, { status: response.status, headers: merged });
        } catch (error) {
            const response = errorResponse(error, { headers: cors, requestId });
            console.error(JSON.stringify({
                requestId,
                method: request.method,
                path: url.pathname,
                status: response.status,
                ms: Date.now() - started,
                code: error?.code || 'server_error'
            }));
            return response;
        }
    }
};
