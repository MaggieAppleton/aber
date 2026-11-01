import type { ReactNode } from "react";
import { Copy, Enter } from "../../parts";
import { Icon } from "../../../homes/atoms";
import { ConfidenceSpark } from "../../../homes/confidence-spark";
import { stancesFor } from "../../../homes/histories";

export const notes = `People who are measurably good at forecasting, Tetlock's superforecasters, aren't psychic. They write the prediction down, tie it to evidence, say what would prove it wrong, and update in small steps when the world pushes back. Then they keep score. I wanted a tool that makes those four habits the default for my own hunches about technology.`;

// Each habit, with the small piece of Aber that holds it.
const HABITS: { word: string; line: string; bit: ReactNode }[] = [
  { word: "Stated", line: "Written down, not a mood",
    bit: <span className="a12-bit"><span className="a12-well a12-well-jade"><Icon name="theory" size={18} /></span><span className="dk-strong">Tokens become nearly free</span></span> },
  { word: "Evidenced", line: "Tied to what I've seen",
    bit: <span className="a12-bit"><span className="a12-inline a12-pos"><Icon name="arrowUp" size={18} />5 for</span><span className="a12-inline dk-meta"><Icon name="arrowDown" size={18} />2 against</span></span> },
  { word: "Falsifiable", line: "Says what would prove it wrong",
    bit: <span className="a12-bit dk-meta"><Icon name="turn" size={20} /><span>I'd change my mind if <span className="a12-dotted">…</span></span></span> },
  { word: "Updated", line: "Every change of mind is kept",
    bit: <span className="a12-bit a12-spark"><ConfidenceSpark stances={stancesFor("t1", [], 3)} variant="A" /></span> },
];

export default function QuestionSlide() {
  return (
    <div className="dk-slide">
      <Copy headline="What if I held theories the way good forecasters do?" support="Superforecasters aren't psychic. They just keep score." />
      <div className="dk-visual a12-habits">
        {HABITS.map((h, k) => (
          <Enter key={h.word} delay={0.3 + k * 0.12} className="a12-habit">
            <div className="a12-habit-text">
              <p className="a12-habit-word">{h.word}</p>
              <p className="dk-meta">{h.line}</p>
            </div>
            {h.bit}
          </Enter>
        ))}
      </div>
    </div>
  );
}
