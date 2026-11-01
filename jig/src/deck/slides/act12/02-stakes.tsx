import { motion } from "motion/react";
import { Copy, EASE } from "../../parts";
import { Icon } from "../../../homes/atoms";

export const notes = `Strategy is mostly prediction wearing a suit. Every roadmap, hire and pricing model is a bet that the world will look a certain way in a couple of years. But the prediction underneath is almost never written down, so nobody checks it. If it's wrong, we find out late, and we can't even say which guess it was.`;

const Q = 230; // one quarter's width on the roadmap
// Each bet sits on the roadmap in its quarters; the assumption under it is what the plan quietly depends on.
const BETS = [
  { lane: 0, from: 0, span: 4, bet: "Charge per seat for the next three years", assumes: "People, not agents, use our software" },
  { lane: 1, from: 0, span: 2, bet: "Hire two more engineers", assumes: "Writing the code is still the slow part" },
  { lane: 2, from: 1, span: 2, bet: "Build on the cheapest small model", assumes: "Token prices keep falling" },
];
// Filler work items in the gaps: [lane, from, span]
const FILL = [[1, 3, 1], [2, 0, 1], [3, 0, 2], [3, 2, 2]];

export default function StakesSlide() {
  return (
    <div className="dk-slide">
      <Copy headline="Strategy is a prediction business." support="Every roadmap, hire and bet rests on a guess about where things are going." />
      <div className="dk-visual">
        <motion.div className="a12-road" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}>
          <div className="a12-road-head">
            <p className="dk-strong">Roadmap 2027</p>
            {["Q1", "Q2", "Q3", "Q4"].map((q, k) => <span key={q} className="dk-meta" style={{ left: 28 + k * Q }}>{q}</span>)}
          </div>
          {[1, 2, 3, 4].map(k => <i key={k} className="a12-road-rule" style={{ left: 16 + k * Q }} />)}
          {FILL.map(([l, f, n], k) => <span key={k} className="a12-road-fill" style={{ top: 112 + l * 172, left: 28 + f * Q, width: n * Q - 24 }} />)}
          {BETS.map((b, k) => (
            <div key={b.bet} className="a12-road-item" style={{ top: 96 + b.lane * 172, left: 28 + b.from * Q, width: b.span * Q - 24 }}>
              <motion.p className="a12-road-bet dk-strong" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.35 + k * 0.1 }}>{b.bet}</motion.p>
              <motion.p className="a12-assumes" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 1 + k * 0.2 }}>
                <span className="a12-well a12-well-jade"><Icon name="theory" size={16} /></span>
                <span><span className="dk-meta">Assumes </span>{b.assumes}</span>
              </motion.p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
