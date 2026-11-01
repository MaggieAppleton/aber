# Handoff: Aber

To the next agent: this note is everything you need to pick up the work without the earlier conversations. Updated 1 Nov 2026.

## What Aber is

Aber is a tool for Maggie (Maggie Appleton, a design engineer at GitHub Next) for developing theories of the near future in technology, software development and agents. She dumps raw material: X links, articles, long voice notes. Agents split it into **signals**, file them into **themes**, and propose evidence and drafts. She states **theories** (claims that could be wrong), writes what would change her mind, and spins up **prototypes**. The core idea is to separate what she has *seen* from what she *claims*, and to design around claims that can turn out wrong.

v1 is for her alone, on an iPhone and two MacBooks. It runs on the team's Coolify server, so it is a work tool. Multiplayer (up to about 10 people) comes later.

## Where we are

The design is settled for v1. One decision is open: the **agent framework**. After that, an overnight agent builds v1 from the build spec.

## Where things are

| Read | For |
| --- | --- |
| [docs/design-model.md](design-model.md) | **The source of truth.** Concepts, the authority rule (and its one exception), verbs, relationships, surfaces, behaviour, encoding map, the one open question |
| [docs/build-spec.md](build-spec.md) | **For the build agent.** Architecture, SQL schema, typed tool layer, agent interface and jobs, interface spec by surface, slices with acceptance criteria and Playwright checks, rules |
| [docs/agent-architecture-research.md](agent-architecture-research.md) | The agent framework options (being written). The decision gets recorded here |
| [design/decisions.json](../design/decisions.json) | Every pick and note, made on the jigs. Already folded into the model and spec |
| [jig/](../jig/) | Interactive jigs. `cd jig && bun install && bun run dev`, then http://localhost:5181. **[`/app`](http://localhost:5181/app) is canonical** for the whole app; **[`/reference`](http://localhost:5181/reference)** indexes every canonical route and its constants; [`/decide`](http://localhost:5181/decide) holds the decisions |
| [docs/design-exploration.md](design-exploration.md) | History: what was tried, decided and rejected up to 31 Oct. Read it before proposing anything, so you don't re-propose rejected ideas. Where it disagrees with the model, the model wins |
| [docs/hosting-guide.md](hosting-guide.md) | Tailscale, Litestream, B2 and the iPhone Shortcut, written for a personal server. Section 4.12 of the build spec says what changes on Coolify |
| [docs/reference/interface-grammar.md](reference/interface-grammar.md) | Maggie's design method. **Follow it.** |
| [design/space-and-motion/index.html](../design/space-and-motion/index.html) | The earlier space-and-motion boards. Historical: superseded by `/app` where they differ |

## Jig routes

| Route | Shows | Status |
| --- | --- | --- |
| `/app` | The five views, the shared object pane and dump or ask, in one frame | Canonical |
| `/reference` | Index of canonical routes and constants | Canonical index |
| `/details` | Tripwire (variant C) and confidence sparkline (variant A) in the theory pane | Canonical for those two |
| `/pill` | Dump-or-ask pill and column (B2), details, phone | Canonical |
| `/atlas` | Atlas: circles, Paper, signals revealed on zoom | Canonical for the picked variants |
| `/timeline` | Field 2 (one hop, level badges, Follow chain) | Canonical for Field 2 |
| `/columns` | Columns folding to rails | Canonical for rails |
| `/icons` | Phosphor object icons | Picks applied in `OBJECT_ICONS` |
| `/decide` | All decisions with notes | Record |
| `/homes`, `/objects`, `/decisions`, `/boards` | Earlier explorations | Historical |

## How Maggie wants interfaces designed

The full method is in `reference/interface-grammar.md`. The essentials:

1. **Work in layer order:** grammar, then space, then material and motion, then surface.
2. **Nothing arbitrary.** Every visible element expresses a concept, state, elevation or affordance in the model.
3. **Elevation encodes transience.** One elevation and shadow scale. Things leave the way they came.
4. **Audience is Fluent.** Icon-first, at most one text button per surface.
5. **No filler or instructional text.** Expanded surfaces keep short field labels; nothing there is hover-only.
6. **One meaning per visual variable.** The encoding map is in section 5 of the model.
7. **Her UI rules:** no dot separators; no coloured left-hand margins, borders or bars; as few type sizes as possible; condensed and minimal.
8. **She judges visually.** Show things in a jig, not prose.

## Working preferences

- **Writing:** British English. Tables over dense prose. Sources linked inline.
- **Honesty:** state confidence (high / moderate / low). Disagree when warranted. Never invent facts.
- **Delegation:** hand implementation and research to cheaper subagents where you can.
- **Repo:** `~/Projects/aber`. Commit with explicit paths.

## Next steps, in order

1. **Decide the agent framework** with Maggie, from [agent-architecture-research.md](agent-architecture-research.md). She prefers OpenAI models for cost and may want both OpenAI and Anthropic. Record the decision in that file; the build spec's agent interface (section 5) is written so any candidate fits.
2. **Confirm with the Coolify server's owner** how the server joins Tailscale and that the app can stay off the public internet (build spec, assumption A3).
3. **Run the overnight build** from [build-spec.md](build-spec.md), slice by slice. The build agent leaves ambiguities in `docs/build-notes.md` rather than inventing.
4. **Review in the morning:** parity screenshots in `test-results/parity/`, `docs/build-notes.md`, and the known gaps in section 12 of the spec (dump log, Atlas layout for real data, the building-status blue).

## Things not to redo

Explored and rejected; see the exploration log for why:

- Question as a noun; Bet; Pin.
- Markdown or Obsidian as the store or interface; Postgres for v1.
- A full-width capture bar; a floating panel or separate mic button for dump or ask (now a docked column growing from the corner pill, with the mic inside).
- Zoom levels and the theory compass (now views plus one shared pane).
- A prototypes strip on the World page; Option B as the base plane.
- Deck, Document and River for v1 (deferred, not rejected).
