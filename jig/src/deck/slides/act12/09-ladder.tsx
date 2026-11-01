import type { ReactNode } from "react";
import { Copy, Enter } from "../../parts";
import { Conf, Icon, type ObjectKind } from "../../../homes/atoms";
import { DUMPS, PROTOTYPES, signal, theme, theory } from "../../../homes/data";
import { ConfidenceSpark } from "../../../homes/confidence-spark";
import { stancesFor } from "../../../homes/histories";

export const notes = `Here's one example all the way up. On a walk I dump three links and a ramble about small models. An agent splits that into signals, like a lab cutting its prices again, and files them under a theme, the cost of intelligence. From there I state a theory I could be wrong about: tokens become nearly free for routine work, by 2028. And if I believe that, it's worth building something on it, so it becomes a prototype idea.`;

const dump = DUMPS.find(d => d.id === "D1")!, sig = signal("s1"), th = theme("cost"), t = theory("t1"), proto = PROTOTYPES.find(p => p.id === "p1")!;

const STEPS: { kind: ObjectKind; label: string; body: ReactNode }[] = [
  { kind: "dump", label: "Dump", body: <><p>{dump.first}</p><p className="dk-meta">Today, {dump.time}</p></> },
  { kind: "signal", label: "Signal", body: <><p>{sig.gist}</p><p className="dk-meta a12-inline"><i className="a12-dot" />{sig.source}, today</p></> },
  { kind: "theme", label: "Theme", body: <><p className="dk-strong">{th.name}</p><p className="dk-meta">{th.signals} signals, {th.fresh} new this week</p></> },
  { kind: "theory", label: "Theory", body: <><p className="dk-strong">{t.claim}</p><div className="a12-claim-meta"><span className="a12-conf"><Conf n={t.confidence} /></span><span className="a12-spark"><ConfidenceSpark stances={stancesFor(t.id, [], t.confidence)} variant="A" /></span></div></> },
  { kind: "prototype", label: "Prototype", body: <><p className="dk-strong">{proto.name}</p><p className="dk-meta">Idea</p></> },
];

export default function LadderSlide() {
  return (
    <div className="dk-slide a12-top">
      <Copy headline="From a ramble to something I can build." support="Five steps, one example: what I noticed about cheap models." />
      <div className="a12-ladder">
        {STEPS.map((s, k) => (
          <Enter key={s.kind} delay={0.3 + k * 0.14} className="a12-rung" style={{ marginTop: k * 34 }}>
            <p className={`a12-rung-label${s.kind === "theory" ? " a12-jade" : " dk-meta"}`}><span className="a12-well" data-kind={s.kind}><Icon name={s.kind} size={20} /></span>{s.label}</p>
            <div className="a12-rung-card" data-key={s.kind === "theory" ? "" : undefined}>{s.body}</div>
          </Enter>
        ))}
      </div>
      <Enter delay={1.1} className="a12-spans">
        <span className="dk-meta" style={{ gridColumn: "1 / 4" }}>Seen</span>
        <span className="a12-jade" style={{ gridColumn: "4 / 5" }}>Claimed</span>
        <span className="dk-meta" style={{ gridColumn: "5 / 6" }}>Made</span>
      </Enter>
    </div>
  );
}
