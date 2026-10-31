# Handoff: continuing the Aber design

To the next agent: this note is everything you need to pick up the work without the earlier conversation or access to Claude Design.

## What Aber is

Aber is a personal tool for Maggie (Maggie Appleton, a design engineer at GitHub Next). It's for developing theories of the near future in technology, software development and agents. She dumps raw material: X links, articles, long voice notes. Agents split it into **signals**, file them into **themes**, and propose evidence and drafts. She states **theories** (claims that could be wrong), extrapolates their second- and third-order effects, and spins up **prototypes**. The core idea is to separate what she has *seen* from what she *claims*, and to design around claims that can turn out wrong.

v1 is for her alone, on an iPhone and two MacBooks, over Tailscale. Multiplayer (up to about 10 people) comes later.

## Where things are

| Read | For |
| --- | --- |
| [docs/design-model.md](design-model.md) | **The source of truth.** Brief, concepts, authority rule, verb table, relationships, de-duplication, agent jobs, spatial model, behaviour, open questions |
| [design/space-and-motion/index.html](../design/space-and-motion/index.html) | Every design board with screenshots and descriptions. Standalone HTML in `boards/`, PNGs in `screenshots/`, original Claude Design sources in `source/` |
| [docs/design-exploration.md](design-exploration.md) | What was tried, decided and rejected, plus the feedback log. Read it before proposing anything, so you don't re-propose rejected ideas |
| [docs/hosting-guide.md](hosting-guide.md) | Step-by-step setup for hosting Aber privately over Tailscale, with costs. Hosting is still undecided: own server vs the team's Coolify server |
| [docs/reference/interface-grammar.md](reference/interface-grammar.md) | Maggie's design method. **Follow it.** |

The live Claude Design canvas is private to Maggie: https://claude.ai/artifact/684MAujZZHLPsVor9fVDBj. You don't need it; the export holds all of it.

## How Maggie wants interfaces designed

The full method is in `reference/interface-grammar.md`. The essentials:

1. **Work in layer order:** grammar (nouns and verbs), then space (tiers, attachment, origin, persistence), then material and motion, then surface. Never sketch screens and reverse-engineer the concepts.
2. **Nothing arbitrary.** Every visible element must express a concept, state, elevation or affordance in the model.
3. **Elevation encodes transience.** Use one elevation and shadow scale. Things come from somewhere and leave the way they came. Only one transient layer at a time.
4. **Audience is Fluent.** Icon-first, with at most one text button per surface. Discovering things by exploring is fine.
5. **No filler text.**
6. **Mobile matters too.** Hover needs a touch equivalent, and every surface states how it transforms on a narrow screen.
7. **One meaning per visual variable.** Here, a dashed border means only "not yet yours" (an agent draft or suggestion).
8. **She judges visually.** Show space and motion as visuals she can look at, not as prose.

## Working preferences

- **Writing:** British English. Tables over dense prose. Sources linked inline. Screenshots in docs.
- **Honesty:** state explicit confidence levels (high / moderate / low). Disagree when warranted, without apologising. Never invent facts.
- **Delegation:** hand implementation and research to cheaper subagents where you can.
- **Repo:** at `~/Projects/aber`. She commits herself, so leave changes staged unless asked.

## Next steps, in order

1. **Get answers to the open questions** in section 6 of the design model. The ones that block further design work are:
   - base plane at scale (board A2) and whether to add a **Pin** verb;
   - whether the compass directions are right;
   - whether each chat message is stored as a Dump;
   - where drafts live and whether they expire.
2. **Layer 4, surface.** The current boards are wireframes. Produce, in this order:
   - an encoding map (what accent colour, weight, border and shadow each mean);
   - type, colour and spacing tokens;
   - the justification ledger for each screen;
   - real states for every interactive element.

   Commit to a look with Maggie first. Show her 2–3 visual directions on the World and Theory screens, not the whole app.
3. **Run the review gate** from the method over the whole model, and report findings with the most fundamental layer first.
4. **Plan the build** once the design settles. Agreed so far:
   - SQLite behind a typed tool layer, so agents never touch the database directly;
   - every write records its actor;
   - confidence stored as an append-only stance;
   - capture via an Apple Shortcut posting to a dump endpoint;
   - Litestream backups.

   Not decided: front-end stack and hosting. Maggie is learning Svelte 5 and TypeScript, coming from React. That's context, not a decision.

## Things not to redo

These were explored and rejected; see the log for why:

- Question as a noun.
- Markdown or Obsidian as the store or interface.
- Postgres for v1.
- A "Bet" state.
- A full-width capture bar.
- A docked conversation panel.
- A prototypes strip on the World page.
- Option B as the base plane.
