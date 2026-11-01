# Aber build notes

## Preflight — 31 October 2026

- Follow `build-spec.md` for implementation, `design-model.md` for meaning, and the canonical jigs for visuals and motion. The user authorises autonomous decisions and subagents for the overnight local build.
- Preserve the existing uncommitted changes in `design/` and `jig/`; those sources are read-only during implementation.
- Use the repository-root `.env`, with an explicit loader from the app so `cd app` does not change which file is read. `.env` is ignored and has mode `0600`; `.env.example` contains no credentials.
- Live mode needs `OPENAI_API_KEY`. `ANTHROPIC_API_KEY` enables the requested provider comparison and Claude alternatives. No hosting, auth, Tailscale, backup-service or database credentials are needed this round.
- Default `DAILY_SPEND_CAP_USD=5`. Use fake mode and isolated temporary databases for deterministic automated tests. Record live eval usage separately and respect the configured budget.
- Project write access and read access to `~/Projects/maggie-agent-kit` are available. Node 24, npm, Bun, ffmpeg and Xcode command-line tools are installed; Playwright browser caches exist.
- Shell networking requires approved escalation. An approved registry request succeeded; use an explicit npm registry and a writable temporary npm cache, leaving global configuration alone.
- Synthetic seed/eval material is authorised. Real personal dumps would improve evaluation but are optional for this build; do not present synthetic evaluation as validation on Maggie's own material.
- No deployment, push or pull request is requested. Keep the app local and write decisions, verification evidence and remaining gaps here.

## Initial implementation and integration — 31 October

- Local branch: `maggie/aber-v1`. Implementation stays in this checkout to use the user's uncommitted canonical jig changes. Only explicit build paths will be committed; design sources remain untouched.
- Dependencies installed and locked. AI SDK 7.0.159, OpenAI provider 4.0.106 and Anthropic provider 4.0.94 are available. Native SQLite and esbuild installation scripts were approved, rebuilt and verified.
- Both entered keys passed small live requests: `gpt-6.1-terra` and `claude-sonnet-5-5` returned HTTP 200. No credentials were printed or copied into source.
- SQLite migrations create 30 tables; integrity check passes. Initial seed has 7 themes, 10 theories, 13 signals, 5 dumps and 4 prototypes. The source jigs' larger illustrative counts are replaced with honest derived database counts.
- Seed domains have synthetic, distinct source URLs because the jig only supplies domains. Seeded voice-dump labels have no invented recordings; a separate 8.3-second synthetic audio fixture tests real uploads/transcription.
- Ambiguity: when capture includes both `text` and `note`, retain both verbatim with one separating newline in the single stored text field.
- Media is stored under UTC year/month folders with SHA-256 hashes. Audio supports HTTP byte ranges for seeking. Capture validates payloads, enforces local origins, and returns immediately before processing.
- First integration tests exposed and fixed null attachment titles in fake processing, JSON-serialised embedding BLOBs in restore snapshots, and copied ARIA/definition-list markup. Tests now cover those regressions.
- Accessibility exception to visual parity: darken the semantic muted-text token from the jig's `#8a8a8a` to `#686868` so small labels meet contrast requirements. The original jigs remain unchanged.
- The first real processing run reached the model but stopped at the conservative input-size guard after rich UI query results filled its context. Model-facing tool projections now omit audit metadata, duplicate field aliases, embeddings and recursive run traces; UI queries and stored traces retain full records. Subsequent live text, voice and image processing succeeded.
- Initial integration failures in contrast scoping and Timeline ARIA roles were repaired. The latest complete integration run before the final action audit passed 94 unit/integration tests, 17 core browser checks, nine workflow checks, typecheck, build and the production smoke test. The final audit added further regression tests; final totals belong in the verification report.

## Final integration — 1 November

