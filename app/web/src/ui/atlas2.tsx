import { TooltipButton } from "./tooltip";
import { currentSuggestion } from "../data/challenge-target";
import { SURFACE_RADII } from "./metrics";
import { onWorld,world,field,json } from "../data/live";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CornersIn } from "@phosphor-icons/react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import { THEORIES, SIGNALS, PROTOTYPES, theoriesIn, theory, theme, type Theory } from "./data";
import { Icon, IconButton, Mark, Pill } from "./atoms";
import { ObjectPane, ThemeHead, TheoryTile, SignalRow, Claim, type ObjKind, type OnOpen, type PaneNav } from "./panes";
import { useCamera, type Camera } from "./atlas2-camera";
import { W, H, REGION, pinPos } from "./atlas-styles/geo";
import { Ground, nameAt, type MapStyle, type Treatment } from "./atlas-styles/grounds";
import { placeLabels, pinScale, GAP, type LabelPin, type Obstacle, type Place } from "./atlas-styles/labels";
import { TICKS, LOOSE, LOOSE_STEP, LOOSE_DY, TK, REVEAL_Z, GIST_Z, tickInner, tickOuter, haloR, rad, type SignalEncoding, type Tick } from "./atlas-styles/signals";
import "./atlas2.css";

const EASE = [0.16, 1, 0.3, 1] as const;
const T = { duration: 0.6, ease: EASE };
export type Variant = "side" | "deep";
export type { MapStyle, Treatment, SignalEncoding };
/** Open a signal: unfold it inside the theory it bears on, or inside its theme when it bears on none. */
export type OnSignal = (id: string, theory: string | undefined, theme: string) => void;
type Doc = { kind: "theory" | "prototype"; id: string };

/** Fit the world into a viewport, or centre and zoom on one territory. */
function view(vw: number, vh: number, focus?: string) {
  if (!focus) {
    // Preserve the jig's 1240×760 world and framing; extend only when added territories need room.
    const regions = Object.values(REGION);
    const x0 = Math.min(0, ...regions.map(r => r.x - r.r - 48));
    const y0 = Math.min(0, ...regions.map(r => r.y - r.r - 48));
    const width = Math.max(W, ...regions.map(r => r.x + r.r + 48)) - x0;
    const height = Math.max(H, ...regions.map(r => r.y + r.r + 72)) - y0;
    const scale = Math.min(1, vw / width, vh / height);
    return { scale, tx: (vw - width * scale) / 2 - x0 * scale, ty: (vh - height * scale) / 2 - y0 * scale };
  }
  const R = REGION[focus];
  if (!R) return view(vw,vh);
  const scale = Math.min(2.4, (Math.min(vw, vh) * 0.42) / R.r);
  return { scale, tx: vw / 2 - R.x * scale, ty: vh / 2 - R.y * scale };
}

/** The theme a theory is read in: the current one if it belongs there, else its first. */
function contextFor(current: string | undefined, kind: ObjKind, id: string) {
  const themes = kind === "theory" ? theory(id).themes : kind === "prototype" ? theory(PROTOTYPES.find(p => p.id === id)?.theories[0] ?? "").themes : [id];
  return current && themes.includes(current) ? current : themes[0];
}

/* ── The live map ── */
/** The ground the territories cover, for keeping some of it in view. */
let WORLD = Object.values(REGION).reduce((b, r) => ({ x0: Math.min(b.x0, r.x - r.r), y0: Math.min(b.y0, r.y - r.r), x1: Math.max(b.x1, r.x + r.r), y1: Math.max(b.y1, r.y + r.r) }), { x0: W, y0: H, x1: 0, y1: 0 });
/** Past this scale every landmark in view shows its claim. */
const CLAIM_Z = 1.6;
/** Below this scale territory names would overlap, so only the open one stays. */
const FAR_Z = 0.55;

