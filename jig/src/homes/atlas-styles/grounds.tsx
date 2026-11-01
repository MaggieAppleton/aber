import { useMemo, type KeyboardEvent } from "react";
import { THEMES, theoriesIn, theme } from "../data";
import { Mark } from "../atoms";
import { ThemeName } from "../panes";
import { W, H, REGION, SIGS, rand, terrain } from "./geo";
import "./styles.css";

/** Structure: how territories are drawn. */
export type MapStyle = "circles" | "terrain";
/** Treatment: the surface over either structure (ground, fills, edges, dots, pins, labels). Unset is the current look. */
export type Treatment = "paper" | "fine" | "graphite" | "night";

type GroundProps = { focus?: string; selTheme?: string; onRegion: (id: string) => void };
const isOpen = (id: string) => theoriesIn(id).length === 0;
/** Bigger territories first, so a smaller one that overlaps stays clickable. */
const BY_SIZE = [...THEMES].sort((a, b) => REGION[b.id].r - REGION[a.id].r);

/** An SVG territory that behaves like a button. */
function hitProps(id: string, { focus, selTheme, onRegion }: GroundProps) {
  return {
    role: "button", tabIndex: 0, "aria-label": theme(id).name,
    "data-open": isOpen(id) ? "" : undefined, "data-zoomed": focus === id ? "" : undefined, "data-sel": selTheme === id ? "" : undefined,
    onClick: () => onRegion(id),
    onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onRegion(id); } },
  };
}

/** Territory names: under the signals, above the ground. */
function Names({ at, selTheme }: { at: (id: string) => { x: number; y: number }; selTheme?: string }) {
  return THEMES.map(th => {
    const p = at(th.id);
    return (
      <span key={th.id} className="a2-name" data-sel={selTheme === th.id ? "" : undefined} style={{ left: p.x, top: p.y }}>
        <ThemeName id={th.id} />{isOpen(th.id) && <Mark kind="open" />}
      </span>
    );
  });
}

/** Signals: one element per signal in both structures, so a treatment styles them the same way. */
function Dots({ dots }: { dots: { id: string; x: number; y: number; fresh: boolean }[] }) {
  return dots.map(d => <i key={d.id} className="a2-dot" data-fresh={d.fresh ? "" : undefined} style={{ left: d.x, top: d.y }} />);
}

/* ── Circles: the baseline ── */
function Circles(props: GroundProps) {
  const { focus, selTheme, onRegion } = props;
  const dots = useMemo(() => THEMES.flatMap(th => {
    const r = rand(th.signals * 7 + th.id.length), R = REGION[th.id];
    return [...Array(th.signals)].map((_, i) => {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R.r * 0.9;
      return { id: `${th.id}${i}`, x: R.x + Math.cos(a) * d, y: R.y + Math.sin(a) * d, fresh: i < th.fresh };
    });
  }), []);
  return (
    <>
      {THEMES.map(th => {
        const R = REGION[th.id];
        return (
          <button key={th.id} className="a2-region" data-open={isOpen(th.id) ? "" : undefined}
            data-zoomed={focus === th.id ? "" : undefined} data-sel={selTheme === th.id ? "" : undefined}
            style={{ left: R.x - R.r, top: R.y - R.r, width: R.r * 2, height: R.r * 2 }}
            onClick={() => onRegion(th.id)} aria-label={th.name} />
        );
      })}
      <Names at={id => ({ x: REGION[id].x, y: REGION[id].y - REGION[id].r + 16 })} selTheme={selTheme} />
      <Dots dots={dots} />
    </>
  );
}

/* ── Terrain: isolines of signal density ── */
function Terrain(props: GroundProps) {
  const t = terrain();
  const hits = BY_SIZE.map(th => t.hits.find(h => h.id === th.id)!);
  return (
    <>
      <svg className="a2-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {t.levels.map((d, i) => <path key={i} className="a2-iso" data-lv={i} d={d} fillRule="evenodd" />)}
        {/* The coastline's inner line, drawn only by treatments with a double edge */}
        <path className="a2-iso-in" d={t.levels[0]} fillRule="evenodd" />
        {hits.map(h => <path key={h.id} className="a2-hit" d={h.d} fillRule="evenodd" {...hitProps(h.id, props)} />)}
      </svg>
      <Names at={id => t.hits.find(h => h.id === id)!.name} selTheme={props.selTheme} />
      <Dots dots={SIGS} />
    </>
  );
}

/** Everything under the landmarks: territories, their names, then signals. */
export function Ground({ style, ...props }: GroundProps & { style: MapStyle }) {
  return style === "terrain" ? <Terrain {...props} /> : <Circles {...props} />;
}
