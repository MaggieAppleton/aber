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

Run `npm run eval -- --compare` for live OpenAI/Claude comparison. It skips missing keys and uses isolated in-memory databases. Embeddings stay on OpenAI for both providers. Reports go to ignored `evals/results/`, saved atomically before and after each case, including interruption. No previous report is overwritten. The new cases' full text, transcript, article, setup and fixed expectations appear in `fixtureProvenance`.

The default live run budget is $1, bounded by `DAILY_SPEND_CAP_USD`; use `--budget 0.25` or `--limit 2` for a smaller run. Budget is checked before each model step; one in-flight response can go slightly over the cap. Paid runs need an explicitly reviewed finite budget. Replace or extend these examples with consented real dumps before using scores to select models.

`npm run eval -- --fake` exercises the same SDK/tool/database loop without network calls or API keys. The five new processing cases use explicit handwritten scripted replays via the existing model override. **Fake passes validate the scorer and plumbing, not model accuracy.** Replay outputs are not responses to infer quality from. Full article observation uses an eval-only model wrapper; article fetching is stubbed and never requests the example URLs.

Use `--case cheap-model,memory,e7` to rerun named fixtures; the report's requested count reflects selection. To select the new set:

```sh
npm run eval -- --fake --case p-social-commentary-v2,p-full-article-v2,p-voice-ramble-v2,p-build-robotics-v2,p-revise-dedup-v2
```

Reports retain actual tool/authority failures, provider-visible candidate theories where observed, last assistant text and expected versus actual proposals. New processing diagnostics include the actual scored snapshot and whether it came from a scripted replay or live provider. An interrupted in-flight case's unreturned cost is marked unknown. Budget-skipped cases never count as complete.

`npm run smoke:providers` makes one tiny traced request per configured provider, skipping missing keys. Unit/e2e tests stay in fake mode.
