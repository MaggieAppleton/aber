# Final action and specification review

## Follow-up resolution

All six concrete findings below were repaired and exercised in the final verification run. The original review is retained as history, rather than as a list of current defects. See [verification](../docs/verification.md).

| Finding | Current proof |
| --- | --- |
| F1 Find | Browser queries cover body text, retired themes/theories, raw/transcribed dumps, and a signal outside the first page. |
| F2 Revision review | Browser tests review and rephrase claims, complete bodies, insertions, theme names and evidence notes; supplied theme/theory merge proposals name both objects and persist acceptance. Tool tests cover authorship and preservation on Undo. |
| F3 Lookback | Fake-mode job tests cover 100 old + 1 recent signal, 205 recent hits across bounded pages, stale versions, budget pauses, replay and individual retries. |
| F4 Draft replies | All three draft kinds can open, accept, rephrase and discard after reload. Old theory cards without an explicit kind remain readable, including later-retired references. |
| F5 Retired dependencies | Prototype Tests show each retirement reason and retain navigation/history. |
| F6 Signal merge | The real interface selects an explicit survivor, reviews sources, merges and preserves two origins/evidence links, reloads, undoes, and reports preservation conflicts. |

The Timeline concern was also reproduced and repaired: horizontal movement changes only the horizon; a different confidence row appends one stance. Five additional spatial browser tests cover Atlas zoom/panning, Timeline levels/chain mode, Columns rails and pointer pane resizing. Later storage edge cases and their fixes are recorded in [the backend preservation review](final-backend-review.md).

## Original review

Reviewed 1 November 2026. This is a functional review of the current working tree, not a completion certificate. Scope: the original three preservation regressions, v1 slices 0–11, and whether named actions actually reach their tools from the interface. Styling is excluded. No implementation files, production data, or paid providers were changed or called.

## Evidence and fixed findings

The three previous re-review failures now pass their original isolated, in-memory SQLite reproductions:

| Previous failure | Current reproduction result |
| --- | --- |
| Undo a merge after discarding its survivor | Explicit discarded-signal conflict; the complete world is unchanged. No absorbed signal is resurrected. |
| Another agent run overwrites evidence decided by the person on an otherwise untouched draft | Rejected as a person decision; stance and note remain unchanged. |
| Another agent run replaces an earlier run's evidence, then retry cleanup deletes it | Cross-run replacement is rejected; clearing the later failed run leaves the original stance, note and `run_id` intact. |

Those are closed findings. The existing later-merge, binned-origin and purged-origin conflicts are deliberate constraints, not defects. The earlier shared-dump restoration and inverse-delta tests are evidence for their covered cases; passing them does not establish every later-edit combination.

I also ran a real Chromium session against Vite with **every API request intercepted into an in-memory database**. That session proved F1 and F5 below. A separate fake-mode in-memory job proved F3. F2, F4 and F6 are source-path findings; they still need dedicated browser regression proof. The parent reports 94 unit and 26 core browser checks, plus 14 final browser and 12 web checks; I did not independently rerun those complete suites in this pass. Existing test files were inspected rather than treating their totals as coverage of every action.

## Remaining actionable findings

### F1 — P2: Find searches active titles, bypassing the search tool and hiding retired history

**Locations:** `app/web/src/app/dialogs.tsx:18`, `:36`; `app/web/src/ui/data.ts:46`, `:50`. The existing server implementation is `app/server/src/tools/reads.ts:29`.

Find assembles four active-object lists and filters only `choice.label`. It never calls `search`. A theory body can match the backend search while its Find dialog reports no results. Retired themes and theories are excluded before searching, so a retired item without an incoming link has no normal discovery route.

**Browser reproduction:** create a held theory with claim `A searchable active claim` and body `The unique body token is quartznebula`; open Find and enter `quartznebula`. Result: `No matches`. Calling the existing `search` tool with the same text returns one theory. Create and retire `Archived claim with durable provenance`; Find for `Archived claim` also returns `No matches`.

**Documented standard:** build spec §4.5, line 426 calls the read tools “Reads for agents and Find (⌘K).” The design model, line 157, says retired objects keep their history. Search already includes theory bodies and retired objects. Using that search contract is the smallest fix; give returned retired items a clear status. Adding dumps or suggestions to Find is **not** asserted as a v1 blocker: the specified `search` implementation currently names four stock-object kinds.

**Proof after repair:** body-only query; retired theory and theme query; open result; reload; no loss of history. Include a result outside the first HTTP page.

### F2 — P2: Revision suggestions cannot be fully reviewed or rephrased before acceptance

