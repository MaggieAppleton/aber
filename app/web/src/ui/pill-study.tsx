import { IconTooltip, TooltipButton } from "./tooltip";
import { ContextHighlight } from "./context-highlight";
import { NoteWave } from "../chat/audio-waveform";
import { SURFACE_RADII } from "./metrics";
import { VoicePlayback } from "../chat/voice-playback";
export { NoteWave } from "../chat/audio-waveform";
export { VoicePlayback } from "../chat/voice-playback";
import { currentObjectDrag,readObjectDrag,type DraggedObject } from "../data/object-drag";
import { useLiveDump } from "../chat/use-dump";
import { ToolParts } from "../chat/parts";
import { AssistantText } from "../chat/assistant-text";
/* Dump-or-ask pill study: the pill, its closed states and how it opens (B2: a column growing up from the bottom-right pill).
   One state hook (useDump) drives every frame, so live frames and scripted demos share the same component. */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion, type Transition } from "motion/react";
import { SIGNALS, THEMES, theory } from "./data";
import { Conf, Icon, Mark, TheoryCard, type IconName, type IconWeight } from "./atoms";
import "./pill-study.css";

/* ── Icons: the shared Phosphor set (see atoms). ── */
export type { IconName };
export const I = ({ n, size = 16, weight }: { n: IconName; size?: number; weight?: IconWeight }) => <Icon name={n} size={size} weight={weight} />;
/** Stop sits inside the live recording control, so it is the active (fill) weight. */
const StopGlyph = ({ size = 12 }: { size?: number }) => <Icon name="stop" size={size} weight="fill" />;

export const IconBtn = ({ n, label, onClick, target, className, size = 28, pressed }: { n: IconName; label: string; onClick?: () => void; target?: string; className?: string; size?: number; pressed?: boolean }) => (
  <TooltipButton type="button" className={`ps-ib ${className ?? ""}`} style={{ width: size, height: size }} aria-label={label} tooltip={label} onClick={onClick} data-target={target} aria-pressed={pressed}>
    <I n={n} weight={pressed ? "fill" : "regular"} />
  </TooltipButton>
);

/** Swaps an icon with the scale + blur cross-fade (one slot, both icons share it). */
export const SwapIcon = ({ k, children }: { k: string; children: ReactNode }) => (
  <span className="ps-swap">
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span key={k} className="ps-swap-i" initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }} transition={{ type: "spring", duration: 0.3, bounce: 0 }}>
        {children}
      </motion.span>
    </AnimatePresence>
  </span>
);

/* ── Favicons: real marks where we have them, a globe otherwise ── */
export function Favicon({ host, size = 14 }: { host: string; size?: number }) {
  if (host === "x.com") return (
    <span className="ps-fav" data-host="x" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62}><path fill="#fff" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
    </span>
  );
  if (host === "news.ycombinator.com") return <span className="ps-fav" data-host="hn" style={{ width: size, height: size, fontSize: size * 0.72 }} aria-hidden>Y</span>;
  if (host.endsWith(".png")) return <span className="ps-fav" data-host="img" style={{ width: size, height: size }} aria-hidden />;
  return <span className="ps-fav" style={{ width: size, height: size }} aria-hidden><I n="globe" size={size} /></span>;
}

export const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

/* ── State ── */
export type Att = { id: string; kind: "link" | "image" | "file" | "audio" | "object"; object?:DraggedObject; host: string; title?: string; by?: string; url?: string; file?: File };
export type Ctx = { id: string; label: string; kind: "screen" | "theory" | "signal" | "theme" | "prototype"; region: string; objectId?: string; auto?: boolean };
export type Draft = { claim: string; kind: "theory" | "revision"; state: "pending" | "accepted" | "discarded"; joins?: string; ev?: [number, number] };
export type Filed = { theme: string; n: number; gists?: string[] };
export type Msg =
  | { id: string; who: "me"; text: string; atts: Att[]; voice?: number; time: string }
  | { id: string; who: "agent"; thinking: boolean; filed: Filed[]; draft?: Draft; say?: string; parts?: any[] };
export type ToastPart = { icon: IconName; n: number; one: string; many: string };
export type ToastT = { id: string; parts: ToastPart[] };
export type DumpState = {
  open: boolean; text: string; atts: Att[]; ctx: Ctx[]; thread: Msg[];
  rec: number | null; busy: boolean; incoming: Att | null; toast: ToastT | null;
  picking: boolean; drag: Att | null; hot: string | null; made: { signals: number; theories: number };
};

let uid = 0;
const nid = (p: string) => `${p}${++uid}`;
export const SCREEN_CTX: Ctx = { id: "c-screen", label: "World", kind: "screen", region: "main" };
export const PRIOR: Msg[] = [];
const VOICE_WORDS: string[] = [];
export const nowTime = () => new Date().toTimeString().slice(0,5);
export type DumpApi = ReturnType<typeof useLiveDump>["api"];
export const useDump = useLiveDump;

