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

## 01 Spacing — DECIDED (4 Nov 2026: Regular density; theories are separate cards with gaps)

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

   Inside a card or control, the inset is never smaller than the largest gap inside it.
5. **Padding grows with focus: navigation < list < pane.**

| Region | Regular (top / sides) | Compact | Comfortable |
| --- | --- | --- | --- |
| `--inset-nav` (rail) | 12 / 8 | 10 / 6 | 16 / 10 |
| `--inset-list` (main column) | 12 / 16 | 10 / 12 | 16 / 20 |
| `--inset-pane` (pane) | 20 / 24 | 16 / 20 | 24 / 32 |

   The rail and main column share a top line; the pane is its own surface and starts lower.
   - Canvases (Atlas, Timeline) sit at list level: `--inset-canvas` is 12 / 16 / 20 (compact / regular / comfortable).
   - Floating controls (zoom, filter, view switcher) sit `--inset-float` from the window edge in every view: 8 / 12 / 16.
   - Columns view: the Themes column is navigation (`--inset-nav`); the Theories column is a list (`--inset-list`).
   - Timeline cells pad by `--inset-row` and stack items with `--gap-item`.
   - **List column width, fixed; pane flexes.** `--list-w` is 296, the app's theories column (measured in jig `/app` at 1440: 296 including its insets, cards 240). It is the same in Sections and Columns; Columns' Themes column is fixed at 230 (`--colnav-w`). A wider window widens the pane, never the theories column. A jig changes the width only by setting `--list-w`. **DECIDED, 4 Nov.**
6. **Two click heights.** `--row` is 32, for list and rail rows. `--control` is 28, for buttons and inputs; `--control-sm` is 24, inside dense rows. Every target has a 40px hit area.
7. **Text inputs** centre their text in `--control`. Their horizontal padding is the vertical padding plus 4.
8. **Separate with space first.**
   - A gap separates objects.
   - A hairline separates only uniform rows inside one container.
   - A container is for an object you act on, or a group that needs its own surface level.

**Decided (Maggie, 4 Nov):**
- Density is **Regular**: the values above. Compact and Comfortable are not used.
- The middle column's theories are **separate cards with gaps** (`--gap-item` between them), not one container with dividers.

## 02 Type — DECIDED (4 Nov 2026: scale B 11/12/13/20, pane title 24, section headers ink 2)

Geist (Geist Mono for keys and exact times), body 13, colour system D inks. Jig: `02-type/`. Values live in `_shared/type.css`, which every grammar page loads.

Evidence: today's CSS uses 11 px font sizes (including 9, 10 and 14.5) plus 10 size tokens for the same values, 16 line heights, weight 700 three times, 32 text colours across five ink families, and ink 3 for text 228 times.

1. **Every piece of text has one role**, and each role has one size, weight, ink and line height. A new kind of text means a new role, never a one-off value.
2. **Four sizes; peers differ by weight and ink first.**

| Token | Size | Used for |
| --- | --- | --- |
| `--fs-small` (count) | 11 | Counts and badges only |
| `--fs-label` | 12 | Labels, meta, button and chip labels, tooltips, keys |
| `--fs-body` | 13 | Everything you read: names, values, nav, prose |
| `--fs-title` | 24 | The pane title, the only text at 24 |

   Nothing is smaller than 11. 20 stays in the scale for a future title role but nothing uses it today.
3. **Two inks for text.** Ink is for what you read and act on; ink 2 is for what names or describes it. Ink 3 is never text.
4. **Three weights.**
   - 600: the subject.
   - 500: things you press or that name a value.
   - 400: everything else.
5. **Line height.** 1.4 for interface text, 1.55 for prose, 1.2 for the pane title. Prose stops at 68 characters per line.
6. **Wrap or truncate by role.**
   - Names wrap: cards up to three lines, the pane title in full.
   - Nav items, chips and meta truncate to one line, with the full text in a tooltip.
   - Labels never wrap.
7. **Numbers are tabular wherever they count or compare.** Keys and exact times use Geist Mono at 12.
8. **No uppercase and no letter-spacing**, except −0.01em on the pane title.

| Role | Size / weight / ink / line height |
| --- | --- |
| Pane title | 24 / 600 / ink / 1.2, −0.01em |
| Card name | 13 / 600 / ink / 1.4 |
| Section header | 13 / 600 / ink 2 / 1.4 |
| List name (an object listed or referenced) | 13 / 400 / ink / 1.4 |
| Nav item | 13 / 400 / ink 2; when current: 500 / ink |
| Field value | 13 / 400 / ink |
| Prose (note, tripwire sentence) | 13 / 400 / ink / 1.55, max 68ch |
| Field or group label | 12 / 500 / ink 2, no wrap |
| Meta (source, time, counts beside a header) | 12 / 400 / ink 2, tabular |
| Count, badge | 11 / 500 / ink 2, tabular |
| Button or chip label | 12 / 500 |
| Tooltip | 12 / 500 / on ink |
| Key, exact time | 12 / 500 / Geist Mono / ink 2 |
| Empty state | 13 / 400 / ink 2 |

