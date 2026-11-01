# Aber design review — round 3

**The context P2 is resolved. One small desktop target-size gap remains.** No redesign is needed. The round-1 fixes still pass, and the round-2 singular-count finding is corrected.

Reviewed the rendered app at `127.0.0.1:5174`, at 1360 × 820 and 390 × 844, against the canonical `/app` at `127.0.0.1:5181`. Basis: `docs/design-model.md`, build spec §6, prior design reports, Interface Grammar, Maggie Design, Make Interfaces Feel Better, and Web Animation Design. Honest derived counts, darker muted text, and dynamic Atlas packing remain intentional.

## Final recheck

| Gate | Final evidence |
| --- | --- |
| Context P2 resolved | Three context pills wrap within the composer. At 1360px, the float is x1000–1342; at 390px, x30–372. The Cost pill's remove control works at both sizes, and the 40px crosshair stays inside the bound. [Desktop](final-context-wrapped.png), [phone](final-mobile-contexts.png). |
| Confidence composite | One keyboard-focusable slider has a 112 × 40px control, preserving five 20 × 6px marks with 3px gaps. All five mark-centre hit tests reach the composite. Tab reaches the named native range; its ring is visible. [Desktop focus](final-desktop-confidence-focus.png), [phone focus](final-mobile-confidence-focus.png). Values were not changed. |
| Enlarged controls | Inspected pane close, width, relationship, evidence, decision, capture, context-removal and view-switcher controls measure 40px; phone targets remain inside the viewport. [Desktop](final-desktop-pane.png), [phone](final-mobile-pane.png), [phone bottom](final-mobile-pane-bottom.png). The inline count exception is below. |
| Fresh reduced motion | Pane samples have one final bound and `transform: none`; column samples contain only closed and open bounds. [Pane](final-reduced-pane.png), [column](final-reduced-column.png). |
| Confidence history | History remains inside the phone viewport and hover exit dismisses the desktop history. [Desktop](final-confidence-history.png), [phone](final-mobile-confidence-history.png). |

### Remaining target-size gap

| Priority / gate | Before / evidence | After / small fix |
| --- | --- | --- |
| **P3 — target size** | The desktop **1 signal matches** tripwire count remains 26 × 22px, without a pseudo-element hit extension. The phone version is 40 × 40px. This is an incomplete desktop target correction, rather than a new layout regression. [Focused target](final-tripwire-focus.png); exact bounds in `final-checks.json`. | Give the inline count a 40 × 40px target while retaining its compact dashed visual mark, as the phone version already does. |

## Resolved finding

| Priority / gate | Before / evidence | After / small fix |
| --- | --- | --- |
| **P2 — resolved: context controls remain reachable** | Open the memory theory, then the dump column. Its open-object and view pills are present. Use the crosshair to pick **Cost of intelligence**. The third pill and the crosshair extend beyond the right edge: the new pill is at x1324–1487 in a 1360px viewport, and the context row grows to 516px above a 360px composer. [Original overflow](live-context-three.png). | The context float now stays within the composer, wraps pills, and provides bounded vertical scrolling. Remove controls and the crosshair remain reachable. [Desktop fix](final-context-wrapped.png), [phone fix](final-mobile-contexts.png). Model §3 Context pills; build spec §6.9 Context. |

## Verified states

| Surface | Result / evidence |
| --- | --- |
| Columns expansion and origins | Related theory, origin title and source wrap within the signal column. Related objects remain first. Clicking the origin reaches its named dump. [Expanded signal](live-signal-expanded.png), [origin dump](live-origin-dump.png). |
| Persistent pane labels | Confidence, Happens by, Rival, Supports and Undermines remain visible at rest. Prototype Status and Tests are labelled. [Theory labels](live-theory-labels.png), [prototype](live-prototype-pane.png). |
| Context and drop approach | Picking outlines the selected region and adds its named context. Drag approach swells the closed pill and exposes the drop marks. No drop was submitted. [Picking](live-context-picking.png), [drop approach](live-drop-approach.png). The multi-context overflow is resolved in the final recheck above. |
| Recording take | A browser-generated synthetic audio stream produces live waveform bars and elapsed time. Escape discards the take; no recording was submitted. [Take](live-recording-take.png). |
| Persisted voice playback | Columns → Dumps → expand `voice-note.m4a` shows the waveform and transcript. Local media decodes to 8.295s; Play advances time, Pause stops it, and keyboard waveform seeking moves position. [Detail](live-voice-dump-detail.png), [playing](live-voice-playing.png), [focused seek](live-voice-seek-focused.png). The Dump log is correctly a status surface; its rows are not the playback entry. |
| Phone | Body width stays 390px. Pane fills the viewport; the lower evidence, relationships and actions remain reachable above the pill. Inspected pane controls have 40px targets. The confidence history stays inside the viewport and dismisses on outside click. [Briefing](live-mobile-briefing.png), [pane](live-mobile-pane.png), [bottom](live-mobile-pane-bottom.png), [history](live-mobile-confidence.png). |
| Popover / focus | Confidence history appears on hover and keyboard focus, and hover exit dismisses it. No native disclosure element was introduced. [Focus](live-confidence-focus.png). |

## Motion

| Normal / before | Reduced motion / after |
| --- | --- |
| Pane open → close → reopen at 90ms intervals redirects and settles into one pane at its intended bounds. [Settled pane](live-pane-interrupted-settled.png). | Fresh reduced-motion session opens the pane at its final bounds with `transform: none`. [Pane](live-pane-reduced.png). |
| Pill open → close → reopen at 90ms intervals settles into one complete column, preserving the saved message and composer. [Settled column](live-pill-interrupted-settled.png). | Fresh reduced-motion session contains only the closed and open geometry, with no intermediate sampled bounds. [Before](live-reduced-pill-before.png), [after](live-reduced-pill-after.png). |

## Scope and evidence

No implementation source was inspected or edited. All API requests using write methods were blocked; no live provider, send, decision, confidence, horizon, deletion or persisted drop action was invoked. The only writes were this report and its evidence. The 390px check covers browser layout, not physical iPhone safe-area hardware.

[final-checks.json](final-checks.json) and [final-motion.json](final-motion.json) contain the final rendered recheck. [checks.json](checks.json) and [motion.json](motion.json) preserve the earlier observations. The dynamic-preference-emulation sample is excluded from the verdict; the fresh reduced-motion context is authoritative. No API write was attempted during the final recheck.