**Locations:** `app/web/src/ui/panes.tsx:312`; `app/web/src/ui/briefing-app.tsx:74`, `:78`; existing tool support at `app/server/src/tools/suggestions.ts:82`.

The theory pane displays only a suggestion's reasoning and Accept/Discard. It omits the proposed claim/body/name and, for a merge, the other object. Briefing displays `claim` or `bodyInsert`, but not a complete replacement `body` or renamed theme `name`. Neither surface offers the specified rephrase-then-accept action, despite `decideSuggestion` accepting those overrides. The pane's separate “Rephrase and accept draft” action is a draft/theory edit, not a revision-suggestion decision.

**Reproduction from the rendered source path:** propose a revision with a replacement body and a short generic reason. Open its target theory: the pane presents an Accept button without the body it will write. Open Briefing: the body is still absent. There is no control that submits `decideSuggestion` with the person's revised wording. Editing the target separately does not solve this: later accepting the original suggestion writes its payload.

**Documented standard:** design model lines 119–120 require the proposed change as suggestion state and “accept, rephrase then accept, discard.” Build spec §4.5 line 423 expressly includes rephrase-then-accept. This is missing required behavior, not a recommendation for a particular diff design.

**Small fix:** one shared suggestion review/action component that shows each supported payload, preserves its target identity, and submits optional edited wording through `decideSuggestion`. A theme revision must be reviewable too. Preserve the existing challenge decision path.

**Proof after repair:** theory claim revision, full-body revision, body insertion, theme rename, evidence proposal and merge proposal; review content, edited acceptance, discard, reload, version/authorship and event assertions.

### F3 — P2: Tripwire lookback applies the 90-day filter after a global 100-signal cap

**Locations:** `app/server/src/jobs/handlers.ts:65–67`; retrieval truncation at `app/server/src/tools/reads.ts:26`.

Setting a tripwire retrieves the globally best 100 candidates, then removes candidates older than 90 days. Old high-ranking signals can consume every slot, preventing a matching recent signal from reaching the checker.

**Executed reproduction, fake mode/in-memory database:** create 100 old signals with gist `memory withdrawn` and dates in 2020, plus one recent signal `memory withdrawn after privacy complaints`. Set a held theory's tripwire to `memory withdrawn` and execute its queued tripwire job. `similarSignals(limit:100)` returned 100 old candidates, excluded the recent one, and filtering left zero recent candidates. The job produced zero challenge suggestions. This is a missed lookback, not a model judgement.

**Documented standard:** build spec §5.3, line 584: setting a tripwire must “look back over signals from the last 90 days.” The duration is labelled a judgement in the spec; once selected, the filter's placement must still implement it correctly.

**Small fix:** constrain candidates by date before ranking/truncation. Decide and document any cap *within* the eligible recent set; do not allow old items to displace it.

**Proof after repair:** this 100-old/1-recent fixture produces the recent challenge; old signals stay excluded; empty and more-than-100-recent datasets have explicit coverage.

### F4 — P2: Processing chat silently drops draft theme and prototype cards

**Locations:** `app/web/src/chat/parts.tsx:14`; `app/server/src/agents/prompts/process-dump.md:11`; fake fixture generation at `app/server/src/agents/fixtures.ts:66`.

The `data-draft` renderer looks only in `THEORIES` and hardcodes `kind:"theory"` for its actions. A persisted `data-draft` part naming a successfully created draft theme or prototype returns `null`. The processing prompt and fake fixture generator also describe/emit only draft theories, masking this gap in current synthetic chat coverage.

**Reproduction from source contract:** create a draft prototype or theme through its registered processing tool, then store a reply part `{type:"data-draft",data:<returned draft>}`. `ToolParts` cannot find its ID in `THEORIES` and renders nothing. Reload follows the same branch. This has not yet been run as a separate browser reproduction.

**Documented standard:** build spec §1 explicitly includes processing draft prototypes; §5.3 lines 588–589 allows all three draft creation tools and requires a reply with draft cards. §6.11 also requires all three draft kinds in Briefing. A draft may be accessible in Briefing while still missing from the processing reply that is supposed to show what was made.

**Small fix:** make the stored draft part identify its object kind, support all three kinds with the correct actions, and update the prompt plus fake coverage together. Consider old persisted theory parts without a kind.

**Proof after repair:** processing reply containing one draft of each kind; correct cards, open, accept, discard, rephrase path, and identical re-render after reload. Existing `showTheory` also resolves only active `THEORIES`; check retained replies referencing a later-retired theory rather than assuming the stored tool output is rendered.

### F5 — P2: A prototype does not disclose that its tested theory was retired