## 03 Icons — DECIDED (4 Nov 2026: 16 beside 13 body, 14 beside 12px text; object glyphs on their tile everywhere)

Already decided: Phosphor; Regular at rest, Fill only for the current or selected thing; the object glyphs (`atoms.tsx` OBJECT_ICONS plus Tripwire Signpost and Suggestion Sparkle); per-type glyph colour on a pale tile; icon to text 6; X only closes transient surfaces. Jig: `03-icons/`. Values live in `_shared/icons.css`, which every grammar page loads; every stage uses this vocabulary and these tooltips.

Evidence: 159 icons at six sizes (11, 12, 13, 14, 15, 16; 83 are 12, smaller than the text beside them); the Prototype glyph alone at 12, 13 and 14. Icon-only buttons in nine box sizes (16 to 44); icon-to-text gaps in nine values (2 to 12); 11 hand-set alignment nudges; ink 3 on 16 icon rules. X means close, remove, discard and dismiss; Trash means delete and retire; arrow up means supports, rose and send.

1. **Phosphor only, Regular at rest.** Fill marks the current or selected thing and nothing else. No Light, Bold or Duotone.
2. **Two icon sizes, tied to the type beside them.** 16 beside 13 body (`--icon`); 14 beside 12px text: chips, card meta, evidence headers, buttons (`--icon-label`). Nothing smaller than 14. No icon beside an 11 count or the 24 title.
3. **Every icon is a square of its size, in a fixed slot.** A plain icon's slot is its size. **Every object glyph sits on its pale tile, everywhere:** a 24 tile in rows, headers, the rail, the map and chips (flush in the chip's left corner); glyph + 4 (18) in card meta. Slots in a list share a left edge.
4. **Centre the slot on the first line of its text.** Geist's cap-height centre is within 0.3px of the line-box centre (measured), so the line box is the reference. Single-line rows centre; rows that wrap align top and drop the slot by (line − slot) ÷ 2: 1 for 16 beside 13/1.4, −3 for a 24 tile. No hand nudges.
5. **Icon to text is always 6** (`--gap-icon`). A chip pads 2 less on its glyph side.
6. **Icon-only buttons are 28 squares** (`--control`), 24 in dense rows (`--control-sm`), with a 40 hit area.
7. **Every icon-only button has a tooltip:** vocabulary name, then the key in Geist Mono; 12 / 500 on ink; below the button (above in bottom bars); after 500ms.
8. **Give it a text label** when the verb is destructive or rare (Retire, Delete), when it is the main decision on a surface, or when it isn't in the vocabulary.
   - **Rejecting a suggestion is a labelled "Dismiss" text button, left of "Accept", never an icon** (DI-009).
9. **Colour has four roles.** Ink 2 at rest; ink on hover and pressed; type colour only for object glyphs; accent only for the current view. Status is a dot, never a coloured icon. Ink 3 is never an icon.
10. **One icon per meaning.** The table is the whole vocabulary; a new meaning gets a new row.

| Meaning | Phosphor |
| --- | --- |
| Dump, Signal, Theme, Theory, Prototype, Tripwire, Suggestion | tray-arrow-down, pulse, binoculars, target, pencil-ruler, signpost, sparkle (type colour) |
| Voice, text, link dump | waveform, text-align-left, link |
| Find | magnifying-glass (⌘K) |
| Add, new, file in | plus |
| Unfile (link goes, thing stays) | minus |
| Close a transient surface | x (Esc) |
| Delete, discard (to the bin) | trash |
| Retire | archive |
| Accept, mark seen | check (A) |
| Rephrase | pencil-simple |
| Merge, split | arrows-merge, arrows-split |
| Send | paper-plane-right |
| Attach media | paperclip |
| Voice dump | microphone |
| Undo, history | arrow-counter-clockwise, clock-counter-clockwise |
| Earlier, later (stepper) | caret-left, caret-right |
| Show or hide children | caret-down (turned −90° when closed) |
| Go to, back | arrow-right, arrow-left |
| Zoom in, out, fit | magnifying-glass-plus, magnifying-glass-minus, corners-in |
| Filter | funnel |
| Pane full width, docked | arrows-out-simple, arrows-in-simple |
| Collapse sidebar | sidebar-simple |
| Play, pause, stop | play, pause, stop |
| Pin, chain, help | push-pin, tree-structure, question |
| Supports, undermines | arrow-up, arrow-down |
| Confidence rose, fell | trend-up, trend-down |
| Rival | arrows-left-right |
| Views: sections, columns, atlas, timeline, briefing | rows, columns, map-trifold, chart-scatter, newspaper (accent and Fill when current) |

