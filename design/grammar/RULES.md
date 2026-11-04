# Aber interface grammar: rules

This file holds the grammar spec, built one foundation at a time. Each foundation has a jig in `design/grammar/` where its rules were chosen. Token values live in `design/grammar/_shared/tokens.css` (colour, type, radius, elevation) and `_shared/spacing.css` (spacing).

Status tags:
- **DECIDED**: Maggie chose it.
- **PROPOSED**: waiting for her pick on the named jig.

Decision history and sources are in [PRIOR-DECISIONS.md](PRIOR-DECISIONS.md).

The app keeps four views. The default view is type-first (a rail of types, a list of that type's items, the selected item filling the main area, with Briefing as its home); see Navigation. Columns, Atlas and Timeline keep today's layout and their docked pane, aligned to the top of the main area. Jigs restyle those three; they don't re-layout them. **DECIDED, 4 Nov.**

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

## 04 Surfaces and layers — DECIDED (4 Nov 2026: cards soft shadow, peeks and menus crisp, floating controls smallest shadow)

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

**Decided (Maggie, 4 Nov):**
- Cards: **A soft shadow** (`--sh-raised` = the Crisp ring plus a 1px drop).
- Peeks and menus: **B crisp** (`--sh-pop`, the 1 Nov pop token: ring plus 6px and 36px drops).
- Floating controls (view switch, zoom, filter): **A the smallest shadow** (`--sh-float`, the card's).

`_shared/surfaces.css` is loaded by every grammar page as the default. Controls' radius is 7 everywhere (`--r-icon` now equals `--r`).

## 05 Controls — DECIDED (4 Nov 2026: secondary white with a hairline; fields filled; delete confirmation ink)

Every control, built only from 00–04. Values live in `_shared/controls.css`, which every grammar page 00–05 loads as the default. Jig: `05-controls/`, with a states board of every control in every state.

Evidence: about 14 text-button recipes at seven heights (24 to 40) and 16 control radii; the main button `.ap-btn` has no hover (homes.css:56); three different Dismiss controls beside one Accept; three "selected" styles for segmented controls; three confidence setters; four tooltip recipes plus 144 `title=`; about 12 focus treatments, including none on search and the composer; press scales 0.98, 0.96, 0.94, 0.92; nine durations, 35 of 77 controls with no transition; no loading style anywhere. No toggles, checkboxes or tabs exist.

1. **One anatomy per control** (table below), built only from these heights, insets, radii, label roles and icon slots.
2. **Two heights.** 28 (`--control`) everywhere; 24 (`--control-sm`) only inside a dense row (evidence row, field row, list group label). Chips 24, menu items 32 (`--row`), the composer 40. Every target has a 40 hit area.
3. **Seven states, one treatment each, everywhere:**

| State | Trigger | Treatment | Motion |
| --- | --- | --- | --- |
| Rest | – | As the anatomy; icon-only and quiet are transparent in ink 2 | – |
| Hover | `:hover` | A 5% layer and ink text; primary lightens to ink hover; fields deepen their well or edge; nothing lifts | 90ms ease-out |
| Focus | `:focus-visible`; a field whenever it has the caret | 2px jade ring, 2 out; inside (−2) in menus, segmented controls and list rows | Instant |
| Pressed | `:active` | Keep the hover, scale 0.98, never darken | 90ms; none under reduced motion |
| Selected, open | `aria-pressed`, `-selected`, `-expanded`, `-current` | Icon-only, quiet, chips: the hover fill stays, ink, Fill glyph. Segment, filter chip: raised surface, ink. Current view: accent wash and accent text (the only accent control) | 160ms ease-out |
| Disabled | `aria-disabled="true"` | 40% of itself; no hover or press; stays focusable; tooltip says why | – |
| Loading | `aria-busy="true"` | Same width; label hidden; a 14 `circle-notch` spins in its place (new vocabulary row: Working) | 700ms a turn; a slow pulse under reduced motion |

4. **Motion:** hover and press 90ms (`--t-hover`, `--t-press`); selection, segments and tethered surfaces 160ms (`--t-float`); ease `cubic-bezier(0.2, 0.8, 0.2, 1)`, menus and peeks on the spring. The ring never animates. Never `transition: all`.
5. **One primary per surface** (pane, peek, modal, composer, row). Secondary for the alternative on that surface (Open, Cancel, Dismiss, Discard). Quiet for navigation (Back) and toolbars. Icon-only for frequent verbs in the icon vocabulary.
6. **Dismiss left of Accept** (Discard for drafts): the one place two text buttons sit together.
7. **Reversible: act, then Undo.** Remove, retire (a menu of reasons), discard, merge and move to the bin happen at once with an Undo toast just above the composer. Only the irreversible asks first: deleting a dump is the one confirmation, a modal whose button names verb and object ("Delete dump").
8. **Labels:** verb first, sentence case, one or two words, no trailing ellipsis, concept names exact. Icon-only names are vocabulary names; the tooltip adds the key in mono. Removal says what it removes in its accessible name ("Remove Agent memory from this theory").
9. **Prefer explaining to disabling.** `aria-disabled`, focusable, with a tooltip saying why. Send is the exception: it waits for text.
10. **No toggles, checkboxes or tab bars.** On/off is an icon button with `aria-pressed` (Fill when on); a choice of two to four is a segmented control.
11. **Fields:** 13/400 text (16 at ≤639px so iOS doesn't zoom), placeholder ink 2, search clears with Esc and has no X. Textareas start their first line where a one-line field's text sits, use prose leading and grow to 8 lines.

| Control | Height | Inset | Radius | Label | Icon, slot | Gap | Fill at rest |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Primary button | 28 (24 dense) | 10; 8 on an icon's side | 7 | 12 / 500 on ink | 14 | 6 | Ink, button shadow |
| Secondary button | 28 (24 dense) | 10; 8 | 7 | 12 / 500 ink | 14 | 6 | Surface + hairline, button shadow |
| Quiet button | 28 | 10; 8 | 7 | 12 / 500 ink 2 | 14 | 6 | None |
| Icon-only | 28 square (24 dense) | Centred | 7 | Tooltip | 16 | 2 between | None |
| Destructive confirm | 28 | 10 | 7 | 12 / 500, verb + object | – | – | Ink, like every primary |
| Text field, search | 28 | 10; 8 on an icon's side | 7 | 13 / 400, placeholder ink 2 | 14 ink 2 | 6 | Filled: sunk well; surface + hairline on focus |
| Textarea | 3 lines, grows to 8 | 4 / 10 | 7 | 13 / 400 / 1.55 | – | – | Filled |
| Composer | 40, grows to 6 lines | 6 | 14 (buttons 8) | 13 / 400 | Mic, send 28 | 2 | Surface, float shadow |
| Linked chip | 24 | 0 / 8 | 7 | 12 / 500 ink 2 | 24 tile, flush | 6 | Surface, hairline |
| Removable chip | 24 | 0 / 2 | 7 (remove 5) | 12 / 500 ink 2 | Tile; minus 14 in 20 | 6 | Surface, hairline |
| Filter chip | 24 | 6 / 8 | 7 | 12 / 500 ink 2 | Funnel 14 | 6 | None |
| Tag, badge (not controls) | 24 line; badge 18 | –; 5 | –; pill | 12 / 500 ink 2; 11 / 500 | 14 or a 7 dot | 6 | None; dashed if pending |
| Segmented (in a surface) | 28 track, 24 segments | 2; 10 | 10 / 8 | 12 / 500 | Optional 14 | 2 | 6% track |
| View switcher | 32 bar, 28 segments | 2 | 14 / 12 | Tooltip | 16 | 2 | Surface, float shadow |
| Menu item | 32 | 8; 4 before a tile | 6 (10 − 4) | 13 / 400 ink; key 12 mono ink 2 | 16 or 24 tile | 6 | None |
| Peek and pane header | 28 | Glyph on the content edge (−6) | 7 | Tooltip | 16 | 2 | None |
| Stepper (Happens by) | 24 carets | – | 7 | 13 / 500 ink, 4ch, tabular | Carets 16 | 2 | None; one spinbutton, arrows ±1, Page ±5 |
| Confidence | 28 hit; bars 5 | – | 3 | – | Bars 18 × 5 | 2 | Hairline; set bars ink; a slider 0–5 |
| Tooltip | 26 | 4 / 8 | 7 | 12 / 500 on ink; key mono | – | 8 | Ink; after 500ms, then instant for 300ms |

**Decided (Maggie, 4 Nov):**
- Secondary button: **A white with a hairline**, the surface with the chip's hairline and the button shadow.
- Text fields: **A filled**, a sunk well with no edge; on focus a surface with a hairline and the ring.
- The one destructive confirmation (Delete dump): **A ink**, like every primary. Red stays for challenge and down.

## 06 Objects — PROPOSED (preview, peek, full)

Every object follows one anatomy and appears at three rungs: a **preview** where it's mentioned (list row, card, chip), a **peek** (tier-4 tethered card, 340 wide, grows from the preview after 500ms or on click), and a **full** view that fills the main area. Row, card, peek and full are built from one set of components. Jig: `06-objects/`. Open choices there: list rows two lines or one; peek with relations or essentials only; full view prose-first or a fields table.

1. **One anatomy, slots in a fixed order at every rung.**

| Slot | What | Row | Card | Chip | Peek | Full |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Tile | Type glyph on its 24 tile, the same size for every row, line and header within one peek or full view; a signal is always Pulse (kind, if shown, is text in the key value). No type word. | ● | ● | ● (flush) | ● | ● |
| 2 Name | List name 13/400; card and peek 13/600; title 24/600 | 2 lines | 3 lines | 1 line | In full | In full |
| 3 Key value | The one attribute that tells it from its neighbours; "Draft" for drafts | ● | ● | – | ● | ● (editable) |
| 4 Status | One quiet red mark directly after the key value, only when something needs you: a challenge, or a dump that couldn't be read. Pending suggestions and "new" are not marks (decided 4 Nov) | ● | ● | – | ● | ● |
| 5 On demand | The date, at the right end of the key line on hover; the rest of the key line in peek and full | Hover | Hover | – | ● | ● |
| 6 Attached | Tripwire, suggestions: a mark on the host's preview, one line in its peek, a block with Dismiss \| Accept in full | Mark | Mark | – | Line | Block |
| 7 Relations | The most important relation, as preview rows; all relations in full | – | – | – | Up to 3 | All |

2. **The tile hangs; everything else shares the name's left edge.** Rows, cards, peeks and full views all use a 24 column, a 6 gap, then one content edge. Relation rows inside a peek or full view bleed their hover layer into the padding (−8) so their tiles sit on that content edge. A peek opens with its tile on its trigger's tile.
3. **The card is the row, raised.** Same grid and slots; surface, `--sh-raised`, 12 inset, name at card weight. Hover is the surface hover fill; selected is `--sel`; draft is dashed with draft fill.
4. **A row never repeats what its group says.** Prototypes grouped by status drop the status; signals and dumps grouped by day show the day only on hover; drafts in a Drafts group drop "Draft". One-line rows in narrow columns use the key value's short form (a bare count, the time, the status glyph).
5. **Hover reveals dates and actions** (DI-010): the date on any preview; Remove (minus, 24) on relation rows in a full view. Nothing else changes on hover except the 5% layer.
6. **Full view, top to bottom:** Back (quiet) left and the object's verbs right (drafts: Discard | Accept); tile and title; the key line (key value, status, then on-demand attributes, editable in place); prose (note, body, text); attached objects; relation sections (13/600 ink 2 header and count, preview rows at most 560 wide, themes as chips, decided "Add theory" and "File in theme" slots).

| Type | Key value | Preview | On hover | Peek adds | Full adds |
| --- | --- | --- | --- | --- | --- |
| Theme | Theory count (bare number) | One line: tile, name in ink 2, count at the right | – | Signal count, new count, top 3 theories | Theories as cards, signals by day |
| Theory | Confidence | Tile, claim, confidence, one status mark | By year | Evidence balance, horizon, note (3 lines), tripwire or suggestion line, top 3 supports | Confidence setter, year stepper, note, tripwire, suggestions, themes, supports, undermines, rival, follows from, leads to, prototypes |
| Prototype | Status (glyph; the word in peek and full) | One line: tile, name in ink 2, status glyph at the right | – | Body (3 lines), theories it tests | Body, tests |
| Signal | Source | Tile (Pulse), gist, source | Captured day | Day, note, theories it bears on | Note, supports, undermines, themes, came from |
| Dump | Kind and time | Tile, first line, kind and time, failed | Day | Day, length, text (3 lines), signals made | Via, text, reply, signals, drafts |
| Tripwire | Its sentence | Red dot on the host when tripped | – | One line (red when tripped) | Sentence, tripping signal, Dismiss \| Accept |
| Suggestion | What it proposes | Nothing (decided: not on previews) | – | Dashed block: label, the signal as a row | Dashed block: label, the signal as a row, why, Dismiss \| Accept; no Sparkle inside it |

7. **If a mark can't be shown beautifully, don't show it on the preview;** push it to the peek or full view (Maggie, 4 Nov).
8. **Short labels are one line; sentences are two.** Themes and prototypes: tile, name in ink 2 (ink and 500 when current), a bare count or status glyph at the right, row 32. Theories, signals and dumps: the name, then the key value under it.
9. **One glyph column.** Within a peek or full view every leading tile (title, relation rows, attached lines and blocks) is 24 and sits in one column; every text starts on one edge. Chips and cards keep their own tile inside them.
10. **Unseen activity** (the old jade dot): open in the 06 jig. Recommended: nothing on objects; Briefing home shows what's new. Alternatives: unread weight (ink 600 name), or "3 new" / "New" as ink 2 text in the key value.

**Removed as unnecessary metadata:** evidence balance and prototype count from theory cards (to the peek); signal count from theme rows and section headers; dates at rest; theme chips on signal rows; "Tests N" and "Made N"; type words and type-label chips ("Signal", "Building" chip); "via" outside the full view; the label/value table (choice open); the pending-suggestion badge and the jade new dot (decided 4 Nov); kind glyphs on signal tiles; "theories" after a theme's count.

## 10 States — PROPOSED (jig `10-states/`)

Evidence: six loading treatments and no skeleton ("Loading Aber…" hides the whole window); empty copy in nine phrasings; every error goes to one top-centre banner in a third red, away from its object; the pill's processing dot is computed but never drawn; `connected` is tracked but never shown; Undo exists for two of seven reversible actions; four modals where one was decided (merge, retire, unfile, delete).

1. **Empty: one line naming what's absent (empty-state role, no full stop), plus the action that fills it.** No illustration, instructions or sample content.
   - Made by me (themes, theories, prototypes, a group inside an object): an Add slot where the first item would sit, at its height.
   - Made by the agent (signals, dumps): the line only; the composer is the action.
   - Filtered to nothing: search and filter stay; the line names query and scope; Clear filters; Esc clears search.
   - First run: no counts; the composer has the caret; Briefing says "Nothing yet". Caught up: "Nothing new since 18:40".
2. **Loading: nothing under 300ms, then a skeleton in the content's own geometry; never a layout shift.** Chrome that needs no data renders at once and the composer works before data arrives. Canvases draw their frame and fade marks in. Media of known size keeps its box. Opening an object has no loading state. Spinners only inside the control you just pressed (05 Loading).
3. **Background work: only work I started shows progress.** A dump appears at once at the top of Today, "Processing" in words with the Working spinner, and resolves in place (status goes, results appear; Briefing lists them). Paused is a hollow ring and the reason. Agent jobs I didn't start show nothing until they produce something, which arrives dashed; Briefing lists it. No new dots and no pending-suggestion badges on rows or cards (Maggie, 4 Nov); suggestions show only in the peek, the full view and Briefing.
4. **Errors sit beside their object, in words, with the way out.** Never only a tooltip, never a global banner. Words in ink do the work; no red dot on the row, page or field. One red dot stays: the global mark for a failed dump (composer, Dumps type or Columns strip), where there is no room for words and it leads to the dump that says why. Recoverable: reason + Retry. Not recoverable: reason + what's still possible. A failed dump stays visible with everything I sent; a failed save keeps my text with "Not saved" + Retry; a list that didn't load says so in its place. No raw error messages.
5. **Offline is shown once, for as long as it lasts, and changes nothing else.** Edits save locally and sync; an offline dump waits ("Waiting to send", hollow ring); reconnecting shows nothing.
6. **Toasts (tier 6) carry Undo.** Ink, one line, 44 high, radius 10, only the name truncates; just above the composer, right edges aligned, in every view; 5s, held while hovered or focused; ⌘Z while shown; one at a time, a new one commits and replaces the last; never stacks, never takes focus, never carries an error.
7. **Only Delete dump asks first:** a modal with the real counts, Cancel and an ink "Delete dump"; Esc and X close; no toast after. Discard, remove, unfile, retire, merge, move to the bin: at once, with Undo.
8. **Success is mostly silent; the object appearing is the feedback.** Accept solidifies in place; saves show nothing; creating opens the object. A toast appears only when something leaves the screen.

**Open (choices on the jig):** where in-progress work shows beyond the dump (A composer segment, B the Dumps type in the rail, C only the dump); whether a finished dump gets a toast (A toast with Undo, B silent: it appears in Briefing); where offline shows (A beside the view switcher, B in the composer).

## Still to come

07 rungs.
