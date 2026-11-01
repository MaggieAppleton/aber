# Aber design-check gate

**Local recheck: no remaining observed app defects. Full gate: blocked and unverified.** The actual final `design check --exact-only` ran against the rebuilt `http://127.0.0.1:3000` app, completed 13 cases / 29 frames, and exited **1**. Its only remaining deterministic failures are **20 repeated accessible-name parser artifacts** on evidence buttons. No Jev review ran; this is not a `ready` result.

## External approval block

Automatic approval review rejected the actual full command before execution because it would send local app screenshots and context to `https://api.typesafe.ai/v1/systemone` without established explicit permission to export that sensitive data to this destination. It prohibited workaround or indirect execution. No retry or indirect export was attempted. **Jev calls / usage: zero.** Explicit human export approval is required before the full command can run.

The applied [actual kit design-check skill](/Users/maggieappleton/Projects/maggie-agent-kit/skills/design-and-ui/design-check/SKILL.md) says **“Completion requires exit 0 and a current `ready` result.”** It also says **“`--exact-only` is a local diagnostic; it cannot satisfy the full review.”** Local screenshot critiques in `reports/design-final/` and the deterministic evidence here therefore remain distinct from the unverified full gate.

## Final local evidence

| Check | Final result |
| --- | --- |
| Production source gate | **0 failures** across all five source rules. Broad production UI/CSS/shared components/dependencies stay watched. [Source results](source-findings.json). |
| Configured cases | All five views; confidence-history hover and pointer exit; keyboard confidence focus; tripwire collapse/reveal; 390 × 844 Briefing and pane; local capture-context add/remove and Escape; fresh reduced motion; empty Find results. **13 interaction assertions passed; seven captured paste probes passed.** |
| Timeline targets | All ten `.t2a-item` controls now measure at least **40px per axis**, including the formerly 21px-high item. Dot and position rules remain intact. [Rendered Timeline](../../.agent-kit/design/runs/b70bb9fb53d642029bd88dd29a052c94/timeline-rest-0.png). |
| Search metadata | All three captured draft metadata labels now use explicit **12px** text. |
| Capture optimization hint | `.ps-surface` now computes `will-change: auto` at rest. |
| Confidence focus | Desktop and phone retain a **112 × 40px** wrapper with a visible **2px blue outline**; the clipped native input alone has `outline: none`. Focus remains on the input named Confidence. Body width stays 1360 / 390px. [Desktop](../../.agent-kit/design/final-focus-desktop.png), [phone](../../.agent-kit/design/final-focus-phone.png). |
| Context / shared layout | Three context pills remain inside the docked composer. The five views and phone pane show no new clipping in the captured states. [Three contexts](../../.agent-kit/design/runs/b70bb9fb53d642029bd88dd29a052c94/capture-contexts-3.png). |
| Remaining 20 failures | All are `.pn-link` names, repeated across frames. The actual current Playwright snapshot is `- 'button "Undermines: Memory feature withdrawn after privacy complaints"'`; the actual role/name locator finds it once. The checker regex accepts only an unquoted YAML scalar. **The button has its correct accessible name. No app rename, rule bypass or checker patch was made.** |

[Final raw browser findings](browser-findings.json), [initial browser findings](browser-findings-initial.json), [current generated report](../../.agent-kit/design/report.md), [current report JSON](../../.agent-kit/design/report.json), [independent final DOM/asset proof](../../.agent-kit/design/final-proof.json).

The final proof observed built assets `index-DAjTYxbS.js`, `index-CVS-xeKh.css`, and `app-shell-pqGDHd8R.css`. Its browser recorded zero attempted app writes and is closed.

## Repairs and honest configuration

The first source scan found 1,072 failures across 21 production files: 825 literal sizes, 243 literal colours and four `:focus` ring selectors. [Initial source findings](source-findings-initial.json). The conversion uses shared primitives and selector-local semantic colour tokens, with ordinary rules fully scanned. The **4,936-declaration preservation audit applies to the token-conversion stage before the four deliberate quality fixes** above; it does not claim every final declaration is unchanged. [Preservation scope and intentional deltas](token-preservation.json).

`.design-check.json` documents the canonical 11–13px compact UI scale, 15px pane prose/tripwire and 26px pane title, with 16px native phone inputs. These role-specific choices were recorded before checking. Unimported jig source is a reference rather than a production dependency; canonical images, model and build spec remain context. Only shared literal definitions and exact selector-local derived colour definitions are token-source exemptions.

Two configuration defects were corrected: an unsupported `expect.height` property was removed while retaining measured rectangle/hit-area checks, and Find captures its active modal while open so the inert background is not misclassified as active dialog controls. Neither correction changes app behavior or hides active controls.

Loading/server-error injection is unsupported by this checker and is not claimed. Revision readability uses the explicitly browser-only fixture in the earlier local report; no stored revision was created. No accept, discard, send, dump, recording, confidence/horizon change or persisted drag was configured. Search uses a synthetic nonmatching phrase and its read-only tool. This pass makes no claim about unobserved states or physical iPhone safe-area hardware.
