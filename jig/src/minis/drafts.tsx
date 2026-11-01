import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export type DraftPolicy = "stack-by-age" | "expire-30" | "fade";

const DRAFTS = [
  { id: "a", claim: "Local models absorb everyday work", age: 1 },
  { id: "b", claim: "Inference moves to the edge", age: 4 },
  { id: "c", claim: "Labs bundle agents with compute", age: 9 },
  { id: "d", claim: "Token prices stop falling", age: 18 },
  { id: "e", claim: "Open weights lead on cost", age: 26 },
];

export function DraftsMini({ policy, days }: { policy: DraftPolicy; days: number }) {
  const [open, setOpen] = useState(false);
  let drafts = DRAFTS.map(d => ({ ...d, age: d.age + days }));
  const expired = policy === "expire-30" ? drafts.filter(d => d.age > 30).length : 0;
  if (policy === "expire-30") drafts = drafts.filter(d => d.age <= 30);

  const fresh = policy === "stack-by-age" ? drafts.filter(d => d.age <= 14) : drafts;
  const shown = open ? drafts : fresh.slice(0, 3);
  const stacked = drafts.length - shown.length;

  return (
    <div className="wf">
      <div className="wf-theme"><strong>Cost of intelligence</strong><span className="wf-mono">23 signals</span></div>
      <div className="wf-row">
        <div className="wf-card"><b>Tokens become nearly free</b></div>
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map(d => (
            <motion.div key={d.id} layout className="wf-card wf-draft"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: policy === "fade" ? Math.max(0.3, 1 - d.age / 60) : 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}>
              <b>{d.claim}</b><span className="wf-mono">{d.age}d old</span>
            </motion.div>
          ))}
          {stacked > 0 && (
            <motion.button key="stack" layout className="wf-card wf-draft dr-stack" onClick={() => setOpen(true)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <b>+{stacked} {policy === "stack-by-age" ? "older" : "more"}</b>
            </motion.button>
          )}
        </AnimatePresence>
        {open && <button className="wf-btn" onClick={() => setOpen(false)}>Collapse</button>}
      </div>
      {expired > 0 && <div className="wf-empty">{expired} expired and tombstoned</div>}
    </div>
  );
}
