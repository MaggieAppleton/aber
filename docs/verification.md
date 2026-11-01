# Local build verification

1 November 2026. Aber runs at **http://127.0.0.1:3000** using the built Node server in live mode. There is no deployment. See [run instructions](../app/README.md) and [decisions](build-notes.md).

Current live UI corrections and verification are tracked in [UI issues](ui-issues.md). The checks below preserve the overnight baseline; later corrections supersede its geometry and review conclusions.

## Latest UI review

All user-reported UI issues are tracked in [the issue ledger](ui-issues.md). The latest local build passes 239 unit tests across 47 files, typecheck, build and production smoke. The final full browser run passes all 85 checks: 49 core, 16 follow-up workflow and 20 action-review cases, including the new sidebar/creation regressions. Combined live verification passes eight groups for the new sidebar, inline Prototypes, creation controls, theory header, responsive fit and focus preservation, with zero backend writes.

Reports and screenshots are local ignored artifacts. The dependency audit after adding Markdown reports zero production vulnerabilities. The working tree and all existing Git-history blobs were scanned for provider keys, GitHub tokens, private keys and exact local credentials; no matches were found. `.env`, local data, build output and reports are excluded from Git.

## Automated checks (overnight baseline)

| Check | Result |
| --- | --- |
| `npm test` | 233 tests passed across 46 files. |
| `npm run test:e2e` | 23 checks passed, including Chromium and WebKit phone layout. |
| `npm run test:workflow` | 16 workflow checks and 20 action-review checks passed, each using an isolated fake database. |
| `npm run eval -- --fake` | 36 synthetic fixtures passed: 15 processing, 13 evidence and 8 tripwire cases. These exercise scripted plumbing and scoring, not model accuracy. |
| `npm run typecheck` | Passed. |
| `npm run build` | Passed. |
| `npm run smoke:production` | Passed: bundled UI/assets, migrations, seed, API, SSE, worker processing, media ranges and foreign-Host rejection over raw HTTP. |
| `npm run smoke:checkout` | Passed for `1774073`: exported committed app source builds and passes production smoke without API keys or ignored source files. Uses existing installed dependencies. |
| Final CSS corrections | 15 affected browser checks passed again: spatial gestures, pane/phone, recording, hit areas and context transitions. |
| Actual built app | All five views and phone Briefing render without horizontal overflow or JavaScript errors. The server's HTML matches the latest build; its assets return 200. |
| Backup | Snapshot `app/backups/2026-11-01T08-34-05-318Z/` opens with integrity `ok`, contains the eight dumps, and has both referenced media files. |
| Optional demo | Explicit creation and repeat no-op passed. Five desktop views, phone Briefing, draft pane, merge Undo control and real voice range serving checked on port 3001. |

The 59 browser checks include reload persistence, API capture, normalised-link deduplication, voice upload, a real browser MediaRecorder supplied with synthetic audio, playback/seek, bin restoration, generative chat parts, all draft kinds, revision decisions, retired history, manual signal merge/Undo, pointer and keyboard pane resizing, Atlas disclosure/panning, Timeline drag/chain/levels, Columns rails, reduced motion, accessibility and 40px controls. The two added recovery tests retain failed wording and prevent a duplicate confidence stance after a lost acknowledgement. Targeted repetitions are additional verification, not extra unique test cases.

The desktop-to-phone context test initially caught an outgoing chip retaining its active button while shrinking. Exiting chips now become inert, and reduced motion uses opacity only. Ten consecutive fresh reproductions passed before the complete suite was rerun.

## Live provider checks

Both entered keys passed `npm run smoke:providers`: OpenAI and Anthropic returned non-empty replies. That smoke run recorded $0.000047 and $0.000104 respectively. Keys remain in the ignored repository-root `.env`; none were printed or committed.

