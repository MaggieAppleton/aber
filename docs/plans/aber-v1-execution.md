# Aber v1 execution plan

**Goal:** Complete the specified local app, persistent data, agent architecture and canonical visuals, verified end to end.

**Architecture:** React/Vite and a Hono Node API share validated tools over SQLite. Agents call the same tools under restricted authority. Canonical jigs supply components, tokens and motion.

**Tech stack:** Node 24, TypeScript, React 19, Motion, Phosphor, Hono, better-sqlite3, Drizzle, Zod, AI SDK 7, Vitest, Playwright.

The detailed implementation checklist is `docs/build-spec.md` sections 7–10. This ledger tracks its slices and ownership without duplicating the specification.

| Owner | Files | Contract |
| --- | --- | --- |
| Root | Config, HTTP routes, entry point, scripts, e2e | Localhost, root `.env`, API §4.6, production run |
| Storage worker | `app/server/src/db/`, `tools/`, `shared/`, `seed.ts` | `createDatabase`, `migrate`, `seed`, `createTools`, queries |
| Agent worker | `app/server/src/agents/`, `jobs/`, `evals/` | `startWorker`, `processJobs`, `createChatResponse` |
| Web worker | `app/web/` | Live snapshot/tool/capture/SSE/chat APIs |

- [x] Preflight: credentials, access, runtimes, registry, canonical jig browser access.
- [x] Both live provider keys verified with HTTP 200.
- [x] Slice 0: scaffold, migrations, seed, authority and stance tests.
- [x] Slice 1: capture, media, dump log and bin round trip.
- [x] Slice 2: providers, traces, worker cleanup/retries and spend cap.
- [x] Slice 3: processing, dedup/tombstones, fetched text, embeddings and evals.
- [x] Slices 4–5: Theme sections, complete pane, confidence, evidence and tripwires.
- [x] Slice 6: Briefing decisions and undo.
- [x] Slices 7–9: dynamic Atlas, Timeline and Columns.
- [x] Slice 10: contextual streaming chat and display parts.
- [x] Slice 11: external capture, mobile Briefing/pane, uploads/recording.
- [x] Full unit/e2e/accessibility/reduced-motion/production checks.
- [x] Multiple screenshot-based design critiques and fixes.
- [x] Requirement audit and local run instructions.

Final evidence and limits are in `docs/verification.md`. The extra TypeSafe screenshot-export check is pending explicit export permission; it is not reported as a passed gate. The local source checks and agent screenshot reviews have run.

Contract review: workstreams own disjoint directories; HTTP and agents consume the same Zod tool registry. The web consumes projections with database fields and jig aliases. Resolve mismatches at the integration boundary with regression tests.

Rulings: port 5174 because another project occupies 5173. Preserve all uncommitted jig/design changes; those sources remain read-only. Load root `.env` explicitly. No deployment, pushes or PRs.
