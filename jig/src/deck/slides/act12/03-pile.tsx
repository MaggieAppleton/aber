import { motion } from "motion/react";
import { Copy, EASE } from "../../parts";
import { Icon } from "../../../homes/atoms";

export const notes = `So I pay attention. I save things constantly: links, screenshots, voice memos on walks, half-sentences in my notes app. Saving is the easy part, and the tools for it are excellent. Turning the pile into an actual opinion about what happens next is the hard part, and nothing helps with that, so mostly it doesn't happen.`;

type Piece = { x: number; y: number; r: number; children: React.ReactNode; className?: string };

const WAVE = [40, 70, 55, 90, 65, 35, 80, 100, 60, 45, 75, 50, 85, 40, 60, 30, 70, 55, 40, 25];

// Back to front: filler underneath, the few real strings on top.
const PIECES: Piece[] = [
  { x: 330, y: -40, r: 4, children: <><div className="dk-shot" /><span className="dk-bar" style={{ width: "55%" }} /></> },
  { x: 380, y: 640, r: -3, children: <><span className="dk-bar" style={{ width: "70%" }} /><span className="dk-bar" style={{ width: "45%" }} /><span className="dk-bar" style={{ width: "60%" }} /></> },
  { x: 40, y: 90, r: -3, className: "dk-link", children: <><span className="dk-favicon a12-well"><Icon name="link" size={20} /></span><div><p className="dk-strong">The end of the app as we know it</p><p className="dk-meta">Saved in March</p></div></> },
  { x: 250, y: 300, r: 2.5, className: "dk-memo", children: <><span className="dk-play" /><span className="dk-wave">{WAVE.map((h, k) => <i key={k} style={{ height: `${h}%` }} />)}</span><span className="dk-meta">0:42</span></> },
  { x: 0, y: 470, r: -1.5, children: <><p>agents + local-first?? something here</p><p className="dk-meta">Note, 2 months ago</p></> },
  { x: 0, y: 690, r: 2, className: "a12-count", children: <><p className="dk-strong">Bookmarks</p><p className="dk-meta a12-inline"><i className="a12-dot" />1,284 saved, 12 this week</p></> },
  { x: 300, y: 560, r: 3.5, className: "dk-link", children: <><span className="dk-favicon a12-well"><Icon name="link" size={20} /></span><div><p className="dk-strong">Why every startup is an agent company now</p><p className="dk-meta a12-inline"><i className="a12-dot" />Saved today</p></div></> },
];

export default function PileSlide() {
  return (
    <div className="dk-slide">
      <Copy headline="I save everything and conclude nothing." support="Saving is easy. Turning links, screenshots and voice memos into a point of view isn't." />
      <div className="dk-visual">
        <div className="dk-pile">
          {PIECES.map((p, k) => (
            <motion.div
              key={k}
              className={`dk-card ${p.className ?? ""}`}
              style={{ left: p.x, top: p.y }}
              initial={{ opacity: 0, y: -24, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: p.r }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.2 + k * 0.08 }}
            >
              {p.children}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
