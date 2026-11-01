# Local build verification

1 November 2026. Aber runs at **http://127.0.0.1:3000** using the built Node server in live mode. There is no deployment. See [run instructions](../app/README.md) and [decisions](build-notes.md).

## Automated checks

| Check | Result |
| --- | --- |
| `npm test` | 140 tests passed across 35 files. |
| `npm run test:e2e` | 23 checks passed, including Chromium and WebKit phone layout. |
| `npm run test:workflow` | 14 workflow checks and 20 action-review checks passed, each using an isolated fake database. |
| `npm run eval -- --fake` | 31 synthetic fixtures passed: 10 processing, 13 evidence and 8 tripwire cases. |
| `npm run typecheck` | Passed. |
| `npm run build` | Passed. |
| `npm run smoke:production` | Passed: bundled UI/assets, migrations, seed, API, SSE, worker processing and media ranges. |
| Final CSS corrections | 15 affected browser checks passed again: spatial gestures, pane/phone, recording, hit areas and context transitions. |
| Actual built app | All five views and phone Briefing render without horizontal overflow or JavaScript errors. The server's HTML matches the latest build; its assets return 200. |
| Backup | The online snapshot opens with integrity `ok`, contains the eight dumps, and has both referenced media files. |

The 57 browser checks include reload persistence, API capture, normalised-link deduplication, voice upload, a real browser MediaRecorder supplied with synthetic audio, playback/seek, bin restoration, generative chat parts, all draft kinds, revision decisions, retired history, manual signal merge/Undo, pointer and keyboard pane resizing, Atlas disclosure/panning, Timeline drag/chain/levels, Columns rails, reduced motion, accessibility and 40px controls. Final targeted repetitions are additional verification, not extra unique test cases.

The desktop-to-phone context test initially caught an outgoing chip retaining its active button while shrinking. Exiting chips now become inert, and reduced motion uses opacity only. Ten consecutive fresh reproductions passed before the complete suite was rerun.

## Live provider checks

Both entered keys passed `npm run smoke:providers`: OpenAI and Anthropic returned non-empty replies. That smoke run recorded $0.000047 and $0.000104 respectively. Keys remain in the ignored repository-root `.env`; none were printed or committed.

Separate real-provider pipelines successfully processed text, an 8.3-second synthetic voice note and an image. The main database has eight completed dumps, 13 completed jobs, 17 signals, seven themes, ten theories and four prototypes. Database integrity is `ok`; foreign-key checks are empty. The initial five dumps and other stock objects come from the canonical jig; the remaining captures are test material.

The full provider comparison, targeted repair checks and six novel-evidence checks retain their original scores and fixtures. See [build notes](build-notes.md#live-quality-evidence), [targeted findings](../app/evals/targeted-findings.md) and [novel-evidence findings](../app/evals/novel-evidence-findings.md). Passing deterministic fixtures is not a claim of model accuracy on personal material.

## Review evidence

- [Design round 1](../reports/design-round1/report.md), [round 2](../reports/design-round2/report.md), [round 3](../reports/design-round3/report.md), and [final recheck](../reports/design-final/report.md): screenshot-based critiques and fixes against the canonical jig, desktop, phone and reduced motion. The final inspected scope has no material design findings.
- [Action/specification audit](../reports/final-code-review.md): six missing paths repaired and verified through the real interface.
- [Backend preservation review](../reports/final-backend-review.md): merge/bin/restore and suggestion Undo regressions reproduced, fixed and rechecked independently.
- [Built-app screenshots and measurements](../reports/local-runtime/checks.json): five desktop views and phone Briefing, captured from the running production build.
- [Token preservation](../reports/design-check/token-preservation.json): mechanical extraction preserves 4,936 non-focus declarations at that stage. Four later usability corrections are explicitly listed; this is not a claim that every final declaration is byte-identical to the jig.

## Additional checker and boundaries

The agent-kit source checker reports zero failures after token extraction and keyboard-focus corrections. Its local browser diagnostic ran 13 cases and 29 frames; all interaction and paste assertions passed. Twenty remaining flags are confirmed accessible-name parser artefacts, with actual browser names present. See [the checker report](../reports/design-check/summary.md).

The optional full TypeSafe visual review **has not run and is not a `ready` result**. Automatic approval review rejected exporting screenshots and design context without explicit permission. No TypeSafe export or paid judgement occurred. Approval was requested separately; the remaining reviews stayed local. This additional gate is separate from the completed local application and screenshot-based agent reviews.

All sample/eval material is synthetic. Physical microphone permission and real iPhone safe-area hardware were not exercised; browser recording, real transcription, Chromium and WebKit phone layouts were. Hosting, authentication, remote phone access and the later agent jobs remain outside the specified v1 scope.
