import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useDecisions } from "./store";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { JigPage } from "./jig";
import {
  Stage, useDump, PRIOR, SCREEN_CTX, I, IconBtn, Composer, SendBtn, NoteWave, PhoneFrame, mmss, CHOSEN,
  AttGroup, DraftView, MeMsg,
  type Att, type DumpState, type Force, type Variant, type AttStyle, type Draft,
} from "./homes/pill-study";
import "./homes/homes.css";
import "./homes/pill-study.css";

/* ── Direction: a tiny script runner with a drawn cursor ── */
type Pt = { x: number; y: number };
type Target = string | Pt;
type CursorS = Pt & { down: boolean; show: boolean; dur: number };
type Director = {
  wait: (ms: number) => Promise<void>;
  pos: (t: Target) => Pt;
  place: (t: Target) => void;
  move: (t: Target, ms?: number) => Promise<void>;
  click: () => Promise<void>;
  cap: (label: string | null, t?: Target) => void;
  hide: () => void;
};

function useInView(ref: RefObject<HTMLElement | null>) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setV(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return v;
}

function useDirector(frameRef: RefObject<HTMLDivElement | null>, script: (d: Director) => Promise<void>, enabled: boolean) {
  const [cursor, setCursor] = useState<CursorS>({ x: 0, y: 0, down: false, show: false, dur: 0 });
  const [cap, setCapS] = useState<(Pt & { label: string }) | null>(null);
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);
  const last = useRef<Pt>({ x: 0, y: 0 });
  useEffect(() => {
    if (!enabled || paused) return;
    let dead = false;
    const wait = (ms: number) => new Promise<void>((res, rej) => window.setTimeout(() => (dead ? rej(new Error("stop")) : res()), ms));
    const pos = (t: Target): Pt => {
      if (typeof t !== "string") return t;
      const f = frameRef.current, el = f?.querySelector(`[data-target="${t}"]`);
      if (!f || !el) return last.current;
      const a = f.getBoundingClientRect(), b = el.getBoundingClientRect();
      return { x: b.left - a.left + b.width / 2, y: b.top - a.top + b.height / 2 };
    };
    const d: Director = {
      wait, pos,
      place: t => { const p = pos(t); last.current = p; setCursor(c => ({ ...c, ...p, dur: 0, show: true })); },
      move: async (t, ms = 700) => { const p = pos(t); last.current = p; setCursor(c => ({ ...c, ...p, dur: ms / 1000, show: true })); await wait(ms); },
      click: async () => { setCursor(c => ({ ...c, down: true })); await wait(120); setCursor(c => ({ ...c, down: false })); },
      cap: (label, t) => setCapS(label ? { label, ...pos(t ?? last.current) } : null),
      hide: () => setCursor(c => ({ ...c, show: false })),
    };
    (async () => { try { for (;;) await script(d); } catch { /* stopped */ } })();
    return () => { dead = true; setCapS(null); };
  }, [run, paused, enabled]);
  return { cursor, cap, paused, pause: () => setPaused(true), replay: () => { setPaused(false); setRun(r => r + 1); } };
}

function Cursor({ c, touch }: { c: CursorS; touch?: boolean }) {
  const ease = [0.45, 0, 0.1, 1] as const;
  return (
    <motion.div className="pc-cursor" data-touch={touch ? "" : undefined} initial={false}
      animate={{ x: c.x, y: c.y, opacity: c.show ? 1 : 0 }}
      transition={{ x: { duration: c.dur, ease }, y: { duration: c.dur, ease }, opacity: { duration: 0.2 } }}>
      {touch
        ? <motion.span className="pc-touch" animate={{ scale: c.down ? 0.8 : 1, opacity: c.down ? 0.9 : 0.55 }} transition={{ duration: 0.12 }} />
        : (
          <motion.svg width="20" height="22" viewBox="0 0 20 22" animate={{ scale: c.down ? 0.85 : 1 }} transition={{ duration: 0.1 }} style={{ transformOrigin: "3px 2px" }}>
            <path d="M3 2v15.5l4.2-3.9 2.7 6.1 2.6-1.1-2.7-6h5.9L3 2Z" fill="#111" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
          </motion.svg>
        )}
    </motion.div>
  );
}

