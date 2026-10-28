/* ============================================================
   Account, sign-in, setup and sync UI
   ------------------------------------------------------------
   Kept separate from app.js so the directory code stays focused
   on households. The app calls mount() once and refresh() after
   any session change.
   ============================================================ */

(function (global) {
    'use strict';

    const ROLE_LABELS = { admin: 'Administrator', enumerator: 'Enumerator', viewer: 'Viewer' };

    class AuthUI {
        constructor(app) {
            this.app = app;
            this.api = app.api;
            this.sync = app.sync;
            this.mode = 'closed'; // closed | signin | setup | account | users | config
            this.error = null;
            this.busy = false;
            this.users = [];
            this.bindOnce = false;
        }

        // ---------- helpers ----------

        $(selector) {
            return document.querySelector(selector);
        }

        el(id) {
            return document.getElementById(id);
        }

        escape(value) {
            return String(value ?? '').replace(/[&<>"']/g, ch => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            }[ch]));
        }

        get session() {
            return this.api.user;
        }

        get role() {
            return this.session?.role || null;
        }

        get canAdmin() {
            return this.role === 'admin';
        }

        // ---------- mount ----------

        async mount() {
            const overlay = this.el('accountOverlay');
            if (overlay && !this.bindOnce) {
                this.bindOnce = true;
                overlay.addEventListener('click', event => {
                    if (event.target === overlay || event.target.closest('[data-close-account]')) {
                        this.close();
                    }
                });
                document.addEventListener('keydown', event => {
                    if (event.key === 'Escape' && this.mode !== 'closed') this.close();
                });
            }

            this.el('accountBtn')?.addEventListener('click', () => this.open());
            this.sync?.onStatus?.(() => {}); // status flows through app.onSyncStatus

            this.refresh();

            if (!this.api.isConfigured) return;

            // Hydrate the session from the server when a token is stored
            if (this.api.token) {
                try {
                    await this.api.me();
                } catch (error) {
                    if (error.isAuth) this.api.clearSession();
                }
                this.refresh();
            }
        }

        // ---------- header ----------

        refresh() {
            const label = this.el('accountLabel');
            const button = this.el('accountBtn');
            const pill = this.el('syncPill');
            const session = this.session;

            if (label) {
                label.textContent = this.api.isConfigured
                    ? (session ? (session.name || session.email).split(' ')[0] : 'Sign in')
                    : 'Local only';
            }

            if (button) {
                button.classList.toggle('signed-in', Boolean(session));
                button.title = session
                    ? `${session.name || session.email} · ${ROLE_LABELS[session.role] || session.role}`
                    : (this.api.isConfigured ? 'Sign in to sync records' : 'Records are stored on this device only');
            }

            if (pill) {
                const status = this.sync ? {
                    state: this.sync.state,
                    pending: this.sync.pendingCount,
                    lastSyncedAt: this.sync.lastSyncedAt
                } : { state: 'local', pending: 0 };

                const view = this.describeStatus(status);
                pill.hidden = false;
                pill.className = `sync-pill ${view.tone}`;
                pill.innerHTML = `<i class="fas ${view.icon}" aria-hidden="true"></i><span>${this.escape(view.text)}</span>`;
                pill.title = view.detail;
            }

            if (this.mode !== 'closed') this.render();
        }

        describeStatus(status) {
            if (!this.api.isConfigured) {
                return {
                    tone: 'local', icon: 'fa-hard-drive', text: 'This device',
                    detail: 'No API is configured, so records stay in this browser.'
                };
            }
            if (!this.session) {
                return {
                    tone: 'signed-out', icon: 'fa-user-lock', text: 'Not signed in',
                    detail: 'Sign in to share records with the team. Local work is still saved.'
                };
            }

            const pending = status.pending || 0;
            switch (status.state) {
                case 'syncing':
                    return { tone: 'busy', icon: 'fa-rotate fa-spin', text: 'Syncing…', detail: 'Sending queued changes.' };
                case 'offline':
                    return {
                        tone: 'offline', icon: 'fa-plug-circle-xmark',
                        text: pending ? `Offline · ${pending} queued` : 'Offline',
                        detail: 'Changes are saved here and will sync when you reconnect.'
                    };
                case 'error':
                    return { tone: 'error', icon: 'fa-triangle-exclamation', text: 'Sync error', detail: this.sync?.lastError || '' };
                case 'pending':
                    return { tone: 'busy', icon: 'fa-clock', text: `${pending} queued`, detail: 'Waiting to sync.' };
                default:
                    return {
                        tone: 'synced', icon: 'fa-cloud-arrow-up', text: 'Synced',
                        detail: status.lastSyncedAt ? `Last sync ${new Date(status.lastSyncedAt).toLocaleTimeString()}` : 'Up to date.'
                    };
            }
        }

        // ---------- open / close ----------

        open(mode) {
            if (!this.api.isConfigured && mode !== 'config') {
                this.mode = 'config';
            } else if (mode) {
                this.mode = mode;
            } else if (!this.session) {
                this.mode = this.needsSetup ? 'setup' : 'signin';
            } else {
                this.mode = 'account';
            }

            this.error = null;
            this.render();
            this.el('accountOverlay')?.classList.add('active');
        }

        close() {
            this.mode = 'closed';
            this.error = null;
            this.el('accountOverlay')?.classList.remove('active');
        }

        get needsSetup() {
            return this.app.needsBootstrap === true;
        }

        // ---------- rendering ----------

        render() {
            const body = this.el('accountBody');
            const title = this.el('accountTitle');
            if (!body || !title) return;

            const titles = {
                config: 'Connect this app to your API',
                signin: 'Sign in',
                setup: 'Create the first administrator',
                account: 'Your account',
                users: 'Team accounts'
            };
            title.innerHTML = `<i class="fas fa-user-shield" aria-hidden="true"></i> ${titles[this.mode] || 'Account'}`;

            if (this.mode === 'config') body.innerHTML = this.renderConfig();
            else if (this.mode === 'setup') body.innerHTML = this.renderSetup();
            else if (this.mode === 'signin') body.innerHTML = this.renderSignin();
            else if (this.mode === 'users') body.innerHTML = this.renderUsers();
            else body.innerHTML = this.renderAccount();

            this.bind(body);
        }

        renderError() {
            if (!this.error) return '';
            const details = Array.isArray(this.error.details)
                ? `<ul class="account-error-list">${this.error.details
                    .slice(0, 6)
                    .map(item => `<li>${this.escape(item.field ? `${item.field}: ${item.message}` : item.message)}</li>`)
                    .join('')}</ul>`
                : '';
            return `<div class="account-error" role="alert">
                <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
                <div><strong>${this.escape(this.error.message || 'Something went wrong.')}</strong>${details}</div>
            </div>`;
        }

        renderConfig() {
            const current = this.api.baseUrl || '';
            return `
                <div class="account-section">
                    <p class="account-lead">
                        Records are currently stored in this browser only. Add the address of your
                        Cloudflare Worker API to share records with your team.
                    </p>
                    <form data-form="config" class="account-form">
                        <div class="form-group">
                            <label for="apiBaseUrl">API address</label>
                            <input type="url" id="apiBaseUrl" name="apiBaseUrl" required
                                   placeholder="https://liberia-locator-api.your-subdomain.workers.dev"
                                   value="${this.escape(current)}">
                            <span class="field-hint">This is the Worker URL from <code>npx wrangler deploy</code>.</span>
                        </div>
                        <div class="account-form-actions">
                            <button type="submit" class="btn btn-primary-dark">
                                <i class="fas fa-plug" aria-hidden="true"></i> Save API address
                            </button>
                            <button type="button" class="btn btn-secondary" data-action="work-offline">
                                Work offline
                            </button>
                        </div>
                    </form>
                </div>
                <div class="account-section muted">
                    <p>Deploying your own backend is documented in <code>server/README.md</code>.</p>
                </div>
            `;
        }

        renderSignin() {
            return `
                <div class="account-section">
                    <p class="account-lead">
                        Sign in to sync households with your team. You can keep working on this device
                        without signing in — records will sync after you do.
                    </p>
                    ${this.renderError()}
                    <form data-form="signin" class="account-form">
                        <div class="form-group">
                            <label for="signinEmail">Email</label>
                            <input type="email" id="signinEmail" name="email" required autocomplete="username"
                                   placeholder="name@example.lr">
                        </div>
                        <div class="form-group">
                            <label for="signinPassword">Password</label>
                            <input type="password" id="signinPassword" name="password" required
                                   autocomplete="current-password" placeholder="Your password">
                        </div>
                        <div class="account-form-actions">
                            <button type="submit" class="btn btn-primary-dark" ${this.busy ? 'disabled' : ''}>
                                <i class="fas fa-right-to-bracket" aria-hidden="true"></i>
                                ${this.busy ? 'Signing in…' : 'Sign in'}
                            </button>
                            <button type="button" class="btn btn-secondary" data-action="work-offline">
                                Work offline
                            </button>
                        </div>
                    </form>
                </div>
            `;
        }

        renderSetup() {
            return `
                <div class="account-section">
                    <p class="account-lead">
                        This deployment has no accounts yet. Create the first administrator using the
                        <code>BOOTSTRAP_TOKEN</code> you set on the Worker.
                    </p>
                    ${this.renderError()}
                    <form data-form="setup" class="account-form">
                        <div class="form-group">
                            <label for="setupToken">Setup token</label>
                            <input type="password" id="setupToken" name="token" required
                                   placeholder="BOOTSTRAP_TOKEN" autocomplete="off">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="setupName">Your name</label>
                                <input type="text" id="setupName" name="name" required placeholder="e.g. Abraham Kpadeh">
                            </div>
                            <div class="form-group">
                                <label for="setupEmail">Email</label>
                                <input type="email" id="setupEmail" name="email" required
                                       placeholder="name@example.lr" autocomplete="username">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="setupPassword">Password</label>
                            <input type="password" id="setupPassword" name="password" required
                                   autocomplete="new-password" minlength="10"
                                   placeholder="At least 10 characters, letters and numbers">
                            <span class="field-hint">Use a passphrase you can remember. It protects the whole directory.</span>
                        </div>
                        <div class="account-form-actions">
                            <button type="submit" class="btn btn-primary-dark" ${this.busy ? 'disabled' : ''}>
                                <i class="fas fa-user-plus" aria-hidden="true"></i>
                                ${this.busy ? 'Creating…' : 'Create administrator'}
                            </button>
                        </div>
                    </form>
                </div>
            `;
        }

        renderAccount() {
            const session = this.session || {};
            const status = this.sync ? this.describeStatus({
                state: this.sync.state,
                pending: this.sync.pendingCount,
                lastSyncedAt: this.sync.lastSyncedAt
            }) : null;

            return `
                <div class="account-identity">
                    <div class="account-avatar">${this.escape(this.initials(session.name, session.email))}</div>
                    <div>
                        <div class="account-name">${this.escape(session.name || 'Signed in')}</div>
                        <div class="account-meta">${this.escape(session.email || '')} · ${this.escape(ROLE_LABELS[session.role] || session.role || '')}</div>
                    </div>
                </div>

                ${status ? `
                    <div class="account-section">
                        <h3><i class="fas fa-cloud-arrow-up" aria-hidden="true"></i> Sync</h3>
                        <div class="sync-summary ${status.tone}">
                            <strong>${this.escape(status.text)}</strong>
                            <span>${this.escape(status.detail)}</span>
                        </div>
                        ${this.sync.pendingCount > 0 ? `
                            <p class="account-hint">
                                ${this.sync.pendingCount} change(s) are saved on this device and will upload
                                when the connection is back.
                            </p>` : ''}
                        <div class="account-form-actions">
                            <button type="button" class="btn btn-primary-dark" data-action="sync-now">
                                <i class="fas fa-rotate" aria-hidden="true"></i> Sync now
                            </button>
                            <button type="button" class="btn btn-secondary" data-action="full-pull">
                                <i class="fas fa-download" aria-hidden="true"></i> Re-download all
                            </button>
                        </div>
                    </div>` : ''}

                ${this.canAdmin ? `
                    <div class="account-section">
                        <h3><i class="fas fa-users-gear" aria-hidden="true"></i> Team</h3>
                        <p class="account-hint">Enumerators can add and edit records. Viewers can only read.</p>
                        <div class="account-form-actions">
                            <button type="button" class="btn btn-secondary" data-action="open-users">
                                <i class="fas fa-user-group" aria-hidden="true"></i> Manage accounts
                            </button>
                        </div>
                    </div>` : ''}

                <div class="account-section">
                    <h3><i class="fas fa-key" aria-hidden="true"></i> Password</h3>
                    ${this.renderError()}
                    <form data-form="password" class="account-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="currentPassword">Current password</label>
                                <input type="password" id="currentPassword" name="currentPassword"
                                       required autocomplete="current-password">
                            </div>
                            <div class="form-group">
                                <label for="newPassword">New password</label>
                                <input type="password" id="newPassword" name="newPassword"
                                       required minlength="10" autocomplete="new-password">
                            </div>
                        </div>
                        <div class="account-form-actions">
                            <button type="submit" class="btn btn-secondary" ${this.busy ? 'disabled' : ''}>
                                <i class="fas fa-floppy-disk" aria-hidden="true"></i> Update password
                            </button>
                        </div>
                    </form>
                </div>

                <div class="account-section account-footer">
                    <button type="button" class="btn btn-danger" data-action="sign-out">
                        <i class="fas fa-right-from-bracket" aria-hidden="true"></i> Sign out
                    </button>
                    <span class="account-hint">
                        Signing out keeps this device's saved records.
                    </span>
                </div>
            `;
        }

        renderUsers() {
            const rows = this.users.map(user => `
                <div class="user-row">
                    <div class="user-main">
                        <strong>${this.escape(user.name || '—')}</strong>
                        <span>${this.escape(user.email)}</span>
                    </div>
                    <select data-user-role="${this.escape(user.id)}" aria-label="Role for ${this.escape(user.email)}">
                        ${['admin', 'enumerator', 'viewer'].map(role => `
                            <option value="${role}" ${user.role === role ? 'selected' : ''}>
                                ${ROLE_LABELS[role]}
                            </option>`).join('')}
                    </select>
                    <label class="user-active">
                        <input type="checkbox" data-user-active="${this.escape(user.id)}"
                               ${user.active !== false ? 'checked' : ''}>
                        Active
                    </label>
                </div>
            `).join('');

            return `
                <div class="account-section">
                    ${this.renderError()}
                    <div class="user-list">
                        ${rows || '<p class="account-hint">No accounts yet.</p>'}
                    </div>
                    <p class="account-hint">Changes save as soon as you change them.</p>
                </div>

                <div class="account-section">
                    <h3><i class="fas fa-user-plus" aria-hidden="true"></i> Add an account</h3>
                    <form data-form="new-user" class="account-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="newUserName">Name</label>
                                <input type="text" id="newUserName" name="name" required placeholder="e.g. Mamie Johnson">
                            </div>
                            <div class="form-group">
                                <label for="newUserEmail">Email</label>
                                <input type="email" id="newUserEmail" name="email" required placeholder="name@example.lr">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="newUserRole">Role</label>
                                <select id="newUserRole" name="role">
                                    <option value="enumerator">Enumerator — add and edit</option>
                                    <option value="viewer">Viewer — read only</option>
                                    <option value="admin">Administrator — full access</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="newUserPassword">Temporary password</label>
                                <input type="password" id="newUserPassword" name="password" required minlength="10">
                            </div>
                        </div>
                        <div class="account-form-actions">
                            <button type="submit" class="btn btn-primary-dark">
                                <i class="fas fa-plus" aria-hidden="true"></i> Create account
                            </button>
                            <button type="button" class="btn btn-secondary" data-action="open-account">
                                Back
                            </button>
                        </div>
                    </form>
                </div>
            `;
        }

        initials(name = '', email = '') {
            const source = (name || email || '?').trim();
            const parts = source.split(/\s+/).filter(Boolean);
            if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
            return source.slice(0, 2).toUpperCase();
        }

        // ---------- event wiring ----------

        bind(root) {
            root.querySelectorAll('[data-action]').forEach(button => {
                button.addEventListener('click', () => this.action(button.dataset.action));
            });

            root.querySelector('[data-form="config"]')?.addEventListener('submit', event => {
                event.preventDefault();
                const url = new FormData(event.target).get('apiBaseUrl');
                this.api.setBaseUrl(url);
                this.api.clearSession();
                this.app.attachApi();
                this.close();
                this.app.showToast('API address saved. Reloading…', 'success');
                setTimeout(() => window.location.reload(), 600);
            });

            root.querySelector('[data-form="signin"]')?.addEventListener('submit', event => {
                event.preventDefault();
                this.signIn(new FormData(event.target));
            });

            root.querySelector('[data-form="setup"]')?.addEventListener('submit', event => {
                event.preventDefault();
                this.setup(new FormData(event.target));
            });

            root.querySelector('[data-form="password"]')?.addEventListener('submit', event => {
                event.preventDefault();
                this.changePassword(new FormData(event.target));
            });

            root.querySelector('[data-form="new-user"]')?.addEventListener('submit', event => {
                event.preventDefault();
                this.createUser(new FormData(event.target));
            });

            root.querySelectorAll('[data-user-role]').forEach(select => {
                select.addEventListener('change', () => this.updateUser(select.dataset.userRole, { role: select.value }));
            });

            root.querySelectorAll('[data-user-active]').forEach(input => {
                input.addEventListener('change', () => this.updateUser(input.dataset.userActive, { active: input.checked }));
            });
        }

        async action(name) {
            if (name === 'work-offline') {
                this.close();
                this.app.showToast('Working offline. Records stay on this device.', 'success');
            }
            if (name === 'sign-out') {
                this.api.logout();
                this.sync?.stop();
                this.sync?.reset();
                this.app.onSessionChange(null);
                this.close();
                this.app.showToast('Signed out. Local records kept.', 'success');
            }
            if (name === 'sync-now') {
                await this.runSync(() => this.sync.syncNow());
            }
            if (name === 'full-pull') {
                const confirmed = window.confirm(
                    'Re-download every household from the server? Local records that were never synced are kept.'
                );
                if (!confirmed) return;
                await this.runSync(() => this.sync.pull({ full: true }));
            }
            if (name === 'open-users') {
                await this.loadUsers();
                this.mode = 'users';
                this.error = null;
                this.render();
            }
            if (name === 'open-account') {
                this.mode = 'account';
                this.render();
            }
        }

        async runSync(operation) {
            this.busy = true;
            this.error = null;
            this.render();
            try {
                await operation();
                this.app.showToast('Sync complete.', 'success');
            } catch (error) {
                this.error = error;
            } finally {
                this.busy = false;
                this.refresh();
            }
        }

        async signIn(form) {
            this.busy = true;
            this.error = null;
            this.render();
            try {
                const payload = await this.api.login(form.get('email'), form.get('password'));
                this.app.onSessionChange(payload.user);
                this.close();
                this.app.showToast(`Signed in as ${payload.user.name || payload.user.email}.`, 'success');
                await this.app.afterSignIn();
            } catch (error) {
                this.error = error;
                this.busy = false;
                this.render();
            }
        }

        async setup(form) {
            this.busy = true;
            this.error = null;
            this.render();
            try {
                const payload = await this.api.bootstrap({
                    token: form.get('token'),
                    email: form.get('email'),
                    name: form.get('name'),
                    password: form.get('password')
                });
                this.api.setSession({ token: payload.token, user: payload.user });
                this.app.needsBootstrap = false;
                this.app.onSessionChange(payload.user);
                this.close();
                this.app.showToast('Administrator created. You are signed in.', 'success');
                await this.app.afterSignIn();
            } catch (error) {
                if (error.status === 409) this.app.needsBootstrap = false;
                this.error = error;
                this.busy = false;
                this.render();
            }
        }

        async changePassword(form) {
            this.busy = true;
            this.error = null;
            this.render();
            try {
                await this.api.changePassword(form.get('currentPassword'), form.get('newPassword'));
                this.busy = false;
                this.app.showToast('Password updated.', 'success');
                this.refresh();
            } catch (error) {
                this.error = error;
                this.busy = false;
                this.render();
            }
        }

        async loadUsers() {
            try {
                const payload = await this.api.listUsers();
                this.users = payload.users || [];
            } catch (error) {
                this.error = error;
                this.users = [];
            }
        }

        async createUser(form) {
            this.error = null;
            try {
                await this.api.createUser({
                    name: form.get('name'),
                    email: form.get('email'),
                    role: form.get('role'),
                    password: form.get('password')
                });
                await this.loadUsers();
                this.app.showToast('Account created.', 'success');
            } catch (error) {
                this.error = error;
            }
            this.render();
        }

        async updateUser(id, patch) {
            this.error = null;
            try {
                await this.api.updateUser(id, patch);
                await this.loadUsers();
                this.app.showToast('Account updated.', 'success');
                if (id === this.session?.id) {
                    await this.api.me();
                    this.app.onSessionChange(this.api.user);
                }
            } catch (error) {
                this.error = error;
            }
            this.render();
        }

        // ---------- conflicts ----------

        showConflict(conflict) {
            const dialog = this.el('conflictDialog');
            if (!dialog) return;

            const reason = conflict.error?.message
                || 'Another device saved a newer version of this household.';

            dialog.innerHTML = `
                <div class="conflict-card" role="dialog" aria-modal="true" aria-labelledby="conflictTitle">
                    <div class="conflict-head">
                        <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
                        <h3 id="conflictTitle">Sync conflict</h3>
                    </div>
                    <p>${this.escape(reason)}</p>
                    <dl class="conflict-details">
                        <div>
                            <dt>Household</dt>
                            <dd>${this.escape(conflict.mine?.houseNumber || conflict.theirs?.houseNumber || conflict.id)}</dd>
                        </div>
                        <div>
                            <dt>Your copy</dt>
                            <dd>${this.escape(conflict.mine?.updatedAt ? new Date(conflict.mine.updatedAt).toLocaleString() : 'unsaved')}</dd>
                        </div>
                        <div>
                            <dt>Server copy</dt>
                            <dd>${this.escape(conflict.theirs?.updatedAt ? new Date(conflict.theirs.updatedAt).toLocaleString() : 'not available')}</dd>
                        </div>
                    </dl>
                    <div class="conflict-actions">
                        <button type="button" class="btn btn-secondary" data-conflict="theirs">
                            Keep server version
                        </button>
                        <button type="button" class="btn btn-danger" data-conflict="mine"
                            ${conflict.mine ? '' : 'disabled title="Your copy is no longer available"'}>
                            Keep my version
                        </button>
                    </div>
                </div>
            `;

            dialog.classList.add('active');

            dialog.querySelector('[data-conflict="theirs"]')?.addEventListener('click', () => {
                dialog.classList.remove('active');
                dialog.innerHTML = '';
                if (conflict.theirs) this.app.applyServerRecord(conflict.theirs);
                this.app.showToast('Kept the server version.', 'success');
            });

            dialog.querySelector('[data-conflict="mine"]')?.addEventListener('click', () => {
                dialog.classList.remove('active');
                dialog.innerHTML = '';
                if (conflict.mine) this.app.forceSaveMine(conflict);
            });
        }
    }

    global.AuthUI = AuthUI;
})(typeof window !== 'undefined' ? window : globalThis);