- Three screenshot-based design reviews compare the rendered app with the canonical jig. Reports and desktop/phone/motion evidence are in `reports/design-round1/`, `design-round2/` and `design-round3/`. The reviews caught missing saved chat text, clipped Columns expansion, related objects not sorting first, singular counts and overflowing context pills. Those were repaired. The [final recheck](../reports/design-final/report.md) verifies the 40px desktop tripwire target and reports no material findings in its inspected scope.
- Controls use 40px hit areas while retaining compact visual marks. Confidence is one accessible slider around five bars. An accepted draft has no confidence until the person sets it; no invented middle value is displayed. Chart-point picking retains the chart's spatial model.
- The interface-grammar gate covered the six domain nouns, their named actions, actor authority, spatial layers, progressive disclosure and visual encodings. Views share the same object pane and relationships. Dashed borders retain draft/proposal meaning; retirement preserves history; discard, dump deletion and retirement remain different operations. No new domain tier or verb was introduced.
- `undoMerge` applies an inverse delta, preserving later notes, sources, origins, filings and evidence. It refuses to cross a later merge or resurrect binned, purged or discarded material. Shared-origin bin restores compose in either order. Failed-run cleanup protects person and other-run work.
- Retry now settles the parent dump after child jobs finish. Periodic stale-lock recovery handles crashes even when startup happened before the lock became stale. A third failed crash attempt leaves the dump visibly failed instead of permanently Processing.
- Input guards count the actual projected messages and schemas. Empty text from image-only or URL-only captures skips text embedding. A real image was read by vision, not represented as an attachment title. Images are converted to bounded JPEG inputs; voice is converted with ffmpeg and transcribed.
- The agent layer keeps job prompts and provider selection separate from restricted typed tools. Traces, usage, retries, cleanup and the daily cap are persisted. Budget-limited evals explicitly report incomplete results and exit unsuccessfully rather than claiming skipped cases passed.
- The final action audit found six concrete gaps: body/retired search, complete revision review and rephrase, tripwire lookback beyond 100 candidates, all three draft-card kinds, retired prototype dependencies, and manual signal merge. Repairs now have durable browser regressions with separate fake databases. Timeline horizon-only movement preserves the stance count; movement to a different confidence row appends exactly one stance.
- Rephrasing a revision marks theory authorship `rephrased` only when the person's wording differs from the proposal. Accepting unchanged wording preserves authorship; undo restores the prior value.
- A further preservation review caught suggestion Undo overwriting later wording, horizon, tripwire and evidence decisions. Undo now reverses only the accepted fields that still match, leaving later changes and explicit unlinks intact. An explicit full-body rephrase takes precedence over a proposed paragraph insertion.
- Bin → merge → restore now resolves the current survivor before replaying origins or relationships. Both detached-origin and removed-signal snapshots are covered, including merge chains, a binned survivor, later Undo and expiry of other origins. The restored live origin survives purge. Invalid recovery chains fail atomically.
- Five additional spatial browser tests prove Atlas disclosure thresholds and drag suppression, Timeline levels/chain morph/drag persistence, Columns rails and related counts, and pointer pane snapping. A browser-generated audio stream also passes through the actual MediaRecorder: cancel makes no capture; stop uploads valid audio, processes it, and replays after reload. These tests do not substitute for the separate real-provider transcription check.

### Scope decisions

- Theme/theory merging remains suggestion-only. The v1 producer is deferred by the spec; the existing proposal/accept path must still render supplied proposals. No direct person merger or extra deduplication job was invented.
- Search uses the typed backend contract and includes retired history. Dumps also match their raw text and transcripts. Signals and dumps open their existing Columns/detail destinations rather than gaining another pane type.
- Tripwire lookback uses the stated 90-day window before pagination. All eligible signals must be visited; per-signal/version jobs keep retries and budget pauses bounded.
- Very large article content fails explicitly at the input guard rather than silently truncating source material. Fetch failures remain visible in traces and do not prevent an observation from becoming a signal.
- Atlas packing is deterministic for arbitrary data. Phone support remains Briefing plus full-screen pane; the other four views are desktop surfaces, as specified.
- Source jigs are read-only. A single implementation branch keeps the shared overnight workspace coherent; changes are grouped into focused commits after verification. The copied spec's Claude co-author trailer is omitted because these agents are Codex.

### Live quality evidence

All eval material is synthetic; this is not validation on Maggie's personal dumps.

| Run | Evidence |
| --- | --- |
| Provider connectivity | Both configured provider smoke checks pass. Latest cost: OpenAI $0.000047, Anthropic $0.000104. |
| Full provider comparison | 56 cases, $1.1411982. Processing 7/10 OpenAI and 8/10 Claude; evidence 8/10 each; tripwire 8/8 OpenAI and 7/8 Claude, including one connection failure. Saved in `app/evals/results/2026-11-01T06-43-38-386Z.json`. |
| Targeted comparison after authority repair | 14 checks, 10 passed, $0.44301094, zero authority errors. Processing 3/3 per provider; tripwire 1/1 each. Evidence misses were inspected rather than relabelled. See `app/evals/targeted-findings.md`. |
| Novel evidence fixtures | Six live checks passed, $0.00675496, zero authority errors. Added separately without rewriting the original scores; fixture version and expectations are retained in `app/evals/novel-evidence-findings.md`. |
| New processing-v2 comparison | Ten live checks completed and passed, five per provider, $1.00001974 against a $1.25 cap. Fixed labels and original scores preserved; zero authority/tool errors and no held-state changes. [Raw results and trace review](../reports/overnight/live-eval-v2.md). |
| Full real pipelines | Text created two signals; an 8.3-second synthetic voice note was transcribed and processed; isolated image processing finished all five jobs and produced correct visual observations. The isolated image run recorded $0.06746272. |

