# Architecture review — round 1

1 November 2026. Read-only review of `a6c5dca` on `maggie/aber-v1`, using `codebase-design` and `thermo-nuclear-code-quality-review`. Reviewed the build spec, design-model job triggers, current verification and the prior preservation reports before inspecting current code. Earlier resolved findings are excluded.

Four focused improvements are justified below. Three have isolated failing reproductions; the fourth has a measured current cost. No implementation files, live data, provider calls, design sources or canonical jigs changed. Reproductions use in-memory SQLite or mocked browser fetches.

## Assigned repair follow-up

Root subsequently assigned A2 and A3 to this reviewer. They are implemented in `theories.ts`, `drafts.ts` and `agents/run.ts`, with dedicated public-tool and real-SDK streaming regressions. No other implementation modules were edited by this reviewer. The original review below remains historical evidence.

- **A2:** the theory module now schedules each newly active held tripwire version from creation, editing and draft acceptance/rephrasing. Empty, unchanged, retired and still-draft conditions skip work; the existing version key prevents duplicates. Five public-tool regressions cover those transitions; four were observed failing before the implementation.
- **A3:** the UI-stream finalizer owns successful completion after reply acknowledgement. The first terminal state survives later SDK usage callbacks. Reply rejection, provider error, request abort and failure of the final status write remain failures with recorded usage; partial failed/aborted replies are not saved. Six real-SDK regressions were observed failing before their corresponding changes, then passing.
- **Fresh verification:** `npm test -- server/src/tools/tripwire-transition.test.ts server/src/agents/stream.test.ts server/src/agents/run.test.ts server/src/agents/chat.test.ts server/src/agents/tripwire-scope.test.ts server/src/jobs/queue.test.ts server/src/jobs/retry-cleanup.test.ts server/src/jobs/stale-recovery.test.ts server/src/jobs/tripwire-lookback.test.ts server/src/jobs/tripwire-progress.test.ts server/src/tools/reversible.test.ts server/src/tools/revision-authorship.test.ts` passed **56 tests across 12 files**. `npm run typecheck` passed. Root owns full-suite/build checks after the parallel work freezes.

No live calls or production data mutations occurred. A4 remains a separate unimplemented recommendation at this handoff.

### Same-article identity repair

The new full-article eval exposed a separate concrete defect: two distinct findings sharing one original article URL collapsed into one signal. Root assigned the narrow repair after A2/A3. `tools/signals.ts` now uses dump, normalized source URLs and normalized gist for default idempotency. Earliest `createSignal` events distinguish findings from the original dump/run from prior captures. A new article can yield multiple findings with its real URL; a later normalized repeat attaches its origin once to all active matching findings and creates no extra signals or jobs. Existing URL tombstones remain authoritative; merged sources resolve through active survivors.

Nine regressions were observed failing before implementation, then passing. They cover actual processing model tools and full fetched text, identical-gist replay, explicit keys, shared-run and cross-run repeats, reprocessing, cleanup/retry of both findings, person edits, merge survivors and tombstones. The processing tool description and prompt were clarified (`process-dump-v4`); no eval labels or synthetic source URLs were substituted.

`npm test -- server/src/tools/signals-identity.test.ts server/src/tools/reversible.test.ts server/src/tools/storage-review.test.ts server/src/tools/bin-merge.test.ts server/src/agents/process.test.ts server/src/jobs/retry-cleanup.test.ts server/src/agents/stream.test.ts server/src/tools/tripwire-transition.test.ts` passed **72 tests across eight files**. `npm run typecheck` and `git diff --check` passed. The eval worker independently reported **36 fake fixtures and 14 scorer/preservation tests passing**, with original 31 fixture hashes unchanged; its full fake report is `app/evals/results/2026-11-01T08-11-27-757Z.json`. These are deterministic synthetic checks, not live model quality evidence.

## A1 — P1: The edit queue discards personal wording when a save fails

**Location:** `app/web/src/ui/edits.ts:34–55`, especially removing `pending` at line 38 and clearing `active` in the unconditional `finally` at line 54.

**Reproduced:** load a theory whose claim is `Saved claim`; call `setEdit` with `Unsaved personal wording`; flush; reject the tool request with a connection error.

```text
before flush:    Unsaved personal wording
after failure:   Saved claim
after refresh:   Saved claim
```

`mutate` correctly reports the error, but the edit module immediately deletes the only retained copy of the failed patch. The next emitted snapshot replaces the editable DOM's content with saved text. This is data loss after an ordinary transient save failure, rather than an ambiguity about concurrent writers.

**Small structural remedy:** let the edit module own pending, in-flight and failed field acknowledgements. Remove a field from the local overlay only after its corresponding mutation succeeds; retain unsuccessful fields for retry, preserving newer edits made during the request. Multi-operation theory/prototype patches must acknowledge each completed operation separately, so retry does not append an already-saved confidence stance again. Keep this responsibility behind the existing edit interface rather than adding recovery behavior to each pane.

**Regression proof:** reject the first save and assert the wording survives an unrelated world refresh; then retry successfully. Also cover a newer edit during the failed request and failure in a later operation of a combined patch, asserting earlier confidence history is not duplicated.

**Contract:** personal edits should persist across reload; temporary network failure must not destroy the unsaved input. This is a correctness defect in the current implementation, not a proposal to change its interaction design.

## A2 — P2: Tripwire scheduling belongs to the theory mutation, but only one caller performs it

