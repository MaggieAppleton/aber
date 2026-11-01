# Targeted synthetic comparison — 1 November 2026

The authorised follow-up completed all 14 requested provider/case combinations at **$0.44301094**, below its $0.60 cap. The incremental report is `results/2026-11-01T06-59-18-236Z.json`. No further live calls were made. These are synthetic jig-world examples, not Maggie's personal material.

| Job | OpenAI | Claude |
| --- | --- | --- |
| Processing: cheap-model, memory, near-duplicate | 3/3 | 3/3 |
| Evidence: e4, e7, e8 | 1/3 | 1/3 |
| Tripwire: w1 | 1/1 | 1/1 |

All 14 cases had **zero authority errors**. The previous processing failures disappeared after clarifying untouched agent draft relationship permissions, exposing conservative permission metadata, and fixing the typed storage guard. Prose ownership and held-theory protections remain strict.

The four remaining labelled misses are preserved in the report and CLI exit status:

- **e4, Claude:** t3 was retrieved and the model explicitly judged the memory withdrawal as undermining. It skipped a new proposal because seeded signal `s7` already has the same finding's pending evidence proposal and challenge. The fixture bypasses processing and creates a fresh signal ID for this seeded event; its assertion expects a new pair despite the model's semantic duplicate suppression.
- **e7, both providers:** t5 was the first retrieved candidate. Both models explicitly judged the household budgeting example as supporting. They declined to count it again because seeded `s9` already records the same observation. This is a seeded fixture collision, not a retrieval failure or a failure to recognise the supporting stance. The fixture's current assertion still fails because there is no new proposal for its fresh signal ID.
- **e8, OpenAI:** t5 was the first retrieved candidate and the model created a supporting proposal. Its reasoning distinguishes the audience for which personal apps were made from their later maintenance and abandonment. The fixture labels the observation as undermining; that label is ambiguous for the exact claim “Most software is made for an audience of one”. Claude chose undermines. This remains a real stance disagreement against the retained label, not a permissions or retrieval defect.

No rubric, stance threshold or fixture label was loosened to make these checks pass. Before another quality comparison, make the independent evidence examples distinct from seeded events and review e8's intended claim/label. Keep separate repeat-event fixtures to test duplicate suppression. The current synthetic scores are insufficient to choose a provider for Maggie's real material.

Verification after the patches: 94 unit tests and 28 deterministic fixture evals passed; TypeScript passed. The live CLI exited 1 because of the four labelled misses above, while saving the complete report and diagnostics.
