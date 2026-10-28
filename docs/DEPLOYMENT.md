# Deployment runbook

Three accounts, three steps, about 20 minutes. Do them in this order — each step
produces a value the next one needs.

Order of operations (important):

1. **MongoDB Atlas** → connection string
2. **Cloudflare Worker** → API URL (needs the connection string)
3. **GitHub Pages** → frontend (needs the API URL in `ALLOWED_ORIGINS`)

You will end up with:

| Value | Example | Secret? |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://locator:…@cluster0.abc.mongodb.net/?retryWrites=true` | **yes** |
| Worker URL | `https://liberia-locator-api.<subdomain>.workers.dev` | no |
| Pages URL | `https://lifeemotorola.github.io/Location/` | no |

---

## 1. MongoDB Atlas (the database)

1. Create a free account at <https://www.mongodb.com/cloud/atlas/register> and
   build an **M0 (free)** cluster in the region closest to West Africa —
   `AWS / eu-west-1` (Ireland) has the lowest latency from Monrovia.
2. **Database Access → Add New Database User**
   - Authentication: password
   - Username: `locator`
   - Password: *Autogenerate* and copy it — you cannot see it again.
   - Role: **Read and write to any database**
3. **Network Access → Add IP Address → Allow Access from Anywhere**
   (`0.0.0.0/0`). This is required: Cloudflare Workers have no fixed egress IPs,
   and Atlas has no gateway in front of them. The password plus TLS is the
   protection; rotate it if it ever leaks.
4. **Clusters → Connect → Drivers** and copy the string. Replace `<password>`
   with the generated password and add the database name:

   ```
   mongodb+srv://locator:<password>@cluster0.abc.mongodb.net/liberia_locator?retryWrites=true&w=majority
   ```

   URL-encode any reserved characters in the password (`@` → `%40`, `:` → `%3A`,
   `/` → `%2F`). The Worker also reads `MONGODB_DB` (default
   `liberia_locator`), so the path segment is optional.

Nothing needs to be created by hand: the Worker creates the `households` and
`users` collections and their indexes on first use.

---

## 2. Cloudflare Worker (the API)

```bash
cd server
npm install
npx wrangler login          # opens the browser once
```

### 2a. Set the secrets

Never put these in `wrangler.toml` or Git. Run each `secret put` and paste the
value when prompted:

```bash
# 1. Atlas connection string from step 1
npx wrangler secret put MONGODB_URI

# 2. Session signing key — 48 random bytes, base64
openssl rand -base64 48 | npx wrangler secret put JWT_SECRET

# 3. One-time setup password; the first admin needs it to claim the deployment
openssl rand -hex 24 | npx wrangler secret put BOOTSTRAP_TOKEN
#    ^ copy the value it prints — you will type it into the app or curl below

# 4. CORS allowlist (comma separated, no spaces)
#    Include the Pages origin now; use the exact origin, no trailing slash.
npx wrangler secret put ALLOWED_ORIGINS
#    → https://lifeemotorola.github.io,http://localhost:8000
```

Notes:

- `JWT_SECRET` must be at least 32 characters. Changing it signs everybody out.
- `BOOTSTRAP_TOKEN` can be deleted after the first admin exists:
  `npx wrangler secret delete BOOTSTRAP_TOKEN`.
- `http://localhost:8000` in `ALLOWED_ORIGINS` is only for local development.
  It is harmless but you can drop it in a locked-down deployment.

### 2b. Deploy

```bash
npm test                       # 27 API tests, no Cloudflare or Atlas needed
npx wrangler deploy --dry-run --outdir dist   # bundle check
npx wrangler deploy
```

The output prints the Worker URL, e.g.
`https://liberia-locator-api.<subdomain>.workers.dev`. Save it.

### 2c. Verify

```bash
API=https://liberia-locator-api.<subdomain>.workers.dev

curl -s $API/api/health | jq
# { "ok": true, "service": "liberia-locator-api", "database": "mongodb", ... }

curl -s $API/api/setup/status | jq
# { "ok": true, "needsBootstrap": true }
```

If `ok` is false, `missingSecrets` names the secret that is still unset, and
`database: "unconfigured"` means `MONGODB_URI` is absent or rejected.

Watch live logs while testing:

```bash
npx wrangler tail
```

### 2d. Create the first administrator

Either open the app after step 3 (it shows the setup wizard automatically), or
do it from the shell:

```bash
curl -s -X POST $API/api/setup/bootstrap \
  -H 'Content-Type: application/json' \
  -d '{"token":"<BOOTSTRAP_TOKEN>","email":"you@example.lr",
       "name":"Your Name","password":"a-long-password-here"}' | jq
```

`needsBootstrap` becomes `false` permanently once a user exists. Everyone else is
added from **Account → Manage accounts** inside the app.

> **Do not** set `ALLOW_MEMORY` in production. That variable switches the Worker
> to an in-process store used by the tests; data disappears on redeploy. It lives
> only in `server/.dev.vars`.

---

## 3. GitHub Pages (the frontend)

### 3a. Point the app at the Worker

Edit `js/config.js` on `main`:

