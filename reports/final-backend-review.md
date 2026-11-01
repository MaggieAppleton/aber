# Final backend preservation review

1 November 2026. Focused review of server suggestion decisions, manual signal merges, dump bin/restore/purge, and confidence/tripwire history. In-memory SQLite only, `AGENT_MODE=fake`; no live APIs, production data, or changes to `design/` and `jig/`. Following the review, root assigned the B3 repair to this reviewer; implementation ownership was limited to `dumps.ts` and the new `bin-merge.test.ts`.

**Three reproduced defects, all repaired and rechecked.** Root fixed B1–B2; this reviewer fixed B3. The original isolated probes now preserve later wording/evidence and keep the restored finding alive after other dumps expire. The historical findings and their validation are retained below.

## B1 — resolved: Revision Undo overwrote later unrelated edits and mismatched tripwire wording/version

Location: `app/server/src/tools/suggestions.ts:57`.

Reproduction through public tools:

1. Write a theory with original body, horizon 2030, and an old tripwire.
2. Accept a revision that changes **only the claim**.
3. Set horizon to 2040, set a new tripwire, and edit the body.
4. Undo the revision.

```text
Before Undo: body="Later user body", horizon=2040, tripwire="Later tripwire", version=2
After Undo:  body="Original body",   horizon=2030, tripwire="Old tripwire",   version=2
```

Undo replays the whole pre-acceptance theory rather than reversing the accepted wording. Besides deleting later personal work, it associates the old tripwire text with the newer version, making version-scoped hits inconsistent with their sentence.

Root's agreed narrow remedy: record the applied values; inverse only the claim/body/authorship fields actually changed by acceptance, and only while their current values still equal that acceptance. Preserve later field edits and unrelated horizon/tripwire changes. Test untouched accept/rephrase→Undo round-trips, later body-only and claim-only edits, and unchanged tripwire text/version/jobs after Undo.

## B2 — resolved: Evidence Undo deleted a later personal decision

Location: `app/server/src/tools/suggestions.ts:53–55`.

Reproduction: accept a proposed `supports` link → person changes that same pair to `undermines`, note `Later personal decision` → Undo the original suggestion.

```text
Before Undo: [{stance:"undermines", note:"Later personal decision"}]
After Undo:  []
```

The unconditional pair deletion erases the later person-owned edge. If an earlier edge existed, replay can instead replace the later decision with that old snapshot.

Root's agreed narrow remedy: store the accepted edge and reverse it only if the current edge still matches. Preserve later changes and explicit unlinks. Test originally absent and pre-existing pairs, later stance/note edits, and bin/merge-related removal of the accepted edge. Current direct tool behavior is reproduced; no browser Undo affordance was claimed for B1–B2.

## B3 — resolved: Restoring a binned origin after its signal merged stranded provenance and permitted permanent loss

Location: `app/server/src/tools/dumps.ts`, `restoreDump` detached-origin replay and `composeBinnedSignal`; `purgeBin` recursive absorbed-signal deletion.

Reproduction through public tools, using a person actor for the merge:

1. Signal A has origins D1 and D2. Signal B has origin D3.
2. Bin D1; A stays active through D2.
3. Merge A into B.
4. Restore D1.

```text
D1 produced signals = []
Survivor B origins   = [D2,D3]
Absorbed A origins  = [D1]
```

Restore attaches D1 to the old absorbed ID rather than the live survivor. Bin D2 and D3 next: there are no active signals although D1 remains live. Calling `purgeBin` with a clock 31 days later purges D2/D3 and **all signals**, while D1 still exists outside the bin. `foreign_key_check` remains empty throughout.

Required narrow repair: resolve the signal's current merge destination when replaying restored origins and relations, or reject before any mutation with a specific conflict. Do not attach live provenance to a hidden absorbed record that purge will delete. Cover the detached-origin path above, plus the removed-snapshot path (bin both origins, restore one, merge, restore the other), a merge chain, subsequent Undo Merge, and expiry of the other dumps. The original restore-order and untouched merge regressions must remain passing.

Implemented in `dumps.ts`: resolve and validate the current merge chain before restore; replay origins and relationships onto its final survivor; retain that survivor's current prose and merge state; recover its own deletion snapshot when it also entered the bin. Later unfilings/unlinks across the lineage stay respected. Invalid chains or missing recovery snapshots fail atomically. No changes to `merges.ts` or purge behavior were necessary.

Six new regression tests were observed failing before implementation, then passing. They cover both snapshot forms and later purge, merge chains and reverse Undo, a binned survivor, later relationship removals, and invalid-cycle rollback. A restored origin stays on the destination exposed by Restore when later undoing the merge, following the existing preservation rule for origins added after a merge; no live origin disappears.

## Validation and bounds

Initial review executed 40 passing focused tests. After the repairs, the **full suite passed: 139 tests across 35 files**, and `npm run typecheck` passed. The original probes independently confirm root's B1–B2 changes preserve later body/horizon/tripwire/version and a later person evidence edge. Existing merge round-trips, shared-origin restores, conflicts, authorship, and append-only challenge history remain covered.

Exact isolated reproductions are saved at `/private/tmp/aber-final-backend-probe.mts` and run from `app/` with:

```sh
AGENT_MODE=fake node --import tsx /private/tmp/aber-final-backend-probe.mts
```

No live model behavior, agent-job paging/search/draft-card changes, or browser interactions were reviewed in this pass. A source-only historical tripwire-label concern was sent to root for the UI reviewer and is not counted as a verified backend finding.
