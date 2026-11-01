import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SIGNALS } from "./data";
import { Icon } from "./atoms";
import { Claim, Editable, SignalRow } from "./panes";
import { LEVELS } from "./details-data";
import "./homes.css";
import "./panes.css";
import "./details.css";

/* A realistic slice of the theory pane, with slots for the detail under study. */

export { EASE } from "./tripwire";
const noop = () => {};

export function ConfSteps({ conf, onChange }: { conf: number; onChange: (n: number) => void }) {
  return (
    <span className="pn-conf" role="radiogroup" aria-label="Confidence">
      {[1, 2, 3, 4, 5].map(i => <button key={i} role="radio" aria-checked={i === conf} aria-label={`${i} of 5, ${LEVELS[i]}`} title={`${i} of 5, ${LEVELS[i]}`} data-on={i <= conf ? "" : undefined} onClick={() => onChange(i)} />)}
    </span>
  );
}

export function PaneSlice({ width, conf, onConf, confExtra, challenged, trip, evidence = true, body = true }: {
  width: number; conf: number; onConf: (n: number) => void; confExtra?: ReactNode; challenged?: boolean;
  trip?: ReactNode; evidence?: boolean; body?: boolean;
}) {
  const [claim, setClaim] = useState("Tokens become nearly free for routine work");
  const [text, setText] = useState("Small models keep getting cheaper faster than demand grows. Routine agent work stops being metered in any way I notice.");
  const [open, setOpen] = useState<string>();
  const sup = SIGNALS.filter(s => ["s1", "s2"].includes(s.id)), und = SIGNALS.filter(s => s.id === "s3");
  return (
    <div className="ap dt-pane" style={{ width }}>
      <div className="pn-doc dt-doc">
        <div className="pn-chips"><span className="pn-chip pn-static"><Icon name="theme" size={12} />Cost of intelligence</span></div>
        <Editable as="h1" className="pn-title" value={claim} onChange={setClaim} singleLine aria-label="Claim" />
        <dl className="pn-meta">
          <div className="pn-meta-row"><dt className="ap-label">Confidence</dt><dd>
            <ConfSteps conf={conf} onChange={onConf} />
            {confExtra}
            <span className="dt-level">{LEVELS[conf]}</span>
            <AnimatePresence initial={false}>
              {challenged && <motion.span key="ch" className="dt-markwrap" initial={{ opacity: 0, scale: 0.25 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.25 }} transition={{ type: "spring", duration: 0.3, bounce: 0 }}>
                <span className="ap-mark" data-kind="challenge" title="Challenged" aria-label="Challenged" />
              </motion.span>}
            </AnimatePresence>
          </dd></div>
          <div className="pn-meta-row"><dt className="ap-label">Happens by</dt><dd><span className="ap-num pn-field-val">2028</span></dd></div>
          <div className="pn-meta-row"><dt className="ap-label">Rival</dt><dd className="pn-rivals">
            <span className="pn-chip pn-rival pn-static"><Icon name="swap" size={12} /><span><Claim id="t2" /></span></span>
          </dd></div>
        </dl>
        {body && <Editable className="pn-body" value={text} onChange={setText} aria-label="Body" />}
        {trip}
        {evidence && (
          <div className="pn-grid">
            {[["Supports", sup, "arrowUp"], ["Undermines", und, "arrowDown"]].map(([name, items, ic]) => (
              <div key={name as string} className="pn-col">
                <div className="pn-ev-head"><Icon name={ic as "arrowUp"} size={12} /><span className="ap-label">{name as string}</span><span className="ap-num pn-field-val">{(items as typeof sup).length}</span></div>
                {(items as typeof sup).map(s => <SignalRow key={s.id} s={s} context="t1" open={open === s.id} onToggle={() => setOpen(o => o === s.id ? undefined : s.id)} onOpen={noop} />)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── A small segmented control ── */
export function Seg<K extends string>({ value, options, onChange, label }: { value: K; options: { key: K; label: string }[]; onChange: (k: K) => void; label: string }) {
  return (
    <span className="dt-seg" role="radiogroup" aria-label={label}>
      {options.map(o => <button key={o.key} type="button" role="radio" aria-checked={o.key === value} onClick={() => onChange(o.key)}>{o.label}</button>)}
    </span>
  );
}

export { HitRow, type Decision } from "./tripwire";
