import { useState, type ReactNode } from "react";
import { JigPage } from "./jig";
import { useDecisions } from "./store";
import { install, type Scale } from "./homes/timeline2-data";
import { Field } from "./homes/timeline2-field";
import { Lanes } from "./homes/timeline2-lanes";
import { River } from "./homes/timeline2-river";
import "./homes/homes.css";

const KEY = "timeline-direction";

const SUMMARY: [string, string, string, string, string][] = [
  ["A. Field", "Year across, confidence down; drafts in their own dashed row", "None at rest. Dwell: direct links, faint. Select: the whole chain as one path, rivals as an arc, the rest recedes", "Search popover, one theme; non-matching theories leave", "Rows take the height they need; labels step down from wrapped claims to one line to dots that name themselves"],
  ["B. Lanes", "Theme lanes, year across; one card per theory, light references in its other lanes; confidence on the card", "Select: chain drawn across lanes", "The lanes are the filter: fold, open, search", "Folded lanes become a theme × year dot matrix; 36 themes fit one screen"],
  ["C. River", "Years down from now; sorted by confidence; drafts last with a dashed ring", "Rivals beside their theory at rest. Select: unrelated rows fold away, the chain reads top to bottom with rails in the margin", "Search popover, one theme", "Scrolls; the year strip is index and density; 200 theories is a long list, never a smaller one"],
];

const CHANGED = [
  "No permanent arrows. Relationships appear on selection, as one path through time.",
  "The theme chip row is gone: a search popover (A, C) or foldable lanes (B) handle 40 to 150 themes.",
  "Rivals are visible: an arc with a swap badge (A), beside the theory at rest (C).",
  "Claims are never cut at the 15-theory scale; density changes the label level, not the text size.",
  "Drafts keep their year instead of queuing in a strip; dashed still means not yet mine.",
  "The axis fits the data: empty confidence rows shrink, the field starts at 2027.",
  "Filtering removes rather than dims, so dimming only ever means not in this chain.",
];

function Direction({ id, title, line, children }: { id: string; title: string; line: string; children: (scale: Scale) => ReactNode }) {
  const [scale, setScale] = useState<Scale>("now");
  const { decisions, update } = useDecisions();
  const picked = decisions[KEY]?.choice === id;
  return (
    <section className="hm" id={id}>
      <div className="hm-head">
        <div className="hm-head-text"><h2>{title}</h2><p>{line}</p></div>
        <div className="t2p-controls">
          <div className="t2p-seg" role="group" aria-label="How many theories">
            {(["now", "year1"] as const).map(s => (
              <button key={s} aria-pressed={scale === s} onClick={() => setScale(s)} title={s === "now" ? "Now: 15 theories, 7 themes" : "Year 1: 60 theories, 40 themes"}>{s === "now" ? "15" : "60"}</button>
            ))}
          </div>
          <button className="jig-choose" aria-pressed={picked} onClick={() => update(KEY, { choice: picked ? undefined : id })}>{picked ? "Picked" : "Pick"}</button>
        </div>
      </div>
      <div className="hm-frame">{children(scale)}</div>
    </section>
  );
}

export function DevelopTimelineJig() {
  install();
  return (
    <JigPage title="Timeline"
      intro={<>
        <p>Three structures for seeing what I believe will happen when, how sure I am, what rests on what, and where theories compete; each switches between 15 theories and 60 to test scale.</p>
        <table className="hm-where t2p-table" style={{ marginTop: 8 }}>
          <thead><tr><th></th><th>Encoding</th><th>Relationships</th><th>Theme filter</th><th>Scale</th></tr></thead>
          <tbody>{SUMMARY.map(r => <tr key={r[0]}>{r.map((c, i) => i === 0 ? <th key={i}>{c}</th> : <td key={i}>{c}</td>)}</tr>)}</tbody>
        </table>
      </>}>
      <Direction id="field" title="A. Field" line="Where my beliefs sit in time and certainty. Nothing is connected until I pick a theory.">
        {scale => <Field key={scale} scale={scale} />}
      </Direction>
      <Direction id="lanes" title="B. Lanes" line="Each theme as a lane through time. Fold the lanes you are not thinking about.">
        {scale => <Lanes key={scale} scale={scale} />}
      </Direction>
      <Direction id="river" title="C. River" line="Time runs down from now. Rivals sit beside each other; a chain is drawn in the margin when I pick a theory.">
        {scale => <River key={scale} scale={scale} />}
      </Direction>
      <section className="hm" id="changed">
        <div className="hm-head"><div className="hm-head-text"><h2>What changed from the first timeline</h2></div></div>
        <ul className="t2p-list">{CHANGED.map(c => <li key={c}>{c}</li>)}</ul>
      </section>
    </JigPage>
  );
}
