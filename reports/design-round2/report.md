# Aber design review — round 2

**Ready for the reviewed design scope: 0 blocking findings, 1 minor text finding.** All three round-1 fixes pass. The settled five-view design is preserved; no redesign or decorative additions are proposed.

Reviewed the rendered live app at 1360 × 820 and 390 × 844 against the canonical 1360 × 820 `/app` frame. Basis: `docs/design-model.md`, build spec §6.1–6.12, Interface Grammar, Maggie Design, Design with Taste, Make Interfaces Feel Better, and Web Animation Design. Honest derived counts, darker muted text and dynamic Atlas packing were treated as intentional.

No implementation files were inspected or edited. All API requests using a write method were blocked. Expanding one new signal attempted `POST /api/tools/markSeen`; it was aborted, producing an incidental error toast. That toast is excluded from findings. No capture, decision, confidence, horizon, deletion or recording action was submitted.

## Finding

| Priority / gate | Before / evidence | After / small fix |
| --- | --- | --- |
| **P3 — useful text** | Singular counts retain plural nouns: “1 signals” under Agent identity and Novel agent interfaces in [Theme sections](live-current.png); “1 dumps” in [phone Briefing](live-mobile-briefing.png). | Choose the singular noun when the count is exactly one: “1 signal”, “1 dump”. Retain the existing count, spacing and hierarchy. |

No new high-impact visual or interaction defect was established. No deletion candidates or concept-level questions are needed.

## Round-1 verification

| Previous finding | Result | Evidence |
| --- | --- | --- |
| Saved question missing from chat | **Pass.** “What if review is about intent, not diffs?” appears in its user bubble, with its time below. | [Saved chat](live-chat.png); [dump log](live-dump-log.png). |
| Expanded Columns signal clips names and source | **Pass.** The theory relationship wraps to two lines; the theme, origin and source chip remain inside the signal's owning column. | [Expanded signal](live-signal-expanded.png), compared with [round 1](../design-round1/live-signal-expanded.png). |
| Columns relatives not first | **Pass.** Selecting the memory signal puts Agent memory first in Themes, its theory first in Theories and Memory inspector first in Prototypes; unrelated rows remain dimmed. | [Selected lineage](live-signal-expanded.png), compared with [round 1](../design-round1/live-signal-expanded.png). |

## Interaction and layout checks

| Gate / surface | Result and evidence |
| --- | --- |
| Grammar and meaning | Existing concepts, ownership and five-view meanings are intact. Theory pane retains Confidence, Happens by, Rival, Supports and Undermines. Prototype pane retains Status and Tests. [Theory document](live-pane.png), [prototype document](live-prototype-pane.png). The latter includes the excluded read-only-test error toast. |
| Spatial model | Pane and dump column remain docked peers, with the column at the far right and the view compressed. [Both open](live-pane-chat.png). |
| Progressive disclosure | Columns signal expansion preserves identity and reveals named relatives and source. Pane evidence expands in place using its existing accordion. Confidence history opens from its sparkline. [Expanded signal](live-signal-expanded.png), [pane evidence](live-pane-signal.png), [confidence history](live-confidence-popover.png). The pane-evidence screenshot includes the excluded blocked-markSeen toast. |
| Context picking | Crosshair picking adds the selected theory's actual title as a removable context pill above the input, retaining the view pill. No send was triggered. [Context pills](live-chat-context.png). |
| Keyboard / focus | Tab from Find reaches the theme index with a visible inset focus outline. Focusing the pane separator and pressing Left changed its width from 832 to 1128px, settling at the next snap. [Index focus](live-keyboard-focus.png), [pane keyboard resize](live-pane-keyboard-resize.png). |
| Escape | Closing chat then pane follows the opening stack. Timeline Follow chain returns to the Field before closing the pane. [Chain](live-timeline-chain.png), [Field return](live-timeline-return.png). |
| Atlas | Overview, keyboard zoom and zoomed claims/gists inspected. Labels remain legible in the inspected territory. [Overview](live-atlas.png), [zoom](live-atlas-zoom.png), [keyboard region focus](live-atlas-keyboard.png). |
| Narrow layout | At 390px the body remains 390px wide; Briefing stays a single column; pane fills the screen and lower evidence, relationships and actions remain reachable by scrolling. Confidence history stays within the viewport. [Briefing](live-mobile-briefing.png), [pane](live-mobile-pane.png), [bottom](live-mobile-pane-bottom.png), [history](live-mobile-confidence.png). |

## Motion review

| Before: normal motion | After: reduced motion / interruption |
| --- | --- |
| Pane translation decreases from the right and settles to `transform: none`. The measured final pane is 832px wide at x=528. | Reduced-motion opening has `transform: none` in every sample where the pane exists, with constant final bounds. [Reduced-motion pane](live-reduced-pane.png). |
| Dump column grows out of the bottom-right pill. | Open → close after 90ms → reopen after another 90ms redirects the existing surface geometry and settles into one complete column, with the saved message and composer intact. [Settled state](live-chat-interrupted-settled.png). |
| Follow chain exposes full claims in columns by depth. | Escape returns to the Field while the theory pane remains open. [Chain](live-timeline-chain.png), [return](live-timeline-return.png). |

Frame samples are in [motion.json](motion.json); verification notes and blocked requests are in [checks.json](checks.json). The first pill sampling attempt used an absent selector and records no geometry; the subsequent `.ps-surface` run contains the valid interrupted-motion samples.

## Five-view comparison index

| View | Live | Canonical |
| --- | --- | --- |
| Theme sections | [live](live-current.png) | [jig](jig-current.png) |
| Columns | [live](live-columns.png) | [jig](jig-columns.png) |
| Atlas | [live](live-atlas.png) | [jig](jig-atlas.png) |
| Timeline | [live](live-timeline.png) | [jig](jig-timeline.png) |
| Briefing | [live](live-briefing.png) | [jig](jig-briefing.png) |
| Theory pane | [live](live-pane.png) | [jig](jig-pane.png) |

This is representative screenshot and interaction review, not an exhaustive accessibility audit. Source-link navigation, unavailable reply attachment/filed-token states, recording, data-changing drag/drop and decision results were not exercised. No claim is made about those states.