Separate real-provider pipelines successfully processed text, an 8.3-second synthetic voice note and an image. The main database has eight completed dumps, 13 completed jobs, 17 signals, seven themes, ten theories and four prototypes. Database integrity is `ok`; foreign-key checks are empty. The initial five dumps and other stock objects come from the canonical jig; the remaining captures are test material.

The full provider comparison, targeted repair checks and six novel-evidence checks retain their original scores and fixtures. See [build notes](build-notes.md#live-quality-evidence), [targeted findings](../app/evals/targeted-findings.md) and [novel-evidence findings](../app/evals/novel-evidence-findings.md). Passing deterministic fixtures is not a claim of model accuracy on personal material.

The five new processing-v2 cases completed once per provider: **OpenAI 5/5, Claude 5/5**, recorded cost **$1.00001974 against a $1.25 limit**. Inputs and expected labels remained unchanged. Manual trace review found no rubric false misses or behavioural failures in this batch; zero authority/tool errors and held-state preservation passed. The [review and unaltered raw report](../reports/overnight/live-eval-v2.md) include provider costs, actual outputs and limits. This small, explicit synthetic set does not establish general accuracy or a winning provider.

## Review evidence

- [Design round 1](../reports/design-round1/report.md), [round 2](../reports/design-round2/report.md), [round 3](../reports/design-round3/report.md), and [final recheck](../reports/design-final/report.md): screenshot-based critiques and fixes against the canonical jig, desktop, phone and reduced motion. These earlier reviews did not establish detailed jig parity; subsequent live review found additional issues in the current ledger.
- [Action/specification audit](../reports/final-code-review.md): six missing paths repaired and verified through the real interface.
- [Backend preservation review](../reports/final-backend-review.md): merge/bin/restore and suggestion Undo regressions reproduced, fixed and rechecked independently.
- [Built-app screenshots and measurements](../reports/local-runtime/checks.json): five desktop views and phone Briefing, captured from the running production build.
- [Latest built-app check](../reports/overnight/local-runtime/checks.json) and [richer demo](../reports/overnight/demo-runtime/checks.json): fresh screenshots after the hardening build; no JavaScript errors or horizontal overflow.
- [Architecture round 1](../reports/overnight/architecture-round1.md) and [round 2](../reports/overnight/architecture-round2.md): tripwire transitions, durable chat completion, narrow reads, edit recovery, confidence command identities and source provenance after merging. Reproduced findings were repaired and checked independently.
- [Security round 1](../reports/overnight/security-round1.md), [follow-up](../reports/overnight/security-followup.md), [media validation](../reports/overnight/media-validation.md) and [dependency audit](../reports/overnight/dependency-audit.json): local HTTP authority, complete article deadlines, bounded decoding and zero reported dependency vulnerabilities.
- [Token preservation](../reports/design-check/token-preservation.json): mechanical extraction preserves 4,936 non-focus declarations at that stage. Four later usability corrections are explicitly listed; this is not a claim that every final declaration is byte-identical to the jig.

## Additional checker and boundaries

At the overnight baseline, the agent-kit source checker reported zero failures after token extraction and keyboard-focus corrections. Its local browser diagnostic ran 13 cases and 29 frames; all interaction and paste assertions passed. Twenty remaining flags are confirmed accessible-name parser artefacts, with actual browser names present. See [the checker report](../reports/design-check/summary.md).

Maggie approved TypeSafe screenshot/context export. The authorised full review captured 13 cases, then received HTTP 400 `max_tokens_exceeded` on its first request; one bounded diagnostic confirmed that error. No valid visual judgement or current `ready` result was returned. See the [checker report](../reports/design-check/summary.md). Detailed visual corrections and current verification are tracked in [UI issues](ui-issues.md).

All sample/eval material is synthetic. Physical microphone permission and real iPhone safe-area hardware were not exercised; browser recording, real transcription, Chromium and WebKit phone layouts were. Hosting, authentication, remote phone access and the later agent jobs remain outside the specified v1 scope.
