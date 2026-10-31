> Copy of Maggie's interface-grammar design skill, as used for Aber on 31 Oct 2026. The original lives in her skills; this copy is for agents without access to it.

# Interface Grammar

An interface is a small physical world built to make a set of concepts graspable and manipulable. Design it from meaning outwards, never from pixels inwards.

This skill is for **apps and tools** — web, desktop and mobile; product design tools, agentic tools, prototypes — where the work is defining primitives for something new or adding to something that exists without breaking its consistency. It is not for landing pages or marketing sites.

## The four layers (always in this order)

| # | Layer | The question it answers | Output |
|---|-------|-------------------------|--------|
| 1 | **Grammar** | What things exist, what is each for, what can be done to them? | Concept cards, object–action matrix |
| 2 | **Space** | Where does each thing live, how high does it sit, how long does it last, what is it attached to? | Elevation stack |
| 3 | **Material & motion** | How does each surface behave when approached, touched, summoned, moved, dismissed? | Behaviour table |
| 4 | **Surface** | What is the least visible mark that makes each concept, action and state perceivable? | Screens / components / code |

Layer 4 is the *last* decision. Never sketch screens and then reverse-engineer the concepts from them. Variants that differ only at layer 4 are not different ideas.

## Audience (set it first — it changes the rules)

| Audience | Default when | Labels | Discoverability |
|----------|--------------|--------|-----------------|
| **Fluent** | Default. Maggie, her collaborators, developers, prototypes | Icon-only is normal. Text buttons only for the primary action. | Exploration is expected and fine. Hover-revealed controls, gestures and drag affordances need only a signifier on approach. |
| **General** | Only when the brief says so | Labels on icons that aren't universally understood. | Core actions visible at rest. |

Unless the brief says otherwise, design for **Fluent**.

## Modes

**Design** (greenfield)
1. Brief: who, audience, posture, purposes, context of use, devices.
2. Write the Design Model (template at the end), layers 1–3, and show it to Maggie *before any UI code*. If she says skip ahead, give a compressed version inline; never skip it silently.
3. Build the surface. Every visible element traces to the model. Untraceable elements are deleted.
4. Run the review gate before presenting. When orchestrating, run it in a separate subagent (Sonnet) that sees only the brief, the model and the output.
5. Save the model in the repo at `docs/design-model.md` so later work can extend it.

**Extend** (adding a feature to an existing app)
1. Read `docs/design-model.md` if it exists; otherwise reconstruct the implied model from the code and UI first and save it.
2. Place the new feature *into the existing grammar*: reuse existing nouns and verbs before adding any. A new concept needs a purpose no existing concept serves.
3. Reuse existing tiers, origins, motion and the encoding map. A new surface type, tier or visual meaning is a decision to flag to Maggie, not a default.
4. Review against the whole model, not just the new feature. Update the saved model.

**Brainstorm** (exploring directions)
Generate alternatives at layers 1 and 2: different concept sets, spatial metaphors, objects of interest. Present each as concepts plus a spatial sketch before any visual treatment.

**Review** (strengthening an existing app)
Reconstruct the implied model from what is on screen, write it down, then diff it against a better model. Report findings highest layer first: a wrong noun outranks a wrong shadow.

## Hard rules

