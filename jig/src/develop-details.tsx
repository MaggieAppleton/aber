import { useState, type ComponentType } from "react";
import { JigPage } from "./jig";
import { useDecisions } from "./store";
import { HITS, STANCES, TRIP_STATES, TRIP_TEXT, TODAY, type Stance, type TripState } from "./homes/details-data";
import { PaneSlice, Seg, type Decision } from "./homes/details-pane";
import { TripA, TripB, TripC, TripD, TripE, type TripProps } from "./homes/details-trip";
import { HistA, HistB, HistC, HistD, HistE, type HistProps } from "./homes/details-history";

type Spec<P> = { k: string; name: string; note: string; view: ComponentType<P> };

const TRIPS: Spec<TripProps>[] = [
  { k: "C", name: "Sentence", view: TripC, note: "Written in the theory's own voice under the body, the signpost inline at its start. When it trips, the signpost turns red, the phrase gets a red underline and a dashed count, and the signals unfold beneath." },
  { k: "A", name: "Watched field", view: TripA, note: "Today's labelled box, with a breathing dot while the agent watches. Matching signals hang beneath it, dashed, each with Accept and Dismiss." },
  { k: "B", name: "Card with a status strip", view: TripB, note: "A tinted card that turns red when tripped. One signal at a time; Accept opens a confidence change with a note, so accepting is a stance." },
  { k: "D", name: "Checklist", view: TripD, note: "Several conditions, each watched on its own and each with its own mark. Past trips stay as ticked rows." },
  { k: "E", name: "Threshold", view: TripE, note: "A metric, a direction and a line. Readings the agent pulls from signals sit on a gauge, so you see it coming before it trips." },
];
const TRIP_ROWS = [
  ["C. Sentence", "“I'd change my mind if …” in the body's voice", "Phrase underlined red with a dashed count; signals unfold", "No"],
  ["A. Watched field", "One labelled box, quietly watched", "Red mark and count in the header; signals hang beneath, dashed", "No"],
  ["B. Card", "A card with a status strip, challenge worked inside it", "Card tints red; Accept sets the new confidence and a note", "No"],
  ["D. Checklist", "Several conditions, each its own watch", "Per row: breathing, red with count, tick once resolved", "Yes"],
  ["E. Threshold", "Metric and line, with a gauge of readings", "Newest reading lands past the line, dashed until decided", "One metric each"],
];

const HISTS: Spec<HistProps>[] = [
  { k: "A", name: "Steps", view: HistA, note: "Hard steps, no smoothing, across the full 1 to 5 range. Each run takes the colour of the move that began it; red where a fall came from a tripwire challenge." },
  { k: "B", name: "Steps with a fill", view: HistB, note: "The same steps over a soft fill in the current level's tone: amber when doubtful, grey at even, green when likely or sure." },
  { k: "C", name: "Angled with change dots", view: HistC, note: "Straight lines between stances, each coloured by its direction, with a small dot at every change." },
  { k: "D", name: "Ink around even", view: HistD, note: "One ink line around a faint dotted baseline at Even, so above and below read at a glance. Only the end dot carries colour." },
  { k: "E", name: "Shaded by height", view: HistE, note: "The stroke shades from amber at Doubtful through grey to green at Sure, so where the line sits is its colour." },
];
const HIST_ROWS = [
  ["A. Steps", "Hard steps, 52×20", "Runs by direction", "End dot"],
  ["B. Steps with a fill", "Steps over a soft fill", "Runs by direction, fill by current level", "End dot"],
  ["C. Angled", "Straight lines, 52×20", "Segments by direction", "Every change, plus end"],
  ["D. Ink around even", "Ink line, dotted Even baseline", "End dot only", "End dot"],
  ["E. Shaded by height", "Straight lines", "Stroke shaded amber to green by level", "End dot"],
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
            <PaneSlice width={w} conf={conf} onConf={onConf} evidence={false} body={false} confExtra={<V stances={stances} />} />
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
          <Table head={["Variant", "Shape", "Colour", "Dots"]} rows={HIST_ROWS} />
          <p className="dt-colour-note">Inline beside the confidence steps, 20px tall instead of 14, scaled to the full range so moves read clearly. Green for a rise, amber for a fall, red only for a fall from an accepted tripwire challenge. Hover or focus shows the dated log.</p>
          {HISTS.map(s => <HistVariant key={s.k} spec={s} />)}
        </section>
      </div>
    </JigPage>
  );
}