/** A wrapped label's box stays as wide as its max-width; narrow it to its longest line so the paper fits the words. */
function shrinkWrap(el: HTMLElement) {
  el.style.width = "";
  const ratio = el.getBoundingClientRect().width / el.offsetWidth;
  if (!ratio) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  const lines = new Map<number, { l: number; r: number }>();
  for (const r of range.getClientRects()) {
    const k = Math.round(r.top), o = lines.get(k);
    lines.set(k, { l: Math.min(o?.l ?? r.left, r.left), r: Math.max(o?.r ?? r.right, r.right) });
  }
  if (lines.size < 2) return;
  const cs = getComputedStyle(el), pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  el.style.width = `${Math.ceil(Math.max(...[...lines.values()].map(v => v.r - v.l)) / ratio + pad)}px`;
}

/** A landmark's natural radius, ring included; selection grows it. */
const pinR = (t: Theory, sel: boolean) => (t.draft ? 5 : (8 + (t.confidence ?? 0) * 1.5) / 2 + 2) * (sel ? 1.3 : 1);
let LANDMARKS = THEORIES.map(t => ({ t, p: pinPos(t) }));
onWorld(()=>{
  LANDMARKS=THEORIES.map(t=>({t,p:pinPos(t)}));
  WORLD=Object.values(REGION).reduce((b,r)=>({x0:Math.min(b.x0,r.x-r.r),y0:Math.min(b.y0,r.y-r.r),x1:Math.max(b.x1,r.x+r.r),y1:Math.max(b.y1,r.y+r.r)}),{x0:0,y0:0,x1:W,y1:H});
});

const stanceText = (tk: Tick) => !tk.theory ? "Not evidence for a theory yet"
  : `${tk.suggested ? "Suggested: " : ""}${tk.stance === "supports" ? "Supports" : "Undermines"} \u201c${theory(tk.theory).claim}\u201d`;
/** A tick's state: new, suggested (not yet yours), part of the signal under the pointer, or the signal open in the pane. */
const tickMarks = (tk: Tick, hot: Tick | undefined, selSig: string | undefined) => ({
  
  "data-sug": tk.suggested ? "" : undefined,
  "data-hot": hot?.sig.id === tk.sig.id ? "" : undefined, "data-sel": selSig === tk.sig.id ? "" : undefined,
});

/** A signal's gist, tethered to its tick. */
function SignalTip({ tk, at, vw }: { tk: Tick; at: { x: number; y: number; below: boolean }; vw: number }) {
  const W2 = 120, x = Math.max(W2 + 8, Math.min(vw - W2 - 8, at.x));
  return (
    <motion.div className="a2-tip" role="tooltip" data-below={at.below ? "" : undefined} style={{ left: x, top: at.y, ["--tx" as string]: `${at.x - x}px` }}
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ duration: 0.16, ease: "easeOut" }}>
      <span className="a2-tip-gist"><span data-unseen={tk.fresh ? "" : undefined}>{tk.sig.gist}</span></span>
      <span className="a2-tip-how">{stanceText(tk)}</span>
    </motion.div>
  );
}

