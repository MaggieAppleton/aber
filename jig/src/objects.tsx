import { useState } from "react";
import { JigPage } from "./jig";
import { useDecisions } from "./store";
import { OBJECTS, SCALES, scaleOf, type ObjectKey, type ObjectReq } from "./objects-data";
import { SHAPES } from "./shapes";
import "./objects.css";

const MAX_LOG = 5; // axis runs from 1 to 100,000
const x = (n: number) => `${(Math.log10(Math.max(1, n)) / MAX_LOG) * 100}%`;
const fmt = (n: number) => n.toLocaleString("en-GB");

export function ObjectsJig() {
  const { decisions, update, saved } = useDecisions();
  const counts = (decisions.counts ?? {}) as Record<string, Partial<ObjectReq>>;
  const objects = OBJECTS.map(o => ({ ...o, ...counts[o.key] }));
  const picks = decisions.shapes?.picks ?? [];

  const setCount = (key: ObjectKey, field: "live" | "y1" | "y3", value: number) =>
    update("counts", { [key]: { ...counts[key], [field]: value } });

  return (
    <JigPage
      title="Objects and how many there are"
      intro={<p>What the interface has to hold before we pick a shape. The numbers are my estimates (low confidence): edit them in place.</p>}
      aside={<div className="jig-status">{saved ? "Saved" : "Saving"}</div>}
    >
      <div className="jig-section-label">Population and what it can bear</div>
      <Ladder objects={objects} onEdit={setCount} />

      <div className="jig-section-label">What each one asks of the interface</div>
      <Requirements objects={objects} />

      <div className="jig-section-label">How you move between them</div>
      <RelationshipMap objects={objects} />

      <div className="jig-section-label">Shapes to explore next</div>
      <p className="ob-lede">Pick the ones worth building as live jigs. Each puts a different object at the centre.</p>
      <div className="ob-shapes">
        {SHAPES.map(s => {
          const on = picks.includes(s.key);
          return (
            <button key={s.key} className="ob-shape" aria-pressed={on}
              onClick={() => update("shapes", { picks: on ? picks.filter(p => p !== s.key) : [...picks, s.key] })}>
              <div className="ob-shape-sketch">{s.sketch}</div>
              <strong>{s.name}</strong>
              <span>{s.centre}</span>
              <p>{s.note}</p>
            </button>
          );
        })}
      </div>
      <textarea className="jig-note" rows={2} placeholder="Note (optional)" value={decisions.shapes?.note ?? ""}
        onChange={e => update("shapes", { note: e.target.value })} />
    </JigPage>
  );
}

