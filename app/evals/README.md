The 36 fixtures are **synthetic examples from the jig world**, not Maggie's personal material. All original 31 cases, texts and labels remain intact: 10 processing dumps, 13 evidence pairs (including `novel-evidence-v1`) and 8 tripwire hits/decoys. A preservation test locks the original fixture files by hash. Earlier comparison reports retain their scores and diagnosed misses.

`fixtures/processing-v2.ts` adds five independently versioned processing dumps, bringing processing coverage to 15:

| Case | Fixed handwritten expectations |
| --- | --- |
| `p-social-commentary-v2` | Two X posts with commentary; measured memory finding and revocable identities filed separately, correct original sources, speculation excluded. |
| `p-full-article-v2` | Full article corrects a misleading teaser; distinct review and electricity findings, multiple theme filings, complete fetched text both in the provider-bound request and stored on each signal. |
| `p-voice-ramble-v2` | A 3–5 minute authored transcript, saved in the transcript table; three grounded observations plus one speculative draft with existing theme links. The test media record is a transcript carrier, not playable audio or a transcription test. |
| `p-build-robotics-v2` | Physical deployment incident; explicitly requested Robotics draft theme, falsifiable theory and linked draft prototype. No existing theme covers physical robotics. |
| `p-revise-dedup-v2` | Normalised repeat attaches to its original signal, independent report merges into that survivor, same-topic latency finding stays apart; pending revision qualifies t3 without applying it. |

Every new processing case checks signal count, distinct expected facts in the gists, required theme filings, sources, dump origins, draft/revision policy, preservation of held prose/confidence/accepted evidence, and zero authority errors. Draft checks include ownership, exact requested draft kinds and relationship edges. The clauses beside each fixture allow listed paraphrases; they are transparent lexical checks, **not** a semantic quality judge. Scores can miss an unlisted valid paraphrase or an incorrect statement containing all required words. Review the retained actual outputs and diagnostics alongside them. Mutation tests reject incomplete gists, wrong/missing filings and sources, omitted article text, missing draft edges, applied revisions and swallowed decoys.

Run `npm run eval -- --compare --budget 2 --acknowledge-paid-budget` for an explicitly approved live OpenAI/Claude comparison. **Do not run live without prior spending approval.** It skips missing keys and uses isolated in-memory databases. Embeddings stay on OpenAI for both providers. Reports go to ignored `evals/results/`, saved atomically before and after each case, including interruption. No previous report is overwritten. The new cases' full text, transcript, article, setup and fixed expectations appear in `fixtureProvenance`.

Live runs now require both an explicit finite `--budget <USD>` and `--acknowledge-paid-budget`. The shared `withSpendBudget` ledger reserves conservative request bounds before dispatch across all cases, providers and databases; `DAILY_SPEND_CAP_USD` remains a separate, per-database soft daily guard, **not** the comparison's total budget mechanism. See the Jev budget calculation below for assumptions and limitations. Replace or extend these examples with consented real dumps before using scores to select models.

`npm run eval -- --fake` exercises the same SDK/tool/database loop without network calls or API keys. The five new processing cases use explicit handwritten scripted replays via the existing model override. **Fake passes validate the scorer and plumbing, not model accuracy.** Replay outputs are not responses to infer quality from. Full article observation uses an eval-only model wrapper; article fetching is stubbed and never requests the example URLs.

Use `--case cheap-model,memory,e7` to rerun named fixtures; the report's requested count reflects selection. To select the new set:

```sh
npm run eval -- --fake --case p-social-commentary-v2,p-full-article-v2,p-voice-ramble-v2,p-build-robotics-v2,p-revise-dedup-v2
```

Reports retain actual tool/authority failures, provider-visible candidate theories where observed, last assistant text and expected versus actual proposals. New processing diagnostics include the actual scored snapshot and whether it came from a scripted replay or live provider. An interrupted in-flight case's unreturned cost is marked unknown. Budget-skipped cases never count as complete.

`npm run smoke:providers` makes one tiny traced request per configured provider, skipping missing keys. Unit/e2e tests stay in fake mode.

## Jev end-to-end comparison (opt-in)

### Focused cascade being evaluated

The applied path uses focused state and branch-specific checks. Evidence pairs are judged independently (up to four concurrently); direct relevance gates direction/source checks, unresolved fields receive a bounded verifier, and accepted explanations use attributed observation templates instead of another prose call. Tripwires combine semantic judgments with exact numeric/date comparisons in code; unsupported conditions still receive the original pair-scoped checker. Duplicate identity and material-difference veto remain separate fields even in fallback, and code requires both before merging.

