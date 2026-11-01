# Aber design review — round 1

**Not ready: 1 blocking finding, 2 smaller findings.** This review preserves the settled five-view design. It inspected rendered output only, with no implementation-source inspection or app-data edits. Browser requests that could write to `/api/` were blocked. Reports and screenshots are confined to this folder.

Reviewed at 1360 × 820 and 390 × 844, against the 1360 × 820 canonical `/app` frame. References: `docs/design-model.md` sections 3–5, `docs/build-spec.md` section 6; Interface Grammar, Maggie Design, Design with Taste, Web Animation Design. Honest smaller counts, darker muted text, and dynamic Atlas packing were treated as intentional.

## Findings

| Priority / gate | Surface and evidence | Model reason | Small fix |
| --- | --- | --- | --- |
| **P1 — blocking: content identity** | **Dump-or-ask column omits an existing message.** Opening the column renders only `22:05`; the Dump log shows the corresponding saved question, “What if review is about intent, not diffs?” Compare [empty conversation](live-capture-only.png) with [named dump in log](live-dump-log.png). The earlier [pane + column screenshot](live-pane-and-capture.png) shows the same omission before the later transient 502 toast appeared. | A chat message is a Dump; its raw content must remain readable with its replies. A timestamp alone does not identify the object. Model §1 Dump; build spec §6.9 Sent / Reply. | Render the persisted dump's text/content in the user-message bubble, including the fallback for older/seeded records. Verify by reloading the existing saved question, without creating a new message. |
| **P2 — expanded content must remain readable** | **Columns signal expansion clips related-object names and source content at its right edge.** Expand “Agent recalls a codebase across a month of sessions.” The related theory row and lower source chip run beyond the 290px column and are abruptly cut off. [Live expanded signal](live-signal-expanded.png), compared with [canonical expansion](jig-signal-expanded.png). | Expansion is the stage for named relationships and full details. Content should fit its owning surface; full object names are useful text. Model §3 Signal detail and §4 Signal row; Maggie Design: summary before detail, preserve useful text. | Constrain expanded children to the column's inner width; let relationship/source chips wrap and shrink. Keep their existing horizontal padding. Ensure the gist editor's border and text remain inside the expanded row. |
| **P2 — relationship navigation; inherited model/jig inconsistency** | **Columns lineage dims unrelated rows but does not pull relatives to the top.** In [live signal selection](live-signal-expanded.png), “Agent memory” remains below four unrelated themes, and its theory remains below five unrelated theories. [The jig behaves similarly](jig-signal-expanded.png). | The settled model and build spec explicitly say lineage pulls relatives to the top of every column, then dims the rest. Model §3 Columns; build spec §6.6 Lineage. This is a discrepancy between the written behavior and both rendered implementations, not a request for a new layout. | When a lineage selection is active, stable-partition each column into related then unrelated objects; restore its ordinary order on deselection. Keep the selected row and focused control traceable through the move. |

## Checks and limits

| Check | Evidence / outcome |
| --- | --- |
| Five canonical views | Captured live and jig Theme sections, Columns, Atlas, Timeline and Briefing. Theme index, theory cards, rails, Paper circles, Field axes, and calm Briefing column retain their intended structure. See screenshot index below. |
| Docked peers | [Pane + capture](live-pane-and-capture.png) and [Timeline + both](live-timeline-both.png): capture owns the far right; pane sits left; view compresses. Timeline remains horizontally clipped/scrollable rather than squeezing labels. |
| Return / Escape | [First Escape](live-escape-once.png) closes the most recently opened capture column while retaining the pane; [second Escape](live-escape-twice.png) closes the pane. Signal expansion and Timeline Follow chain were also opened and escaped. |
| Timeline chain | [Selection](live-timeline-selected.png), [Follow chain](live-timeline-chain.png), [return](live-timeline-chain-return.png). No mutation was needed. Drag-to-year/confidence was not performed because it writes data. |
| Atlas | [Overview](live-atlas.png), [zoom with claims/gists](live-atlas-zoom.png), [keyboard zoom after focusing map](live-atlas-keyboard-zoom.png). Dynamic packing retained legible labels in the inspected territory; no packing finding. |
| Phone | [Briefing](live-mobile-briefing.png), [theory pane](live-mobile-pane.png), [pane bottom](live-mobile-pane-bottom.png), [canonical phone pane](jig-phone-pane.png). The pane fits the width and its bottom content remains reachable. The challenge row is denser with the real loaded Inter font but no separate blocking mobile finding is asserted. |
| Keyboard focus | [Theme index focus](live-keyboard-2.png): visible 2px blue outline with horizontal inset. Find also received a visible outline. This was representative focus testing, not an exhaustive tab-order audit. |
| Destructive / decision controls | Accept, discard, confidence, drag updates, capture submission, recording and dump deletion were not triggered. Error/processing changes produced by concurrent runtime work were not assessed as design defects. |

### Motion review

| Before: normal motion | After: reduced motion |
| --- | --- |
| Pane enters from the right and settles in approximately 0.5s. Sampled translation decreases from 178px to 0; no reversed origin or persistent animation remained. | Pane is at its final bounds immediately, with `transform: none` and no running animations in all samples. [Reduced-motion state](live-pane-reduce.png). |
| Follow chain changes the Field into depth columns and Escape restores the Field. Capture grows from the corner and closes back there in the exercised sequence. | No additional reduced-motion defect was observed in the pane sampling. The other transitions were visually exercised under normal motion; no broader claim is made. |

No deletion candidates or concept-level questions are necessary for these fixes. An initial clipped-card/context jump did not reproduce on a clean repeated run and is excluded from the findings. Typography was checked through rendered font state: live Inter is loaded; the jig requests Inter but has no registered Inter face and therefore falls back. That explains some wrapping differences and is not treated as a live-app defect.

## Screenshot index

| View | Live | Canonical |
| --- | --- | --- |
| Theme sections | [live](live-current.png) | [jig frame](jig-current-frame.png) |
| Columns | [live](live-columns.png) | [jig frame](jig-columns-frame.png) |
| Atlas | [live](live-atlas.png) | [jig frame](jig-atlas-frame.png) |
| Timeline | [live](live-timeline.png) | [jig frame](jig-timeline-frame.png) |
| Briefing | [clean repeated switch](live-briefing-after-switch.png) | [jig frame](jig-briefing-frame.png) |
| Object pane | [live](live-pane-no-preference.png) | [jig frame](jig-pane-frame.png) |
| Pane + capture | [live](live-pane-and-capture.png) | [jig frame](jig-both-frame.png) |

Interaction measurements and rendered text are in [inspection.json](inspection.json), [interactions.json](interactions.json), [verify-context.json](verify-context.json) and [final-checks.json](final-checks.json). Browser scripts are included solely to reproduce this review; they do not edit the implementation.
