import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DUMPS, SIGNALS, THEMES, signal, theory } from "./data";
import { Icon, IconButton, Kbd, Mark, Balance, type IconName } from "./atoms";
import { useEdit } from "./edits";
import { Claim, ThemeName, useTripDecide, type OnOpen, type ObjKind } from "./panes";
import "./briefing-app.css";

/*
 * Briefing (d-briefing "lens"): since you last looked. An inbox of what the agents did while you were away, as a fifth
 * view in the app. One calm column, grouped by kind, each kind with its own small component:
 *
 *   Challenges   a tripwire hit on a theory: accept (lowers confidence one step) or dismiss. Shares the pane's decision.
 *   Drafts       theories, themes and prototypes the agents drafted: dashed until accepted.
 *   Suggestions  evidence for a theory, a revised claim, a merge of two themes.
 *   Merged       near-duplicate signals the agents merged on their own (d-near-dup "auto"): logged, one click to unmerge.
 *   New signals  by theme, folded to a count; unfold to read them.
 *
 * Keys while the Briefing has focus (not typing, not in the pane): J / K move, A accepts (or marks seen), X discards,
 * U unmerges, Enter or O opens the object in the shared pane. Settled items slide out to the right.
 */

const EASE = [0.16, 1, 0.3, 1] as const;
/** Exit: a short slide right, accelerating out. */
const EXIT = { opacity: 0, x: 40, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const } };
const LAYOUT = { duration: 0.35, ease: EASE };

type Item =
  | { id: string; kind: "challenge"; theory: string; hit: string }
  | { id: string; kind: "draft-theory"; theory: string }
  | { id: string; kind: "draft-theme"; name: string; from: number; gists: string[] }
  | { id: string; kind: "draft-prototype"; name: string; theory: string; note: string }
  | { id: string; kind: "evidence"; theory: string; signal: string }
  | { id: string; kind: "revision"; theory: string; text: string }
  | { id: string; kind: "merge-themes"; a: string; b: string; shared: number }
  | { id: string; kind: "near-dup"; gist: string; sources: [string, string]; theme: string }
  | { id: string; kind: "signals"; theme: string };

export const BRIEFING: Item[] = [
  { id: "b-ch", kind: "challenge", theory: "t3", hit: "s7" },
  { id: "b-dt", kind: "draft-theory", theory: "d1" },
  { id: "b-dm", kind: "draft-theme", name: "Agent payments", from: 4, gists: ["Startup sells agent hours instead of seats", "Card network pilots agent-initiated payments"] },
  { id: "b-dp", kind: "draft-prototype", name: "Diff-free review mode", theory: "d3", note: "Review a change by its stated intent and tests, not its diff" },
  { id: "b-ev", kind: "evidence", theory: "t2", signal: "s4" },
  { id: "b-rv", kind: "revision", theory: "t1", text: "Tokens become nearly free for routine work, not for frontier reasoning" },
  { id: "b-mt", kind: "merge-themes", a: "funding", b: "cost", shared: 3 },
  { id: "b-nd", kind: "near-dup", gist: "Lab cuts API prices again for its small model tier", sources: ["x.com", "theverge.com"], theme: "cost" },
  { id: "b-s1", kind: "signals", theme: "cost" },
  { id: "b-s2", kind: "signals", theme: "review" },
  { id: "b-s3", kind: "signals", theme: "memory" },
];

const GROUPS: { name: string; kinds: Item["kind"][] }[] = [
  { name: "Challenges", kinds: ["challenge"] },
  { name: "Drafts", kinds: ["draft-theory", "draft-theme", "draft-prototype"] },
  { name: "Suggestions", kinds: ["evidence", "revision", "merge-themes"] },
  { name: "Merged", kinds: ["near-dup"] },
  { name: "New signals", kinds: ["signals"] },
];

type Acts = { a?: () => void; x?: () => void; u?: () => void; open?: () => void };
export type BriefingHost = { open?: { kind: ObjKind; id: string }; onOpen: OnOpen; compact?: boolean; onLog?: () => void };

