# Aber storage re-review

1 November 2026. Focused review of the fixes for F1–F4 in `implementation-audit.md`, plus their immediate authority/recovery consequences. Implementation was read-only. All reproductions used `AGENT_MODE=fake` and in-memory SQLite; no live calls or production mutations.

**The original four scenarios now pass. Three related preservation defects remain.** The coordinating agent requested immediate handoff for the next narrow storage fix; this is not a completion verdict.

## Verified fixes

| Original failure | Independent result on current code |
| --- | --- |
| F1: later note/repeat origin lost by Undo Merge | Note remains `Later user note`; A retains D1+D3; B regains D2. |
| F2: restoring D1 then D2 loses shared provenance | First restore immediately exposes the signal with one live origin; second restore leaves both origins. |
| F3: newest completed child blocks Retry | Only failed `link_evidence` runs; finished siblings remain finished; `settleDumpStatus` makes the dump `done`. |
| F4: different run cannot link draft evidence | A registered evidence-job actor successfully adds evidence to an untouched processing-created draft. |

Executed 45 tests across nine focused files: storage review, reversible tools, authority, retry cleanup, queue, HTTP, media, dump-status settlement and empty embeddings. All passed. The 12 storage regressions cover the original fixes, later relation removals, both shared-dump restoration orders, legacy merge snapshots and explicit conflicts.

Source inspection confirms the agreed constraints: undoing an older merge with a later active merge fails before mutation; a binned original origin requires Restore first; a purged original origin produces an explicit unavailable error. Existing focused tests verify unchanged world state for these conflicts. Prose retains same-run protection, held objects reject agent writes, and person prose edits block subsequent agent draft writes.

## Remaining findings

### R1 — P1: Undo Merge resurrects half of a subsequently discarded finding

**Location:** `app/server/src/tools/merges.ts:72–98` (`undoSignalMerge`, especially restoration and replay of changed signal fields).

**Reproduced:** create A and B → merge B into A → discard A → Undo Merge.

```text
before Undo: active members of [A,B] = 0
after Undo:  active members of [A,B] = [B]
```

The inverse preserves `discarded_at` only on A. It restores B's original active state, so a signal the person discarded as part of the merged finding reappears even though its source URL has a tombstone. The new later-write replay covers notes and relation deletions but not the semantic scope of discarding a merged signal.

**Required narrow fix:** refuse undo while either current signal is discarded, with an explicit conflict and no mutation. This is the coordinating agent's ruling; do not silently revive the other half. Add a regression asserting signal state, tombstones, relations, merge state and events remain unchanged on rejection.

### R2 — P1: Cross-run draft permission can overwrite a person's evidence decision

**Location:** `app/server/src/tools/authority.ts:17–23`; `app/server/src/tools/theories.ts:30–35`.

The new `untouchedAgentDraft` predicate checks only the theory row's `created_by` and `updated_by`. Person relationship tools do not update that parent row, so a draft with person-owned evidence still passes the check.

**Reproduced:** agent A creates draft → person links signal S as `supports`, note `Person decision` → evidence agent B links the same pair as `undermines`, note `Agent overwrote`.

```text
final evidence:
  stance = undermines
  note = Agent overwrote
  updated_by = agent:link_evidence:audit-b
```

No `AuthorityError` occurs. This violates the mandatory preservation of person decisions even though prose protection remains intact. A person's explicit unlink can similarly be missed if checking only current edge ownership, so relation events also matter.

**Required narrow fix:** guard existing evidence ownership and relevant person relationship decisions/events, not only the parent draft row. Keep new cross-run links on untouched drafts working. Regression cases: person-created edge, person-modified edge, explicit person unlink, accepted suggestion creating an edge, and unrelated new edge on a genuinely untouched draft.

### R3 — P1: Retry cleanup deletes evidence belonging to an earlier successful run

**Location:** `app/server/src/tools/theories.ts:33–34`; `app/server/src/tools/core.ts:31`; `app/server/src/agents/cleanup.ts:61–62`.

This is an immediate consequence of the new cross-run evidence allowance: `linkEvidence` updates an existing edge and changes its `run_id` to the newer run. Cleanup deletes every edge with that run ID instead of restoring its previous contents.

**Reproduced:** run A creates draft and a `supports` edge → run B updates the same pair to `undermines` → B fails → `clearRun(db,'b')`.

```text
before B: evidence = [{ stance: supports, note: Earlier run link, run_id: a }]
after B cleanup: evidence = []
B status = cleared
```

The prior successful run's edge is lost while cleanup reports success. This contradicts the retry contract that writes outside the failed run remain intact.

**Required narrow fix:** either prevent agent overwrites of another run's existing edge, or record/replay the previous value as a safe inverse during cleanup. Preserve the allowed operation of adding a genuinely new edge. Test failure after an attempted cross-run update and verify the original edge, actor and run ID survive.

R3 was discovered during the focused preservation probe immediately before the coordinating agent requested handoff. No wider audit was started.

## Adjacent additions checked

- `POST /api/media` stages one file, records it through person-only `storeMedia`, and removes the file if the tool fails. Its passing HTTP regression confirms no dump/job is created, media attaches to a prototype, and an audit event exists.
- The blank embedding guard returns `[]` before creating a run or invoking a provider. Its passing test switches to live mode with a rejecting network stub and proves zero fetches for blank input.
- `currentChallenge` filters by current tripwire version and prefers the hit's suggestion ID. `useTripDecide` now uses it. This fixes the source-level mismatch from F5; the coordinating agent's browser regression remains the required UI proof.
- `settleDumpStatus` correctly considers failed/pending/completed siblings after a retried child. Both its regression and the independent original-F3 reproduction pass.

## Next verification

Fix and regression-test R1–R3, then rerun this focused set. Preserve the explicit later-merge, bin and purge conflict behavior and the untouched-merge exact round-trip. The broader UI/spec proof list from the first audit remains outside this focused re-review.
