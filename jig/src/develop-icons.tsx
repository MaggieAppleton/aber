import { useState } from "react";
import { JigPage } from "./jig";
import { useDecisions } from "./store";
import { CONCEPTS, CURRENT, META, SETS, G, Preview, CandidateCard, type Concept, type Glyph, type Set } from "./homes/icons-explore";
import "./homes/icons-explore.css";

type Hover = { c: Concept; n: Glyph } | { set: Set } | null;
type Base = "picks" | "current";

export function DevelopIconsJig() {
  const { decisions, update, saved } = useDecisions();
  const [hover, setHover] = useState<Hover>(null);
  const [base, setBase] = useState<Base>("picks");

  const pickedSet = SETS.find(s => s.k === decisions["icon-set"]?.choice)?.set;
  const picked = (c: Concept) => decisions[`icon-${c}`]?.choice as Glyph | undefined;
  const baseSet = Object.fromEntries(CONCEPTS.map(c => [c, base === "current" ? CURRENT[c] : picked(c) ?? pickedSet?.[c] ?? CURRENT[c]])) as Set;
  const shown: Set = hover && "set" in hover ? hover.set : hover ? { ...baseSet, [hover.c]: hover.n } : baseSet;
  const hot = hover && "c" in hover ? hover.c : null;

  const toggle = (id: string, k: string) => update(id, { choice: decisions[id]?.choice === k ? undefined : k });

  return (
    <JigPage
      title="Object icons"
      intro={<p>Candidates from Phosphor for signal, theme, theory and prototype. Dump stays a tray. Hover a candidate or a set to see it in place; the right column shows your picks together.</p>}
      aside={<span className="jig-status">{saved ? "Saved" : "Saving"}</span>}
    >
      <div className="ix-page">
        <div className="ix-left">
          <section className="ix-section">
            <h2>Sets</h2>
            <div className="ix-sets">
              {SETS.map(s => {
                const on = decisions["icon-set"]?.choice === s.k;
                return (
                  <div key={s.k} className="ix-set" data-picked={on ? "" : undefined}
                    onPointerEnter={() => setHover({ set: s.set })} onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover({ set: s.set })} onBlur={() => setHover(null)}>
                    <div className="ix-set-glyphs">
                      <span title="Dump"><G n="TrayArrowDown" size={20} /></span>
                      {CONCEPTS.map(c => <span key={c} title={`${META[c].title}: ${s.set[c]}`}><G n={s.set[c]} size={20} /></span>)}
                    </div>
                    <div className="ix-card-name"><strong>{s.name}</strong></div>
                    <p className="ix-set-names">{CONCEPTS.map(c => s.set[c]).join(", ")}</p>
                    <p>{s.note}</p>
                    <button className="jig-choose" aria-pressed={on} onClick={() => toggle("icon-set", s.k)}>{on ? "Picked" : "Pick"}</button>
                  </div>
                );
              })}
            </div>
          </section>

          {CONCEPTS.map(c => (
            <section key={c} className="ix-section" id={`icon-${c}`}>
              <h2><G n={shown[c]} size={16} />{META[c].title}</h2>
              <p className="ix-gist">{META[c].gist}</p>
              <div className="ix-grid">
                {META[c].candidates.map(cand => (
                  <CandidateCard key={cand.n} c={c} cand={cand} picked={picked(c) === cand.n}
                    onPick={() => toggle(`icon-${c}`, cand.n)}
                    onHover={on => setHover(on ? { c, n: cand.n } : null)} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="ix-right">
          <div className="ix-right-head">
            <h2>In context</h2>
            <div className="ix-seg" role="radiogroup" aria-label="Preview against">
              <button role="radio" aria-checked={base === "picks"} onClick={() => setBase("picks")} title="Your picks together, with the hovered candidate swapped in">Whole set</button>
              <button role="radio" aria-checked={base === "current"} onClick={() => setBase("current")} title="Today's icons, with only the hovered candidate swapped in">Against current</button>
            </div>
          </div>
          <Preview set={shown} hot={hot} />
        </aside>
      </div>
    </JigPage>
  );
}
