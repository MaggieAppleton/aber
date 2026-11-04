import { useMemo, type KeyboardEvent } from "react";
import { THEMES, theoriesIn, theme } from "../data";
import { Mark } from "../atoms";
import { ThemeName } from "../panes";
import { W, H, REGION, SIGS, rand, terrain } from "./geo";
import { counts, type SignalEncoding } from "./signals";
import "./styles.css";

/** Structure: how territories are drawn. */
export type MapStyle = "circles" | "terrain";
/** Treatment: the surface over either structure (ground, fills, edges, dots, pins, labels). Unset is the current look. */
export type Treatment = "paper" | "fine" | "graphite" | "night";

type GroundProps = { focus?: string; selTheme?: string; onRegion: (id: string) => void; signals?: SignalEncoding };
const isOpen = (id: string) => theoriesIn(id).length === 0;
/** Bigger territories first, so a smaller one that overlaps stays clickable. */
const BY_SIZE = () => [...THEMES].sort((a,b)=>REGION[b.id].r-REGION[a.id].r);

/** An SVG territory that behaves like a button. */
function hitProps(id: string, props: GroundProps) {
  const { focus, selTheme, onRegion } = props;
  return {
    role: "button", tabIndex: 0, "aria-label": regionLabel(id, props.signals),"data-pick":id,"data-kind":"theme","data-label":theme(id).name,"data-region":id,
    "data-open": isOpen(id) ? "" : undefined, "data-zoomed": focus === id ? "" : undefined, "data-sel": selTheme === id ? "" : undefined,
    onClick: () => onRegion(id),
    onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onRegion(id); } },
  };
}

/** Where a territory's name hangs (its top centre), in either structure. */
export function nameAt(style: MapStyle, id: string) {
  if (style === "terrain") return terrain().hits.find(h => h.id === id)!.name;
  const R = REGION[id];
  return { x: R.x, y: R.y - R.r + 16 };
}

/** The count a territory carries when its signals are not drawn: how many, and how many arrived today. */
function Count({ id }: { id: string }) {
  const c = counts(id);
  if (!c.n) return null;
  return (
    <span className="a2-count ap-num">
      <span>{c.n}</span>
    </span>
  );
}

/** Territory names: under the signals, above the ground. */
function Names({ style, selTheme, count }: { style: MapStyle; selTheme?: string; count?: boolean }) {
  return THEMES.map(th => {
    const p = nameAt(style, th.id);
    return (
      <span key={th.id} className="a2-name" data-sel={selTheme === th.id ? "" : undefined} style={{ left: p.x, top: p.y }}>
        <ThemeName id={th.id} />{isOpen(th.id) && <Mark kind="open" />}{count && <Count id={th.id} />}
      </span>
    );
  });
}

/** Spoken name of a territory: its name, and its signal count when the map shows counts instead of marks. */
function regionLabel(id: string, signals?: SignalEncoding) {
  if (signals !== "none" && signals !== "zoom") return theme(id).name;
  const c = counts(id);
  return `${theme(id).name}, ${c.n} signal${c.n === 1 ? "" : "s"}${c.fresh ? `, ${c.fresh} new` : ""}`;
}
const showsCount = (signals?: SignalEncoding) => signals === "none" || signals === "zoom";

/** Signals: one element per signal in both structures, so a treatment styles them the same way. */
function Dots({ dots }: { dots: { id: string; x: number; y: number; fresh: boolean }[] }) {
  return dots.map(d => <i key={d.id} className="a2-dot" style={{ left: d.x, top: d.y }} />);
}

/* ── Circles: the baseline ── */
function Circles(props: GroundProps) {
  const { focus, selTheme, onRegion, signals = "scatter" } = props;
  const layoutKey = THEMES.map(th => `${th.id}:${th.signals}:${th.fresh}:${REGION[th.id].x}:${REGION[th.id].y}:${REGION[th.id].r}`).join("|");
  const dots = useMemo(() => THEMES.flatMap(th => {
    const r = rand(th.signals * 7 + th.id.length), R = REGION[th.id];
    return [...Array(th.signals)].map((_, i) => {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R.r * 0.9;
      return { id: `${th.id}${i}`, x: R.x + Math.cos(a) * d, y: R.y + Math.sin(a) * d, fresh: i < th.fresh };
    });
  }), [layoutKey]);
  return (
    <>
      {THEMES.map(th => {
        const R = REGION[th.id];
        return (
          <button key={th.id} className="a2-region" data-open={isOpen(th.id) ? "" : undefined}
            data-zoomed={focus === th.id ? "" : undefined} data-sel={selTheme === th.id ? "" : undefined}
            style={{ left: R.x - R.r, top: R.y - R.r, width: R.r * 2, height: R.r * 2 }}
            onClick={() => onRegion(th.id)} aria-label={regionLabel(th.id, signals)} />
        );
      })}
      <Names style="circles" selTheme={selTheme} count={showsCount(signals)} />
      {signals === "scatter" && <Dots dots={dots} />}
    </>
  );
}

/* ── Terrain: isolines of signal density ── */
function Terrain(props: GroundProps) {
  const t = terrain();
  const hits = BY_SIZE().map(th => t.hits.find(h => h.id === th.id)!);
  return (
    <>
      <svg className="a2-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {t.levels.map((d, i) => <path key={i} className="a2-iso" data-lv={i} d={d} fillRule="evenodd" />)}
        {/* The coastline's inner line, drawn only by treatments with a double edge */}
        <path className="a2-iso-in" d={t.levels[0]} fillRule="evenodd" />
        {hits.map(h => <path key={h.id} className="a2-hit" d={h.d} fillRule="evenodd" {...hitProps(h.id, props)} />)}
      </svg>
      <Names style="terrain" selTheme={props.selTheme} count={showsCount(props.signals)} />
      {(props.signals ?? "scatter") === "scatter" && <Dots dots={SIGS} />}
    </>
  );
}

/** Everything under the landmarks: territories, their names, then signals. */
export function Ground({ style, ...props }: GroundProps & { style: MapStyle }) {
  return style === "terrain" ? <Terrain {...props} /> : <Circles {...props} />;
}