function Ladder({ objects, onEdit }: { objects: ObjectReq[]; onEdit: (k: ObjectKey, f: "live" | "y1" | "y3", v: number) => void }) {
  const [open, setOpen] = useState<ObjectKey>();
  const bounds = [1, ...SCALES.slice(0, -1).map(s => s.max), 10 ** MAX_LOG];
  return (
    <div className="ob-ladder">
      <div className="ob-bands">
        {SCALES.map((s, i) => (
          <div key={s.name} className="ob-band" style={{ left: x(bounds[i]), width: `calc(${x(bounds[i + 1])} - ${x(bounds[i])})` }}>
            <strong>{s.name}</strong>
            <span>{s.how}</span>
          </div>
        ))}
      </div>
      {objects.map(o => (
        <div key={o.key} className="ob-lane" data-open={open === o.key ? "" : undefined}>
          <button className="ob-lane-name" onClick={() => setOpen(open === o.key ? undefined : o.key)} aria-expanded={open === o.key}>
            {o.name}
          </button>
          <div className="ob-track">
            <div className="ob-range" style={{ left: x(o.live), width: `calc(${x(o.y3)} - ${x(o.live)})` }} />
            <Marker n={o.live} label={`${fmt(o.live)} ${o.liveWhat}`} kind="live" />
            <Marker n={o.y1} label={`${fmt(o.y1)} by year 1`} kind="y1" />
            <Marker n={o.y3} label={`${fmt(o.y3)} by year 3`} kind="y3" />
          </div>
          <div className="ob-verdict">Live ones: {SCALES[scaleOf(o.live)].name.toLowerCase()}. Every one: {SCALES[scaleOf(o.y3)].name.toLowerCase()}.</div>
          {open === o.key && (
            <div className="ob-edit">
              {(["live", "y1", "y3"] as const).map(f => (
                <label key={f}>
                  {{ live: "Live at once", y1: "Year 1", y3: "Year 3" }[f]}
                  <input type="number" min={1} value={o[f]} onChange={e => onEdit(o.key, f, Math.max(1, +e.target.value))} />
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Marker({ n, label, kind }: { n: number; label: string; kind: string }) {
  return (
    <div className="ob-marker" data-kind={kind} style={{ left: x(n) }}>
      <i />
      <span>{label}</span>
    </div>
  );
}

function Requirements({ objects }: { objects: ObjectReq[] }) {
  return (
    <div className="ob-table-wrap">
      <table className="ob-table">
        <thead>
          <tr><th /><th>Arrives</th><th>Questions you ask of it</th><th>To see every one</th><th>Usually seen</th><th>Reached from</th></tr>
        </thead>
        <tbody>
          {objects.map(o => (
            <tr key={o.key}>
              <th>{o.name}<span>{o.kind}</span></th>
              <td>{o.arrives}</td>
              <td>{o.asks.map(a => <div key={a}>{a}</div>)}</td>
              <td>{o.all}</td>
              <td>{o.context}</td>
              <td>{o.reachedFrom}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Edge = { from: ObjectKey; to: ObjectKey; label: string; loop?: "left" | "right"; twoWay?: boolean };
const EDGES: Edge[] = [
  { from: "dump", to: "signal", label: "splits into" },
  { from: "signal", to: "theme", label: "filed in" },
  { from: "signal", to: "theory", label: "evidence for" },
  { from: "theory", to: "theme", label: "positions on" },
  { from: "prototype", to: "theory", label: "embodies" },
  { from: "theory", to: "theory", label: "follows from", loop: "left" },
  { from: "theory", to: "theory", label: "rivals", loop: "right", twoWay: true },
];
const POS: Record<ObjectKey, [number, number]> = {
  dump: [110, 200], signal: [360, 200], theme: [640, 80], theory: [640, 320], prototype: [900, 320],
};
const radius = (n: number) => 14 + Math.log10(Math.max(1, n)) * 8;

function RelationshipMap({ objects }: { objects: ObjectReq[] }) {
  const [hot, setHot] = useState<ObjectKey>();
  const size = Object.fromEntries(objects.map(o => [o.key, radius(o.y3)])) as Record<ObjectKey, number>;
  const touches = (e: Edge, k?: ObjectKey) => !k || e.from === k || e.to === k;
  const linked = (k: ObjectKey) => !hot || hot === k || EDGES.some(e => touches(e, hot) && touches(e, k));

  return (
    <div className="ob-map-wrap">
      <svg viewBox="0 0 1010 470" className="ob-map" role="img" aria-label="Relationships between objects">
        <defs>
          <marker id="ob-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className="ob-arrowhead" />
          </marker>
        </defs>
        {EDGES.map(e => {
          const [x1, y1] = POS[e.from], [x2, y2] = POS[e.to];
          const on = touches(e, hot);
          if (e.loop) {
            const r = size.theory, dir = e.loop === "left" ? -1 : 1;
            const a = { x: x1 + dir * r, y: y1 + r * 0.15 };
            const b = { x: x1 + dir * r * 0.6, y: y1 + r * 0.8 };
            const c1 = { x: x1 + dir * (r + 80), y: y1 };
            const c2 = { x: x1 + dir * (r + 40), y: y1 + r + 70 };
            return (
              <g key={e.label} className="ob-edge" data-on={on ? "" : undefined}>
                <path d={`M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x + dir * 2} ${b.y + 3}`} fill="none"
                  markerEnd="url(#ob-arrow)" markerStart={e.twoWay ? "url(#ob-arrow)" : undefined} />
                <text x={x1 + dir * (r + 62)} y={y1 + r + 54} textAnchor={dir < 0 ? "end" : "start"}>{e.label}</text>
              </g>
            );
          }
          const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
          const sx = x1 + ux * (size[e.from] + 4), sy = y1 + uy * (size[e.from] + 4);
          const ex = x2 - ux * (size[e.to] + 6), ey = y2 - uy * (size[e.to] + 6);
          const vertical = Math.abs(dx) < 1;
          return (
            <g key={e.label} className="ob-edge" data-on={on ? "" : undefined}>
              <line x1={sx} y1={sy} x2={ex} y2={ey} markerEnd="url(#ob-arrow)" />
              <text x={(sx + ex) / 2 + (vertical ? 10 : 0)} y={(sy + ey) / 2 + (vertical ? 4 : -8)} textAnchor={vertical ? "start" : "middle"}>{e.label}</text>
            </g>
          );
        })}
        {objects.map(o => {
          const [cx, cy] = POS[o.key], r = size[o.key];
          return (
            <g key={o.key} className="ob-node" data-on={linked(o.key) ? "" : undefined}
              onPointerEnter={() => setHot(o.key)} onPointerLeave={() => setHot(undefined)}>
              <circle cx={cx} cy={cy} r={r} data-kind={o.kind} />
              <text x={cx} y={cy + 4} textAnchor="middle" className="ob-node-count" data-kind={o.kind}>{fmt(o.y3)}</text>
              <text x={cx} y={o.key === "theme" ? cy - r - 12 : cy + r + 20} textAnchor="middle" className="ob-node-name">{o.name}</text>
            </g>
          );
        })}
      </svg>
      <div className="ob-map-notes">
        <p><strong>Theory is the hub.</strong> Four kinds of link meet there, including the only links from a type to itself.</p>
        <p><strong>Everything flows right.</strong> Raw material on the left becomes claims and things you build on the right.</p>
        <p><strong>Size is inverse to importance.</strong> The largest populations are the ones you look at least directly.</p>
        <p className="ob-key"><span data-kind="Stock" /> Stock <span data-kind="Flow" /> Flow. Numbers are year-3 counts; circle size is on a log scale.</p>
      </div>
    </div>
  );
}
