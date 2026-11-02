# Handoff: Aber

To the next agent: this note is everything you need to pick up the work without the earlier conversations. Updated 1 Nov 2026.

## What Aber is

Aber is a tool for Maggie (Maggie Appleton, a design engineer at GitHub Next) for developing theories of the near future in technology, software development and agents. She dumps raw material: X links, articles, long voice notes. Agents split it into **signals**, file them into **themes**, and propose evidence and drafts. She states **theories** (claims that could be wrong), writes what would change her mind, and spins up **prototypes**. The core idea is to separate what she has *seen* from what she *claims*, and to design around claims that can turn out wrong.

v1 is for her alone. **This build round runs locally on her MacBook only.** The eventual home is the team's Coolify server, which makes it a work tool; that, phone capture and multiplayer (up to about 10 people) come later.

## Where we are

Maggie's subsequent live UI review is tracked in [UI issues](ui-issues.md). Follow its latest directions, especially stable Columns ordering, quiet selection and removing history from the capture pill. The older design-model sentence about pulling relatives to the top is superseded by her explicit correction in the build spec.

The local v1 app is implemented in `app/`: React/Vite, a Node API, SQLite and Vercel AI SDK 7 with its own job queue. The built app runs at `http://127.0.0.1:3000`. Start with [run instructions](../app/README.md), [verification](verification.md) and [build decisions](build-notes.md). The design context below remains the reference for future changes.

## Where things are

| Read | For |
| --- | --- |
| [docs/design-model.md](design-model.md) | **The source of truth.** Concepts, the authority rule (and its one exception), verbs, relationships, surfaces, behaviour, encoding map, implementation decisions |
| [docs/build-spec.md](build-spec.md) | **For the build agent.** Architecture, SQL schema, typed tool layer, agent interface and jobs, interface spec by surface, slices with acceptance criteria and Playwright checks, rules |
| [docs/agent-architecture-research.md](agent-architecture-research.md) | Why the agent stack is AI SDK 7 + an own SQLite queue, and the model plan per job (decided) |
| [design/decisions.json](../design/decisions.json) | Every pick and note, made on the jigs. Already folded into the model and spec |
| [jig/](../jig/) | Interactive jigs. `cd jig && bun install && bun run dev`, then http://localhost:5181. **[`/app`](http://localhost:5181/app) is canonical** for the whole app; **[`/reference`](http://localhost:5181/reference)** indexes every canonical route and its constants; [`/decide`](http://localhost:5181/decide) holds the decisions |
| [docs/design-exploration.md](design-exploration.md) | History: what was tried, decided and rejected up to 31 Oct. Read it before proposing anything, so you don't re-propose rejected ideas. Where it disagrees with the model, the model wins |
| [docs/hosting-guide.md](hosting-guide.md) | **Deployment.** The team Coolify server, Tailscale-only access, token auth, where API keys live, backups and the iPhone Shortcut. The personal-server (DigitalOcean) route was discarded on 2 Nov |
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

1. **Review the working local app:** all v1 slices have been implemented. Evidence and deliberate exceptions are in [verification](verification.md); do not rebuild the app from scratch.
2. **Personal-material evals:** 36 synthetic fixtures, the original provider comparison and targeted follow-ups are retained in `app/evals/`. Five separately versioned processing cases add full articles, a long transcript, physical robotics and revision/dedup checks. Add Maggie's real dumps later without rewriting the historical scores.
3. **Review in the morning:** screenshots in `app/test-results/parity/` and `reports/`, plus `docs/build-notes.md`. The optional authored demo runs on port 3001 with its own database; reproduction instructions are in `app/README.md`. Architecture/security follow-ups and their fixes are in `reports/overnight/`. TypeSafe export was approved; its full review hit the API context limit and returned no valid judgement. See the checker report and current UI issue ledger.
4. **Now:** deployment to the team Coolify server, following [the hosting guide](hosting-guide.md). Start with its Step 1 questions for the server's owner, then its Step 3 code work (configurable host, token auth, Dockerfile, compose). The deployed database starts empty; example data stays on the laptop.

## Things not to redo

Explored and rejected; see the exploration log for why:

- Question as a noun; Bet; Pin.
- Markdown or Obsidian as the store or interface; Postgres for v1.
- A full-width capture bar; a floating panel or separate mic button for dump or ask (now a docked column growing from the corner pill, with the mic inside).
- Zoom levels and the theory compass (now views plus one shared pane).
- A prototypes strip on the World page; Option B as the base plane.
- Deck, Document and River for v1 (deferred, not rejected).
