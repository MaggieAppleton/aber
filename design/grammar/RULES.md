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

## 02 Type — DECIDED (4 Nov 2026: scale 11/12/13, pane title 24 (20 removed 4 Nov), section headers ink 2)

Geist (Geist Mono for keys and exact times), body 13, colour system D inks. Jig: `02-type/`. Values live in `_shared/type.css`, which every grammar page loads.

Evidence: today's CSS uses 11 px font sizes (including 9, 10 and 14.5) plus 10 size tokens for the same values, 16 line heights, weight 700 three times, 32 text colours across five ink families, and ink 3 for text 228 times.

1. **Every piece of text has one role**, and each role has one size, weight, ink and line height. A new kind of text means a new role, never a one-off value.
2. **Scale 11/12/13, pane title 24 (20 removed 4 Nov); peers differ by weight and ink first.**

| Token | Size | Used for |
| --- | --- | --- |
| `--fs-small` (count) | 11 | Counts and badges only |
| `--fs-label` | 12 | Labels, meta, button and chip labels, tooltips, keys |
| `--fs-body` | 13 | Everything you read: names, values, nav, prose |
| `--fs-title` | 24 | The pane title, the only text at 24 |

   Nothing is smaller than 11. 20 was removed from the scale (4 Nov).
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

## Navigation — DECIDED (4 Nov 2026: type-first default view; Briefing is the first rail item; tethered peeks)

Jig: `nav/`. Columns, Atlas and Timeline are unchanged (see the note at the top and 11).

1. **Four views.** Default (type-first), Columns, Atlas, Timeline. Columns, Atlas and Timeline stay as they are, each with its own index and the docked pane.
2. **The default view has three columns, with no docked pane.**
   - A type rail. **Briefing comes first and is selected on open**, then the types refined to raw: Themes, Theories, Prototypes, Signals, Dumps, each with its glyph tile and a count. "Aber" at the top is plain text, not a link. The rail is 160 wide by default (`--nv-rail-w`, on a dial).
   - A second sidebar listing the chosen type's items. Theories and Signals can be filtered by theme. Signals have no Unseen group. Briefing has no second sidebar.
   - The main area holds the selected item as its full view, padded at pane level because it is the focus region. With Briefing selected, it holds one column of what changed since you last looked.
3. **Related objects disclose in three steps.**
   - Preview: the row, card or chip where the object is mentioned.
   - Peek: a card tethered to that link, opened by a 500ms hover or a click. It shows the essentials and an Open button, and a click inside it peeks the next object. Esc or a click elsewhere closes it.
   - Full: Open moves the rail and list to the object; Back returns.
4. **The view switcher floats at the rail foot**, in the same spot as in the other three views.
5. **Pending:** the second sidebar's row and list designs are placeholders, not approved. They're designed in 06 Objects.

## 06 Objects — DECIDED (4 Nov 2026: preview, peek, full)

Every object follows one anatomy and appears at three rungs: a **preview** where it's mentioned (list row, card, chip), a **peek** (tier-4 tethered card, 340 wide, grows from the preview after 500ms or on click) and a **full** view that fills the main area (or the docked pane in Columns, Atlas and Timeline). All rungs are built from one set of components. Jig: `06-objects/`.

**Maggie's picks (4 Nov):** tile alignment **c** (an 18 tile centred on the first line); a challenge is **not shown on previews**; unseen activity is **unread weight**; peeks show **essentials and relations**; full views are **prose first**.

1. **One anatomy, slots in a fixed order at every rung.**

| Slot | What | Row | Card | Chip | Peek | Full |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Tile | The type glyph on its tile; a signal is always Pulse (kind, if shown, is text). No type word. | 18 | 18 | 24 flush | 18 | 32 (title) |
| 2 Name | List name 13/400 (ink 2 for short labels); card and peek 13/600; title 24/600 | 2 lines | 3 lines | 1 line | In full | In full |
| 3 Key value | The one attribute that tells it from its neighbours. Short values (a status, counts, the confidence meter) sit right of the name's first line; others sit on the key line under it | ● | ● | – | ● | ● (editable) |
| 4 Status | No dots or badges anywhere. A dump that couldn't be read says so in words | – | – | – | words | words |
| 5 On demand | A signal's or dump's date at the right end of the key line on hover; the rest in peek and full | Hover | Hover | – | ● | ● |
| 6 Attached | Tripwire and suggestions: not on previews; in the peek and full view (and Briefing) | – | – | – | ● | ● |
| 7 Relations | As preview rows; chips for themes | – | – | – | As many as fit, then a fade | All |

