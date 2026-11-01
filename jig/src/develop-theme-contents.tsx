import { useState, type ReactNode } from "react";
import { JigPage } from "./jig";
import { useDecisions } from "./store";
import { SIGNALS, theoriesIn, type Signal, type Theory } from "./homes/data";
import { Icon, IconButton, Conf, Mark } from "./homes/atoms";
import { ColumnsDeveloped, columnsWidth } from "./homes/columns2";
import { ThemeHead, ThemePane, Claim } from "./homes/panes";
import { ConfidenceSpark } from "./homes/confidence-spark";
import { stancesFor } from "./homes/histories";
import { useEdit } from "./homes/edits";
import "./homes/homes.css";
import "./homes/panes.css";
import "./homes/app-shell.css";
import "./homes/theme-contents.css";

/*
 * The theme pane's contents (its theories and its signals), redesigned four ways.
 * Each option renders inside the real app frame: the Columns rails on the left, the docked pane on the right.
 */

const THEME = "cost";
const theories = () => theoriesIn(THEME);
const signals = () => SIGNALS.filter(s => s.themes.includes(THEME));
const fresh = (s: Signal) => s.day === "Today";
const stance = (s: Signal, t: string) => s.evidence.find(e => e.theory === t);
const sourceIcon = (s: Signal) => s.source === "My observation" ? "text" as const : "link" as const;

/** Rows share one selection: white and lifted, never coloured. */
function useSel() {
  const [sel, setSel] = useState<string>();
  return { sel, pick: (id: string) => setSel(v => v === id ? undefined : id) };
}

const Count = ({ n }: { n: number }) => <span className="ap-num tc-count">{n}</span>;
function SectionHead({ label, n, add }: { label: string; n: number; add: string }) {
  return <div className="tc-head"><span className="ap-label">{label}</span><Count n={n} /><IconButton icon="plus" label={add} /></div>;
}

/* ── A. Index: two sunk trays, one grid of aligned columns each ── */
function OptionA() {
  const { sel, pick } = useSel();
  const ts = theories(), ss = signals();
  return (
    <>
      <SectionHead label="Theories" n={ts.length} add="State a theory" />
      <div className="tc-tray">
        {ts.map(t => (
          <button key={t.id} className="tc-a-row tc-a-theory" data-sel={sel === t.id ? "" : undefined} data-draft={t.draft ? "" : undefined} onClick={() => pick(t.id)}>
            <span className="tc-claim"><Claim id={t.id} /></span>
            <span className="tc-a-conf">{t.draft ? <span className="ap-muted">Draft</span> : <Conf n={t.confidence} />}</span>
            <span className="ap-num tc-bal">+{t.supports} <span className="ap-muted">−{t.undermines}</span></span>
            <span className="tc-a-marks">{t.pending > 0 && <Mark kind="pending" n={t.pending} />}</span>
          </button>
        ))}
      </div>
      <SectionHead label="Signals" n={ss.length} add="Add a signal" />
      <div className="tc-tray">
        {ss.map(s => (
          <button key={s.id} className="tc-a-row tc-a-signal" data-sel={sel === s.id ? "" : undefined} onClick={() => pick(s.id)}>
            <span className="tc-gutter">{fresh(s) && <Mark kind="fresh" />}</span>
            <span className="tc-gist">{s.gist}</span>
            <span className="tc-a-ev">{s.evidence.map(e => <Icon key={e.theory} name={e.stance === "supports" ? "arrowUp" : "arrowDown"} size={12} />)}</span>
            <span className="ap-muted tc-src">{s.source}</span>
          </button>
        ))}
      </div>
    </>
  );
}

