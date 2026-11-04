# Handoff guides: deploying Aber

4 Nov 2026. Written for a coding agent running on Maggie's MacBook, in her clone of `maggieappleton/aber`. Each guide stands alone. Hand over one guide at a time, in this order:

| # | Guide | Who | Needs first | Roughly |
| --- | --- | --- | --- | --- |
| 1 | [Separate example data from real data](01-local-example-data.md) | Agent alone, with one question to Maggie | Nothing | 15 minutes |
| 2 | [Make Aber deployable](02-make-deployable.md) | Agent alone; Maggie reviews the PR | Guide 1 is optional | A few hours |
| 3 | [Deploy to the team Coolify server](03-deploy-to-coolify.md) | Agent and Maggie together; Maggie does every click in Coolify and every secret | Guide 2 merged, and the server owner's answers ([hosting guide, Step 1](../hosting-guide.md#step-1-questions-for-the-servers-owner)) | An afternoon |

The background for all three is the [hosting guide](../hosting-guide.md). Where a guide and the hosting guide disagree, the guide is newer for its own task; say so in your report.

## Rules for every agent

These apply to every guide:

1. **Secrets never pass through you.** Never ask Maggie to paste an API key, token or password into the chat, never print one, and never write one to a file other than her own `.env`. When a value is needed, tell her which variable it is and where to put it (her password manager, then Coolify). To prove a secret is set, check its length or that a request succeeds, never its value.
2. **Real data is precious.** Never delete, overwrite or reseed a database you haven't inspected. Make a backup (`cd app && npm run backup`) before anything touches `app/data/`. If you're unsure whether something is real, stop and ask.
3. **Nothing public.** Aber must never be reachable from the public internet: no Coolify domain, no Tailscale Funnel, no port published on `0.0.0.0` on the host. If a step seems to need one, stop and ask.
4. **Work on a branch, open a PR, don't merge.** Commit with explicit paths. Maggie merges.
5. **Verify, then report.** End each guide with the report it asks for: what you did, the exact checks and their output, and anything you skipped or couldn't confirm. State confidence (high / moderate / low) where something is judgement.
6. **British English** in anything you write into the repo.

## Known baseline

On 4 Nov, `npm test` in `app/` had two failures that predate this work, both environment-specific: `media-policy.test.ts` (an ffmpeg build without the AV1 encoder) and `tripwire-lookback.test.ts` (a 20-second timeout on a slow machine). Record whether they pass on the Mac; don't count them as regressions.
