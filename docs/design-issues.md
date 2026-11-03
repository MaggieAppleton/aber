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

**Status:** scoped. The first jig's scope is waiting for review.
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

**Proposed first exploration:** one vocabulary for object references. A reference to a Theory, Theme, Signal or Prototype inside another object should carry the same type marker and form wherever it appears. The jig would use the theory pane, Columns and Briefing as context. It won't be built until the scope is approved.
**Exploration:** none yet. **Decision:** none.

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

---

## DI-003 · Sidebar navigation: prototypes sit at the bottom and rows misuse chevrons

**Status:** exploring
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
**Decision:** none yet.

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
**Decision:** none yet.

## DI-005 · Expanded Dumps are long, hard to read and poorly designed

**Status:** exploring
**Concepts:** Dump, and the Signals and drafts distilled from it. A Dump is Maggie's raw input and a Signal is a distilled observation with provenance, so they must not be treated as interchangeable.
**Surfaces:** the dump log expansion (`dump-log.tsx`) and the inspectDump viewer

**Maggie's observation (verbatim):** "I'd extend that to the dumps area: when those are expanded, they're extremely long and hard to read and generally poorly designed. … Both of these need significant rethinks from the ground up."

**Exploration:** shared with DI-004. It looks for one summary-to-detail grammar that keeps the different roles of Dump and Signal and their source relationships.
**Decision:** none yet.
