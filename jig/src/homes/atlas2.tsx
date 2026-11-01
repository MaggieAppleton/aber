import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CornersIn } from "@phosphor-icons/react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import { THEMES, THEORIES, SIGNALS, PROTOTYPES, theoriesIn, theory, theme, type Theory } from "./data";
import { Icon, IconButton, Mark, Pill } from "./atoms";
import { ObjectPane, ThemeHead, TheoryTile, SignalRow, Claim, ThemeName, type ObjKind, type OnOpen, type PaneNav } from "./panes";
import { useCamera, type Camera } from "./atlas2-camera";
import "./atlas2.css";

const EASE = [0.16, 1, 0.3, 1] as const;
const T = { duration: 0.6, ease: EASE };
const W = 1240, H = 760;
export type Variant = "side" | "deep";
type Doc = { kind: "theory" | "prototype"; id: string };

/* ── Map geometry, copied from the Atlas home ── */
const REGION: Record<string, { x: number; y: number; r: number }> = {
  cost: { x: 600, y: 370, r: 150 }, memory: { x: 820, y: 290, r: 160 }, personal: { x: 420, y: 230, r: 130 },
  funding: { x: 520, y: 560, r: 100 }, review: { x: 980, y: 540, r: 120 }, interfaces: { x: 220, y: 500, r: 105 }, identity: { x: 1070, y: 150, r: 75 },
};

function rand(seed: number) { return () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }

function pinPos(t: Theory) {
  const rs = t.themes.map(id => REGION[id]);
  const cx = rs.reduce((a, r) => a + r.x, 0) / rs.length, cy = rs.reduce((a, r) => a + r.y, 0) / rs.length;
  if (rs.length > 1) return { x: cx, y: cy };
  const siblings = theoriesIn(t.themes[0]).filter(x => x.themes.length === 1);
  const k = siblings.findIndex(x => x.id === t.id), n = siblings.length;
  const a = (k / Math.max(1, n)) * Math.PI * 2 - Math.PI / 4;
  const d = n === 1 ? 0 : rs[0].r * 0.45;
  return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d };
}

/** Fit the world into a viewport, or centre and zoom on one territory. */
function view(vw: number, vh: number, focus?: string) {
  if (!focus) { const s = Math.min(1, vw / W, vh / H); return { scale: s, tx: (vw - W * s) / 2, ty: (vh - H * s) / 2 }; }
  const R = REGION[focus];
  const scale = Math.min(2.4, (Math.min(vw, vh) * 0.42) / R.r);
  return { scale, tx: vw / 2 - R.x * scale, ty: vh / 2 - R.y * scale };
}

/** The theme a theory is read in: the current one if it belongs there, else its first. */
function contextFor(current: string | undefined, kind: ObjKind, id: string) {
  const themes = kind === "theory" ? theory(id).themes : kind === "prototype" ? theory(PROTOTYPES.find(p => p.id === id)!.theories[0]).themes : [id];
  return current && themes.includes(current) ? current : themes[0];
}

/* ── The live map ── */
/** The ground the territories cover, for keeping some of it in view. */
const WORLD = Object.values(REGION).reduce((b, r) => ({ x0: Math.min(b.x0, r.x - r.r), y0: Math.min(b.y0, r.y - r.r), x1: Math.max(b.x1, r.x + r.r), y1: Math.max(b.y1, r.y + r.r) }), { x0: W, y0: H, x1: 0, y1: 0 });
/** Past this scale every landmark in view shows its claim. */
const CLAIM_Z = 1.6;
/** Below this scale territory names would overlap, so only the open one stays. */
const FAR_Z = 0.55;

