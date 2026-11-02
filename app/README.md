# Aber locally

Requires Node 22.13+ (tested on Node 24), npm and ffmpeg for voice notes and image conversion. Everything binds to `127.0.0.1`.

## Run

Enter keys in the repository-root `.env` (see `.env.example`), then:

```sh
cd app
npm install
npm run db:migrate
npm run seed
npm run dev
```

Open [Aber](http://127.0.0.1:5174). The API and background worker run on port 3000; the canonical jig remains on 5181. Port 5174 avoids another project already using 5173.

The seed is fictional material from the design jigs. It only goes into an empty database: reseeding an example database does nothing, and seeding a database that already holds real captures is refused. Without the seed, the app starts empty, which is how the deployed version runs. `app/data/aber.db` and `app/data/media/` contain local data. Set `ABER_DATA_DIR` to use another directory, for example one folder for example data and another for real use.

`OPENAI_API_KEY` enables agents, transcription and embeddings. `ANTHROPIC_API_KEY` enables Claude alternatives and comparison evals. Models live in `server/src/agents/models.ts`. `AGENT_MODE=fake` runs deterministic scripted models; `live` uses providers. `DAILY_SPEND_CAP_USD` defaults to 5.

`TYPESAFE_API_KEY` is required for the server-side Jev decision paths in live mode. Following the evaluated rollout, **evidence linking, tripwires (including lookback), processing and read-only chat shortcuts default to on; near-duplicate decisions default to off** and keep the original checker. Set `JEV_LINK_EVIDENCE_MODE`, `JEV_TRIPWIRE_MODE`, `JEV_PROCESS_DUMP_MODE` or `JEV_CHAT_MODE` to `off` to restore that workflow's original generative behavior, or `shadow` to record Jev judgments without applying them. `JEV_NEAR_DUP_MODE` remains independently switchable. Explicit per-job flags take precedence over `JEV_MODE`, which can override defaults globally for jobs without a flag. Existing explicit off settings are respected, not rewritten. Restart the server/worker after changing environment settings. `JEV_MODEL` defaults to pinned `jev-1.14.0`; moving aliases are rejected. Jev does not write prose or decide permissions.

The focused cascade batches independent judgments, then resolves only uncertain fields rather than replaying a whole capture. Evidence explanations use attributed observation templates; ambiguous chat targets ask for clarification without displaying unrelated objects. Processing in **on** mode uses the existing cheaper evidence-job model for extraction and prose, with source, finding-boundary, filing and draft checks around its writes. Off/shadow keep the original processing model. Traces record the selected model and its actual configured prices, as well as Jev distributions, versions and fallback use. Neither a typed answer nor a fallback can bypass the domain tools' authority checks.

Worktrees can reuse an existing local environment file by exporting `ABER_ENV_FILE=/absolute/path/to/.env`. The server and eval runner read that file without copying or changing it; exported environment variables take precedence, and a missing explicitly selected file is an error. Never commit the file or print its keys. See [evaluation guidance](evals/README.md) for offline scripts and explicitly budgeted live comparisons.

## Check processing quality

The approved processing rollout favors its lower cost despite slower completion. Regularly review a small sample rather than treating Jev confidence or fake eval passes as proof of accurate gists and filings:

```sh
cd app
umask 077
npm run --silent review:processing -- --limit 10 --pool 100 --seed 2026-11-03 > /tmp/aber-processing-review.json
```

This read-only, no-network script samples up to ten of the most recent 100 completed non-chat captures (including captures that created no signals). The seed makes selection repeatable for the same pool; change it for a new sample. Use `--db /absolute/path/to/aber.db` for a specific database; otherwise it reads `ABER_DATA_DIR/aber.db`. A missing database is an error, never a new file.

The local JSON includes original capture/transcript/link material, saved source text, current gists/notes and theme filings with provenance, the theme catalog for spotting missed filings, draft/tool events, and full processing run traces including Jev decisions, versions and fallback results. For each capture, compare the source to the gists, check independent findings and missing/incorrect filings, and fill the `review` booleans/notes in a local copy. Current rows may include later edits; inspect their provenance. Empty pools and missing traces are explicit. It is a manual review aid, not an automated semantic score, and does not change application data or add automatic actions. **Reports may contain private material; keep them local and out of git.**

For one production process:

```sh
npm run build
npm start
```

Open [the built app](http://127.0.0.1:3000). The build includes database migrations and prompts. Do not run development and production servers on port 3000 simultaneously.

## Checks

```sh
npm run typecheck
npm test
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/aber-playwright npx playwright install chromium webkit
npm run test:e2e
npm run test:workflow
npm run build
npm run smoke:production
npm run smoke:checkout
npm run smoke:providers
npm run eval -- --fake
npm run eval -- --compare
```

Browser tests seed an isolated temporary database and explicitly use fake mode. Screenshots are in `app/test-results/parity/`; traces and failed-test screenshots are in `app/test-results/runs/`. The canonical-jig parity test requires the jig server on port 5181. Provider smoke tests and live evals make paid API requests; eval output identifies synthetic fixtures and records usage.

`smoke:checkout` exports only committed app source into a temporary folder, reuses the installed dependencies, removes API keys from its child environment, then builds and runs the production smoke. It checks for missing committed files; it does not reinstall dependencies.

`npm run backup` copies a consistent database snapshot and media into `app/backups/<timestamp>/`. This build has no deployment or remote access.

## Optional richer demo

Create the authored demo in a **new, separate directory**:

```sh
npm run seed:demo -- --dir /private/tmp/aber-demo
AGENT_MODE=fake ABER_DATA_DIR=/private/tmp/aber-demo PORT=3001 npm start
```

Open [the demo](http://127.0.0.1:3001). It adds a Robotics draft theme, theory and prototype, a pending revision, two independent sources for one merged incident, a separate latency finding and a playable synthetic voice note. The original seed stays intact. No model calls or queued jobs run; repeat seeding leaves the demo unchanged. Existing directories without the matching demo manifest are refused. The main app on port 3000 keeps its own data.

## Capture from another local tool

With the server running on port 3000:

```sh
curl -sS http://127.0.0.1:3000/api/dumps \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: example-text-1' \
  -d '{"text":"A small observation to investigate","from":"shortcut"}'

curl -sS http://127.0.0.1:3000/api/dumps \
  -H 'Content-Type: application/json' \
  -d '{"text":"An article to read","urls":["https://example.com/article"],"from":"shortcut"}'

curl -sS http://127.0.0.1:3000/api/dumps \
  -F 'file=@/absolute/path/voice-note.m4a' \
  -F 'note=A voice observation' \
  -F 'from=shortcut'
```

Capture returns a dump ID immediately. The background worker fetches links, transcribes audio and files signals; the Dump log shows progress and retry status. Reuse an idempotency key only for retries of the same capture. Media uploads may total up to 250 MB.

The Apple Shortcut is later and optional. It needs reachable hosting and authentication; see [hosting guide step 8b](../docs/hosting-guide.md#8b-the-dump-shortcut). This build listens only on the laptop.

See [verification results](../docs/verification.md) and [build decisions](../docs/build-notes.md). Three design critique rounds and a final screenshot recheck are retained in `reports/` at the repository root. TypeSafe screenshot export was approved, but its full review received an API context-limit error and returned no valid judgement. Details are in `reports/design-check/summary.md`; current UI corrections and verification are in `docs/ui-issues.md`.

Review reports, screenshots and temporary test outputs are retained locally under ignored directories; they are not part of the public repository.
