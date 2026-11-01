import { motion } from "motion/react";
import { Copy, EASE } from "../parts";

export const notes = `When I do have a hunch, it lives in my head as a bare sentence. I couldn't tell you which things I saw led me to it, how sure I am, or what would make me drop it. So I never find out if I was right, and I never get better at this.`;

const SLOTS: { label: string; hint: string; key?: boolean }[] = [
  { label: "Rests on", hint: "Nothing I could point to" },
  { label: "Would be wrong if", hint: "No idea", key: true },
];

const appear = (delay: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: EASE, delay },
});

export default function HunchSlide() {
  return (
    <div className="dk-slide">
      <Copy headline="My hunches stay vague." support="I can't say what they rest on, how sure I am, or what would prove them wrong." />
      <div className="dk-visual">
        <motion.div className="dk-card dk-hunch" style={{ top: 196 }} {...appear(0.2)}>
          <div className="dk-field">
            <p className="dk-meta">Hunch</p>
            <p className="dk-hunch-claim">Most software will be written for an audience of one.</p>
          </div>
          {SLOTS.map((s, k) => (
            <motion.div key={s.label} className="dk-field" {...appear(0.55 + k * 0.15)}>
              <p className="dk-meta">{s.label}</p>
              <div className="dk-slot" data-key={s.key ? "" : undefined}>{s.hint}</div>
            </motion.div>
          ))}
          <motion.div className="dk-row" {...appear(0.85)}>
            <p className="dk-meta">How sure</p>
            <span className="dk-conf"><i /><i /><i /><i /><i /></span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
