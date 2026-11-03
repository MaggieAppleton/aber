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
  - **Maggie's decision:** X will no longer discard. Whether to remove the shortcut or change it to another key is still open.
  - **Recommendation, pending her decision:** remove the X binding everywhere, and don't give discarding any other single key. Dismiss stays reachable by Tab, since it comes before Accept in the DOM, and an undo follows the discard. Drop "(X)" from the tooltips. Keep A for Accept, and keep U for "Undo merge" on near-duplicates.
  - **Still open:** remove the shortcut, or replace it? If she replaces it, the options are a different single key or a modified key such as ⇧D or ⌘⌫. Our recommendation is to remove it.
- Wording question: the model's verb is **Discard** for drafts and signals, while Maggie said **Dismiss** for suggestions. Keep both verbs by object type, or use one label?
- Ten X uses were checked and are legitimate, because they close a transient pane, panel or banner (for example `columns2.tsx:113`, `atlas2.tsx:350`, `app-shell.tsx:257` and `:285`). Other X uses remove a chip or clear a filter. The remove and clear uses (`timeline2-shared.tsx:117`, `panes.tsx:113` "Remove evidence", attachment chips in `pill-study.tsx`) are outside this rule but worth reviewing.

**Exploration:** none needed, because the rule is decided. Any open questions about Dismiss styling or the density of the suggestion card go into the DI-004 (expansion) and DI-006 (markers) jigs.
**Decision:** the rule is set. Next, fix every inventory row.