One earlier comparison was interrupted before a final report. Recorded completed-call costs are retained, but its in-flight cost is not known. Development-watch restarts interrupted a separate image job; retry completed it. Final handoff uses the built server so source watching cannot interrupt a live job.

## Handoff verification

- The built server is running in live mode at `http://127.0.0.1:3000`. The separate development server was stopped; the canonical jig on 5181 was left untouched. All eight sample dumps and 13 jobs are done. Database integrity is `ok` and there are no foreign-key errors.
- The latest complete run passed 233 unit/integration tests, 59 browser checks, 36 scripted synthetic eval fixtures, typecheck, build and the production smoke test. The earlier 140/57/31 baseline remains historical evidence. See [verification](verification.md) for commands and scope.
- The actual design-kit source checker initially found raw values in the lifted styles. Extraction created 151 length and 128 colour/channel primitives, plus selector-local dynamic colour tokens; the ordinary styles remain fully scanned. The conversion audit preserves 4,936 non-focus declarations at that stage. Four rings now use `:focus-visible`, with pointer-editing backgrounds retained.
- Final local diagnostic fixes reserve 40px Timeline hit boxes without moving dots, set Find metadata to 12px, remove a permanent capture-surface transform hint, and leave the hidden native range unoutlined while preserving its visible composite's keyboard ring. Thirteen local checker cases and 29 frames then passed their interaction/paste assertions. Twenty remaining flags are a proved quoted-name parsing defect in the checker, not missing names in the app.
- Maggie subsequently approved TypeSafe export. The full checker and one bounded diagnostic received HTTP 400 `max_tokens_exceeded`; no valid visual judgement or current `ready` result was returned. Further live UI corrections and verification are tracked in [UI issues](ui-issues.md). Details: [checker report](../reports/design-check/summary.md).
- The latest online database/media backup is `app/backups/2026-11-01T08-34-05-318Z/`; it opens cleanly and contains both referenced media files. `.env`, local data, backups and generated checker state remain ignored.

## Overnight review decisions

- Re-read the current build spec after the user's update. Its fingerprint remained `efc31e78b73aff80746d4d0d7f8fa9b08ec134f1c1f5549fb5bd43cd330edc1e` at final source verification. Later agent jobs and deployment remain outside v1.
- Failed edits now stay visible until their writes succeed. A successful POST updates the local object before refresh; stale reads cannot replace that acknowledgement. Each confidence intent has a stable command ID so retrying a lost response cannot append a second stance. Deliberate later actions remain separate.
- The theory module now schedules active-tripwire lookbacks consistently, and a streamed chat run finishes only after its reply is saved. Narrow agent reads no longer reconstruct unrelated world history.
- A newly captured article may yield multiple distinct findings. Source identity survives early merges; later normalised repeats attach to all surviving findings. Tombstones and person edits remain protected.
- Validate exact local Host authorities on every route, bound the full article fetch to eight seconds, and share a restricted, cancellable decoder between image preparation and transcription. Ordinary formats and a synthetic 48 MP photo pass. This adds no remote access or authentication system.
- Keep all original eval fixtures and scores. Add five versioned processing cases and mutation tests for their transparent lexical rubrics. Scripted replay results are labelled as plumbing/scoring checks.
- Keep the richer demo separate from the main database. Its new objects are agent drafts; a manifest, collision checks and atomic publication protect existing directories. The voice is authored synthetic narration generated offline.
- Corrected a packaging mistake: the old unanchored `data/` ignore rule also hid `web/src/data/`. Both earlier commits omitted those frontend modules despite local tests passing. The rule now names only local data directories, the source is committed, and `smoke:checkout` builds an export of committed source. The old commit failed that check; `1774073` passes. The check reuses installed dependencies rather than claiming a fresh install.
- Reviews and tests are retained under `reports/overnight/`. Changes remain local on `maggie/aber-v1`; nothing was pushed or deployed.