function AtlasMap({ vw, vh, focus, claims, selTheme, selPin, onRegion, onPin, inert }: {
  vw: number; vh: number; focus?: string; claims?: string; selTheme?: string; selPin?: string;
  onRegion: (id: string) => void; onPin: (id: string, at: { x: number; y: number }) => void; inert?: boolean;
}) {
  const [peek, setPeek] = useState<string>();
  const timer = useRef<number>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const box = useRef<HTMLDivElement>(null);
  const cam = useCamera({ el: box, vw, vh, world: WORLD, fit: () => view(vw, vh) });

  const dots = useMemo(() => THEMES.flatMap(th => {
    const r = rand(th.signals * 7 + th.id.length), R = REGION[th.id];
    return [...Array(th.signals)].map((_, i) => {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * R.r * 0.9;
      return { id: `${th.id}${i}`, x: R.x + Math.cos(a) * d, y: R.y + Math.sin(a) * d, fresh: i < th.fresh };
    });
  }), []);

  // Opening something frames it; after that the camera is the user's. A resize keeps the view's centre still.
  const last = useRef<{ focus?: string; pin?: string; vw: number; vh: number }>(undefined);
  useLayoutEffect(() => {
    const p = last.current;
    last.current = { focus, pin: selPin, vw, vh };
    if (!p) { cam.jump(view(vw, vh, focus)); return; }
    if (p.focus !== focus) { cam.fly(view(vw, vh, focus), { auto: true }); return; }
    if (p.pin !== selPin && selPin) {
      const at = pinPos(theory(selPin)), sc = cam.s.get(), sx = at.x * sc + cam.x.get(), sy = at.y * sc + cam.y.get(), m = 48;
      if (sx < m || sx > vw - m || sy < m || sy > vh - m) cam.fly({ scale: sc, tx: vw / 2 - at.x * sc, ty: vh / 2 - at.y * sc });
      return;
    }
    if (p.vw !== vw || p.vh !== vh) {
      if (cam.framed.current) cam.fly(view(vw, vh, focus), { auto: true, quick: true });
      else cam.shift((vw - p.vw) / 2, (vh - p.vh) / 2);
    }
  }, [focus, selPin, vw, vh]);

  const { scale, tx, ty } = cam.snap;
  return (
    <div className="a2-map" inert={inert} ref={box} tabIndex={inert ? -1 : 0} role="group" aria-roledescription="map" aria-label="Atlas map"
      data-panning={cam.panning ? "" : undefined} data-far={scale < FAR_Z ? "" : undefined} {...cam.handlers}>
      <motion.div className="a2-world" style={{ x: cam.x, y: cam.y, scale: cam.s, originX: 0, originY: 0 }}>
        {THEMES.map(th => {
          const R = REGION[th.id];
          return (
            <button key={th.id} className="a2-region" data-open={theoriesIn(th.id).length === 0 ? "" : undefined}
              data-zoomed={focus === th.id ? "" : undefined} data-sel={selTheme === th.id ? "" : undefined}
              style={{ left: R.x - R.r, top: R.y - R.r, width: R.r * 2, height: R.r * 2 }}
              onClick={() => onRegion(th.id)} aria-label={th.name} />
          );
        })}
        {dots.map(d => <i key={d.id} className="a2-dot" data-fresh={d.fresh ? "" : undefined} style={{ left: d.x, top: d.y }} />)}
        {THEMES.map(th => {
          const R = REGION[th.id];
          return (
            <span key={th.id} className="a2-name" data-sel={selTheme === th.id ? "" : undefined} style={{ left: R.x, top: R.y - R.r + 16 }}>
              <ThemeName id={th.id} />{theoriesIn(th.id).length === 0 && <Mark kind="open" />}
            </span>
          );
        })}
        {THEORIES.map(t => {
          const p = pinPos(t);
          const sx = p.x * scale + tx, sy = p.y * scale + ty;
          const near = scale >= CLAIM_Z && sx > 0 && sx < vw && sy > 0 && sy < vh;
          const show = (claims && t.themes.includes(claims)) || near || peek === t.id || selPin === t.id;
          // Claims read towards whichever side has room, and wrap rather than run off the edge.
          const right = vw - sx - 28, left = sx - 28;
          const flip = right < 240 && left > right;
          const cw = Math.max(120, Math.min(360, flip ? left : right));
          return (
            <button key={t.id} className="a2-pin" data-draft={t.draft ? "" : undefined} data-sel={selPin === t.id ? "" : undefined}
              style={{ left: p.x, top: p.y, ["--c" as string]: t.confidence ?? 0, ["--cw" as string]: `${cw}px` }} aria-label={t.claim} data-flip={flip ? "" : undefined}
              onClick={e => { e.stopPropagation(); onPin(t.id, { x: sx, y: sy }); }}
              onPointerEnter={() => { clearTimeout(timer.current); timer.current = window.setTimeout(() => setPeek(t.id), 400); }}
              onPointerLeave={() => { clearTimeout(timer.current); setPeek(p => p === t.id ? undefined : p); }}
              onFocus={() => setPeek(t.id)} onBlur={() => setPeek(p => p === t.id ? undefined : p)}>
              <i />
              <span className="a2-claim" data-show={show ? "" : undefined}><Claim id={t.id} /></span>
              {t.challenge && <Mark kind="challenge" />}
            </button>
          );
        })}
      </motion.div>
      <ZoomControl cam={cam} />
    </div>
  );
}

