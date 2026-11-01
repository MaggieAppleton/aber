# Novel evidence validity check — 1 November 2026

`novel-evidence-v1` adds three independent synthetic observations. The original 28 fixtures, labels, saved runs and diagnosed scores remain unchanged. No prompts or stance thresholds changed for this run.

The single authorised follow-up completed **6/6 live checks**, with **zero authority errors**, at **$0.00675496** against a $0.05 cap. The report is `results/2026-11-01T07-04-41-401Z.json`; `fixtureProvenance` contains each case's exact text, expected theory/stance, version and synthetic provenance.

| Case | Distinct observation | Expected | OpenAI | Claude |
| --- | --- | --- | --- | --- |
| e4-novel | Cedar's 120-day audit finds forced 30-day memory resets and no second-month recall | t3 undermines | Pass | Pass |
| e7-novel | A 12,000-tool census measures 74% made for exactly one user, up from 18% | t5 supports | Pass | Pass |
| e8-novel | A 20,000-product census measures bespoke one-user share falling from 38% to 6%, replaced by shared products | t5 undermines | Pass | Pass |

Both providers created new pending evidence proposals for the intended held theories. This verifies retrieval, stance selection and proposal plumbing on these three clear synthetic examples. It does not validate performance on Maggie's material, establish broad model quality, or erase the original seeded-event collisions and ambiguous e8 label documented in `targeted-findings.md`.

The fixture count is now 31. The CLI derives its default limit from the actual case list; the default fake CLI completed all 31, including every original case and all three novel cases. The separate deterministic eval suite passed 31/31, the preservation tests passed, and TypeScript passed before the live run. No additional paid calls were made.