/* ── B. Evidence under its theory: each theory a card holding the signals that bear on it ── */
function OptionB() {
  const { sel, pick } = useSel();
  const ts = theories(), ss = signals();
  const loose = ss.filter(s => !s.evidence.some(e => ts.some(t => t.id === e.theory)));
  return (
    <>
      <SectionHead label="Theories" n={ts.length} add="State a theory" />
      <div className="tc-b-grid">
        {ts.map(t => {
          const ev = ss.filter(s => stance(s, t.id));
          return (
            <div key={t.id} className="tc-b-card" data-draft={t.draft ? "" : undefined} data-sel={sel === t.id ? "" : undefined} onClick={() => pick(t.id)}>
              <div className="tc-claim"><Claim id={t.id} /></div>
              <div className="tc-line">{t.draft ? <span className="ap-muted">Draft</span> : <Conf n={t.confidence} />}<span className="ap-num tc-bal">+{t.supports} <span className="ap-muted">−{t.undermines}</span></span>{t.pending > 0 && <Mark kind="pending" n={t.pending} />}</div>
              {ev.length > 0 && (
                <div className="tc-b-ev">
                  {ev.map(s => {
                    const e = stance(s, t.id)!;
                    return (
                      <div key={s.id} className="tc-b-sig" data-suggested={e.suggested ? "" : undefined} data-down={e.stance === "undermines" ? "" : undefined}>
                        <Icon name={e.stance === "supports" ? "arrowUp" : "arrowDown"} size={12} />
                        <span className="tc-gist">{s.gist}</span>
                        {fresh(s) && <Mark kind="fresh" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {loose.length > 0 && <><SectionHead label="Not yet evidence" n={loose.length} add="Add a signal" />
        <div className="tc-tray">{loose.map(s => <div key={s.id} className="tc-b-sig"><span className="tc-gist">{s.gist}</span><span className="ap-muted">{s.source}</span></div>)}</div></>}
    </>
  );
}

/* ── C. Matrix: signals down, theories across, a mark where they meet ── */
function OptionC() {
  const [col, setCol] = useState<string>();
  const { sel, pick } = useSel();
  const ts = theories(), ss = signals();
  const tmpl = { gridTemplateColumns: `minmax(0, 1fr) repeat(${ts.length}, 84px)` };
  return (
    <>
      <div className="tc-c" style={tmpl} onPointerLeave={() => setCol(undefined)}>
        <div className="tc-c-corner"><span className="ap-label">Signals</span><Count n={ss.length} /></div>
        {ts.map(t => (
          <button key={t.id} className="tc-c-th" data-draft={t.draft ? "" : undefined} data-hot={col === t.id ? "" : undefined} data-sel={sel === t.id ? "" : undefined}
            onPointerEnter={() => setCol(t.id)} onClick={() => pick(t.id)}>
            <span className="tc-claim"><Claim id={t.id} /></span>
            {t.draft ? <span className="ap-muted">Draft</span> : <Conf n={t.confidence} />}
          </button>
        ))}
        {ss.map(s => (
          <div key={s.id} className="tc-c-row" data-sel={sel === s.id ? "" : undefined} onClick={() => pick(s.id)}>
            <div className="tc-c-sig">
              <span className="tc-gutter">{fresh(s) && <Mark kind="fresh" />}</span>
              <span className="tc-gist">{s.gist}</span>
              <span className="ap-muted tc-src">{s.source}</span>
            </div>
            {ts.map(t => {
              const e = stance(s, t.id);
              return (
                <div key={t.id} className="tc-c-cell" data-hot={col === t.id ? "" : undefined} onPointerEnter={() => setCol(t.id)}>
                  {e && <span className="tc-c-mark" data-down={e.stance === "undermines" ? "" : undefined} data-suggested={e.suggested ? "" : undefined}
                    title={e.stance === "supports" ? "Supports" : "Undermines"}><Icon name={e.stance === "supports" ? "arrowUp" : "arrowDown"} size={12} /></span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <button className="tc-c-add"><Icon name="plus" size={14} />State a theory</button>
    </>
  );
}

/* ── D. Deck and feed: theories as a strip of tall cards with their history, signals as a dated feed ── */
function DeckCard({ t, sel, onPick }: { t: Theory; sel: boolean; onPick: () => void }) {
  const [edit] = useEdit("theory", t.id);
  const total = Math.max(1, t.supports + t.undermines);
  return (
    <button className="tc-d-card" data-draft={t.draft ? "" : undefined} data-sel={sel ? "" : undefined} onClick={onPick}>
      <span className="tc-claim">{edit.claim}</span>
      <span className="tc-d-foot">
        <span className="tc-d-spark">{t.draft ? <span className="ap-muted">Draft</span> : <ConfidenceSpark variant="D" stances={stancesFor(t.id, edit.log, edit.confidence)} />}</span>
        <span className="tc-d-bar" aria-label={`${t.supports} support, ${t.undermines} undermine`}>
          <i style={{ flexGrow: t.supports / total }} /><i data-down="" style={{ flexGrow: t.undermines / total }} />
        </span>
        <span className="tc-line ap-num tc-bal">+{t.supports} <span className="ap-muted">−{t.undermines}</span>{t.pending > 0 && <Mark kind="pending" n={t.pending} />}</span>
      </span>
    </button>
  );
}
function OptionD() {
  const { sel, pick } = useSel();
  const ts = theories(), ss = signals();
  const days = [...new Set(ss.map(s => s.day))];
  return (
    <>
      <div className="tc-d-strip">
        {ts.map(t => <DeckCard key={t.id} t={t} sel={sel === t.id} onPick={() => pick(t.id)} />)}
        <button className="tc-d-card tc-d-add" aria-label="State a theory" title="State a theory"><Icon name="plus" /></button>
      </div>
      <div className="tc-d-feed">
        {days.map(d => (
          <div key={d} className="tc-d-day">
            <div className="ap-label tc-d-date">{d}</div>
            <div className="tc-d-items">
              {ss.filter(s => s.day === d).map(s => (
                <button key={s.id} className="tc-d-sig" data-sel={sel === s.id ? "" : undefined} onClick={() => pick(s.id)}>
                  <span className="tc-d-glyph"><Icon name={sourceIcon(s)} size={14} />{fresh(s) && <Mark kind="fresh" />}</span>
                  <span className="tc-d-text"><span className="tc-gist">{s.gist}</span><span className="ap-muted">{s.source}</span></span>
                  <span className="tc-d-to">{s.evidence.filter(e => ts.some(t => t.id === e.theory)).map(e => <span key={e.theory} className="tc-d-to-chip" data-suggested={e.suggested ? "" : undefined}><Icon name={e.stance === "supports" ? "arrowUp" : "arrowDown"} size={12} /><span><Claim id={e.theory} /></span></span>)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** The real frame: Columns with the Themes column wide, the pane docked right and open on the theme. */
const FRAME_W = 1240, FRAME_H = 760;
function Frame({ children }: { children: ReactNode }) {
  const left = columnsWidth("theme");
  const noop = () => {};
  return (
    <div className="ap as tc-frame" data-view="columns" style={{ width: FRAME_W, height: FRAME_H }}>
      <div className="as-content" style={{ width: left }}>
        <div className="as-view" style={{ width: left }}>
          <ColumnsDeveloped fold="rails" host={{ open: { kind: "theme", id: THEME }, onOpen: noop, onClose: noop, onUnfold: noop }} />
        </div>
      </div>
      <aside className="as-pane" style={{ left, right: 0 }}>
        <div className="as-pane-close"><IconButton icon="expand" label="Full width" /><IconButton icon="x" label="Close" /></div>
        <div className="as-pane-scroll ap-scroll">{children}</div>
      </aside>
    </div>
  );
}

const OPTIONS: { k: string; name: string; why: string; view: () => ReactNode }[] = [
  { k: "Now", name: "Current", why: "Theory tiles in an auto grid, then a stack of grey signal slabs, each two lines.", view: () => <ThemePane id={THEME} nav={{ onOpen: () => {} }} /> },
  { k: "A", name: "Index", why: "Two sunk trays of one-line rows on a shared column grid, so confidence, balance and source line up and the theme reads at a glance.", view: () => <div className="pn-doc"><ThemeHead id={THEME} /><OptionA /></div> },
  { k: "B", name: "Evidence under its theory", why: "Each theory is a card carrying the signals that bear on it, so the theme shows its argument rather than two separate lists.", view: () => <div className="pn-doc"><ThemeHead id={THEME} /><OptionB /></div> },
  { k: "C", name: "Matrix", why: "Signals down, theories across, an arrow where one bears on another; a signal that cuts two ways and a theory with thin support both jump out.", view: () => <div className="pn-doc tc-wide"><ThemeHead id={THEME} /><OptionC /></div> },
  { k: "D", name: "Deck and feed", why: "Theories as a strip of tall cards with their confidence history and an evidence bar; signals as a dated feed, each naming the theory it moves.", view: () => <div className="pn-doc tc-wide"><ThemeHead id={THEME} /><OptionD /></div> },
];

export function DevelopThemeContentsJig() {
  const { decisions, update } = useDecisions();
  const chosen = decisions["theme-contents"]?.choice;
  return (
    <JigPage title="Theme pane contents" status="Exploration. Options for the theories and signals inside an open theme."
      intro={<p>Each option is drawn in the app frame on Cost of intelligence with the seed data. Click rows to see selection; hover the matrix to light a column.</p>}>
      <nav className="tc-jump">{OPTIONS.map(o => <a key={o.k} href={`#tc-${o.k}`}>{o.k === "Now" ? "Now" : `${o.k}. ${o.name}`}</a>)}</nav>
      {OPTIONS.map(o => (
        <section key={o.k} id={`tc-${o.k}`} className="tc-section">
          <div className="tc-section-head">
            <h2>{o.k === "Now" ? o.name : `${o.k}. ${o.name}`}</h2>
            <p>{o.why}</p>
            {o.k !== "Now" && <button className="jig-choose" aria-pressed={chosen === o.k} onClick={() => update("theme-contents", { choice: chosen === o.k ? undefined : o.k })}>{chosen === o.k ? "Picked" : "Pick"}</button>}
          </div>
          <Frame>{o.view()}</Frame>
        </section>
      ))}
    </JigPage>
  );
}
