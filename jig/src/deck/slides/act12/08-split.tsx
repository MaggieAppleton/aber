import { Copy, Enter } from "../../parts";
import { Conf } from "../../../homes/atoms";
import { SIGNALS, theory } from "../../../homes/data";
import { ConfidenceSpark } from "../../../homes/confidence-spark";
import { stancesFor } from "../../../homes/histories";

export const notes = `So the core move in Aber is a split. On one side is everything I've seen: dumps, signals, themes. It's allowed to be messy and plentiful, and agents can help sort it. On the other side are the few things I actually claim. Those are written by me, carry a confidence, and are allowed to be wrong.`;

const SEEN = ["s1", "s3", "s5", "s10", "s12", "s13"].map(id => SIGNALS.find(s => s.id === id)!);
const CLAIMED = ["t1", "t4"].map(theory);

export default function SplitSlide() {
  return (
    <div className="dk-slide a12-top">
      <Copy headline="Keep what I've seen apart from what I claim." support="Observations can pile up. Claims are few, mine, and allowed to be wrong." />
      <Enter delay={0.25} className="a12-half a12-seen">
        <p className="dk-meta a12-half-label">What I've seen</p>
        <div className="a12-sigs">
          {SEEN.map(s => (
            <div key={s.id} className="a12-sig"><span className="a12-inline">{s.day === "Today" ? <i className="a12-dot" /> : <i className="a12-dot" data-tone="none" />}{s.gist}</span><span className="dk-meta">{s.source}</span></div>
          ))}
        </div>
      </Enter>
      <Enter delay={0.45} className="a12-half a12-claimed">
        <p className="a12-half-label a12-jade">What I claim</p>
        <div className="a12-claims">
          {CLAIMED.map(t => (
            <div key={t.id} className="a12-claim">
              <p className="dk-strong">{t.claim}</p>
              <div className="a12-claim-meta"><span className="a12-conf"><Conf n={t.confidence} /></span><span className="a12-spark"><ConfidenceSpark stances={stancesFor(t.id, [], t.confidence)} variant="A" /></span><span className="dk-meta">By {t.horizon}</span></div>
            </div>
          ))}
        </div>
      </Enter>
    </div>
  );
}
