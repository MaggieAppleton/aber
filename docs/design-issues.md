# Design issues

This log holds Maggie's open complaints about Aber's interface. Each issue goes through the same steps:

1. Record the complaint verbatim, along with any rules she states.
2. Separate what she observed from what we verified in code or in the live UI.
3. Build an exploration jig that shows the current UI beside two or three structurally different alternatives, in real app context and with the app's real CSS.
4. Record her decision. Then update [`design-model.md`](design-model.md) and implement the change.

The grammar and encoding source of truth is [`design-model.md`](design-model.md). Earlier, closed UI fixes are in [`ui-issues.md`](ui-issues.md) (UI-001 to UI-023). These issues use the `DI-` prefix.

Jigs live in `design/explorations/<id>/index.html`. They share a shell in `design/explorations/_shell/` and use DOM fixtures captured read-only from the fictional demo in `design/explorations/_fixtures/`. To view them, serve the repo root, for example with `python3 -m http.server 5190`, and open the jig's path.

Status values are `observed`, `scoped`, `exploring`, `decided` and `done`.

---

## DI-001 · Objects are hard to tell apart and are represented inconsistently

**Status:** exploring (Maggie authorized the exploration).
**Concepts:** Theory, Theme, Signal, Prototype
**Surfaces:** Theme sections, Columns, Briefing, object pane, chat cards, sidebar

**Maggie's observation:** "There are a lot of issues with being able to tell the difference between different objects. Sometimes there's an inconsistent display of objects within the system. If you look at the interface grammar material in this repo, we have a clear set of nouns and verbs defined, but they don't always show up consistently in the interface."

**Verified findings in code:**

- **Theory** appears in at least eight renderings:
  - `TheoryCard` `.ap-card`, with no type icon (`atoms.tsx`)
  - `TheoryTile` `.pn-tile` (`panes.tsx:239`)
  - the Columns `cd-item` row (`columns2.tsx`)
  - `pn-chip` with a Target icon under the prototype's Tests (`panes.tsx:296`)
  - `pn-chip` with a chevron and no Target icon for follows and leads-to (`panes.tsx:183–184`)
  - a rival chip with a Swap icon (`panes.tsx:155`)
  - a plain `pn-link` with an arrow for evidence (`panes.tsx:103`)
  - `pn-feed-chip` (`panes.tsx:88`)
- **Theme** has three forms:
  - a Binoculars chip in the pane (`panes.tsx:109, 136`)
  - a plain bold heading in Theme sections (`current.tsx`)
  - a row with no icon in the sidebar index and in the Columns rows
- **Signal** has five forms:
  - `SignalRow` `.pn-sig`, with no icon (`panes.tsx:69`)
  - `FeedLine`, which uses link or text source glyphs instead of Pulse
  - `SignalCard` `.ab-sigcard`, with a Pulse well and a dashed border (`signal-card.tsx`)
  - Briefing rows and DumpDetail rows, which use Pulse
- **Prototype** has two forms:
  - `ProtoGlyph`, coloured by status, in chips
  - a plain PencilRuler icon in the sidebar

  Separately, the dump log and Briefing Overnight use the Theory icon (Target) for a generic draft count (`dump-log.tsx:116`, `briefing-app.tsx`).
- **Chat cards** (`ObjectChatCard`) render theories with `TheoryCard`, but every other kind with `.ap-card` plus an icon (`chat/object-card.tsx`).
- Known encoding clash (design-model §5): the prototype "building" glyph uses the same blue as "new".

**Proposed first exploration:** one vocabulary for object references. A reference to a Theory, Theme, Signal or Prototype inside another object should carry the same type marker and form wherever it appears. The jig compares distinct strategies; not every reference needs an identical marker and form.
**Exploration:** [`design/explorations/di-001-objects/`](../design/explorations/di-001-objects/index.html). **Decision:** none.

---

## DI-002 · Dialogs: weak anatomy, close button in the wrong place, and modals used for creation

**Status:** exploring
**Concepts:** every concept that can be created (Theme, Theory, Prototype, draft rephrase), plus pickers and confirmations
**Surfaces:** every `ask()` dialog

**Maggie's observation (verbatim):** "Across the app there are a number of dialogues like this that, first of all, I think are poorly designed — in the sense of maybe having too much padding or not enough hierarchy. You should look at Shad CN, which I think is a library we should have loaded into this project for how they do modals; that should really be our reference for modals. One glaring issue is a small close button that is not in the top-right corner, which is extremely unconventional. We should never have a close button that is not in the top-right corner for a modal. I also tend to avoid modals wherever I can. For example, the one we're looking at: for a new prototype, I would want to show what is usually the display prototype page. If I open one of these prototypes, I'll add that to the reference. I would want a page like a normal prototype view, but in a fill-in or editable state. I almost never want an isolated modal that doesn't look like the object I'm creating. A good rule of thumb is: if I'm creating an object, it should look like the final object."

**Rules she stated:**

1. A modal's close button always sits in the top-right corner.
2. Avoid modals wherever possible.
3. Creating an object should look like the final object.

**Verified findings:**

