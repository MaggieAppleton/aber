# Prior design decisions (digest for the grammar jigs)

Compiled 4 Nov 2026 from everything on this branch before the grammar jigs. Read this before setting any token in `design/grammar/`.

**Tags.** **DECIDED**: Maggie chose it (her words, a Copy-choices record, a jig she locked, or a commit in her checkout recording her pick). **PROPOSED**: an agent or the coordinator suggested it; Maggie hasn't approved it. **STALE**: a document that later decisions overrode. Where sources conflict, both appear with dates, and the latest Maggie decision wins.

**Main sources.**
- `design/surface-study/index.html`: "Crisp, Sage and Jade", headed "decided 1 Nov 2026". Its Rules table is at :871–894.
- `jig/src/homes/homes.css:1–27`: the canonical jig tokens, with the same values as the study.
- `docs/design-issues.md`: DI-001 to DI-009.
- `docs/design-model.md`: §3 to §5. Last updated 1 Nov, so it predates the surface language (see the STALE notes).
- `design/decisions.json`.
- `design/explorations/_retired/*`.
- Copilot checkpoints for sessions 5183d8b1 (DI-001 to DI-009) and 572d17ca (DI-010).

**Maggie, 4 Nov 2026** (Claude session e908cf24): "We had a teal colour as the main accent in many of the jigs… We could consider using black as the main button colour, but I'd need them presented side by side and shown in context. I feel like you've missed some choices we already made about colour, icons, and spacing."

---

## Colour

### Accent: Radix Jade (the "teal")

- **DECIDED, 1 Nov.** Source: surface study :25, :37–39 and :878; `jig/src/homes/homes.css:7–9`.

| Token | Radix step | Value |
| --- | --- | --- |
| `--ap-accent` | jade 9 (fills) | `#29a383` |
| `--ap-accent-hover` | jade 10 | `#26997b` |
| `--ap-accent-text` | jade 11 | `#208368` |
| `--ap-accent-wash` | jade 3 | `#e6f7ed` |
| `--ap-accent-line` | jade 7 (rings) | `#8bceb6` |
| text on the accent | — | `#ffffff` |

- **Meaning:** "you are acting here". It is used for:
  - the focus ring
  - the primary action
  - the current view in the switcher
  - recording
  - the send button
  - the crosshair pick tool

  Source: study :878; commit ab0c487.
- **New-activity dots use jade.** **DECIDED, 1 Nov.**
  - `--ap-new: var(--ap-accent)` (`homes.css:9`).
  - Commits c5313d6 and b25013f. b25013f is authored by Maggie and is titled "Jade activity dots and focus rings".
  - Each dot has a 3px halo at 18% (`homes.css:121`).
- **Object colour is off.** **DECIDED, 1 Nov.** The glyph's shape carries the object type, so jade never competes with a type colour (study :879). The grammar jig's per-type hues (`01-foundations/tokens.css`, `--h-*`) contradict this.
- **STALE values to ignore:**
  - design-model §5:333 says "Blue dot `#2f6fed` = new, also the focus tint".
  - `jig/src/reference.tsx` says "New blue 9 #0090ff".
  - The grammar jig 01 sets `--new` to blue and makes it the focus ring.
  - All three are superseded by c5313d6 and b25013f (1 Nov).
- **The app on this branch lost the port.** The WIP commit eca8695 reverted `app/web/src/ui/homes.css` to "Campsite-style neutrals, Inter" (gray `#171717`). Jade survives only as fallbacks in `app/web/src/ui/surface-patterns.css:9–12`. The jig is canonical; the app is not.

### Neutrals: Radix Sage

**DECIDED, 1 Nov.** Source: study :28–34 and :877; `homes.css:6`, :14–18.

| Role | Token | Value |
| --- | --- | --- |
| Ink (names, values) | `--ap-ink` | `#1a211e` (sage 12) |
| Secondary ink | `--ap-ink-2` | `#5f6563` (sage 11) |
| Tertiary ink | `--ap-ink-3` | `#868e8b` (sage 9) |
| Ground | `--ap-bg` | `color-mix(in oklab, #f7f9f8 55%, #eef1f0)`, between sage 2 and 3 |
| Surface | `--ap-surface` | `#fff` |
| Sunk | `--ap-sunk` | `#eef1f0` (sage 3) |
| Lines | `--ap-line`, `--ap-line-2` | 9% and 8% of sage 12 |

