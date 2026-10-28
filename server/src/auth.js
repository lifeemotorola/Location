import { ApiError } from './errors.js';

const ISSUER = 'liberia-locator-api';
const DEFAULT_ITERATIONS = 210_000;
const MIN_ITERATIONS = 50_000;

// ---------- encoding helpers ----------

function toBase64Url(bytes) {
    let binary = '';
    const view = new Uint8Array(bytes);
    for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value) {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/')
        .padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function encodeJson(value) {
    return toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function decodeJson(value) {
    return JSON.parse(new TextDecoder().decode(fromBase64Url(value)));
}

export function randomToken(bytes = 24) {
    const buffer = new Uint8Array(bytes);
    crypto.getRandomValues(buffer);
    return toBase64Url(buffer);
}

function timingSafeEqual(a, b) {
    const left = typeof a === 'string' ? new TextEncoder().encode(a) : a;
    const right = typeof b === 'string' ? new TextEncoder().encode(b) : b;
    if (left.length !== right.length) return false;

    let diff = 0;
    for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
    return diff === 0;
}

// ---------- password hashing ----------

export function passwordIterations(env) {
    const configured = Number(env.PASSWORD_ITERATIONS || DEFAULT_ITERATIONS);
    return Number.isFinite(configured) && configured >= MIN_ITERATIONS
        ? Math.floor(configured)
        : DEFAULT_ITERATIONS;
}

export async function hashPassword(password, env = {}) {
    const iterations = passwordIterations(env);
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);

    const keyMaterial = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
        keyMaterial,
        256
    );

    return `pbkdf2$sha256$${iterations}$${toBase64Url(salt)}$${toBase64Url(bits)}`;
}

export async function verifyPassword(password, stored, env = {}) {
    if (typeof stored !== 'string') return false;
    const [scheme, hashName, iterationsRaw, saltRaw, hashRaw] = stored.split('$');
    if (scheme !== 'pbkdf2' || hashName !== 'sha256' || !saltRaw || !hashRaw) return false;

    const iterations = Number(iterationsRaw);
    if (!Number.isFinite(iterations) || iterations < MIN_ITERATIONS) return false;

    const keyMaterial = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: fromBase64Url(saltRaw), iterations, hash: 'SHA-256' },
        keyMaterial,
        256
    );

    return timingSafeEqual(toBase64Url(bits), hashRaw);
}

// ---------- JWT (HS256) ----------

async function hmacKey(secret) {
    return crypto.subtle.importKey(
        'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false,
        ['sign', 'verify']
    );
}

function requireSecret(env) {
    const secret = env.JWT_SECRET;
    if (!secret || String(secret).length < 32) {
        throw ApiError.server(
            'JWT_SECRET is not configured. Set it with: npx wrangler secret put JWT_SECRET'
        );
    }
    return secret;
}

export function authTtlSeconds(env) {
    const ttl = Number(env.AUTH_TTL_SECONDS || 604800);
    return Number.isFinite(ttl) && ttl >= 300 ? Math.floor(ttl) : 604800;
}

export async function signToken(user, env) {
    const now = Math.floor(Date.now() / 1000);
    const ttl = authTtlSeconds(env);

    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        iss: ISSUER,
        iat: now,
        exp: now + ttl
    };

    const unsigned = `${encodeJson(header)}.${encodeJson(payload)}`;
    const signature = await crypto.subtle.sign(
        'HMAC', await hmacKey(requireSecret(env)), new TextEncoder().encode(unsigned)
    );

    return {
        token: `${unsigned}.${toBase64Url(signature)}`,
        expiresAt: new Date((now + ttl) * 1000).toISOString()
    };
}

export async function verifyToken(token, env) {
    if (typeof token !== 'string') throw ApiError.unauthorized();
    const parts = token.split('.');
    if (parts.length !== 3) throw ApiError.unauthorized('That session token is malformed.');

    const [headerRaw, payloadRaw, signatureRaw] = parts;

    let signature;
    try {
        signature = fromBase64Url(signatureRaw);
    } catch {
        throw ApiError.unauthorized('That session token is not valid.');
    }

    let valid = false;
    try {
        valid = await crypto.subtle.verify(
            'HMAC',
            await hmacKey(requireSecret(env)),
            signature,
            new TextEncoder().encode(`${headerRaw}.${payloadRaw}`)
        );
    } catch {
        throw ApiError.unauthorized('That session token is not valid.');
    }

    if (!valid) throw ApiError.unauthorized('That session token is not valid.');

    let payload;
    try {
        payload = decodeJson(payloadRaw);
    } catch {
        throw ApiError.unauthorized('That session token is not valid.');
    }

    if (payload.iss !== ISSUER) throw ApiError.unauthorized('That session token is not valid.');
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) {
        throw ApiError.unauthorized('Your session has expired. Sign in again.');
    }

    return payload;
}

export function bearerToken(request) {
    const header = request.headers.get('Authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : null;
}

export function publicUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        active: user.active !== false,
        createdAt: user.createdAt
    };
}

export function assertRole(user, roles) {
    if (!roles.includes(user.role)) {
        throw ApiError.forbidden('This action needs an administrator account.');
    }
}
