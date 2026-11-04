# Guide 2: Make Aber deployable

**For:** a coding agent on Maggie's MacBook. **Read first:** [handoff rules](README.md#rules-for-every-agent), then [hosting guide Steps 3–4](../hosting-guide.md#step-3-make-the-app-deployable-code-work) and [build spec section 13](../build-spec.md#13-later-deployment).

## Goal

Aber today is safe only because it listens on `127.0.0.1` and refuses any other hostname. On the team Coolify server it will run in Docker, behind Tailscale Serve, at an address like `https://aber.<tailnet>.ts.net`. Make that work **without weakening anything**: every route except `/healthz` must require Maggie's token, and the app must still run locally exactly as now.

This guide is code only. Nothing here touches the server, Coolify or real secrets. Work on a new branch from `main`, in small commits, and open one PR at the end.

## Where things are now

| Thing | File | Today |
| --- | --- | --- |
| Config | `app/server/src/config.ts` | `host: '127.0.0.1'` hard-coded; reads repo-root `.env` or `ABER_ENV_FILE`; exported variables win |
| Start-up | `app/server/src/index.ts` | Migrates, starts the worker, serves on `config.host:config.port` |
| Host guard | `app/server/src/http/app.ts` (first middleware) and `http/local-request.ts` | 403 unless `Host` is `localhost`, `127.0.0.1` or `[::1]` |
| Origin guard | Same middleware | Non-GET requests with an `Origin` must come from a loopback hostname |
| Routes | `app.ts` | `/healthz`, `/api/*` (dumps, media, world, signals, objects, tools, chat, SSE `events/stream`, link preview), `/media/:id`, then the static web app |
| Build | `app/package.json` `build` | Vite builds `web/dist`; esbuild bundles the server to `dist/server/index.js` with `--packages=external` (so runtime needs production `node_modules`, including native `better-sqlite3`); migrations and prompts are copied beside it |
| Secrets | `.env.example` | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `TYPESAFE_API_KEY` (Jev, calls `api.typesafe.ai`), plus `AGENT_MODE`, `DAILY_SPEND_CAP_USD`, `JEV_*` settings |
| Media | `ffmpeg` on the `PATH` | Voice notes and image conversion |

## Slices

