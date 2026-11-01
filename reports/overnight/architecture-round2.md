# Architecture review — round 2

1 November 2026. Independent review of the current changes since `a6c5dca`, using `codebase-design` and `thermo-nuclear-code-quality-review`. Scope: edit persistence and Retry saving, active tripwire transitions, streamed run finalization, narrow queries, same-article identity and the processing scorer. Read the build spec, design model and round-one report. Canonical design/jig sources, implementation files and live data were not changed during this review.

Three current correctness issues were reproduced. Remedies below keep ownership in the existing persistence and signal modules; no framework or broad typing rewrite is proposed.

## Assigned repair follow-up

Root subsequently assigned **B1 and the B3 backend** to this reviewer. Those implementations are complete in `signals.ts`, `theories.ts` and their focused regressions; root owns B2 and the frontend command identities. The original review below remains historical evidence.

- **B1:** first-capture classification now follows immutable source IDs and their first appearance in the current run's creation events. A merge cannot make a current source inherit the survivor's older identity, and a repeat event cannot make an older source newly captured. The merge → independent finding → later repeat regression failed before the repair and passed afterwards. A further regression verifies failed-run cleanup restores the older survivor's provenance.
- **B3 backend:** optional opaque `commandId` values (1–128 characters) are recorded in the existing person `setConfidence` event's `before.command` metadata. Matching person/owner/theory/tool commands validate confidence and note, return the current theory and emit no second stance/event. Conflicting payloads reject; distinct commands and unkeyed deliberate reaffirmations still append. No migration or generic mutation framework was added. The command replay test failed with two stances before the repair, then passed.
- **Fresh backend verification:** **66 tests across seven files passed**, including eleven signal-identity and eight confidence-command regressions, plus tripwire, reversible, storage, merge and retry-cleanup preservation checks.
- **Independent B2/frontend verification:** after root completed the persistence adapter, `/private/tmp/aber-round2-persistence-verified.mts` passed five assertions using real public tools against in-memory SQLite and mocked transport: acknowledged wording survives a failed refresh without another POST; stale world and object responses cannot replace it; lost confidence acknowledgement retries keep one stance; a newer confidence intent has a distinct command identity. The focused live/edit/backend suite passed **31 tests across four files**. Fresh `npm run typecheck` and `git diff --check` both passed. No additional B2 failure was reproduced.

No live server writes or provider calls occurred. Only the assigned implementation/test files and this report were changed by this reviewer.

## B1 — P2: A merge changes whether a source counts as newly captured

**Location:** `app/server/src/tools/signals.ts:16–28`, especially the original-event lookup at lines 22–23.

**Reproduction through public tools in in-memory SQLite:**

1. An earlier report created a signal: “Review took two days.”
2. A new article contains that same finding and a separate power-contract finding.
3. Create its review finding, preserving the new article URL.
4. Merge that finding into the earlier signal, as the processing agent is allowed to do.
5. Create the power-contract finding with the same new article URL.

The last call returns the old review signal. The new dump contains one finding, not two; the independent power-contract finding is lost.

```text
expectedFindings: 2
actualFindings: 1
actualGists: ["Review took two days"]
returnedOldSurvivor: true
```

`reuseCapturedSource` asks when the surviving **signal** was first created. After a merge, that no longer tells it when each attached **source URL** was captured. The original-event rule correctly protects later repeated captures, but ties article identity to the wrong entity when a current finding joins an older survivor.

**Small remedy:** keep the first-capture rule in the signal module, but derive it from the matched source's original capture provenance, including absorbed signals. Preserve that provenance across merges. Source IDs and original `createSignal` event projections already survive the merge, so this need not become a processing-order constraint or a new orchestration layer. Do not fix it by requiring the agent to create every signal before merging.

**Regression:** create → merge into older survivor → create independent same-article finding must retain both. A later capture of that article must still attach to both active findings once, and cleanup must still restore the earlier survivor safely.

## B2 — P2: A successful save followed by refresh failure replaces the visible edit with stale text

**Location:** `app/web/src/data/live.ts:49–58`; `app/web/src/data/edit-queue.ts:44–48`; `app/web/src/ui/edits.ts:33–35`.