- shadcn is **not** installed. There is no `components.json`, Radix, Tailwind or lucide. Every dialog goes through `@base-ui/react` Dialog and a single `DialogHost` with the `ask()` promise API (`app/web/src/app/dialogs.tsx`). shadcn is therefore an anatomy reference only, unless we decide to adopt it.
- In the current dialog, `.ab-dialog.ap` is fixed at 20% from the top, 480 wide, with 20 padding and a 14 radius (`app/app/production.css:1`, `ui/surface-patterns.css:98–108`). The title is an `h2.ap-h` with a description below it. Cancel is a small X icon button at the bottom right, next to Create. There is no top-right close.
- Dialog inventory (all `ask()`):

| Kind | Dialogs |
| --- | --- |
| Creation | New theme, State a theory, New prototype and Rephrase draft (`createObject`, `dialogs.tsx:58`) |
| Find | ⌘K search |
| Pickers | Theory relationships (two steps), Add supporting or undermining evidence, File in a theme, Unfile, Merge signal choose |
| Confirmations | Retire with reason, Merge confirm, Delete dump (destructive) |
| Viewer | inspectDump, which is read-only and closes through a "Close" submit button |

**Exploration:** [`design/explorations/di-002-dialogs/`](../design/explorations/di-002-dialogs/index.html) compares the current dialog with a shadcn-style modal, creation in the docked pane using an empty editable `.pn-doc`, and inline creation at the trigger. It repeats that comparison for New prototype, State a theory and New theme. It also gives a policy for each dialog type.
**Decision:** none yet.

### Refinement: missing-name error

Maggie, on the "Needs a name" line in the docked creation view: "we need a better error state than this".

The current state appears when you close an unnamed prototype (or a theory with no claim) that has notes. A grey line under the title reads "Name it to keep it." and shakes. It isn't attached to the field, and its only action, Discard, throws the notes away.

