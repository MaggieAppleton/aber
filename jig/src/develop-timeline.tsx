import { useState, type ReactNode } from "react";
import { JigPage } from "./jig";
import { useDecisions } from "./store";
import { install, type Scale } from "./homes/timeline2-data";
import { Field } from "./homes/timeline2-field";
import { Lanes } from "./homes/timeline2-lanes";
import { River } from "./homes/timeline2-river";
import { FieldChains } from "./homes/timeline2-fieldx";
import { RiverChains } from "./homes/timeline2-riverx";
import "./homes/homes.css";

const KEY = "timeline-direction";

const SUMMARY: [string, string, string, string, string][] = [
  ["A. Field", "Year across, confidence down; drafts in their own dashed row", "None at rest. Dwell: direct links, faint. Select: the whole chain as one path, rivals as an arc, the rest recedes", "Search popover, one theme; non-matching theories leave", "Rows take the height they need; labels step down from wrapped claims to one line to dots that name themselves"],
  ["B. Lanes", "Theme lanes, year across; one card per theory, light references in its other lanes; confidence on the card", "Select: chain drawn across lanes", "The lanes are the filter: fold, open, search", "Folded lanes become a theme × year dot matrix; 36 themes fit one screen"],
  ["C. River", "Years down from now; sorted by confidence; drafts last with a dashed ring", "Rivals beside their theory at rest. Select: unrelated rows fold away, the chain reads top to bottom with rails in the margin", "Search popover, one theme", "Scrolls; the year strip is index and density; 200 theories is a long list, never a smaller one"],
];

const CHAINS: [string, string, string, string][] = [
  ["1. One hop", "Direct causes and consequences, in place; labels on their dots, truncated rather than moved", "A +n count on each neighbour opens one more level; levels stack, Esc closes the last", "Clearest at a glance; a long chain takes several clicks and links still cross the field"],
  ["2. Morph", "Same as one hop", "Follow chain lays the whole chain out in columns by depth, claims in full, short links between neighbours", "Reads the whole chain, but leaves time and confidence for a moment"],
  ["3. Bundle", "Direct links only, sharing a trunk along the lane between rows", "Never drawn; a count on the consequence they run through", "Calmest drawing; going deeper means selecting the next theory"],
  ["R1. Outline", "The river folds to a nested outline: causes above, the theory, consequences indented below, in time order", "+n on a row opens its next level, nested under it", "Reads like a list, never a diagram; years are on each row instead of headers"],
  ["R2. Morph", "Same as the outline", "Follow chain: rows rearrange into the same chain columns as Field 2", "The whole chain at once, but the river's time order gives way to depth"],
  ["R3. Trunk", "The river stays; only direct neighbours remain, on one trunk in the margin with a tick into each row", "Never drawn; a count on the row they run through", "Keeps the river's year sections; deeper means selecting the next theory"],
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

function Direction({ id, title, line, children, pickKey = KEY, start = "now" }: { id: string; title: string; line: string; children: (scale: Scale) => ReactNode; pickKey?: string; start?: Scale }) {
  const [scale, setScale] = useState<Scale>(start);
  const { decisions, update } = useDecisions();
  const picked = decisions[pickKey]?.choice === id;
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
          <button className="jig-choose" aria-pressed={picked} onClick={() => update(pickKey, { choice: picked ? undefined : id })}>{picked ? "Picked" : "Pick"}</button>
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
      <section className="hm" id="chains">
        <div className="hm-head"><div className="hm-head-text"><h2>Clearer chains</h2>
          <p>Selecting a well-connected theory at 60 drew its whole downstream chain at once, in Field and in River. Each variant starts on “Tokens become nearly free for routine work”; the arrow button returns to rest.</p></div></div>
        <table className="hm-where t2p-table">
          <thead><tr><th></th><th>Selection shows</th><th>Deeper links</th><th>Trade-off</th></tr></thead>
          <tbody>{CHAINS.map(r => <tr key={r[0]}>{r.map((c, i) => i === 0 ? <th key={i}>{c}</th> : <td key={i}>{c}</td>)}</tr>)}</tbody>
        </table>
      </section>
      <Direction id="chain-hop" pickKey="timeline-chain" start="year1" title="Field 1. One hop at a time" line="Direct causes and consequences only, labelled on their own dots. A count opens the next level; Esc closes the last one.">
        {scale => <FieldChains key={scale} scale={scale} variant="hop" />}
      </Direction>
      <Direction id="chain-morph" pickKey="timeline-chain" start="year1" title="Field 2. Morph into a chain" line="One hop at a time, plus Follow chain: the field rearranges into columns by depth, and back on Esc.">
        {scale => <FieldChains key={scale} scale={scale} variant="morph" />}
      </Direction>
      <Direction id="chain-bundle" pickKey="timeline-chain" start="year1" title="Field 3. Bundle and summarise" line="Direct links only, sharing a trunk along the row lanes. Anything further is a count on the theory it runs through.">
        {scale => <FieldChains key={scale} scale={scale} variant="bundle" />}
      </Direction>
      <Direction id="chain-r-outline" pickKey="timeline-chain-river" start="year1" title="River 1. One hop, as an outline" line="Direct causes above, consequences nested below, in time order. A count opens the next level under its row; Esc closes the last one.">
        {scale => <RiverChains key={scale} scale={scale} variant="outline" />}
      </Direction>
      <Direction id="chain-r-morph" pickKey="timeline-chain-river" start="year1" title="River 2. Morph into a chain" line="The outline, plus Follow chain: the rows rearrange into columns by depth, and back on Esc.">
        {scale => <RiverChains key={scale} scale={scale} variant="morph" />}
      </Direction>
      <Direction id="chain-r-trunk" pickKey="timeline-chain-river" start="year1" title="River 3. One trunk" line="Only direct neighbours stay in the river, joined by a single trunk in the margin. Anything further is a count on the row it runs through.">
        {scale => <RiverChains key={scale} scale={scale} variant="trunk" />}
      </Direction>
      <section className="hm" id="changed">
        <div className="hm-head"><div className="hm-head-text"><h2>What changed from the first timeline</h2></div></div>
        <ul className="t2p-list">{CHANGED.map(c => <li key={c}>{c}</li>)}</ul>
      </section>
    </JigPage>
  );
}
