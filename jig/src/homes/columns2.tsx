import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, LayoutGroup } from "motion/react";
import { DUMPS, SIGNALS, THEMES, THEORIES, PROTOTYPES, theoriesIn, signal } from "./data";
import { Icon, IconButton, DumpIcon, Mark, Pill, type IconName } from "./atoms";
import { lineage, key, type Kind } from "./graph";
import { ObjectPane, SignalDetail, Claim, ThemeName, ProtoName, ProtoStatus, TheoryConf, type ObjKind, type PaneNav } from "./panes";

const EASE = [0.16, 1, 0.3, 1] as const;
const SPRING = { type: "spring", stiffness: 420, damping: 40 } as const;
export type Fold = "rails" | "dots";

const COLS: { kind: Kind; icon: IconName; name: string; width: number }[] = [
  { kind: "dump", icon: "dump", name: "Dumps", width: 250 },
  { kind: "signal", icon: "signal", name: "Signals", width: 290 },
  { kind: "theme", icon: "theme", name: "Themes", width: 230 },
  { kind: "theory", icon: "theory", name: "Theories", width: 300 },
  { kind: "prototype", icon: "prototype", name: "Prototypes", width: 220 },
];
const RAIL = 44;

/** The width the columns need beside an open stock: its own column (and any unfolded flow's) wide, the rest rails. */
export function columnsWidth(openKind?: Kind, unfoldedKind?: Kind, compact?: boolean) {
  return COLS.reduce((w, c) => w + (!compact && (c.kind === openKind || c.kind === unfoldedKind) ? c.width : RAIL), 0);
}
const STOCKS: Kind[] = ["theme", "theory", "prototype"];

/**
 * Columns, developed. Stocks (themes, theories, prototypes) open into a wide pane.
 * Flows (dumps, signals) unfold in place. Columns fold away to rails or to dots.
 */
/** Lets a host (the app shell) hold what is open and unfolded, and draw the pane itself. */
export type ColumnsHost = {
  open?: { kind: Kind; id: string }; onOpen: (kind: Kind, id: string) => void; onClose: () => void;
  unfolded?: string; onUnfold: (id: string | undefined) => void;
  /** The pane has taken the frame: every column folds to its rail; a rail brings the columns back. */
  compact?: boolean; onRestore?: () => void;
};

