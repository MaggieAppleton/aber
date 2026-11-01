# Production accessibility adjustments

The canonical jigs remain unchanged. Production reserves 40 × 40 px for controls while retaining the original icon sizes, type, colours and confidence marks.

- Pane close/full-width, year steps, evidence actions, view switcher, capture controls, log controls and popover rows use real layout boxes. Adjacent controls do not share overlapping pseudo hit areas.
- Confidence is one Base UI slider with one range input and one tab stop. Its composite is 112 × 40 px. Five presentational bars remain 20 × 6 px with 3 px gaps. Pointer selection, arrows, Home/End and number keys 1–5 update the same persisted confidence field. The accessible name is `Confidence`; its value text is `4 of 5`, for example.
- Confidence/history and year rows reserve the extra vertical space. The pane document begins at 64 px to clear its 40 px top controls. This increased spacing is an intentional accessibility exception to jig parity.
- Capture context pills wrap within the composer, with a bounded scroll area if needed. The thread reserves their measured height, keeping the last message and all remove/pick controls reachable.
- Dense Atlas/Timeline chart points retain their spatial picking model; enlarged overlapping invisible chart targets are not introduced. Their toolbar and popover controls use 40 px targets. Phone navigation uses Briefing and the shared full-width pane.

`web/tests/accessibility-targets.spec.ts` measures the rendered desktop and 390 px controls, preserves bar geometry, exercises pointer and keyboard confidence edits, verifies reload persistence, and covers context overflow and visible spend-limit status against an isolated temporary database.