- Every line and shadow is tinted with sage 12, `--ap-shc: 26 33 30`.
- Hairlines stay between 8% and 12%, dashed outlines included (commit 4960def).
- **Conflict on ink-3:**
  - DI-010 (PROPOSED, 4 Nov, `_retired/di-010-peek/model-diff.md` §5) says ink-3 is never used for readable text, which must be at least 4.5:1.
  - The app had already added `--ap-ink-3-aa`, a mix between sage 11 and 9 (seen in the eca8695 diff).
  - Maggie hasn't ruled on it.
- **Earlier neutrals, superseded by Sage on 1 Nov:**
  - The pre-1 Nov neutral greys: ink `#171717`, `#525252`, `#8a8a8a`.
  - DI-010's `--pk-*` tokens, which are rgb greys (`_retired/di-010-peek/tokens.css`).
  - The grammar jig's "warm paper" dial (`--warmth`).

### Status colours

- **Challenge.** **DECIDED, 1 Nov.**
  - The dot is red 9, `#e5484d` (`--ap-red-dot`, `homes.css:10`), "brighter red challenge dots" (b25013f).
  - Text, the signpost and the wavy underline use red 11, `#ce2c31` (`--ap-neg`, `homes.css:20`).
  - The wash is red 3, `#feebec` (study :41).
  - Red means a challenge and nothing else. A red Discard was removed in the DI-004 detail pass, item 10 (design-issues :309).
  - Conflict: c5313d6 (18:10 UTC) made challenge dots jade, and b25013f (18:49 UTC, by Maggie) set them back to red 9. Red 9 wins.
- **Confidence rose:** grass 11, `#2a7e3b` (`--ap-pos`). The study's sparkline uses grass 9, `#46a758`. **DECIDED, 1 Nov.**
- **Confidence fell:** amber 11, `#ab6400` (`--ap-fell`). **DECIDED, 1 Nov.**
- **Prototype "building": conflict.**
  - **Maggie, 3 Nov** (DI-007, design-issues :467): "if green is our primary colour… opt for a green element instead". DI-006/007 offer options A, B and C for status colour. **No pick yet.**
  - The DI-002 and DI-003 proposals show "building" in jade (commit 99d82e6).
  - The jig still uses blue 9, `#0090ff` (`homes.css:128`, set by c5313d6 on 1 Nov).
  - "Built" is ink. "Idea" and "shelved" are grey; shelved is at 0.4 opacity.
  - DI-006 suggested the darker `#1f7a4d` for building, so it can't be mistaken for the new dot. **PROPOSED.**
- **Disabled:** 40% opacity, with no hover or press (study :883). **DECIDED, 1 Nov.**

---

## Type

- **Family: Geist, plus Geist Mono for keys and times.** **DECIDED, 1 Nov** (study :889; ab0c487 "Geist replaces Inter"; `homes.css:29`).
  - The grammar jig 01, DI-010 and design-model §5:356 still say Inter (STALE).
- **Sizes 11, 12, 13 and 20, at 13/1.4.** **DECIDED, 1 Nov** (study :20 and :889; design-model §5:356).

| Size | Use |
| --- | --- |
| 11 | Badges, keys |
| 12 | Labels, meta |
| 13 | Body |
| 20 | Pane titles, weight 600, -0.01em |