2. **Two left edges.** Everything in a peek or full view starts on the tile column or on the text edge. The head's title and key line sit on the text edge, after the title tile. Below the head, anything with a leading tile (rows, tripwire lines) puts its tile on the tile column and its text on the text edge; anything without one (prose, notes, reasons, section labels, chip lists, cards, the fields table) starts on the tile column, with no empty gutter. No decorative icons are added to fill the gutter. Relation and attached rows hang their tiles in the title's tile column; hover layers and dashed outlines bleed 8 into the padding. The full view's 32 title tile hangs further out so the title starts on the text edge.
3. **Rows.** Short labels (themes, prototypes) are one line, 32 high: tile, name in ink 2 (ink and 500 when current), a bare count or status glyph at the right. Sentences (theories, signals, dumps) wrap to two lines with the key value under them; a theory's confidence meter sits right of its first line. A row never repeats what its group says.
4. **Cards** are the row, raised: surface, `--sh-raised`, inset 10 inline / 8 block, name at 600. Hover is the surface hover fill; selected `--sel`; drafts dashed.
5. **Unread weight.** A row with unseen activity (a signal you haven't seen, a theme with unseen signals) sets its name in ink at 600; seen rows keep their weight. Cards and peeks don't change: their names are already 600, and only signals and themes have unseen activity. No other mark.
6. **Confidence.** Previews (rows, cards, peek head, relation rows): one 20 × 4 meter track with a proportional fill, right of the name's first line; unset is an empty track. The full view keeps the five-segment setter with its history.
7. **Counts** are a bare glyph (ink 2, 14) and a tabular number, no noun: 4 inside a pair, 8 between (theme peek: [Target] 5 [Pulse] 23; evidence: [arrow-up] 2 [arrow-down] 1). In the Themes list the count stays bare, since every count in that column is theories.
8. **Peek.** Inset 16 at the sides and bottom, 12 at the top, so the head has equal visual space above and below (12 to the tile; 12 from the head's baseline or tile to the hairline). Head (tile, title, key line), a full-bleed hairline (the one sanctioned hairline inside an object), the body (prose, tripwire line), then relations with their label on the tile column; every labelled section has the group gap (16) above it. Relations show as many as fit in one shared max height, then a surface-colour fade rises from the bottom; no scroll, no "show more"; Open sits below.
9. **Attached objects.** A suggested relation sits first in the group it would join, dashed: a dashed row in a peek; in a full view a dashed block with the row, the reason (on the text edge) and Dismiss | Accept at the bottom right. No Sparkle inside it. Tripwire text is ink; only the Signpost glyph is red. A challenge shows in the peek and full view as the tripped tripwire, and in Briefing.
10. **Full view, top to bottom:** Back (quiet) left and the object's verbs right (drafts: Discard | Accept); the title with its 32 tile; the key line (key value, then on-demand attributes, editable in place; no labels); prose; the tripwire; a hairline; relation sections. Relation rows are at most 560 wide.
11. **Hover reveals dates and actions** (DI-010): a signal's or dump's date on any preview; Remove (minus, 24) on relation rows in a full view.
12. **If a mark can't be shown beautifully, don't show it on the preview;** push it to the peek or full view.
13. **Briefing** is the first rail item and the default on open; "Aber" is only the app name.

| Type | Key value | Preview | On hover | Peek adds | Full adds |
| --- | --- | --- | --- | --- | --- |
| Theme | Theory count | One line: tile, name, bare count | – | [Target] 5 [Pulse] 23 on the title line; theories | Theories as cards, signals by day |
| Theory | Confidence: meter on previews, setter with history in full | Tile, claim, meter right of the first line | – | Meter on the title line; [↑] 2 [↓] 1, By year; note, tripwire line; Supports with any suggestion first | Setter, year stepper, note, tripwire, themes, supports (suggestions first), undermines, rival, follows from, leads to, prototypes |
| Prototype | Status (glyph; the word in peek and full) | One line: tile, name, status glyph | – | Status on the title line; body; theories it tests | Body, tests |
| Signal | Source | Tile (Pulse), gist, source | Captured day | Day, note, theories it bears on | Note, supports, undermines, Add theory, themes, File in theme, came from |
| Dump | Kind and time (Geist, tabular) | Tile, first line, kind and time | Day | Day, length, text, signals made | Via, text, reply, signals, drafts |
| Tripwire | Its sentence | Nothing | – | One line in ink, red Signpost | Sentence; when tripped, the signal and Dismiss \| Accept |
| Suggestion | What it proposes | Nothing | – | A dashed row, first in its group | A dashed block in its group: row, why, Dismiss \| Accept |

**Tile size per context:**

| Context | Tile | Glyph | Tile to text |
| --- | --- | --- | --- |
| Chip | 24, the chip's full height, flush | 14 | 6 (chip spacing) |
| Row, card, peek head, relation and attached rows | 18 | 12 | 8 |
| Full view title | 32, centred on the 24 title line | 20 | 12 |

**Removed as unnecessary metadata:** evidence balance and prototype count from theory cards; "theories" after a theme's count and the signal count on rows; the horizon on theory previews; dates at rest; theme chips on signal rows; kind glyphs on signal tiles; "Tests N" and "Made N"; type words and type-label chips; "via" outside the full view; the label/value table; the jade new dot, the dashed pending-suggestion badge and the red challenge dot; inert "N more" text.

**Amendments to decided foundations (decided with 06, 4 Nov):**
- **01 Spacing:** card inset 10 inline / 8 block (block is always inline − 2); peek inset 16 (top 12, for optical balance), a named role; tile-to-text gap `--gap-tile` 8 beside an 18 tile, 12 beside the 32 title tile; key-line values 6 apart (`--gap-key`).
- **02 Type:** exact times and durations use Geist with tabular figures in the surrounding role; Geist Mono only for keys. A row with unseen activity sets its name at 600.
- **03 Icons:** an object tile in rows, cards and peeks is 18 with a 12 glyph, centred on the name's first line (replaces 24 centred, which sat 7.3px above the capitals); a glyph on a tile is one step smaller than a bare glyph; the full view's title tile is 32 with a 20 glyph; counts use bare glyphs at 14.
- **05 Controls:** a chip's tile is the chip's full height, flush in its left corner (`_shared/controls.css` should size `.ctl-chip > .g` by `--chip-h`, not `--tile`).

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

## 09 Making things — PROPOSED (jig `09-making/`)

Evidence: 9 of the 13 ways to make or link something open the same centred modal (`ask()`, `app/dialogs.tsx:13`). None of them looks like what it makes. The only name check is the browser's `required` bubble (`:40`). Cancel is an X at the bottom right (`:44`). Pickers list every signal, including linked ones, and end in a chevron that doesn't expand (`:38`). Esc keeps a rename (`editable.tsx:16`). An X discards a voice take (`pill-study.tsx:390`). The nav jig's Add theory slot is dashed.

1. **Make it where it will live.** A new theme, theory or prototype appears as itself, already in its list and open in the main area, with the caret in its name. No modal. In Columns, Atlas and Timeline it opens in their docked pane (DI-002 B).
2. **Where you start sets the context.**
   - The list head's + (or N) makes one of that type.
   - Add theory inside a theme makes a solid card in place, filed in that theme. Return keeps the card and opens the next one; ⌘Return opens the card's theory; Esc on an empty card removes it.
   - A prototype started from a theory tests it.
3. **A modal only when it must block:** Delete dump and Find. Pickers are tethered popovers from their own button.
4. **Modal anatomy.**
   - The surface is 400 wide, radius 14, padding 20, with the modal shadow and a scrim.
   - The head holds the title (13 / 600 ink) and the X at the top right, its glyph on the content edge.
   - The description is 13 / 400 ink 2 at prose leading.
   - The foot sits at the bottom right: Cancel (secondary) left of the primary.
   - Focus starts on Cancel and stays inside. Esc, the X and the scrim close it. No 15px title.
5. **The name is the title.** The 24 / 600 title is the field, with an ink 2 placeholder ("Name this theme", "State the claim"). In-place editable text (titles, notes, field values) has no ring, no hairline and no field surface: plain text at rest; the 5% layer behind the text block (radius 7, padded with a matching negative margin) on hover and while editing, where it and the caret are the focus indicator. The text never moves between rest, hover and editing. The jade ring is for controls only. Notes work the same way at prose size.
6. **Validation is inline, never a tooltip and never red.**
   - A message sits under its field: a 14 icon, 12 / 500 ink, `aria-invalid` on the field and a polite live region.
   - A theme name that already exists says so with a chip to the other theme, without blocking.
   - A new object with no name and nothing in it simply goes.
7. **Rename in place.** Click the title, or press F2 or double-click on a row. Return or clicking away saves; Esc restores the old name. A blank rename keeps the old name. No toast.
8. **The composer** is the 05 bar at the bottom right of every view: microphone, field, paperclip, send. ⌘J focuses it.
   - **Empty:** Send waits for text or an attachment.
   - **Typing:** the field grows to 6 lines; Return sends and Shift-Return adds a line.
   - **Attaching:** pasted links and files become removable chips inside the bar (minus, never X).
   - **Recording** (⌘⇧J or the microphone): Discard (trash), the wave, the time in mono, then Stop as the primary, which sends.
   - **Sending:** Send shows the Working spinner at the same width, and the text dims.
   - **Sent:** the bar clears, and "Dump saved" with Undo appears. Undo deletes the dump and puts the words back.
   - A discarded take (trash or Esc) also offers Undo, which brings it back as a voice chip.
   - New vocabulary rows: image (an image attachment) and warning-circle (an inline error).
9. **Linking is a popover picker** from the + where the link will show. Find is focused. Signals from the theory's themes come first and linked ones are left out. ↑ ↓ move, Return links and Esc closes, returning focus to the +. The row lands in place and flashes the accent wash once.
10. **Mine, draft, suggestion.**
    - **Mine:** what I make is solid from the start, even unnamed.
    - **A draft** (an object the agent made) is dashed in lists, with its name in ink 2. Its full view puts Discard | Accept at the top right (06) and "Draft from" with a dashed Draft tag and its dump chip in the key line. Accept solidifies it in place.
    - **A suggestion** (a change to something of mine) is a dashed block inside my solid object: the proposed thing as an ordinary row, "Suggested by agent", and Dismiss | Accept.
11. **Add slots are quiet buttons** (plus and a 12 / 500 label in ink 2, the 5% layer on hover), never dashed.
12. **Toasts follow 10 States rule 8:** a toast appears only when something leaves the screen. Sending, discarding a take, a draft or a new object, dismissing a suggestion, and keeping something as Untitled each show one with Undo (⌘Z). Making, linking, renaming and accepting are silent. Delete dump is confirmed first, so no toast follows it.

**Open (choices on the jig):**
- Leaving a new object unnamed but with content: A hold with an inline error, or B (recommended) keep it as "Untitled" with Undo.
- Editing a draft's wording: A (recommended, and it matches design-model §1) it accepts the draft, or B it stays a draft until Accept.
- Adding evidence: A (recommended) a + on Supports and on Undermines, or B one Add evidence with a stance segment in the picker.

## 08 Briefing — PROPOSED (jig `08-briefing/`)

Evidence (`app/web/src/ui/briefing-app.tsx`, `.css`): every item is a raised card whose Accept and X sit at opacity 0 until hovered (css:50); reject is an X right of Accept labelled "Discard (X)" even on suggestions (tsx:90); on New signals the X discards a whole theme's signals (tsx:39); nothing can be undone and failures are swallowed (tsx:36–43); red challenge and jade new dots (tsx:93, :107); bare ink 3 glyphs with no tile (css:25); failed dumps aren't listed and processing is only a tooltip (tsx:28, :70–79); "New signals" is every unseen signal ever (tsx:20).

1. **Briefing is a full view of "since you last looked."** 06's anatomy: the 32 newspaper tile, "Since yesterday", the key line "Last looked 18:40", one summary sentence, the hairline, then sections, at pane insets. No second sidebar (Navigation rule 2).
2. **Ordered by need, not time.** Decisions first: Challenges, Suggestions, Drafts. Then news: New signals, Dumps. Sections 32 apart, groups 16, items 8, a row and its own block 4.
3. **Decisions wait; news expires.** Pending decisions stay until handled, however old; signals and dumps are only what arrived since you last looked.
4. **Summary before detail.** One sentence counts what needs you and what arrived, and names the busiest theme and any failure. Decisions show in full. A news group of three or fewer shows its rows; a larger one folds to its label and count (06's fold label, caret in the tile column).
5. **Grouped by the object a change touches.** A theory's row, then its suggestion blocks; a challenge under the theory it trips.
6. **Only 06 components.** Rows peek and open. Challenge: the theory row and its tripwire line are the subject; below them a dashed block holds only what is decided: "Tripped by", the signal, the consequence in words, and the buttons. Suggestion: a dashed block labelled by relation (Supports, Undermines, New wording, Merge with), the proposal, why, Dismiss | Accept. Draft: a dashed block with the draft row and where it came from, Discard | Accept. Automatic merge: one signal row naming both sources, Unmerge on hover. No dots, badges, per-item cards or type words.
7. **Act in place.** The buttons sit bottom right inside the dashed block they decide and act on that block alone; always visible, never on hover, never an X. Accept solidifies (the dash goes), then the item leaves; every decision has Undo (toast, ⌘Z). Keys: J / K move, A accepts, O peeks, ⌘Z undoes; no key for Dismiss.
8. **Seen is unread weight only.** An unseen signal's name, and the label of a folded group holding one, are ink at 600. Peeking or opening a signal marks it seen.
9. **Failures in words, first.** A dump that couldn't be read leads Dumps, says why, has Retry, and is named in the summary. Work in progress says Processing with the Working spinner.
10. **Handled is quiet.** An empty section goes. With no decisions left the sentence reads "Nothing needs you." and the news stays; with nothing new, "Nothing new since 18:40" and no key line. No celebration.
11. **Narrow:** Briefing alone; the rail is a sheet from the left; the composer spans the window.

**Open (choices on the jig):** new signals grouped A by theme (recommended) or B by the theory they bear on; a decided item A leaves with an Undo toast (recommended) or B settles to one line in place until you leave; a signal counts as seen A once Briefing has shown it (recommended) or B only when peeked, opened or marked seen; buttons read A Dismiss | Accept, or B what they do (recommended: Keep confidence | Lower to 3, Dismiss | Add evidence, Dismiss | Use wording, Keep apart | Merge, Discard | Keep), which would amend DI-009.

## 07 Moving between levels — PROPOSED (jig `07-rungs/`)

How you move between 06's three rungs, preview → peek → full, and back; and how Columns' docked pane opens and closes. Built only from 04's tiers and origins, 05's 90 and 160ms and 11's 380ms pane spring. The jig runs the default view and Columns live, with slow motion (0.25×), a reduced-motion switch and a "show origins" overlay.

1. **Every move starts from the thing you acted on and returns to it.** A peek grows from its trigger's tile (`transform-origin` on the tile's centre). Open carries the tile and title to the full view's title. Back carries them home.
2. **Preview → peek.** A 500ms rest or a click (Space or → from the keyboard) opens it. It grows from 0.96 with a fade, 160ms on the spring. It leaves in 90ms ease-out, shrinking to 0.98 toward the same origin. Tier 4: `--sh-pop`, radius 10, z 40.
   - **Position (choice 2):** beside a row or card, its tile level with the row's tile, falling back to below when there's no room; or below, its tile on the row's tile column, flipping above near the bottom. Chips always peek below, since their siblings sit beside them.
3. **One peek, ever.**
   - While a peek is open, a 150ms rest on another preview slides the same card to it (160ms spring) and fades its contents in (90ms).
   - A preview inside a peek replaces it in place: the row's tile and name travel to the head (260ms spring).
   - Opening any other transient surface closes it.
4. **Hover intent and grace.**
   - A hover peek stays while the pointer is on its trigger, inside it, or inside the triangle from the last point on the trigger to the peek's near edge. Previews crossed inside that triangle don't swap it.
   - Leaving all three closes it after 300ms.
   - No hover peek opens under a pointer that hasn't moved since the view changed.
5. **Click commits; hover never takes focus.**
   - A clicked peek stays until Esc, a click elsewhere, or a second click on its trigger. A click on a hover peek's trigger pins it.
   - Keyboard and click peeks keep focus on the trigger. Tab enters the peek; Esc, ←, or Tab past either end closes it and returns focus to the trigger.
   - A keyboard peek follows ↑ ↓ to the next preview, like Quick Look.
6. **Peek → full: Open, Enter on a preview, or ⌘↵.**
   - The rail's current item slides to the object's type (160ms spring). The list shows the object selected and scrolled to the middle. The main area shows its full view; focus moves to its title.
   - **Transition (choice 1):** the tile and title travel from the peek (or the preview) to the full view's title, 380ms on the spring, the two wordings cross-fading on one path. The peek and old view fade in 90ms; the rest of the full view fades in over 160ms after them. Or: the old view fades out (90ms, 16px left) and the full view slides in 16px from the right (260ms spring).
7. **Back: the Back button, Esc (when nothing transient is open) or ⌘[.**
   - Back restores the type, selection, list scroll and main scroll, and focus on the preview you opened from. The tile and title travel back to it.
   - **Landing (choice 3):** on the preview, or in the peek you opened from, open again.
8. **Selecting in a list or the rail is instant.** ↑ ↓ select in the item list and the main area follows (like Mail). It is the most frequent move, so only the rail's current item slides.
9. **The docked pane (Columns, Atlas, Timeline).**
   - Selecting pushes the pane in from its edge: 380ms spring, contents fading in over 160ms. In Columns, Prototypes folds to a 40 rail.
   - Another selection changes its contents in place with a 160ms fade.
   - Esc or the X closes it the way it came, in 260ms ease-out. Focus returns to the card that opened it.
   - Peeks in the pane open in the pane; Back steps back through what the pane showed.
10. **Interrupt anything.** Every animation starts from the on-screen value. Peeks and the pane read their live opacity, transform or width. Shared elements in flight become the next move's source. A new move cancels the running one, and nothing queues. One hover timer, one peek, one flight per window.
11. **Reduced motion keeps the map.** Nothing scales, slides or travels: peeks fade in place in 90ms; Open and Back cross-fade (90ms out, 160ms in); the pane appears and its contents fade in over 160ms. Anchors, destinations, focus and timings of intent (500, 150, 300) are unchanged.
12. **Screen readers.**
    - The trigger has `aria-expanded` and `aria-controls`; the peek is a non-modal `role="dialog"` named by its object.
    - A keyboard peek is announced with how to enter, open and close it. Hover peeks are silent.
    - Open focuses the full view's title (`tabindex="-1"`) and a polite status names what opened; Back returns focus to the preview.
13. **Narrow screens (below 640).** A peek is a bottom sheet from the bottom edge (04 rule 10), opened by a tap. Open pushes the full view in from the right over the list; Back slides it out to the right.

| Move | Time | Curve |
| --- | --- | --- |
| Hover intent; swap an open peek; grace | 500; 150; 300ms | – |
| Peek in; out | 160; 90ms | Spring; ease-out |
| Peek slides to the next trigger; chain in place | 160; 260ms | Spring |
| Open and Back: tile and title travel | 380ms | Spring |
| Old view out; new content in | 90; 160ms after 90 | Ease-out; linear |
| Rail current item | 160ms | Spring |
| Select in a list | 0 | – |
| Pane in; out; contents change | 380; 260; 160ms | Spring; ease-out; linear |

**Open (choices on the jig):**
- How Open moves you to the full view: A shared tile and title (recommended), or B cross-fade and slide.
- Where a peek sits: A beside the trigger (recommended), or B below it.
- Where Back lands: A the preview (recommended), or B the peek you opened from.

## Still to come

07 rungs.

## 11 Columns, Atlas, Timeline — PROPOSED (4 Nov 2026)

A restyle, not a re-layout: each view keeps today's layout, navigation and docked pane. Jig: `11-views/`, with today's views beside live rebuilds. Values live in `11-views/views.css`. Pane contents, object cards and rows, and the Dump or ask pill are placeholders there.

Evidence: each view draws its floating controls differently. The view switcher is 40/32/radius 20 with ink 3 icons. Atlas zoom is radius 8 with the card shadow. Timeline tools are separate 32 squares and use the Theme glyph to filter. The pane pads 40/48 (40/36 in Timeline). "Unrelated" is dimmed at five opacities. Columns' open card sinks (sunk fill, `!important`), its cards sit 4 apart with 8/10 insets, and its rails show ink-filled count badges. Atlas has its own ground, ink 3 counts and 12/600 claim labels; disc size encodes nothing; names collide with discs and pins. Timeline labels are 13/500 with a text-shadow halo; the year axis is ink 3; empty lanes are as tall as full ones.

1. **Canvases sit on the ground**, never a ground of their own. Plot content starts at `--inset-canvas`.
2. **One float bar recipe.** Each group of floating controls is one bar: surface, `--sh-float`, radius 14, padding 2, 28 icon buttons (radius 12) with tooltips. It sits `--inset-float` from the window edge: the view switcher bottom-left, zoom and Timeline tools top-left.
3. **The pane enters from its edge and pushes.**
   - Pane and view move together on the spring, 380ms; contents fade in over 160ms. Under reduced motion it cross-fades.
   - Default widths stay today's: Columns takes what the rails leave, Atlas 940, Timeline 560.
   - Pane inset is `--inset-pane`. Close and Full width sit in its 28 header row, glyphs on the content edge.
4. **One selection grammar.**
   - The open object is `--sel` on a surface: a card, theme row, territory label, map label or timeline item. A pin gets a ground gap and an ink ring instead.
   - Related objects stay as they are; unrelated objects recede with one treatment (choice 1).
   - Esc, X or a click on empty canvas closes the pane.
5. **Columns.**
   - Widths are fixed: Themes 230 (nav inset), Theories `--list-w` (list inset), Prototypes 220, Dumps 250, Signals 290. Flows sit on sunk.
   - A head is a 32 row: tile, then the section header. Fold shows on hover.
   - A folded column is a 40 rail: its tile on the head's centre line, then a plain count (11/500 ink 2) of objects related to what's open.
   - Theory cards: inset 12, 8 apart.
6. **Atlas encoding.**
   - A territory is a disc: 4% ink with the strong hairline; selected, 6% with a 1px ink 3 edge.
   - A theory is a pin sized by confidence (8 + 1.5 per step); drafts are a dashed 10.
   - Text is placed in screen space, so it stays 13 at any zoom.
7. **Map labels never collide.**
   - Territory names try the inside top of their disc, then just above it, then the inside bottom.
   - Theory names try the right of their pin, then the left, then centred below.
   - No name covers another name, a pin or a floating control, or leaves the map. A name with no clear place waits for hover.
   - The open object's name always shows, and opening a territory names its theories.
8. **Timeline lanes and axis.**
   - Years run across as meta (12/400 ink 2). Confidence runs down, 5 at the top, then drafts behind a dashed dot. The gutter is 56.
   - An empty lane is 40; populated lanes share the rest. Cells pad `--inset-row` and stack with `--gap-item`.
   - An item is an 8 dot plus a list name (13/400 ink).
9. **Timeline with something open.**
   - Related items drop to one line, unrelated items to their dot.
   - Connecting lines keep today's geometry (`timeline2-fieldx.tsx`): each related theory gets its own line in its row; a line leaves the cause's dot straight down or up (or jogs once to a gutter lane when a dot is in the way), turns once with a 6 radius and arrives at the consequence from the left with an open chevron; ink 1.5, ink 3 1.25 further along the chain. Rivals are not drawn as lines.
   - Chain appears only while something is open.
   - Filter by theme is the funnel, opening a tethered menu; once set, it becomes a labelled button.
10. **Vocabulary:** Fold a column uses `sidebar-simple`.
11. **Marks on previews (Maggie, 4 Nov):** no new dot, open ring or pending-suggestion badge on cards, rows, rails, map labels, pins or timeline items; signals use the Pulse tile. The red challenge mark stays on theory cards, pins and timeline dots, pending 06.

**Open (jig `11-views/`):**
- With something open, unrelated objects: A fade to 40% (default), or B flatten (no surface, ink 2).
- Atlas disc size: A as placed today, or B area ∝ the theme's signals (recommended).
- Atlas theory names: A on hover, on open and when zoomed in (today, default), or B always, wherever they fit.