Do them in order. Each ends with tests passing (`npm run typecheck && npm test` in `app/`, allowing for the [known baseline](README.md#known-baseline)).

### 1. Configurable host, fail closed

- Read `HOST` from the environment; default `127.0.0.1`. Keep `PORT`.
- Add `ABER_ALLOWED_HOSTS`: a comma-separated list of exact hostnames, e.g. `aber.example-tailnet.ts.net`. Loopback names are always allowed.
- If `HOST` isn't a loopback address, **refuse to start** unless `ABER_SESSION_SECRET`, `ABER_LOGIN_TOKEN` and `ABER_CAPTURE_TOKEN` are each set and at least 32 characters, and `ABER_ALLOWED_HOSTS` isn't empty. The error message names the missing variable, never its value.
- Tests in `config.test.ts`: the defaults, each refusal, and that error messages contain no secret values.

### 2. Replace the loopback-only guards with an allowed-hosts check

- The Host guard accepts loopback **or** an exact match in `ABER_ALLOWED_HOSTS` (case-insensitive, port optional for loopback only). Keep the existing malformed-authority rejections from `local-request.ts` and its tests.
- The Origin guard accepts `https://<allowed host>` as well as loopback origins.
- Tailscale Serve is reported to pass the `*.ts.net` name as `Host` (moderate confidence). Don't trust `X-Forwarded-*` headers for the allow decision.
- Tests: the existing attacker-host cases still fail; an allowed `ts.net` host passes; a lookalike (`aber.<tailnet>.ts.net.evil.com`, a different tailnet) fails.

### 3. Token auth

The design is decided ([build spec section 13](../build-spec.md#13-later-deployment), Auth row). Build exactly this:

| Piece | Behaviour |
| --- | --- |
| `GET /login` | A tiny static page. Its script reads `location.hash` (the token), immediately clears it with `history.replaceState`, and `POST`s it to `/api/session`. On success it redirects to `/`; on failure it shows "That link didn't work". The token is in the fragment, so it never reaches server logs |
| `POST /api/session` | Body `{ token }`. Compares to `ABER_LOGIN_TOKEN` with a constant-time comparison. On success sets cookie `aber_session`: value signed (HMAC-SHA256) with `ABER_SESSION_SECRET`, `HttpOnly; Secure; SameSite=Strict; Path=/`, long-lived (e.g. 400 days, the browser maximum). Returns 204. Failure returns 401 after a small fixed delay; add a simple in-memory rate limit (e.g. 10 attempts a minute) |
| `POST /api/session/logout` | Clears the cookie |
| Every other route but `/healthz`, `/login` and `/api/session` | Needs a valid `aber_session` cookie **or** `Authorization: Bearer <ABER_CAPTURE_TOKEN>`. Without either: `/api/*` and `/media/*` return 401 JSON; page requests redirect to `/login` |
| Bearer token scope | Only `POST /api/dumps` and `POST /api/media` (what the iPhone Shortcut needs). Everything else with only a bearer token is 403 |
| Local mode | When `HOST` is loopback and the secrets aren't set, auth is **off**, exactly as today, so local development and all existing tests work unchanged |

Notes:

- The SSE stream (`/api/events/stream`) and `<audio>`/`<img>` loads of `/media/:id` can't send headers, so they rely on the cookie. Check both work in a browser test.
- `Secure` cookies need HTTPS. Tailscale Serve provides it. For local tests over plain HTTP, allow a test-only flag rather than dropping `Secure` in production.
- Changing `ABER_SESSION_SECRET` logs every device out. Mention this in the README.
- Use Node's `crypto` (`timingSafeEqual`, `createHmac`); don't add an auth dependency.

Tests (Vitest, against `createApp`): no credentials → 401 on every `/api/*` route and `/media/*`; a page → redirect; wrong login token → 401; right token → cookie with the right attributes; tampered cookie → 401; bearer on `/api/dumps` → accepted; bearer on `/api/world` → 403; `/healthz` always 200; local mode unchanged. One Playwright test: open `/login#<token>`, land on the app, see the empty Briefing, reload and stay signed in, and confirm the URL no longer contains the token.

### 4. Container

- **`Dockerfile`** at the repo root, so Coolify can build from the repo without extra settings. It only needs `app/`:
  - build stage: Node 22 or later, `npm ci` in `app/`, `npm run build`;
  - runtime stage: `node:22-slim` (or the current LTS slim image) plus `ffmpeg`, `npm ci --omit=dev` (native `better-sqlite3` must be built for this image), copy `app/dist` and `app/web/dist`;
  - runs as a non-root user, `WORKDIR /app`, `ENV HOST=0.0.0.0 PORT=3000 ABER_DATA_DIR=/app/data`;
  - `HEALTHCHECK` against `http://127.0.0.1:3000/healthz`;
  - `CMD ["node", "dist/server/index.js"]`. **Never run `npm run seed` in the image or at start-up.**
  - Check `config.ts`'s `appDir` resolves so the server finds `web/dist`, migrations and prompts in the container layout; adjust the copy paths rather than the code if possible.
- **`.dockerignore`**: `.env`, `.env.*` (keep `.env.example`), `**/node_modules`, `app/data`, `app/backups`, `app/dist`, `app/test-results`, `reports`, `.git`, `jig`, `design`.
- **`compose.yaml`**:
  ```yaml
  services:
    app:
      build: .
      restart: unless-stopped
      ports:
        - "127.0.0.1:3000:3000"   # never "3000:3000": Docker bypasses host firewalls
      volumes:
        - ./data:/app/data
      environment:
        HOST: 0.0.0.0
      # Coolify injects the other variables; locally use: env_file: .env
  ```
  Litestream and media backup are added in slice 5.
- Verify locally with Docker Desktop (or OrbStack, whichever Maggie has; ask before installing either):
  ```bash
  docker compose up --build
  ```
  with a throwaway `.env.docker` holding **fake** values (`AGENT_MODE=fake`, random 32+ character tokens generated with `openssl rand -base64 32`, `ABER_ALLOWED_HOSTS=localhost`). Then check `curl -s http://127.0.0.1:3000/healthz` is 200, `/api/world` without a cookie is 401, and the database in `./data` starts **empty** (zero themes).
- Check the image holds no secrets: `docker run --rm <image> sh -c 'ls -a /app; env | grep -c KEY'`, which should show no `.env` and no key variables baked in.

### 5. Backups as sidecars

- **Litestream** service in `compose.yaml`, sharing `./data`, replicating `/app/data/aber.db` to an S3-compatible bucket. Config file `litestream.yml` committed; bucket, endpoint and keys come from environment variables (`LITESTREAM_ACCESS_KEY_ID`, `LITESTREAM_SECRET_ACCESS_KEY`, `LITESTREAM_BUCKET`, `LITESTREAM_ENDPOINT`). Follow [Litestream's docs](https://litestream.io/) for the current config format; pin an exact image version.
- **Media backup** service: `restic` to the same bucket under a separate prefix, hourly, reading `RESTIC_PASSWORD` and the same keys. restic rather than `rclone sync`, because a sync mirrors deletions. Pin the image version.
- SQLite runs in WAL mode already, which Litestream needs.
- **Test against MinIO** (S3 stand-in) in a `compose.test.yaml`: write a dump, wait for replication, stop everything, restore the database with `litestream restore` into an empty folder, start the app on it, and check the dump is there. Do the same for one media file with `restic restore`. Commit this as a script, `app/scripts/restore-drill.sh` (or `.ts`), that the real drill in Guide 3 can reuse with real credentials.

### 6. Docs and env example

- Add to `.env.example`, commented, with no values: `HOST`, `ABER_ALLOWED_HOSTS`, `ABER_SESSION_SECRET`, `ABER_LOGIN_TOKEN`, `ABER_CAPTURE_TOKEN`, the Litestream and restic variables. One line each on what it's for and how to generate it.
- Update `app/README.md`: how to run the container locally, how auth behaves locally vs deployed, and that the deployed database starts empty.
- Update the variables table in [hosting guide Step 4](../hosting-guide.md#step-4-keys-and-tokens) if any names changed, and tick off what's now built in its Step 3 table.

## Done when

- [ ] `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`, `npm run smoke:production` pass (baseline exceptions noted)
- [ ] Local `npm start` works exactly as before, with no tokens set
- [ ] The container starts, is healthy, refuses unauthenticated requests, starts empty, and holds no secrets
- [ ] Login works end to end in Playwright, and the token leaves the URL
- [ ] The MinIO restore drill passes for the database and a media file
- [ ] `docker compose config` shows the app port bound to `127.0.0.1` only
- [ ] One PR, with a description listing each slice and its checks

## Report

The PR link; the output of each check above; any judgement calls (state confidence); anything you couldn't verify on the Mac.