export function ColumnsDeveloped({ fold, host }: { fold: Fold; host?: ColumnsHost }) {
  const [visible, setVisible] = useState<Kind[]>(["theme", "theory", "prototype"]);
  const [ownOpen, setOwnOpen] = useState<{ kind: Kind; id: string }>();
  const [ownUnfolded, setOwnUnfolded] = useState<string>();   // signal or dump expanded in place
  const open = host ? host.open : ownOpen;
  const unfolded = host ? host.unfolded : ownUnfolded;
  const setOpen = (o: { kind: Kind; id: string } | undefined) => host ? (o ? host.onOpen(o.kind, o.id) : host.onClose()) : setOwnOpen(o);
  const setUnfolded = (f: string | undefined | ((u: string | undefined) => string | undefined)) => {
    const next = typeof f === "function" ? f(unfolded) : f;
    if (host) host.onUnfold(next); else setOwnUnfolded(next);
  };

  const unfoldedKind: Kind | undefined = unfolded ? (unfolded.startsWith("D") ? "dump" : "signal") : undefined;
  const related = open ? lineage(open.kind, open.id) : unfolded && unfoldedKind ? lineage(unfoldedKind, unfolded) : undefined;
  const toggle = (k: Kind) => setVisible(v => v.includes(k) ? v.filter(x => x !== k) : [...v, k]);
  const show = (k: Kind) => setVisible(v => v.includes(k) ? v : [...v, k]);

  // When something is open, only its own column stays wide, plus the column of any item unfolded from it.
  const compact = !!(host?.compact && open);
  const isWide = (k: Kind) => compact ? false : open ? k === open.kind || k === unfoldedKind : visible.includes(k);

  const openObj = (kind: Kind, id: string) => { if (!host) setUnfolded(undefined); setOpen({ kind, id }); };
  const unfold = (kind: Kind, id: string) => { show(kind); setUnfolded(u => u === id ? undefined : id); };
  // Signals unfold in their own column, not inside the pane.
  const nav: PaneNav = { onOpen: openObj, onUnfold: unfold, unfolded };

  return (
    <div className="ap cd" data-fold={fold} data-hosted={host ? "" : undefined} tabIndex={host ? undefined : 0} onKeyDown={host ? undefined : e => { if (e.key === "Escape") { if (open) setOpen(undefined); else setUnfolded(undefined); } }}>
      <LayoutGroup id={`cd-${fold}`}>
        {fold === "dots" && (
          <div className="cd-dots">
            {COLS.map(c => {
              const n = related ? countRelated(c.kind, related) : 0;
              return (
                <button key={c.kind} className="cd-dot" aria-pressed={isWide(c.kind)} aria-label={c.name} title={c.name}
                  onClick={() => { if (open) setOpen(undefined); toggle(c.kind); }}>
                  <Icon name={c.icon} size={14} weight={isWide(c.kind) ? "fill" : "regular"} />
                  {n > 0 && !isWide(c.kind) && <span className="cd-dot-n">{n}</span>}
                </button>
              );
            })}
          </div>
        )}
        <div className="cd-row">
          {COLS.map(c => {
            const wide = isWide(c.kind);
            const width = wide ? c.width : fold === "rails" ? RAIL : 0;
            return (
              <motion.section key={c.kind} className="cd-col" data-kind={c.kind} data-wide={wide ? "" : undefined}
                animate={{ width }} initial={false} transition={SPRING}>
                {wide ? (
                  <ColumnList kind={c.kind} icon={c.icon} name={c.name} related={related} open={open} unfolded={unfolded} fold={fold}
                    onOpen={openObj} onUnfold={unfold} onFold={() => { if (open) setOpen(undefined); toggle(c.kind); }} />
                ) : fold === "rails" ? (
                  <button className="cd-rail" aria-label={`Show ${c.name}`} title={c.name} onClick={() => { if (compact) { host!.onRestore?.(); return; } if (open) setOpen(undefined); show(c.kind); }}>
                    <Icon name={c.icon} size={16} />
                    {related && countRelated(c.kind, related) > 0 && <span className="cd-rail-n">{countRelated(c.kind, related)}</span>}
                  </button>
                ) : null}
              </motion.section>
            );
          })}
          <AnimatePresence mode="popLayout">
            {open && !host && (
              <motion.article key={`${open.kind}${open.id}`} className="cd-pane ap-scroll" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }} transition={{ duration: 0.4, ease: EASE }}>
                <div className="cd-pane-close"><IconButton icon="x" label="Close (Esc)" onClick={() => setOpen(undefined)} /></div>
                <ObjectPane kind={open.kind as ObjKind} id={open.id} nav={nav} />
              </motion.article>
            )}
          </AnimatePresence>
          {(!open || host) && <div className="cd-empty" />}
        </div>
      </LayoutGroup>
      {!host && <Pill sees={open ? ({ theory: "Theory", theme: "Theme", prototype: "Prototype" } as Record<string, string>)[open.kind] : "Columns"} />}
    </div>
  );
}

function countRelated(kind: Kind, related: Set<string>) {
  return [...related].filter(k => k.startsWith(kind + ":")).length;
}

