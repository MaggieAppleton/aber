import { useMemo, type CSSProperties, type KeyboardEvent } from "react";
import { THEMES, theoriesIn, theme } from "../data";
import { Mark } from "../atoms";
import { ThemeName } from "../panes";
import { W, H, REGION, HUE, SIGS, rand, terrain, blobs, tiles } from "./geo";
import "./styles.css";

export type MapStyle = "circles" | "terrain" | "tiles" | "cartographic";
export const MAP_STYLES: MapStyle[] = ["circles", "terrain", "tiles", "cartographic"];

type GroundProps = { focus?: string; selTheme?: string; onRegion: (id: string) => void };
const isOpen = (id: string) => theoriesIn(id).length === 0;
const hue = (id: string) => ({ ["--h" as string]: HUE[id] }) as CSSProperties;
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

const Svg = ({ layer, children }: { layer: "ground" | "sigs"; children: React.ReactNode }) => (
  <svg className="a2-svg" data-layer={layer} width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden={layer === "sigs" ? true : undefined}>{children}</svg>
);

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
      {dots.map(d => <i key={d.id} className="a2-dot" data-fresh={d.fresh ? "" : undefined} style={{ left: d.x, top: d.y }} />)}
    </>
  );
}

/** Signals as fine points; new ones blue and a touch larger. */
function Signals({ tint }: { tint?: boolean }) {
  return (
    <Svg layer="sigs">
      {SIGS.filter(s => !s.fresh).map(s => <circle key={s.id} className="a2-sig" cx={s.x} cy={s.y} style={tint ? hue(s.theme) : undefined} data-tint={tint ? "" : undefined} />)}
      {SIGS.filter(s => s.fresh).map(s => <circle key={s.id} className="a2-sig" data-fresh="" cx={s.x} cy={s.y} />)}
    </Svg>
  );
}

/* ── Terrain: isolines of signal density ── */
function Terrain(props: GroundProps) {
  const t = terrain();
  const hits = BY_SIZE.map(th => t.hits.find(h => h.id === th.id)!);
  return (
    <>
      <Svg layer="ground">
        {t.levels.map((d, i) => <path key={i} className="a2-iso" data-lv={i} d={d} fillRule="evenodd" />)}
        {hits.map(h => <path key={h.id} className="a2-hit" d={h.d} fillRule="evenodd" {...hitProps(h.id, props)} />)}
      </Svg>
      <Names at={id => t.hits.find(h => h.id === id)!.name} selTheme={props.selTheme} />
      <Signals />
    </>
  );
}

/* ── Cartographic: organic territories, place-name type, stippled signals ── */
function Cartographic(props: GroundProps) {
  const bs = blobs();
  return (
    <>
      <Svg layer="ground">
        {BY_SIZE.map(th => { const b = bs.find(x => x.id === th.id)!; return <path key={b.id} className="a2-blob" d={b.d} style={hue(b.id)} {...hitProps(b.id, props)} />; })}
      </Svg>
      <Names at={id => bs.find(b => b.id === id)!.name} selTheme={props.selTheme} />
      <Signals tint />
    </>
  );
}

/* ── Tiles: a hex per signal ── */
function Tiles(props: GroundProps) {
  const t = tiles();
  return (
    <>
      <Svg layer="ground">
        {BY_SIZE.map(th => (
          <g key={th.id} className="a2-tgroup" style={hue(th.id)} {...hitProps(th.id, props)}>
            {t.cells.filter(c => c.themes[0] === th.id).map(c => c.themes.length > 1
              ? <g key={c.id} transform={`translate(${c.x} ${c.y})`}><path className="a2-cell" d={t.halves[0]} /><path className="a2-cell" d={t.halves[1]} style={hue(c.themes[1])} /></g>
              : <path key={c.id} className="a2-cell" d={t.hex} transform={`translate(${c.x} ${c.y})`} />)}
          </g>
        ))}
      </Svg>
      <Names at={id => t.names[id]} selTheme={props.selTheme} />
      <Svg layer="sigs">{t.cells.filter(c => c.fresh).map(c => <circle key={c.id} className="a2-sig" data-fresh="" cx={c.x} cy={c.y} />)}</Svg>
    </>
  );
}

/** Everything under the landmarks: territories, their names, then signals. */
export function Ground({ style, ...props }: GroundProps & { style: MapStyle }) {
  if (style === "terrain") return <Terrain {...props} />;
  if (style === "tiles") return <Tiles {...props} />;
  if (style === "cartographic") return <Cartographic {...props} />;
  return <Circles {...props} />;
}
