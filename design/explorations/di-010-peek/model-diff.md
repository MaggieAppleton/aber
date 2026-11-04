# DI-010: proposed edits to the design model (§3, §4, §5)

Status: **proposal, not applied.** Maggie hasn't approved these edits, and `docs/design-model.md` is unchanged. The live demo is the jig in this folder (`index.html`). Lines marked **open** depend on a choice that's still shown on its own option in the jig.

Why the model and not just the jigs: every jig inherited inline expansion and small grey text from three places. §3 makes signal and dump detail tier 0, in place. §4 says rows, filed tokens and tripped counts unfold or toggle. §5 sets a type scale of 11/12/13/20, with ink-3 for tertiary text.

## §3 Spatial model, Surfaces table

```diff
- | Signal or dump detail | 0 | In place | Unfolds from its row | Until folded | Same |
+ | Peek (any object's middle rung) | 4 | Tethered; 360px; no scrim, never blocks, never centred | Grows from its row, card or token (scale 0.96 → 1, 180 ms) | Moment: Esc, X, outside click, or its row scrolling away | Bottom sheet without a scrim (open: or a tethered card) |
- | Source preview, filed gists, confidence log, attachment stack | 4 | Tethered | Its trigger | Moment | Bottom sheet |
+ | Confidence log, attachment stack | 4 | Tethered | Its trigger | Moment | Bottom sheet |
- | Object pane (theme, theory, prototype) | 1, docked | …
+ | Object pane (every object: signal, dump, theme, theory, prototype) | 1, docked | …   (rest of the row unchanged)
```

Add under the table:

> **Three rungs.** Every object has a row (what you scan), a peek (the essentials, tethered) and the pane (the whole object, where editing and every action live). A peek is reading, not working: nothing in it edits the object, except Dismiss and Accept on a pending suggestion (**open:** or one quick verb, File in theme). One transient layer at a time: a link inside a peek replaces it, with Back in its header, and never stacks a second peek. The peek's expand icon, top right beside X, opens the pane.
>
> **Peek contents.** Signal: gist; each source with its date; note, at most 2 lines; themes; theories with Supports or Undermines; "From voice note, Today 07:40". Dump: status (a failure stays visible), the first 3 lines, what it made as rows. Theme: what it holds, up to 3 theories with confidence, the 3 newest signals. Theory: claim, confidence, Happens by, tripwire, top 2 supporting and top 2 undermining signals, pending suggestions. Prototype: status, theories it tests, first screenshot, links.
>
> **Not peeks:** creation (an empty object in the pane), pickers and menus (anchored, from the pane), Merge (immediate, Undo), Delete dump (tier 5), Find (palette), toasts.

Superseded table, add:

```diff
+ | Signal and dump detail unfolding in its row (DI-004 A and C, DI-002 "unfold in place") | Peek, then the docked pane (DI-010) |
+ | DI-004 §7 popover with a full-width "Open in the pane" row | The dump peek, with an expand icon |
```

## §4 Behaviour

```diff
- | Signal row | Gist, source, new mark | — | Unfolds in place: note, theories it bears on, themes, origin dump | — | Tap |
+ | Signal row | Gist, source domain, new dot | Hover tint | Opens its peek; the row keeps an ink ring while it's open (open: or opens the pane, with an eye on the row for the peek) | — | Tap |
+ | Dump row | Kind icon, time, first line, "made 3" | Hover tint | Opens its peek | — | Tap |
- | Theory card | Claim, confidence, evidence balance, marks | Its instances in other themes highlight with an ink ring | Opens the theory in the pane | — | Tap opens |
+ | Theory card | Claim, confidence, evidence balance, marks | Its instances in other themes highlight with an ink ring | Opens its peek (open: or the pane, as for signal rows) | — | Tap |
+ | Peek | Kind glyph and label, expand, X | — | Expand opens the pane and moves focus to its title; X or Esc closes and returns focus to the row; a link replaces the peek | — | Tap; swipe the sheet down to close |
- | Filed token (in a reply) | Theme icon, theme name, count badge | — | Unfolds the gists filed there | — | Tap |
+ | Filed token (in a reply) | Check, "filed 3" | — | Opens a peek listing the filed signals and their themes; each opens its own peek in place | — | Tap |
- | Tripwire, tripped | Signpost red, phrase underlined wavy red, dashed count | — | Count toggles the matched signals; each has Accept (lowers confidence one step) and dismiss | — | Tap |
+ | Tripwire, tripped | Signpost red, phrase underlined wavy red, red count | — | Count opens a peek of the matched signals, each with Dismiss and Accept (lowers confidence one step); deciding the last one clears the count | — | Tap |
```

Unchanged on purpose: Theme heading (opens the theme in the pane, because the section already shows what a peek would), Draft or suggestion, Timeline dot (dwell already acts as its preview; press selects).

## §5 Surface, Type, colour and space

```diff
- - **Type:** Inter, 13 px base, antialiased, tabular numbers on anything that counts. Sizes: 11 (badges, keys), 12 (labels, meta), 13 (body), 20 (pane titles). Distinguish with weight and colour first.
- - **Ink:** `--ap-ink`, `--ap-ink-2`, `--ap-ink-3` for primary, secondary and tertiary text. Lines at 9% and 5% black.
+ - **Type:** Inter, 14/20 base, antialiased, tabular numbers on anything that counts. Three sizes: 14 (body, values and field labels alike), 22/28 w600 (the one pane title), 12/16 (counts and badges only). Long reading (transcripts, passages, bodies) is 14/22 within 68ch. A peek's name is 14 w600. No 11 or 13.
+ - **Ink:** `--ap-ink` for values and names; `--ap-ink-2` for field labels, meta and secondary text. `--ap-ink-3` is never used for readable text, only for hairlines and disabled glyphs. Every text colour is at least 4.5:1 on its surface.
+ - **Icons:** Phosphor 16 px in a 24 × 20 slot, centred on the first line of the text it marks (within 0.5 px). One size everywhere.
+ - **Fields:** a fixed label column (104 px in the pane, 84 px in a peek), labels in ink-2 at body size. The same persistent field labels throughout; no grey section headings ("What the source says") and no explanatory notes.
```

Rules table, add:

```diff
+ | No inline expansion of an object inside a list. A row opens its peek; the peek opens the pane | DI-010 |
```

## Measured before and after

From `measure.mjs` and `align.mjs` (Playwright, 1440 wide) on DI-004's Signal and Dump panes (B) and on this jig's panes.

| Property | Before (DI-004 B) | After (DI-010) |
| --- | --- | --- |
| Text sizes | 11, 12, 13, 14, 15, 22, 26 | 12, 14, 22 |
| Field labels | 14px #8a8a8a, 3.45:1 | 14px ink-2 #525252, 7.81:1 |
| Lowest text contrast | 3.45:1 | 5.65:1 (red failure text) |
| Icon sizes | 10, 12, 13, 16 | 16 |
| Icon centre vs first line | −1.5 to +4 px | +0.5 px |
| Grey section headings and notes | "What the source says", "Made", "Transcript", "Illustrative." | none |
