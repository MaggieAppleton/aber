# Aber

A personal tool for collecting signals about where technology is heading, growing them into themes and theories of the future, and turning those theories into things to prototype.

Status: design stage. No app code yet.

## Docs

| Doc | What it covers |
| --- | --- |
| [Grammar draft](docs/grammar-draft.md) | First pass at the nouns, verbs, background agents and spatial directions. Parts are superseded by the decisions below |
| [Hosting & Tailscale guide](docs/hosting-guide.md) | Step-by-step setup for running Aber privately on a small server, reachable from iPhone and both MacBooks, with estimated costs |

## Decisions since the grammar draft

- **Question merged into Theme.** A theme is an area of attention that signals gather in and theories take positions on. A theme with signals but no theories is an open question. Rivalry between theories is an explicit `rivals` link.
- **Themes are flat** for now, and many-to-many with both signals and theories.
- **"Dump"** is the name for raw captures. Everything captured is a dump first: a long voice note, a single X link, or several links plus prose. A processing agent splits each dump into one or many signals and files them into themes.
- **Inflows are manual only:** X links, brain dumps, articles and blog posts. No automated inflows.
- **Theory = claim + body.** The title is the short, falsifiable claim; an optional prose body sits underneath, so Aber needs a good writing view.
- **Custom interface.** Not Obsidian.
- **SQLite for v1**, with guardrails that keep a later move to Postgres cheap (see the hosting guide and the grammar draft's substrate question).
- **Multiplayer later, not v1.** Sharing theories and themes with up to about 10 people is a future goal.
- **iPhone capture** goes through an Apple Shortcut in the share sheet.

## Proposed, not yet confirmed

- Agents organise freely and reversibly (splitting dumps, filing signals into existing themes), but make claims only through Suggestions (new themes, draft theories, evidence links). Agents never change confidence.
- Confidence belongs to a person, stored as an append-only stance (person, theory, confidence, note, time).
- Every write records its actor: the user, or which agent job and model.