function Caps({ cap }: { cap: (Pt & { label: string }) | null }) {
  return (
    <AnimatePresence>
      {cap && (
        <motion.div key={cap.label} className="pc-caps" style={{ left: cap.x, top: cap.y }} initial={{ opacity: 0, y: 6, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}>
          {cap.label.split(" ").map(k => <kbd key={k}>{k}</kbd>)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const ReplayBtn = ({ onClick }: { onClick: () => void }) => <IconBtn n="replay" label="Replay" onClick={onClick} className="pc-replay" />;

/* ── Section 1: anatomy and states ── */
const X_ATT: Att = { id: "drag-x", kind: "link", host: "x.com", title: "Small models are eating the routine work" };
type TileSpec = { name: string; note: string; init?: Partial<DumpState>; force?: Force; variant?: Variant; extra?: ReactNode };
const TILES: TileSpec[] = [
  { name: "Rest", note: "Verb, then the screen it sees, muted." },
  { name: "Hover", note: "Lifts 1px; the shadow deepens with it.", force: { hover: true } },
  { name: "Focus", note: "Keyboard ring, offset so it never touches the shadow.", force: { focus: true } },
  { name: "Pressed", note: "Scales to 0.96 from the bottom edge.", force: { hover: true, pressed: true } },
  { name: "Drop a file", note: "A file shows its thumbnail and name before you let go.", init: { drag: { id: "drag-f", kind: "image", host: "screenshot.png", title: "screenshot.png" } } },
  { name: "Drag over", note: "Swells and shows exactly what it will take.", init: { drag: X_ATT }, extra: <div className="pc-dragged"><I n="signal" size={14} /><span>Small models are eating the routine work</span></div> },
  { name: "Recording", note: "The pill becomes the take; the mic inside turns to stop.", init: { rec: Date.now() }, force: { time: "0:07" } },
  { name: "Sending", note: "The dump drops into the pill it came from.", init: { incoming: X_ATT }, force: { midflight: true } },
  { name: "Processing", note: "Only the icon changes: a quiet spinner.", init: { busy: true } },
  { name: "Done", note: "A toast rises from the pill with counts and undo.", init: { toast: { id: "t-static", parts: [{ icon: "signal", n: 3, one: "signal", many: "signals" }, { icon: "theory", n: 1, one: "draft", many: "drafts" }] } } },
  { name: "Sees", note: "Pointing at the screen name outlines what the agent gets.", init: { hot: "main" }, force: { hover: true } },
  { name: "Phone", note: "No screen name; the mic is ink because voice comes first.", variant: "P" },
];

function Tile({ t }: { t: TileSpec }) {
  const { s, api } = useDump(t.init);
  const force: Force = t.force ?? {};
  return (
    <figure className="pc-tile">
      <div className="pc-tile-frame" inert>
        <Stage variant={t.variant ?? "B2"} centred s={s} api={api} w={440} h={230} cx={220} force={force} live={false} screenY={-200} screenX={-250}>{t.extra}</Stage>
      </div>
      <figcaption><strong>{t.name}</strong><span>{t.note}</span></figcaption>
    </figure>
  );
}

function LiveFrame({ variant, init, h = 760 }: { variant: Variant; init?: Partial<DumpState>; h?: number }) {
  const { s, api } = useDump(init);
  return (
    <div className="pc-live">
      <Stage variant={variant} s={s} api={api} w={1240} h={h} />
      <ReplayBtn onClick={() => api.reset(init)} />
    </div>
  );
}

/** A live frame that also plays its own open and close until you touch it. */
function CornerFrame({ init }: { init: Partial<DumpState> }) {
  const { s, api } = useDump(init);
  const ref = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const inView = useInView(wrap);
  const reduced = useReducedMotion();
  const dir = useDirector(ref, async d => {
    api.reset(init);
    d.place({ x: 760, y: 380 }); await d.wait(1000);
    await d.move("pill", 900); await d.wait(150); await d.click(); api.open();
    await d.move({ x: 700, y: 380 }, 900); await d.wait(1900);
    await d.move("close", 800); await d.wait(150); await d.click(); api.close();
    await d.move({ x: 760, y: 380 }, 900); await d.wait(900);
  }, inView && !reduced);
  return (
    <div ref={wrap} className="pc-live" onPointerDown={dir.pause}>
      <Stage variant="B2" s={s} api={api} w={1240} h={760} frameRef={ref}>{!dir.paused && <Cursor c={dir.cursor} />}</Stage>
      <ReplayBtn onClick={() => { api.reset(init); dir.replay(); }} />
    </div>
  );
}

/* ── Section 3: microinteractions ── */
function Mini({ title, note, children, onReplay, wide }: { title: string; note: string; children: ReactNode; onReplay?: () => void; wide?: boolean }) {
  return (
    <figure className="pc-mini" data-wide={wide ? "" : undefined}>
      <div className="pc-mini-stage ap">{children}{onReplay && <ReplayBtn onClick={onReplay} />}</div>
      <figcaption><strong>{title}</strong><span>{note}</span></figcaption>
    </figure>
  );
}

/** Composer-only demos: an autoplay loop that stops as soon as you touch it. */
function MiniComposer({ script, init, sees }: { script: (api: ReturnType<typeof useDump>["api"], d: Director) => Promise<void>; init?: Partial<DumpState>; sees?: boolean }) {
  const { s, api } = useDump(init);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reduced = useReducedMotion();
  const dir = useDirector(ref, d => script(api, d), inView && !reduced);
  return (
    <Mini2 frameRef={ref} onTouch={dir.pause} onReplay={() => { api.reset(init); dir.replay(); }}>
      <div className="pc-card" style={sees ? { marginTop: 36 } : undefined}>
        <Composer s={s} api={api} screen="Cost of intelligence" sees={!!sees} />
      </div>
    </Mini2>
  );
}
function Mini2({ frameRef, children, onTouch, onReplay }: { frameRef: RefObject<HTMLDivElement | null>; children: ReactNode; onTouch: () => void; onReplay: () => void }) {
  return (
    <div ref={frameRef} className="pc-mini-body" onPointerDown={onTouch} onKeyDown={onTouch}>
      {children}
      <ReplayBtn onClick={onReplay} />
    </div>
  );
}

const typeInto = async (api: ReturnType<typeof useDump>["api"], d: Director, text: string, ms = 38) => {
  for (let k = 1; k <= text.length; k++) { api.setText(text.slice(0, k)); await d.wait(ms); }
};

/** Stage-based demos (pill in a 680 × 200 crop). */
function MiniStage({ script, touchStops = true, children, onReady }: { script: (api: ReturnType<typeof useDump>["api"], d: Director) => Promise<void>; touchStops?: boolean; children?: (api: ReturnType<typeof useDump>["api"], s: DumpState, frame: RefObject<HTMLDivElement | null>, force: (f: Force) => void) => ReactNode; onReady?: never }) {
  const { s, api } = useDump();
  const ref = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const inView = useInView(wrap);
  const reduced = useReducedMotion();
  const [force, setForce] = useState<Force>({});
  const forceRef = useRef(setForce);
  const dir = useDirector(ref, d => script(Object.assign(api, { force: forceRef.current }), d), inView && !reduced && !!script);
  return (
    <div ref={wrap} className="pc-mini-stagewrap" onPointerDown={touchStops ? () => { dir.pause(); setForce({}); } : undefined}>
      <Stage variant="B2" s={s} api={api} w={660} h={200} cx={330} force={force} frameRef={ref} screenY={-262} screenX={-250}>
        {children?.(api, s, ref, setForce)}
        <Cursor c={dir.cursor} />
      </Stage>
      <ReplayBtn onClick={() => { api.reset(); setForce({}); dir.replay(); }} />
    </div>
  );
}
type ApiF = ReturnType<typeof useDump>["api"] & { force?: (f: Force) => void };

function MiniScrub() {
  const [at, setAt] = useState(0.38);
  const [playing, setPlaying] = useState(false);
  const total = 252;
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => setAt(a => (a >= 1 ? (setPlaying(false), 1) : Math.min(1, a + 0.004))), 60);
    return () => clearInterval(t);
  }, [playing]);
  return (
    <div className="pc-mini-body">
      <div className="pc-card pc-scrub">
        <button type="button" className="ps-ib" aria-label={playing ? "Pause" : "Play"} title={playing ? "Pause" : "Play"} onClick={() => setPlaying(p => !p)} style={{ width: 32, height: 32 }}>
          <I n={playing ? "pause" : "play"} />
        </button>
        <NoteWave bars={64} height={28} at={at} onSeek={f => { setAt(f); }} />
        <span className="ap-num pc-scrub-time">{mmss(at * total)}</span>
      </div>
      <p className="pc-scrub-line">… the thing I keep noticing is that every routine task I hand to an agent now runs on a small model …</p>
    </div>
  );
}

function DropDemo() {
  const home = { x: 60, y: 34 };
  return (
    <MiniStage touchStops={false} script={async (_api, d) => { d.hide(); await d.wait(100000); }}>
      {(api, s, frame) => <Draggable api={api} s={s} frame={frame} home={home} />}
    </MiniStage>
  );
}
function Draggable({ api, s, frame, home }: { api: ReturnType<typeof useDump>["api"]; s: DumpState; frame: RefObject<HTMLDivElement | null>; home: Pt }) {
  const [p, setP] = useState<Pt>(home);
  const [drag, setDrag] = useState<Pt | null>(null);
  const [gone, setGone] = useState(false);
  useEffect(() => { if (gone && !s.busy && !s.incoming && s.toast) { const t = window.setTimeout(() => { setP(home); setGone(false); }, 1600); return () => clearTimeout(t); } }, [gone, s.busy, s.incoming, s.toast]);
  const overPill = (cx: number, cy: number) => {
    const el = frame.current?.querySelector(".ps-surface");
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return cx > r.left - 16 && cx < r.right + 16 && cy > r.top - 24 && cy < r.bottom + 16;
  };
  return (
    <AnimatePresence>
      {!gone && (
        <motion.div className="pc-dragged pc-draggable" data-lifted={drag ? "" : undefined}
          style={{ left: 0, top: 0 }} initial={{ opacity: 0, x: home.x, y: home.y }} animate={{ x: p.x, y: p.y, opacity: s.drag ? 0.75 : 1, rotate: drag ? -2 : 0, scale: s.drag ? 0.82 : drag ? 1.02 : 1 }} exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.25 } }}
          transition={drag ? { duration: 0 } : { type: "spring", duration: 0.45, bounce: 0.2 }}
          onPointerDown={e => { (e.target as Element).setPointerCapture(e.pointerId); setDrag({ x: e.clientX - p.x, y: e.clientY - p.y }); }}
          onPointerMove={e => {
            if (!drag) return;
            setP({ x: e.clientX - drag.x, y: e.clientY - drag.y });
            const over = overPill(e.clientX, e.clientY);
            if (over && !s.drag) api.setDrag(X_ATT); else if (!over && s.drag) api.setDrag(null);
          }}
          onPointerUp={e => {
            setDrag(null);
            if (overPill(e.clientX, e.clientY)) { setGone(true); api.dumpDirect({ ...X_ATT, id: `x${Date.now()}` }); }
            else { api.setDrag(null); setP(home); }
          }}>
          <I n="signal" size={14} /><span>Small models are eating the routine work</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Picks: one decision key per group, saved to design/decisions.json ── */
const Picks = createContext<{ get: (g: string) => string | undefined; set: (g: string, k: string) => void }>({ get: () => undefined, set: () => {} });
function PickBtn({ group, k, label }: { group: string; k: string; label: string }) {
  const { get, set } = useContext(Picks);
  const on = get(group) === k;
  return <button type="button" className="jig-choose pc-pick" aria-pressed={on} aria-label={`Pick ${label}`} onClick={() => set(group, k)}>{on ? "Picked" : "Pick"}</button>;
}

/* ── Section 2b: revisions from review ── */
const LINKS: Att[] = [
  { id: "r1", kind: "link", host: "x.com", title: "Small models are eating the routine work" },
  { id: "r2", kind: "link", host: "news.ycombinator.com", title: "Open-weight model matches last year's frontier" },
  { id: "r3", kind: "link", host: "arxiv.org", title: "Inference cost falls 10x a year for fixed quality" },
];
const DRAFT: Draft = { claim: "Local models absorb most everyday agent work", kind: "theory", state: "pending", joins: "Cost of intelligence", ev: [3, 0] };

function RevCell({ k, name, line, chosen, children, short, group, pick }: { k: string; name: string; line: string; chosen?: boolean; children: ReactNode; short?: boolean; group: string; pick: string }) {
  return (
    <figure className="pc-rev-cell" data-pick-key={`${group}:${pick}`}>
      <div className="pc-rev-stage ap" data-short={short ? "" : undefined}>{children}</div>
      <figcaption><strong>{k}. {name}{chosen && <em className="pc-rec"> In the panel</em>}</strong><span>{line}</span></figcaption>
      <PickBtn group={group} k={pick} label={`${k}. ${name}`} />
    </figure>
  );
}
function RevGroup({ title, note, n = 3, children }: { title: string; note: string; n?: number; children: ReactNode }) {
  return (
    <div className="pc-rev">
      <div className="pc-variant-head"><strong>{title}</strong><span>{note}</span></div>
      <div className="pc-rev-row" data-n={n}>{children}</div>
    </div>
  );
}
function Revisions() {
  const me = { id: "rv", who: "me" as const, text: "Price drops reach routine work first.", atts: LINKS, time: "08:12" };
  return (
    <>
      <RevGroup title="Send" note="An arrow to dump; a question mark, in a speech-bubble button, to ask." n={2}>
        <RevCell group="pill-send" pick="dump" k="1" name="Dump" line="Round: the dump goes in to be filed." chosen short>
          <div className="pc-pair"><span><SendBtn text="Routine work moves to local models" ready onSend={() => {}} /></span></div>
        </RevCell>
        <RevCell group="pill-send" pick="ask" k="2" name="Ask" line="Once you type a question mark, the arrow turns into one and the button into a bubble." chosen short>
          <div className="pc-pair"><span><SendBtn text="What would make this wrong?" ready onSend={() => {}} /></span></div>
        </RevCell>
      </RevGroup>
      <RevGroup title="Attachments on a sent dump" note="Fun little cards under the bubble. Hover the stack.">
        {(["cards", "fan", "tiles"] as AttStyle[]).map((st, i) => (
          <RevCell group="pill-attach" pick={st} key={st} k={"ABC"[i]} chosen={st === CHOSEN.att}
            name={{ cards: "Link cards", fan: "Stack", fanX: "Stack, across", tiles: "Tiles" }[st]}
            line={{ cards: "Preview, title and site; one per row.", fan: "A small fanned stack with a count; spreads into cards on hover.", fanX: "", tiles: "Small square tiles; a voice note sits among them as its own tile." }[st]}>
            <div className="pc-rev-thread">{st === "tiles" ? <div className="ps-me"><div className="ps-bubble">{me.text}</div><AttGroup atts={LINKS.slice(0, 2)} voice={42} style="tiles" /></div> : <MeMsg m={me} att={st} />}</div>
          </RevCell>
        ))}
      </RevGroup>
      <RevGroup title="Stack: two ways to spread" note="Softer and slower now, with a 50ms stagger. Hover each." n={2}>
        {(["fan", "fanX"] as AttStyle[]).map((st, i) => (
          <RevCell group="pill-attach" pick={st} key={st} k={String(i + 1)} chosen={st === CHOSEN.att} name={st === "fan" ? "Down" : "Across"}
            line={st === "fan" ? "Cards drop into a column under the bubble." : "Cards slide out side by side, leftward from the bubble's edge."}>
            <div className="pc-rev-thread" style={{ width: 600 }}><MeMsg m={me} att={st} /></div>
          </RevCell>
        ))}
      </RevGroup>
    </>
  );
}

function MiniSolidify() {
  const [d, setD] = useState<Draft>(DRAFT);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reduced = useReducedMotion();
  const dir = useDirector(ref, async w => {
    setD(DRAFT); await w.wait(1500);
    setD({ ...DRAFT, state: "accepted" }); await w.wait(2600);
  }, inView && !reduced);
  return (
    <div ref={ref} className="pc-mini-body" onPointerDown={dir.pause}>
      <div className="pc-rev-thread"><DraftView d={d} onDecide={st => setD({ ...d, state: st })} /></div>
      <ReplayBtn onClick={() => { setD(DRAFT); dir.replay(); }} />
    </div>
  );
}

/* ── Section 4: walkthrough ── */
function Walkthrough() {
  const { s, api } = useDump({ thread: PRIOR });
  const ref = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const inView = useInView(wrap);
  const reduced = useReducedMotion();
  const [force, setForce] = useState<Force>({});
  useEffect(() => {
    if (!reduced) return;
    api.reset({ thread: [...PRIOR, { id: "pm", who: "me", text: "Routine agent work is moving to small local models", atts: [X_ATT], time: "09:30" },
      { id: "pa", who: "agent", thinking: false, filed: [{ theme: "Cost of intelligence", n: 1 }], draft: { claim: "Local models absorb most everyday agent work", kind: "theory", state: "accepted" } }], open: true });
  }, [reduced]);
  const dir = useDirector(ref, async d => {
    api.reset({ thread: PRIOR });
    setForce({});
    d.place({ x: 1010, y: 560 });
    await d.wait(1000);
    void d.move("pill", 950);
    await d.wait(500); setForce({ approach: true });
    await d.wait(450); setForce({ approach: true, hover: true });
    await d.wait(350);
    setForce({ approach: true, hover: true, pressed: true }); await d.click(); setForce({});
    api.open();
    await d.wait(900);
    await d.move("input", 650);
    d.cap("⌘ V", { x: d.pos("input").x + 30, y: d.pos("input").y - 44 });
    await d.wait(250);
    api.addLink("https://x.com/karpathy/status/1849");
    await d.wait(500); d.cap(null);
    await d.wait(500);
    await typeInto(api, d, "Routine agent work is moving to small local models", 34);
    await d.wait(400);
    await d.move("send", 600); await d.click(); api.send();
    await d.move({ x: 700, y: d.pos("send").y - 160 }, 900);
    await d.wait(900);
    await d.move("accept", 700); await d.wait(200); await d.click(); api.decideLast("accepted");
    await d.wait(1300);
    const close = d.pos("close");
    await d.move({ x: close.x + 120, y: close.y - 40 }, 700);
    d.cap("Esc", { x: close.x + 120, y: close.y - 84 });
    await d.wait(450);
    api.close(); d.cap(null);
    await d.move({ x: 1010, y: 560 }, 900);
    await d.wait(3000);
    api.dismissToast();
    await d.wait(900);
  }, inView && !reduced);
  return (
    <div ref={wrap} className="pc-live">
      <div className="pc-noclick">
        <Stage variant="B2" s={s} api={api} w={1240} h={760} force={force} frameRef={ref} live={false}>
          <Caps cap={dir.cap} />
          <Cursor c={dir.cursor} />
        </Stage>
      </div>
      <ReplayBtn onClick={dir.replay} />
    </div>
  );
}

/* ── Section 5: phone ── */
function PhoneLive() {
  const { s, api } = useDump();
  return (
    <div className="pc-phonecol">
      <PhoneFrame><Stage variant="P" s={s} api={api} w={390} h={844} /></PhoneFrame>
    </div>
  );
}
function PhoneVoice() {
  const { s, api } = useDump();
  const ref = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const inView = useInView(wrap);
  const reduced = useReducedMotion();
  const dir = useDirector(ref, async d => {
    api.reset();
    d.place({ x: 300, y: 640 });
    await d.wait(900);
    await d.move("mic", 700); await d.click(); api.startRec();
    d.hide();
    await d.wait(4200);
    await d.move("stop", 500); await d.click(); api.stopRecInto();
    d.hide();
    await d.wait(2200);
    await d.move("accept", 700); await d.click(); api.decideLast("accepted");
    await d.wait(1200);
    await d.move("close", 600); await d.click(); api.close();
    d.hide();
    await d.wait(3200);
    api.dismissToast();
    await d.wait(900);
  }, inView && !reduced);
  return (
    <div ref={wrap} className="pc-phonecol">
      <div className="pc-noclick">
        <PhoneFrame><Stage variant="P" s={s} api={api} w={390} h={844} frameRef={ref} live={false}><Cursor c={dir.cursor} touch /></Stage></PhoneFrame>
      </div>
      <ReplayBtn onClick={dir.replay} />
    </div>
  );
}

/* ── Page ── */
function Section({ id, title, note, children }: { id: string; title: string; note: ReactNode; children: ReactNode }) {
  return (
    <section className="hm pc-section" id={id}>
      <div className="hm-head"><div className="hm-head-text"><h2>{title}</h2><p>{note}</p></div></div>
      {children}
    </section>
  );
}

export function DevelopPillJig() {
  const { decisions, update } = useDecisions();
  const picks = { get: (g: string) => decisions[g]?.choice, set: (g: string, k: string) => update(g, { choice: decisions[g]?.choice === k ? undefined : k }) };
  return (
    <Picks.Provider value={picks}>
    <JigPage title="Dump or ask"
      intro={<p>The pill, everything it does while closed, and how it opens. Every frame is live; Esc, click-away and ⌘J work in whichever frame the pointer is in.</p>}>
      <nav className="hm-toc">
        <a href="#states">States</a><a href="#open">Open</a><a href="#revisions">Revisions</a><a href="#details">Details</a><a href="#walk">Walkthrough</a><a href="#phone">Phone</a>
      </nav>

      <Section id="states" title="1. Anatomy and states" note="Forced states first, then the live pill. Drag a signal row from the screen onto it, record with the mic, or point at the screen name.">
        <div className="pc-tiles">{TILES.map(t => <Tile key={t.name} t={t} />)}</div>
        <LiveFrame variant="B2" init={{ thread: PRIOR }} h={560} />
      </Section>

      <Section id="open" title="2. Open" note="The pill lives in the bottom-right corner and a full-height column grows up out of it; the screen makes room instead of being covered. Closing folds it back down into the corner.">
        <CornerFrame init={{ thread: PRIOR }} />
      </Section>

      <Section id="revisions" title="2b. Revisions from review" note="Pieces from review still to decide. The one marked “In the panel” is what every frame on this page uses. Settled ones are built in: the count badge, the draft card with actions on its edge, context pills floating above the input, and the crosshair.">
        <Revisions />
      </Section>

      <Section id="details" title="3. Details" note="Each loops on its own and stops the moment you take over.">
        <div className="pc-minis">
          <Mini title="Accepting solidifies the draft" note="Dashes fade, the card settles and lifts a hair; it is yours now."><MiniSolidify /></Mini>
          <Mini title="A pasted URL becomes a link" note="Favicon at once; the title resolves in place a beat later.">
            <MiniComposer script={async (api, d) => {
              api.reset(); await d.wait(900);
              api.setText("https://x.com/karpathy/status/1849"); await d.wait(420);
              api.setText(""); api.addLink("https://x.com/karpathy/status/1849"); await d.wait(2600);
              api.addLink("https://news.ycombinator.com/item?id=4012"); await d.wait(2600);
            }} />
          </Mini>
          <Mini title="A question mark turns dump into ask" note="The arrow stays; its button becomes a speech bubble. No mode switch.">
            <MiniComposer script={async (api, d) => {
              api.reset(); await d.wait(700);
              await typeInto(api, d, "Routine agent work is moving to local models"); await d.wait(1400);
              api.setText(""); await d.wait(500);
              await typeInto(api, d, "What would make this wrong?"); await d.wait(1800);
              api.setText(""); await d.wait(300);
            }} />
          </Mini>
          <Mini title="Context pills leave and return" note="Pills float above the input; neighbours close the gap and the crosshair picks something on screen.">
            <MiniComposer sees init={{ ctx: [SCREEN_CTX, { id: "c-t1", label: "Tokens become nearly free", kind: "theory", region: "t1" }] }}
              script={async (api, d) => {
                api.reset({ ctx: [SCREEN_CTX, { id: "c-t1", label: "Tokens become nearly free", kind: "theory", region: "t1" }] }); await d.wait(1600);
                api.removeCtx("c-t1"); await d.wait(1200);
                api.setPicking(true); await d.wait(900);
                api.addCtx({ id: "c-t2", label: "Frontier intelligence stays scarce", kind: "theory", region: "t2" }); await d.wait(1600);
                api.removeCtx("c-screen"); await d.wait(1400);
              }} />
          </Mini>
          <Mini title="The mic lives in the pill" note="Tap it and the pill becomes the take; stop drops the note in.">
            <MiniStage script={async (api, d) => {
              api.reset(); d.place({ x: 560, y: 50 }); await d.wait(900);
              await d.move("mic", 900); await d.wait(150); await d.click(); api.startRec();
              await d.wait(2600); await d.move("mic", 300); await d.click(); api.stopRec();
              await d.move({ x: 560, y: 50 }, 900); await d.wait(3000); api.dismissToast(); await d.wait(700);
            }} />
          </Mini>
          <Mini title="Processing, toast, undo" note="The dump drops in, the icon turns, counts rise just above.">
            <MiniStage script={async (api, d) => {
              api.reset(); d.place({ x: 560, y: 60 }); await d.wait(800);
              api.dumpDirect({ ...X_ATT, id: `x${Date.now()}` }); await d.wait(2700);
              await d.move("undo", 800); await d.wait(200); await d.click(); api.undo(); await d.wait(400);
              await d.move({ x: 560, y: 60 }, 800); await d.wait(800);
            }} />
          </Mini>
          <Mini title="A long voice note scrubs" note="Drag across the waveform; the time follows the hairline."><MiniScrub /></Mini>
          <Mini title="Drop onto the pill" note="Drag the signal onto the pill; it swells and shows the title."><DropDemo /></Mini>
        </div>
      </Section>

      <Section id="walk" title="4. Walkthrough" note="Rest, approach, open, paste, send, accept the draft, Esc, toast.">
        <Walkthrough />
      </Section>

      <Section id="phone" title="5. Phone" note="Pill and mic bottom centre; the sheet grows from the pill to near full width. Voice first: the mic records into a short sheet with the transcript, stop lands the note in the conversation.">
        <div className="pc-phones">
          <PhoneLive />
          <PhoneVoice />
        </div>
      </Section>
    </JigPage>
    </Picks.Provider>
  );
}
