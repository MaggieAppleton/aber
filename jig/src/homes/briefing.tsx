import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { THEMES, SIGNALS, DUMPS, held, theory, signal, PROTOTYPES } from "./data";
import { Conf, Mark, Icon, IconButton, Pill, Kbd, ProtoGlyph, TheoryCard } from "./atoms";

const EASE = [0.16, 1, 0.3, 1] as const;

type Item =
  | { id: string; kind: "challenge"; theory: string; signal: string }
  | { id: string; kind: "evidence"; theory: string; signal: string }
  | { id: string; kind: "revision"; theory: string; text: string }
  | { id: string; kind: "draft"; theory: string }
  | { id: string; kind: "signals"; theme: string };

const ITEMS: Item[] = [
  { id: "i1", kind: "challenge", theory: "t3", signal: "s7" },
  { id: "i2", kind: "draft", theory: "d1" },
  { id: "i3", kind: "revision", theory: "t1", text: "Tokens become nearly free for routine work, not for frontier reasoning" },
  { id: "i4", kind: "evidence", theory: "t2", signal: "s4" },
  { id: "i5", kind: "signals", theme: "cost" },
  { id: "i6", kind: "draft", theory: "d3" },
  { id: "i7", kind: "signals", theme: "review" },
];

/** Paradigm: open on what changed. A queue of different components, each chosen for its kind of change. */
export function BriefingHome() {
  const [items, setItems] = useState(ITEMS);
  const [cursor, setCursor] = useState(0);
  const [done, setDone] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const settle = (id: string) => { setItems(xs => xs.filter(x => x.id !== id)); setDone(d => d + 1); };
  useEffect(() => { setCursor(c => Math.min(c, Math.max(0, items.length - 1))); }, [items.length]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "j") setCursor(c => Math.min(c + 1, items.length - 1));
    if (e.key === "k") setCursor(c => Math.max(c - 1, 0));
    if ((e.key === "a" || e.key === "x") && items[cursor]) settle(items[cursor].id);
  }

  return (
    <div className="ap brf" tabIndex={0} onKeyDown={onKey} ref={ref}>
      <div className="brf-stream ap-scroll">
        <header className="brf-head">
          <span className="ap-title">Friday 31 October</span>
          <span className="brf-progress" aria-label={`${items.length} left`}>
            {[...Array(ITEMS.length)].map((_, i) => <i key={i} data-done={i < done ? "" : undefined} />)}
          </span>
        </header>
        <Overnight />
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((it, i) => (
            <motion.div key={it.id} layout className="brf-item" data-cursor={i === cursor ? "" : undefined} onPointerEnter={() => setCursor(i)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 40, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
              transition={{ layout: { duration: 0.35, ease: EASE } }}>
              <Block it={it} onSettle={() => settle(it.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
        {items.length === 0 && (
          <motion.div className="brf-clear" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <Icon name="check" size={20} />
          </motion.div>
        )}
        <div style={{ height: 100 }} />
      </div>
      <aside className="brf-side">
        <div className="brf-side-group">
          {held.map(t => (
            <div key={t.id} className="brf-held" title={t.claim}>
              <Conf n={t.confidence} />
              <span className="brf-held-claim">{t.claim}</span>
              {t.challenge && items.some(x => x.kind === "challenge" && x.theory === t.id) && <Mark kind="challenge" />}
            </div>
          ))}
        </div>
        <div className="brf-side-group">
          {PROTOTYPES.filter(p => p.status !== "shelved").map(p => (
            <div key={p.id} className="brf-held"><ProtoGlyph status={p.status} /><span className="brf-held-claim">{p.name}</span></div>
          ))}
        </div>
        <div className="brf-keys"><Kbd>J</Kbd><Kbd>K</Kbd><Kbd>A</Kbd><Kbd>X</Kbd></div>
      </aside>
      <Pill sees="briefing" />
    </div>
  );
}

function Overnight() {
  const [open, setOpen] = useState(false);
  const today = DUMPS.filter(d => d.day === "Today");
  return (
    <motion.button layout className="brf-overnight" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span className="brf-flow">
        <span className="ap-num">{today.length}</span><Icon name="dump" size={14} />
        <Icon name="chevron" size={12} />
        <span className="ap-num">{SIGNALS.filter(s => s.day === "Today").length}</span><Icon name="signal" size={14} />
      </span>
      <AnimatePresence initial={false}>
        {open && (
          <motion.span className="brf-dumps" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            {today.map(d => <span key={d.id}><span className="ap-muted ap-num">{d.time}</span> {d.first}</span>)}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function Actions({ onSettle }: { onSettle: () => void }) {
  return (
    <span className="ap-ghost-actions brf-actions">
      <IconButton icon="check" label="Accept (A)" onClick={onSettle} />
      <IconButton icon="x" label="Discard (X)" onClick={onSettle} />
    </span>
  );
}

function Block({ it, onSettle }: { it: Item; onSettle: () => void }) {
  if (it.kind === "challenge") {
    const t = theory(it.theory), s = signal(it.signal);
    return <ChallengeBlock t={t} s={s} onSettle={onSettle} />;
  }
  if (it.kind === "draft") return <div className="brf-draft"><TheoryCard t={theory(it.theory)} /><Actions onSettle={onSettle} /></div>;
  if (it.kind === "revision") {
    const t = theory(it.theory);
    return (
      <div className="brf-card">
        <div className="brf-rev"><s>{t.claim}</s><span className="brf-ghost-text">{it.text}</span></div>
        <Actions onSettle={onSettle} />
      </div>
    );
  }
  if (it.kind === "evidence") {
    const t = theory(it.theory), s = signal(it.signal);
    return (
      <div className="brf-card brf-ev">
        <span className="brf-ghost-text brf-sig">{s.gist}<span className="ap-muted"> {s.source}</span></span>
        <Icon name="arrowUp" size={14} />
        <span className="brf-claim">{t.claim}</span>
        <Actions onSettle={onSettle} />
      </div>
    );
  }
  return <SignalsBlock themeId={it.theme} onSettle={onSettle} />;
}

function ChallengeBlock({ t, s, onSettle }: { t: ReturnType<typeof theory>; s: ReturnType<typeof signal>; onSettle: () => void }) {
  const [conf, setConf] = useState(t.confidence ?? 3);
  return (
    <div className="brf-card brf-challenge">
      <div className="brf-row"><Mark kind="challenge" /><span className="brf-claim">{t.claim}</span></div>
      <div className="brf-ghost-text brf-sig"><Icon name="arrowDown" size={14} />{s.gist}<span className="ap-muted"> {s.source}</span></div>
      <div className="brf-row">
        <span className="brf-conf-set" role="radiogroup" aria-label="Confidence">
          {[1, 2, 3, 4, 5].map(i => <button key={i} role="radio" aria-checked={i === conf} aria-label={`${i}`} data-on={i <= conf ? "" : undefined} onClick={() => setConf(i)} />)}
        </span>
        <Actions onSettle={onSettle} />
      </div>
    </div>
  );
}

function SignalsBlock({ themeId, onSettle }: { themeId: string; onSettle: () => void }) {
  const [open, setOpen] = useState(false);
  const th = THEMES.find(t => t.id === themeId)!;
  const ss = SIGNALS.filter(s => s.themes.includes(themeId) && (s.day === "Today" || s.day === "Yesterday"));
  return (
    <motion.div layout className="brf-card brf-signals" onClick={() => setOpen(!open)}>
      <div className="brf-row">
        <Mark kind="fresh" /><span className="brf-claim">{th.name}</span>
        {!open && <span className="brf-stack">{ss.map(s => <i key={s.id} title={s.source}>{s.source[0].toUpperCase()}</i>)}</span>}
        <span style={{ marginLeft: "auto" }} onClick={e => e.stopPropagation()}><IconButton icon="check" label="Seen (A)" onClick={onSettle} /></span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="brf-siglist" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            {ss.map(s => <div key={s.id}>{s.gist}<span className="ap-muted"> {s.source}</span></div>)}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
