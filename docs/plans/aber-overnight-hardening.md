# Aber overnight hardening

Continue the approved local build in small verified slices. The current spec was re-read on 1 November: `docs/build-spec.md`, SHA-256 `efc31e78b73aff80746d4d0d7f8fa9b08ec134f1c1f5549fb5bd43cd330edc1e`, last committed by `a89c50e`. No newer local worktree or spec revision was found. Recheck its fingerprint before handoff.

The first build's 140 unit tests, 57 browser checks and 31 synthetic evals remain the baseline. Preserve historical fixtures/scores, user data and canonical design sources. The optional TypeSafe export remains unapproved; all screenshot reviews stay local.

## Approach

Prefer repairs at the module that owns each invariant, with public-interface regression tests. A broad rewrite would disturb verified visuals and introduce unrelated risk; adding caller-specific patches would duplicate the existing problems. Existing interfaces stay in place while their implementations become safer.

## Focused slices

- [x] Re-read the spec, confirm its version, and commission separate security and architecture reviews.
- [x] Run the dependency advisory audit; retain its JSON (zero reported vulnerabilities).
- [x] Preserve failed edits behind the existing edit interface. Retain unacknowledged fields, merge newer edits over failed ones, acknowledge each successful operation once, and retry without duplicating stances. Tests reject a save, refresh the world, retry, and inject a later-operation failure.
- [x] Centralise active-tripwire lookback scheduling across creation, edits and draft activation. Public tool tests cover held/draft/empty/unchanged transitions and version-scoped deduplication.
- [x] Finalise chat success only after reply persistence. Scripted stream tests cover rejecting reply sinks, success and abort/error ordering while retaining usage.
- [x] Validate local Host authority on all HTTP routes and keep mutation Origin protection. Isolated request tests cover attacker hosts, loopback/proxy ports and malformed authority.
- [x] Bound the complete article fetch by an absolute deadline, retaining DNS pinning, redirect and byte limits. Test trickling bodies, slow DNS/headers and cleanup.
- [x] Remove full-world reconstruction from narrow agent reads. Preserve their result contract; prove unrelated dump/run history does not increase their statement count.
- [x] Add five versioned realistic processing evals, including social commentary, a full article, a long transcript, a robotics prototype and revision/dedup boundaries. Add scoring mutation tests and explicitly label fake replays as scorer/plumbing checks.
- [x] Review the new cases, then run a finite live provider comparison with retained raw results and a documented spend limit. All ten completed/passed, $1.00001974 of $1.25; labels unchanged and manual trace review retained.
- [x] Add an optional, additive demonstration seed pack after a separate concrete plan. Default canonical seeding stays unchanged; collisions must fail atomically and repeat runs must not duplicate data.
- [x] Run a second independent security and architecture/code-quality review over the fixes, resolving reproduced material findings.
- [x] Preserve source provenance after early merges and prevent duplicate confidence stances after lost acknowledgements. Independent probes and two real-browser recovery tests pass.
- [x] Share a bounded media-decoding policy; verify normal formats, a 48 MP photo, timeouts and cancellation with synthetic inputs.
- [x] Repair the broad data ignore rule and prove the committed app builds without ignored source. The old commit fails this new check; `1774073` passes.
- [x] Run the relevant tests and final integrated checks, rebuild the local app, refresh the backup and handoff notes, and commit explicit paths without pushing. Final checks: 233 unit tests, 59 browser checks, 36 scripted evals, ten live evals, typecheck, production smoke and committed-source smoke; main data and media backup verified.

## Ownership

| Workstream | Ownership |
| --- | --- |
| Root | Failed-edit queue and browser proof, plan, package commands, integration and handoff |
| Security reviewer/worker | HTTP Host checks and article-fetch deadline, their tests and security report |
| Architecture reviewer/worker | Active-tripwire transition and streamed-run finalisation, their tests and architecture report; narrow reads are a later slice |
| Eval/seed worker | Additive eval fixtures/scorers/replays and optional new seed-pack module; existing fixture text and scores remain immutable |

The running built server stays stable while source is edited. Tests use isolated fake databases. Model calls wait for a separate bounded eval command; credentials are never printed.
