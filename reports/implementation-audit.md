# Aber implementation audit — first pass

1 November 2026. Reviewed the uncommitted implementation on `maggie/aber-v1`, using `docs/build-spec.md`, `docs/design-model.md`, the supplied AGENTS preferences, source, and existing tests. Implementation files were not changed. Runtime probes used `AGENT_MODE=fake` and in-memory SQLite only; no live API requests or production data writes.

**Result: two reproduced data-loss defects and two reproduced functional defects require fixes.** A further tripwire UI defect is established by source tracing and needs browser regression proof. This is an intermediate audit, not a completion verdict. The coordinating agent requested this report now so a storage worker can fix the reproduced failures; a second pass should cover the remaining UI and larger-world cases.

## Requirement → evidence

| Slice / requirement | Evidence inspected | Assessment |
| --- | --- | --- |
| 0: local scaffold, tool boundary, append-only stance log | `server/src/index.ts`, `config.ts`, `db/index.ts`, migration, `tools/index.ts`, `authority.test.ts` | Local binding, validated inputs, events and SQL stance triggers present. Cross-job draft authority is too restrictive (F4). |
| 1: capture, provenance, bin, restore and purge | `http/capture.ts`, `tools/dumps.ts`, `reversible.test.ts`, `e2e/capture.spec.ts`, `e2e/chat-log.spec.ts` | Basic round-trips covered; shared-origin restore order loses provenance (F2). |
| 2: runs, retry cleanup, cap and stale locks | `agents/run.ts`, `adapters.ts`, `cleanup.ts`, `jobs/runner.ts`, `queue.ts`, `retry-cleanup.test.ts` | Failed-run cleanup guards later person and other-run actions. Manual Retry selects the wrong job (F3). Budget guard and persisted spend exist; no new live cost proof performed. |
| 3: processing, exact duplicate/tombstone, full text, near-duplicate merge | `jobs/process-dump.ts`, `near-duplicate.ts`, `fetch-article.ts`, `projection.ts`, `tools/signals.ts`, `reversible.test.ts` | Exact URL matching/tombstones and separate near-duplicate judgement exist. Full fetched text reaches initial processing/evidence input. User Undo Merge lacks recovery's later-write guard (F1). |
| 4–5: object editing, evidence, confidence, tripwire | `panes.tsx`, `edits.ts`, `theories.ts`, `suggestions.ts`, `trips.ts`, `e2e/pane.spec.ts` | Tool paths and persisted edits exist. A current tripwire hit can dispatch to an older suggestion (F5). Draft evidence path is not represented by fake evidence behavior (F4). |
| 6: Briefing decisions and new marks | `briefing-app.tsx`, `queries.ts` | Actual world rows drive items. Keep-merge/mark-seen fixes are already assigned by the coordinating agent; re-audit after those changes. |
| 7–9: Atlas, Timeline and Columns | `atlas-styles/geo.ts`, Timeline source, data hydration, baseline Playwright specs | Data-driven packing and lifted views exist. Current render/accessibility tests do not prove drag persistence, zoom thresholds, chain depth or lineage behavior. |
| 10: chat, media and persisted UI parts | `chat.ts`, `chat/use-dump.ts`, `chat/parts.tsx`, `e2e/chat-log.spec.ts` | `useChat`, typed display tools, persisted reply parts and context work through real routes. Media/toast/card-drop follow-ups are already assigned; new proof needed after changes. |
| 11: narrow screens, external capture, backup, built server | `e2e/phone.spec.ts`, capture specs, `scripts/production-smoke.ts`, build/copy paths | Phone layout and fake API capture are covered. Production smoke checks actual bundled assets, worker and media range response. Parent reports it passing; not rerun in this audit. |

The reported 54 unit tests, 28 synthetic eval assertions and 17 browser tests are useful baseline evidence, not evidence that every slice acceptance criterion passed. I read the authority/reversible/recovery tests and browser tests; none exercise F1–F3 below. The authority test explicitly asserts same-run draft ownership, which is the stricter behavior causing F4.

## Prioritized findings

### F1 — P1: Undo Merge silently erases later user work and origins

**Location:** `app/server/src/tools/merges.ts:21–25`, `:28–35`; public `undoMerge` at `:63`.

