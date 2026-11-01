import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Copy, EASE } from "../../parts";
import { PaneSlice } from "../../../homes/details-pane";
import { ConfidenceSpark } from "../../../homes/confidence-spark";
import { Tripwire } from "../../../homes/tripwire";
import { stancesFor } from "../../../homes/histories";

export const notes = `This is the same theory as it actually lives in Aber. A short claim I could lose. Evidence on both sides, because a theory with only supporting evidence is a mood board. A confidence level with its whole history, each move dated and explained. A year it should happen by. And the bit I care most about: one sentence saying what would change my mind, which agents then watch for.`;

const noop = () => {};
const TRIP = "small-model prices stop falling for a year";

// Each callout points at a part of the real theory pane, found by selector and measured after layout.
const PARTS = [
  { sel: ".pn-title", label: "A claim I could lose" },
  { sel: ".pn-meta-row:nth-child(1) dd", label: "How sure, and every move" },
  { sel: ".pn-meta-row:nth-child(2) dd", label: "When it should happen by" },
  { sel: ".tw-tc", label: "What would change my mind", key: true },
  { sel: ".pn-grid", label: "Evidence for and against" },
];

export default function AnatomySlide() {
  const root = useRef<HTMLDivElement>(null);
  const [ys, setYs] = useState<number[]>([]);
  const [edge, setEdge] = useState(0);

  useLayoutEffect(() => {
    const el = root.current; if (!el) return;
    const box = el.getBoundingClientRect(), k = box.width / 1600;
    const pane = el.querySelector(".a12-pane")!.getBoundingClientRect();
    setEdge((pane.right - box.left) / k);
    setYs(PARTS.map(p => {
      const r = el.querySelector(p.sel)!.getBoundingClientRect();
      return (r.top + Math.min(r.height, 60) / 2 - box.top) / k;
    }));
  }, []);

  return (
    <div className="dk-slide a12-anat" ref={root}>
      <Copy headline="A theory is a claim that could lose." support="The same example, held properly." />
      <motion.div className="a12-pane" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}>
        <PaneSlice width={400} conf={3} onConf={noop} body={false}
          confExtra={<ConfidenceSpark stances={stancesFor("t1", [], 3)} variant="A" />}
          trip={<Tripwire state="watching" text={TRIP} setText={noop} commit={noop} hits={[]} decisions={{}} decide={noop} conf={3} />} />
      </motion.div>
      {ys.map((y, k) => (
        <motion.div key={PARTS[k].sel} className="a12-callout" data-key={PARTS[k].key ? "" : undefined} style={{ top: y, left: edge + 8 }}
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 0.7 + k * 0.12 }}>
          <i />{PARTS[k].label}
        </motion.div>
      ))}
    </div>
  );
}
