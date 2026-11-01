# Live processing-v2 comparison — 1 November 2026

All **10/10 requested fixture-provider evaluations completed and passed** with unchanged inputs and expectations. Recorded spend was **$1.00001974 of the $1.25 cap**. The CLI exited 0. No reruns or additional paid evaluations were made.

Authorised invocation, from `app/`:

```sh
npm run eval -- --compare --case p-social-commentary-v2,p-full-article-v2,p-voice-ramble-v2,p-build-robotics-v2,p-revise-dedup-v2 --budget 1.25
```

Run started at 2026-11-01 08:30:31 UTC. The [unaltered raw report](live-eval-v2.raw.json) is retained alongside this review; the original remains at `app/evals/results/2026-11-01T08-30-31-022Z.json`. Raw report SHA-256: `61da62088969b3eafeb6c827c229ccccf950abd93402c938d07b1ff504d4c0ca`.

## Recorded provider metrics

These are the CLI's raw totals by **selected fixture provider**. They include that evaluation's processing run, embedding adapters and, for the duplicate fixture, its separate near-duplicate gate. Embeddings use OpenAI for both alternatives. Costs are the harness's recorded estimates, not a provider billing reconciliation.

| Selected fixture provider | Raw pass rate | Input tokens | Output tokens | Recorded USD |
| --- | --- | ---: | ---: | ---: |
| openai | 5/5 | 196,606 | 6,243 | $0.22459866 |
| anthropic | 5/5 | 331,302 | 12,507 | $0.77542108 |

Actual recorded runs, separated by provider/model/job:

| Runtime provider | Model | Job | Runs | Input tokens | Output tokens | Recorded USD |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| anthropic | claude-haiku-5-5 | near_dup | 1 | 2,716 | 356 | $0.00044960 |
| anthropic | claude-sonnet-5-5 | process_dump | 5 | 326,712 | 12,151 | $0.77493400 |
| openai | gpt-6-luna | near_dup | 1 | 1,234 | 69 | $0.00015790 |
| openai | gpt-6.1-terra | process_dump | 5 | 193,534 | 6,174 | $0.22440400 |
| openai | text-embedding-3-small | embedding | 30 | 3,712 | 0 | $0.00007424 |

Every processing run used `process-dump-v4`. All recorded runs finished `done`. `link_evidence` and `tripwire` were not evaluated in this batch; their 0/0 CLI rows are not passes or failures.

Per-case raw results:

| Fixture | Provider | Raw result | Input tokens | Output tokens | Recorded USD |
| --- | --- | --- | ---: | ---: | ---: |
| p-social-commentary-v2 | openai | PASS | 28,368 | 663 | $0.03146642 |
| p-social-commentary-v2 | anthropic | PASS | 55,793 | 1,374 | $0.12490426 |
| p-full-article-v2 | openai | PASS | 31,183 | 1,590 | $0.03890956 |
| p-full-article-v2 | anthropic | PASS | 59,289 | 2,470 | $0.14281666 |
| p-voice-ramble-v2 | openai | PASS | 33,604 | 1,386 | $0.03962456 |
| p-voice-ramble-v2 | anthropic | PASS | 64,549 | 2,988 | $0.15703364 |
| p-build-robotics-v2 | openai | PASS | 33,376 | 1,253 | $0.03944402 |
| p-build-robotics-v2 | anthropic | PASS | 69,872 | 2,831 | $0.16766394 |
| p-revise-dedup-v2 | openai | PASS | 70,075 | 1,351 | $0.07515410 |
| p-revise-dedup-v2 | anthropic | PASS | 81,799 | 2,844 | $0.18300258 |

## Manual audit against traces

**Rubric false misses: none observed. Actual behavioural failures: none observed in these ten recorded outcomes.** All fixed checks are true, so no raw misses were reclassified. This manual review also inspected actual gists, sources, filings, draft ownership/edges, proposed revisions and duplicate decisions rather than accepting the pass flags alone.

JSON references below use the raw report's zero-based `results` indexes. Each entry retains `diagnostics.actual`, `diagnostics.toolCalls`, `diagnostics.runs` and the unchanged expected outcomes.