function AtlasMap({ vw, vh, focus, claims, selTheme, selPin, onRegion, onPin, inert, mapStyle = "circles", treatment, signals = "scatter", selSig, onSignal }: {
  vw: number; vh: number; focus?: string; claims?: string; selTheme?: string; selPin?: string;
  onRegion: (id: string) => void; onPin: (id: string, at: { x: number; y: number }) => void; inert?: boolean; mapStyle?: MapStyle; treatment?: Treatment;
  signals?: SignalEncoding; selSig?: string; onSignal?: OnSignal;
}) {
  const [peek, setPeek] = useState<string>();
  const timer = useRef<number>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const box = useRef<HTMLDivElement>(null);
  const cam = useCamera({ el: box, vw, vh, world: WORLD, fit: () => view(vw, vh) });

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

  // Claim sizes in natural pixels, for placing them clear of each other and of every landmark.
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});
  const labelEls = useRef(new Map<string, HTMLElement>());
  useLayoutEffect(() => {
    const read = () => {
      const next: Record<string, { w: number; h: number }> = {};
      labelEls.current.forEach((el, id) => { shrinkWrap(el); next[id] = { w: el.offsetWidth, h: el.offsetHeight }; });
      setSizes(prev => Object.keys(next).every(k => prev[k]?.w === next[k].w && prev[k]?.h === next[k].h) ? prev : next);
    };
    read();
    const ro = new ResizeObserver(read);
    labelEls.current.forEach(el => ro.observe(el));
    return () => ro.disconnect();
  }, []);

  const { scale, tx, ty } = cam.snap;
  const near = (p: { x: number; y: number }) => { const sx = p.x * scale + tx, sy = p.y * scale + ty; return scale >= CLAIM_Z && sx > 0 && sx < vw && sy > 0 && sy < vh; };
  // Evidence ticks: always (halo), or once the camera is close enough to read them (zoom); gists label them closer still.
  const halos = signals === "halo" || (signals === "zoom" && scale >= REVEAL_Z);
  const gists = signals === "zoom" && scale >= GIST_Z;
  const k = pinScale(scale);
  /** A point at a natural-pixel distance from a landmark, in world coordinates (the landmark layer is counter-scaled). */
  const from = (p: { x: number; y: number }, a: number, d: number) => ({ x: p.x + Math.cos(rad(a)) * d * k / scale, y: p.y + Math.sin(rad(a)) * d * k / scale });
  const labelR = (t: Theory) => halos ? haloR(t.id, pinR(t, t.id === selPin)) : pinR(t, t.id === selPin);
  const pins: LabelPin[] = LANDMARKS.map(({ t, p }) => ({ id: t.id, x: p.x, y: p.y, r: labelR(t), ro: pinR(t, t.id === selPin), prio: (t.draft ? 0 : 10) + (t.confidence ?? 0) }));
  const obstacles: Obstacle[] = [];
  const wanted = new Set(LANDMARKS.filter(({ t, p }) => (claims && t.themes.includes(claims)) || near(p)).map(({ t }) => t.id));
  if (halos) for (const { t, p } of LANDMARKS) for (const tk of TICKS[t.id]) {
    const r = pinR(t, t.id === selPin);
    obstacles.push({ ...from(p, tk.a, tickInner(r, tk.ring) + TK.len / 2), r: TK.len / 2 + 1 });
    if (signals !== "zoom") continue;
    const end = from(p, tk.a, tickOuter(r, tk.ring));
    pins.push({ id: `sig:${tk.key}`, ...end, r: 2, ro: 0, prio: -10 + (tk.fresh ? 1 : 0) });
    // Gists keep a margin from the frame edge, so a label never shows cut in half.
    const sx = end.x * scale + tx, sy = end.y * scale + ty;
    if (gists && sx > 40 && sx < vw - 40 && sy > 24 && sy < vh - 24) wanted.add(`sig:${tk.key}`);
  }
  const places = placeLabels({ pins, obstacles, wanted, forced: new Set(selPin ? [selPin] : []), extra: peek, sizes, scale, tx, vw });
  // A label that hides keeps its last side, so it fades out where it was.
  const lastPlace = useRef<Record<string, Place>>({});
  Object.assign(lastPlace.current, places);

  // A signal's gist, after a short dwell on its tick (at once on keyboard focus).
  const [tip, setTip] = useState<Tick>();
  const tipTimer = useRef<number>(undefined);
  useEffect(() => () => clearTimeout(tipTimer.current), []);
  const tickProps = (tk: Tick, hidden: boolean) => ({
    tabIndex: hidden ? -1 : 0,
    "aria-label": `${tk.sig.gist}. ${stanceText(tk)}`,
    onClick: (e: { stopPropagation: () => void }) => { e.stopPropagation(); setTip(undefined); onSignal?.(tk.sig.id, tk.theory, tk.theme); },
    onPointerEnter: () => { clearTimeout(tipTimer.current); tipTimer.current = window.setTimeout(() => setTip(tk), 300); },
    onPointerLeave: () => { clearTimeout(tipTimer.current); setTip(v => v?.key === tk.key ? undefined : v); },
    onFocus: () => setTip(tk), onBlur: () => setTip(v => v?.key === tk.key ? undefined : v),
  });
  const shown = tip && halos && !cam.panning ? tip : undefined;

  /** Where a tick's tip sits on screen, and whether its tooltip hangs above or below it. */
  const tipAt = (tk: Tick) => {
    if (!tk.theory) {
      const n = nameAt(mapStyle, tk.theme), ts = LOOSE[tk.theme], i = ts.findIndex(x => x.key === tk.key);
      return { x: n.x * scale + tx + (i - (ts.length - 1) / 2) * LOOSE_STEP, y: n.y * scale + ty + LOOSE_DY + TK.len, below: true };
    }
    const t = theory(tk.theory), e = from(pinPos(t), tk.a, tickOuter(pinR(t, t.id === selPin), tk.ring));
    return { x: e.x * scale + tx, y: e.y * scale + ty, below: Math.sin(rad(tk.a)) > 0.1 };
  };

  const hover = (id: string) => ({
    onPointerEnter: () => { clearTimeout(timer.current); timer.current = window.setTimeout(() => setPeek(id), 400); },
    onPointerLeave: () => { clearTimeout(timer.current); setPeek(p => p === id ? undefined : p); },
  });

  return (
    <div className="a2-map" inert={inert} ref={box} tabIndex={inert ? -1 : 0} role="group" aria-roledescription="map" aria-label="Atlas map" data-style={mapStyle} data-treatment={treatment}
      data-panning={cam.panning ? "" : undefined} data-far={scale < FAR_Z ? "" : undefined} {...cam.handlers}>
      <motion.div className="a2-world" style={{ x: cam.x, y: cam.y, scale: cam.s, originX: 0, originY: 0 }}>
        <Ground style={mapStyle} focus={focus} selTheme={selTheme} onRegion={onRegion} signals={signals} />
        {(signals === "halo" || signals === "zoom") && LANDMARKS.map(({ t, p }) => TICKS[t.id].length > 0 && (
          <div key={t.id} className="a2-halo" data-hidden={halos ? undefined : ""} style={{ left: p.x, top: p.y }}>
            {TICKS[t.id].map(tk => (
              <button key={tk.key} className="a2-tick" {...tickMarks(tk, shown, selSig)} {...tickProps(tk, !halos)}
                style={{ transform: `rotate(${tk.a}deg) translateX(${tickInner(pinR(t, t.id === selPin), tk.ring) - 1}px)` }}><i /></button>
            ))}
          </div>
        ))}
        {(signals === "halo" || signals === "zoom") && Object.entries(LOOSE).map(([id, ts]) => {
          const at = nameAt(mapStyle, id);
          return (
            <div key={id} className="a2-loose" data-hidden={halos ? undefined : ""} data-sel={selTheme === id ? "" : undefined} style={{ left: at.x, top: at.y }}>
              {ts.map((tk, i) => (
                <button key={tk.key} className="a2-tick" {...tickMarks(tk, shown, selSig)} {...tickProps(tk, !halos)}
                  style={{ transform: `translate(${(i - (ts.length - 1) / 2) * LOOSE_STEP}px, ${LOOSE_DY}px) rotate(90deg)` }}><i /></button>
              ))}
            </div>
          );
        })}
        {LANDMARKS.map(({ t, p }) => {
          const open = (e: { stopPropagation: () => void }) => { e.stopPropagation(); onPin(t.id, { x: p.x * scale + tx, y: p.y * scale + ty }); };
          const sel = selPin === t.id, pk = peek === t.id && !sel;
          return (
            <button key={t.id} className="a2-pin" data-draft={t.draft ? "" : undefined} data-sel={sel ? "" : undefined} data-peek={pk ? "" : undefined}
              style={{ left: p.x, top: p.y, ["--c" as string]: t.confidence ?? 0 }} aria-label={t.claim} data-pick={t.id} data-kind="theory" data-label={t.claim} data-region={t.id}
              onClick={open} {...hover(t.id)} onFocus={() => setPeek(t.id)} onBlur={() => setPeek(p => p === t.id ? undefined : p)}>
              <i />
              {t.challenge && <Mark kind="challenge" />}
            </button>
          );
        })}
        {LANDMARKS.map(({ t, p }) => {
          const pl = places[t.id], at = pl ?? lastPlace.current[t.id] ?? { side: 1, dy: 0 };
          const sel = selPin === t.id, pk = peek === t.id && !sel;
          return (
            <div key={t.id} className="a2-lab" data-show={pl ? "" : undefined} data-flip={at.side < 0 ? "" : undefined} data-sel={sel ? "" : undefined} data-peek={pk ? "" : undefined}
              style={{ left: p.x, top: p.y, ["--off" as string]: `${labelR(t) + GAP}px`, ["--dy" as string]: `${at.dy}px` }}>
              {at.dy !== 0 && (
                <svg className="a2-leader" aria-hidden><line x1={at.side * labelR(t)} y1={0} x2={at.side * (labelR(t) + GAP + 1)} y2={at.dy} /></svg>
              )}
              <span className="a2-claim" ref={el => { if (el) labelEls.current.set(t.id, el); }} aria-hidden
                onClick={e => { e.stopPropagation(); onPin(t.id, { x: p.x * scale + tx, y: p.y * scale + ty }); }} {...hover(t.id)}>
                <Claim id={t.id} />
              </span>
            </div>
          );
        })}
        {signals === "zoom" && LANDMARKS.flatMap(({ t, p }) => TICKS[t.id].map(tk => {
          const id = `sig:${tk.key}`, pl = places[id], at = pl ?? lastPlace.current[id] ?? { side: 1, dy: 0 };
          const end = tickOuter(pinR(t, t.id === selPin), tk.ring), ex = Math.cos(rad(tk.a)) * end, ey = Math.sin(rad(tk.a)) * end;
          return (
            <div key={id} className="a2-lab" data-kind="sig" data-show={pl ? "" : undefined} data-flip={at.side < 0 ? "" : undefined}
              data-sel={selSig === tk.sig.id ? "" : undefined} style={{ left: p.x, top: p.y, ["--off" as string]: `${2 + GAP}px`, ["--dy" as string]: `${at.dy}px` }}>
              <div className="a2-lab-at" style={{ left: ex, top: ey }}>
                {at.dy !== 0 && <svg className="a2-leader" aria-hidden><line x1={at.side * 2} y1={0} x2={at.side * (2 + GAP + 1)} y2={at.dy} /></svg>}
                <span className="a2-claim a2-gist" ref={el => { if (el) labelEls.current.set(id, el); }} aria-hidden
                  onClick={e => { e.stopPropagation(); onSignal?.(tk.sig.id, tk.theory, tk.theme); }}>{tk.sig.gist}</span>
              </div>
            </div>
          );
        }))}
      </motion.div>
      <AnimatePresence>
        {shown && <SignalTip key={shown.key} tk={shown} at={tipAt(shown)} vw={vw} />}
      </AnimatePresence>
      <ZoomControl cam={cam} />
    </div>
  );
}


