import test from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, bootstrapAdmin, sampleHousehold, householdId } from './helpers.js';

async function seed(env, call, token, count = 3) {
    const created = [];
    for (let i = 0; i < count; i += 1) {
        const id = householdId(i);
        const response = await call('POST', `/api/households/${id}`, {
            token,
            body: sampleHousehold({
                houseNumber: `SKR-${100 + i}`,
                community: i === 0 ? 'Sinkor' : 'Paynesville',
                county: i === 2 ? 'Bong' : 'Montserrado',
                head: { firstName: 'Head', lastName: `Number${i}`, gender: 'female', age: 40 }
            })
        });
        created.push({ id, response });
    }
    return created;
}

test('creating a household stores it and normalises fields', async () => {
    const env = makeEnv();
    const { call, token } = await bootstrapAdmin(env);
    const id = householdId('create');

    const response = await call('POST', `/api/households/${id}`, {
        token,
        body: sampleHousehold({
            houseNumber: '  SKR-014  ',
            houseStreet: 'Tubman   Boulevard',
            unknownField: 'should be dropped',
            healthPrograms: ['nhis', 'not_a_programme']
        })
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.status, 'created');
    assert.equal(response.body.household.houseNumber, 'SKR-014');
    assert.equal(response.body.household.houseStreet, 'Tubman Boulevard');
    assert.equal(response.body.household.unknownField, undefined);
    assert.equal(response.body.household.searchText, undefined);
    assert.deepEqual(response.body.household.healthPrograms, ['nhis']);
    assert.equal(response.body.household.rev, 1);
    assert.ok(response.body.household.serverUpdatedAt);
    assert.ok(response.body.warnings.some(w => w.field === 'healthPrograms'));
});

test('validation returns field-level errors', async () => {
    const env = makeEnv();
    const { call, token } = await bootstrapAdmin(env);

    const response = await call('POST', `/api/households/${householdId('bad')}`, {
        token,
        body: {
            houseNumber: '',
            county: 'Atlantis',
            lat: 200,
            lng: -10,
            houseStatus: 'owner',
            head: { firstName: '', lastName: '', age: 300, email: 'nope' },
            members: 'not-an-array'
        }
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.error.code, 'validation_failed');

    const fields = response.body.error.details.map(detail => detail.field);
    assert.ok(fields.includes('houseNumber'));
    assert.ok(fields.includes('county'));
    assert.ok(fields.includes('lat'));
    assert.ok(fields.includes('head'));
});

test('a household needs a head unless it is vacant or business', async () => {
    const env = makeEnv();
    const { call, token } = await bootstrapAdmin(env);
    const id = householdId('head');

    const missingHead = await call('POST', `/api/households/${id}`, {
        token,
        body: sampleHousehold({ houseStatus: 'owner', head: { firstName: '', lastName: '' } })
    });
    assert.equal(missingHead.status, 422);

    const vacant = await call('POST', `/api/households/${id}`, {
        token,
        body: sampleHousehold({ houseStatus: 'vacant', head: { firstName: '', lastName: '' }, totalPersons: 0 })
    });
    assert.equal(vacant.status, 201);
});

test('ids must look like household ids', async () => {
    const env = makeEnv();
    const { call, token } = await bootstrapAdmin(env);

    const tooShort = await call('POST', '/api/households/ab', { token, body: sampleHousehold() });
    assert.equal(tooShort.status, 400);

    const badChars = await call('POST', '/api/households/not%20an%20id', {
        token,
        body: sampleHousehold()
    });
    assert.equal(badChars.status, 400);

    // Path traversal never reaches the API
    const traversal = await call('POST', '/api/households/../etc/passwd', {
        token,
        body: sampleHousehold()
    });
    assert.equal(traversal.status, 404);
});

test('listing returns newest state with counts and filters', async () => {
    const env = makeEnv();
    const { call, token } = await bootstrapAdmin(env);
    await seed(env, call, token, 3);

    const all = await call('GET', '/api/households', { token });
    assert.equal(all.status, 200);
    assert.equal(all.body.count, 3);
    assert.ok(all.body.serverTime);

    const montserrado = await call('GET', '/api/households?county=Montserrado', { token });
    assert.equal(montserrado.body.count, 2);

    const search = await call('GET', '/api/households?q=paynesville', { token });
    assert.equal(search.body.count, 2);

    const page = await call('GET', '/api/households?limit=1', { token });
    assert.equal(page.body.count, 1);
    assert.equal(page.body.hasMore, true);
    assert.ok(page.body.nextSince);
});

test('incremental sync only returns records changed after a timestamp', async () => {
    const env = makeEnv();
    const { call, token } = await bootstrapAdmin(env);
    await seed(env, call, token, 2);

    const first = await call('GET', '/api/households', { token });
    const cursor = first.body.nextSince;

    const again = await call('GET', `/api/households?since=${encodeURIComponent(cursor)}`, { token });
    assert.equal(again.body.count, 0);

    await call('POST', `/api/households/${householdId('later')}`, {
        token,
        body: sampleHousehold({ houseNumber: 'NEW-1' })
    });

    const changed = await call('GET', `/api/households?since=${encodeURIComponent(cursor)}`, { token });
    assert.equal(changed.body.count, 1);
    assert.equal(changed.body.households[0].houseNumber, 'NEW-1');
});

test('updates bump the revision and stale writes are rejected', async () => {
    const env = makeEnv();
    const { call, token } = await bootstrapAdmin(env);
    const id = householdId('update');

    const created = await call('POST', `/api/households/${id}`, { token, body: sampleHousehold() });
    const original = created.body.household;

    const updated = await call('POST', `/api/households/${id}`, {
        token,
        body: sampleHousehold({
            houseNumber: 'SKR-014-A',
            updatedAt: new Date(Date.now() + 1000).toISOString()
        })
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.status, 'updated');
    assert.equal(updated.body.household.rev, 2);
    assert.equal(updated.body.household.houseNumber, 'SKR-014-A');

    // A device that has been offline sends an older edit → conflict, not a silent overwrite
    const stale = await call('POST', `/api/households/${id}`, {
        token,
        body: sampleHousehold({
            houseNumber: 'SKR-OLD',
            updatedAt: new Date(Date.now() - 60_000).toISOString()
        })
    });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.status, 'conflict');
    assert.equal(stale.body.household.houseNumber, 'SKR-014-A');

    // Explicit base version wins even when timestamps would allow the write
    const based = await call('POST', `/api/households/${id}`, {
        token,
        body: {
            ...sampleHousehold({
                houseNumber: 'SKR-BASED',
                updatedAt: new Date(Date.now() + 5000).toISOString()
            }),
            baseUpdatedAt: original.updatedAt
        }
    });
    assert.equal(based.status, 409);

    const check = await call('GET', `/api/households/${id}`, { token });
    assert.equal(check.body.household.houseNumber, 'SKR-014-A');
    assert.equal(check.body.household.rev, 2);
});

test('deleting is a tombstone that sync can see, and restore brings it back', async () => {
    const env = makeEnv();
    const { call, token } = await bootstrapAdmin(env);
    const id = householdId('delete');

    await call('POST', `/api/households/${id}`, { token, body: sampleHousehold() });

    const deleted = await call('DELETE', `/api/households/${id}`, { token });
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.status, 'deleted');

    const live = await call('GET', '/api/households', { token });
    assert.equal(live.body.count, 0);

    const withDeleted = await call('GET', '/api/households?includeDeleted=true', { token });
    assert.equal(withDeleted.body.count, 1);
    assert.equal(withDeleted.body.households[0].deleted, true);

    const restored = await call('POST', `/api/households/${id}/restore`, { token });
    assert.equal(restored.status, 200);
    assert.equal(restored.body.household.deleted, false);

    const afterRestore = await call('GET', '/api/households', { token });
    assert.equal(afterRestore.body.count, 1);
});

test('purging is admin-only', async () => {
    const env = makeEnv();
    const { call, token } = await bootstrapAdmin(env);
    const id = householdId('purge');

    await call('POST', `/api/households/${id}`, { token, body: sampleHousehold() });

    const created = await call('POST', '/api/users', {
        token,
        body: {
            email: 'field@example.lr',
            name: 'Field Worker',
            role: 'enumerator',
            password: 'Liberia2026Strong'
        }
    });
    assert.equal(created.status, 201);

    const login = await call('POST', '/api/auth/login', {
        body: { email: 'field@example.lr', password: 'Liberia2026Strong' },
        headers: { 'CF-Connecting-IP': '203.0.113.55' }
    });
    const fieldToken = login.body.token;

    const denied = await call('DELETE', `/api/households/${id}/purge`, { token: fieldToken });
    assert.equal(denied.status, 403);

    const allowed = await call('DELETE', `/api/households/${id}/purge`, { token });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.body.status, 'purged');
});