| Scenario | Trace evidence inspected | Manual finding |
| --- | --- | --- |
| X commentary (`results[0–1]`) | Each provider produced exactly two signals: Cedar's 36/40 restoration after twelve weeks and Harbour's separate revocable identities. Actual themes are `memory` and `identity`; each signal has its corresponding original X URL. Neither produced a draft or third speculative signal. | The observation/commentary boundary and source attribution hold in these outputs. |
| Full article (`results[2–3]`) | Both traces call `createSignal` twice with the **same article URL and distinct findings**. One gist preserves review time increasing from 45 to 110 minutes; the other preserves Vela's five-year, $18 million minimum annual electricity obligation. Actual filings are `review` and `cost` + `funding`. `fullArticleInInput` and `fullArticleStored` are true for both. | The same-URL repair works in both live runs. Neither follows the misleading teaser or collapses the two findings. |
| Rambling transcript (`results[4–5]`) | Both retain three separate observations: Harbour's 90→30 writing / 40→100 review minutes, eight Cedar designers over eleven weeks, and four Rowan residents' pantry app over sixteen weeks. Sources are own observations; filings are `review`, `memory`, `personal`. Each creates one agent-owned speculative decision-timeline theory, linked to `review` and `interfaces`, with horizon 2028. | Speculation remains a draft rather than a fourth observed event. Both retain the limited trial scopes; no held wording is changed. This fixture supplies an authored transcript, so it does not test transcription accuracy. |
| Robotics build (`results[6–7]`) | `createDraftTheme` creates Robotics; `createDraftTheory` creates the weekly-human-recovery claim with actual `horizon: 2028`; `createDraftPrototype` creates Recovery rehearsal with the new theory ID in `theories`. Actual state shows exactly those three agent-owned drafts and one incident filed under the new theme. | The explicit new-theme request, falsifiable draft, prototype relationship and unaccepted status all hold. The draft date is present in the real horizon field as well as these claims. |
| Repeat, merge, decoy and revision (`results[8–9]`) | Both traces call `attachOrigin` on their original setup signal, `mergeNearDuplicateSignals` into that same survivor, and `proposeRevision` for `t3`. Their separate `near_dup` runs call `decide` with `sameFinding: true` and identify the same vault/consent trial. Actual survivors contain both source URLs and two origins; the 45% latency result remains a separate signal. One qualifying revision remains pending. | Normalised repeat attachment, independent-source consolidation and decoy separation all work. Revisions are proposals; the held-state snapshots remain byte-equal. |

Across all ten cases: **zero authority errors, zero tool errors, held-state preservation true**. The held snapshots cover held prose, person-owned themes/prototypes, confidence history and accepted held evidence. No exception or budget-skipped case is hidden by the pass total.

For precise duplicate trace references: OpenAI processing run `01M6B3VCC7TJBH119NHTNEHP56` and near-duplicate run `01M6B3VTY9VSAQR9NAKBNZ4J84`; Claude processing run `01M6B3W7EV6MNGFA14XNDQBCPT` and near-duplicate run `01M6B3WJ6WMB7GZK52WZ2F7YFG`.

## Scope and preservation

These are five deliberately explicit synthetic examples, once per provider. The result does not establish accuracy on personal dumps, robustness across repeated trials, or a general quality winner. The measured cost difference belongs to this batch. No prior fixture, label, raw score or report was changed, including the earlier evidence misses; the original 31 cases were not rerun live here.

The CLI emitted an OpenAI SDK compatibility warning that JSON Schema `propertyNames` was removed before requests. The recorded tool calls completed without validation or authority failures; this eval task made no source/schema changes or fixture edits.

The run began from the working tree rooted at Git HEAD `a6c5dca7d11113c53a540fea4841c2d4081963d5`; its frozen implementation was subsequently committed as `1774073`. These source hashes were recorded before and after the batch and matched:

| Source | SHA-256 |
| --- | --- |
| `app/evals/fixtures/processing-v2.ts` | `9102f0e7881836bc4289eca921f94064eeb767e37f2a559a3ed1c8f44fa4820c` |
| `app/evals/processing-score.ts` | `543975b9444a350ece1bf142b2cda94e56520795de6091bbe5d6fa17009e35e8` |
| `app/evals/processing.ts` | `eddd61974a70854bc797aee6e7ef730fa1d5ae4bd948a889559c784bfa701922` |
| `app/server/src/agents/prompts/process-dump.md` | `2d913bed755b264bc9af95533094bd1ff184cdf296a8f53705219273c9875771` |