**Decided (Maggie, 4 Nov):** icon size B (16 and 14); tiles B (everywhere).

## 04 Surfaces and layers — PROPOSED (choose on `04-surfaces/`)

Already decided: colour system D surfaces; Crisp shadows (a 0.5px ring plus soft drops); radii 4 / 7 / 10 / 14 and pill, concentric; selected is the neutral raise `--sel`; hover a 5% layer; press 0.98; drafts dashed; the pane docks with a seam and no shadow; X only closes transient surfaces. Values live in `_shared/surfaces.css`.

Evidence: 176 distinct backgrounds; 158 distinct box shadows, with only 127 of 412 using a token; two names for selection; one shadow (`--ap-shadow-float`) on five heights (view switch, dump pill, Atlas popover, confidence tooltip, overlay sidebar); 30 radii, with 8, 6, 5, 2 and 9 most used and off the scale; 18 raw z-index values (0–80), none from tokens; edges drawn 17 ways.

1. **Every surface has one tier**, and the tier sets its shadow, z-index and radius. A new surface type is a decision, not a default.
2. **One meaning per mark.**
   - Fill says which plane you're on: ground, sunk or surface.
   - A hairline is an edge between peers on one plane: a docked seam, rows in one container, a flush box or a chip.
   - A shadow means "above" and nothing else.
   - Dashed means "not yet mine".
3. **Shadow grows with tier; same tier, same shadow.** No shadow on the base or on docked chrome. Shadows come only from the tier tokens `--sh-raised`, `--sh-float`, `--sh-pop`, `--sh-modal`, `--sh-toast`, `--sh-tip` (plus `--sel`).
4. **Radius grows with what a surface holds.**
   - 4: marks and tiles.
   - 7: controls and objects (buttons, chips, rows, cards, tooltip). Controls move from 6 to 7.
   - 10: boxes that hold rounded things (evidence, peek, menu, toast).
   - 14: floating bars and modals.
   - Inside another rounded surface: outer minus the inset.
5. **Separate with space first** (spacing rule 8): a gap between objects, a hairline only between uniform rows in one container, a seam between docked regions.
6. **z-index only from tier tokens:** 0, 10, 20 … 70 for tiers 0–7.
7. **One transient layer at a time.** Opening a peek, menu, modal or toast closes any other; only a tooltip may sit over one.
8. **Inked surfaces are momentary messages.** The tooltip and toast are the only ink-filled surfaces besides the primary button: ink fill, on-ink text, no ring.
9. **Only liftable things lift.** Selected raises within its tier; nothing lifts on hover.
10. **Narrow screens:** the rail and pane become tier-3 sheets from their own edge; tethered surfaces become bottom sheets.

| Tier | Aber surfaces | Attachment | Origin | Persistence | Fill | Edge | Shadow | Radius | z |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 Base | Main column, Atlas and Timeline canvases | Is the world | — | Permanent | Ground | None | None | — | 0 |
| 1 Docked | Rail, object pane, Columns strips | Docked, pushes | Its edge | Session | Rail sunk, pane surface | Seam | None | 0 | 10 |
| 1 Floating | View switch, zoom, filter | Pinned to the window edge, over the canvas | Its edge | Session | Surface | Ring | Float | 14 | 10 |
| 2 Raised | Cards, current nav row, selected map label and timeline item | Rests on the base, lifts when picked up | In place | Session | Surface | Ring | Raised; selected `--sel` | 7 | 20 |
| 3 Sheet | Dump log; rail and pane on narrow screens | Covers, casts shadow | Its edge | Task | Surface | Ring | Sheet | 14 | 30 |
| 4 Tethered | Signal peek, menus, hover cards | Anchored to its trigger | Grows from the trigger | Moment | Surface | Ring | Pop | 10 | 40 |
| 5 Modal | Retire confirmation, focused editor | Over a paused, dimmed world | Centre | Task, blocking | Surface | Ring | Modal | 14 | 50 |
| 6 Toast | Undo after retire or delete | Above all, never takes focus | Bottom edge, above the pill | Seconds | Ink | None | Toast | 10 | 60 |
| 7 Tooltip | Icon names and keys | Tethered | Its trigger | While hovered | Ink | None | Tip | 7 | 70 |

**Open:**
- Cards: soft shadow (today, proposed), hairline only, or fill only.
- Peeks and menus: quiet, crisp (the 1 Nov pop token, proposed) or deep shadow.
- Floating controls (view switch, zoom, filter): the smallest shadow (proposed) or flat with a hairline.

## Still to come

05 controls, 06 objects, 07 rungs.
