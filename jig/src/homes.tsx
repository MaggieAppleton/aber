import type { ComponentType } from "react";
import { JigPage } from "./jig";
import { useDecisions } from "./store";
import { HOMES } from "./homes/registry";
import "./homes/homes.css";

export function HomesJig() {
  const { decisions, update } = useDecisions();
  const picks = (decisions.homes?.picks ?? []) as string[];
  const toggle = (k: string) => update("homes", { picks: picks.includes(k) ? picks.filter(p => p !== k) : [...picks, k] });
  return (
    <JigPage status={<>Superseded by <a href="/app">/app</a>: Current became Theme sections, Briefing became a view, Columns and Atlas were developed; Deck and Document are deferred.</>} title="Homepages"
      intro={<p>The current design and the five shapes picked for development, all with the same data and look so only structure differs. Each one is live: click, hover, select.</p>}
      aside={<nav className="hm-toc">{HOMES.map((h, i) => <a key={h.key} href={`#home-${h.key}`} data-picked={picks.includes(h.key) ? "" : undefined}>{i}. {h.name}</a>)}</nav>}>
      {HOMES.map((h, i) => <Home key={h.key} i={i} h={h} picked={picks.includes(h.key)} onPick={() => toggle(h.key)} />)}
      <textarea className="jig-note" rows={3} placeholder="Note (optional)" value={(decisions.homes?.note as string) ?? ""} onChange={e => update("homes", { note: e.target.value })} />
    </JigPage>
  );
}

export type HomeDef = {
  key: string; name: string; idea: string; nav: string; view: ComponentType;
  where: Record<"Dumps" | "Signals" | "Themes" | "Theories" | "Prototypes", string>;
  good: string; bad: string;
};

function Home({ h, i, picked, onPick }: { h: HomeDef; i: number; picked: boolean; onPick: () => void }) {
  return (
    <section className="hm" id={`home-${h.key}`}>
      <div className="hm-head">
        <div className="hm-head-text">
          <h2>{i}. {h.name}</h2>
          <p>{h.idea}</p>
          <span className="hm-nav">{h.nav}</span>
        </div>
        <button className="jig-choose" aria-pressed={picked} onClick={onPick}>{picked ? "Developing" : "Develop"}</button>
      </div>
      <div className="hm-frame"><h.view /></div>
      <div className="hm-cols">
        <table className="hm-where"><tbody>
          {Object.entries(h.where).map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}
        </tbody></table>
        <div className="hm-proscons">
          <p><strong>Good at</strong> {h.good}</p>
          <p><strong>Weak at</strong> {h.bad}</p>
        </div>
      </div>
    </section>
  );
}
