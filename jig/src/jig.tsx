import type { ReactNode } from "react";
import type { Decision as Stored } from "./store";

export function JigPage({ title, intro, children, aside }: { title: string; intro?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <main className="jig">
      <header className="jig-header">
        <a href="/">Jigs</a>
        <h1>{title}</h1>
        {intro && <div className="jig-intro">{intro}</div>}
        {aside}
      </header>
      {children}
    </main>
  );
}

export type Option = {
  key: string;
  label: string;
  note: string;
  recommended?: boolean;
  confidence?: "high" | "moderate" | "low";
  visual?: ReactNode;
};

/** One open question: options side by side, each selectable, plus a note. */
export function Question({ id, title, context, options, value, onChange, controls, compact }: {
  id: string;
  title: string;
  context: ReactNode;
  options: Option[];
  value: Stored | undefined;
  onChange: (patch: Stored) => void;
  controls?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="jig-question" id={id} data-answered={value?.choice ? "" : undefined}>
      <div className="jig-question-heading">
        <h2>{title}</h2>
        <p>{context}</p>
        {controls}
      </div>
      <div className="jig-options" data-compact={compact ? "" : undefined}>
        {options.map(o => {
          const chosen = value?.choice === o.key;
          return (
            <div key={o.key} className="jig-option" data-chosen={chosen ? "" : undefined}>
              {o.visual && <div className="jig-option-visual">{o.visual}</div>}
              <div className="jig-option-text">
                <div className="jig-option-title">
                  <strong>{o.label}</strong>
                  {o.recommended && <span className="jig-tag">Recommended{o.confidence ? `, ${o.confidence} confidence` : ""}</span>}
                </div>
                <p>{o.note}</p>
              </div>
              <button
                className="jig-choose"
                aria-pressed={chosen}
                onClick={() => onChange({ choice: chosen ? undefined : o.key })}
              >
                {chosen ? "Chosen" : "Choose"}
              </button>
            </div>
          );
        })}
      </div>
      <textarea
        className="jig-note"
        placeholder="Note (optional)"
        value={value?.note ?? ""}
        onChange={e => onChange({ note: e.target.value })}
        rows={2}
      />
    </section>
  );
}