/* ── Live bits ── */
export function useNow(on: boolean, ms = 250) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = window.setInterval(() => tick(x => x + 1), ms);
    return () => clearInterval(t);
  }, [on, ms]);
  return Date.now();
}
export const mmss = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, "0")}`;

/** A live, scrolling waveform: new samples enter at the right. */
export function LiveWave({ bars = 28, height = 18, live = true, seed = 1 }: { bars?: number; height?: number; live?: boolean; seed?: number }) {
  const reduced = useReducedMotion();
  const [levels,setLevels]=useState(()=>Array.from({length:bars},()=>.12));
  useEffect(()=>{
    if(!live||reduced)return;
    const update=(event:Event)=>{const {level}=(event as CustomEvent<{level:number}>).detail;setLevels(values=>[...values.slice(1),Math.max(.12,level)]);};
    window.addEventListener("aber:audio-level",update);return()=>window.removeEventListener("aber:audio-level",update);
  },[live,reduced]);
  return (
    <span className="ps-wave" style={{ height }} aria-hidden>
      {levels.map((v, i) => <i key={i} style={{ height: Math.max(3, v * height), opacity: 0.35 + 0.65 * (i / bars) }} />)}
    </span>
  );
}

const Spinner = ({ size = 14 }: { size?: number }) => (
  <svg className="ps-spin" width={size} height={size} viewBox="0 0 16 16" aria-hidden>
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.6" />
    <path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/* ── Chips ── */
export function LinkChip({ a, onRemove, big }: { a: Att; onRemove?: () => void; big?: boolean }) {
  if(a.object)return <span className="ps-link"><I n={a.object.kind} size={14}/><span className="ps-link-title">{a.object.label}</span>{onRemove&&<TooltipButton className="ps-chip-x" aria-label={`Remove ${a.object.label}`} onClick={onRemove}><I n="x" size={12}/></TooltipButton>}</span>;
  if (a.kind === "image") return (
    <span className="ps-thumb" data-big={big ? "" : undefined}>
      <span className="ps-thumb-img" title={a.host} aria-hidden>{a.url?<img src={a.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<I n="image"/>}</span>
      {onRemove && <TooltipButton type="button" className="ps-thumb-x" aria-label="Remove" tooltip="Remove" onClick={onRemove}><I n="x" size={10} /></TooltipButton>}
    </span>
  );
  return (
    <span className="ps-link">
      <Favicon host={a.host} />
      <span className="ps-link-text" title={a.title ? `${a.title}\n${a.host}` : a.host}>
        <AnimatePresence initial={false} mode="popLayout">
          {a.title
            ? <motion.span key="t" className="ps-link-title" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>{a.title}</motion.span>
            : <motion.span key="h" className="ps-link-host" exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>{a.host}<i className="ps-shimmer" /></motion.span>}
        </AnimatePresence>
      </span>
      {onRemove && <TooltipButton type="button" className="ps-chip-x" aria-label="Remove link" tooltip="Remove link" onClick={onRemove}><I n="x" size={12} /></TooltipButton>}
    </span>
  );
}

export function CtxChip({ c, onRemove, onHot }: { c: Ctx; onRemove?: () => void; onHot?: (r: string | null) => void }) {
  const present = useIsPresent(), reduced = useReducedMotion();
  return (
    <motion.span layout className="ps-ctx" inert={!present} aria-hidden={present?undefined:true}
      initial={{ opacity: 0, scale: reduced?1:0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: reduced?1:0.8, transition: { duration: 0.15 } }}
      transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
      onPointerEnter={() => onHot?.(c.region)} onPointerLeave={() => onHot?.(null)}>
      <I n={c.kind} size={13} />
      <span className="ps-ctx-label" title={`The agent sees ${c.label}`}>{c.label}</span>
      {onRemove && <TooltipButton type="button" className="ps-chip-x" aria-label={`Stop sharing ${c.label}`} tooltip="Remove" onClick={onRemove}><I n="x" size={12} /></TooltipButton>}
    </motion.span>
  );
}

/** What the agent sees: pills floating above the composer, lined up with the input's left edge. */
export function CtxRow({ s, api }: { s: DumpState; api: DumpApi }) {
  const row = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const floating = row.current?.closest<HTMLElement>(".ps-ctxfloat");
    const panel = row.current?.closest<HTMLElement>(".ps-panel");
    if (!floating || !panel) return;
    const measure = () => panel.style.setProperty("--ps-context-height", `${floating.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(floating); measure();
    return () => { observer.disconnect(); panel.style.removeProperty("--ps-context-height"); };
  }, []);
  return (
    <div ref={row} className="ps-ctxrow">
      <AnimatePresence mode="popLayout" initial={false}>
        {s.ctx.map(c => <CtxChip key={c.id} c={c} onRemove={() => api.removeCtx(c.id)} onHot={api.setHot} />)}
        <IconTooltip key="add" label={s.picking ? "Stop picking (Esc)" : "Add something on screen"}><motion.button layout type="button" className="ps-add" data-on={s.picking ? "" : undefined} data-target="add-ctx"
          aria-label={s.picking ? "Stop picking" : "Add something on screen"}
          onClick={() => api.setPicking(!s.picking)} transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}>
          <SwapIcon k={s.picking ? "on" : "off"}><I n="crosshair" size={14} weight={s.picking ? "fill" : "regular"} /></SwapIcon>
        </motion.button></IconTooltip>
      </AnimatePresence>
    </div>
  );
}

/* ── Conversation ── */
/** Choices used inside the panel (open alternatives are shown on the jig's revisions section). */
export const CHOSEN = { att: "fanX" as AttStyle };

/* Link preview art: abstract, per site; never a fake logo. */
export function Og({ host, w, h }: { host: string; w: number; h: number }) {
  return (
    <span className="ps-og" data-host={host === "x.com" ? "x" : host === "news.ycombinator.com" ? "hn" : "web"} style={{ width: w, height: h }} aria-hidden>
      <i /><i /><i />
    </span>
  );
}

