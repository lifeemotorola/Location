import { ApiError } from './errors.js';

const BASE_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store'
};

export function json(data, { status = 200, headers = {}, requestId } = {}) {
    const allHeaders = new Headers(BASE_HEADERS);
    allHeaders.set('Content-Type', 'application/json; charset=utf-8');

    Object.entries(headers).forEach(([key, value]) => {
        if (value !== undefined && value !== null) allHeaders.set(key, value);
    });

    if (requestId) allHeaders.set('X-Request-Id', requestId);

    return new Response(JSON.stringify(data), { status, headers: allHeaders });
}

export function errorResponse(error, { headers = {}, requestId, logger = console } = {}) {
    const isApiError = error instanceof ApiError;
    const status = isApiError ? error.status : 500;
    const code = isApiError ? error.code : 'server_error';
    const message = isApiError ? error.message : 'Unexpected server error.';

    if (!isApiError) {
        logger.error?.('unhandled API error', error?.stack || error);
    }

    return json(
        {
            ok: false,
            error: { code, message, ...(error?.details ? { details: error.details } : {}) },
            requestId
        },
        { status, headers, requestId }
    );
}

/**
 * CORS is allowlist based: only origins listed in ALLOWED_ORIGINS are echoed back.
 * Requests without an Origin (curl, native apps) are allowed through untouched.
 */
export function corsHeaders(request, env) {
    const origin = request.headers.get('Origin');
    const allowed = String(env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);

    const headers = {
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization,Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin'
    };

    if (origin && allowed.includes(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
        headers['Access-Control-Allow-Credentials'] = 'true';
    }

    return headers;
}

export function preflight(request, env) {
    const headers = corsHeaders(request, env);
    const origin = request.headers.get('Origin');

    // Reject preflights from origins that are not on the allowlist
    if (origin && !headers['Access-Control-Allow-Origin']) {
        return new Response(null, { status: 403, headers });
    }

    return new Response(null, { status: 204, headers });
}

export async function readJson(request, maxBytes = 1_000_000) {
    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.includes('application/json')) {
        throw ApiError.badRequest('Send JSON with Content-Type: application/json.');
    }

    const declaredLength = Number(request.headers.get('Content-Length') || 0);
    if (declaredLength > maxBytes) {
        throw new ApiError(413, 'payload_too_large', 'That payload is too large.');
    }

    const text = await request.text();
    if (text.length > maxBytes) {
        throw new ApiError(413, 'payload_too_large', 'That payload is too large.');
    }
    if (!text) return {};

    try {
        const parsed = JSON.parse(text);
        if (parsed === null || typeof parsed !== 'object') {
            throw new Error('not an object');
        }
        return parsed;
    } catch {
        throw ApiError.badRequest('The request body is not valid JSON.');
    }
}

export function clientIp(request) {
    return request.headers.get('CF-Connecting-IP')
        || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
        || 'unknown';
}

/**
 * Best-effort, per-isolate rate limiting. Cloudflare may run several isolates,
 * so this is a speed bump rather than a hard guarantee. Pair it with strong
 * passwords and Cloudflare WAF rate-limiting rules for production.
 */
export function createRateLimiter({ windowMs = 10 * 60 * 1000, max = 10 } = {}) {
    const hits = new Map();

    return function limit(key) {
        const now = Date.now();
        const entry = hits.get(key);

        if (!entry || now - entry.start > windowMs) {
            hits.set(key, { start: now, count: 1 });
            return { allowed: true, remaining: max - 1 };
        }

        entry.count += 1;
        if (hits.size > 5000) hits.clear(); // keep memory bounded

        return {
            allowed: entry.count <= max,
            remaining: Math.max(0, max - entry.count),
            retryAfterSeconds: Math.ceil((windowMs - (now - entry.start)) / 1000)
        };
    };
}