`restoreSignalMerge` clears all current relations and overwrites both complete signal rows from the pre-merge snapshot. Failed-run cleanup checks for later writes before calling this helper, but the public person tool does not. The interface exposes Undo indefinitely.

**Reproduced:** create signals A and B from D1/D2 → merge B into A → edit A's note to `Later user note` → attach a repeat dump D3 to A → call `undoMerge`.

```text
before-undo: note="Later user note", origins=3
after-undo:  note="",                origins=1
foreign_key_check: []
```

The database remains structurally valid while the user's note and D3 provenance disappear. Later sources, filings and evidence are subject to the same replacement.

**Requirement:** design model, near-duplicate guard rails: one-step undo restores the original signals and provenance; authority rule: agents never undo the user's decisions. The loss of changes made after the merge is a data-integrity defect, not merely a visual mismatch.

**Small fix:** give user undo a safe inverse operation that preserves post-merge additions and decisions. If exact separation cannot be established, fail with a specific conflict instead of silently restoring stale state. Regression cases should include later note edits, origins, evidence, subsequent merges, and origins whose dump is now binned. Retain the exact snapshot round-trip for an untouched merge.

### F2 — P1: Restoring shared-origin dumps in sequence loses restored provenance

**Location:** `app/server/src/tools/dumps.ts:54–55` and the whole-relation replacement in `app/server/src/tools/merges.ts:21–25`.

**Reproduced:** signal S has origins D1 and D2 → delete D1 → delete D2 → restore D1 → restore D2.

```text
after restoring D1:
  activeSignals=0
  S.deleted_by_dump_id=D2
  S.origins=[D1]
after restoring D2:
  activeSignals=1
  S.origins=[D2]          # expected [D1,D2]
```

Restoring D1 only re-inserts the detached origin, leaving the signal hidden behind D2's deletion marker. Restoring D2 then clears that restored origin and replays its older sole-origin snapshot. This affects ordinary repeated captures without merges or concurrency.

**Requirement:** design model Dump lifetime and build spec §4.5/§7 slice 1: restoring a dump restores everything it removed; shared signals lose only the deleted origin.

**Small fix:** restore against current provenance, make a signal active once it has a restored live origin, and merge restored relations with subsequent valid relations instead of replacing them wholesale. Test both restoration orders, restoring only one dump, and repeated delete/restore cycles.

### F3 — P2: Retry rejects a dump whose failed job is not its newest job

**Location:** `app/server/src/tools/dumps.ts:61–64`.

`retryDump` chooses the newest job associated with a dump, regardless of status or kind. Each signal schedules evidence then tripwire jobs. If evidence exhausts retries while the newer tripwire succeeds, the dump is failed but Retry finds the completed tripwire and refuses.

**Reproduced job state and result:**

```text
process_dump done
link_evidence failed
tripwire done
retryDump → "This dump has already finished processing"
```

**Requirement:** build spec §4.10 and slice 1: failed processing is visible and retryable from the dump log.

**Small fix:** select failed jobs for the dump explicitly and retry the affected work while retaining completed work. Define the dump's aggregate status from its jobs so a successful retry cannot leave it permanently `received`. Cover multiple signals, more than one failed child and a chat failure separately.

### F4 — P2: Evidence jobs cannot attach evidence to processing-created drafts

**Location:** `app/server/src/tools/authority.ts:18`; `app/server/src/agents/fixtures.ts:75–78` masks the path.

The authority check requires `created_by === actorString(actor)`, including the exact run ID. A `link_evidence` run therefore cannot directly attach evidence to any theory produced by an earlier `process_dump` run.

**Reproduced:** create draft with actor `agent:process_dump:audit-a`; create an observation; call `linkEvidence` with registered actor `agent:link_evidence:audit-b`.

```text
AuthorityError: Agents may edit only their own drafts (linkEvidence)
```

**Exact documented scope:** build spec §4.5 says agent draft writes require draft status and `created_by` **“starting `agent:`”**. §5.3 explicitly lists `link_evidence` output as **“Evidence suggestions on my theories; evidence on drafts.”** The model's draft principle says drafts collect evidence before acceptance. “Own drafts” means agent-owned material here, not one ephemeral run's output.