**Location:** `app/web/src/ui/panes.tsx:241–243`.

The Tests list renders the title and a draft marker only. Retiring a linked theory leaves a normal-looking theory chip, with no retired state or reason.

**Browser reproduction:** create a prototype linked to a held theory, retire that theory with reason `disproven`, then open the prototype. The Tests section still displays the claim, but no retired/disproven indication. The title is **not blank**: `theory()` falls back to `world.theories` at `app/web/src/ui/data.ts:73`. The suspected blank-title bug is therefore rejected.

**Documented standard:** design model line 112: “If a theory you built on is later retired, then the prototype shows it now rests on a retired claim.”

**Small fix:** show the linked theory's retirement state/reason where the prototype declares what it tests, while retaining the title and navigation.

**Proof after repair:** linked theory retired for each reason; prototype remains readable; retired claim opens with its history; reload preserves the indication.

### F6 — P2: The person's signal Merge action has no interface path

**Locations:** signal actions `app/web/src/ui/panes.tsx:91`; available person tool `app/server/src/tools/merges.ts:140`.

The signal row provides evidence removal, unfile, file, discard and undo of an existing merge. No web caller invokes `mergeNearDuplicateSignals`; there is no way for the person to select two existing signals and merge them. Automatic processing merges and their Undo are implemented, but they do not expose the person's named Merge action.

**Documented standard:** design model line 74 expressly lists user “merge” and “undo a merge”; its object/action matrix line 146 repeats Merge (+ undo). Build spec §4.5 line 404 marks `mergeNearDuplicateSignals` as **both** actors. This is stronger evidence of a required manual action than the theme/theory case below, although there is no dedicated manual-merge slice acceptance row.

**Reproduction:** open any two existing active signals through the pane/Columns; available actions contain Undo only when a prior merge exists, and no Merge selection/action. Source search finds no web invocation of the existing merge tool.

**Small fix:** expose the existing bounded signal-merge tool with an explicit survivor, a second signal and reviewable sources; retain the existing undo/conflict rules. No new generic merge system is required.

**Proof after repair:** manual merge from real UI, both sources/origins/evidence preserved, explicit survivor, undo, reload, and preservation conflict behavior.

## Manual theme/theory merging: scope ambiguity, not a new-tool mandate

The design model lists user Merge for themes (line 84) and theories (line 101), and both rows have Merge in the object/action matrix. But it also states at line 57: “Themes and theories still merge only by suggestion.” Build spec §2 defers de-duplication beyond exact links and near-duplicate signals. §6.11 line 769 says “Theme-merge suggestions and clustered draft themes come from later jobs; render them if present.” The typed tool table supplies agent `proposeMerge` and person `decideSuggestion`, not a direct person theme/theory merge tool.

Current behavior matches that latter boundary: `app/server/src/tools/suggestions.ts:16` implements applying a merge on acceptance, line 81 exposes agent `proposeMerge`, and Briefing at `app/web/src/ui/briefing-app.tsx:73` names both objects. There is no direct manual merge UI for these two kinds. **Do not infer that v1 requires inventing direct person merge tools.** Treat proposal rendering and acceptance when present as mandatory v1 behavior, and direct initiation as a documented model/build-spec ambiguity. F2 covers incomplete review in the pane. A seeded proposal needs a runtime acceptance proof because the later producer is intentionally absent.

## Named-action and slice coverage map

“Wired” below means the UI handler and typed tool path were inspected; it does not mean every combination was independently browser-tested in this pass.

| Object/actions | Actual path and remaining limit |
| --- | --- |
| Dump capture, delete, restore, retry, inspect | Pill/column and capture endpoint → dump tools; log confirmation calls `previewDeleteDump` then `deleteDump`; bin Restore and retry controls exist. Prior storage reproductions and focused tests cover restoration/cleanup. Purge is a queued system action, not a person editor. |
| Signal edit gist/note; file/unfile; evidence link/unlink; discard; merge/undo | Editable row → `editSignal`; row → `fileSignal`/`unfileSignal`; theory evidence chooser → `linkEvidence`, contextual row → `unlinkEvidence`; row discard and merge Undo wired. Sources and all origin chips render. Manual Merge missing: F6. |
| Theme write, rename, accept/rephrase/discard draft, link, retire, merge | Create chooser → `writeTheme`; editable name → `renameTheme`; draft accept/discard controls; rename then accept supplies the wording flow; theory relationship chooser links the theme; retire asks reason. Direct Merge scope is ambiguous above; incoming merge proposals use Briefing. |
| Theory write/edit/version, draft accept/rephrase/discard, confidence, horizon, tripwire, evidence, rivals/follows/prototypes, retire | Create/editor → tools through `ui/edits.ts`; explicit `rephraseDraft`; confidence/stance and tripwire decisions → person tools; relationship chooser routes four relations; retirement asks reason. F1/F2/F3 affect discovery, revisions and lookback. Extrapolate/red-team are expressly later jobs. |
| Prototype write/edit, draft decisions, theory links, status/shelve, media and external links | Create chooser; prototype pane edits name/body/status; draft accept/discard and edit-then-accept; Add theory, Add link, standalone media upload → `attachPrototypeMedia`. Tests lacks retired dependency status: F5. Rich-prose formatting was not independently verified in this pass. |
| Suggestion accept/rephrase/discard; challenge undo | Briefing and target-theory actions accept/discard; challenge path resolves current suggestion/version and appends undo stance. Required reviewed/rephrased acceptance missing: F2. |

