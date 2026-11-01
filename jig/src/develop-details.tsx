import { useState, type ComponentType } from "react";
import { JigPage } from "./jig";
import { useDecisions } from "./store";
import { HITS, STANCES, TRIP_STATES, TRIP_TEXT, TODAY, type Stance, type TripState } from "./homes/details-data";
import { PaneSlice, Seg, type Decision } from "./homes/details-pane";
import { TripA, TripB, TripC, TripD, TripE, type TripProps } from "./homes/details-trip";
import { HistA, HistB, HistC, HistD, HistE, type HistProps } from "./homes/details-history";

type Spec<P> = { k: string; name: string; note: string; view: ComponentType<P> };

const TRIPS: Spec<TripProps>[] = [
  { k: "A", name: "Watched field", view: TripA, note: "Today's labelled box, with a breathing dot while the agent watches. Matching signals hang beneath it, dashed, each with Accept and Dismiss." },
  { k: "B", name: "Card with a status strip", view: TripB, note: "A tinted card that turns red when tripped. One signal at a time; Accept opens a confidence change with a note, so accepting is a stance." },
  { k: "C", name: "Sentence", view: TripC, note: "Written in the theory's own voice under the body. When it trips, the phrase is flagged in place with a red underline and a dashed count." },
  { k: "D", name: "Checklist", view: TripD, note: "Several conditions, each watched on its own and each with its own mark. Past trips stay as ticked rows." },
  { k: "E", name: "Threshold", view: TripE, note: "A metric, a direction and a line. Readings the agent pulls from signals sit on a gauge, so you see it coming before it trips." },
];
const TRIP_ROWS = [
  ["A. Watched field", "One labelled box, quietly watched", "Red mark and count in the header; signals hang beneath, dashed", "No"],
  ["B. Card", "A card with a status strip, challenge worked inside it", "Card tints red; Accept sets the new confidence and a note", "No"],
  ["C. Sentence", "“I'd change my mind if …” in the body's voice", "Phrase underlined red with a dashed count; signals unfold", "No"],
  ["D. Checklist", "Several conditions, each its own watch", "Per row: breathing, red with count, tick once resolved", "Yes"],
  ["E. Threshold", "Metric and line, with a gauge of readings", "Newest reading lands past the line, dashed until decided", "One metric each"],
];

const HISTS: Spec<HistProps>[] = [
  { k: "A", name: "Tall step chart", view: HistA, note: "Five named levels, 132px tall. Each run takes the colour of the move that began it; a red dot means the fall came from a tripwire challenge." },
  { k: "B", name: "Curve with events", view: HistB, note: "An S-curve between stances, its stroke green at the top and amber at the bottom. A lane below marks every change; hover anywhere snaps to the nearest." },
  { k: "C", name: "Ladder", view: HistC, note: "Five rungs across, newest at the top, every note in view. Reads like a diary; long, but nothing hides." },
  { k: "D", name: "Chart and log", view: HistD, note: "A short step chart over a change log of date, delta and note, with the signal behind it. Pointing at either lights up the other." },
  { k: "E", name: "Stripes", view: HistE, note: "One band per stance, as wide as it lasted, shaded from amber through grey to green. The current level is the big number." },
];
const HIST_ROWS = [
  ["A. Step chart", "Steps on five named levels, 132px", "Runs green after a rise, amber after a fall", "Hover or focus"],
  ["B. Curve", "S-curve, 168px, event lane beneath", "Stroke shaded by height; red events for challenges", "Hover anywhere"],
  ["C. Ladder", "Rungs across, time running down", "Legs green or amber", "All, always"],
  ["D. Chart and log", "64px steps over dated rows", "Delta chips", "Latest four, then all"],
  ["E. Stripes", "Bands, width is duration", "Amber to grey to green by level", "Hover or focus"],
];

function PickBtn({ group, k }: { group: string; k: string }) {
  const { decisions, update } = useDecisions();
  const on = decisions[group]?.choice === k;
  return <button className="jig-choose" aria-pressed={on} onClick={() => update(group, { choice: on ? undefined : k })}>{on ? "Picked" : "Pick"}</button>;
}

const PRESET: Record<TripState, Record<string, Decision>> = { empty: {}, watching: {}, tripped: {}, resolved: { [HITS[0].id]: "dismissed", [HITS[1].id]: "accepted" } };
const WIDTHS = [{ key: "520", label: "520" }, { key: "880", label: "880" }] as const;

