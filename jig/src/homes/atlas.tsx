import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { THEMES, THEORIES, SIGNALS, theoriesIn, type Theory } from "./data";
import { IconButton, Mark, TheoryCard, Pill } from "./atoms";

const EASE = [0.16, 1, 0.3, 1] as const;
const W = 1240, H = 760;

// Laid out by the system from overlap and size, never placed by hand.
const REGION: Record<string, { x: number; y: number; r: number }> = {
  cost: { x: 600, y: 370, r: 150 }, memory: { x: 820, y: 290, r: 160 }, personal: { x: 420, y: 230, r: 130 },
  funding: { x: 520, y: 560, r: 100 }, review: { x: 980, y: 540, r: 120 }, interfaces: { x: 220, y: 500, r: 105 }, identity: { x: 1070, y: 150, r: 75 },
};

function rand(seed: number) { return () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }

function pinPos(t: Theory, i: number) {
  const rs = t.themes.map(id => REGION[id]);
  const cx = rs.reduce((a, r) => a + r.x, 0) / rs.length, cy = rs.reduce((a, r) => a + r.y, 0) / rs.length;
  if (rs.length > 1) return { x: cx, y: cy };
  const siblings = theoriesIn(t.themes[0]).filter(x => x.themes.length === 1);
  const k = siblings.findIndex(x => x.id === t.id), n = siblings.length;
  const a = (k / Math.max(1, n)) * Math.PI * 2 - Math.PI / 4;
  const d = n === 1 ? 0 : rs[0].r * 0.45;
  return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d + i * 0 };
}

/** Paradigm: an atlas. Themes are territories, theories are landmarks, signals are the ground. Zoom to read. */
export function AtlasHome() {
  const [zoom, setZoom] = useState<string>();
  const [pin, setPin] = useState<string>();

  const dots = useMemo(() => THEMES.flatMap(th => {
    const r = rand(th.signals * 7 + th.id.length), R = REGION[th.id];
    return [...Array(th.signals)].map((_, i) => {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R.r * 0.9;
      return { id: `${th.id}${i}`, x: R.x + Math.cos(a) * d, y: R.y + Math.sin(a) * d, fresh: i < th.fresh };
    });
  }), []);

  const z = zoom ? REGION[zoom] : undefined;
  const scale = z ? Math.min(2.4, (H * 0.42) / z.r) : 1;
  const tx = z ? W / 2 - z.x * scale : 0, ty = z ? H / 2 - z.y * scale : 0;

  return (
    <div className="ap atl" onKeyDown={e => e.key === "Escape" && (pin ? setPin(undefined) : setZoom(undefined))} tabIndex={0}>
      <motion.div className="atl-world" animate={{ x: tx, y: ty, scale }} transition={{ duration: 0.6, ease: EASE }} style={{ originX: 0, originY: 0, ["--z" as string]: scale }}>
        {THEMES.map(th => {
          const R = REGION[th.id];
          const open = theoriesIn(th.id).length === 0;
          return (
            <button key={th.id} className="atl-region" data-open={open ? "" : undefined} data-zoomed={zoom === th.id ? "" : undefined}
              style={{ left: R.x - R.r, top: R.y - R.r, width: R.r * 2, height: R.r * 2 }}
              onClick={() => { setPin(undefined); setZoom(zoom === th.id ? undefined : th.id); }} aria-label={th.name} />
          );
        })}
        {dots.map(d => <i key={d.id} className="atl-dot" data-fresh={d.fresh ? "" : undefined} style={{ left: d.x, top: d.y }} />)}
        {THEMES.map(th => {
          const R = REGION[th.id];
          return (
            <span key={th.id} className="atl-name" style={{ left: R.x, top: R.y - R.r + 16 }}>
              {th.name}{theoriesIn(th.id).length === 0 && <Mark kind="open" />}
            </span>
          );
        })}
        {THEORIES.map((t, i) => {
          const p = pinPos(t, i);
          return (
            <button key={t.id} className="atl-pin" data-draft={t.draft ? "" : undefined} data-sel={pin === t.id ? "" : undefined}
              style={{ left: p.x, top: p.y, ["--c" as string]: t.confidence ?? 0 }} onClick={e => { e.stopPropagation(); setPin(pin === t.id ? undefined : t.id); }} aria-label={t.claim}>
              <i />
              <span className="atl-claim" data-show={zoom && t.themes.includes(zoom) ? "" : undefined}>{t.claim}</span>
              {t.challenge && <Mark kind="challenge" />}
            </button>
          );
        })}
      </motion.div>
      <AnimatePresence>
        {pin && (() => {
          const t = THEORIES.find(x => x.id === pin)!, p = pinPos(t, 0);
          return (
            <motion.div key={pin} className="atl-pop" style={{ left: p.x * scale + tx + 16, top: p.y * scale + ty - 20, transformOrigin: "left center" }}
              initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.3, ease: EASE }}>
              <TheoryCard t={t} />
            </motion.div>
          );
        })()}
      </AnimatePresence>
      <AnimatePresence>
        {zoom && (
          <motion.div className="atl-back" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <IconButton icon="chevronLeft" label="Zoom out (Esc)" onClick={() => { setPin(undefined); setZoom(undefined); }} />
          </motion.div>
        )}
      </AnimatePresence>
      <Pill sees={zoom ? THEMES.find(t => t.id === zoom)!.name : "Atlas"} />
      <span className="atl-legend" aria-hidden>{SIGNALS.length}</span>
    </div>
  );
}