1. **Nothing arbitrary.** Every card, border, divider, colour, shadow, icon, label and animation expresses a concept, relationship, state, elevation or affordance recorded in the model. "Balances the layout" is not a reason.
2. **Start bare, add with justification.** First render: objects of interest plus one primary action; everything else latent. Each addition names what it serves and what fails without it.
3. **Elevation encodes transience.** The more temporary, the higher. The more permanent, the closer to the base plane.
4. **One world, one physics.** One light source, one elevation scale, one set of motion rules. Shadow, z-order, entry and exit tell the same physical story.
5. **Things come from somewhere.** Surfaces enter from where they live and leave the way they came.
6. **Physical before verbal.** Change spatial attributes (size, order, position, grouping) by moving the thing itself. Each such affordance gets a signifier on approach (cursor change, handle, edge highlight) and a keyboard shortcut.
7. **Icon-first.** At most one text button per surface, for the primary action. Everything else is an icon button with an accessible name, and a tooltip on hover and keyboard focus showing the name and shortcut.
8. **No filler text.** No instructional copy, no labels restating what a shape says, headings only to tell groups apart, empty states show the action not a paragraph.
9. **Alive, not static.** Elements respond to approach, hover, focus and press, and expand in place to reveal more. Motion is responsive, interruptible and redirectable, and never slows a frequent action.
10. **One meaning per visual variable.** Accent colour, weight, border, shadow and icon each mean one thing across the app.
11. **Touch is a different physics, not a lesser one.** Hover doesn't exist on touch. Anything revealed on hover needs a touch trigger (select-to-reveal, long-press, swipe, or an overflow menu). Every surface states how it transforms on narrow screens.
12. **Some things never hide.** Errors, destructive consequences and the current state of an object are never only in a tooltip or behind hover.

## Layer 1 — Grammar

A conceptual model is not the UI: no layout, widgets or navigation. If you write "a sidebar with…", you have jumped ahead.

**A. Purposes.** List what users are trying to get done as outcomes ("know whether the agent's work is safe to merge"). Every concept serves a purpose; a purpose with no concept is a gap; a concept with no purpose is clutter.

**B. Harvest and challenge nouns.**

| Challenge | If it fails |
|-----------|-------------|
| Would a user say this word unprompted? | Rename to their word, or hide it |
| Implementation detail (table, job ID, webhook)? | Keep it out of the interface |
| Synonym of another candidate? | Merge; one name everywhere |
| Serves two unrelated purposes? | Split it (overloaded) |
| Two candidates serve one purpose? | Merge or drop one (redundant) |
| A familiar concept already does this (folder, tag, comment, draft, undo)? | Reuse it with its familiar behaviour |

**C. Concept card per survivor** (after Daniel Jackson, *The Essence of Software*):
```
Concept: <user's word>
Purpose: <one sentence, no "and">
State: <what it remembers>
Actions: <user verbs; system verbs>
Operational principle: If you …, then …
Relationships: <contains / references / synchronised with>
Lifetime: permanent / session / task / moment   ← feeds layer 2
```

**D. Object–action matrix** (after Daniel Rosenberg, *UX Magic*). Objects as rows, verbs as columns. Look for:
- sparse cells among similar objects (arbitrary exceptions users must memorise)
- synonym verbs (remove / delete / archive / discard), collapsed to the fewest distinct meanings
- verbs with no object, usually a hidden concept
- objects with only system verbs: does it need to be visible?