export type AttStyle = "cards" | "fan" | "fanX" | "tiles";
/** Plausible per-site art: an X post shows its author, HN its orange tile, arXiv a first page, an article its hero with the favicon badged on. */
export function SiteArt({ a, w, h }: { a: Att; w: number; h: number }) {
  if(a.object)return <span className="ps-art" style={{width:w,height:h,display:"grid",placeItems:"center"}}><I n={a.object.kind} size={22}/></span>;
  if(a.kind==="image"&&a.url)return <img src={a.url} alt="" style={{width:w,height:h,objectFit:"cover",borderRadius:SURFACE_RADII.media}}/>;
  const site = a.host === "x.com" ? "x" : a.host === "news.ycombinator.com" ? "hn" : a.host === "arxiv.org" ? "arxiv" : "web";
  return (
    <span className="ps-art" data-site={site} style={{ width: w, height: h }} aria-hidden>
      {site === "x" && <><span className="ps-art-avatar" /><i /><i /><i /></>}
      {site === "hn" && <><b>Y</b><i /><i /></>}
      {site === "arxiv" && <span className="ps-art-page"><b /><i /><i /><span className="ps-art-abs" /><span className="ps-art-cols"><i /><i /><i /><i /></span></span>}
      {site === "web" && <><span className="ps-art-sky" /><span className="ps-art-hill" /><span className="ps-art-badge"><Favicon host={a.host} size={12} /></span></>}
    </span>
  );
}
function LinkCard({ a, small }: { a: Att; small?: boolean }) {
  const x = a.host === "x.com";
  return (
    <span className="ps-lcard" data-small={small ? "" : undefined} title={a.title}>
      <SiteArt a={a} w={small ? 40 : 44} h={small ? 40 : 44} />
      <span className="ps-lcard-text">
        <span className="ps-lcard-title">{a.title ?? a.host}</span>
        <span className="ps-lcard-host"><Favicon host={a.host} size={12} /><span className="ps-ell">{x ? a.by ?? a.host : a.host.replace(/^news\./, "")}</span></span>
      </span>
    </span>
  );
}
function Tile({ a }: { a: Att }) {
  return (
    <span className="ps-tile" title={a.title}>
      <SiteArt a={a} w={112} h={52} />
      <span className="ps-tile-title">{a.title ?? a.host}</span>
      <span className="ps-tile-host"><Favicon host={a.host} size={12} />{a.host === "x.com" ? a.by ?? a.host : a.host.replace(/^news\./, "")}</span>
    </span>
  );
}
/** Attachments on a sent dump, in one of three styles. */
export function AttGroup({ atts, voice, style }: { atts: Att[]; voice?: number; style: AttStyle }) {
  const [open, setOpen] = useState(false);
  const [room, setRoom] = useState(520);
  const fanRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const p = fanRef.current?.parentElement;
    if (!p) return;
    const measure = () => { const cs = getComputedStyle(p); setRoom(p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)); };
    const ro = new ResizeObserver(measure);
    ro.observe(p); measure();
    return () => ro.disconnect();
  }, [style]);
  if (style === "tiles") return (
    <div className="ps-tiles">
      {voice != null && <span className="ps-tile ps-tile-voice"><NoteWave bars={22} height={26} /><span className="ps-tile-title"><I n="mic" size={12} /><span className="ap-num">{mmss(voice)}</span></span></span>}
      {atts.map(a => <Tile key={a.id} a={a} />)}
    </div>
  );
  if (style === "cards") return <div className="ps-lcards">{atts.map(a => <LinkCard key={a.id} a={a} />)}</div>;
  // fan: a small stack that spreads into a column (fan) or a row (fanX) on hover or focus
  const n = atts.length, across = style === "fanX", cw = across ? 168 : 264;
  // Across: cards sit side by side when there is room, and overlap when the column is narrow.
  const step = across ? Math.max(48, Math.min(174, (room - cw) / Math.max(1, n - 1))) : 70;
  const spring = (i: number) => ({ type: "spring" as const, stiffness: 200, damping: 26, delay: open ? i * 0.05 : (n - 1 - i) * 0.03 });
  return (
    <div ref={fanRef} className="ps-fan" data-across={across ? "" : undefined}
      style={across ? { height: 64 + (open ? 0 : (n - 1) * 6), width: open ? cw + (n - 1) * step : cw } : { height: open ? n * step - 6 : 64 + (n - 1) * 6, width: cw }} tabIndex={n > 1 ? 0 : undefined}
      aria-label={`${n} ${n === 1 ? "link" : "links"}`} onPointerEnter={() => setOpen(true)} onPointerLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
      {atts.map((a, i) => (
        <motion.span key={a.id} className="ps-fan-card" style={{ zIndex: n - i }} initial={false}
          animate={open ? { x: across ? -i * step : 0, y: across ? 0 : i * step, rotate: 0, scale: 1 } : { x: 0, y: i * 6, rotate: i === 0 ? 0 : i % 2 ? 2.5 : -2.5, scale: 1 - i * 0.04 }}
          transition={spring(i)}>
          <LinkCard a={a} small={across} />
        </motion.span>
      ))}
      {n > 1 && <motion.span className="ps-fan-n ap-num" animate={{ opacity: open ? 0 : 1, scale: open ? 0.6 : 1 }} transition={{ duration: 0.2 }}>{n}</motion.span>}
    </div>
  );
}

