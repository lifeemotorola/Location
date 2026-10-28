# Browser end-to-end tests

Runs the **real** `index.html`, `app.js` and `js/*.js` inside jsdom against a
**real** Cloudflare Worker (`wrangler dev` with `workerd`), so the frontend and
backend are exercised together over HTTP.

```bash
# terminal 1 — the API
cd server
npx wrangler dev --port 8787 --ip 0.0.0.0

# terminal 2 — the test
cd test-e2e
npm install
node frontend-api.e2e.js
```

Set `API_BASE` to point somewhere else (`API_BASE=https://liberia-locator-api…workers.dev
node frontend-api.e2e.js`), but never against production data: the test creates
households, users and a deliberate conflict.

## What it checks

1. Without an API configured the app stays in local-only mode (record saved, no modal).
2. First run opens the setup wizard (or, on a warm store, the header button opens sign-in).
3. Bootstrap creates the admin and signs the device in.
4. The header shows the signed-in user and a sync state.
5. A household saved locally reaches the server.
6. The queue drains after a successful push.
7. An offline edit is queued, survives the failure, and uploads when the connection returns.
8. A second device signs in with the same account.
9. The second device pulls the records created on the first.
10. A stale write opens the conflict dialog; *Keep server version* resolves it.
11. Server `/api/stats` matches the frontend totals after a full pull.
12. A viewer is read-only: no Add button, no form.
13. A viewer can open a household but sees no edit actions.
14. The account panel lists the team and persists a role change.
15. Demoting yourself removes write access immediately.
16. Signing out keeps local records.


Exits non-zero on any failed check or uncaught console error, so it can gate a
deploy.

## Notes

- Requires `ALLOW_MEMORY=true` (or a disposable Atlas database) in
  `server/.dev.vars`; the in-memory store is wiped whenever `wrangler dev`
  restarts, so the script handles both a fresh store (it bootstraps) and a warm
  one (it signs in).
- Household numbers and the viewer email include a per-run suffix, so repeated
  runs do not collide.
- `LOGIN_RATE_LIMIT="200"` in `.dev.vars` stops the sign-in limiter from tripping
  during repeated runs. Production leaves it unset (10 per 10 minutes).
- jsdom has no map or network stack of its own: `fetch` is bound to the Node
  realm and Leaflet is stubbed with no-op objects. Top-level `const`s are not
  visible across `window.eval`, hence the `window.__getApp` hook.