/* ── One column ── */
function ColumnList({ kind, icon, name, related, open, unfolded, fold, onOpen, onUnfold, onFold }: {
  kind: Kind; icon: IconName; name: string; related?: Set<string>; open?: { kind: Kind; id: string }; unfolded?: string; fold: Fold;
  onOpen: (k: Kind, id: string) => void; onUnfold: (k: Kind, id: string) => void; onFold: () => void;
}) {
  const items: { id: string; draft?: boolean; body: ReactNode; detail?: ReactNode }[] =
    kind === "dump" ? DUMPS.map(d => ({ id: d.id, body: <><span className="cd-line"><DumpIcon d={d} /><span className="cd-clip">{d.first}</span></span><span className="ap-muted ap-num cd-sub">{d.day === "Today" ? d.time : d.day}</span></>, detail: <DumpDetail id={d.id} onOpen={onOpen} onUnfold={onUnfold} /> }))
    : kind === "signal" ? SIGNALS.map(s => ({ id: s.id, body: <><span className="cd-line">{s.day === "Today" && <Mark kind="fresh" />}<span>{s.gist}</span></span><span className="ap-muted cd-sub">{s.source}</span></>, detail: <SignalDetail s={s} onOpen={onOpen} onDump={id => onUnfold("dump", id)} /> }))
    : kind === "theme" ? THEMES.map(t => ({ id: t.id, body: <span className="cd-line cd-spread"><span><ThemeName id={t.id} /></span>{theoriesIn(t.id).length === 0 ? <Mark kind="open" /> : t.fresh > 0 ? <Mark kind="fresh" /> : null}</span> }))
    : kind === "theory" ? THEORIES.map(t => ({ id: t.id, draft: t.draft, body: <><span className="cd-claim"><Claim id={t.id} /></span><span className="cd-line">{!t.draft && <TheoryConf id={t.id} />}{t.challenge && <Mark kind="challenge" />}{t.pending > 0 && <Mark kind="pending" n={t.pending} />}</span></> }))
    : PROTOTYPES.map(p => ({ id: p.id, body: <span className="cd-line"><ProtoStatus id={p.id} /><span><ProtoName id={p.id} /></span></span> }));

  // Bring the unfolded item into view within this column's list (not the page).
  const listRef = useRef<HTMLDivElement>(null);
  const hasUnfolded = unfolded !== undefined && items.some(i => i.id === unfolded);
  useEffect(() => {
    if (!hasUnfolded) return;
    const t = setTimeout(() => {
      const list = listRef.current;
      const el = list?.querySelector<HTMLElement>(`[data-id="${unfolded}"]`);
      if (!list || !el) return;
      const l = list.getBoundingClientRect(), r = el.getBoundingClientRect();
      const top = r.top - l.top, bottom = r.bottom - l.bottom;
      const delta = top < 0 || r.height > l.height ? top : bottom > 0 ? bottom : 0;
      if (delta) list.scrollTo({ top: list.scrollTop + delta, behavior: "smooth" });
    }, 360);
    return () => clearTimeout(t);
  }, [unfolded, hasUnfolded]);

  // Count related items lying (mostly) outside the list's visible area, above and below.
  const [off, setOff] = useState({ up: 0, down: 0, lift: false });
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (!related) { setOff({ up: 0, down: 0, lift: false }); return; }
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const l = list.getBoundingClientRect();
        let up = 0, down = 0;
        list.querySelectorAll<HTMLElement>(".cd-item[data-id]").forEach(el => {
          if (!related.has(key(kind, el.dataset.id!))) return;
          const r = el.getBoundingClientRect();
          const seen = Math.max(0, Math.min(r.bottom, l.bottom) - Math.max(r.top, l.top));
          if (seen >= r.height / 2) return;
          if (r.top + r.height / 2 < l.top + l.height / 2) up++; else down++;
        });
        // Lift the bottom marker clear of the frame's floating pill when this column sits under it.
        const pill = (list.closest("[data-pill-host]") ?? list.closest(".ap"))?.querySelector(".ap-pill-wrap, .ps-surface:not([data-open])")?.getBoundingClientRect();
        const mid = (l.left + l.right) / 2;
        const lift = !!pill && pill.left < mid + 40 && pill.right > mid - 40 && pill.top < l.bottom;
        setOff(o => o.up === up && o.down === down && o.lift === lift ? o : { up, down, lift });
      });
    };
    measure();
    list.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    list.querySelectorAll(".cd-item").forEach(el => ro.observe(el));
    const settle = setTimeout(measure, 380);   // after unfold height animations
    return () => { cancelAnimationFrame(raf); clearTimeout(settle); list.removeEventListener("scroll", measure); ro.disconnect(); };
  }, [related, kind, unfolded]);

  const jump = (dir: "up" | "down") => {
    const list = listRef.current;
    if (!list || !related) return;
    const l = list.getBoundingClientRect();
    const els = [...list.querySelectorAll<HTMLElement>(".cd-item[data-id]")].filter(el => related.has(key(kind, el.dataset.id!)));
    const target = dir === "up"
      ? els.filter(el => el.getBoundingClientRect().top < l.top - 1).pop()
      : els.find(el => el.getBoundingClientRect().bottom > l.bottom + 1);
    if (!target) return;
    const r = target.getBoundingClientRect();
    const delta = dir === "up" ? r.top - l.top - 8 : r.bottom - l.bottom + 8 + (off.lift ? 100 : 40);
    list.scrollTo({ top: list.scrollTop + delta, behavior: "smooth" });
  };

  const stock = STOCKS.includes(kind);

  return (
    <motion.div className="cd-inner" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.08, duration: 0.2 } }}>
      <header className="cd-head">
        <Icon name={icon} size={14} /><span>{name}</span>
        <span className="cd-head-fold"><IconButton icon={fold === "rails" ? "chevronLeft" : "x"} label={`Fold ${name}`} onClick={onFold} /></span>
      </header>
      <div className="cd-list-wrap">
      <div className="cd-list ap-scroll" ref={listRef}>
        {items.map(i => {
          const isOpen = open?.kind === kind && open.id === i.id;
          const isUnfolded = unfolded === i.id;
          const dim = related && !related.has(key(kind, i.id));
          return (
            <div key={i.id} data-id={i.id}
              className="cd-item" data-stock={stock ? "" : undefined} data-open={isOpen || isUnfolded ? "" : undefined} data-dim={dim ? "" : undefined} data-draft={i.draft ? "" : undefined}>
              <button className="cd-item-btn" onClick={() => stock ? onOpen(kind, i.id) : onUnfold(kind, i.id)}>{i.body}</button>
              <AnimatePresence initial={false}>
                {isUnfolded && i.detail && (
                  <motion.div className="cd-detail" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EASE }}>
                    {i.detail}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <AnimatePresence>
        {related && off.up > 0 && <OffMarker key="up" dir="up" n={off.up} onClick={() => jump("up")} />}
        {related && off.down > 0 && <OffMarker key="down" dir="down" n={off.down} lift={off.lift} onClick={() => jump("down")} />}
      </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* Related items off screen in this column, above or below. */
function OffMarker({ dir, n, lift, onClick }: { dir: "up" | "down"; n: number; lift?: boolean; onClick: () => void }) {
  const label = `${n} related ${dir === "up" ? "above" : "below"}`;
  return (
    <motion.button className="cd-off" data-dir={dir} data-lift={lift ? "" : undefined} aria-label={label} title={label} onClick={onClick}
      initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.15, ease: "easeOut" }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={n} className="ap-num" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>{n}</motion.span>
      </AnimatePresence>
      <Icon name={dir === "up" ? "arrowUp" : "arrowDown"} size={12} />
    </motion.button>
  );
}

/* ── Dumps unfold in place (signals use the shared SignalDetail) ── */
function DumpDetail({ id, onOpen, onUnfold }: { id: string; onOpen: (k: Kind, id: string) => void; onUnfold: (k: Kind, id: string) => void }) {
  const d = DUMPS.find(x => x.id === id)!;
  return (
    <div className="cd-detail-inner">
      {d.kind === "voice" && (
        <div className="cd-wave"><button className="cd-play" aria-label="Play"><Icon name="play" size={12} /></button>
          {[...Array(40)].map((_, i) => <i key={i} style={{ height: 4 + Math.abs(Math.sin(i * 1.7) * 14) }} />)}</div>
      )}
      <p className="cd-transcript">{d.first}. So the thing I keep noticing is that the cost curve and the review curve are crossing…</p>
      {d.produced.map(p => p.startsWith("s")
        ? <button key={p} className="cd-link" onClick={() => onUnfold("signal", p)}><Icon name="signal" size={12} />{signal(p).gist}</button>
        : <button key={p} className="cd-link" data-suggested="" onClick={() => onOpen("theory", p)}><Icon name="theory" size={12} /><Claim id={p} /></button>)}
    </div>
  );
}
