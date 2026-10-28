/* ============================================================
   API client for the Liberia Community Locator Worker
   ------------------------------------------------------------
   Works in browsers and in the test harness. All requests go to
   `apiBaseUrl` + /api/*. Session tokens are kept in localStorage.
   ============================================================ */

(function (global) {
    'use strict';

    const TOKEN_KEY = 'liberiaLocator.token';
    const USER_KEY = 'liberiaLocator.user';
    const BASE_KEY = 'liberiaLocator.apiBaseUrl';
    const TIMEOUT_MS = 15000;

    class LocatorApiError extends Error {
        constructor(status, code, message, details) {
            super(message || 'Request failed.');
            this.name = 'LocatorApiError';
            this.status = status;
            this.code = code || 'error';
            this.details = details || null;
        }

        get isNetwork() {
            return this.code === 'network';
        }

        get isAuth() {
            return this.status === 401;
        }

        get isConflict() {
            return this.status === 409;
        }

        get fieldErrors() {
            return Array.isArray(this.details) ? this.details : [];
        }
    }

    class LocatorApi {
        constructor({ baseUrl, storage } = {}) {
            this.baseUrl = String(baseUrl || '').replace(/\/+$/, '');
            this.storage = storage || global.localStorage;
            this.listeners = new Set();
        }

        static fromConfig(config = global.LOCATOR_CONFIG || {}) {
            let stored = null;
            try {
                stored = global.localStorage.getItem(BASE_KEY);
            } catch (error) {
                stored = null;
            }
            return new LocatorApi({ baseUrl: stored || config.apiBaseUrl || '' });
        }

        get isConfigured() {
            return Boolean(this.baseUrl);
        }

        setBaseUrl(url) {
            this.baseUrl = String(url || '').replace(/\/+$/, '');
            try {
                global.localStorage.setItem(BASE_KEY, this.baseUrl);
            } catch (error) { /* storage may be blocked */ }
        }

        // ---------- session ----------

        get token() {
            try {
                return this.storage.getItem(TOKEN_KEY);
            } catch (error) {
                return null;
            }
        }

        get user() {
            try {
                const raw = this.storage.getItem(USER_KEY);
                return raw ? JSON.parse(raw) : null;
            } catch (error) {
                return null;
            }
        }

        setSession({ token, user } = {}) {
            try {
                if (token) this.storage.setItem(TOKEN_KEY, token);
                if (user) this.storage.setItem(USER_KEY, JSON.stringify(user));
            } catch (error) { /* ignore quota errors */ }
            this.emit('session', user || null);
        }

        clearSession() {
            try {
                this.storage.removeItem(TOKEN_KEY);
                this.storage.removeItem(USER_KEY);
            } catch (error) { /* ignore */ }
            this.emit('session', null);
        }

        on(event, handler) {
            this.listeners.add({ event, handler });
            return () => this.listeners.delete({ event, handler });
        }

        emit(event, payload) {
            this.listeners.forEach(listener => {
                if (listener.event === event) {
                    try {
                        listener.handler(payload);
                    } catch (error) {
                        console.warn('API listener failed', error);
                    }
                }
            });
        }

        // ---------- transport ----------

        async request(method, path, { body, auth = true, timeout = TIMEOUT_MS } = {}) {
            if (!this.isConfigured) {
                throw new LocatorApiError(0, 'not_configured',
                    'No API address is set. Add your Worker URL to js/config.js.');
            }

            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeout);

            const headers = { Accept: 'application/json' };
            if (body !== undefined) headers['Content-Type'] = 'application/json';
            if (auth && this.token) headers.Authorization = `Bearer ${this.token}`;

            let response;
            try {
                response = await fetch(`${this.baseUrl}${path}`, {
                    method,
                    headers,
                    body: body === undefined ? undefined : JSON.stringify(body),
                    signal: controller.signal
                });
            } catch (error) {
                clearTimeout(timer);
                const offline = error?.name === 'AbortError'
                    ? 'The server took too long to answer.'
                    : 'Cannot reach the server. Check your connection.';
                throw new LocatorApiError(0, 'network', offline);
            }
            clearTimeout(timer);

            let payload = null;
            const text = await response.text();
            if (text) {
                try {
                    payload = JSON.parse(text);
                } catch (error) {
                    payload = null;
                }
            }

            if (!response.ok) {
                const error = payload?.error || {};
                if (response.status === 401) this.clearSession();
                throw new LocatorApiError(
                    response.status,
                    error.code || `http_${response.status}`,
                    error.message || `Request failed (${response.status}).`,
                    error.details
                );
            }

            return payload;
        }

        // ---------- public endpoints ----------

        health() {
            return this.request('GET', '/api/health', { auth: false, timeout: 8000 });
        }

        setupStatus() {
            return this.request('GET', '/api/setup/status', { auth: false, timeout: 8000 });
        }

        bootstrap({ token, email, name, password }) {
            return this.request('POST', '/api/setup/bootstrap', {
                auth: false,
                body: { token, email, name, password }
            });
        }

        async login(email, password) {
            const payload = await this.request('POST', '/api/auth/login', {
                auth: false,
                body: { email, password }
            });
            this.setSession({ token: payload.token, user: payload.user });
            return payload;
        }

        async me() {
            const payload = await this.request('GET', '/api/auth/me');
            this.setSession({ user: payload.user });
            return payload;
        }

        changePassword(currentPassword, newPassword) {
            return this.request('POST', '/api/auth/password', {
                body: { currentPassword, newPassword }
            }).then(payload => {
                this.setSession({ token: payload.token, user: payload.user });
                return payload;
            });
        }

        logout() {
            this.clearSession();
        }

        // ---------- households ----------

        listHouseholds(params = {}) {
            const query = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    query.set(key, value);
                }
            });
            const suffix = query.toString() ? `?${query}` : '';
            return this.request('GET', `/api/households${suffix}`);
        }

        saveHousehold(id, record, { baseUpdatedAt } = {}) {
            const body = baseUpdatedAt ? { ...record, baseUpdatedAt } : record;
            return this.request('POST', `/api/households/${encodeURIComponent(id)}`, { body });
        }

        deleteHousehold(id) {
            return this.request('DELETE', `/api/households/${encodeURIComponent(id)}`);
        }

        restoreHousehold(id) {
            return this.request('POST', `/api/households/${encodeURIComponent(id)}/restore`);
        }

        purgeHousehold(id) {
            return this.request('DELETE', `/api/households/${encodeURIComponent(id)}/purge`);
        }

        pushSync(households) {
            return this.request('POST', '/api/sync/push', { body: { households } });
        }

        stats() {
            return this.request('GET', '/api/stats');
        }

        // ---------- users (admin) ----------

        listUsers() {
            return this.request('GET', '/api/users');
        }

        createUser(body) {
            return this.request('POST', '/api/users', { body });
        }

        updateUser(id, body) {
            return this.request('PATCH', `/api/users/${encodeURIComponent(id)}`, { body });
        }

        deleteUser(id) {
            return this.request('DELETE', `/api/users/${encodeURIComponent(id)}`);
        }
    }

    global.LocatorApi = LocatorApi;
    global.LocatorApiError = LocatorApiError;
})(typeof window !== 'undefined' ? window : globalThis);
