/* ============================================================
   Offline-first sync engine
   ------------------------------------------------------------
   Field devices lose connection constantly, so the app always
   writes to localStorage first. This engine then:
     1. queues the write (survives reloads),
     2. pushes the queue when the API is reachable,
     3. pulls everything changed on the server since the last cursor,
     4. surfaces conflicts instead of overwriting someone's work.

   Merge rule: newest `updatedAt` wins, server tombstones always
   beat local copies, and a 409 is reported to the UI.
   ============================================================ */

(function (global) {
    'use strict';

    const QUEUE_KEY = 'liberiaLocator.queue';
    const CURSOR_KEY = 'liberiaLocator.syncCursor';
    const MAX_ATTEMPTS = 5;

    function nowIso() {
        return new Date().toISOString();
    }

    class SyncEngine {
        constructor(api, options = {}) {
            this.api = api;
            this.store = options.store;
            this.onStatus = options.onStatus || (() => {});
            this.onRecords = options.onRecords || (() => {});
            this.onConflict = options.onConflict || (() => {});
            this.intervalMs = (options.intervalSeconds || 60) * 1000;
            this.timer = null;
            this.inflight = null;
            this.state = 'idle';
            this.lastError = null;
            this.lastSyncedAt = null;
            this.pendingConflicts = [];

            this.handleOnline = () => this.flush().then(() => this.pull());
            if (global.addEventListener) {
                global.addEventListener('online', this.handleOnline);
            }
        }

        // ---------- queue ----------

        get queue() {
            try {
                const raw = this.store.getItem(QUEUE_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (error) {
                return [];
            }
        }

        set queue(items) {
            try {
                this.store.setItem(QUEUE_KEY, JSON.stringify(items.slice(0, 500)));
            } catch (error) {
                console.warn('Could not persist the sync queue', error);
            }
            this.emit();
        }

        get cursor() {
            try {
                return this.store.getItem(CURSOR_KEY) || null;
            } catch (error) {
                return null;
            }
        }

        set cursor(value) {
            try {
                if (value) this.store.setItem(CURSOR_KEY, value);
                else this.store.removeItem(CURSOR_KEY);
            } catch (error) { /* ignore */ }
        }

        get pendingCount() {
            return this.queue.length;
        }

        emit(extra = {}) {
            try {
                this.onStatus({
                    state: this.state,
                    pending: this.pendingCount,
                    lastSyncedAt: this.lastSyncedAt,
                    lastError: this.lastError,
                    configured: this.api.isConfigured,
                    signedIn: Boolean(this.api.token),
                    ...extra
                });
            } catch (error) {
                console.warn('Sync status listener failed', error);
            }
        }

        // ---------- queueing local writes ----------

        save(record) {
            if (!record?.id) return;
            this.enqueue({
                id: record.id,
                op: 'save',
                updatedAt: record.updatedAt || nowIso(),
                record
            });
        }

        remove(id, { deletedAt } = {}) {
            if (!id) return;
            // A pending create for this id is simply dropped
            const queue = this.queue.filter(item => item.id !== id);
            queue.push({
                id,
                op: 'delete',
                updatedAt: deletedAt || nowIso(),
                record: null,
                deletedAt: deletedAt || nowIso()
            });
            this.queue = queue;
        }

        enqueue(item) {
            const queue = this.queue.filter(entry => entry.id !== item.id);
            queue.push({ ...item, attempts: 0 });
            this.queue = queue;

            // Fire and forget; failures stay queued.
            this.flush().catch(() => {});
        }

        // ---------- push ----------

        async flush() {
            if (!this.api.isConfigured || !this.api.token) {
                this.state = this.api.isConfigured ? 'signed_out' : 'local';
                this.emit();
                return { pushed: 0 };
            }
            // Single-flight: wait for a run already in progress, then retry if
            // work is still queued. A caller never gets told "busy" and never
            // inherits a stale failure result.
            if (this.inflight) {
                await this.inflight.catch(() => {});
                if (!this.queue.length) return { pushed: 0 };
            }

            const queue = this.queue;
            if (queue.length === 0) {
                if (this.state !== 'synced') {
                    this.state = 'synced';
                    this.emit();
                }
                return { pushed: 0 };
            }

            this.state = 'syncing';
            this.emit();

            const run = this.runFlush(queue);
            this.inflight = run;
            try {
                return await run;
            } finally {
                if (this.inflight === run) this.inflight = null;
            }
        }

        async runFlush(queue) {
            let pushed = 0;
            const remaining = [];

            try {
                const saves = queue.filter(item => item.op === 'save');
                const deletes = queue.filter(item => item.op === 'delete');

                if (saves.length > 0) {
                    const response = await this.api.pushSync(
                        saves.map(item => ({ id: item.id, record: item.record }))
                    );

                    const byId = new Map(saves.map(item => [item.id, item]));
                    (response.results || []).forEach(result => {
                        const item = byId.get(result.id);
                        byId.delete(result.id);

                        if (result.ok || result.status === 'created' || result.status === 'updated') {
                            pushed += 1;
                            return;
                        }
                        if (result.status === 'conflict') {
                            pushed += 1; // the server's copy is authoritative after review
                            this.recordConflict(item, result.household);
                            return;
                        }
                        if (result.status === 'rejected') {
                            // Validation problems will not fix themselves on retry
                            this.recordConflict(item, null, result.error);
                            return;
                        }
                        remaining.push(item);
                    });

                    byId.forEach(item => remaining.push(item));
                }

                for (const item of deletes) {
                    try {
                        await this.api.deleteHousehold(item.id);
                        pushed += 1;
                    } catch (error) {
                        if (error.status === 404) {
                            pushed += 1; // already gone on the server
                        } else if (error.isNetwork) {
                            remaining.push(item);
                        } else {
                            this.recordConflict(item, null, {
                                code: error.code,
                                message: error.message
                            });
                        }
                    }
                }

                this.queue = remaining.map(item => ({ ...item, attempts: (item.attempts || 0) + 1 }))
                    .filter(item => {
                        if ((item.attempts || 0) <= MAX_ATTEMPTS) return true;
                        console.warn('Dropping queue item after repeated failures', item.id);
                        return false;
                    });

                this.state = this.pendingCount > 0 ? 'pending' : 'synced';
                this.lastSyncedAt = nowIso();
                this.lastError = null;
                this.emit({ pushed });
                return { pushed };
            } catch (error) {
                this.state = error?.isNetwork ? 'offline' : 'error';
                this.lastError = error?.message || 'Sync failed.';
                this.emit();
                throw error;
            }
        }

        recordConflict(item, serverRecord, error) {
            const conflict = {
                id: item?.id || null,
                mine: item?.record || null,
                theirs: serverRecord || null,
                error: error || null,
                at: nowIso()
            };
            this.pendingConflicts.push(conflict);
            this.onConflict(conflict);
        }

        // ---------- pull ----------

        async pull({ full = false } = {}) {
            if (!this.api.isConfigured || !this.api.token) return { changed: 0 };

            const params = { limit: 500 };
            if (!full && this.cursor) params.since = this.cursor;

            let changed = 0;
            let cursor = full || !this.cursor ? null : this.cursor;
            let hasMore = true;

            try {
                while (hasMore) {
                    if (cursor) params.since = cursor;
                    const response = await this.api.listHouseholds(params);
                    const records = response.households || [];

                    if (records.length > 0) {
                        try {
                            this.onRecords(records);
                        } catch (error) {
                            console.warn('Record listener failed', error);
                        }
                        changed += records.length;
                    }

                    cursor = response.nextSince || cursor;
                    hasMore = response.hasMore === true;

                    if (!cursor || records.length === 0) break;
                }

                if (cursor) this.cursor = cursor;
                this.state = 'synced';
                this.lastSyncedAt = nowIso();
                this.lastError = null;
                this.emit({ changed });
                return { changed };
            } catch (error) {
                this.state = error.isNetwork ? 'offline' : 'error';
                this.lastError = error.message;
                this.emit();
                throw error;
            }
        }

        // ---------- lifecycle ----------

        start() {
            if (this.timer) return;
            this.timer = setInterval(() => {
                if (global.navigator && global.navigator.onLine === false) return;
                this.flush().then(() => this.pull()).catch(() => {});
            }, this.intervalMs);
        }

        stop() {
            if (this.timer) clearInterval(this.timer);
            this.timer = null;
        }

        reset() {
            this.queue = [];
            this.cursor = null;
            this.pendingConflicts = [];
            this.emit();
        }

        async syncNow() {
            await this.flush();
            const result = await this.pull();
            return result;
        }
    }

    global.SyncEngine = SyncEngine;
})(typeof window !== 'undefined' ? window : globalThis);
