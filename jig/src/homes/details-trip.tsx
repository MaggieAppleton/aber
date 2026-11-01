import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "./atoms";
import { Editable } from "./panes";
import { CONDS, HITS, TRIP_TEXT, METRIC, READINGS, READING_TRIPPED, CHECKED, type TripState, type Hit } from "./details-data";
import { ConfSteps, EASE, HitRow, type Decision } from "./details-pane";

/* Five ways to show "what would change my mind" and what happens when a signal trips it. */

export type TripProps = {
  state: TripState; text: string; setText: (v: string) => void; commit: () => void;
  decisions: Record<string, Decision>; decide: (id: string, d?: Decision) => void; conf: number; setConf: (n: number) => void;
};
const NAME = "What would change my mind";

const Watch = () => <span className="dt-watch" title={`Watching new signals, ${CHECKED} checked so far`} aria-label="Watching" />;
const Red = () => <span className="ap-mark" data-kind="challenge" title="Challenged" aria-label="Challenged" />;
const pending = (p: TripProps, hits = HITS) => hits.filter(h => !p.decisions[h.id]);

function Unfold({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && <motion.div className="dt-unfold" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>{children}</motion.div>}
    </AnimatePresence>
  );
}

/** The decided signals, folded to one line until asked for. */
function Log({ p, hits = HITS, date = "31 Oct", open: start = false }: { p: TripProps; hits?: Hit[]; date?: string; open?: boolean }) {
  const [open, setOpen] = useState(start);
  const done = hits.filter(h => p.decisions[h.id]);
  if (!done.length) return null;
  const acc = done.filter(h => p.decisions[h.id] === "accepted").length, dis = done.length - acc;
  return (
    <div className="dt-log">
      <button className="dt-log-head" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <Icon name={open ? "down" : "chevron"} size={12} />
        <span>Tripped {date}</span>
        <span className="ap-muted">{[acc && `${acc} accepted`, dis && `${dis} dismissed`].filter(Boolean).join(", ")}</span>
      </button>
      <Unfold show={open}><div className="dt-hits">{done.map(h => <HitRow key={h.id} hit={h} decision={p.decisions[h.id]} onDecide={d => p.decide(h.id, d)} conf={p.conf} />)}</div></Unfold>
    </div>
  );
}

/* ── A. Watched field: the labelled box, a watching pulse, tripping signals hang beneath it ── */
export function TripA(p: TripProps) {
  const live = p.state === "tripped" ? pending(p) : [];
  return (
    <div className="dt-ta" role="group" aria-label={NAME}>
      <div className="dt-ta-head">
        <Icon name="turn" size={16} />
        <span className="ap-label">{NAME}</span>
        <span className="dt-ta-status">
          {p.state === "empty" && <><span className="dt-ring" /><span className="ap-muted">Not set</span></>}
          {p.state === "watching" && <><Watch /><span className="ap-muted">Watching</span></>}
          {p.state === "tripped" && <><Red /><span className="dt-red">{live.length === 1 ? "1 signal matches" : `${live.length} signals match`}</span></>}
        </span>
      </div>
      <Editable className="pn-tripwire dt-ta-box" value={p.text} onChange={p.setText} onBlur={p.commit} placeholder="When would you doubt this?" aria-label={NAME} data-tripped={p.state === "tripped" ? "" : undefined} />
      {p.state === "tripped" && (
        <div className="dt-ta-hits">
          <AnimatePresence initial={false}>
            {HITS.map(h => <HitRow key={h.id} hit={h} decision={p.decisions[h.id]} onDecide={d => p.decide(h.id, d)} conf={p.conf} />)}
          </AnimatePresence>
        </div>
      )}
      {p.state === "resolved" && <div className="dt-ta-hits"><Log p={p} /></div>}
    </div>
  );
}