The fake evidence model always calls `proposeEvidence`, including for drafts, so passing fake processing tests do not prove the required direct-draft evidence behavior.

**Small safe fix:** permit the `link_evidence` job's `linkEvidence` operation on still-agent-owned drafts, while continuing to reject held objects and preserving subsequent person decisions. Keep the stricter same-run protection for prose editing if desired; do not globally loosen all write operations. Make fake evidence use the same status-based branch as live behavior and assert both paths.

### F5 — P2: A current tripwire hit selects an older suggestion for the same signal

**Location:** `app/web/src/ui/panes.tsx:291–292`.

The pane renders only the current tripwire version's hits from `theory.tripwireHits`, but `useTripDecide` finds the first world suggestion matching only theory ID and signal ID. Suggestions remain ordered by creation and retain history. After editing the tripwire, a new hit for a previously matched signal routes Accept/Dismiss/Undo to the old suggestion.

**Repro scenario (source traced; browser proof still needed):** create version-1 challenge for S → edit tripwire to version 2 → create another challenge for S → open version-2 hit and Accept. The handler submits the version-1 suggestion ID. If pending it is rejected as an old tripwire; if already accepted the server returns a no-op, leaving the displayed hit pending. Dismiss can alter the old decision instead of the current one.

**Requirement:** build spec §6.3 and slice 5: the displayed hit's Accept/Dismiss decision must persist and share the pane/Briefing decision.

**Small fix:** use the hit's existing `suggestionId`, or filter by the current tripwire version. Add a browser regression with two versions of a tripwire matched by the same signal.

## Documented standards versus review judgement

- **Documented:** typed tools, per-write audit, full article text, agent authority, immutable/append-only stances, recoverable bin and merge semantics are explicit spec requirements. F2–F5 directly conflict with those contracts; F1 violates safe undo/provenance behavior.
- **Judgement, not a new blocker:** broad `Record<string, any>` rows, dual snake/camel field contracts, generic Zod object outputs and compressed multi-operation lines make this implementation harder to audit. `shared/` and typed Hono RPC were intended to reduce that ambiguity. Improve narrowly around the affected contracts rather than launching a general refactor.
- **Deliberate differences accepted:** port 5174; honest counts instead of jig illustrations; darker secondary text; deterministic Atlas packing; oversized-article guard failures rather than silent truncation; synthetic evals where Maggie's real dumps are unavailable. None is counted as a defect.

## Follow-up proof still needed

1. Rerun the four isolated repros as regression tests after fixes; test user decisions on retries and undo independently. Retry cleanup is guarded, but user-triggered undo is a separate path.
2. Prove F5 in the browser and re-audit the UI work already in flight: counts/Undo toast, card drop, all origins, recorded waveforms, draft shortcuts and merge acknowledgement.
3. Exercise semantic retrieval beyond the 100-candidate cutoff and tripwire look-back with more than 100 older matches. Current reads lexically select candidates before semantic ranking; the theory look-back filters the date after limiting signals. Check own-observation tombstones with changed wording, since only exact gist equality is enforced and URL lookup omits URL-free tombstones from initial context.
4. Exercise all four chat display tools, material processing replies with theme/prototype drafts, streaming failure/retry and image/audio capture. Current chat browser test proves theory/evidence and reload only. Inspect live provider traces without treating fake fixture success as model-quality evidence.
5. Prove queue waiting is visible when the cap is reached: server writes the waiting message to `dump.error`, while the current log renders only “Processing” for that status. Test concurrent job boundaries and a long transcription hitting the cap between chunks.
6. Complete the explicit slice 7–9 interactions, same-seed visual comparisons, 40px phone target measurements and WebKit phone check. Baseline screenshot/accessibility checks do not prove them.
7. Check rich body editing, theme/theory merge affordances, rephrase acceptance for theme/prototype drafts, and retired-theory indicators on prototypes against the model. These were inspected only partially and should not be declared complete based on plain text persistence tests.
8. Recheck production bundle paths after implementation changes. Source and bundled `appDir`, copied prompts/migrations, and static paths are consistent with the existing production smoke; that smoke is the appropriate final verification.

No completion or merge/deployment recommendation is made by this first pass.