function TripVariant({ spec }: { spec: Spec<TripProps> }) {
  const [state, setStateRaw] = useState<TripState>("watching");
  const [text, setText] = useState(TRIP_TEXT);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [conf, setConf] = useState(4);
  const [width, setWidth] = useState<"520" | "880">("520");
  const setState = (s: TripState) => {
    setStateRaw(s); setDecisions(PRESET[s]); setText(s === "empty" ? "" : TRIP_TEXT); setConf(s === "resolved" ? 3 : 4);
  };
  const decide = (id: string, d?: Decision) => {
    const next = { ...decisions }; if (d) next[id] = d; else delete next[id];
    setDecisions(next);
    if (d === "accepted" && spec.k !== "B") setConf(c => Math.max(1, c - 1));
    if (!d && decisions[id] === "accepted") setConf(c => Math.min(5, c + 1));
    const relevant = spec.k === "E" ? [HITS[0]] : HITS;
    if (state === "tripped" && relevant.every(h => next[h.id])) setStateRaw("resolved");
    if (state === "resolved" && !relevant.every(h => next[h.id])) setStateRaw("tripped");
  };
  const commit = () => { if (state === "empty" && text.trim()) setStateRaw("watching"); };
  const V = spec.view;
  const pending = state === "tripped" && HITS.some(h => !decisions[h.id]);
  return (
    <div className="dt-variant" id={`trip-${spec.k}`}>
      <div className="dt-variant-head">
        <h3>{spec.k}. {spec.name}</h3>
        <Seg label="State" value={state} options={TRIP_STATES} onChange={setState} />
        <Seg label="Pane width" value={width} options={[...WIDTHS]} onChange={setWidth} />
        <PickBtn group="tripwire" k={spec.k} />
      </div>
      <p className="dt-variant-note">{spec.note}</p>
      <PaneSlice width={+width} conf={conf} onConf={setConf} challenged={pending}
        trip={<V state={state} text={text} setText={setText} commit={commit} decisions={decisions} decide={decide} conf={conf} setConf={setConf} />} />
    </div>
  );
}

function HistVariant({ spec }: { spec: Spec<HistProps> }) {
  const [stances, setStances] = useState<Stance[]>(STANCES);
  const conf = stances.at(-1)!.level;
  const onConf = (n: number) => setStances(s => {
    const base = s.at(-1)!.id === "now" ? s.slice(0, -1) : s;
    return n === base.at(-1)!.level ? base : [...base, { id: "now", date: TODAY, short: "Now", level: n, note: "" }];
  });
  const V = spec.view;
  return (
    <div className="dt-variant" id={`hist-${spec.k}`}>
      <div className="dt-variant-head">
        <h3>{spec.k}. {spec.name}</h3>
        <PickBtn group="confidence-history" k={spec.k} />
      </div>
      <p className="dt-variant-note">{spec.note}</p>
      <div className="dt-frames">
        {[520, 880].map(w => (
          <div key={w}>
            <div className="dt-frame-label">{w}</div>
            <PaneSlice width={w} conf={conf} onConf={onConf} evidence={false} history={<V stances={stances} />} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table className="dt-table">
      <thead><tr>{head.map(h => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows.map(r => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}

export function DevelopDetailsJig() {
  return (
    <JigPage title="Pane details" intro={<p>Two details of the theory pane, each tried five ways inside a working slice of it: what would change my mind, and how confidence has moved.</p>}>
      <div className="dt-page">
        <section className="dt-section">
          <h2>Tripwire</h2>
          <Table head={["Variant", "Idea", "How tripping shows", "Several conditions"]} rows={TRIP_ROWS} />
          {TRIPS.map(s => <TripVariant key={s.k} spec={s} />)}
        </section>
        <section className="dt-section">
          <h2>Confidence history</h2>
          <Table head={["Variant", "Shape", "Colour", "Notes"]} rows={HIST_ROWS} />
          <p className="dt-colour-note">Green for a rise, amber for a fall. Red only where a fall came from an accepted tripwire challenge, the same red as the challenge mark.</p>
          {HISTS.map(s => <HistVariant key={s.k} spec={s} />)}
        </section>
      </div>
    </JigPage>
  );
}