const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

export function BriefingView({ host, phone }: { host: BriefingHost; phone?: boolean }) {
  const [settled, setSettled] = useState<Record<string, true>>({});
  const items = BRIEFING.filter(it => !settled[it.id]);
  const [cursor, setCursor] = useState<string | undefined>(items[0]?.id);
  const acts = useRef(new Map<string, Acts>());
  const root = useRef<HTMLDivElement>(null);
  const settle = (id: string) => setSettled(m => ({ ...m, [id]: true }));
  // The cursor moves on to the next item when its item leaves.
  useEffect(() => {
    if (cursor && !settled[cursor]) return;
    const i = BRIEFING.findIndex(x => x.id === cursor);
    setCursor(BRIEFING.slice(i + 1).find(x => !settled[x.id])?.id ?? items.at(-1)?.id);
  }, [settled]);

  const live = useRef({ items, cursor });
  live.current = { items, cursor };
  useEffect(() => {
    if (phone) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || isTyping(e.target)) return;
      if (e.target instanceof Element && e.target.closest(".as-pane, .ps-surface, .dl")) return;
      const { items: xs, cursor: c } = live.current;
      const i = Math.max(0, xs.findIndex(x => x.id === c));
      const k = e.key.toLowerCase();
      const move = (d: number) => { const n = xs[Math.min(xs.length - 1, Math.max(0, i + d))]; if (!n) return; setCursor(n.id); root.current?.querySelector(`[data-bid="${n.id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }); };
      const a = c ? acts.current.get(c) : undefined;
      if (k === "j" || e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (k === "k" || e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (k === "a" && a?.a) { e.preventDefault(); a.a(); }
      else if (k === "x" && a?.x) { e.preventDefault(); a.x(); }
      else if (k === "u" && a?.u) { e.preventDefault(); a.u(); }
      else if ((k === "o" || e.key === "Enter") && a?.open && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); a.open(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phone]);

  const ctx = { host, settle, acts: acts.current };
  const left = items.length;
  return (
    <div className="ap br" ref={root} data-compact={host.compact ? "" : undefined} data-phone={phone ? "" : undefined}>
      <div className="br-scroll ap-scroll">
        <div className="br-col">
          <header className="br-head">
            <span className="ap-h">Since you last looked</span>
            <span className="ap-muted" title="Thursday 30 October, 22:40">Yesterday 22:40</span>
            <span className="br-left ap-muted ap-num" aria-live="polite">{left ? `${left} left` : "Done"}</span>
          </header>
          <Overnight onLog={host.onLog} />
          {GROUPS.map(g => {
            const xs = items.filter(it => g.kinds.includes(it.kind));
            return (
              <AnimatePresence key={g.name} initial={false}>
                {xs.length > 0 && (
                  <motion.section key="g" className="br-group" layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ layout: LAYOUT }}>
                    <motion.h3 layout="position" className="ap-label br-group-name" transition={{ layout: LAYOUT }}>{g.name}<span className="ap-num">{xs.length}</span></motion.h3>
                    <AnimatePresence initial={false} mode="popLayout">
                      {xs.map(it => (
                        <motion.div key={it.id} layout data-bid={it.id} className="br-item" data-cursor={it.id === cursor ? "" : undefined}
                          onPointerEnter={() => setCursor(it.id)} onFocus={() => setCursor(it.id)}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={EXIT} transition={{ layout: LAYOUT }}>
                          <Block it={it} ctx={ctx} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.section>
                )}
              </AnimatePresence>
            );
          })}
          <AnimatePresence>
            {left === 0 && (
              <motion.div className="br-clear" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}>
                <span className="br-clear-mark"><Icon name="check" size={16} /></span>
                <span className="ap-muted">All caught up</span>
              </motion.div>
            )}
          </AnimatePresence>
          {!phone && left > 0 && <div className="br-keys ap-muted" aria-hidden><Kbd>J</Kbd><Kbd>K</Kbd> move <Kbd>A</Kbd> accept <Kbd>X</Kbd> discard <Kbd>U</Kbd> unmerge <Kbd>O</Kbd> open</div>}
        </div>
      </div>
    </div>
  );
}

/** Overnight, as one line: dumps became signals and drafts. It opens the dump log. */
function Overnight({ onLog }: { onLog?: () => void }) {
  const dumps = DUMPS.filter(d => d.day === "Today" || d.day === "Yesterday");
  const signals = dumps.flatMap(d => d.produced).filter(p => p.startsWith("s")).length;
  const drafts = dumps.flatMap(d => d.produced).filter(p => p.startsWith("d")).length + 2;
  return (
    <button className="br-flow" onClick={onLog} title="Dump log (⌘⇧L)" aria-label={`${dumps.length} dumps became ${signals} signals and ${drafts} drafts. Open the dump log`}>
      <span className="ap-num">{dumps.length}</span><Icon name="dump" size={14} />
      <Icon name="arrowRight" size={12} />
      <span className="ap-num">{signals}</span><Icon name="signal" size={14} />
      <span className="ap-num">{drafts}</span><span className="br-flow-draft"><Icon name="theory" size={14} /></span>
    </button>
  );
}

type Ctx = { host: BriefingHost; settle: (id: string) => void; acts: Map<string, Acts> };

/** Register an item's keyboard actions for this render. */
function useActs(ctx: Ctx, id: string, a: Acts) { ctx.acts.set(id, a); useEffect(() => () => { ctx.acts.delete(id); }, [id]); }

/** Accept (labelled) and discard (icon), the same pair as a tripwire hit. */
function Decide({ accept = "Accept", onAccept, onDiscard, discard = "Discard" }: { accept?: string; onAccept: () => void; onDiscard?: () => void; discard?: string }) {
  return (
    <span className="br-acts">
      <button className="ap-btn" onClick={onAccept} title={`${accept} (A)`}>{accept}</button>
      {onDiscard && <IconButton icon="x" label={`${discard} (X)`} onClick={onDiscard} />}
    </span>
  );
}

/** One row: a kind glyph, a title that opens its object, the detail below, actions at the top right. */
function Row({ icon, iconTitle, title, onOpen, draft, acts, children, mark }: {
  icon: IconName; iconTitle: string; title: ReactNode; onOpen?: () => void; draft?: boolean; acts: ReactNode; children?: ReactNode; mark?: ReactNode;
}) {
  return (
    <div className="br-row" data-draft={draft ? "" : undefined}>
      <span className="br-glyph" title={iconTitle} aria-label={iconTitle}><Icon name={icon} size={14} /></span>
      <div className="br-main">
        <div className="br-title">
          {mark}
          {onOpen ? <button className="br-open" onClick={onOpen}>{title}</button> : <span className="br-static">{title}</span>}
        </div>
        {children && <div className="br-detail">{children}</div>}
      </div>
      {acts}
    </div>
  );
}

function Block({ it, ctx }: { it: Item; ctx: Ctx }) {
  switch (it.kind) {
    case "challenge": return <Challenge it={it} ctx={ctx} />;
    case "draft-theory": return <DraftTheory it={it} ctx={ctx} />;
    case "draft-theme": {
      const done = () => ctx.settle(it.id);
      useActs(ctx, it.id, { a: done, x: done });
      return (
        <Row icon="theme" iconTitle="Draft theme" draft title={it.name} acts={<Decide onAccept={done} onDiscard={done} />}>
          <span className="ap-muted">From {it.from} signals with no theme yet</span>
          <span className="br-ghost">{it.gists.join("; ")}</span>
        </Row>
      );
    }
    case "draft-prototype": {
      const done = () => ctx.settle(it.id);
      const open = () => ctx.host.onOpen("theory", it.theory);
      useActs(ctx, it.id, { a: done, x: done, open });
      return (
        <Row icon="prototype" iconTitle="Draft prototype" draft title={it.name} acts={<Decide onAccept={done} onDiscard={done} />}>
          <span className="br-ghost">{it.note}</span>
          <button className="br-link" onClick={open} title="Tests this theory"><Icon name="theory" size={12} /><Claim id={it.theory} /></button>
        </Row>
      );
    }
    case "evidence": {
      const done = () => ctx.settle(it.id);
      const open = () => ctx.host.onOpen("theory", it.theory);
      const s = signal(it.signal), st = s.evidence.find(e => e.theory === it.theory)!.stance;
      useActs(ctx, it.id, { a: done, x: done, open });
      return (
        <Row icon="theory" iconTitle="Suggested evidence" title={<Claim id={it.theory} />} onOpen={open} acts={<Decide onAccept={done} onDiscard={done} />}>
          <span className="br-ghost br-sig"><Icon name={st === "supports" ? "arrowUp" : "arrowDown"} size={12} /><span>{s.gist} <span className="ap-muted">{s.source}</span></span></span>
        </Row>
      );
    }
    case "revision": return <Revision it={it} ctx={ctx} />;
    case "merge-themes": {
      const done = () => ctx.settle(it.id);
      const open = () => ctx.host.onOpen("theme", it.a);
      useActs(ctx, it.id, { a: done, x: done, open });
      return (
        <Row icon="merge" iconTitle="Suggested merge" title={<>Merge <ThemeName id={it.a} /> into <ThemeName id={it.b} /></>} onOpen={open} acts={<Decide accept="Merge" onAccept={done} onDiscard={done} discard="Keep apart" />}>
          <span className="ap-muted">{it.shared} signals and 1 theory in both</span>
        </Row>
      );
    }
    case "near-dup": return <NearDup it={it} ctx={ctx} />;
    case "signals": return <NewSignals it={it} ctx={ctx} />;
  }
}

function Challenge({ it, ctx }: { it: Extract<Item, { kind: "challenge" }>; ctx: Ctx }) {
  const { edit, trip, conf, decide } = useTripDecide(it.theory);
  const hit = trip.hits.find(h => h.id === it.hit)!;
  // The decision lives with the theory: deciding in the pane settles it here too.
  useEffect(() => { if (edit.decisions[it.hit]) ctx.settle(it.id); }, [edit.decisions[it.hit]]);
  const open = () => ctx.host.onOpen("theory", it.theory);
  useActs(ctx, it.id, { a: () => decide(it.hit, "accepted"), x: () => decide(it.hit, "dismissed"), open });
  return (
    <Row icon="theory" iconTitle="Challenged theory" mark={<Mark kind="challenge" />} title={<Claim id={it.theory} />} onOpen={open}
      acts={<span className="br-acts"><button className="ap-btn" onClick={() => decide(it.hit, "accepted")} title={`Accept and lower confidence to ${Math.max(1, conf - 1)} (A)`}>Accept</button><IconButton icon="x" label="Dismiss (X)" onClick={() => decide(it.hit, "dismissed")} /></span>}>
      <span className="br-ghost br-sig"><Icon name="arrowDown" size={12} /><span>{hit.gist} <span className="ap-muted">{hit.source}</span></span></span>
      <span className="ap-muted">{hit.why}</span>
    </Row>
  );
}

function DraftTheory({ it, ctx }: { it: Extract<Item, { kind: "draft-theory" }>; ctx: Ctx }) {
  const t = theory(it.theory);
  const done = () => ctx.settle(it.id);
  const open = () => ctx.host.onOpen("theory", it.theory);
  useActs(ctx, it.id, { a: done, x: done, open });
  return (
    <Row icon="theory" iconTitle="Draft theory" draft title={<Claim id={it.theory} />} onOpen={open} acts={<Decide onAccept={done} onDiscard={done} />}>
      <span className="br-meta"><Balance s={t.supports} u={t.undermines} /><span className="ap-muted ap-inline"><Icon name="theme" size={12} /><ThemeName id={t.themes[0]} /></span></span>
    </Row>
  );
}

function Revision({ it, ctx }: { it: Extract<Item, { kind: "revision" }>; ctx: Ctx }) {
  const [edit, set] = useEdit("theory", it.theory);
  const [was] = useState(edit.claim);
  const accept = () => { set({ claim: it.text }); ctx.settle(it.id); };
  const discard = () => ctx.settle(it.id);
  const open = () => ctx.host.onOpen("theory", it.theory);
  useActs(ctx, it.id, { a: accept, x: discard, open });
  return (
    <Row icon="edit" iconTitle="Suggested revision" title={<s className="br-was">{was}</s>} onOpen={open} acts={<Decide onAccept={accept} onDiscard={discard} />}>
      <span className="br-ghost">{it.text}</span>
    </Row>
  );
}

/** Merged automatically, logged here, one click to undo. */
function NearDup({ it, ctx }: { it: Extract<Item, { kind: "near-dup" }>; ctx: Ctx }) {
  const [split, setSplit] = useState(false);
  const reduce = useReducedMotion();
  const keep = () => ctx.settle(it.id);
  const toggle = () => setSplit(v => !v);
  const open = () => ctx.host.onOpen("theme", it.theme);
  useActs(ctx, it.id, { a: keep, u: toggle, x: toggle, open });
  return (
    <Row icon={split ? "split" : "merge"} iconTitle={split ? "Unmerged" : "Merged automatically"} title={it.gist} onOpen={open}
      acts={<span className="br-acts">
        {split
          ? <button className="ap-btn" onClick={toggle} title="Merge again (U)">Merge again</button>
          : <button className="ap-btn" onClick={toggle} title="Unmerge (U)"><Icon name="split" size={12} />Unmerge</button>}
        <IconButton icon="check" label={split ? "Done (A)" : "Keep merged (A)"} onClick={keep} />
      </span>}>
      <AnimatePresence initial={false} mode="wait">
        {split
          ? <motion.span key="split" className="br-split" initial={{ opacity: 0, y: reduce ? 0 : -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: EASE }}>
              {it.sources.map(src => <span key={src} className="br-split-sig"><Icon name="signal" size={12} /><span>{it.gist} <span className="ap-muted">{src}</span></span></span>)}
            </motion.span>
          : <motion.span key="one" className="ap-muted br-sources" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              One signal, {it.sources.length} sources: {it.sources.join(" and ")}
            </motion.span>}
      </AnimatePresence>
    </Row>
  );
}

function NewSignals({ it, ctx }: { it: Extract<Item, { kind: "signals" }>; ctx: Ctx }) {
  const [open, setOpen] = useState(false);
  const th = THEMES.find(t => t.id === it.theme)!;
  const ss = SIGNALS.filter(s => s.themes.includes(it.theme) && (s.day === "Today" || s.day === "Yesterday"));
  const seen = () => ctx.settle(it.id);
  useActs(ctx, it.id, { a: seen, x: seen, open: () => ctx.host.onOpen("theme", it.theme) });
  return (
    <Row icon="theme" iconTitle="Theme" mark={<Mark kind="fresh" />} title={<ThemeName id={th.id} />} onOpen={() => ctx.host.onOpen("theme", it.theme)}
      acts={<span className="br-acts">
        <button className="br-count ap-num" aria-expanded={open} onClick={() => setOpen(o => !o)} title={open ? "Fold" : "Show the new signals"}>
          {ss.length} new<span className="br-caret" data-open={open ? "" : undefined}><Icon name="down" size={12} /></span>
        </button>
        <IconButton icon="check" label="Seen (A)" onClick={seen} />
      </span>}>
      <AnimatePresence initial={false}>
        {open && (
          <motion.span className="br-siglist" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            {ss.map(s => <span key={s.id} className="br-siglist-row"><Icon name="signal" size={12} /><span>{s.gist} <span className="ap-muted">{s.source}</span></span></span>)}
          </motion.span>
        )}
      </AnimatePresence>
    </Row>
  );
}
