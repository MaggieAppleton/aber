import { motion } from "motion/react";
import { Copy, EASE } from "../../parts";
import { Icon } from "../../../homes/atoms";

export const notes = `When I do get to a hunch, it stays in my head as a bare sentence. I couldn't tell you which of the things I saw led me there, how sure I am, or what would make me drop it. A hunch nobody wrote down can't be wrong, which feels safe, but it also means I never find out whether I was right.`;

const SLOTS: { label: string; hint: string }[] = [
  { label: "Rests on", hint: "Nothing I could point to" },
  { label: "Would be wrong if", hint: "No idea" },
];

const appear = (delay: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: EASE, delay },
});

export default function HunchSlide() {
  return (
    <div className="dk-slide">
      <Copy headline="My hunches never get written down." support="So I can't say what they rest on, and nothing could ever prove them wrong." />
      <div className="dk-visual">
        <motion.div className="dk-card a12-scrap" style={{ left: 330, top: 92 }} initial={{ opacity: 0, y: 10, rotate: 0 }} animate={{ opacity: 1, y: 0, rotate: 2.5 }} transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}>
          <p className="dk-meta">Notes, Tuesday 23:41</p>
          <p>everyone making their own apps?? feels like the start of something</p>
        </motion.div>
        <motion.div className="dk-card dk-hunch" style={{ top: 236 }} {...appear(0.25)}>
          <div className="dk-field">
            <p className="dk-meta">Hunch</p>
            <p className="dk-hunch-claim">Most software will be written for <mark className="a12-mark">an audience of one</mark>.</p>
          </div>
          {SLOTS.map((s, k) => (
            <motion.div key={s.label} className="dk-field" {...appear(0.55 + k * 0.15)}>
              <p className="dk-meta">{s.label}</p>
              <div className="dk-slot a12-slot"><span className="a12-well"><Icon name="questionMark" size={16} /></span>{s.hint}</div>
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
