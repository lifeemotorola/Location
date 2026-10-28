import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, makeClient, bootstrapAdmin } from './helpers.js';

test('health reports the configured database', async () => {
    const env = makeEnv();
    const call = makeClient(env);

    const response = await call('GET', '/api/health');
    assert.equal(response.status, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.database, 'memory');
});

test('health reports the missing secret instead of crashing', async () => {
    const env = makeEnv({ REPO: null, MONGODB_URI: undefined, ALLOW_MEMORY: 'false' });
    const call = makeClient(env);

    const response = await call('GET', '/api/health');
    assert.equal(response.status, 503);
    assert.equal(response.body.ok, false);
    assert.equal(response.body.database, 'unconfigured');
    assert.deepEqual(response.body.missingSecrets, ['MONGODB_URI']);
});

test('setup status asks for the first administrator, then bootstrap creates one', async () => {
    const env = makeEnv();
    const call = makeClient(env);

    const before = await call('GET', '/api/setup/status');
    assert.equal(before.status, 200);
    assert.equal(before.body.needsBootstrap, true);

    const { token, user } = await bootstrapAdmin(env);
    assert.ok(token);
    assert.equal(user.role, 'admin');
    assert.equal(user.email, 'admin@example.lr');

    const after = await call('GET', '/api/setup/status');
    assert.equal(after.body.needsBootstrap, false);
    assert.equal(after.body.userCount, 1);
});

test('bootstrap refuses a wrong token and refuses to run twice', async () => {
    const env = makeEnv();
    const call = makeClient(env);

    const wrong = await call('POST', '/api/setup/bootstrap', {
        body: { token: 'nope', email: 'x@example.lr', name: 'X', password: 'Liberia2026Strong' }
    });
    assert.equal(wrong.status, 403);

    await bootstrapAdmin(env);

    const again = await call('POST', '/api/setup/bootstrap', {
        body: {
            token: env.BOOTSTRAP_TOKEN,
            email: 'second@example.lr',
            name: 'Second',
            password: 'Liberia2026Strong'
        }
    });
    assert.equal(again.status, 409);
});

test('login succeeds with the right password and fails otherwise', async () => {
    const env = makeEnv();
    const { call } = await bootstrapAdmin(env);

    const ok = await call('POST', '/api/auth/login', {
        body: { email: 'admin@example.lr', password: 'Liberia2026Strong' },
        headers: { 'CF-Connecting-IP': '203.0.113.10' }
    });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.token);

    const bad = await call('POST', '/api/auth/login', {
        body: { email: 'admin@example.lr', password: 'wrong-password' },
        headers: { 'CF-Connecting-IP': '203.0.113.11' }
    });
    assert.equal(bad.status, 401);
    assert.match(bad.body.error.message, /not correct/);
});

test('protected routes require a bearer token', async () => {
    const env = makeEnv();
    await bootstrapAdmin(env);
    const call = makeClient(env);

    const missing = await call('GET', '/api/households');
    assert.equal(missing.status, 401);

    const invalid = await call('GET', '/api/households', { token: 'not.a.token' });
    assert.equal(invalid.status, 401);

    const tampered = await call('GET', '/api/households', {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ4In0.bad-signature'
    });
    assert.equal(tampered.status, 401);
});

test('me returns the signed-in account without the password hash', async () => {
    const env = makeEnv();
    const { call, token } = await bootstrapAdmin(env);

    const response = await call('GET', '/api/auth/me', { token });
    assert.equal(response.status, 200);
    assert.equal(response.body.user.email, 'admin@example.lr');
    assert.equal(response.body.user.passwordHash, undefined);
});

test('login is rate limited per IP and email', async () => {
    const env = makeEnv();
    await bootstrapAdmin(env);
    const call = makeClient(env);
    const headers = { 'CF-Connecting-IP': '198.51.100.77' };

    const statuses = [];
    for (let attempt = 0; attempt < 11; attempt += 1) {
        const response = await call('POST', '/api/auth/login', {
            body: { email: 'admin@example.lr', password: 'wrong-password' },
            headers
        });
        statuses.push(response.status);
    }

    assert.equal(statuses.filter(status => status === 429).length, 1);
});

test('passwords cannot be changed without the current one', async () => {
    const env = makeEnv();
    const { call, token } = await bootstrapAdmin(env);

    const wrong = await call('POST', '/api/auth/password', {
        token,
        body: { currentPassword: 'not-it', newPassword: 'Another2026Password' }
    });
    assert.equal(wrong.status, 401);

    const ok = await call('POST', '/api/auth/password', {
        token,
        body: { currentPassword: 'Liberia2026Strong', newPassword: 'Another2026Password' }
    });
    assert.equal(ok.status, 200);

    const relogin = await call('POST', '/api/auth/login', {
        body: { email: 'admin@example.lr', password: 'Another2026Password' },
        headers: { 'CF-Connecting-IP': '203.0.113.99' }
    });
    assert.equal(relogin.status, 200);
});

test('CORS echoes only allowlisted origins', async () => {
    const env = makeEnv();
    const call = makeClient(env);

    const allowed = await call('OPTIONS', '/api/households', {
        headers: { Origin: 'https://lifeemotorola.github.io' }
    });
    assert.equal(allowed.status, 204);
    assert.equal(allowed.headers.get('Access-Control-Allow-Origin'),
        'https://lifeemotorola.github.io');

    const blocked = await call('OPTIONS', '/api/households', {
        headers: { Origin: 'https://evil.example.com' }
    });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.headers.get('Access-Control-Allow-Origin'), null);
});

test('unknown routes, wrong methods and bad JSON return clear errors', async () => {
    const env = makeEnv();
    const { call, token } = await bootstrapAdmin(env);

    const missing = await call('GET', '/api/nope', { token });
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error.code, 'not_found');

    const wrongMethod = await call('PUT', '/api/households/abc_123456', { token, body: {} });
    assert.equal(wrongMethod.status, 405);

    const wrongType = await call('POST', '/api/auth/login', {
        raw: JSON.stringify({ email: 'a@b.co', password: 'x' }),
        headers: { 'Content-Type': 'text/plain' }
    });
    assert.equal(wrongType.status, 400);

    const badJson = await call('POST', '/api/households/abc_123456', { token, raw: '{oops' });
    assert.equal(badJson.status, 400);
});

test('non-API paths explain where the frontend lives', async () => {
    const env = makeEnv();
    const call = makeClient(env);

    const response = await call('GET', '/index.html');
    assert.equal(response.status, 404);
    assert.match(response.body.error.message, /GitHub Pages/);
});