/** Floating map chrome: zoom out, zoom in, fit. Sits above the map it acts on and never starts a pan. */
function ZoomControl({ cam }: { cam: Camera }) {
  const btn = (label: string, onClick: () => void, glyph: ReactNode, disabled?: boolean) => (
    <TooltipButton className="ap-iconbtn" aria-label={label} tooltip={label} onClick={onClick} disabled={disabled}>{glyph}</TooltipButton>
  );
  return (
    <div className="a2-zoom" data-cam-ignore="" onKeyDown={e => e.stopPropagation()}>
      {btn("Zoom in (+)", () => cam.zoomBy(1.5), <Icon name="zoomIn" />, cam.atMax)}
      {btn("Zoom out (\u2212)", () => cam.zoomBy(1 / 1.5), <Icon name="zoomOut" />, cam.atMin)}
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
/** A frame smaller than the full 1240×760 (the jig's treatment grid): its map width when the pane is open. */
export type FrameSize = { w: number; h: number; mapw: number };

function SidePane({ mapStyle, treatment, size, signals }: { mapStyle?: MapStyle; treatment?: Treatment; size?: FrameSize; signals?: SignalEncoding }) {
  const fw = size?.w ?? W, fh = size?.h ?? H, mw = size?.mapw ?? MAPW;
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

  // A signal opened from the map unfolds in its theory (or theme); bring it into view once the pane has settled.
  const openSignal: OnSignal = (id, th, themeId) => { openObj(th ? "theory" : "theme", th ?? themeId); setUnfolded(id); };
  useEffect(() => {
    if (!unfolded) return;
    const t = window.setTimeout(() => scroller.current?.querySelector(".pn-sig[data-open]")?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 320);
    return () => clearTimeout(t);
  }, [unfolded, objKey]);

  const frame = useEscape(back);
  return (
    <div className="ap a2" data-variant="side" data-compact={size ? "" : undefined} tabIndex={0} ref={frame}
      style={size ? { width: fw, minWidth: fw, height: fh } : undefined}>
      <motion.div className="a2-mapbox" data-shrunk={open ? "" : undefined} initial={false} animate={{ width: open ? mw : fw }} transition={T}>
        <AtlasMap mapStyle={mapStyle} treatment={treatment} vw={open ? mw : fw} vh={fh} focus={themeId} selTheme={themeId} selPin={doc?.kind === "theory" ? doc.id : undefined}
          onRegion={id => openObj("theme", id)} onPin={id => openObj("theory", id)} signals={signals} selSig={unfolded} onSignal={openSignal} />
      </motion.div>
      <AnimatePresence>
        {open && (
          <motion.aside key="side" className="a2-side" style={size ? { width: fw - mw } : undefined}
            initial={{ x: fw - mw }} animate={{ x: 0 }} exit={{ x: fw - mw }} transition={T}>
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
                <TooltipButton className="pn-tile pn-add" aria-label="State a theory" tooltip="State a theory"><Icon name="plus" /></TooltipButton>
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
              style={{ borderRadius: SURFACE_RADII.document, transformOrigin: doc.from ? `${doc.from.x}px ${doc.from.y}px` : undefined }}
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
          <TooltipButton key={c.l} aria-label={c.label} tooltip={c.label} aria-current={c.l === level ? "true" : undefined}
            data-on={c.l <= level ? "" : undefined} disabled={c.l >= level} onClick={() => go(c.l)}><i /></TooltipButton>
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
export function AtlasHosted({ open, onOpen, width, height, mapStyle = "circles", treatment, signals = "scatter", onSignal, selSig }: {
  open?: { kind: ObjKind; id: string }; onOpen: OnOpen; width: number; height: number; mapStyle?: MapStyle; treatment?: Treatment;
  /** How signals show; "scatter" is the current look. With no onSignal, a signal opens the theory (or theme) it belongs to. */
  signals?: SignalEncoding; onSignal?: OnSignal; selSig?: string;
}) {
  const [themeId, setTheme] = useState<string>();
  useEffect(() => { setTheme(t => (open ? contextFor(t, open.kind, open.id) : undefined)); }, [open?.kind, open?.id]);
  return (
    <MotionConfig reducedMotion="user">
      <div className="ap a2" data-variant="side" data-hosted="" style={{ width, height }}>
        <AtlasMap mapStyle={mapStyle} treatment={treatment} vw={width} vh={height} focus={themeId} selTheme={themeId} selPin={open?.kind === "theory" ? open.id : undefined}
          onRegion={id => onOpen("theme", id)} onPin={id => onOpen("theory", id)}
          signals={signals} selSig={selSig} onSignal={onSignal ?? ((_id, th, themeId) => onOpen(th ? "theory" : "theme", th ?? themeId))} />
      </div>
    </MotionConfig>
  );
}

/** Atlas, developed: two ways to open a territory or landmark to read and write it without losing the map. */
export function AtlasDeveloped({ variant, mapStyle, treatment, size, signals }: { variant: Variant; mapStyle?: MapStyle; treatment?: Treatment; size?: FrameSize; signals?: SignalEncoding }) {
  return (
    <MotionConfig reducedMotion="user">
      {variant === "side" ? <SidePane mapStyle={mapStyle} treatment={treatment} size={size} signals={signals} /> : <DeepZoom />}
    </MotionConfig>
  );
}