| Slice | Implementation/test evidence inspected | Remaining proof or finding |
| --- | --- | --- |
| 0 Scaffold | Schema, tool registry/authority, loopback server, Vite integration; schema/authority tests. | Port 5174 is an accepted local substitution. Production build/smoke was parent-reported, not repeated here. |
| 1 Capture/log/bin | Capture HTTP/media handlers, pill/log, dump tools; HTTP/media/reversible/storage tests and capture/chat-log browser files. | No new bin finding. Original preservation repros now pass; keep concurrent history/conflict fixtures. |
| 2 Agents/queue | Provider adapters, schemas/capabilities, job runner, retry cleanup, daily cap; queue/stale recovery/retry/run tests. | No live provider calls made here. The earlier retry settlement fix is covered by `jobs/dump-status.test.ts`. |
| 3 Process/file/dedupe | Processing tools, article fetching, de-dup gate and origin tools; process/fetch/novel-eval/storage tests. | F4: theory-only draft reply coverage hides theme/prototype cards. Synthetic evals are not real-dump validation. Oversized article failure is an explicit accepted guard, not truncation. |
| 4 Sections/pane | Current view, panes, edit store, relationships; pane browser tests. | F1, F5, F6. Suggestion contents must be reviewable from the pane (F2). |
| 5 Theory/confidence/tripwire | Stance tools, tripwire UI/current-hit resolver, evidence and draft controls; authority/reversible/draft-evidence tests. | F3 lookback and F2 revision path. Current-hit ID fix still needs final browser proof from parent. |
| 6 Briefing | All five groups; mark-seen/keep-merge and keyboard actions; responsive browser coverage inspected/reported. | F2 full revision payload and rephrase. Seeded theme/theory merge proposal acceptance needs actual browser proof. |
| 7 Atlas | `ui/atlas2.tsx`, deterministic packing and semantic zoom/navigation paths. | Parent owns visual proof; arbitrary-data deterministic packing is an accepted decision. No new runtime reproduction in this pass. |
| 8 Timeline | Drag calls `setEdit`; edit store persists via `setHorizon`/`setConfidence`; graph, levels and chain mode exist. | Need actual drag → reload proof and stance-count assertion. Source concern: held drag always submits confidence (`timeline2-fieldx.tsx:286`), even for horizon-only movement; `edits.ts:49` calls `setConfidence` whenever supplied. Check against §6.8 “if confidence moved” before declaring this slice complete. No new runtime repro was run. |
| 9 Columns | Five-column world mappings, rails and relationships in `ui/columns2.tsx`. | Source paths inspected; parent browser matrix is the runtime evidence. Retired objects intentionally leave active columns but still need Find (F1). |
| 10 Chat | Persisted replies, `useChat`, tools/parts, context, picker/drop, attachments/voice; chat server and chat-log browser tests. | F4 all draft kinds; replay of references to retired objects; F2 if revision actions are surfaced here. |
| 11 External/narrow | Capture routes/README, phone browser tests, backup script/test; parent final 40px target proof. | No deployment or phone remote access required. Backup and HTTP/media proof are separate from actual microphone/transcription provider proof. |

## Bounds on the conclusions

The registry alone is not evidence of a usable action. Conversely, missing generic unlink controls for rivals/follows/prototype links are not listed as P2: those inverse verbs are not explicitly required in the v1 action tables. A richer editor, universal archive browser and direct person theme/theory merger should not be silently invented under this review.

The action matrix exposes where proof is still missing; it does not label those slices complete. Repair and regression-test the six concrete gaps, resolve the documented merge boundary using the existing spec, and obtain the targeted runtime checks above before the final completion claim.
