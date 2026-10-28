# Architecture

The Liberia Community Locator is split into three pieces. Each one has a single
job, and each is hosted where it is cheapest and safest to host it.

```
┌─────────────────────────────┐        ┌──────────────────────────────┐        ┌─────────────────┐
│  GitHub Pages (static)      │ HTTPS  │  Cloudflare Worker (API)     │  TLS   │  MongoDB Atlas  │
│  index.html · styles.css    │ ─────► │  auth · validation · sync    │ ─────► │  households     │
│  app.js · js/*.js           │  JSON  │  secrets in Worker env       │ driver │  users          │
└─────────────────────────────┘        └──────────────────────────────┘        └─────────────────┘
             │                                        ▲
             │ localStorage (offline cache + queue)   │ bearer token
             ▼                                        │
        the enumerator's phone ───────────────────────┘
```

| Layer | Host | What lives there | What must never live there |
|---|---|---|---|
| Frontend | GitHub Pages | HTML, CSS, vanilla JS, `js/config.js` with the **public** API URL | passwords, tokens, connection strings |
| API | Cloudflare Workers (`liberia-locator-api`) | `/api/*` routes, JWT signing, validation, sync merge rules | the frontend bundle (Pages is the primary host) |
| Database | MongoDB Atlas (M0 free tier is enough) | `households`, `users` collections | — |
| Configuration | Cloudflare Worker secrets + vars | `MONGODB_URI`, `JWT_SECRET`, `BOOTSTRAP_TOKEN`, `ALLOWED_ORIGINS` | anything committed to Git |

`server/.dev.vars` mirrors those secrets **for local development only** and is
gitignored.

---

## Frontend (static, offline-first)

Files and responsibilities:

| File | Responsibility |
|---|---|
| `index.html` | App shell: header, directory, map, household form, detail panel, account modal, conflict dialog, print area |
| `styles.css` | Design system, layout, responsive and print rules |
| `app.js` | `CommunityLocator`: map, form, validation, storage, filters, export/import, printing, role gating, applying server records |
| `js/config.js` | `window.LOCATOR_CONFIG` — the public API URL and sync interval |
| `js/api.js` | `LocatorApi` / `LocatorApiError` — fetch wrapper, bearer token, 15 s timeouts |
| `js/sync.js` | `SyncEngine` — offline queue, push/pull, conflict reporting |
| `js/auth-ui.js` | `AuthUI` — connect-API, sign-in, first-run setup, account panel, team management, conflict dialog |

Because everything is static, the app still opens from a USB stick or `file://`
with no API configured. In that mode `apiBaseUrl` is empty and the app behaves
exactly like the original single-device tool: `localStorage` only, with a
"Connect API" hint in the sidebar.

### Offline-first data flow

1. Every save writes to `localStorage` first (`liberiaCommunityLocator.v2`).
   The UI never waits for the network.
2. With an API configured and a session present, the same change is appended to
   the queue (`liberiaLocator.queue`) and a flush is attempted.
3. `SyncEngine.flush()` posts batches to `POST /api/sync/push`. Results are
   `created`, `updated`, `conflict` or `rejected`.
4. `SyncEngine.pull()` calls `GET /api/households?since=<cursor>`, and the app
   merges with these rules:
   - tombstoned (deleted) server records always win;
   - ids still in the local queue are never overwritten by a pull;
   - otherwise the record with the newest `updatedAt` wins.
5. A `conflict` (409) or `rejected` record opens the conflict dialog with
   *Keep server version* / *Keep my version*. "Keep mine" re-queues the local
   copy with `baseUpdatedAt` set to the server's timestamp and
   `updatedAt = now + 1 s`, so it wins deterministically.
6. The queue survives reloads, retries up to 5 times, and never drops a record
   silently — the header pill shows `Offline`, `N queued`, `Syncing` or `Synced`.

The 15-second full sync timer (`syncIntervalSeconds`) only runs while a session
exists. `navigator.onLine` events and the *Sync now* button trigger it manually.

### Identity on the client

`liberiaLocator.token` and `liberiaLocator.user` hold the session. There are no
cookies: the token is sent as `Authorization: Bearer …`, which keeps the
GitHub Pages → Worker call simple and CSRF-free. Signing out is entirely local —
it clears the token, the cached user and the queue, but **keeps** the household
cache, so a field worker never loses data by signing out. (There is no
server-side session store to revoke; a token simply expires.)

### Roles in the interface

| Role | Add / edit | Delete & purge | Team accounts | View |
|---|---|---|---|---|
| `admin` | ✅ | ✅ | ✅ | ✅ |
| `enumerator` | ✅ | ✅ | — | ✅ |
| `viewer` | — (buttons hidden, form blocked, `canWrite()` returns false) | — | — | ✅ |
| no session (local-only) | ✅ | ✅ | — | ✅ |

`applyPermissions()` is re-run on every session change and after every render of
the detail panel, so a demoted user loses the Add button immediately without a
reload.

---

## API (Cloudflare Worker)