**Reproduction with mocked fetch:** start with “Old claim”; edit it to “Personal saved wording”; allow `editTheory` to commit and return successfully; fail the following `/api/world` read.

```text
server saved claim: Personal saved wording
displayed claim:    Old claim
failed edit count:  0
```

`refresh` reports its failure and resolves. Consequently `mutate` resolves, the edit queue acknowledges and removes the overlay, and `getEdit` rebuilds from the stale world. The user's input is durable on the server but disappears from the current editing surface. Further typing can now start from stale wording and overwrite the successful edit.

**Small remedy:** reconcile the successful mutation result into the local object before acknowledging its edit, or retain acknowledged display values until a world snapshot confirms them. Keep this behind the persistence adapter; every editable pane should not learn about refresh failures. Do not convert a failed refresh into a failed mutation and repeat an already-committed append operation.

**Regression:** successful POST + failed world refresh retains the saved wording; a later refresh converges; subsequent typing begins with the saved text. Assert that the successful POST is not repeated.

## B3 — P2: Retry saving duplicates a confidence stance when only the acknowledgement was lost

**Location:** `app/web/src/data/edit-queue.ts:25–26,44–55`; `app/web/src/ui/edits.ts:45`; `app/server/src/tools/theories.ts:23–26` and the `setConfidence` definition.

**Reproduction with mocked fetch:** one confidence change to 4 commits its stance, then the connection closes before the response reaches the client. Click Retry saving. The same `setConfidence` command is issued again and appends a second stance.

```text
user confidence changes: 1
saved stance levels:     [4, 4]
```

Per-operation acknowledgement fixes failure in a *later* operation, which the existing test covers. It cannot establish whether a rejected request committed. The queue now exposes retry for a non-idempotent append command without an identity that survives a retry. This makes connection loss alter the person's history.

**Small remedy:** give a confidence edit a stable command identity, retained for retries and replaced for a genuinely newer edit. Deduplicate that identity in the same transaction that appends the stance. Keep the change scoped to `setConfidence` and the edit adapter if general mutation idempotency is unnecessary. Merely suppressing equal consecutive confidence values changes the meaning of deliberate reaffirmation and does not establish which request committed.

**Regression:** first request commits but its response rejects; retry returns the original result and one stance remains. A subsequent separate confidence action receives a new identity and still appends normally.

## Earlier findings checked

- **A1, retained personal edits:** closed for failed POST, unrelated refresh, newer wording during failure and failure after an acknowledged stance. The new B2/B3 cases concern the separate distinction between write acknowledgement and world refresh.
- **A2, active tripwire scheduling:** closed. New held versions schedule once from creation, edit and draft acceptance/rephrasing; unchanged, empty, retired and still-draft conditions skip work.
- **A3, stream finalization:** closed. Completion awaits reply persistence; error/abort remains terminal; provider usage survives reply and terminal-write failures. The run module now owns this lifecycle coherently.
- **A4, full-world narrow reads:** closed. Shared selectors avoid unrelated dump/reply/run reconstruction and preserve current results, ownership, active filters and ranking. Query-count regressions stay constant when unrelated history grows.
- **Article splitting/repeats:** existing identity regressions pass, including multiple same-article findings, normalized repeats, cleanup, person edits, merged survivors and tombstones. B1 is the uncovered ordering combination.
- **Eval scorer:** reviewed the handwritten rubric and passing adversarial tests. No additional high-conviction finding promoted; field-specific scoring is concurrently owned by the eval worker.

## Verification

From `app/`:

```sh
npm test -- web/src/ui/edit-persistence.test.ts server/src/tools/tripwire-transition.test.ts server/src/agents/stream.test.ts server/src/tools/collection-reads.test.ts server/src/tools/signals-identity.test.ts evals/processing-score.test.ts
```

**41 tests across six files passed** on the reviewed state. `git diff --check` passed.

All three additional reproductions are in `/private/tmp/aber-architecture-round2.mts`, run with `AGENT_MODE=fake node --import tsx /private/tmp/aber-architecture-round2.mts`. The script uses only an in-memory database and mocked fetch responses and asserts the observed failures. No live server writes, provider calls, environment-secret output or TypeSafe exports occurred.
