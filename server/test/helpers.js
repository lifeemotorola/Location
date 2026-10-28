import worker from '../src/index.js';
import { MemoryRepository } from '../src/repo/memory.js';
import { clearUserCache } from '../src/userCache.js';

let ipCounter = 0;

export function makeEnv(overrides = {}) {
    return {
        REPO: new MemoryRepository(),
        JWT_SECRET: 'test-secret-that-is-long-enough-for-hs256-signing',
        BOOTSTRAP_TOKEN: 'bootstrap-test-token',
        PASSWORD_ITERATIONS: '50000', // keep the suite fast
        AUTH_TTL_SECONDS: '3600',
        ALLOWED_ORIGINS: 'https://lifeemotorola.github.io,http://localhost:8000',
        MONGODB_DB: 'liberia_locator_test',
        ...overrides
    };
}

export function makeClient(env) {
    const ctx = { waitUntil() {}, passThroughOnException() {} };

    return async function call(method, path, { body, token, headers = {}, raw } = {}) {
        ipCounter += 1;
        const requestHeaders = new Headers({
            'CF-Connecting-IP': `10.0.0.${(ipCounter % 250) + 1}:${ipCounter}`,
            ...headers
        });

        if ((body !== undefined || raw !== undefined) && !requestHeaders.has('Content-Type')) {
            requestHeaders.set('Content-Type', 'application/json');
        }
        if (token) requestHeaders.set('Authorization', `Bearer ${token}`);

        const request = new Request(`https://api.test${path}`, {
            method,
            headers: requestHeaders,
            body: raw !== undefined ? raw : (body !== undefined ? JSON.stringify(body) : undefined)
        });

        const response = await worker.fetch(request, env, ctx);
        const text = await response.text();
        let json = null;
        try {
            json = text ? JSON.parse(text) : null;
        } catch {
            json = { parseError: text };
        }

        return { status: response.status, headers: response.headers, body: json };
    };
}

export async function bootstrapAdmin(env) {
    const call = makeClient(env);
    clearUserCache();

    const response = await call('POST', '/api/setup/bootstrap', {
        body: {
            token: env.BOOTSTRAP_TOKEN,
            email: 'admin@example.lr',
            name: 'Test Admin',
            password: 'Liberia2026Strong'
        }
    });

    if (response.status !== 201) {
        throw new Error(`bootstrap failed: ${response.status} ${JSON.stringify(response.body)}`);
    }

    return { token: response.body.token, user: response.body.user, call };
}

export function sampleHousehold(overrides = {}) {
    return {
        houseNumber: 'SKR-014',
        houseStreet: 'Tubman Boulevard',
        houseCountyIgnored: true,
        county: 'Montserrado',
        district: 'Greater Monrovia',
        community: 'Sinkor',
        houseType: 'concrete_storey',
        houseStatus: 'owner',
        head: {
            firstName: 'Emmanuel',
            lastName: 'Kollie',
            age: 48,
            gender: 'male',
            civilStatus: 'married',
            nationality: 'liberian',
            occupation: 'Civil servant',
            contact: '+231 77 123 4567'
        },
        totalPersons: 5,
        totalMale: 2,
        totalFemale: 3,
        totalMinors: 2,
        totalSenior: 1,
        totalPwd: 0,
        members: [
            { firstName: 'Mamie', lastName: 'Kollie', age: 43, gender: 'female', relation: 'Spouse' }
        ],
        lat: 6.2884,
        lng: -10.7816,
        waterSource: 'lwsc_piped',
        toiletType: 'flush',
        electricitySource: 'lec_grid',
        mobileMoney: 'mtn_momo',
        healthPrograms: ['nhis', 'epi'],
        consent: true,
        surveyedBy: 'Test Enumerator',
        surveyDate: '2026-10-20',
        ...overrides
    };
}

export function householdId(suffix = 'a') {
    return `hh_test_${String(suffix).padStart(6, '0')}`;
}