```
server/
├── wrangler.toml        # name, nodejs_compat, non-secret vars
├── .dev.vars            # local secrets (gitignored)
├── src/
│   ├── index.js         # router table, rate limits, health, setup, CORS entry
│   ├── router.js        # tiny method+path matcher
│   ├── http.js          # json(), errorResponse(), corsHeaders(), rate limiter
│   ├── auth.js          # PBKDF2 hashing, HS256 JWT sign/verify
│   ├── validate.js      # household/user normalisation + field-level errors
│   ├── service.js       # business logic (sync merge, stats, users)
│   ├── repo/index.js    # picks MongoRepository or MemoryRepository
│   ├── repo/mongo.js    # MongoDB driver, indexes, queries
│   └── repo/memory.js   # in-memory repo for tests (ALLOW_MEMORY=true)
└── test/*.test.js       # node:test suite (27 tests, no Cloudflare needed)
```

Key decisions:

- **`nodejs_compat` + the native `mongodb` driver.** Hyperdrive does not support
  MongoDB, and the Atlas Data API was retired in September 2025. The driver opens
  a TCP connection per request (~300 ms from a Worker); that is acceptable for
  this workload and avoids running a Durable Object just to hold a socket.
- **No SQL/ORM layer.** Everything the app needs (`find` with `$or`, `$regex`,
  index-backed sort, `updateOne` with a version filter) is a natural MongoDB
  query.
- **Client-generated ids.** A household `_id` is `^[A-Za-z0-9_-]{6,64}$`,
  produced on the device, so a retried push is idempotent.
- **Optimistic concurrency.** Every record carries `rev`, `updatedAt`,
  `serverUpdatedAt` and `updatedBy`. A write may include `baseUpdatedAt`; if the
  stored record is newer the API answers `409` with the current `household`.
- **Soft delete.** `DELETE /api/households/:id` writes a tombstone
  (`deleted: true`, `deletedAt`), which propagates to every device. Purge is a
  separate admin-only hard delete.
- **Sessions.** HS256 JWT, 7-day TTL by default, signed with `JWT_SECRET`.
  Passwords are PBKDF2-SHA256 via WebCrypto with a per-user salt.
- **Rate limits** (per isolate, per key): sign-in 10 per 10 minutes per IP+email,
  bootstrap 5 per hour per IP. `LOGIN_RATE_LIMIT` exists only so local E2E runs
  do not trip the limiter; production leaves it unset.
- **CORS allowlist.** `ALLOWED_ORIGINS` is a comma-separated list; the Worker
  echoes `Access-Control-Allow-Origin` only for those origins and answers `403`
  otherwise. It must include `https://lifeemotorola.github.io` and any local dev
  origin.

### Endpoints

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/health` | `{ ok, database, missingSecrets? }` |
| `GET` | `/api/setup/status` | `{ needsBootstrap }` |
| `POST` | `/api/setup/bootstrap` | `{ token, email, name, password }` → session; one-time |
| `POST` | `/api/auth/login` | email + password → `{ token, user }` |
| `GET` | `/api/auth/me` | current user + session info |
| `POST` | `/api/auth/password` | change own password |
| `GET` | `/api/households` | `since`, `county`, `district`, `status`, `q`, `limit`, `includeDeleted` |
| `POST` | `/api/households/:id` | 201 created · 200 updated · 409 conflict |
| `DELETE` | `/api/households/:id` | tombstone |
| `POST` | `/api/households/:id/restore` | clears the tombstone |
| `DELETE` | `/api/households/:id/purge` | admin only, hard delete |
| `POST` | `/api/sync/push` | `{ households: [{ id, record }] }`, max 500 per batch |
| `GET` | `/api/stats` | totals, statuses, counties, services |
| `GET/POST/PATCH` | `/api/users…` | admin only: list, create, update role/active, reset password |

Errors are always `{ error: { code, message, details? } }` with a matching HTTP
status, so `LocatorApiError` can map them to UI messages and field errors.

---

## Database (MongoDB Atlas)

Database `liberia_locator` (var `MONGODB_DB`):

- `households` — `_id`, `rev`, `deleted`, `updatedAt`, `serverUpdatedAt`,
  `updatedBy`, `createdBy`, `searchText`, plus the full household document.
  Indexes: `{ updatedAt: 1 }` (sync cursor), `{ county: 1, district: 1 }`,
  `{ deleted: 1, updatedAt: -1 }`, text-ish `searchText`.
- `users` — `_id`, `email` (unique, lowercased), `name`, `role`, `active`,
  `passwordHash`, `passwordSalt`, `iterations`, `createdAt`, `lastLoginAt`.

Records are small (a few KB), so the M0 free tier holds hundreds of thousands of
households. Nothing else is cached server-side: the app is the cache.

---

## Testing

| Suite | Command | Covers |
|---|---|---|
| API unit/integration | `cd server && npm test` | routing, auth, validation, repository behaviour, sync merge — 27 tests, in-memory repo |
| Frontend E2E | `cd test-e2e && npm install && node frontend-api.e2e.js` | real `index.html` + `app.js` in jsdom against a live `wrangler dev` API — 16 checks |

The E2E suite bootstraps the first admin (or signs in on a warm store), creates
households, simulates an offline edit, drains the queue, pulls on a "second
device", forces a stale-write conflict, and verifies viewer read-only behaviour
and role changes. It exits non-zero on any failure or console error.