- Use tabular numbers on anything that counts.
- **Hierarchy comes from weight and colour, not size.** **DECIDED** (Maggie's UI rules; design-model :343 and :367).
  - Object names (claims, theme names) are weight 600.
  - Labels are 12/500 in ink-3 (`homes.css:38`).
- **15px modal title.** **DECIDED, 3 Nov** as part of DI-002 modal anatomy A: "includes the 15 px title, so 15 needs adding to the app's type scale" (design-issues :114).
- **Text inputs are 14/20, or 16/22 at ≤639px.** **DECIDED, 4 Nov.** These follow from Maggie's padding comment (design-issues :138–140).
- **Pressure to go bigger:**
  - **Maggie, 3 Nov** (DI-004 C): "Some things are too small; there are multiple type sizes in use" (design-issues :294).
  - The agent's fix used 14px for all text and 26 for the title (:301). **PROPOSED.**
  - DI-010 proposed only 12/16, 14/20 and 22/28, with long reading at 14/22 within 68ch and no 11 or 13 (`model-diff.md` §5). **PROPOSED, not applied.**
  - The design-check readable-type rule sets a 14px minimum. That is a kit rule the jigs were held to (checkpoint 5183d8b1/006); Maggie didn't state it.
  - **The scale (13 base vs 14 base) is open.** Present both in context.

---

## Spacing and radius

- **Spacing is a 4px grid.** **DECIDED, 1 Nov** (study :18 and :918).
  - Steps: `--sp-0` 2, `--sp-1` 4, `--sp-2` 6, `--sp-3` 8, `--sp-4` 12, `--sp-5` 16, `--sp-6` 20, `--sp-7` 24, `--sp-8` 32.
  - Rows are 30px, controls 28px, and cards are padded 12px (study :918; `homes.css:42` and :55).
- **Radii, concentric.** **DECIDED, 1 Nov** (study :51 and :919).
  - Steps: `--r-1` 4, `--r-2` 7, `--r-3` 10, `--r-4` 14, plus pill 999.
  - An inner radius is the outer radius minus the padding between them.
  - Floating chrome uses r-4. Its buttons use r-4 minus the 6px inset.
  - Current values: cards 8, Briefing cards 10, icon buttons 6, the column 14.
- **Text padding.** **DECIDED, 4 Nov.** Maggie: "usually I do 2px+ on hoz padding, e.g. 6px vert, 8px hoz" (design-issues :138). Horizontal padding is at least vertical plus 2px. Pane fields are 6/10 at 40px high.
- **Hit areas are at least 40×40px.** **DECIDED** (design-model rules :368; DI-004 detail item 13). Controls stay 28px visually and get an invisible hit extension (DI-010 `--pk-hit-out` -6px, PROPOSED).
- **Trailing marks.**
  - A trailing mark sits 10px after the last word, centred on the x-height (study :888; 75c3a93).
  - The new dot sits 8px from its count (d21dcb4).
  - Both **DECIDED, 1 Nov** (study).
- **DI-006, Maggie, 3 Nov:** markers are "too squished; there isn't enough space between them and surrounding elements". Positions are inconsistent. **Open.**
- **Spacing rhythm.** DI-004 used 15px from label to content, 23px between rows and 35px between nodes (design-issues :320). DI-010 used `--pk-space-*` 2 to 48. **PROPOSED.**

---

## Icons

- **Library: Phosphor, Regular weight.** **DECIDED, 31 Oct** (memory `aber-jig-setup`; design-model :349).
- **Fill weight only means active or selected.** **DECIDED, 31 Oct** (design-model :342; `IconButton` in `app/web/src/ui/atoms.tsx:94`).
- **Object glyphs.** **DECIDED.** Source: `app/web/src/ui/atoms.tsx:16–22` `OBJECT_ICONS`; nudge 0 for all.

| Object | Glyph |
| --- | --- |
| Dump | TrayArrowDown |
| Signal | Pulse |
| Theme | Binoculars |
| Theory | Target |
| Prototype | PencilRuler |
| Tripwire | Signpost |

  - The theme glyph changed: `icon-theme` was Compass (1 Nov 05:42), then `d-theme-icon` chose binoculars (1 Nov 05:54). Binoculars wins (`decisions.json:52` and :89).
  - Views use Rows, Columns, MapTrifold and ChartScatter.
- **Signal kind glyphs replace the type glyph in a signal's row, peek and pane headers.** **DECIDED by Maggie's direction, 4 Nov** (DI-010 round 2; checkpoint 572d17ca/007).
  - Link → Link; voice → Waveform; typed note → TextAlignLeft.
  - The header shows the kind glyph and the title, never the word "Signal".
- **Size: 16px.** **DECIDED as the default.**
  - `Icon` defaults to `size = 16` (`atoms.tsx:87`). The DI-004 detail pass raised 10px glyphs to 16 (item 3).
  - DI-010 proposed one size everywhere: 16 in a 24×20 slot (PROPOSED).
  - Exceptions in use: DumpIcon 14 and picker rows 14.
- **Multiline rows: align the icon to the first line.** **DECIDED, 4 Nov.** Maggie: "always align the icon with only the first line of text" (design-issues :142).
  - Use `align-items: flex-start` and nudge the icon by (line-height − icon size) / 2.
- **Glyph colour is neutral in every state.** Chips and selections don't colour their glyphs (fd31205, 2d34b29). **DECIDED, 1 Nov** (study).
- **Retire icon: open.** The options are Archive (recommended), SunHorizon, FlagCheckered and Trash (today's). Maggie: trash "doesn't seem right" (design-issues :147 and :156).
- **Pill add-context icon:** crosshair. **DECIDED, 31 Oct** (`decisions.json:36`).

---

## Buttons and actions

- **Primary button: jade.** **DECIDED, 1 Nov** (study `.btn` :134–137; accent row :878).
  - `background: #29a383`, white text, 28px high (26 small), radius 7, 12px weight 500, `0 1px 2px` shadow; hover is jade 10.
  - The ghost or secondary button is a white surface with a hairline.
- **Black primary: open.** Maggie, 4 Nov: "We could consider using black as the main button colour, but I'd need them presented side by side and shown in context." Until she picks, show jade and ink primaries side by side.
- **Other primaries in earlier jigs, none chosen by Maggie:**
  - DI-002's shadcn modal used an ink primary (`ab-btn-ink`).
  - DI-010 used an ink primary (`--pk-ink`, `peek.css:54`).
  - DI-008 used a "TEMP" jade fill (`d8` CSS :142).
- **Destructive (delete-dump confirm): solid ink.** Red is reserved for challenge. The study left it open: "Is that strong enough?" (:927). **PROPOSED.**
- **Order: Dismiss or Discard on the left, Accept on the right.** **DECIDED, 3 Nov** (DI-009, design-issues :500–507; design-model :371).
  - Accept, Save or Confirm is the primary, on the right.
  - The labelled secondary sits on its left.
  - **Labels:** "Dismiss" rejects a suggestion. "Discard" removes a draft. **DECIDED, 3 Nov** (:559).
  - This pair is the one exception to "at most one text button per surface".
  - It supersedes commit 75c3a93 (1 Nov, agent): "Discard and dismiss (X) top right; Accept bottom right". That commit's study rule at :887 is STALE.
- **X rule.** **DECIDED, 3 Nov** (DI-002, DI-009; design-model :370).
  - X only closes a fleeting surface: a modal, popover, toast or transient card.
  - X never discards, dismisses, rejects or unfiles.
  - A modal's X always sits top-right.
- **No keyboard shortcut for Dismiss or Discard.** **DECIDED, 3 Nov** (:551–557). A (Accept) and U (Undo merge) stay.
- **Retire.**
  - **DECIDED, 4 Nov:** a tethered menu of reasons, plus Undo, with no modal (DI-002 retire B, :113).
  - **Placement:** in the theme pane, retire sits top-right beside expand and close. Commit 13de08e by Maggie, 1 Nov.
- **No trailing ellipsis on action or menu labels.** **DECIDED, 3 Nov.** Maggie calls them "an enormous violation" (:130; design-model :375).
- **Chevrons.** **DECIDED, 3 Nov** (DI-003, DI-004; design-model :373–374).
  - Chevrons only expand or collapse; never use one to navigate.
  - The chevron is always visible on a collapsible item, points to the current state and stays in the same place.
- **Icon buttons.** **DECIDED** (design-model :364; DI-004 detail item 19).
  - Icon-first. At most one text button per surface.
  - Every icon button has a name and a tooltip showing its shortcut.
  - At rest an icon button is transparent in ink-2. The tile appears on hover, or while its menu is open.
- **Toasts.** **DECIDED, 4 Nov** (:150–154).
  - A toast is always one line, 44px high.
  - Only the quoted object name truncates.
  - Undo never truncates and keeps a 40px hit area.
- **Removal verb:** "Remove", with a descriptive aria-label. It retires "Unfile" and never uses an X. Removal is immediate, with Undo. **PROPOSED, 4 Nov** (DI-010 round 2, checkpoint 572d17ca/009).

---

## Selection, hover, focus and press

- **Selected or open: one neutral style.** **DECIDED, 1 Nov** (study :882; `homes.css:23`; commits 193bd0e, 2d34b29, eb01084).
  - A white surface, a 12% hairline and a small lift, with no colour and nothing darker:

    ```css
    --ap-sel: 0 0 0 0.5px rgb(26 33 30 / 12%), 0 1px 2px rgb(26 33 30 / 6%), 0 3px 8px -2px rgb(26 33 30 / 10%);
    ```

  - STALE: design-model :341 "1.5px ink ring = selected".
  - Dots and Timeline marks keep ink rings (ab0c487).
  - Timeline selection is black ink, with no violet (7abaa13, Maggie, 31 Oct).
- **Hover:** a sage state layer, 5% (`--ap-hover`, `homes.css:16`; the study says 4.5%). Nothing lifts on hover. **DECIDED, 1 Nov.**
- **Press:** keep the hover tint and shrink to `scale(0.98)`. Never darken. **DECIDED, 1 Nov** (`--ap-press`, 4b287f3). STALE: design-model :368 says 0.96.
- **Focus.** **DECIDED, 1 Nov** (study :884; b25013f).
  - A 2px jade ring (`#29a383`) with a 2px offset, on `:focus-visible`.
  - It is the only ring in the accent colour.
- **Signals in panes:** a 4% sage fill at rest and 7% on hover. Unfolded or open signals use `--ap-sel`. **DECIDED, 1 Nov** (3f98e96).
- **Drafts and suggestions.** **DECIDED, 1 Nov** (design-model :263 and :340; study :885).
  - Shown as a dashed outline at 12%, with a translucent white fill (45–50%) and no shadow.
  - Dashed means "not yet mine" and nothing else.
  - Accepting solidifies the draft in place.
- **Shadows mean height.** **DECIDED, 1 Nov** (`homes.css:22–26`; study :52–58).
  - Each tier has one token: `--ap-shadow-1` (card), `--ap-sel`, `--ap-shadow-float` (chrome), `--ap-shadow-sheet` (dump log), `--ap-shadow-pop` (menu, preview), plus modal and tooltip tokens.
  - These are Crisp layered shadows: a 0.5px ring plus soft drops.
  - Use shadows instead of borders.
- **Motion.** **DECIDED, 1 Nov** (study :61–62).
  - Durations: 90, 160 and 260ms.
  - Ease: `cubic-bezier(0.2, 0.8, 0.2, 1)`.
  - Spring: `cubic-bezier(0.16, 1, 0.3, 1)` over 380ms.
  - Never `transition: all`.
  - Surfaces leave the way they came.
  - Reduced motion swaps movement for a cross-fade.

---

## Progressive disclosure (DI-004, DI-005, DI-010)

- **Signal and dump structure.** **DECIDED, 4 Nov** (design-issues :334–341).
  - A Signal opens as a docked pane beside its row (B), and a Dump opens as a pane document (B).
  - This supersedes Maggie's earlier pick of C, the provenance trail (3 Nov). C's content order still informs the pane: source, dump passage, this signal, where it's filed, then theories.
- **Use popovers, not inline expansion or modals, for inline detail.** **DECIDED as a direction, 4 Nov.** Maggie: "inline is too verbose… I want to explore popovers for a lot of this inline stuff" (:194, :372). The specific popover (`provenance-popover`) is open.
- **The three-rung grammar.** **PROPOSED.**
  - Every object has a row, a peek and a pane:
    - Peek: tier 4, tethered, 360px wide, no scrim, one at a time.
    - A link inside a peek replaces it.
    - Expand sits top-right beside X and opens the pane.
  - Maggie asked for a progressive-disclosure grammar. The specific spec is the coordinator's and is not approved.
  - `model-diff.md` says "proposal, not applied". `docs/design-model.md` §3 still says signal and dump detail "unfolds in place" (STALE in direction).
- **Signal anatomy, from Maggie's round-2 review.** **DECIDED as rules, 4 Nov** (`model-diff.md` "Round 2"):
  - The header shows the kind glyph and the full title, with no type word and no clamp.
  - The note is the signal's own prose. It sits directly under the title, on the same left edge.
  - Sources, themes and theories are connected objects, set apart from the note and title.
  - Row, peek and pane read as versions of one thing.
  - The label table was "noisy".
- **The note reads as prose until clicked.** **DECIDED, 4 Nov** (Maggie; commit 6df4b81).
  - At rest it is transparent, with the "Add a note" placeholder in ink-2.
  - It grows to fit its content.
- **Connections, Maggie, 4 Nov:** "the layout is ugly". Actions (Add theory, File in theme, Unfile) shouldn't show all the time, and dates shouldn't show by default; reveal them on hover or click (checkpoint 572d17ca/009). **DECIDED as a direction; the treatment is open.**
- **Dump pane, Maggie, 4 Nov.** **DECIDED as a direction.** The rework wasn't committed.
  - Don't show each signal's theme.
  - Signal rows use their kind glyph.
  - The group is called "Signals", not "Made".
  - No label/value table. Use terse icon metadata under the title, with relative times and the exact time in a tooltip.
- **"Add theory" slot.** **DECIDED, 4 Nov** (:354–363).
  - Remove "Not evidence for a theory yet".
  - Use a quiet 40px "Add theory" slot (plus and label) where linked theories appear.
  - "File in theme" uses the same slot pattern.
- **Persistent field labels on expanded surfaces; nothing hover-only.** DECIDED, 31 Oct (commit 141b840; design-model :365). This is in tension with Maggie's 4 Nov "dates and actions on hover", and the DI-010 composition options A and C would drop labels.
- **Creation.** **DECIDED, 3 Nov** (DI-002, :110–112).
  - New prototype, theory and theme each open as their own page in the docked pane, empty and editable, with the name or claim focused.
  - "Creating an object should look like the final object."
- **Other DI-002 policy.** **DECIDED, 4 Nov** (:200–209).
  - Pickers are popovers from their own button.
  - Rephrase and Add link edit in place.
  - Merge applies immediately, with Undo.
  - Find is a centred palette.
  - Delete dump is the one modal, in shadcn anatomy.

---

## Layout and surfaces

- **Views.** **DECIDED, 1 Nov** (`decisions.json` `d-main-view`; design-model §3).
  - Theme sections is the main view; Columns, Atlas, Timeline and Briefing are the others.
  - A small view switcher sits bottom-left, floating.
- **Object pane.** **DECIDED, 31 Oct to 1 Nov** (design-model §3; `reference.tsx`).
  - Docked right; it pushes the view and shows a hairline seam with no shadow.
  - Snap stops: compact 480, half (half wins within 40px), wide and full. The minimum is 400.
  - Close and full-width sit top-right, 10px in.
- **Pill and column.** **DECIDED, 31 Oct** (`pill-open` B2; `reference.tsx`).
  - The dump-or-ask pill sits bottom-right, 40px high.
  - It grows into a docked column 360px wide plus 12px margins, radius 14.
  - Toasts appear just above the pill.
- **Theme pane contents: option D.** Theories as a sideways deck of tall cards; signals as a day-grouped feed. **DECIDED, 1 Nov** (`decisions.json:173`; eda49d4, by Maggie).
- **Sidebar (DI-003).** **DECIDED, 3 Nov** (:255–261).
  - Layout A: one scroll with Themes, then Prototypes, both top-aligned and sticky.
  - Each section collapses and has its own +.
  - Headers from C: type icon on the left, label 13px weight 600 in ink-2, count 11px in ink-3 on the right.
  - Prototype rows end in their status glyph, with no chevron.
- **Rail:** sunk sage 3. Index rows are 30px high with radius 6. The active row is a white surface with `--ap-shadow-1` (`homes.css:103–108`). **DECIDED, 1 Nov.**
- **Modal anatomy, shadcn (A).** **DECIDED, 3 Nov** (:114; values in DI-002 `index.html:119–123`).
  - A header with title and description; the X top-right, inset 16px.
  - A compact body.
  - A footer with Cancel and the primary, on the right.
  - Width 440, padding 20, gap 16, radius 12.
- **Briefing:** one column, max 600px. Actions show on the cursor item. **DECIDED, 31 Oct** (`reference.tsx`).
- **Signal inside a suggestion: option D.** A mini signal card with an icon well, the gist over its source, a stance tag, and a dashed outline because it's proposed. **DECIDED, 1 Nov** (fe89778: "The owner picked option D").
- **Copy rules.** **DECIDED.**
  - No dot separators.
  - No coloured left margins, borders or bars.
  - No instructional text.
  - Concept names are used exactly.

---

## Still open (Maggie hasn't chosen)

- **Colour:**
  - Jade or black primary button, shown side by side in context (4 Nov).
  - The prototype status colour, DI-007 options A, B or C, with green building.
  - Whether the Atlas Paper ground moves to sage (study :926).
  - Whether delete gets its own colour or stays solid ink (study :927).
- **Type scale:** 11/12/13/20 (decided 1 Nov) against her 3 Nov complaint and the proposed 12/14/22. Whether ink-3 can be used for text.
- **Markers (DI-006):** strategy, position rule and which meanings keep a mark.
- **DI-001:** the object-reference vocabulary. All four questions are unanswered.
- **DI-002:** the missing-name error (A, B or C) and the retire icon.
- **DI-004:** shared-grammar, action-placement and the provenance popover.
- **DI-008:** the draft theme header structure, its action placement and how provenance shows.
- **DI-009:** the label for agent-extracted signals awaiting review.
- **DI-010:**
  - The signal-peek composition: A core then list, B labelled groups, or C tray.
  - What clicking a row does: open the peek or the pane.
  - Whether a peek gets a quick verb.
  - What a peek becomes at 390px.
  - How the connection actions reveal.
  - DI-010 isn't logged in `docs/design-issues.md` yet.

---

## 4 Nov 2026 (Maggie), round 3 of the foundations jig

4 Nov 2026 (Maggie): per-type object colour is back (reverses 1 Nov). Neutrals should be warmer than Radix Sage; tone is a dial. The app's current layout and navigation are liked and stay; jigs restyle, they don't re-layout. The right pane aligns to the top of the main area.

4 Nov 2026 (Maggie): colour system D 'Linen, bright types' leads. Status uses two meanings only: green = up/accent (rose = accent / accent text), red = down/challenge/bad (fell = challenge). No separate amber for fell.

4 Nov 2026 (Maggie, 01-spacing): density is Regular (4px base; gaps 4/6/8/16/32; insets chip 8, control 10, row 8, card 12; region insets nav 12/8, list 12/16, pane 20/24; canvas 16, floating controls 12; rows 32, controls 28). Middle-column theories are separate cards with gaps. Padding grows with focus: navigation < list < pane.

4 Nov 2026 (Maggie, 02-type): type scale B 11/12/13/20, pane title 24, section headers ink 2. 11 is for counts and badges only; 12 for labels, meta, buttons, chips, tooltips and keys; 13 body; 24 the pane title alone. Nothing uses 20 after this. Supersedes the "Type scale" item under Still open.

4 Nov 2026 (Maggie): theories column stays at the app's width; never widens implicitly; width is a token (`--list-w`, 296, measured in jig /app at 1440). The pane takes the remaining width. Columns view: Themes 230, Theories `--list-w`.

4 Nov 2026 (Maggie, 03-icons): icons are 16 beside 13 body and 14 beside 12px text; object glyphs sit on their pale tile everywhere (lists, headers, chips, card meta). The one-icon-per-meaning vocabulary, tooltips (name + key in mono) and icon-button sizes (28, 24 dense, 40 hit) in RULES.md section 03 are the default on every stage. Rejecting a suggestion stays a labelled "Dismiss" text button left of Accept, never an icon (DI-009).

4 Nov 2026 (Maggie): navigation is type-first: rail of types → second sidebar of that type's items → the selected item fills the main area as its full view; no docked right pane. This replaces the default (Sections) view only: the default view is type-first and includes Briefing; Columns, Atlas and Timeline stay as they are, with their docked pane. Jig: `nav/`.

4 Nov 2026 (Maggie, 04-surfaces): cards A soft shadow (ring plus a 1px drop); peeks and menus B crisp (the 1 Nov pop token); floating controls (view switch, zoom, filter) A the smallest shadow. The tier table in RULES.md section 04 (fill, edge, shadow, radius 4 / 7 / 10 / 14, z-index 0–70 from tier tokens) is the default on every grammar page; controls move from radius 6 to 7.

4 Nov 2026 (Maggie): the type-first navigation approach is approved; the second-sidebar row/list designs in the nav jig are NOT approved and need rework in 06 Objects. The type rail should be a little narrower.

4 Nov 2026 (Maggie, nav): peeks are tethered cards; Briefing is the home of the default view's main area (shown when no item is selected), not a rail entry; rail order refined → raw (Themes, Theories, Prototypes, Signals, Dumps); Theories and Signals can be filtered by theme; no Unseen group in Signals; the view switcher sits at the rail foot.

4 Nov 2026 (Maggie, 05-controls): the secondary button is white with a hairline (surface, the chip's hairline, the button shadow); text fields are filled (a sunk well, no edge; surface + hairline and the ring on focus); the one destructive confirmation (Delete dump) is ink like every primary, red stays for challenge and down. The anatomy, seven-state matrix, motion and label rules in RULES.md section 05 are the default on every grammar page.

4 Nov 2026 (Maggie): signals always show the signal glyph (Pulse) on their tile, never a kind glyph; kind, if shown, is text in the key value. Supersedes the DI-010 "kind glyph in the header" rule. Within one peek or full view every tile is the same size (24).

4 Nov 2026 (Maggie): no jade 'new' dot on objects anywhere; it reads as ugly and its meaning is unclear. Unseen activity is shown another way (see 06 choice) or not on objects at all.

4 Nov 2026 (Maggie): no dashed-circle count badge for pending suggestions; its meaning was unclear and it looks ugly. Shown another way (see 06 choice); decided: not shown on previews at all; only in peek, full view and Briefing. Her principle: "If we can't find a beautiful way to show it, we should not show it."

4 Nov 2026 (Maggie, 06 before/after): theme list rows go back to the compact one-line design: the theme's glyph on its tile, the name in ink 2 (ink and 500 when current), the theory count as a bare number at the right. No "theories" word, no dot, no second line. Short-label rows (prototypes) follow the same form; two-line rows only where the name is a sentence (theories, signals, dumps).

4 Nov 2026 (Maggie): peeks show as many relations as fit, then fade out at the bottom (surface-colour gradient); no scrolling, no 'show more'; Open shows everything.

4 Nov 2026 (Maggie): no red challenge dot on previews or cards; tripwire text is ink with only the tripped glyph in red; challenged state shown another way (see 06 choice).

4 Nov 2026 (Maggie): Briefing is its own rail item, the first in the type rail, and the default selection on open; the app name 'Aber' is not a link. Revises the earlier 'Briefing is the home of the main area via Aber'.

4 Nov 2026 (Maggie): confidence on previews is a small meter track (06b option C), right of the name; the full view keeps the five-segment setter with its history.

4 Nov 2026 (Maggie, 06-objects): picks: tile alignment c (an 18 tile with a 12 glyph centred on the name's first line); a challenge is not shown on previews (peek, full view and Briefing only); unseen activity is unread weight (a row's name in ink at 600; cards and peeks unchanged since they are already 600); peeks show essentials and relations; full views are prose first. The 06 section of RULES.md is DECIDED, with its amendments to 01 (card inset 10/8, peek inset 16, tile-to-text gap 8 and 12, key-line gap 6), 02 (times in Geist tabular, mono for keys only), 03 (tile 18/12 in rows and peeks, 32/20 for the full-view title, chip tile 24/14, glyph on a tile one step smaller) and 05 (chip tile fills the chip's height).

## 07 Moving between levels — PROPOSED (4 Nov 2026, jig `07-rungs/`)

- Builds on: Navigation 3 and 06 (a peek opens on a 500ms hover or a click; Open moves the rail and list; Back returns); 04 rules 7 and 10 (one transient layer; tethered surfaces become bottom sheets on narrow screens); 05 rule 4 (90 and 160ms, peeks on the spring); 11 rule 3 (the pane on the 380ms spring, contents in over 160ms); 1 Nov motion (reduced motion swaps movement for a cross-fade); DI-010's "a link inside a peek replaces it".
- New and proposed: the 150ms swap of an open peek, the 300ms grace and its triangle, chips peeking below, the 380ms shared tile and title on Open and Back, the 260ms pane close, the keyboard map. Not approved.
- Open: the Open transition (shared tile and title, or cross-fade and slide); the peek's position (beside or below); where Back lands (the preview or the peek).

4 Nov 2026 (Maggie): the 20px type size is removed (scale 11/12/13, pane title 24); the old 01-foundations page is retired.

4 Nov 2026 (Maggie, 10): agent work in progress shows on the Dumps rail entry; a finished dump reports with a toast with Undo; offline shows beside the view switcher.

4 Nov 2026 (Maggie, 09): a new object left without a name but with content is kept as 'Untitled' with Undo; editing a draft's wording accepts it; evidence is added with a + on each stance (Supports, Undermines).

5 Nov 2026 (Maggie, 07): Open carries the tile and title to the full view's title (shared element); peeks sit beside their trigger, falling back to below; Back lands on the preview with focus.

5 Nov 2026 (Maggie): the Dump or ask chat is a floating window over whatever surface it opens on; when a white pane or full view is open, the chat sits on that white surface with no strip, seam, border or background change behind it.

5 Nov 2026 (Maggie): the type rail is condensed: Briefing in the same list as the types, rows closer together, and closer to the Aber/Find header.

5 Nov 2026 (Maggie): the type rail can collapse to an icon bar (search first, then the type icons); proposed: auto-collapse when the chat opens.

5 Nov 2026 (Maggie, 08-briefing): Briefing decided. New signals grouped by theme; a decided item leaves with an Undo toast; a signal is seen only when read (peeked, opened or marked seen); decision buttons use verbs (Keep confidence | Lower to 3, Dismiss | Add evidence, Dismiss | Use wording, Keep apart | Merge, Discard | Keep); sections open with a 16/600 ink header and a hairline above; a challenge shows the lost confidence step in the down red at 40%. Implies two proposed amendments: 02 Type gains a 16/600 section-header role; DI-009 / 05 Controls: decision buttons say what happens, reject verb left, accept verb right.

5 Nov 2026 (Maggie, 09): ⌘⇧L goes to Dumps in the rail; the pill's separate Dumps sheet is dropped.

5 Nov 2026 (Maggie, nav): the type rail collapses to an icon bar automatically when the chat opens and restores when it closes; ⌘\ toggles it by hand.

5 Nov 2026 (Maggie, 11): unrelated objects fade to 40% when something is open; Atlas territory area matches the theme's signal count; Atlas theory names show on hover, open and zoom.

5 Nov 2026 (Maggie, 10 and every full view): paused or waiting work shows the pause glyph, not a hollow ring; the failed-dump dot sits on its rail tile's top-right corner; every full view, docked panes included, puts its content on the title's left edge (the tile stays inside a pane).

5 Nov 2026 (Maggie, 10): errors in place are a callout box on a faint red wash with a red warning-circle, the message in ink and Retry on the right.

5 Nov 2026 (Maggie, 14): an inline trigger on a key line (the prototype status) gets 4 vertical padding, its hover layer growing without moving the line; focus rings show only for keyboard interaction, never on click or hover (`_shared/modality.js`; proposed amendment to 05). 14 Menus, pickers and popovers is proposed with three open choices: menu item height, tiles or bare glyphs in pickers, and how the current item is marked.