The exploration ([`#name-error`](../design/explorations/di-002-dialogs/index.html#name-error)) keeps that as Current and applies three design suggestions to both prototypes and theories:

- **A, field-level.** The Name field carries the error: an ink underline (not red, which means a challenge) and helper text with an icon under it ("Add a name to keep this prototype."). The field gets `aria-invalid` and `aria-describedby`, focus returns to it, a polite live region reads the message, and there's no shake. Typing clears the error. Closing is still blocked.
- **B, never block (recommended).** Closing without a name keeps the object as "Untitled prototype" or "Untitled theory". Its sidebar row or card shows that in muted placeholder text, and a toast reads "Saved as Untitled" with Undo (also announced). Undo reopens it with the notes intact. Nothing is lost, and this also answers the open "Untitled" question.
- **C, foot bar in the pane, not a modal.** A bar rises from the pane's foot: "This prototype has notes but no name." Discard sits on the left and the primary "Keep as Untitled" on the right (DI-009). Focus moves to Name, typing a name removes the bar, and a live region announces it.

**Decision:** none yet.

### Decisions (Maggie, 3 Nov 2026)

From the jig's "Copy choices":

- **New prototype: B, "Create in the docked pane".** The pane opens on a blank prototype page with the name focused, status *idea*, and Tests prefilled when started from a theory. It looks like the final prototype from the first keystroke.
- **State a theory: B, "Theory page in the pane".** The theory page opens in the pane, filed in the theme you pressed + on, with the claim focused.
- **New theme: B, "Theme page in the pane".** The theme page opens in the pane, empty and editable.
- **Retire theory or theme: B, "Tethered menu + Undo".** The trash button opens a small menu of reasons; one click retires, and a toast offers Undo. There's no modal.
- **Modal anatomy: A, "shadcn anatomy".** Every modal that stays has a header (title and description), an X in the top-right corner, a compact body, and a footer with Cancel and the primary action. This includes the 15 px title, so 15 needs adding to the app's type scale.

The jig marks each chosen option "Chosen" and preselects it. The other options stay for reference, dimmed. (Since 4 Nov the choice controls sit in context, under each option; see below.)

**Per-type policy was not approved.** Maggie: "The interface you've made me for this is all text and it isn't clear what's being asked or suggested". The policy section is rebuilt as before/after mini stages using real markup, grouped by the surface proposed. Each open row asks one question.

**Still open:**

- Rephrase draft and Add link: edit the text where it sits, with no modal?
- Pickers (Tests, Theory relationships, Add evidence, File in a theme, Unfile, Merge: choose): open as a popover from their own button?
- Merge confirm: apply straight away with Undo, with no confirmation step?
- Dump viewer: unfold in place under its signal?
- Delete dump: stay a modal, as the one destructive action?
- Find (⌘K): stay a centred modal, as a command palette?
- The missing-name error (A, B or C above).

**Finding: ellipses in action labels.** Rule (Maggie): no trailing ellipses on menu items or action labels; she calls them "an enormous violation". None of today's dialog action or menu labels end in an ellipsis. The only ellipses in the app are on status and loading text: "Searching…" (`dialogs.tsx:39`), "Uploading media…" (`panes.tsx:301`), and the "…Aber…" loading text (`app-shell.tsx:286`, `main.tsx:14`). Those are outside this rule, but worth a look. The jig checks that no proposal control's label ends in an ellipsis.

**Finding: chevrons.** Rule (Maggie): "a chevron is a button that shows a collapsed item and indicates the expanded state, and you should never have them appear out of nowhere without an initial one." Chevrons also must not appear on things that don't expand. Today the theory page's "Leads to" chips (links to other theories) carry a trailing chevron, and so do the Find and picker option rows; all of these navigate or select. In the proposals they're removed. The remaining chevrons (the Prototypes section header and proposal toggles) are visible at rest and point to their state, and the jig checks this. The proposals also use no "·" or "•" separators.

### Refinements (Maggie, 4 Nov 2026)

Four comments on the policy minis:

1. Edit-in-place textbox (`#policy-text`, `text-new`): "the text in the textbox needs more padding. usually I do 2px+ on hoz padding, e.g. 6px vert, 8px hoz"
   - **Before:** padding 2px 4px, 13px type.
   - **Now:** 6px 8px, 14px/20px; 16px/22px at ≤639px.
   - The same treatment applies to every proposed input in the jig: the picker Find field, the ⌘K palette input, and the pane fields at 6px 10px with a 40px height. Current minis stay faithful.
2. Multiline popover rows (`#policy-picker`, `picker-new`): "In cases like this, we always want the icon to be horizontally aligned with the very first line of text in an element. I've seen this issue occur across different points in the app where we're center-aligning the icon, but on a two- or three-line item, which looks bad, we should always align the icon with only the first line of text."
   - **Before:** the icon centre sat 9.09px below the first line's centre, at 1440 and at 390.
   - **Now:** rows use `align-items: flex-start`, and the 14px icon is offset by (20px line − 14px)/2 = 3px. The offset is 0.5px at both widths.
   - The same rule now covers every multiline proposal row: ⌘K items, field help, menu items with descriptions, proposal toggles that open with a signal card, signal cards, and rival chips.
   - An audit of 41 multiline rows found a worst offset of 0.5px.
3. Retire icon (`#policy-retire`, `retire-new`): "The icon for retiring is a trash can, which doesn't seem right. I feel like "retirement" should use a different kind of icon. Can you go look at Faster Icons and suggest alternative icons here?" ("faster icons = phosphor icons").
   - The jig now shows the tethered menu open in four minis side by side: the current trash icon, then three real Phosphor Regular icons. Regular matches the app's own Phosphor `Trash`.
   - The paths come from `@phosphor-icons/core` 2.1.1. Phosphor 2 has no `ArchiveBox`; the icon is `Archive`.
4. Toasts (`#policy-merge`, `merge-new`): "Don't wrap the text in these toasts onto two lines; just make it one line."
   - **Before:** "Merged into “Agent recalls a codebase”" + Undo wrapped to 2 lines, 52.4px tall, at 1440. At 390 it wrapped to 4 lines, 88.75px tall.
   - **Now:** every toast is one line and 44px tall. That covers Merge, Retire ("Retired as Disproven" + Undo), and "Saved as Untitled" + Undo.
   - At 390 the toast takes the available width (302px). Only the quoted object name truncates with an ellipsis, and the full text is in `title`/`aria-label`.
   - Undo never truncates. It keeps a 40px hit area.

**Open: retire icon.** The jig asks "Open: which icon should the retire button use?" with no default. The Phosphor options:

- **Archive** (`archive`, React `Archive`), *recommended*. The theory leaves the active set but is kept and can be got back, which is what retiring means. It also covers all three reasons.
- **Sun horizon** (`sun-horizon`, `SunHorizon`). The literal "sunset" of retirement. It's gentle, but busy at 16px and could read as sunrise.
- **Flag checkered** (`flag-checkered`, `FlagCheckered`). Reads as "finished", which fits Superseded and Abandoned but not Disproven.
- **Trash** (today). Reads as delete, which retiring isn't.

Rejected:

- `Moon` reads as sleep or dark mode.
- `HourglassSimple` reads as pending.
- `Prohibit` reads as forbidden.
- `ClockCounterClockwise` reads as history or undo.
- `BoxArrowDown` duplicates Archive.

**Cross-app note: icons on multiline rows.** Production rows centre their icon on the whole text block. When the text runs to two or three lines, the icon floats between lines. The later production pass must align icons to the first line: `align-items: flex-start`, with the icon nudged by (line-height − icon size)/2. The proposals here already do this. `.pn-origin` (flex-start with a 2px icon nudge) is the production precedent.

Candidates found in `app/`, not changed here:

- `.ab-option` (`app/app/production.css`). Its icon + label + `<small>` detail is always two lines and is always centred.
- `.ab-disclosure` and `.br-overnight` (`production.css`).
- `.pn-proposal-toggle` (`ui/suggestion-preview.css:3–11`). The chevron sits at the card's top edge when the copy opens with a signal card.
- `.ab-sigcard-text` (`ui/surface-patterns.css:143`). Its first line sits 0.9px high in its 24px well.
- `.dl-row` (`ui/dump-log.css:17`). The icon column is centred against a title that can wrap.
- `.cur-prototype-row` (`ui/current-sidebar.css:19`), which has a min-height and no nowrap.
- `.br-link` (`ui/briefing-app.css:42`).
- `.pn-line` (`ui/panes.css:95`), plus `.col-row`, `.brf-row` and `.cd-line` (`ui/homes.css:129`, `:182`, `:302`). These are flex-centre; confirm whether their text can wrap.

Fixed-height single-line rows such as `.pn-chip`, `.pn-feed-chip`, `.t2-pop-row` and `.ps-toast` are not affected. The same pass should also check text padding (Maggie's rule of horizontal ≥ vertical + 2px). `.pn-title` (4px 8px) is fine; `.tw-tc-phrase` (2px 4px) is tight.

### Policy decisions (Maggie, 4 Nov 2026)

From the jig's "Copy choices", verbatim:

```
- policy-text — Rephrase a draft (and add a link) by editing the text where it sits, with no modal?: Yes
- policy-pickers — Should every picker open as a popover from its own button, instead of a centred modal?: Yes
- policy-merge — Should a merge apply straight away with Undo, with no confirmation step?: Yes
- policy-viewer — Should a dump unfold in place under its signal instead of opening in a modal?: Other (note) — note: Neither of these feels good. It shouldn't be a modal, but this inline is very noisy. I think I want to explore popovers for a lot of this inline stuff. Like, if I were to click on the signal to see where it came from, I'd want a popover to appear next to the signal or below it with more information — like where it came from and these sorts of things. Which is which is a good in-between between a modal and inline, because inline is too verbose.
- policy-delete-modal — Should Delete dump stay a modal, as the one destructive action?: Other (note) — note: It should be the proposed shad cn modal
- policy-find-modal — Should Find stay a centred modal (a command palette), since it has no object to anchor to?: Yes
- new-prototype B, name-error (no choice), state-theory B, new-theme B, retire B, modal-anatomy A
```

**Confirmed:**

- Creation in the docked pane: new prototype, theory and theme (B).
- Rephrase draft and Add link: edit in place.
- Every picker opens as a popover from its own button.
- Merge applies straight away, with Undo.
- Delete dump stays a modal, in the proposed shadcn anatomy. Her "Other" note picks the proposed modal, so this is decided.
- Find stays a centred command palette.
- Retire uses the tethered menu with Undo (B).
- Modal anatomy is A, shadcn.

The jig marks each of these Decided and preselects it.

**Still open:**

- The missing-name error (A, B or C).
- The retire icon (recommendation: Archive).
- The dump viewer. Maggie rejected both the modal and the inline unfold ("too verbose"). It's marked Reconsidering with no preselect, and it now continues under DI-004/005 as a popover anchored to the signal ([Provenance popover](../design/explorations/di-004-expansion/index.html#provenance-popover)).

**In-context choices.** The jig now uses the shared shell's in-context controls. Each "Choose" button sits on its own option: Today = "No, keep the modal", Proposed = "Yes". The old decision panels are gone.

Some options were dropped because the note field now carries them:

- the combination options "B from sidebar + C from a theory", "A for theories, B for prototypes" and "A with a 13px title";
- every "Other (note)".

The retire-icon question is new; it chooses between the four icon minis.

---

## DI-003 · Sidebar navigation: prototypes sit at the bottom and rows misuse chevrons

**Status:** direction chosen (jig only; app unchanged)
**Concepts:** Theme, Prototype
**Surfaces:** the Theme sections sidebar (`aside.cur-rail`, `current-sidebar.tsx`), with the Columns view as a reference

**Maggie's observation (verbatim):** "This whole prototype section in the sidebar, I think, doesn't make sense. It's sort of shoved down at the bottom here. I mean, first of all we have the chevron icons for each prototype listed inside of this collapsible section. We should only use chevrons in a collapsible section, but these aren't collapsible sections — they take you to each prototype, so that is an incorrect use of chevrons. But more than that, this sidebar lists themes at the top and then prototypes at the bottom. The navigation design is quite confused here. I know this is just one view. We also have the columns view, which lays this out in a much nicer way, but the columns view, I think, is not as compact. I would rather have something like tabs at the top or a switcher, or I'd rather actually have themes and prototypes with labeled sections that are both top-aligned within the sidebar that you can flip between. Not flip between, but, right, you could have a list of themes and then a list of prototypes — both available within the sidebar without having to awkwardly put prototypes at the bottom here, which I think just feels strange."

**Rule:** chevrons only signify expand and collapse. They are never used to navigate to an object.
**Leaning:** Themes and Prototypes as labelled lists, both aligned to the top and available at the same time. This is her tentative direction, not an approved fix.

**Verified findings:**

- Prototypes are a Base UI Accordion with `.cur-prototype-section { margin-top: auto }`, so they are pinned to the bottom of the rail. With the demo data, the heading sits at y≈665 in a rail about 212px wide.
- Each `.cur-prototype-row` ends in a chevron icon even though the row opens the prototype (`current-sidebar.tsx`).
- Theme rows have no type icon. Prototype rows use a plain PencilRuler icon rather than the status `ProtoGlyph` used elsewhere. This overlaps with DI-001.

**Exploration:** [`design/explorations/di-003-sidebar/`](../design/explorations/di-003-sidebar/index.html) compares the current sidebar with three alternatives:

- both lists in one top-aligned flow
- a tabs or segmented switcher
- a compact layout derived from Columns

It includes a long-population stress test.

**Maggie's choice (verbatim):** "I like the A stacked sections option, but I prefer the headers shown in C bands. I think it's clearer to have the icon to the left of the section header, with the header slightly bolder and the count to the right. I would make the count a little smaller — it currently looks large relative to the text size. So: the headers from C, but the behavior and layout of stacked sections."

**Decision:** A's layout and behaviour, with C's section headers.
- **Layout (from A):** one scroll with Themes then Prototypes, both top-aligned. Each header collapses its section, sticks, and docks at the bottom edge when its section is below the fold. Each section has its own +.
- **Headers (from C):** the type icon on the left, then a bolder label (13px, weight 600, `--ap-ink-2`), then the count on the right in a smaller size (11px `--size-px-11`, `--ap-ink-3`).
- **Not carried over:** C's independently scrolling bands.
- **Chevrons:** prototype rows end in their status glyph and have no chevron. The header's chevron is always visible, pointing right when collapsed and down when open (Maggie's chevron rule, 3 Nov).

The jig shows this as the preselected "A+C" option (`#opt-chosen`, screenshots `chosen-ac.png` and `chosen-ac-long.png`). The production change waits for implementation approval.

---

## DI-004 · The expanded Signal component needs a ground-up rethink

**Status:** exploring
**Concepts:** Signal, with its origin Dump, its Themes and the Theories it is evidence for
**Surfaces:** the Columns `.cd-item > .cd-detail > .pn-detail-inner` and every other reuse of the inline expanded-signal pattern

**Maggie's observation (verbatim):** "I've been unable to select it within the UI here, but this entire outer component — the one that expands a signal inline in the sidebar — is extremely vibe-coded and poor AI design. I think we need to completely rethink this from the ground up. I've seen this layout or pattern in other areas of the app and it's equally problematic. … Especially the expanded signal components in the columns view — they are very poorly designed. … If you were going to design these anew, what would be the best way to do it? Because these are very poorly conceived."

**Verified in the live UI** (Columns at about 274px wide), in this order:

1. an editable gist
2. an empty editable Note
3. a theme chip
4. an origin chip ("Voice note, 4 min: …")
5. an external source link that repeats the gist
6. icon-only actions: merge, unfile, file and discard

**Constraints for any option:**

- No arbitrary max-height clipping.
- No nested scroll traps.
- The gist must not be repeated as the source label.
- Important data must not be hidden just to make the component short.
- Destructive consequences must be visible when an action is invoked.

**Exploration:** [`design/explorations/di-004-expansion/`](../design/explorations/di-004-expansion/index.html), shared with DI-005.
**Decision:** option C (provenance trail), Maggie. In her words: "For the first choice in expanding Signal and Dump design, I like the provenance trail (option C). But if you look at the actual layout of this, it's still kind of fucked up. … You need to look at all the details. Some things are too small; there are multiple type sizes in use. There are inconsistent icon buttons."

### Detail pass on C

Before and after screenshots are in `design/explorations/di-004-expansion/screenshots/` (`c-before-*.png`, `c-after-*.png`). The design-check results are recorded under item 17.

1. **Evidence-for layout.** "suggested · undermines" was crammed beside the claim with a separate stance arrow, and "Use as evidence" sat in a stray div. Each theory row is now the claim with its stance on its own line beneath ("Undermines, suggested"), and the add action is a trail row like the others. *Fixed.*
2. **Type sizes.** 13, 12, 11 and 10px were mixed. The trail now uses 14px for all text and 26px only for the gist title. *Fixed.*
3. **Small icons.** The 10px glyphs and 10px mini links are now 16px. *Fixed.*
4. **Inconsistent icon buttons.** The ⋯ menu, collapse chevron, external link, "Open →", "+ File" and "+ Use as evidence" were all styled differently. Icon controls now use one `.ap-iconbtn` variant with a 40px hit area, and "add" actions are full-width trail rows. *Fixed.*
5. **Dot separators.** Every ` · ` and `•` has been removed from C, the jig and its headings (which now use colons). *Fixed.*
6. **Menu.** It was clipped, sat at the wrong elevation and grew from its centre. It now uses the tier-4 `--ap-shadow-float` token, grows from its trigger (`transform-origin` set to the ⋯ corner), scrolls into view inside the column, and keeps every item to a single 40px line. *Fixed.*
7. **Trailing ellipses.** These were on "Discard…", "Merge…", "File…" and "Rephrase…". Every action and menu label is now ellipsis-free. "Merge with another signal" fits on one line. *Fixed.*
8. **Illustrative note.** It was too heavy relative to the content. It is now quiet secondary text with an underlined "Show today's data" toggle. *Fixed.*
9. **Trail rhythm.** Dots and labels were misaligned and the spacing between nodes was uneven. Each node now has a 16px icon in a fixed 24px tile centred on the trail line, a label row, and one consistent gap. *Fixed.*
10. **Discard.** It was red, but red means a challenge. Discard is now neutral. The confirm lists its consequences in place, with Cancel on the left and Discard as the commit on the right. *Fixed.*
11. **Chevrons.** A chevron appeared only once an item was expanded, and carets sat on menu chips. On every collapsible row, the chevron is now visible in both states, points to the current state, stays in the same corner, and sits on a control with `aria-expanded`. Carets have been removed from menu and picker triggers. *Fixed in A, B and C. Current still has none, faithful to the app.*
12. **Dump collapse.** An expanded C dump had a separate "Fold" control instead of the row chevron. It now collapses with the same chevron as signals, and collapsed titles wrap instead of clipping. *Fixed.*
13. **Hit areas.** Trail controls were under 40px. Every control is now at least 40px. *Fixed.*
14. **Overflow at 390px.** The jig's inventory table scrolled the page horizontally. It now wraps. *Fixed.*
15. **Picker focus.** Opening a picker in C didn't focus its first item. It now does. *Fixed.*
16. **Accessible names.** The source link's name was its title, which contains a colon that the checker's aria-snapshot parser misreads. The link now has its own name, "Open source on theverge.com", with the title as its description (`aria-describedby`). *Fixed.*
17. **Title tile (confirm round).** The editable title showed the app's `.pn-edit` hover tint, which stopped short of the ⋯ and chevron and looked like a half-selected header. In C the title has no tint: the text cursor signals that it's editable, and the editing ring appears on focus. *Fixed.*
18. **"This signal" node (confirm round).** Its icon sat on a solid black tile while every other node is pale, which added emphasis the encoding map doesn't explain. It now matches the other nodes. The header already identifies the signal. *Fixed.*
19. **Icon-button rest state (confirm round).** ⋯ was a faint bare glyph while the chevron sat on a grey tile, because the app gives an expanded `.ap-iconbtn` a pressed tile. Every icon button in C now rests transparent in ink-2, and trailing row glyphs (⋯ on theme rows, ↗, →) use the same ink. The tile appears only on hover, or on ⋯ while its menu is open. The chevron shows state by direction, so it stays bare when expanded. *Fixed.*
20. **Illustrative note (confirm round).** In Columns it rendered as a grey box, which was the whole-note button's hover state and heavier than the quote. On every surface it is now plain secondary text with a separate underlined "Show today's data" button. *Fixed.*
21. **Trail rhythm (confirm round).** Rows inside a node (for example "Agent memory" to "File in a theme") were 25px apart, almost the 27px between nodes. Spacing now has three clear steps: 15px from a label to its content, 23px between rows, and 35px between nodes. *Fixed.*
22. **design-check.** All exact rules pass; the Jev review is still incomplete.
    - Command: `agent-kit design check --project <session>/files/design-check-di004`, run with `--exact-only` and then with the Aber `.env`.
    - Before: `readable-type` 135, `hit-area` 33, `accessible-name` 4, `responsive-overflow` 2.
    - After: 0 failures. `readable-type`, `hit-area`, `accessible-name`, `type-size-count`, `row-padding`, `transition-properties` and the source rules all pass.
    - Jev: TypeSafe answered `HTTP 400 {"error_type":"max_tokens_exceeded"}`. The request was over its input-token limit, which is about 38–40k tokens. The cause was not image count or the key name.
      - The full design model (35k characters) pushes the Columns cases over the limit. The DI-004 config now sends a 16k-character excerpt with the Brief, Concepts, matrix and Surface sections. With it, `c-columns` completed (36k input tokens), but Jev returned "uncertain" on 45 rules.
      - `c-columns-menu` has 3 frames of about 100 nodes each and exceeds the limit even with no design model. Completing it needs narrower case selectors (a case change, which I didn't make) or a kit change, such as one request per frame.
    - *Open.*

## DI-005 · Expanded Dumps are long, hard to read and poorly designed

**Status:** exploring
**Concepts:** Dump, and the Signals and drafts distilled from it. A Dump is Maggie's raw input and a Signal is a distilled observation with provenance, so they must not be treated as interchangeable.
**Surfaces:** the dump log expansion (`dump-log.tsx`) and the inspectDump viewer

**Maggie's observation (verbatim):** "I'd extend that to the dumps area: when those are expanded, they're extremely long and hard to read and generally poorly designed. … Both of these need significant rethinks from the ground up."

**Exploration:** shared with DI-004. It looks for one summary-to-detail grammar that keeps the different roles of Dump and Signal and their source relationships.
**Decision:** option C (passages interleaved with what they made), chosen alongside DI-004's provenance trail. The DI-004 detail pass covers both.

---

## DI-006 · Freshness and attention markers sit in inconsistent places, crowd their neighbours and have unclear meanings

**Status:** exploring
**Concepts:** "new" (fresh), challenge and open-theme markers on Theory, Theme and Signal
**Surfaces:**
- the theory pane (`.pn-line`)
- Columns (`.cd-line`)
- the sidebar theme index (`nav.cur-index a`)
- Theory cards (`.ap-card`)
- the theme feed (`.pn-ev`)
- Briefing (`.br-title`)
- Atlas (`.a2-region`)

**Related:** DI-001 (object grammar) and DI-003 (sidebar rows)

**Maggie's observation (verbatim):** "I find there's an issue with these "like" markers that something is new or needs attention. We have some that are green, some that are blue, and some that are red. The larger problem is that they are always in a different place in the interface. Sometimes they are between items, next to items, or on the corner of items — they are extremely inconsistent in position, which is really problematic. Also, overall their placement feels too squished; there isn't enough space between them and surrounding elements. Sometimes they are to the left of text, sometimes to the right. They can be to the left of a number or to the right of a number; sometimes they're in the top left, sometimes in the top right. There's absolutely no consistency in where they appear or how they display, which makes them extremely difficult to look at or reason about. Some options to consider: I don't even know if we need to show these all the time. It's unclear how useful the markers are, especially if they're constantly moving and it's not clear what they're supposed to mean."

**Open questions:**
- Should markers be in a consistent position?
- How much breathing room should they have?
- Should they appear only when they're useful, or not at all?

**Constraints:**
- Consequential states, such as a challenge, must stay reachable.
- No meaning may rely on colour alone.

**Exploration:** [`design/explorations/di-006-markers/`](../design/explorations/di-006-markers/index.html), shared with DI-007.
**Decision:** none yet.

## DI-007 · The "building" prototype status is an isolated blue

**Status:** exploring
**Concepts:** Prototype status (idea → building → built → shelved)
**Surfaces:** the Prototype detail `.pn-status` radio group, and status glyphs wherever they appear
**Related:** DI-006. The same blue also means "new" (the encoding clash noted in design-model §5).

**Maggie's observation (verbatim):** "This blue color on the prototype screen appears to be one of the only blue elements in the entire interface, which I don't think we should have if green is our primary colour. I don't see why we wouldn't opt for a green element instead."

**Constraint from the coordinator:** use green as she prefers, but keep prototype status distinct from freshness and from the other meanings green carries. Green must not silently mean the same thing everywhere.

**Exploration:** shared with DI-006.
**Decision:** none yet.

## DI-008 · The draft theme header (Robotics) is poorly spaced, styled and aligned

**Status:** exploring
**Concepts:** Theme, in its draft (agent-created) and mine (accepted) states
**Surfaces:** the Theme sections heading `.cur-theme` / `.cur-theme-name[data-draft]` (`current.tsx:59`)
**Related:** DI-001 (the "not yet mine" encoding) and DI-002 (creation looks like the final object)

**Maggie's observation (verbatim):** "This design of what I think is a suggested theme is really bad. The spacing is bad, the styling is bad, and it's misaligned with the rest of the interface. It all just seems like it needs work."

**Verified findings:**
- Robotics is a **draft theme** that the agent created. The demo seed has `status: 'draft'` (`app/server/src/db/demo-seed.ts:41`). It is not a Suggestion: design-model §4 says new themes arrive as drafts.
- The draft is shown by a 1px dashed outline with a 2px offset around the heading button (`app/web/src/app/production.css:13`). It sits beside the signal count and a "State a theory" button.
- Accepting or rephrasing the draft makes it mine. The ownership distinction must be kept.

**Exploration:** [`design/explorations/di-008-draft-theme/`](../design/explorations/di-008-draft-theme/index.html)
**Decision:** none yet.

---

## DI-009 · An X is used to reject a suggestion. Rule: X only closes transient UI

**Status:** decided (the rule). The inventory below is still to be fixed.
**Concepts:** Suggestion (challenge, evidence, revision, merge), and draft decisions
**Surfaces:** the tripwire hit (`.tw-tc > .tw-unfold > .tw-hits > .tw-hit > .ab-sigcard`, `app/web/src/ui/tripwire.tsx:46–47`), plus every suggestion and draft decision in the app
**Related:** DI-002, where X is reserved for the modal close button in the top-right corner

**Maggie's observation (verbatim):** "This component has a cross next to the accept button, which feels like — yeah, it's just bad design. If the cross button is dismissing something, the dismiss should be on the left of the accept. Accept should be on the right as the primary action, and dismiss should be a secondary action to the left of accept. The X close button should only be used for a temporary element on screen, like a modal or a card, where you click X to close it. If we're dismissing a suggestion that a model has made, that needs to be a dismiss button to the left of an accept/save/confirm button. Never use an X to mean "discard this suggestion." We only use X to close a fleeting interface item."

**Rules (decided by Maggie; recorded in design-model §5 "Rules carried into every surface"):**

1. X only closes a fleeting surface, such as a modal, popover or transient card. Never use it to discard a suggestion, draft or proposal.
2. Rejecting a model suggestion uses a labelled secondary **Dismiss** button.
3. Dismiss sits to the **left** of the primary Accept, Save or Confirm button, which sits on the right.

**Verified behaviour of the target:**

- Current markup: `Accept` (`ap-btn`, titled "Accept and lower confidence"), followed by an icon-only X (`.tw-dismiss`, aria-label "Dismiss").
- Accepting a challenge lowers the theory's confidence by one, with a floor of 1. It appends the stance "Lowered: <signal gist>" and can be undone.
- Accepting requires the theory to have a confidence already set (`app/server/src/tools/suggestions.ts:95–99`).
- Dismissing marks the challenge `discarded`.
- The effect on confidence is currently stated only in the button's `title` tooltip.

**Inventory:** checked against the code on 2026-11-03. There are **10 violating surfaces** and **2 borderline cases**.

The violation types are:

- **a**: an X discards a suggestion or a draft
- **b**: Accept and Dismiss are in the wrong order
- **c**: an icon-only dismiss button with no label

| Code location | Surface | Kind | Current | Types |
| --- | --- | --- | --- | --- |
| `ui/tripwire.tsx:45–47` | Tripwire hit in the theory pane and Columns | challenge; accepting lowers confidence by 1 and can be undone | Accept (effect shown only in a tooltip), then an X | a b c |
| `ui/panes.tsx:143` | Theory pane, Draft row | draft theory | check icon "Accept (A)", then X "Discard (X)" | a b c |
| `ui/panes.tsx:202` | Theme pane chips | draft theme | Accept, then X "Discard draft theme" | a b c |
| `ui/panes.tsx:288` | Prototype pane chips | draft prototype | Accept, then X "Discard draft prototype" | a b c |
| `ui/briefing-app.tsx:90` | Briefing decision row | challenge, evidence, revision, merge or draft | Accept, then X "Dismiss/Discard (X)" | a b c |
| `ui/briefing-app.tsx:90`, with line 39 | Briefing "New signals" group | **signals that already exist**; the X runs `discardSignal` on the whole group | Accept, then X "Discard (X)" | a b c |
| `ui/suggestion-review.tsx:27` | Suggestion review, both in the pane (`suggestion-preview.tsx:54`) and in Briefing "Review" | evidence, revision or merge (a merge can't be undone) | Accept, then a Rephrase icon, then an X | a b c |
| `chat/object-card.tsx:24` | Chat proposal card | draft theory, theme or prototype | Accept, then a Rephrase icon, then an X | a b c |
| `ui/pill-study.tsx:297–298, 316` | Pill DraftView (`.ps-draft-edge`) | draft theory or revision | check icon, then X | a b c |
| `ui/draft-edge.tsx:55–58` | Draft edge on cards, shown on hover in Current (`current.tsx:24`) and Columns (`columns2.tsx:219`) | draft theory | X at the top-right, check icon at the bottom-right, stacked | a c |

**Borderline cases:**

- `suggestion-review.tsx:24`: in rephrase mode, "Accept wording" comes first and an X labelled "Cancel rephrase" sits to its right. The X is in the wrong position, and it uses X for an edit mode inside a persisted card.
- `briefing-app.tsx:90`: for a near-duplicate merge, "Undo merge" (labelled) sits on the left and "Keep merge" is a check icon on the right. The order is right, but the primary action has only an icon.

**Related:**

- The dialog footer's Cancel X (`app/dialogs.tsx:44`, also used by Rephrase draft) is tracked in DI-002.
- **Decided by Maggie on 2026-11-03: remove or change the X discard shortcut.** She has made no wider rule about single-key shortcuts.
  - Current bindings, all bare single keys with no modifier:
    - `ui/app-shell.tsx:191–193`: an open draft in the pane runs `discardDraft`.
    - `ui/briefing-app.tsx:49, 55`: the current Briefing item is decided as `discarded`, and that item can be any suggestion, a draft or a group of new signals.
    - `ui/draft-edge.tsx:47–53`: a focused draft-edge card is discarded.
  - Tooltips advertise "(X)" at `panes.tsx:143, 202, 288`, `briefing-app.tsx:90`, `pill-study.tsx:298` and `draft-edge.tsx:55–58`.
  - **Maggie's decisions:**
    1. X no longer discards.
    2. Nothing replaces it: there is no keyboard shortcut for dismissing a suggestion or discarding a draft. (She chose "No replacement shortcut" on 2026-11-03.)
  - **For implementation, not yet done:**
    - Remove the X binding from all three handlers.
    - Drop "(X)" from the tooltips.
    - Keep A for Accept, and keep U for "Undo merge" on near-duplicates.
    - Dismiss stays reachable by Tab, since it comes before Accept in the DOM.
- **Decided by Maggie on 2026-11-03: the label depends on the object.** Rejecting a **suggestion** (evidence, revision, merge, challenge or tripwire match) reads **Dismiss**. Removing a **draft** (theme, theory or prototype) reads **Discard**. The stored status `discarded` is internal and doesn't change. Mixed surfaces like the Briefing row label each item by its kind.
- **Current behaviour, not a decision:** signals are discarded today. The model and code call it Discard (`design-model.md` signal concept; `discardSignal`, used by the Briefing "New signals" group at `briefing-app.tsx:39`). Maggie's choice covers suggestions and drafts only.
- **Open, flagged:** signals the agent extracts from a dump arrive unreviewed in Briefing's "New signals", so they behave like model suggestions but are persisted objects, not drafts or Suggestions. Whether they read Dismiss, Discard or something else is undecided. App labels change only once a direction is chosen.
- Ten X uses were checked and are legitimate, because they close a transient pane, panel or banner (for example `columns2.tsx:113`, `atlas2.tsx:350`, `app-shell.tsx:257` and `:285`). Other X uses remove a chip or clear a filter. The remove and clear uses (`timeline2-shared.tsx:117`, `panes.tsx:113` "Remove evidence", attachment chips in `pill-study.tsx`) are outside this rule but worth reviewing.

**Exploration:** none needed, because the rule is decided. Any open questions about Dismiss styling or the density of the suggestion card go into the DI-004 (expansion) and DI-006 (markers) jigs.
**Decision:** the rule is set. Next, fix every inventory row.