**Location:** `app/server/src/tools/theories.ts:10–15,22–27,79–83`; adjacent activation path `app/server/src/tools/drafts.ts:18–29`.

**Reproduced through public tools:** create a held theory with a tripwire; change it through `editTheory`; then change it through `setTripwire`.

```text
queued tripwire jobs after writeTheory: 0
queued tripwire jobs after editTheory:  0
queued tripwire jobs after setTripwire: 1
```

All three operations produce a nonempty, versioned tripwire. Only the last enqueues the lookback. The first two therefore expose a watching tripwire without checking existing signals. Accepting an agent draft with a tripwire likewise makes it held without scheduling lookback, by source inspection.

**Small structural remedy:** put versioning and deduplicated lookback scheduling in the theory module's canonical transition for an active tripwire. Call it from theory creation/editing and held activation. Keep the existing `setTripwire` tool as an adapter. Empty values, unchanged versions and still-draft theories should not create duplicate work.

**Regression proof:** compare public `writeTheory`, `editTheory` and `setTripwire` results: every new held nonempty tripwire version has exactly one version-scoped producer job. Verify empty/draft/unchanged cases and accepting a draft with a tripwire. Existing bounded fanout and stale-version tests remain authoritative.

**Contract:** the design model explicitly gives the Tripwire job the trigger “a tripwire written or edited” (`docs/design-model.md:201`); the build spec names lookback for `setTripwire` (`docs/build-spec.md:416`). Extending those invariants to the other exposed writes is a consistency repair. Draft acceptance scheduling follows from activating its already-written condition and should be made explicit in the new regression.

## A3 — P2: A chat run becomes successful before its durable reply exists

**Location:** `app/server/src/agents/run.ts:105–125`, especially model `onFinish` at line 115 and UI-stream `onFinish` at line 123; production reply sink `app/server/src/agents/chat.ts:64`.

**Reproduced:** stream a scripted reply with an `onReply` callback that throws `Synthetic reply persistence failure`; consume the response.

```text
reply callback attempted: true
stream contains persistence error: true
agent_runs.status: done
agent_runs.error:  null
```

Two callbacks independently own completion. Model completion writes `done` before the durable reply callback runs. A database failure, or a dump deleted during generation so `reply` refuses it, leaves a successful run with no saved reply; reload cannot recover the visible answer. The outer `try` cannot catch an error raised while the already-returned response is consumed.

**Small structural remedy:** make the run module own one terminal transition for a streamed run. A successful terminal state requires both model completion and successful reply persistence. Catch asynchronous reply-sink failure inside that finalizer and persist `failed` with its cause. Keep token/cost recording independent so a failed persistence step still accounts for the completed provider work. Guard against terminal callbacks overwriting an earlier abort/error.

**Regression proof:** inject a rejecting `onReply`, consume the response and assert a failed run with the durable error. Also assert successful stream + saved reply yields `done`, and aborted/errored streams cannot later become successful or persist an unmarked partial reply.

**Contract:** build spec slices 2 and 10 require inspectable run status and durable reply parts after reload. This repairs lifecycle ownership without changing chat rendering or model behavior.

## A4 — P2: Narrow reads reconstruct the whole application world

**Location:** `app/server/src/tools/reads.ts:21,26–30,34–36`; `app/server/src/tools/queries.ts:18–32,72–76`.

**Measured on the existing seeded fixture:** instrumenting `db.prepare` around one tool call counted **318 prepared statements** for `listThemes` returning seven themes, and **318** for `similarSignals` returning eight signals. One local run took approximately 16 ms and 10 ms respectively; statement count is the useful deterministic evidence, not a timing guarantee.

Both reads call `getWorld` and discard most of its result. `getWorld` builds every object and dump. Every `getDump` then scans all jobs/runs and performs per-run job lookups. Processing starts by calling `getDump`, `listThemes`, `listTheories`, `similarSignals` and `lookupSignals`, so this unrelated synchronous work repeats before the first model request. Agent output projection prevents traces from reaching the next model request, but it runs after this expensive reconstruction.

**Small structural remedy:** move the actual collection selectors/projections behind narrow query interfaces and have both `getWorld` and read tools reuse them. Start with theme/theory collection reads and active-signal selection; those calls should never construct dumps, replies or run traces. Keep `getWorld` as the HTTP composition adapter. This deletes redundant work without introducing caching, a generic repository framework or a new data model.

**Regression proof:** existing read results remain equal for filters, ordering, retirement and semantic candidates. Instrument a narrow read and assert it does not select from dumps/replies/agent_runs; append unrelated dump/run history and prove returned objects and query count stay stable. Avoid wall-clock performance assertions.

**Contract:** this is a measured depth/locality improvement, not a spec deviation. The full-world projection is reasonable for `/api/world`; making every narrow agent read pay for it is the avoidable coupling.

## Evidence and exclusions

Run from `app/` with `AGENT_MODE=fake node --import tsx <path>`:

- `/private/tmp/aber-architecture-probe.mts`: A2 and A3, in-memory SQLite and scripted model only.
- `/private/tmp/aber-edit-probe.mts`: A1, mocked fetches only.
- `/private/tmp/aber-read-probe.mts`: A4, seeded in-memory SQLite and counted prepares.

The registry's broad `Definition`/`Row` types and record-shaped output schemas reduce static guarantees, but this round does not promote a generic typing rewrite without a concrete additional failure. No finding is based on view size, copied canonical UI, naming, formatting or a hypothetical framework. The existing merge/bin/suggestion preservation repairs remain untouched.
