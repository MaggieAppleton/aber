import { Accordion } from "@base-ui/react/accordion";
import { field, json, rowFor, type Row } from "../data/live";
import { Icon, type IconName } from "./atoms";
import { suggestionFields } from "./suggestion-fields";
import { SuggestionReview } from "./suggestion-review";
import "./suggestion-preview.css";

function sourceName(source: Row): string {
  if (source.url) {
    try { return new URL(source.url).hostname.replace(/^www\./, ""); } catch { /* Fall back to the recorded source. */ }
  }
  return source.author ?? source.title ?? "Own observation";
}

/** A compact pane preview; the existing review remains the place to edit and decide. */
export function SuggestionPreview({ suggestion: s }: { suggestion: Row }) {
  const payload = json<Row>(s.payload ?? s.payload_json, {});
  const kind = field(s, "targetKind"), target = rowFor(kind, field(s, "targetId"));
  const signal = rowFor("signal", payload.signalId ?? payload.signal_id);
  const other = rowFor(kind, payload.otherId ?? payload.other_id);
  const fields = suggestionFields(s.kind, payload, kind);
  const stance = payload.stance === "supports" ? "Supports" : "Undermines";
  const words = s.kind === "evidence"
    ? `${stance}: ${signal?.gist ?? payload.gist ?? s.gist ?? "Proposed evidence"}`
    : s.kind === "merge"
      ? `Merge ${other?.name ?? other?.claim ?? "the proposed object"} into ${target?.name ?? target?.claim ?? "this object"}`
      : fields.filter(f => f.value).map(f => f.value).join("\n") || "Review proposed wording";
  const icon: IconName = s.kind === "evidence" ? (payload.stance === "supports" ? "arrowUp" : "arrowDown")
    : s.kind === "merge" ? "merge" : kind === "theme" ? "theme" : kind === "prototype" ? "prototype" : "theory";
  const sources = signal ? [...new Set(json<Row[]>(signal.sources, []).map(sourceName))].join(", ") : "";

  return <Accordion.Root className="pn-proposal" data-pane-suggestion-id={s.id}>
    <Accordion.Item value={s.id}>
      <Accordion.Header className="pn-proposal-heading">
        <Accordion.Trigger className="pn-proposal-toggle" aria-label={`Review proposal: ${words}`}>
          <span className="pn-proposal-icon"><Icon name={icon} size={12} /></span>
          <span className="pn-proposal-copy">
            <span className="pn-proposal-words">{words}</span>
            {(sources || s.reasoning) && <span className="pn-proposal-context">
              {sources && <span className="pn-proposal-source">{sources}</span>}
              {s.reasoning && <span className="pn-proposal-reason">{s.reasoning}</span>}
            </span>}
          </span>
          <span className="pn-proposal-chevron"><Icon name="chevron" size={12} /></span>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Panel keepMounted className="pn-proposal-panel ab-accordion-panel">
        <SuggestionReview suggestion={s} />
      </Accordion.Panel>
    </Accordion.Item>
  </Accordion.Root>;
}