```js
window.LOCATOR_CONFIG = {
    apiBaseUrl: 'https://liberia-locator-api.<subdomain>.workers.dev',
    appName: 'Liberia Community Locator',
    syncIntervalSeconds: 60
};
```

This URL is public and safe to commit — it is the one in the browser address bar
anyway. Commit and push.

### 3b. Enable Pages

**Repository → Settings → Pages → Build and deployment → Source: GitHub Actions.**

That is the only setting. `.github/workflows/deploy-pages.yml` then publishes
`index.html`, `app.js`, `styles.css` and `js/` on every push to `main` that
touches the frontend (and on manual *Run workflow*). `server/` is never
published; the workflow copies only the static files into an artifact and runs
`node --check` on every script first.

The site appears at `https://<user>.github.io/Location/`. For
`lifeemotorola/Location` that is **https://lifeemotorola.github.io/Location/**.

### 3c. Match the origin exactly

The browser sends `Origin: https://lifeemotorola.github.io` (no path). Confirm it
is in `ALLOWED_ORIGINS`. If you deploy to a custom domain, add that origin too:

```bash
npx wrangler secret put ALLOWED_ORIGINS
# https://lifeemotorola.github.io,https://locator.example.lr
```

A wrong or missing origin shows up as a browser CORS error and the app falls
back to local-only mode. The Worker answers `403` for unlisted origins — check
with:

```bash
curl -si -X OPTIONS $API/api/households \
  -H 'Origin: https://lifeemotorola.github.io' \
  -H 'Access-Control-Request-Method: GET' | grep -i access-control-allow-origin
```

### 3d. First sign-in

Open the Pages URL → the setup wizard asks for the bootstrap token, the admin
name, email and password (only if no account exists yet). After that, the same
button in the header becomes **Sign in**.

---

## Local development

Two terminals:

```bash
# 1. API — wrangler reads server/.dev.vars
cd server
cp .dev.vars.example .dev.vars   # if the file is missing; fill in values
npx wrangler dev --port 8787 --ip 0.0.0.0

# 2. Static site
cd ..
python3 -m http.server 8000 --bind 0.0.0.0
```

Then open <http://localhost:8000>, click the account button and set the API
address to `http://127.0.0.1:8787` (it is stored per device in
`localStorage['liberiaLocator.apiBaseUrl']`, so you never need to edit
`js/config.js` while developing).

For a throwaway local database, `ALLOW_MEMORY="true"` in `.dev.vars` skips Atlas
entirely — but everything is lost when `wrangler dev` restarts.

### Tests

```bash
cd server && npm test                                   # 27 API tests
cd test-e2e && npm install && node frontend-api.e2e.js  # 16 browser checks
```

The E2E suite needs the dev API on `:8787` with `ALLOW_MEMORY=true` and
`LOGIN_RATE_LIMIT` raised (both already in `.dev.vars`). It works against a fresh
store (it bootstraps) and against a warm one (it signs in), and creates uniquely
named households each run, so it is safe to re-run.

---

## Operations

| Task | Command |
|---|---|
| Tail logs | `cd server && npx wrangler tail` |
| Redeploy API | `cd server && npx wrangler deploy` |
| Rotate the DB password | Atlas → Database Access → Edit → Autogenerate, then `npx wrangler secret put MONGODB_URI` and redeploy |
| Rotate the signing key | `openssl rand -base64 48 \| npx wrangler secret put JWT_SECRET` (signs everyone out) |
| Roll back the API | Cloudflare dashboard → Workers → `liberia-locator-api` → Deployments → *Rollback* |
| Roll back the frontend | `git revert <commit>` and push to `main` (Pages redeploys), or re-run an older workflow run |
| Back up the data | `mongodump --uri "$MONGODB_URI" --out backup/` (or Atlas → Backup) |

### Cost

Atlas M0 and GitHub Pages are free. The Worker sits on the free plan (100k
requests/day); a household batch push is 1 request, so a 20-enumerator team
staying under a few thousand records a day is well inside that. Workers free
plan CPU is 10 ms per request — the PBKDF2 login is the heaviest call, which is
why the iteration count is tuned by `PASSWORD_ITERATIONS` (default 100k).

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| App shows "Saved on this device" | `apiBaseUrl` empty or API unreachable | Set it in `js/config.js` or via **Connect API**, then reload |
| `Failed to fetch` in the console | Origin not in `ALLOWED_ORIGINS` | Add the exact origin, redeploy not needed (secret change is instant) |
| `503` from `/api/health` | `MONGODB_URI` or `JWT_SECRET` missing | `missingSecrets` in the response names it |
| `Cannot reach the server` toast, records still save | Offline or Worker down — this is the intended offline behaviour | Check `/api/health`; queued changes upload automatically |
| Sign-in says "Too many attempts" | Rate limit (10 per 10 min per IP+email) | Wait, or sign in from another network |
| Setup wizard reappears | No user exists in `users` | Re-run bootstrap; check `MONGODB_DB` points at the database you expect |
| Data vanished after a redeploy | `ALLOW_MEMORY` still set | Remove it: `npx wrangler secret delete ALLOW_MEMORY`, redeploy |
| Conflict dialog keeps appearing | Two devices editing the same household offline | Choose *Keep server version* or *Keep my version*; the loser is re-queued with a fresh timestamp |