/** "Filed into a theme": theme glyph, name, count badge; click to see which signals. */
export function FiledToken({ f }: { f: Filed }) {
  const [open, setOpen] = useState(false);
  const label = `${f.n} ${f.n === 1 ? "signal" : "signals"} filed in ${f.theme}`;
  return (
    <div className="ps-filed-wrap">
      <button type="button" className="ps-filed" aria-expanded={open} title={label} aria-label={label} onClick={() => setOpen(o => !o)}>
        <I n="theme" size={13} />
        <span className="ps-filed-name">{f.theme}</span>
        <span className="ps-filed-n ap-num">{f.n}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && f.gists && (
          <motion.ul className="ps-gists" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
            {f.gists.map(g => <li key={g}><I n="signal" size={13} />{g}</li>)}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A draft or suggestion: dashed means not yet yours. Actions straddle the card's top edge; accepting solidifies it in place. */
export function DraftView({ d, onDecide, target }: { d: Draft; onDecide: (s: "accepted" | "discarded") => void; target?: boolean }) {
  const pending = d.state === "pending";
  const accept = <IconBtn n="check" label="Accept (A)" onClick={() => onDecide("accepted")} target={target ? "accept" : undefined} />;
  const discard = <IconBtn n="x" label="Discard (X)" onClick={() => onDecide("discarded")} />;
  const meta = (
    <span className="ps-draft-meta">
      <span className="ps-draft-joins" title={d.kind === "theory" ? `Would join ${d.joins}` : `Revises ${d.joins}`}><I n={d.kind === "theory" ? "theme" : "edit"} size={12} />{d.joins}</span>
      {d.ev && <span className="ap-num ps-draft-ev" title={`${d.ev[0]} support, ${d.ev[1]} undermine`}>+{d.ev[0]} <span className="ap-muted">−{d.ev[1]}</span></span>}
      {d.state === "accepted" && <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}><Conf n={null} /></motion.span>}
    </span>
  );
  return (
    <AnimatePresence initial={false}>
      {d.state !== "discarded" && (
        <motion.div className="ps-draft" data-state={d.state}
          exit={{ opacity: 0, height: 0, scale: 0.97, transition: { opacity: { duration: 0.12 }, height: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } } }}>
          <motion.div className="ps-draft-in" initial={false}
            animate={d.state === "accepted" ? { scale: [1, 1.025, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }}
            transition={{ duration: 0.45, times: [0, 0.35, 1], ease: "easeOut" }}>
            <span className="ps-draft-dash" aria-hidden />
            <span className="ps-draft-claim">{d.claim}</span>
            {meta}
            <AnimatePresence initial={false}>
              {pending && <motion.span className="ps-draft-edge" initial={false} exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.15 } }}>{accept}{discard}</motion.span>}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function MeMsg({ m, att = CHOSEN.att }: { m: Extract<Msg, { who: "me" }>; att?: AttStyle }) {
  return (
    <motion.div className="ps-me" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", duration: 0.45, bounce: 0.1 }}>
      {m.voice != null
        ? <VoicePlayback atts={m.atts} seconds={m.voice}/>
        : m.text && <div className="ps-bubble">{m.text}</div>}
      {m.voice != null && m.text && <div className="ps-transcript">{m.text}</div>}
      {m.atts.some(attachment=>attachment.kind!=="audio") && <AttGroup atts={m.atts.filter(attachment=>attachment.kind!=="audio")} style={att} />}
      <span className="ps-time ap-num" title="Saved as a dump">{m.time}</span>
    </motion.div>
  );
}

export function AgentMsg({ m, api, last }: { m: Extract<Msg, { who: "agent" }>; api: DumpApi; last: boolean }) {
  return (
    <div className="ps-agent">
      <AnimatePresence initial={false} mode="popLayout">
        {m.thinking
          ? <motion.span key="think" className="ps-think" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-label="Working" title="Working"><Spinner /></motion.span>
          : (
            <motion.div key="done" className="ps-agent-body" initial="h" animate="v" variants={{ v: { transition: { staggerChildren: 0.07 } } }}>
              {m.parts && <ToolParts parts={m.parts}/>}
              {m.say && <motion.p className="ps-say" variants={ITEM}><AssistantText text={m.say}/></motion.p>}
              {m.filed.length > 0 && <motion.div className="ps-filed-row" variants={ITEM}>{m.filed.map(f => <FiledToken key={f.theme} f={f} />)}</motion.div>}
              {m.draft && <motion.div variants={ITEM}><DraftView d={m.draft} onDecide={st => api.decide(m.id, st)} target={last} /></motion.div>}
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
const ITEM = { h: { opacity: 0, y: 6 }, v: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } } };

export function Thread({ s, api, grow }: { s: DumpState; api: DumpApi; grow?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const lastId = [...s.thread].reverse().find(m => m.who === "agent")?.id;
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [s.thread]);
  return (
    <div ref={ref} className="ps-thread" data-grow={grow ? "" : undefined}>
      {s.thread.map(m => (m.who === "me" ? <MeMsg key={m.id} m={m} /> : <AgentMsg key={m.id} m={m} api={api} last={m.id === lastId} />))}
    </div>
  );
}

/* ── Composer ── */
export const isAsk = (t: string) => t.includes("?");
export function SendBtn({ text, ready, onSend, size = 32 }: { text: string; ready: boolean; onSend: () => void; size?: number }) {
  const ask = isAsk(text);
  return (
    <TooltipButton type="button" className="ps-send" style={{ width: size, height: size }} data-ready={ready ? "" : undefined} data-ask={ask ? "" : undefined} disabled={!ready}
      aria-label={ask ? "Ask (Return)" : "Dump (Return)"} tooltip={ask ? "Ask (Return)" : "Dump (Return)"} onClick={onSend} data-target="send">
      <SwapIcon k={ask ? "ask" : "send"}><I n={ask ? "questionMark" : "send"} weight="bold" /></SwapIcon>
    </TooltipButton>
  );
}

export function Recorder({ s, api, onStop, time }: { s: DumpState; api: DumpApi; onStop: () => void; time?: string }) {
  const now = useNow(s.rec != null && !time);
  return (
    <div className="ps-rec">
      <IconBtn n="x" label="Discard recording" onClick={api.cancelRec} />
      <LiveWave bars={40} height={20} />
      <span className="ps-rec-time ap-num">{time ?? mmss(s.rec ? (now - s.rec) / 1000 : 0)}</span>
      <TooltipButton type="button" className="ps-stop" aria-label="Stop and dump" tooltip="Stop and dump" onClick={onStop}><StopGlyph /></TooltipButton>
    </div>
  );
}

export function Composer({ s, api, screen, inputRef, big, sees = true }: { s: DumpState; api: DumpApi; screen: string; inputRef?: RefObject<HTMLTextAreaElement | null>; big?: boolean; sees?: boolean }) {
  const ready = !!s.text.trim() || s.atts.length > 0;
  const onPaste = (e: React.ClipboardEvent) => {
    const files=[...e.clipboardData.files]; if(files.length){e.preventDefault();api.attachFiles(files);return;}
    const t = e.clipboardData.getData("text").trim();
    if (/^https?:\/\/\S+$/.test(t)) { e.preventDefault(); api.addLink(t); }
  };
  const onChange = (v: string) => {
    const m = v.match(/(^|\s)(https?:\/\/\S+)\s$/);
    if (m) { api.addLink(m[2]); api.setText(v.slice(0, m.index! + m[1].length)); return; }
    api.setText(v);
  };
  void screen;
  const addCtx = (
    <IconBtn n="crosshair" label={s.picking ? "Stop picking (Esc)" : "Add something on screen"} onClick={() => api.setPicking(!s.picking)} pressed={s.picking} target="add-ctx" />
  );
  return (
    <div className="ps-composer" data-big={big ? "" : undefined}>
      <AnimatePresence initial={false}>
        {sees && s.ctx.length > 0 && (
          <motion.div key="float" className="ps-ctxfloat" initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}>
            <CtxRow s={s} api={api} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {s.atts.length > 0 && (
          <motion.div className="ps-atts" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
            <div className="ps-atts-in">
              <AnimatePresence initial={false} mode="popLayout">
                {s.atts.map(a => (
                  <motion.span layout key={a.id} initial={{ opacity: 0, scale: 0.85, filter: "blur(4px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.85 }} transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}>
                    <LinkChip a={a} onRemove={() => api.removeAtt(a.id)} />
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {s.rec != null
        ? <Recorder s={s} api={api} onStop={api.stopRec} />
        : (
          <div className="ps-inputrow">
            <textarea ref={inputRef} className="ps-input" rows={1} value={s.text} data-target="input" aria-label="Dump or ask"
              placeholder="Dump anything, or ask"
              onPaste={onPaste} onChange={e => onChange(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); api.send(); } }} />
            {sees && s.ctx.length === 0 && addCtx}
            <IconBtn n="plus" label="Attach" className="ps-composer-action" onClick={api.addImage} />
            <IconBtn n="mic" label="Record a voice note" className="ps-composer-action" onClick={api.startRec} target="composer-mic" />
            <SendBtn text={s.text} ready={ready} onSend={api.send} />
          </div>
        )}
    </div>
  );
}

/* ── Backdrops ── */
export const SIDEBAR = 232;
/** Shared drag payload for HTML drag-and-drop (dataTransfer can't be read during dragover). */
export const dragPayload: { att: Att | null } = { att: null };

/* ── The stage: backdrop, pill, panel, toast ── */
/** B2: desktop, the pill in the bottom-right corner with a column growing up out of it. P: phone. */
export type Variant = "B2" | "P";
export type Force = { approach?: boolean; hover?: boolean; pressed?: boolean; focus?: boolean; midflight?: boolean; time?: string; noScreen?: boolean };
const OPEN_T: Transition = { type: "spring", duration: 0.5, bounce: 0.12 };
const CLOSE_T: Transition = { type: "spring", duration: 0.38, bounce: 0 };
const SHADOW = {
  pill: "0px 0px 0px 0.5px rgba(0, 0, 0, 0.1), 0px 4px 14px 0px rgba(0, 0, 0, 0.1)",
  lift: "0px 0px 0px 0.5px rgba(0, 0, 0, 0.1), 0px 6px 18px 0px rgba(0, 0, 0, 0.12)",
  sheet: "0px 0px 0px 0.5px rgba(0, 0, 0, 0.1), 0px 8px 24px 0px rgba(0, 0, 0, 0.14)",
};
let activeStage: string | null = null;
/** Whether the last input was the keyboard, so closing by key hands focus back to the pill (and by pointer doesn't). */
let keyInput = false;
if (typeof window !== "undefined") {
  window.addEventListener("keydown", () => { keyInput = true; }, true);
  window.addEventListener("pointerdown", () => { keyInput = false; }, true);
}
/** Width reserved for the desktop B2 column at its host's right edge. */
export const DOCK_W = 372;

/** One thing the agent sees: shown as a context chip, and the first one names the closed pill. */
export type Sees = { label: string; kind: Ctx["kind"]; id?: string; region?: string };

/** One Esc step inside the surface: stop picking, then discard a take, then close. Returns false when there was nothing to do. */
export function escapeDump(s: DumpState, api: DumpApi) {
  if (s.picking) api.setPicking(false);
  else if (s.rec != null) api.cancelRec();
  else if (s.open) api.close();
  else return false;
  return true;
}

/**
 * Dump or ask: the pill (with its mic) and the panel it grows into, plus its toast, drop target, highlight and pick-from-screen.
 * Embed it inside any positioned host frame; the host owns the state (useDump) and decides what the agent sees.
 *
 * - `frameRef`: the host frame. The surface listens on it for approach, click-away and picking, and outlines `[data-region]` inside it.
 * - `sees`: what is on screen, first = primary (it names the closed pill). Synced into the context chips unless `syncSees` is false;
 *   chips the user picked with the crosshair are kept. Anything in the host marked `data-pick` (+ `data-label`, `data-kind`) can be picked.
 * - `keys`: handle ⌘J and Esc itself (default). Hosts with their own Esc stack pass false and call `escapeDump`.
 * - `closeOnClickAway`: close when the host is clicked outside the panel (default). A docked host passes false.
 * - `onDecide`: a draft in the conversation was accepted or discarded.
 * - `log`: adds the dump-log segment at the pill's left end (history glyph, a dot while a dump is processing or failed)
 *   and a slot that grows the log panel up out of it. The host owns open/close and Esc.
 * - `corner`: sit in the bottom-right corner on any variant (the phone pill in the app).
 */
export function DumpOrAsk({ variant = "B2", s, api, w, h, cx: cxProp, centred, force = {}, frameRef, live = true, sees, syncSees = true, keys = true, closeOnClickAway = true, thumb, onDecide, log, corner: cornerProp }: {
  variant?: Variant; s: DumpState; api: DumpApi; w: number; h: number; cx?: number; centred?: boolean; force?: Force;
  frameRef: RefObject<HTMLDivElement | null>; live?: boolean; sees: Sees[]; syncSees?: boolean; keys?: boolean; closeOnClickAway?: boolean;
  thumb?: ReactNode; onDecide?: (d: Draft, state: "accepted" | "discarded") => void;
  log?: { open: boolean; onToggle: () => void; panel: ReactNode; status?: "processing" | "failed" };
  corner?: boolean;
}) {
  const reduced = !!useReducedMotion();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hitRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [pillW, setPillW] = useState(variant === "P" ? 206 : 210);
  const [panelH, setPanelH] = useState(320);
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [approach, setApproach] = useState(false);
  const [focus, setFocus] = useState(false);
  const [pickHover, setPickHover] = useState<string | null>(null);
  const primary = sees[0];
  const screen = primary?.label ?? "";

  // What is on screen becomes the context chips; picked chips stay.
  const seesKey = JSON.stringify(sees);
  useEffect(() => {
    if (!syncSees) return;
    const auto: Ctx[] = sees.map(x => ({ id: `c-auto-${x.kind}-${x.id ?? x.label}`, label: x.label, kind: x.kind, objectId:x.id, region: x.region ?? x.id ?? "main", auto: true }));
    api.set(p => ({ ctx: [...auto, ...p.ctx.filter(c => !c.auto)] }));
  }, [seesKey, syncSees]);

  // Tell the host about decisions on drafts.
  const decided = useRef(new Set<string>());
  useEffect(() => {
    if (!onDecide) return;
    s.thread.forEach(m => {
      if (m.who !== "agent" || !m.draft || m.draft.state === "pending" || decided.current.has(m.id)) return;
      decided.current.add(m.id);
      onDecide(m.draft, m.draft.state);
    });
  }, [s.thread]);

  const phone = variant === "P";
  const cx = cxProp ?? (phone ? w / 2 : SIDEBAR + (w - SIDEBAR) / 2);
  const ph = phone ? 44 : 40, micW = ph, bottom = 12;
  const corner = (variant === "B2" && !centred) || !!cornerProp, docked = variant === "B2";
  const ap = force.approach ?? approach, hv = force.hover ?? hover, pr = force.pressed ?? pressed, fc = force.focus ?? focus;
  void ap;
  const voiceSheet = phone && !s.open && s.rec != null;
  // The closed pill contains the capture label and microphone. The dump log opens separately.
  const closedW = pillW + micW;
  const closedLeft = corner ? w - 12 - closedW : cx - closedW / 2;
  const pillBottom = bottom;
  const pillCx = closedLeft + closedW / 2;
  const maxH = h - (phone ? 70 : 48);

  let box: { left: number; bottom: number; width: number; height: number; r: number };
  let panelW = 600;
  if (s.open) {
    if (docked) {
      panelW = DOCK_W - 12;
      box = { left: w - DOCK_W, bottom: 12, width: panelW, height: h - 24, r: 14 };
    }
    else { panelW = w - 16; box = { left: 8, bottom: 8, width: w - 16, height: Math.min(panelH, maxH), r: 40 }; }
  } else if (voiceSheet) {
    panelW = w - 16; box = { left: 8, bottom: 8, width: w - 16, height: 252, r: 40 };
  } else box = { left: closedLeft, bottom: pillBottom, width: closedW, height: ph, r: ph / 2 };

  // Panel height follows its content.
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPanelH(el.offsetHeight));
    ro.observe(el);
    setPanelH(el.offsetHeight);
    return () => ro.disconnect();
  }, [s.open]);

  // Focus the input once the panel has room; give focus back to the pill when it closes.
  const wasOpen = useRef(s.open);
  useEffect(() => {
    if (!live) return;
    if (s.open && !wasOpen.current) window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 60);
    if (!s.open && wasOpen.current && keyInput && frameRef.current?.contains(document.activeElement)) {
      (document.activeElement as HTMLElement).blur(); window.setTimeout(() => hitRef.current?.focus({ preventScroll: true }), 400);
    }
    wasOpen.current = s.open;
  }, [s.open, live]);

  // Removing a chip immediately removes its preview, even while the departing chip is still animating.
  const region = s.picking ? pickHover : s.ctx.some(context => context.region === s.hot) ? s.hot : null;

  // ⌘J and Esc for whichever stage the pointer was last in.
  const sRef = useRef(s);
  sRef.current = s;
  useEffect(() => {
    if (!live || !keys) return;
    const onKey = (e: KeyboardEvent) => {
      if (activeStage !== id) return;
      const st = sRef.current;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") { e.preventDefault(); st.open ? api.close() : api.open(); }
      else if (e.key === "Escape") escapeDump(st, api);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [live, keys, id, api]);

  // Listen on the host frame: approach, click-away, picking.
  const opts = useRef({ closeOnClickAway, live, micW });
  opts.current = { closeOnClickAway, live, micW };
  useEffect(() => {
    const f = frameRef.current;
    if (!f) return;
    let swallow = false;
    const move = (e: PointerEvent) => {
      const st = sRef.current, t = e.target as Element;
      if (st.picking) {
        const pick = surfaceRef.current?.contains(t) ? null : t.closest<HTMLElement>("[data-pick]");
        setPickHover(pick?.dataset.pick ?? null);
        return;
      }
      if (!opts.current.live || st.open) return;
      const r = surfaceRef.current?.getBoundingClientRect();
      if (!r) return;
      const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right - opts.current.micW - 8), dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
      setApproach(Math.hypot(dx, dy) < 56);
    };
    const leave = () => { setApproach(false); setPickHover(null); };
    const enter = () => { activeStage = id; };
    const down = (e: PointerEvent) => {
      activeStage = id;
      const st = sRef.current, t = e.target as Element;
      if (st.picking) {
        const pick = surfaceRef.current?.contains(t) ? null : t.closest<HTMLElement>("[data-pick]");
        if (pick) {
          const kind = (["signal", "theme", "prototype"].includes(pick.dataset.kind ?? "") ? pick.dataset.kind : "theory") as Ctx["kind"];
          const label = pick.dataset.label!;
          api.addCtx({ id: `c-${pick.dataset.pick}`, label, kind, region: pick.dataset.pick! });
          setPickHover(null);
          swallow = true;
          e.preventDefault();
        } else if (!surfaceRef.current?.contains(t)) api.setPicking(false);
        return;
      }
      if (st.open && opts.current.closeOnClickAway && !surfaceRef.current?.contains(t)) api.close();
    };
    // A pick never also clicks the thing picked.
    const click = (e: MouseEvent) => { if (swallow) { swallow = false; e.stopPropagation(); e.preventDefault(); } };
    f.addEventListener("pointermove", move);
    f.addEventListener("pointerleave", leave);
    f.addEventListener("pointerenter", enter);
    f.addEventListener("focusin", enter);
    f.addEventListener("pointerdown", down, true);
    f.addEventListener("click", click, true);
    return () => {
      f.removeEventListener("pointermove", move); f.removeEventListener("pointerleave", leave); f.removeEventListener("pointerenter", enter);
      f.removeEventListener("focusin", enter); f.removeEventListener("pointerdown", down, true); f.removeEventListener("click", click, true);
    };
  }, [frameRef, id, api]);

  // Drag and drop onto the pill (or the open panel, where it becomes an attachment).
  const depth = useRef(0);
  const dnd = {
    onDragEnter: (e: React.DragEvent) => { e.preventDefault(); depth.current++; if (!s.drag) api.setDrag(currentObjectDrag()?{id:nid("a"),kind:"object",object:currentObjectDrag(),host:currentObjectDrag()!.label,title:currentObjectDrag()!.label}:dragPayload.att ?? { id: nid("a"), kind: e.dataTransfer.types.includes("Files") ? "image" : "link", host: e.dataTransfer.types.includes("Files") ? "file.png" : "link" }); },
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDragLeave: () => { depth.current = Math.max(0, depth.current - 1); if (depth.current === 0) api.setDrag(null); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      depth.current = 0;
      const object=readObjectDrag(e.dataTransfer);
      const file=e.dataTransfer.files[0];
      const url=e.dataTransfer.getData("text/uri-list")||e.dataTransfer.getData("text/plain");
      const att:Att|null = object?{id:nid("a"),kind:"object",object,host:object.label,title:object.label}:file ? {id:nid("a"),kind:file.type.startsWith("image/")?"image":"file",host:file.name,title:file.name,file,url:URL.createObjectURL(file)} : url ? {id:nid("a"),kind:"link",host:hostOf(url),url,title:url} : dragPayload.att;
      if (!att) return;
      if (s.open) { api.setDrag(null); api.set(p => ({ atts: [...p.atts, att] })); }
      else api.dumpDirect(att);
    },
  };

  const lifted = !s.open && !s.rec && !s.drag && hv;
  const scale = !s.open && pr ? 0.96 : !s.open && s.drag ? 1.06 : 1;
  const recClosed = !s.open && s.rec != null && !phone;

  return (
    <>
      <ContextHighlight frameRef={frameRef} chatRef={surfaceRef} region={region} />

      {/* Dump log: tier 3, grows up out of the pill's log segment and sinks back into it */}
      {log && (() => {
        const lw = Math.min(360, w - 16), right = w - (closedLeft + closedW), lb = pillBottom + ph + 10;
        const lh = Math.min(480, h - lb - (phone ? 56 : 12));
        return (
          <div className="ps-log-slot" style={{ right, bottom: lb, width: lw, height: lh, pointerEvents: log.open && !s.open ? undefined : "none" }}>
            <AnimatePresence>
              {log.open && !s.open && (
                <motion.div key="log" className="ps-log" style={{ transformOrigin: `${closedLeft + 18 - (closedLeft + closedW - lw)}px calc(100% + ${ph / 2 + 10}px)` }}
                  initial={{ opacity: 0, scale: reduced ? 1 : 0.6, y: reduced ? 0 : 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: reduced ? 1 : 0.6, y: reduced ? 0 : 10, transition: reduced ? { duration: 0 } : CLOSE_T }}
                  transition={reduced ? { duration: 0 } : { ...OPEN_T, opacity: { duration: 0.16 } }}>
                  {log.panel}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })()}

      {/* Toast: tier 6, rises from the pill and sinks back into it */}
      <div className="ps-toast-slot" style={{ left: Math.min(pillCx - 200, w - 412), bottom: pillBottom + ph + 10, justifyContent: corner ? "flex-end" : "center" }}>
        <AnimatePresence>
          {s.toast && !s.open && (
            <motion.div key={s.toast.id} className="ps-toast" role="status" style={{ transformOrigin: "50% 100%" }} initial={{ opacity: 0, y: 16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.9, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
              transition={{ type: "spring", duration: 0.45, bounce: 0.2 }}
              onPointerEnter={() => api.holdToast(true)} onPointerLeave={() => api.holdToast(false)} onFocusCapture={()=>api.holdToast(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))api.holdToast(false);}}>
              {s.toast.parts.map((p, i) => (
                <motion.span key={p.icon} className="ps-toast-part" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.07, duration: 0.25 }}>
                  <I n={p.icon} size={14} /><b className="ap-num">{p.n}</b>{" "}{p.n === 1 ? p.one : p.many}
                </motion.span>
              ))}
              <button type="button" className="ps-toast-undo" onClick={api.undo} title="Undo (⌘Z)" data-target="undo">Undo</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* What the agent sees: a thumbnail after a deliberate hover on the screen name */}
      <AnimatePresence>
        {thumb && s.hot === "main" && !s.open && !s.toast && !phone && (
          <motion.div key="thumb" className="ps-seethumb" role="img" aria-label={`The agent sees ${screen}`} style={{ left: Math.min(pillCx - 124, w - 260), bottom: pillBottom + ph + 10 }}
            initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: live ? 0.35 : 0, type: "spring", duration: 0.3, bounce: 0 } }} exit={{ opacity: 0, y: 4, transition: { duration: 0.12 } }}>
            <div className="ps-seethumb-in" aria-hidden>{thumb}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Something travelling into the pill */}
      <AnimatePresence>
        {s.incoming && (
          <motion.div key={s.incoming.id} className="ps-incoming" style={{ left: closedLeft + 14, bottom: pillBottom + ph / 2 - 13 }}
            initial={{ y: -64, x: 40, scale: 1, opacity: 0 }}
            animate={force.midflight ? { y: -30, x: 18, scale: 0.8, opacity: 1 } : { y: 0, x: 0, scale: 0.3, opacity: [0, 1, 1, 0] }}
            transition={force.midflight ? { duration: 0 } : { duration: 0.46, ease: [0.5, 0, 0.75, 0], opacity: { times: [0, 0.15, 0.8, 1], duration: 0.46 } }}>
            <LinkChip a={s.incoming} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* The surface: pill when closed, panel when open */}
      <motion.div ref={surfaceRef} className="ps-surface" data-variant={variant} data-open={s.open || voiceSheet ? "" : undefined} data-focus={fc && !s.open ? "" : undefined} data-drag={s.drag && !s.open ? "" : undefined}
        initial={false}
        animate={{ left: box.left, bottom: box.bottom, width: box.width, height: box.height, borderRadius: box.r, y: lifted ? -1 : 0, scale, boxShadow: s.open || voiceSheet ? SHADOW.sheet : lifted || s.drag ? SHADOW.lift : SHADOW.pill }}
        transition={reduced ? { duration: 0 } : { default: s.open || voiceSheet ? OPEN_T : CLOSE_T, y: { duration: 0.15, ease: "easeOut" }, scale: { type: "spring", duration: 0.3, bounce: s.drag ? 0.35 : 0 }, boxShadow: { duration: 0.2 } }}
        style={{ transformOrigin: corner ? "100% 100%" : "50% 100%" }}
        {...dnd}>
        {s.drag && <div className="ps-dropcatch" />}
        <AnimatePresence initial={false}>
          {!s.open && !voiceSheet && (
            <motion.div key="pill" className="ps-pill-layer" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: reduced ? 0 : 0.14, duration: 0.18 } }} exit={{ opacity: 0, transition: { duration: 0.08 } }}>
              <PillRows s={s} api={api} recClosed={recClosed} restWidth={250 - micW} onWidth={setPillW} hitRef={hitRef} time={force.time}
                onHover={setHover} onPress={setPressed} onFocus={setFocus} />
              <TooltipButton type="button" className="ps-micseg" data-rec={recClosed ? "" : undefined} data-phone={phone ? "" : undefined} data-target="mic" style={{ width: micW }}
                aria-label={recClosed ? "Stop and dump" : "Voice dump"} tooltip={recClosed ? "Stop and dump" : "Voice dump"}
                onClick={() => (recClosed ? api.stopRec() : api.startRec())}>
                <span className="ps-micseg-in"><SwapIcon k={recClosed ? "stop" : "mic"}>{recClosed ? <StopGlyph /> : <I n="mic" size={phone ? 18 : 16} />}</SwapIcon></span>
              </TooltipButton>
            </motion.div>
          )}
          {s.open && (
            <motion.div key="panel" className="ps-panel-layer" style={{ width: panelW }} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: reduced ? 0 : 0.07, duration: 0.22 } }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
              <div ref={panelRef} className="ps-panel" data-variant={variant} style={{ maxHeight: docked ? undefined : maxH, height: docked ? h - 24 : undefined }}>
                <TooltipButton type="button" className="ps-grab" aria-label="Close (Esc)" tooltip="Close (Esc)" onClick={api.close} data-target="close"><i /></TooltipButton>
                <Thread s={s} api={api} grow={docked} />
                <Composer s={s} api={api} screen={phone ? "phone" : screen} inputRef={inputRef} big={phone} />
              </div>
            </motion.div>
          )}
          {voiceSheet && (
            <motion.div key="voice" className="ps-panel-layer" style={{ width: panelW }} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.2 } }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
              <VoiceSheet s={s} api={api} time={force.time} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

function PillRows({ s, api, recClosed, restWidth, onWidth, hitRef, onHover, onPress, onFocus, time }: {
  s: DumpState; api: DumpApi; recClosed: boolean; restWidth: number; onWidth: (w: number) => void;
  hitRef: RefObject<HTMLButtonElement | null>; onHover: (b: boolean) => void; onPress: (b: boolean) => void; onFocus: (b: boolean) => void; time?: string;
}) {
  const mode = recClosed ? "rec" : s.drag ? "drag" : "rest";
  const now = useNow(mode === "rec" && !time);
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <PillRow key={mode} mode={mode} width={mode === "rest" ? restWidth : undefined} onWidth={onWidth}>
        {mode === "rest" && (
          <button ref={hitRef} type="button" className="ps-pill" data-target="pill" aria-label="Dump or ask (⌘J)" title="Dump or ask (⌘J)"
            onClick={api.open} onPointerEnter={() => onHover(true)} onPointerLeave={() => { onHover(false); onPress(false); }}
            onPointerDown={() => onPress(true)} onPointerUp={() => onPress(false)} onFocus={e => onFocus(e.currentTarget.matches(":focus-visible"))} onBlur={() => onFocus(false)}>
            <SwapIcon k={s.busy ? "busy" : "idle"}>{s.busy ? <Spinner size={16} /> : <I n="dump" />}</SwapIcon>
            <span className="ps-pill-label">Dump or ask</span>
          </button>
        )}
        {mode === "drag" && s.drag && (
          <div className="ps-pill ps-pill-drop" data-target="pill">
            <span className="ps-drop-plus"><I n="plus" size={12} /></span>
            {s.drag.title ? <><Favicon host={s.drag.host} /><span className="ps-drop-title">{s.drag.title}</span></> : <span className="ps-drop-title"><I n={s.drag.kind === "image" ? "image" : "link"} size={14} /></span>}
          </div>
        )}
        {mode === "rec" && (
          <div className="ps-pill ps-pill-rec">
            <IconBtn n="x" label="Discard (Esc)" onClick={api.cancelRec} size={28} />
            <LiveWave bars={30} height={18} />
            <span className="ps-rec-time ap-num">{time ?? mmss(s.rec ? (now - s.rec) / 1000 : 0)}</span>
          </div>
        )}
      </PillRow>
    </AnimatePresence>
  );
}

/** One closed-pill layout. Only the row that is present reports its width, so an exiting row can't shrink the pill. */
function PillRow({ mode, width, onWidth, children }: { mode: string; width?: number; onWidth: (w: number) => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const present = useIsPresent();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !present) return;
    const ro = new ResizeObserver(() => onWidth(el.offsetWidth));
    ro.observe(el);
    onWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, [present]);
  return (
    <motion.div ref={ref} className="ps-pill-row" data-mode={mode} style={width == null ? undefined : { width }}
      initial={{ opacity: 0, filter: "blur(3px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} exit={{ opacity: 0, filter: "blur(3px)" }} transition={{ duration: 0.18 }}>
      {children}
    </motion.div>
  );
}

function VoiceSheet({ s, api, time }: { s: DumpState; api: DumpApi; time?: string }) {
  const now = useNow(s.rec != null && !time, 200);
  const secs = time ? 7 : s.rec ? (now - s.rec) / 1000 : 0;
  const words = VOICE_WORDS.slice(0, Math.min(VOICE_WORDS.length, Math.floor(secs * 3.2) + 1));
  return (
    <div className="ps-vsheet">
      <p className="ps-transcript-live">
        <AnimatePresence initial={false}>
          {words.slice(-18).map((wd, i) => <motion.span key={`${words.length - Math.min(18, words.length) + i}`} initial={{ opacity: 0, filter: "blur(3px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} transition={{ duration: 0.3 }}>{wd} </motion.span>)}
        </AnimatePresence>
      </p>
      <LiveWave bars={46} height={36} />
      <div className="ps-vsheet-row">
        <IconBtn n="x" label="Discard" onClick={api.cancelRec} size={44} />
        <span className="ps-rec-time ap-num">{time ?? mmss(secs)}</span>
        <TooltipButton type="button" className="ps-stop ps-stop-big" aria-label="Stop and dump" tooltip="Stop and dump" onClick={api.stopRecInto} data-target="stop"><StopGlyph size={16} /></TooltipButton>
      </div>
    </div>
  );
}

/** Phone frame (390 × 844): screen, island, home indicator. */