**E. Relationships and attributes** (after Sophia Prater's ORCA). Every object is reachable from its related objects; every action sits on or beside its object. Rank attributes as glanceable (at rest), on-demand (hover/expand) or rare (detail view).

**F. Group by co-use**, not by data type or team.

The nouns are right when each purpose maps to one or two concepts, the system can be explained using only concept names and operational principles, no purpose needs "and", and no word on screen prompts "what's that?".

## Layer 2 — Space

Every non-base surface gets four properties: **tier, attachment, origin, persistence**. If you can't state all four, the surface isn't designed.

| Tier | Name | Persistence | Relation to below | Enters from | Typical |
|------|------|-------------|-------------------|-------------|---------|
| 0 | Base plane | Permanent | Is the world | — | Canvas, document, objects of interest |
| 1 | Docked chrome | Session | Docked: pushes content | Its edge | Sidebar, toolbar, inspector |
| 2 | Raised objects | Session/task | Rests on base; lifts when picked up | In place | Draggable or expandable cards |
| 3 | Overlay sheets | Task | Covers content, casts shadow | Its edge | Slide-over detail, peek panel |
| 4 | Tethered floats | Moment | Anchored to an origin element | Grows from trigger | Popover, menu, hover card |
| 5 | Modal | Task, blocking | Floats above a paused, dimmed world | Trigger, or centre | Confirmation, focused editor |
| 6 | Ephemeral | Seconds | Above all, never steals focus | Nearest edge | Toast, status |
| 7 | Tooltip | While hovered/focused | Tethered | Its trigger | Icon name and shortcut |

Rules:
- **Transience order = tier order.** If something more permanent sits above something more temporary, fix the tier or the persistence.
- **Attachment**: is it a *peer* of the content (docked, pushes, no shadow, at most a seam), *serving* the content for a while (overlaying, covers, casts shadow), or *belonging* to one element (tethered, grows from it)?
- **Origin and return**: tethered surfaces set `transform-origin` to the trigger; expanding objects grow from their own bounds.
- **Light**: shadow means "above" and nothing else. Shadow grows with tier; same tier, same shadow; no decorative shadow on tier 0. In dark themes, express elevation by lightening the surface.
- **One transient layer at a time.** No modals on modals, no popovers in popovers.
- **Functional layer above content layer** (Apple's Liquid Glass model): controls dock or float above the content they act on; they don't sit in it as if they were content.
- **Lift is a promise**: only liftable things rise on hover or press.
- **Spatial consistency**: the same object always lives in the same place and tier; going "deeper" always moves the same direction.
- **Posture** (Alan Cooper): sovereign apps (full-screen for hours) want quiet, minimal chrome; transient tools can afford more explicit controls.
- **Responsive transformation**: state for each surface what happens on narrow screens. Typically: docked sidebar → overlay sheet from the same edge; tethered popover → bottom sheet; inspector → overlay sheet. Tier and origin stay coherent.

Web implementation: elevation tokens (`--elevation-0…7` as shadow + z-index + surface colour; z-index only from tokens); animate `transform` and `opacity` only; docked surfaces resize the grid, they don't overlay it; Popover API and CSS anchor positioning for tethered surfaces, and View Transitions or FLIP for continuity (check current browser support, provide a fallback); honour `prefers-reduced-motion` with cross-fades while keeping the spatial logic.

Side-elevation sketch:
```
  toast        ▔▔▔▔                         (6, ephemeral, bottom edge)
  menu           ▔▔▔▔                       (4, tethered to ⋯)
  detail sheet         ▔▔▔▔▔▔▔▔▔▔▔          (3, overlays, from right)
  card     ▔▔▔▔▔ ▔▔▔▔▔                      (2, lifts on drag)
  sidebar ▕▔▔▔▔▔▏                           (1, docked, pushes)
  base    ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁  (0)
```

## Layer 3 — Material and motion

- **Direct manipulation** (Shneiderman): the objects of interest are continuously visible; actions on them are physical, rapid, incremental and reversible, with immediate visible effect.
- **Fluid** (Apple, *Designing Fluid Interfaces*, WWDC 2018): feedback within about 100 ms; animations interruptible and redirectable; dragged things follow the pointer 1:1 and carry momentum; springs for anything the user moves.
- **Motion carries meaning**: entry direction = origin; exit reverses entry; duration scales with distance; no decorative motion. If you can't say what an animation tells the user, remove it.
- **Expand in place** while it's the same object: the search field widens on focus, the card grows into its detail, the row reveals secondary attributes. Navigate away or detach only when the user is now working with a different object.
- **Signifiers** (Norman): an affordance nobody can perceive doesn't exist. For Fluent users a signifier on approach is enough; it doesn't need to be visible at rest.

Behaviour table, one row per interactive element (an empty cell means "no change", which is a decision):

| Element | Rest | Approach | Hover / focus | Press | Drag | Expanded | Exit | Touch |
|---------|------|----------|---------------|-------|------|----------|------|-------|

## Layer 4 — Surface

- **Justification ledger**: every visible element gets a line saying what it expresses and what fails without it. No line, no element.
- **Semantic encoding map**: declare what each visual variable means (accent colour, shadow, border, weight, icon). One meaning each; one icon per verb or object type, used identically everywhere.
- **Progressive disclosure ladder**: rest → approach → hover/focus → press/select → expand → detach. Place each attribute and action on the lowest rung where it's needed, using the attribute ranking from layer 1.
- Use the layer 1 concept names exactly, everywhere.

## Review gate

Each item is Pass, Fail or N/A, with evidence (file and line, screenshot region, model section). Any **blocking** failure means not ready.

**Grammar (blocking)**: every purpose maps to one or two concepts · every concept has a card with a single-purpose sentence and an operational principle · the matrix exists, with gaps filled or justified · no synonym nouns or verbs · no implementation nouns visible · on-screen names match the model · *(Extend)* no new concept duplicates an existing one.

**Space (blocking)**: every surface has tier, attachment, origin and persistence · tier order matches transience · docked pushes, overlay covers and shadows, tethered grows from its trigger · shadows and z-index come only from tokens · no decorative tier-0 shadow · one transient layer at a time · posture stated · narrow-screen transformation stated per surface · *(Extend)* no new tier or surface type unless flagged.

**Material and motion (blocking for interactive work)**: rest, hover, focus and press defined · spatial attributes directly manipulable with signifier and shortcut · hover-revealed things have a touch trigger · entry and exit mirror, with origins set · interruptible · reduced motion handled · nothing slows a frequent action.

**Surface**: **(blocking)** justification ledger complete · **(blocking)** every icon button has an accessible name · at most one text button per surface · encoding map followed · no filler text, redundant labels or decorative icons · errors, destructive consequences and state never hidden.

Report: (1) verdict, Ready or Not ready, with the blocking count; (2) findings table, highest layer first: Gate | Item | Verdict | Evidence | Fix; (3) deletion candidates; (4) concept-level questions for Maggie.

## Shared vocabulary

| Term | Meaning |
|------|---------|
| Concept | Self-contained unit of functionality with one purpose, its own state and actions (Jackson) |
| Purpose | Why a concept exists, in the user's terms, in one sentence without "and" |
| Operational principle | Archetypal "if you do X, then Y" scenario showing a concept fulfilling its purpose |
| Grammar | The objects and actions of the system, before any presentation (Rosenberg) |
| Object–action matrix | Objects as rows, verbs as columns; sparse or inconsistent cells signal cognitive load (Rosenberg) |
| System image | Everything the interface shows that lets users build their model of it (Norman) |
| Object of interest | The domain thing users care about, not the menus and forms around it |
| Instrument | A tool that acts on an object of interest (handle, slider, brush) |
| Signifier | Perceivable cue that an action is possible; distinct from the affordance (Norman) |
| Base plane | Tier 0, where objects of interest live |
| Docked / overlaying / tethered | Pushes content / covers it / anchored to an origin element |
| Persistence | permanent · session · task · moment |
| Origin | The element or edge a surface comes from and returns to |
| Posture | Sovereign vs transient; sets the chrome budget (Cooper) |
| Functional / content layer | Controls float above the content they act on (Apple) |
| Progressive disclosure ladder | rest → approach → hover/focus → press/select → expand → detach |
| Fluid | Responsive, interruptible, redirectable (Apple, WWDC 2018) |

## Design Model template

Save as `docs/design-model.md`.

```markdown
# Design Model: <app or feature>

## 0. Brief
Who · Audience (Fluent/General) · Posture · Devices · Context of use
Purposes:
1.

## 1. Concepts
### <Concept>
Purpose · State · Actions (user/system) · Operational principle · Relationships · Lifetime

## 2. Object–action matrix
| Object \ Action | | | |
Intentional gaps:
Attribute ranking per object (glanceable / on-demand / rare):

## 3. Spatial model
| Surface | Tier | Attachment | Origin | Persistence | Narrow screen | Why |
Side-elevation sketch:

## 4. Behaviour
| Element | Rest | Approach | Hover/focus | Press | Drag | Expanded | Exit | Touch |

## 5. Surface
Primary action per surface:
Encoding map: | Variable | Meaning |
Justification ledger: | Element | Expresses | What fails without it |

## 6. Open questions for Maggie
```