/** Floating map chrome: zoom out, zoom in, fit. Sits above the map it acts on and never starts a pan. */
function ZoomControl({ cam }: { cam: Camera }) {
  const btn = (label: string, onClick: () => void, glyph: ReactNode, disabled?: boolean) => (
    <button className="ap-iconbtn" aria-label={label} title={label} onClick={onClick} disabled={disabled}>{glyph}</button>
  );
  return (
    <div className="a2-zoom" data-cam-ignore="" onKeyDown={e => e.stopPropagation()}>
      {btn("Zoom in (+)", () => cam.zoomBy(1.5), <Icon name="plus" />, cam.atMax)}
      {btn("Zoom out (\u2212)", () => cam.zoomBy(1 / 1.5), <Icon name="minus" />, cam.atMin)}
      {btn("Fit map (0)", cam.fitAll, <CornersIn size={16} aria-hidden />)}
    </div>
  );
}

/** Keep scroll at the top when the content of a scrolling surface changes (never scrolls the page). */
function useResetScroll(dep: string | undefined) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = 0; }, [dep]);
  return ref;
}

/* ═════ Side pane ═════ */
const MAPW = 496;

function SidePane() {
  const [themeId, setTheme] = useState<string>();
  const [doc, setDoc] = useState<Doc>();
  const [unfolded, setUnfolded] = useState<string>();
  const open = !!themeId;
  const obj = doc ?? (themeId ? { kind: "theme" as const, id: themeId } : undefined);
  const objKey = obj && `${obj.kind}:${obj.id}`;
  const scroller = useResetScroll(objKey);

  const openObj: OnOpen = (kind, id) => {
    setUnfolded(undefined);
    setTheme(t => contextFor(t, kind, id));
    setDoc(kind === "theme" ? undefined : { kind, id });
  };
  const back = () => {
    if (unfolded) setUnfolded(undefined);
    else if (doc) setDoc(undefined);
    else setTheme(undefined);
  };
  const close = () => { setUnfolded(undefined); setDoc(undefined); setTheme(undefined); };
  // Signals unfold inside the pane; the host holds which one so Esc can fold it first.
  const nav: PaneNav = { onOpen: openObj, inline: true, unfolded, onUnfold: (_k, id) => setUnfolded(u => u === id ? undefined : id) };

  const frame = useEscape(back);
  return (
    <div className="ap a2" data-variant="side" tabIndex={0} ref={frame}>
      <motion.div className="a2-mapbox" data-shrunk={open ? "" : undefined} initial={false} animate={{ width: open ? MAPW : W }} transition={T}>
        <AtlasMap vw={open ? MAPW : W} vh={H} focus={themeId} selTheme={themeId} selPin={doc?.kind === "theory" ? doc.id : undefined}
          onRegion={id => openObj("theme", id)} onPin={id => openObj("theory", id)} />
      </motion.div>
      <AnimatePresence>
        {open && (
          <motion.aside key="side" className="a2-side" initial={{ x: W - MAPW }} animate={{ x: 0 }} exit={{ x: W - MAPW }} transition={T}>
            <div className="a2-close"><IconButton icon="x" label="Close (Esc)" onClick={close} /></div>
            <div className="a2-side-scroll ap-scroll" ref={scroller}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={objKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14, ease: "easeOut" }}>
                  {obj && <ObjectPane kind={obj.kind} id={obj.id} nav={nav} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      <Pill sees={obj ? (obj.kind === "theme" ? theme(obj.id).name : obj.kind === "theory" ? "Theory" : "Prototype") : "Atlas"} />
    </div>
  );
}

/* ═════ Deep zoom ═════ */
type Level = 1 | 2 | 3 | 4;

function DeepZoom() {
  const reduce = useReducedMotion();
  const [level, setLevel] = useState<Level>(1);
  const [themeId, setTheme] = useState<string>();
  const [doc, setDoc] = useState<Doc & { origin: string; from?: { x: number; y: number } }>();
  const [unfolded, setUnfolded] = useState<string>();
  const interior = useResetScroll(themeId);
  const deep = useResetScroll(doc && `${doc.kind}:${doc.id}`);
  const toggle = (id: string) => setUnfolded(u => u === id ? undefined : id);

  const go = (l: Level) => { setUnfolded(undefined); setLevel(l); if (l < 4) setDoc(undefined); if (l === 1) setTheme(undefined); };
  const openDoc = (kind: Doc["kind"], id: string, from?: { x: number; y: number }) => {
    setUnfolded(undefined);
    setTheme(t => contextFor(t, kind, id));
    setDoc(d => level === 4 && d ? { ...d, kind, id } : { kind, id, origin: id, from });
    setLevel(4);
  };
  const openObj: OnOpen = (kind, id) => {
    if (kind === "theme") { setUnfolded(undefined); setDoc(undefined); setTheme(id); setLevel(3); return; }
    openDoc(kind, id);
  };
  const back = () => { if (unfolded) setUnfolded(undefined); else if (level > 1) go((level - 1) as Level); };

  const th = themeId ? theme(themeId) : undefined;
  const crumbs: { l: Level; label: string }[] = [
    { l: 1, label: "Atlas" },
    { l: 2, label: th ? th.name : "Territory" },
    { l: 3, label: th ? `${th.name}, page` : "Theme page" },
    { l: 4, label: doc ? (doc.kind === "theory" ? theory(doc.id).claim : PROTOTYPES.find(p => p.id === doc.id)!.name) : "Theory" },
  ];

  const frame = useEscape(back);
  return (
    <div className="ap a2" data-variant="deep" tabIndex={0} ref={frame}>
      <LayoutGroup id="a2-deep">
        <motion.div className="a2-push" initial={false} animate={{ scale: level >= 3 ? 2.2 : 1, opacity: level >= 3 ? 0 : 1 }} transition={T}>
          <AtlasMap vw={W} vh={H} focus={level >= 2 ? themeId : undefined} claims={level === 2 ? themeId : undefined} selTheme={level === 2 ? themeId : undefined} inert={level >= 3}
            onRegion={id => { setUnfolded(undefined); if (level === 2 && id === themeId) setLevel(3); else { setTheme(id); setLevel(2); } }}
            onPin={(id, at) => openDoc("theory", id, at)} />
        </motion.div>

        <AnimatePresence>
          {level >= 3 && th && (
            <motion.div key={th.id} className="a2-interior ap-scroll" ref={interior} inert={level === 4}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.5 }} animate={{ opacity: level === 4 ? 0 : 1, scale: level === 4 ? 1.04 : 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={T}>
              <div className="a2-in-head"><ThemeHead id={th.id} /></div>
              <div className="a2-in-tiles">
                {theoriesIn(th.id).map((t, i) => {
                  const hidden = level === 4 && doc?.origin === t.id;
                  return (
                    <motion.div key={t.id + (hidden ? "-h" : "")} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.04, duration: 0.4, ease: EASE }}>
                      <TheoryTile id={t.id} large hidden={hidden} layoutId={hidden ? undefined : `c-${t.id}`} onClick={() => openDoc("theory", t.id)} />
                    </motion.div>
                  );
                })}
                <button className="pn-tile pn-add" aria-label="State a theory" title="State a theory"><Icon name="plus" /></button>
              </div>
              <div className="a2-ground">
                {SIGNALS.filter(s => s.themes.includes(th.id)).map(s => (
                  <SignalRow key={s.id} s={s} context={th.id} open={unfolded === s.id && level === 3} onToggle={() => toggle(s.id)} onOpen={openObj} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {level === 4 && doc && (
            <motion.div key={doc.origin} layoutId={`c-${doc.origin}`} className="a2-deep ap-scroll" ref={deep}
              style={{ borderRadius: 10, transformOrigin: doc.from ? `${doc.from.x}px ${doc.from.y}px` : undefined }}
              initial={doc.from ? { opacity: 0, scale: 0.05 } : undefined} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.2, delay: 0.1 } }}
              transition={{ duration: 0.5, ease: EASE }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={`${doc.kind}:${doc.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }} exit={{ opacity: 0, transition: { duration: 0.12 } }}>
                  <motion.div layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.15, duration: 0.25 } }}>
                    <ObjectPane kind={doc.kind} id={doc.id} nav={{ onOpen: openObj, inline: true, unfolded, onUnfold: (_k, id) => toggle(id) }} />
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>

      <nav className="a2-crumbs" aria-label="Depth">
        {crumbs.map(c => (
          <button key={c.l} aria-label={c.label} title={c.label} aria-current={c.l === level ? "true" : undefined}
            data-on={c.l <= level ? "" : undefined} disabled={c.l >= level} onClick={() => go(c.l)}><i /></button>
        ))}
      </nav>
      <Pill sees={level === 4 ? (doc?.kind === "prototype" ? "Prototype" : "Theory") : th && level > 1 ? th.name : "Atlas"} />
    </div>
  );
}

/**
 * Esc steps back one level. Listens on the document while this frame was the last thing pointed at or focused,
 * so it still works after the clicked element unmounts and focus falls to the body.
 */
function useEscape(back: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const backRef = useRef(back);
  backRef.current = back;
  useEffect(() => {
    let active = false;
    const down = (e: PointerEvent) => { active = !!ref.current?.contains(e.target as Node); };
    const focus = (e: FocusEvent) => { if (e.target instanceof Node && e.target !== document.body) active = !!ref.current?.contains(e.target); };
    const key = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const inside = ref.current?.contains(document.activeElement);
      if (!inside && !(active && document.activeElement === document.body)) return;
      e.preventDefault();
      backRef.current();
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("focusin", focus);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down, true); document.removeEventListener("focusin", focus); document.removeEventListener("keydown", key); };
  }, []);
  return ref;
}

/**
 * Atlas side-pane variant for a host (the app shell) that draws the object pane itself.
 * The map fills the width it is given and centres on the open object's territory.
 */
export function AtlasHosted({ open, onOpen, width, height }: { open?: { kind: ObjKind; id: string }; onOpen: OnOpen; width: number; height: number }) {
  const [themeId, setTheme] = useState<string>();
  useEffect(() => { setTheme(t => (open ? contextFor(t, open.kind, open.id) : undefined)); }, [open?.kind, open?.id]);
  return (
    <MotionConfig reducedMotion="user">
      <div className="ap a2" data-variant="side" data-hosted="" style={{ width, height }}>
        <AtlasMap vw={width} vh={height} focus={themeId} selTheme={themeId} selPin={open?.kind === "theory" ? open.id : undefined}
          onRegion={id => onOpen("theme", id)} onPin={id => onOpen("theory", id)} />
      </div>
    </MotionConfig>
  );
}

/** Atlas, developed: two ways to open a territory or landmark to read and write it without losing the map. */
export function AtlasDeveloped({ variant }: { variant: Variant }) {
  return (
    <MotionConfig reducedMotion="user">
      {variant === "side" ? <SidePane /> : <DeepZoom />}
    </MotionConfig>
  );
}