/* ── B. Card: a status strip on top, and the challenge inline, ending in a confidence change ── */
export function TripB(p: TripProps) {
  const live = p.state === "tripped" ? pending(p) : [];
  const [i, setI] = useState(0);
  const [accepting, setAccepting] = useState<string>();
  const [to, setTo] = useState(p.conf - 1);
  const [note, setNote] = useState("");
  const cur = live[Math.min(i, live.length - 1)];
  return (
    <div className="dt-tb" data-state={p.state} role="group" aria-label={NAME}>
      <div className="dt-tb-strip">
        <Icon name="turn" size={14} />
        <span className="ap-label">{NAME}</span>
        <span className="dt-tb-status">
          {p.state === "empty" && <><span className="dt-ring" /><span className="ap-muted">Not set</span></>}
          {p.state === "watching" && <><Watch /><span className="ap-muted ap-num">{CHECKED} signals checked</span></>}
          {p.state === "tripped" && <><Red /><span className="dt-red">Tripped</span></>}
          {p.state === "resolved" && <span className="ap-muted">Watching again</span>}
        </span>
      </div>
      <Editable className="dt-tb-text" value={p.text} onChange={p.setText} onBlur={p.commit} placeholder="When would you doubt this?" aria-label={NAME} />
      <AnimatePresence initial={false} mode="popLayout">
        {cur && (
          <motion.div key={cur.id} className="dt-tb-challenge" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease: EASE }}>
            <div className="dt-tb-sig">
              <Icon name="signal" size={14} />
              <span className="dt-hit-gist">{cur.gist}</span>
              <span className="ap-muted">{cur.source}</span>
            </div>
            <span className="ap-muted">{cur.why}</span>
            {accepting === cur.id ? (
              <div className="dt-tb-accept">
                <span className="ap-label">Confidence</span>
                <ConfSteps conf={to} onChange={setTo} />
                <Editable className="pn-note dt-tb-note" value={note} onChange={setNote} placeholder="Why" aria-label="Why" singleLine />
                <button className="ap-btn dt-accept" onClick={() => { p.setConf(to); p.decide(cur.id, "accepted"); setAccepting(undefined); }}>Save</button>
                <button className="pn-step" aria-label="Cancel" title="Cancel" onClick={() => setAccepting(undefined)}><Icon name="x" size={12} /></button>
              </div>
            ) : (
              <div className="dt-tb-acts">
                <button className="ap-btn dt-accept" onClick={() => { setTo(Math.max(1, p.conf - 1)); setNote(`Lowered: ${cur.gist}`); setAccepting(cur.id); }}>Accept</button>
                <button className="ap-btn dt-ghostbtn" onClick={() => p.decide(cur.id, "dismissed")}>Dismiss</button>
                {live.length > 1 && <span className="dt-tb-pager">
                  <button className="pn-step" aria-label="Previous signal" title="Previous signal" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}><Icon name="chevronLeft" size={12} /></button>
                  <span className="ap-muted ap-num">{Math.min(i, live.length - 1) + 1} of {live.length}</span>
                  <button className="pn-step" aria-label="Next signal" title="Next signal" onClick={() => setI(Math.min(live.length - 1, i + 1))} disabled={i >= live.length - 1}><Icon name="chevron" size={12} /></button>
                </span>}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {(p.state === "resolved" || (p.state === "tripped" && Object.keys(p.decisions).length > 0)) && <Log p={p} />}
    </div>
  );
}

/* ── C. Sentence: the tripwire written in the theory's own voice, flagged in place when it trips ── */
export function TripC(p: TripProps) {
  const [open, setOpen] = useState(true);
  const live = p.state === "tripped" ? pending(p) : [];
  return (
    <div className="dt-tc" role="group" aria-label={NAME}>
      <div className="dt-tc-line">
        <span className="dt-tc-lead">I'd change my mind if</span>{" "}
        <Editable className="dt-tc-phrase" value={p.text === TRIP_TEXT ? lower(p.text) : p.text} onChange={p.setText} onBlur={p.commit} placeholder="…" aria-label={NAME} singleLine
          data-tripped={p.state === "tripped" && live.length ? "" : undefined} data-empty={p.state === "empty" ? "" : undefined} />{p.state !== "empty" && "."}
        {p.state === "watching" && <span className="dt-tc-after"><Watch /></span>}
        {p.state === "tripped" && live.length > 0 && (
          <button className="dt-tc-flag" aria-expanded={open} onClick={() => setOpen(o => !o)} title={`${live.length} signals match`} aria-label={`${live.length} signals match`}>
            <Red /><span className="ap-ghost-badge">{live.length}</span>
          </button>
        )}
      </div>
      <Unfold show={p.state === "tripped" && open}>
        <div className="dt-hits dt-tc-hits">
          <AnimatePresence initial={false}>{HITS.map(h => <HitRow key={h.id} hit={h} decision={p.decisions[h.id]} onDecide={d => p.decide(h.id, d)} conf={p.conf} />)}</AnimatePresence>
        </div>
      </Unfold>
      {p.state === "resolved" && <Log p={p} />}
    </div>
  );
}
const lower = (s: string) => s && s[0].toLowerCase() + s.slice(1).replace(/\.$/, "");

/* ── D. Checklist: several conditions, each watched on its own ── */
export function TripD(p: TripProps) {
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<string[]>([]);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => { if (added.length) list.current?.querySelector<HTMLElement>(".dt-td-item:last-child [contenteditable]")?.focus(); }, [added.length]);
  const conds = p.state === "empty" ? [] : CONDS;
  const ids = [...conds.map(c => c.id), ...added];
  const hitsFor = (id: string) => p.state === "watching" || p.state === "empty" ? [] : (CONDS.find(c => c.id === id)?.hits ?? []);
  const live = ids.flatMap(id => hitsFor(id)).filter(h => !p.decisions[h.id]).length;
  return (
    <div className="dt-td" role="group" aria-label={NAME}>
      <div className="dt-td-head">
        <Icon name="turn" size={16} />
        <span className="ap-label">{NAME}</span>
        {ids.length > 0 && <span className="ap-num pn-field-val">{ids.length}</span>}
        {live > 0 && <Red />}
        <button className="pn-step" aria-label="Add a condition" title="Add a condition" onClick={() => setAdded(a => [...a, "n" + a.length])}><Icon name="plus" size={12} /></button>
      </div>
      <div className="dt-td-list" ref={list}>
        {ids.length === 0 && <Row glyph={<span className="dt-ring" />} text="" onText={p.setText} onBlur={p.commit} placeholder="A condition" />}
        {ids.map(id => {
          const c = CONDS.find(x => x.id === id);
          const hits = hitsFor(id);
          const open = hits.filter(h => !p.decisions[h.id]);
          const done = hits.filter(h => p.decisions[h.id]);
          const glyph = c?.resolved ? <Icon name="check" size={12} /> : open.length ? <Red /> : !c && !texts[id] ? <span className="dt-ring" /> : <Watch />;
          const status = c?.resolved ? <span className="ap-muted">Tripped {c.resolved.date.replace(/ \d{4}$/, "")}, {c.resolved.note.toLowerCase()}</span>
            : open.length ? <span className="dt-red">{open.length} match</span>
            : done.length ? <span className="ap-muted">{p.decisions[done[0].id] === "accepted" ? "Accepted" : "Dismissed"} 31 Oct</span> : null;
          return (
            <div key={id} className="dt-td-item" data-resolved={c?.resolved ? "" : undefined}>
              <Row glyph={glyph} text={texts[id] ?? c?.text ?? ""} onText={v => setTexts(t => ({ ...t, [id]: v }))} placeholder="A condition" status={status} autoFocus={!c} />
              {(open.length > 0 || (p.state === "resolved" && done.length > 0)) && (
                <div className="dt-hits dt-td-hits">
                  <AnimatePresence initial={false}>{hits.map(h => <HitRow key={h.id} hit={h} decision={p.decisions[h.id]} onDecide={d => p.decide(h.id, d)} conf={p.conf} compact />)}</AnimatePresence>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
function Row({ glyph, text, onText, placeholder, status, onBlur, autoFocus }: { glyph: ReactNode; text: string; onText: (v: string) => void; placeholder: string; status?: ReactNode; onBlur?: () => void; autoFocus?: boolean }) {
  return (
    <div className="dt-td-row">
      <span className="dt-td-glyph">{glyph}</span>
      <Editable className="dt-td-text" value={text} onChange={onText} onBlur={onBlur} placeholder={placeholder} aria-label="Condition" singleLine
        data-new={autoFocus ? "" : undefined} />
      {status && <span className="dt-td-status">{status}</span>}
    </div>
  );
}

/* ── E. Threshold: a metric, a line, and where the latest readings put it ── */
export function TripE(p: TripProps) {
  const empty = p.state === "empty";
  const [metric, setMetric] = useState(METRIC.name);
  const [th, setTh] = useState(METRIC.threshold);
  const tripped = p.state === "tripped" || p.state === "resolved";
  const fresh = tripped ? READING_TRIPPED : undefined;
  const latest = fresh ?? READINGS.at(-1)!;
  const hit = HITS[0];
  const pend = p.state === "tripped" && !p.decisions[hit.id];
  return (
    <div className="dt-te" role="group" aria-label={NAME}>
      <div className="dt-ta-head">
        <Icon name="turn" size={16} />
        <span className="ap-label">{NAME}</span>
        <span className="dt-ta-status">
          {p.state === "watching" && <><Watch /><span className="ap-muted ap-num">{Math.abs(latest.v - th)} points from the line</span></>}
          {empty && <><span className="dt-ring" /><span className="ap-muted">Not set</span></>}
          {pend && <><Red /><span className="dt-red">Over the line</span></>}
        </span>
      </div>
      <div className="dt-te-rule">
        <Editable className="dt-te-metric" value={empty ? "" : metric} onChange={setMetric} onBlur={p.commit} placeholder="Metric" aria-label="Metric" singleLine />
        <span className="ap-muted">falls by less than</span>
        <span className="pn-year" role="group" aria-label="Threshold">
          <button className="pn-step" aria-label="Lower threshold" title="Lower threshold" onClick={() => setTh(t => Math.max(-90, t - 10))} disabled={empty}><Icon name="minus" size={12} /></button>
          <span className="ap-num dt-te-th">{empty ? "–" : `${-th}%`}</span>
          <button className="pn-step" aria-label="Raise threshold" title="Raise threshold" onClick={() => setTh(t => Math.min(0, t + 10))} disabled={empty}><Icon name="plus" size={12} /></button>
        </span>
        <span className="ap-muted">in a year</span>
      </div>
      <Gauge th={th} readings={empty ? [] : READINGS} fresh={fresh} pending={pend} empty={empty} />
      {pend && <div className="dt-hits"><HitRow hit={{ ...hit, why: `Puts the year at −${-READING_TRIPPED.v}%, short of −${-th}%` }} onDecide={d => p.decide(hit.id, d)} conf={p.conf} /></div>}
      {p.state === "resolved" && <Log p={p} hits={[hit]} />}
    </div>
  );
}

function Gauge({ th, readings, fresh, pending, empty }: { th: number; readings: typeof READINGS; fresh?: typeof READING_TRIPPED; pending: boolean; empty: boolean }) {
  const [tip, setTip] = useState<number>();
  const x = (v: number) => ((v - METRIC.min) / (METRIC.max - METRIC.min)) * 100;
  const all = fresh ? [...readings, fresh] : readings;
  return (
    <div className="dt-gauge" data-empty={empty ? "" : undefined}>
      <div className="dt-gauge-track">
        <div className="dt-gauge-zone" style={{ left: `${x(th)}%` }} />
        <motion.div className="dt-gauge-th" animate={{ left: `${x(th)}%` }} transition={{ duration: 0.3, ease: EASE }} />
        {all.map((r, i) => {
          const last = i === all.length - 1;
          return (
            <button key={r.date} className="dt-gauge-dot" data-last={last ? "" : undefined} data-pending={last && pending ? "" : undefined} data-over={r.v > th ? "" : undefined}
              style={{ left: `${x(r.v)}%` }} aria-label={`${r.date}: ${r.v}%, ${r.gist}`}
              onPointerEnter={() => setTip(i)} onPointerLeave={() => setTip(undefined)} onFocus={() => setTip(i)} onBlur={() => setTip(undefined)} />
          );
        })}
        <AnimatePresence>
          {tip !== undefined && all[tip] && (
            <motion.div className="dt-gauge-tip" style={{ left: `${x(all[tip].v)}%` }} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <strong className="ap-num">−{-all[tip].v}%</strong> <span className="ap-muted">{all[tip].date}</span><br />{all[tip].gist}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="dt-gauge-axis ap-num">
        <span style={{ left: "0%" }}>−{-METRIC.min}%</span>
        <span style={{ left: `${x(0)}%` }}>0</span>
        {!empty && <span className="dt-gauge-thlabel" style={{ left: `${x(th)}%` }}>−{-th}%</span>}
        <span style={{ left: "100%" }}>+{METRIC.max}%</span>
      </div>
    </div>
  );
}