Processing **on** mode uses the cheaper model already configured for `link_evidence` for extraction/prose and bounded adjudication, while verifying source support, finding boundaries, per-theme filing and draft eligibility. Off/shadow retain the original processing model. Its traces and reservations use that selected model's rates, not the more expensive default processing rates. Chat batches route, speculative capability checks and targets, consumes only the selected branch, and clarifies confident target ambiguity locally. Unsupported requests retain the original chat agent. Successful bounded adjudication is still counted as generative fallback; fewer full-agent turns must not be reported as zero fallback.

The approved rollout defaults evidence, tripwires, processing and read-only chat shortcuts to on; automatic duplicates remain off. The initial evaluation required quality plus cheaper **and** faster execution. Processing did not meet that speed gate: its rollout was separately approved in favor of cost, with ongoing quality review. Use the read-only `npm run --silent review:processing -- --limit 10 --pool 100 --seed YYYY-MM-DD` sampler described in [the app README](../README.md#check-processing-quality). Policy tests, confidence values and fake replays are not accuracy evidence. Continue comparing **whole-capture** cost/latency and final persisted actions.

The original default `npm run eval -- --fake` still selects exactly the existing 36 cases and explicitly runs the original **off** baseline regardless of rollout/environment defaults. Their files, labels, thresholds and known findings are unchanged. The new harness is isolated behind `--jev-compare`, with explicit off/shadow/on arms independent of application defaults:

```sh
# Offline: actual SDK/tool/DB workflows; handwritten uncertain Jev responses.
# This verifies plumbing, final output collection, fallback and persistence ONLY.
npm run eval -- --fake --jev-compare --jev-suite smoke

# Parent/operator only, AFTER explicit approval of the entire finite amount:
# ABER_ENV_FILE selects the existing environment file without copying secrets.
ABER_ENV_FILE=/absolute/path/to/approved/.env \
  npm run eval -- --jev-compare --jev-suite smoke --compare \
  --budget 2 --acknowledge-paid-budget
```

`smoke` is ten independently authored **v1 regression** cases: one originally-development and one originally-held-out example for **each** of evidence linking, tripwire, near-duplicate decisions with actual merge writes, processing/multi-theme filing, and chat with persisted display replies. These are no longer fresh validation. `--compare` selects both configured generative providers; otherwise OpenAI is selected. Embeddings remain OpenAI; Jev remains TypeSafe. Actual run identities/models are retained separately from the arm's requested provider. The eval-only adapter selects Claude for chat's default model when requested; if the endpoint labels that run OpenAI, the retained row is corrected to the actual selected model's provider with its original label preserved in an `eval_provider_identity` audit event. Local deterministic chat shortcuts are labelled `local`, not billed text-model inference.

Selection:

- `--jev-suite all` (default): **all 36 original real workflow cases, 22 v1 Jev regressions, and 60 independent v2 cases** (118 total).
- `--jev-suite new` or `--jev-suite v1`: only `fixtures/jev-v1.ts`; the old `new` name is retained for compatibility, not a claim of pristine data.
- `--jev-suite v2`: only the 60 independent `fixtures/jev-v2.ts` cases.
- `--jev-suite smoke`: balanced ten-case **v1 regression** sample.
- `--case j-dev-duplicate,j-held-nonduplicate`: exact existing or new IDs within the chosen suite.
- `--split dev` or `--split held-out`: only that fixed new-fixture partition.
- `--limit N`: first N selected fixtures, not a per-arm spending allowance. A small limit can lose five-job coverage.
- `--no-order-check`: explicitly omit the additional Choice robustness arm; it is enabled by default.
- `--arms off,on`: select only the baseline and applied cascade, omitting costly redundant shadow runs. Any distinct nonempty comma-separated subset of `off,shadow,on` is valid; default remains all three. Singleton arms and caller-specified order are supported. Missing arms are `null` comparisons, not invented baselines.
- `--order-cases id1,id2`: repeat only these selected on-arm cases if they actually issue Choice questions. IDs must belong to the selected suite/split/case filter; requires `on` and conflicts with `--no-order-check`. Without this option, existing default Choice checks remain enabled for all selected on cases.

By default each selected case/provider runs **off**, **shadow**, and **on** in separately seeded in-memory databases, serialized afterward to separate `.sqlite` files. `--arms` changes both execution and the report's planned/completed denominator, not just its display. Off invokes today's actual baseline workflow, including its generative model calls in live mode; it is not a policy-only simulation. The same source fixture/setup and labels are used across arms. Shadow runs the real baseline and retains Jev's predicted policies; these predictions must not independently write domain data. Reports compare shadow's **actual persisted actions** with baseline actions, and, wherever bounded policy/target metadata is present, compare shadow predictions with baseline's actual decisions and give an agreement numerator/denominator. Fallback/unknown predictions are not invented as agreements. Chat route agreement does not imply correct target selection; target evidence remains in raw traces.

For any on-arm fixture that actually asks Choice questions, a fourth **on-reversed** execution repeats the **whole workflow** with the same fixture and reversed provider-bound criteria insertion order. Criterion keys, definitions and evidence are not relabelled; the real SDK still sends a fresh live request. Raw transformed requests, policy decisions and final action differences are retained. This is a meaningful live robustness probe, not comparing an answer to a reversed copy of itself. Generative downstream output is stochastic, so a mismatch is diagnostic, not proof of position bias. Fake repetitions test only this wiring; they establish no robustness or accuracy. Noul-only fixtures have no order arm.

### Fixtures and immutable legacy diagnostics

`fixtures/jev-v1.ts` fixes development/held-out examples before live evaluation: concrete relationships, ambiguous marketing/roadmap claims, unrelated no-match observations, topic-only decoys, real tripwire hits and near-misses, paraphrased duplicate events versus different findings, multi-theme filings, and contextual chat with a misleading topic mention. Expectations are handwritten, not returned by the fake model. There is no threshold fitting or automatic relabelling. The held-out split must not become a tuning set.

The seeded t3 tripwire contains an **OR** condition, which the conservative Jev policy deliberately treats as unsupported and routes to the real baseline. It is not rewritten. Two additional simple-condition tripwire cases create a separate fixture-only `jev-watch` theory; `smoke` uses these so a live high-confidence decision can actually exercise the Jev fast path instead of always falling back on t3's compound condition.

The original e4/e7 seeded collisions and e8 stance ambiguity remain intact, visible alongside their unchanged original checks. They are **not included as newly labelled Jev quality failures** or counted as new failures caused by Jev. See `targeted-findings.md` and `novel-evidence-findings.md`. Original processing rubrics also remain unchanged and retain their actual outputs/checks, rather than silently extending their partial labels into an exhaustive precision denominator.

### Frozen v2 development and fresh held-out evaluation

The **v1 held-out partition has already been used in live evaluation**. Both v1 partitions now have `evaluationRole: previously-evaluated-regression`; their original IDs, text, split and labels are unchanged. A fixture-data hash test locks all 22 records. `byEvaluationRole` separates their results from new development/fresh-held-out data even when a mixed suite is selected.

`fixtures/jev-v2.ts` adds **60 handwritten cases**, six for each of the five workflows in **each** split (30 dev, 30 fresh held-out). They were authored independently of model outputs, with labels fixed before any v2 live evaluation:

- Evidence: measured support/contradiction, topic decoys, hypothetical proposals, immediately supplied context, insufficient retention duration and unrelated observations.
- Tripwire: completed causal hits, wrong actor/object/cause, negation, requests that never happened, plus original compound-condition fallback behavior.
- Duplicate: paraphrases with unit/voice/attribution changes versus distinct replications, later follow-ups, corrections, metrics, entities and forecasts.
- Processing: one causal multi-theme finding versus two/three independent findings, single-theme observations, unrelated observations, explicit no-signal/no-draft requests and explicit draft-only predictions. Each case declares an inclusive final active signal-count range. Split-finding cases do not impose the single-signal co-filing requirement.
- Chat: scoped/unscoped signals, themes, theories, ordered follow-ups, explicit target overriding selection, absent candidates, ambiguous/conflicting references and mixed read/write requests. Optional `chat.context` and `chat.history` are passed intact to the real chat workflow; an explicit empty context is not silently replaced by t3.

Freeze the cascade, questions, policies and thresholds after development; then evaluate the fresh held-out partition once for the deployment decision. Do not tune against its outputs or change labels to pass. Retain any later reuse as regression evidence, not fresh validation. No generative whole-capture fallback is added by this eval harness. It scores what the assembled workflow persists, including bounded fallback results.

Suggested main comparisons avoid shadow and order repetition. These are **commands for an operator only after separate explicit approval** of each finite budget; set the budget variables to those approved amounts, not an assumed allowance:

```sh
# Development: 30 cases × 2 arms × one configured text provider.
npm run eval -- --jev-compare --jev-suite v2 --split dev \
  --arms off,on --no-order-check \
  --budget "$APPROVED_DEV_BUDGET_USD" --acknowledge-paid-budget

# After freezing: 30 previously unused held-out cases × 2 arms.
npm run eval -- --jev-compare --jev-suite v2 --split held-out \
  --arms off,on --no-order-check \
  --budget "$APPROVED_HELDOUT_BUDGET_USD" --acknowledge-paid-budget

# Optional SMALL development probe, only these two cases; no shadow baseline.
npm run eval -- --jev-compare --jev-suite v2 --split dev \
  --case v2-dev-chat-theme,v2-dev-evidence-blind-recall --arms on \
  --order-cases v2-dev-chat-theme,v2-dev-evidence-blind-recall \
  --budget "$APPROVED_PROBE_BUDGET_USD" --acknowledge-paid-budget

# Optional shadow parity probe: exactly one regression case, no order replay.
npm run eval -- --jev-compare --jev-suite v1 --case j-dev-duplicate \
  --arms off,shadow --no-order-check \
  --budget "$APPROVED_SHADOW_BUDGET_USD" --acknowledge-paid-budget
```

Default text provider is OpenAI; add `--compare` only if a separately approved comparison with both configured text providers is needed. Each invocation has its own ledger, so budgets must sum within the explicitly approved total. Use `--fake` without budgets to verify any command's selection and persistence without paid calls; its quality outputs are **not** model-quality evidence.

### Metrics and retained evidence

Each ignored `evals/results/jev-<timestamp>-<unique-id>/` contains incrementally saved `report.json`, `report.md` and a database per case/provider/arm. Reports are persisted before and after every arm, and after a handled interruption/budget stop. SQLite snapshots preserve the actual domain writes; raw JSON preserves final tables and **full `agent_runs` traces**, including submitted state/questions, raw distributions, resolved model, question/policy versions, usage, latency and policy/fallback events. Reversed requests are additionally retained at the eval SDK boundary because ordinary workflow trace metadata describes the original question construction.

Quality scoring uses **final persisted rows/reply parts**, never a policy's claim that it proposed, filed, merged or displayed something:

- **Proposal precision/recall:** matched handwritten new-fixture proposals / all actual proposals in that labelled scope, and matched / expected proposals. Duplicate or wrong-stance proposals are false positives. Partial legacy labels do not enter these denominators. Counts and errors are retained per case.
- **Missed relationships:** expected evidence/challenge proposals and filing edges absent from the actual proposals/direct links/filings. Wrong stances miss the expected relation and also create a false action. Extra direct links cannot silently satisfy proposal-only permissions.
- **False merges / missed merges:** actual retained reversible merge rows against the duplicate/nonduplicate fixture label, not only the isolated comparison answer.
- **Chat and filing:** required persisted display actions/targets and theme edges are checked, including one actual signal co-filed to all required themes (separate singly-filed signals do not suffice). Expected versus actual outputs are retained. Display prose itself is not semantically graded.
- **v2 processing counts/draft gates:** final active signals created by the workflow (not seeded/setup signals, discarded or merged-away rows) must fall within the handwritten inclusive range. Missing and over-split findings fail separately from filing-edge checks. All workflow-created draft kinds are counted, including unwanted extras, and must remain agent-owned drafts in the final database. No-draft cases reject unexpected drafts; a policy saying “draft” cannot replace a persisted draft row. These count/kind/ownership checks do not semantically grade draft prose or prove correct signal content.
- **v2 chat mutation checks:** all persisted domain mutation tool events (apart from reply/capture/display housekeeping) are scored against the explicit expected list. Mixed read/write cases cannot pass by merely displaying material; unrequested mutations and extra display targets are false positives. Failed authority attempts are separately retained in workflow checks.
- **Decision fallback fraction:** fallback `true` policy decisions / unique policies with an explicit boolean fallback; exact duplicate policy records within one run are counted once. A `fallback_agent` dispatch is excluded when its original semantic decision exists for the same job, policy version, signal and theory across runs; an orphan dispatch remains visible. Distinct pairs and meaningful decisions remain distinct. Off-mode records are excluded; missing fallback metadata is reported, not treated as false.
- **Capture fallback fraction:** captures with any `fallback: true` decision / all captures with Jev policy decisions (off excluded), alongside `unknownCaptures` for captures whose missing booleans prevent establishing no fallback. Captures without Jev decisions do not enter this denominator; an empty denominator is null. Raw traces are never edited.
- **Latency:** nearest-rank p50/p95/p99 and raw milliseconds per whole handled/attempted capture and per job/run, including retrieval, Jev, fallback and final writes. Tiny samples are descriptive, not statistically reliable tail estimates.
- **Economics:** total traced cost and cost per runtime-handled capture (completed without runtime/authority error), plus per-job costs/latency, actual provider/model identities and raw cost distributions. `byWorkflow` groups by the **entry workflow**, not each nested `agent_run.job`: its costs sum all retrieval/Jev/fallback/notes/processing runs belonging to each capture. It retains final expected/actual actions and scores, quality-pass count, cost per quality-passed capture, all attempted capture costs, and whole-capture p50/p95/p99 latency. Costs of quality failures remain in the numerator. A runtime-failed capture never counts as quality-passed. Relationship, display, draft and mutation false-positive/negative totals are retained, not omitted in favor of proposal recall. Failed/unreturned usage is unknown, not a zero-cost success.

Unknown measurements and empty denominators are **`null`**, never perfect scores. New quality is also separated by development/held-out split and category in raw reports. A comparison can complete with genuine labelled quality failures (exit 1 live); a budget stop/interruption/incomplete set is exit 2, not a completed evaluation. Fake mode ignores synthetic quality scores for its exit status but still fails runtime errors. No fake pass is a deployment recommendation.

The live API rounds returned probabilities and confidence to two decimals. The adapter retains those raw values and permits only their mathematically bounded rounding discrepancy when validating distribution totals and the documented confidence formula. This transport-validation allowance does not change any workflow's action or fallback threshold.

### Total budget and estimates

Both legacy live evaluation and Jev comparison require the acknowledgement flag and explicit finite budget. The runner wraps **the entire comparison**, including reversed-order probes, all providers, note generation, embeddings and all fallback steps, in one `withSpendBudget(budgetUsd, task)`. It records `spendBudgetSnapshot()` (`limitUsd`, `spentUsd`, `reservedUsd`, `unknownCostUsd`) incrementally. Serial arms avoid mixing evaluation overrides.

Current runtime pre-dispatch reservations use configured prices and conservative input-byte/token bounds:

- Generative step: `(input-byte/schema/framing upper bound × input-price-per-million + maxOutputTokens × output-price-per-million) / 1e6`; default output limit is 4,000. Current job configurations use OpenAI Terra **$1/$5**, Luna **$0.10/$0.50**, Claude Sonnet **$2/$10**, Haiku **$0.10/$0.50** per million input/output tokens. Prices are configuration assumptions, not an external billing guarantee.
- Jev: `(UTF-8 request bytes + 4096 framing) × $0.042 / 1e6` input, with zero priced output; pinned `jev-1.14.0` by default. Per-question context bounds are independently enforced.
- Embedding: `(UTF-8 text bytes + 4096 framing) × $0.02 / 1e6`.
- Evidence-note generation reserves its explicit configured bound before dispatch through `recordedAdapter`; all such adapters must supply a finite bound.

Illustration: a 12,000-byte generative input bound plus 4,000 output tokens reserves **$0.032 Terra / $0.064 Sonnet / $0.0032 Luna or Haiku** per step. A 12,000-byte Jev request reserves about **$0.000676**, and a 6,500-byte embedding about **$0.000212**. A capture can require many steps/pair judgments, embeddings and fallback calls; multiply by actual steps and all arms/providers, not by one Jev request. The reports expose actual totals rather than advertising these examples as a per-capture promise.

Reservations are acquired **before** covered calls; a request is refused if its conservative bound cannot fit the remaining total. Known actual usage settles the reservation; unknown transport costs consume the full reservation and are separately reported. Returned cost exceeding a reserved bound aborts evaluation. This is stronger than the old daily soft check, but **not an unconditional vendor invoice hard cap**: safety depends on all billed paths participating, correct configured prices, provider token accounting and no undocumented charges. Do not start a second invocation assuming the previous invocation's ledger is shared; subtract prior actual/unknown spend from the approved total first.

### Offline verification

```sh
npx vitest run evals/jev-metrics.test.ts evals/jev-runner.test.ts evals/jev-v2.test.ts
npm run eval -- --fake --jev-compare --jev-suite smoke
npm run eval -- --fake --jev-compare --jev-suite v2 --split dev --arms off,on --no-order-check
```

Tests exercise the real workflows and final DB extraction, false-merge writes, missed/extra relationships, null denominators, raw costs/tails, shared reservation exhaustion, provider-bound criteria reversal with an injected **offline SDK fetch**, environment restoration and shadow non-mutation. Separate explicit **high-confidence** scripts verify final on-arm evidence proposals, direct tripwire challenges, one-signal multi-theme filings, local contextual chat replies and actual merges; they are not all uncertain/fallback tests. The CLI's default fake script is deliberately uncertain and retains unchanged baseline heuristics, so its labelled mismatches are diagnostic scorer output, not missing fixture-specific quality replays. Handwritten fake answers (using the runtime's `fakeChoice` helper) test plumbing/policy only. They are not empirical quality measurements. No network, keys or paid calls are required.
