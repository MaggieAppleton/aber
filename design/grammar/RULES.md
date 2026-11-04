# Aber interface grammar: rules

This file holds the grammar spec, built one foundation at a time. Each foundation has a jig in `design/grammar/` where its rules were chosen. Token values live in `design/grammar/_shared/tokens.css` (colour, type, radius, elevation) and `_shared/spacing.css` (spacing).

Status tags:
- **DECIDED**: Maggie chose it.
- **PROPOSED**: waiting for her pick on the named jig.

Decision history and sources are in [PRIOR-DECISIONS.md](PRIOR-DECISIONS.md).

The app's layout and navigation stay as they are: a rail of themes on the left, theme sections of contained cards in the main column, and a docked object pane on the right that aligns to the top of the main area. Jigs restyle; they don't re-layout. **DECIDED, 4 Nov.**

## 00 Colour — DECIDED (system D, "Linen, bright types", 4 Nov)

All values are OKLCH. Jig: `00-colour/`.

- **Neutrals almost disappear.** Colour comes from type glyphs, the accent and status, never from surfaces.
  - The neutral is hue 85, chroma 0.004: linen, just warm of grey.
  - Lightness steps:

| Role | Lightness |
| --- | --- |
| Ground | 0.975 |
| Sunk (rail, wells) | 0.955 |
| Surface | 0.998 |

  - Sunk sits only 0.015–0.025 below ground.
  - Hairlines are 8% and 11% of the ink tint. Shadows are soft and mean height only.
- **Ink.** Ink is 0.17, near black. Ink 2 is 0.47 and every text pair reaches at least 4.5:1. Ink 3 is 0.74 and is for lines and marks only, never text.
- **Primary is black ink.** Teal (accent 0.60 0.10 182) marks new dots, the focus ring and the current view. Accent text is 0.50 0.09 182.
- **Per-type colour is on.** Each object has one hue, shared as a pale tile tint and a bright glyph.
  - Tiles are L0.958 C0.048; glyphs are L0.56 C0.16.
  - Hues:

| Object | Hue |
| --- | --- |
| Dump | 288 |
| Signal | 245 |
| Theme | 340 |
| Theory | 70 |
| Prototype | 122 |
| Tripwire | 25 |

  - Suggestion is neutral and dashed.
  - No type hue sits near the teal accent (150–195).
  - A type-colour strength dial runs from 0 (neutral glyphs) to 1 (full).
- **Status has two meanings only.**
  - Green means up and good. It is the accent: rose uses accent text for text and accent for marks.
  - Red means down, a challenge or bad. Fell uses the same red as challenge.
    - Text is 0.56 0.20 26.
    - Dots and marks are 0.59 0.20 26.
  - There is no amber.
- **Dashed means not yet mine:** drafts and suggestions.
- **Contrast.** Every text pair is at least 4.5:1; glyphs on their tiles are at least 3:1.

## 01 Spacing — PROPOSED (choose on `01-spacing/`)

Evidence: today's CSS uses 36 distinct paddings, 18 gaps, 18 margins and 19 row or control heights, with odd one-offs (3, 5, 7, 9, 15, 35px).

1. **One base unit: 4px.** Every padding, gap and height is a step on the scale 2 4 6 8 10 12 16 20 24 32 40. 2 is for optical nudges only.
2. **Gaps climb a ladder.** Each level is at least 1.5× the one inside it (2× at Regular):

| Token | Regular | Separates |
| --- | --- | --- |
| `--gap-tight` | 4 | Parts of one unit |
| `--gap-item` | 8 | Siblings in a group |
| `--gap-group` | 16 | Groups in a region |
| `--gap-section` | 32 | Sections |

3. **Icon to text** uses `--gap-icon`, 6.
4. **Insets grow with the container.**

| Token | Regular |
| --- | --- |
| `--inset-chip` | 8 |
| `--inset-control` | 10 |
| `--inset-row` | 8 |
| `--inset-card` | 12 |
| `--inset-rail` | 8 |
| `--inset-region` | 24 (main column, pane) |

   A container's inset is never smaller than the largest gap inside it.
5. **Two click heights.** `--row` is 32, for list and rail rows. `--control` is 28, for buttons and inputs; `--control-sm` is 24, inside dense rows. Every target has a 40px hit area.
6. **Text inputs** centre their text in `--control`. Their horizontal padding is the vertical padding plus 4.
7. **Separate with space first.**
   - A gap separates objects.
   - A hairline separates only uniform rows inside one container.
   - A container is for an object you act on, or a group that needs its own surface level.

**Open:**
- Density:

| | Rows | Cards | Sections |
| --- | --- | --- | --- |
| Compact | 28 | 10 | 24 |
| Regular | 32 | 12 | 32 |
| Comfortable | 36 | 16 | 40 |

- Middle-column theories: separate cards, or one container with dividers.

## Still to come

02 type, 03 icons, 04 surfaces and layers, 05 controls, 06 objects, 07 rungs.
