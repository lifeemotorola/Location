/**
 * End-to-end test: real frontend (jsdom) against the real Worker runtime
 * (wrangler dev / workerd). Covers setup, sign-in, create, offline queue,
 * push, pull on a second device and conflict resolution.
 *
 * Run with the API on :8787 and ALLOW_MEMORY=true:
 *   cd server && npx wrangler dev --port 8787
 *   node test-e2e/frontend-api.e2e.js
 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const API = process.env.API_BASE || 'http://127.0.0.1:8787';

// Unique per run so a second run against a warm dev store does not collide.
const RUN = Date.now().toString(36).slice(-5).toUpperCase();
const HOUSE_A = `SKR-900-${RUN}`;
const HOUSE_B = `SKR-901-${RUN}`;
const HOUSE_C = `SKR-902-${RUN}`;
const ADMIN = { email: 'abe@example.lr', name: 'Abe Kpadeh', password: 'Liberia2026Strong' };
const results = [];
const errors = [];

const check = async (name, fn) => {
    try {
        await fn();
        results.push(`PASS ${name}`);
    } catch (error) {
        results.push(`FAIL ${name}: ${error.message}`);
    }
};

const assert = (condition, message) => {
    if (!condition) throw new Error(message || 'assertion failed');
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function waitFor(predicate, { timeout = 8000, interval = 60, label = 'condition' } = {}) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
        if (await predicate()) return true;
        await wait(interval);
    }
    throw new Error(`timed out waiting for ${label}`);
}

function buildBrowser({ storage }) {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const vc = new VirtualConsole();
    vc.on('jsdomError', error => errors.push(`jsdomError: ${error.message}`));
    vc.on('error', (...args) => errors.push(`console.error: ${args.join(' ')}`));

    const dom = new JSDOM(html, {
        url: 'http://localhost:8000/',
        runScripts: 'outside-only',
        virtualConsole: vc,
        pretendToBeVisual: true
    });

    const { window } = dom;
    const { document } = window;

    // --- browser bits jsdom lacks or that need the Node realm ---
    window.fetch = (...args) => fetch(...args);
    window.AbortController = globalThis.AbortController;
    window.Headers = globalThis.Headers;
    window.Request = globalThis.Request;
    window.Response = globalThis.Response;
    window.confirm = () => true;
    window.prompt = () => 'DELETE';
    window.alert = () => {};
    window.print = () => {};
    window.Element.prototype.scrollIntoView = function () {};
    window.URL.createObjectURL = () => 'blob:test';
    window.URL.revokeObjectURL = () => {};

    // --- Leaflet stub (no map tiles inside the test) ---
    const layer = (extra = {}) => Object.assign({
        addTo() { return this; }, on() { return this; }, off() { return this; },
        bindPopup() { return this; }, bindTooltip() { return this; },
        openPopup() {}, setOpacity() {}, remove() {}
    }, extra);
    const map = {
        on() {}, once() {}, off() {}, remove() {}, invalidateSize() {}, closePopup() {},
        flyTo() {}, flyToBounds() {}, removeLayer() {},
        getContainer: () => document.createElement('div')
    };
    window.L = {
        map: () => map,
        tileLayer: () => layer(),
        marker: () => layer(),
        divIcon: options => options,
        layerGroup: () => layer(),
        circle: () => layer(),
        latLngBounds: () => ({ pad: () => ({}) }),
        control: { zoom: () => ({ addTo() { return this; } }) }
    };

    // --- storage override (per-device API address, like a field phone) ---
    Object.keys(storage).forEach(key => window.localStorage.setItem(key, storage[key]));

    // --- load the real frontend files in order ---
    ['js/config.js', 'js/api.js', 'js/sync.js', 'js/auth-ui.js', 'app.js'].forEach(file => {
        const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
        try {
            window.eval(`${source}\n;window.__getApp = () => (typeof app !== 'undefined' ? app : null);`);
        } catch (error) {
            errors.push(`eval ${file}: ${error.message}`);
        }
    });

    // app.js boots itself when the document is already parsed, and guards
    // against a second boot if this event fires again.
    document.dispatchEvent(new window.Event('DOMContentLoaded'));

    return { dom, window, document };
}

(async () => {
    // ---------- health ----------
    const health = await (await fetch(`${API}/api/health`)).json();
    if (!health.ok) {
        console.error('API is not healthy:', health);
        process.exit(1);
    }

    const setupStatus = await (await fetch(`${API}/api/setup/status`)).json();
    const freshStore = setupStatus.needsBootstrap === true;
    console.log(`   store: ${freshStore ? 'fresh (bootstrap)' : 'warm (sign-in)'} · run ${RUN}`);

    // ---------- no API configured: the app must stay usable offline ----------
    await check('without an API the app stays in local-only mode', async () => {
        const local = buildBrowser({ storage: {} });
        await wait(300);
        const localApp = local.window.__getApp();
        const doc = local.document;

        assert(localApp, 'app boots without an API');
        assert(!localApp.api?.isConfigured, 'api is not configured');
        assert(!doc.getElementById('accountOverlay').classList.contains('active'),
            'no account modal without an API');
        assert(!doc.getElementById('syncPill') || doc.getElementById('syncPill').hidden !== false,
            'no sync pill without an API');
        assert(/Saved on this device/i.test(doc.getElementById('storageNote').textContent),
            'sidebar explains local-only storage');

        const before = localApp.households.length;
        localApp.openModal(null, 6.2884, -10.7816);
        doc.getElementById('houseNumber').value = `LOCAL-${RUN}`;
        doc.getElementById('houseCounty').value = 'Montserrado';
        doc.getElementById('houseCounty').dispatchEvent(new local.window.Event('change'));
        doc.getElementById('houseCommunity').value = 'Sinkor';
        doc.getElementById('headFirstName').value = 'Local';
        doc.getElementById('headLastName').value = 'Worker';
        doc.getElementById('totalPersons').value = '3';
        doc.getElementById('consent').checked = true;
        doc.getElementById('latitude').value = '6.2884';
        doc.getElementById('longitude').value = '-10.7816';
        localApp.saveHousehold();

        assert(localApp.households.length === before + 1, 'household saved locally');
        assert(local.window.localStorage.getItem('liberiaCommunityLocator.v2'), 'record persisted');
        local.window.close();
    });

    // ---------- device A: first run, setup wizard ----------
    const deviceA = buildBrowser({
        storage: { 'liberiaLocator.apiBaseUrl': API }
    });

    await wait(300);
    let app = deviceA.window.__getApp();
    assert(app, 'app should be constructed');
    assert(app.api.isConfigured, 'api should be configured from localStorage');

    await check('first run opens the setup wizard', async () => {
        const doc = deviceA.document;
        const overlayOpen = () => doc.getElementById('accountOverlay')?.classList.contains('active');
        const title = () => doc.getElementById('accountTitle').textContent;

        if (freshStore) {
            await waitFor(overlayOpen, { label: 'setup modal' });
            assert(app.needsBootstrap === true, 'needsBootstrap should be true');
            assert(title().includes('first administrator'), `setup title, got: ${title()}`);
        } else {
            // Warm store: an existing deployment does not force the wizard on
            // every visitor — the header button opens sign-in instead.
            assert(app.needsBootstrap === false, 'needsBootstrap should be false');
            assert(!overlayOpen(), 'no modal forced on a warm store');
            doc.getElementById('accountBtn').click();
            await waitFor(overlayOpen, { label: 'sign-in modal' });
            assert(title().includes('Sign in'), `sign-in title, got: ${title()}`);
        }
    });

    await check('bootstrap creates the admin and signs in', async () => {
        const body = deviceA.document.getElementById('accountBody');

        if (freshStore) {
            body.querySelector('#setupToken').value = 'dev-bootstrap-token';
            body.querySelector('#setupName').value = ADMIN.name;
            body.querySelector('#setupEmail').value = ADMIN.email;
            body.querySelector('#setupPassword').value = ADMIN.password;
            body.querySelector('[data-form="setup"]').dispatchEvent(
                new deviceA.window.Event('submit', { bubbles: true, cancelable: true })
            );
        } else {
            body.querySelector('#signinEmail').value = ADMIN.email;
            body.querySelector('#signinPassword').value = ADMIN.password;
            body.querySelector('[data-form="signin"]').dispatchEvent(
                new deviceA.window.Event('submit', { bubbles: true, cancelable: true })
            );
        }

        await waitFor(() => app.session?.role === 'admin', { label: 'admin session' });
        assert(app.api.token, 'token stored');
        assert(!deviceA.document.getElementById('accountOverlay').classList.contains('active'),
            'modal closes after sign-in');
    });

    await check('header shows the signed-in user and sync state', async () => {
        await waitFor(() => deviceA.document.getElementById('accountLabel').textContent === ADMIN.name.split(' ')[0],
            { label: 'account label' });
        const pill = deviceA.document.getElementById('syncPill');
        assert(!pill.hidden, 'sync pill visible');
        assert(/Synced|queued|Syncing/i.test(pill.textContent), `pill text: ${pill.textContent}`);
    });

    // ---------- device A: create a household, expect it on the server ----------
    await check('a household saved locally reaches the server', async () => {
        app.openModal(null, 6.2884, -10.7816);
        const doc = deviceA.document;
        doc.getElementById('houseNumber').value = HOUSE_A;
        doc.getElementById('houseCounty').value = 'Montserrado';
        doc.getElementById('houseCounty').dispatchEvent(new deviceA.window.Event('change'));
        doc.getElementById('houseCommunity').value = 'Sinkor';
        doc.getElementById('houseStatus').value = 'owner';
        doc.getElementById('headFirstName').value = 'Emmanuel';
        doc.getElementById('headLastName').value = 'Kollie';
        doc.getElementById('headGender').value = 'male';
        doc.getElementById('totalPersons').value = '5';
        doc.getElementById('consent').checked = true;
        doc.getElementById('latitude').value = '6.2884';
        doc.getElementById('longitude').value = '-10.7816';

        app.saveHousehold();
        const local = app.households.find(household => household.houseNumber === HOUSE_A);
        assert(local, 'household saved locally');

        await waitFor(async () => {
            const response = await fetch(`${API}/api/households`, {
                headers: { Authorization: `Bearer ${app.api.token}` }
            });
            const payload = await response.json();
            return (payload.households || []).some(entry => entry.id === local.id);
        }, { label: 'household on server', timeout: 12000 });
    });

    await check('the sync queue drains after a successful push', async () => {
        await waitFor(() => app.sync.pendingCount === 0, { label: 'empty queue' });
        assert(app.sync.state !== 'error', `state ${app.sync.state}`);
    });

    // ---------- device A: offline edit is queued, not lost ----------
    await check('offline edits queue and upload when the connection returns', async () => {
        const originalRequest = app.api.request.bind(app.api);
        app.api.request = async () => {
            const error = new deviceA.window.LocatorApiError(0, 'network', 'Cannot reach the server.');
            throw error;
        };

        const target = app.households.find(household => household.houseNumber === HOUSE_A);
        app.openModal(target);
        deviceA.document.getElementById('houseNumber').value = HOUSE_B;
        app.saveHousehold();

        await waitFor(() => app.sync.pendingCount >= 1, { label: 'queued item' });
        await waitFor(() => app.sync.state === 'offline', { label: 'offline state' });
        assert(app.households.some(h => h.houseNumber === HOUSE_B), 'edit kept locally');

        app.api.request = originalRequest;
        await app.sync.flush();

        await waitFor(async () => {
            const response = await fetch(`${API}/api/households/${target.id}`, {
                headers: { Authorization: `Bearer ${app.api.token}` }
            });
            const payload = await response.json();
            return payload.household?.houseNumber === HOUSE_B;
        }, { label: 'offline edit uploaded', timeout: 12000 });
    });

    // ---------- device B: same account, pulls everything ----------
    const deviceB = buildBrowser({
        storage: { 'liberiaLocator.apiBaseUrl': API }
    });

    await wait(300);
    const appB = deviceB.window.__getApp();
    assert(appB, 'second app instance');

    await check('a second device signs in with the same account', async () => {
        await waitFor(() => deviceB.window.__getApp()?.needsBootstrap === false,
            { label: 'setup status on device B' });
        const body = deviceB.document.getElementById('accountBody');
        // No session yet → the panel opens on demand
        appB.authUI.open('signin');
        body.querySelector('#signinEmail').value = 'abe@example.lr';
        body.querySelector('#signinPassword').value = 'Liberia2026Strong';
        body.querySelector('[data-form="signin"]').dispatchEvent(
            new deviceB.window.Event('submit', { bubbles: true, cancelable: true })
        );
        await waitFor(() => appB.session?.email === 'abe@example.lr', { label: 'device B session' });
    });

    await check('the second device receives records created on the first', async () => {
        await waitFor(() => appB.households.some(household => household.houseNumber === HOUSE_B),
            { label: 'pulled household', timeout: 15000 });
        assert(appB.markers && Object.keys(appB.markers).length > 0, 'markers rendered from pulled data');
    });

    // ---------- conflict: both devices edit, stale write is surfaced ----------
    await check('a stale edit surfaces a conflict dialog instead of overwriting', async () => {
        const record = appB.households.find(household => household.houseNumber === HOUSE_B);
        assert(record, 'record present on device B');

        // Device A saves a newer version first
        const newer = {
            ...record,
            houseNumber: HOUSE_C,
            updatedAt: new Date(Date.now() + 2000).toISOString()
        };
        const response = await fetch(`${API}/api/households/${record.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${app.api.token}`
            },
            body: JSON.stringify(newer)
        });
        assert(response.ok, `server accepted newer version (${response.status})`);

        // Device B now pushes an older edit and must see the conflict UI
        const stale = {
            ...record,
            houseNumber: 'SKR-STALE',
            updatedAt: new Date(Date.now() - 120000).toISOString()
        };
        appB.sync.save(stale);
        await appB.sync.flush();

        await waitFor(() => deviceB.document.getElementById('conflictDialog')?.classList.contains('active'),
            { label: 'conflict dialog', timeout: 10000 });

        const text = deviceB.document.getElementById('conflictDialog').textContent;
        assert(text.includes('Sync conflict'), 'dialog title');
        assert(text.includes('Server copy'), 'shows both copies side by side');
        assert(text.includes(stale.houseNumber) || text.includes(record.id),
            `identifies the household, got: ${text.slice(0, 160)}`);

        deviceB.document.querySelector('[data-conflict="theirs"]').click();
        await wait(200);

        const resolved = appB.households.find(household => household.id === record.id);
        assert(resolved.houseNumber === HOUSE_C, `server version kept, got ${resolved.houseNumber}`);
    });

    await check('stats on the server match the frontend totals', async () => {
        // A full pull makes the device authoritative as a mirror of the server,
        // so the comparison is meaningful even when the dev store has history.
        await app.sync.pull({ full: true });
        const response = await fetch(`${API}/api/stats`, {
            headers: { Authorization: `Bearer ${app.api.token}` }
        });
        const { stats } = await response.json();
        const active = app.households.filter(household => !household.deleted);
        assert(stats.totals.households === active.length,
            `server ${stats.totals.households} vs local ${active.length}`);
    });

    const viewerEmail = `vera.${RUN.toLowerCase()}@example.lr`;

    await check('viewers are read-only in the interface', async () => {
        const created = await app.api.createUser({
            name: 'Vera Viewer',
            email: viewerEmail,
            role: 'viewer',
            password: 'Liberia2026Strong'
        });
        assert(created.user.role === 'viewer', 'viewer created');

        appB.api.clearSession();
        await appB.api.login(viewerEmail, 'Liberia2026Strong');
        appB.onSessionChange(appB.api.user);

        assert(appB.isViewer(), 'viewer session applied');
        assert(deviceB.document.getElementById('addHouseBtn').hidden, 'add button hidden for viewer');
        appB.openModal();
        assert(!deviceB.document.getElementById('modalOverlay').classList.contains('active'),
            'form does not open for viewers');
    });

    await check('a viewer can read a household but sees no edit actions', async () => {
        // Device B kept the server copy during the conflict, so HOUSE_C is its record.
        await waitFor(() => appB.households.some(h => h.houseNumber === HOUSE_C),
            { label: 'viewer received records', timeout: 10000 });
        const target = appB.households.find(household => household.houseNumber === HOUSE_C);
        appB.showDetail(target.id);

        const doc = deviceB.document;
        const panel = doc.getElementById('detailPanel');
        assert(panel.classList.contains('active'), 'detail panel opened');
        assert(panel.textContent.includes(HOUSE_C), 'detail panel shows the household');
        const actions = doc.querySelector('.detail-actions');
        assert(actions?.hidden === true, 'edit/delete actions hidden for a viewer');
        assert(!doc.getElementById('modalOverlay').classList.contains('active'),
            'viewer did not open the edit form');
    });

    await check('the account panel lists the team and changes roles', async () => {
        const doc = deviceA.document;
        const body = doc.getElementById('accountBody');

        app.authUI.open('account');
        await waitFor(() => body.querySelector('[data-action="open-users"]'),
            { label: 'manage accounts button' });
        body.querySelector('[data-action="open-users"]').click();

        await waitFor(() => body.querySelectorAll('.user-row').length >= 2,
            { label: 'user rows', timeout: 10000 });
        const viewerSelect = body.querySelector('select[data-user-role] option[value="viewer"]');
        assert(viewerSelect, 'role options rendered');

        const viewerRow = [...body.querySelectorAll('.user-row')]
            .find(row => row.textContent.includes(RUN.toLowerCase()));
        assert(viewerRow, 'newly created viewer listed');

        const roleSelect = viewerRow.querySelector('select[data-user-role]');
        roleSelect.value = 'enumerator';
        roleSelect.dispatchEvent(new deviceA.window.Event('change', { bubbles: true }));

        await waitFor(async () => {
            const { users } = await app.api.listUsers();
            const updated = users.find(user => user.email === viewerEmail);
            return updated?.role === 'enumerator';
        }, { label: 'role change saved', timeout: 10000 });
    });

    await check('demoting yourself removes write access immediately', async () => {
        const doc = deviceA.document;
        app.onSessionChange({ ...app.session, role: 'viewer' });
        assert(doc.getElementById('addHouseBtn').hidden, 'add button hidden after demotion');
        assert(doc.querySelector('.detail-actions')?.hidden !== false, 'detail actions hidden');

        app.onSessionChange({ ...app.session, role: 'admin' });
        assert(!doc.getElementById('addHouseBtn').hidden, 'add button restored for admin');
    });

    await check('signing out keeps local records', async () => {
        const before = appB.households.length;
        appB.api.logout();
        appB.onSessionChange(null);
        assert(appB.households.length === before, 'records kept after sign out');
        assert(!deviceB.window.localStorage.getItem('liberiaLocator.token'), 'token cleared');
    });

    results.forEach(line => console.log(line));
    if (errors.length) {
        console.log('\nRUNTIME ERRORS:\n' + [...new Set(errors)].join('\n'));
    }
    const failures = results.filter(line => line.startsWith('FAIL')).length;
    console.log(`\n${results.length - failures}/${results.length} end-to-end checks passed, ${errors.length} runtime errors`);
    process.exit(failures || errors.length ? 1 : 0);
})();