test('viewers can read but not write', async () => {
    const env = makeEnv();
    const { call, token } = await bootstrapAdmin(env);

    await call('POST', '/api/users', {
        token,
        body: {
            email: 'viewer@example.lr',
            name: 'Viewer',
            role: 'viewer',
            password: 'Liberia2026Strong'
        }
    });

    const login = await call('POST', '/api/auth/login', {
        body: { email: 'viewer@example.lr', password: 'Liberia2026Strong' },
        headers: { 'CF-Connecting-IP': '203.0.113.56' }
    });
    const viewerToken = login.body.token;

    const read = await call('GET', '/api/households', { token: viewerToken });
    assert.equal(read.status, 200);

    const write = await call('POST', `/api/households/${householdId('viewer')}`, {
        token: viewerToken,
        body: sampleHousehold()
    });
    assert.equal(write.status, 403);
});

test('sync push reports per-record outcomes and never blocks the batch', async () => {
    const env = makeEnv();
    const { call, token } = await bootstrapAdmin(env);

    const good = householdId('sync1');
    const bad = householdId('sync2');

    const response = await call('POST', '/api/sync/push', {
        token,
        body: {
            households: [
                { id: good, record: sampleHousehold({ houseNumber: 'SYNC-1' }) },
                { id: bad, record: { houseNumber: '', county: 'Nowhere', lat: 0, lng: 0 } },
                {
                    id: householdId('sync3'),
                    record: sampleHousehold({ houseNumber: 'SYNC-3', houseStatus: 'renter' })
                }
            ]
        }
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.results.length, 3);
    assert.equal(response.body.results[0].status, 'created');
    assert.equal(response.body.results[1].status, 'rejected');
    assert.equal(response.body.results[1].error.code, 'validation_failed');
    assert.equal(response.body.results[2].status, 'created');
    assert.equal(response.body.summary.created, 2);
    assert.equal(response.body.summary.rejected, 1);
});

test('sync push rejects oversized batches', async () => {
    const env = makeEnv();
    const { call, token } = await bootstrapAdmin(env);

    const households = Array.from({ length: 501 }, (_, index) => ({
        id: householdId(index),
        record: sampleHousehold()
    }));

    const response = await call('POST', '/api/sync/push', { token, body: { households } });
    assert.equal(response.status, 400);
});

test('stats aggregate coverage and service indicators', async () => {
    const env = makeEnv();
    const { call, token } = await bootstrapAdmin(env);
    await seed(env, call, token, 3);

    const response = await call('GET', '/api/stats', { token });
    assert.equal(response.status, 200);

    const { stats } = response.body;
    assert.equal(stats.totals.households, 3);
    assert.equal(stats.totals.residents, 15);
    assert.equal(stats.totals.consent, 3);
    assert.equal(stats.counties.find(c => c.county === 'Montserrado').households, 2);
    assert.equal(stats.counties.find(c => c.county === 'Bong').households, 1);
    assert.equal(stats.services.improvedWater, 3);
    assert.equal(stats.services.mobileMoney, 3);
});

test('users can be managed by admins with guardrails', async () => {
    const env = makeEnv();
    const { call, token, user } = await bootstrapAdmin(env);

    const list = await call('GET', '/api/users', { token });
    assert.equal(list.status, 200);
    assert.equal(list.body.users.length, 1);
    assert.equal(list.body.users[0].passwordHash, undefined);

    const created = await call('POST', '/api/users', {
        token,
        body: {
            email: 'enum@example.lr',
            name: 'Enumerator',
            role: 'enumerator',
            password: 'Liberia2026Strong'
        }
    });
    assert.equal(created.status, 201);

    const duplicate = await call('POST', '/api/users', {
        token,
        body: {
            email: 'enum@example.lr',
            name: 'Enumerator',
            role: 'enumerator',
            password: 'Liberia2026Strong'
        }
    });
    assert.equal(duplicate.status, 409);

    const selfDemote = await call('PATCH', `/api/users/${user.id}`, {
        token,
        body: { role: 'viewer' }
    });
    assert.equal(selfDemote.status, 400);

    const selfDelete = await call('DELETE', `/api/users/${user.id}`, { token });
    assert.equal(selfDelete.status, 400);

    const deactivated = await call('PATCH', `/api/users/${created.body.user.id}`, {
        token,
        body: { active: false }
    });
    assert.equal(deactivated.status, 200);
    assert.equal(deactivated.body.user.active, false);
});

test('a deactivated account cannot use an existing token', async () => {
    const env = makeEnv();
    const { call, token } = await bootstrapAdmin(env);

    await call('POST', '/api/users', {
        token,
        body: {
            email: 'temp@example.lr',
            name: 'Temp',
            role: 'enumerator',
            password: 'Liberia2026Strong'
        }
    });

    const login = await call('POST', '/api/auth/login', {
        body: { email: 'temp@example.lr', password: 'Liberia2026Strong' },
        headers: { 'CF-Connecting-IP': '203.0.113.57' }
    });
    const tempToken = login.body.token;

    const ok = await call('GET', '/api/auth/me', { token: tempToken });
    assert.equal(ok.status, 200);

    const users = await call('GET', '/api/users', { token });
    const temp = users.body.users.find(entry => entry.email === 'temp@example.lr');

    await call('PATCH', `/api/users/${temp.id}`, { token, body: { active: false } });

    const blocked = await call('GET', '/api/auth/me', { token: tempToken });
    assert.equal(blocked.status, 403);
});
