# Liberia Locator API

Cloudflare Worker that stores Liberia Community Locator households in MongoDB
Atlas, issues sessions, and merges offline edits coming from the field.

- **Host:** Cloudflare Workers (`nodejs_compat`, native `mongodb` driver)
- **Database:** MongoDB Atlas — database `liberia_locator`
- **Secrets:** `MONGODB_URI`, `JWT_SECRET`, `BOOTSTRAP_TOKEN`, `ALLOWED_ORIGINS`
  (set with `npx wrangler secret put NAME`, never committed)
- **Frontend:** separate static site on GitHub Pages — see
  [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md)

Architecture, data model and sync rules: [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

---

## Quick start (local)

```bash
npm install
cp .dev.vars.example .dev.vars    # then edit the values
npm test                          # 27 tests, in-memory repo, no Atlas needed
npx wrangler dev --port 8787 --ip 0.0.0.0
```

With `ALLOW_MEMORY="true"` in `.dev.vars` nothing touches Atlas and the store is
empty on every start — the frontend will show the setup wizard again. Use
`BOOTSTRAP_TOKEN` from `.dev.vars` to create the first admin, or point
`MONGODB_URI` at a real (or Atlas free-tier) cluster.

```bash
curl -s localhost:8787/api/health | jq
curl -s localhost:8787/api/setup/status | jq
```

## Deploy

```bash
npx wrangler login
npx wrangler secret put MONGODB_URI
openssl rand -base64 48 | npx wrangler secret put JWT_SECRET
npx wrangler secret put BOOTSTRAP_TOKEN
npx wrangler secret put ALLOWED_ORIGINS   # https://lifeemotorola.github.io,http://localhost:8000
npx wrangler deploy
```

Then set the printed `*.workers.dev` URL as `apiBaseUrl` in the frontend's
`js/config.js`. Full step-by-step, including Atlas setup and verification:
[`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md).

## Configuration

| Name | Where | Default | Purpose |
|---|---|---|---|
| `MONGODB_URI` | secret | — | Atlas connection string (required) |
| `JWT_SECRET` | secret | — | HS256 signing key, ≥32 chars (required) |
| `BOOTSTRAP_TOKEN` | secret | — | Enables the one-time first-admin setup |
| `ALLOWED_ORIGINS` | secret | `http://localhost:8000` | Comma separated CORS allowlist |
| `MONGODB_DB` | var | `liberia_locator` | Database name |
| `AUTH_TTL_SECONDS` | var | `604800` | Session lifetime |
| `PASSWORD_ITERATIONS` | var | `100000` | PBKDF2 work factor |
| `ALLOW_MEMORY` | var (dev only) | unset | In-process store for tests |
| `LOGIN_RATE_LIMIT` | var (dev only) | `10` | Sign-in attempts per 10 min |

## API

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/health` | — | `{ ok, database, missingSecrets? }` |
| `GET` | `/api/setup/status` | — | `{ needsBootstrap }` |
| `POST` | `/api/setup/bootstrap` | bootstrap token | Creates the first admin, returns a session |
| `POST` | `/api/auth/login` | — | `{ email, password }` → `{ token, user }` |
| `GET` | `/api/auth/me` | bearer | Current user |
| `POST` | `/api/auth/password` | bearer | Change own password |
| `GET` | `/api/users` | admin | Team list |
| `POST` | `/api/users` | admin | Add an account |
| `PATCH` | `/api/users/:id` | admin | Role, active flag, password reset |
| `DELETE` | `/api/users/:id` | admin | Remove an account (cannot remove yourself or the last admin) |
| `GET` | `/api/households` | — | `since`, `county`, `district`, `status`, `q`, `limit`, `includeDeleted` |
| `GET` | `/api/households/:id` | — | One record (including tombstones) |
| `POST` | `/api/households/:id` | writer | 201 created · 200 updated · 409 conflict with `household` |
| `DELETE` | `/api/households/:id` | writer | Soft delete (tombstone) |
| `POST` | `/api/households/:id/restore` | writer | Clear the tombstone |
| `DELETE` | `/api/households/:id/purge` | admin | Hard delete |
| `POST` | `/api/sync/push` | writer | `{ households: [{ id, record }] }`, ≤500 items |
| `GET` | `/api/stats` | — | Totals, statuses, counties, services |

Errors: `{ "error": { "code", "message", "details"? } }` with the matching HTTP
status. `details` carries per-field validation messages that the frontend shows
inline.

## Sync contract

`POST /api/sync/push` returns one result per submitted record:

```json
{
  "ok": true,
  "results": [
    { "id": "hh_1793_ab12cd", "status": "created", "ok": true, "household": { "rev": 1, "...": "server copy" }, "warnings": [] },
    { "id": "hh_1793_ef34gh", "status": "conflict", "ok": false, "household": { "...": "current server copy" }, "warnings": [] },
    { "id": "hh_1793_ij56kl", "status": "rejected", "ok": false,
      "error": { "code": "validation_failed", "message": "…", "details": [] } }
  ],
  "summary": { "created": 1, "updated": 0, "conflict": 1, "rejected": 1 },
  "serverTime": "2026-10-28T17:20:00.000Z",
  "latest": "2026-10-28T17:20:00.000Z"
}
```

Rules the server enforces:

- A record may carry `baseUpdatedAt`; if the stored copy is newer the write is a
  `conflict` and nothing is overwritten.
- Tombstones always win; restoring requires the explicit `/restore` route.
- Rejected records are *not* retried by the client — they surface in the conflict
  dialog so a human can fix the data.
- `rev` increments on every accepted write and is stored next to
  `serverUpdatedAt` / `updatedBy` for auditing.

## Tests

```bash
npm test          # node --test test/*.test.js — 27 tests
npm run check     # wrangler deploy --dry-run --outdir dist
```

The suite runs entirely in Node against `MemoryRepository`, so it needs no
network and no Cloudflare account. It covers routing and CORS, auth
(login/password/roles/expiry), validation, households CRUD, tombstones, stats
and the sync merge rules.

The browser-level end-to-end test lives in [`../test-e2e/`](../test-e2e/) and runs
the real frontend against `wrangler dev`.
