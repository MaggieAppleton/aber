import { useLayoutEffect, useRef } from "react";
import { Copy } from "../../parts";
import { AppShell, APP_W, APP_H } from "../../../homes/app-shell";
import { AppAt, Cursor, resetTheory, useInert, useScript } from "./stage";
import { motion } from "motion/react";
import { EASE } from "../../parts";
import { Icon } from "../../../homes/atoms";
import { HistA } from "../../../homes/confidence-spark";
import { stancesFor } from "../../../homes/histories";
import { useEdit } from "../../../homes/edits";

export const notes = `Every theory has a sentence for what would change my mind, and an agent watches new signals against it. This one tripped: a big assistant pulled its memory feature after privacy complaints. The red is the only red in the app, and it means exactly this. I accept the challenge, confidence drops one step, and the line in the little history chart keeps a note of why, so I can see how I got here.`;

const S = 1.15, PANE_LEFT = 528, AT = 680;

export default function TripwireSlide() {
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  // Start from the seeded challenge, and put it back on the way out so the Briefing and the views still show it.
  useLayoutEffect(() => { resetTheory("t3"); return () => resetTheory("t3"); }, []);
  useInert(root);
  const cursor = useScript(layer, APP_W, async k => {
    const card = k.q('.cur-card[data-pick="t3"] [role="button"]');
    card?.click();
    await k.wait(4400);
    const accept = k.q(".tw-accept");
    if (accept) { await k.move(accept); await k.wait(300); await k.click(accept); }
    await k.wait(900);
    k.hide();
  }, { x: 1100, y: 900 });
  return (
    <div className="dk-slide a3 a3-trip" ref={root}>
      <AppAt layer={layer} x={AT - PANE_LEFT * S} y={56} scale={S} w={APP_W} h={APP_H} fade={{ left: AT, soft: 1 }}>
        <AppShell initial="current" />
        <Cursor c={cursor} />
      </AppAt>
      <History />
      <Copy headline="Then the news disagrees with me." support="A signal matched what would change my mind. Accepting lowers my confidence a step, and keeps the note." />
    </div>
  );
}

/** The theory's confidence history, zoomed: the real sparkline and its log, newest first. Arrives once the challenge is accepted. */
function History() {
  const [edit] = useEdit("theory", "t3");
  const s = stancesFor("t3", edit.log, edit.confidence);
  const rows = s.map((st, i) => ({ st, d: i ? st.level - s[i - 1].level : 0 })).slice(-1);
  return (
    <motion.div className="a3-satpos" style={{ left: 450, top: 690 }} initial={false}
      animate={edit.log.length ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }} transition={{ duration: 0.6, ease: EASE, delay: 0.5 }}>
      <div className="a3-sat a3-hist ap" style={{ transform: "scale(1.35)" }} aria-hidden>
        <div className="a3-hist-head"><span className="ap-label">Confidence</span><span className="a3-hist-spark"><HistA stances={s} /></span></div>
        <div className="cs-log">
          {rows.map(({ st, d }) => (
            <span key={st.id} className="cs-row">
              <span className="ap-muted">{st.short}</span>
              <span className="cs-d" data-tone={d === 0 ? "flat" : d > 0 ? "up" : st.challenge ? "challenge" : "down"}><Icon name={d > 0 ? "arrowUp" : "arrowDown"} size={12} />{st.level}</span>
              <span>{st.note}</span>
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
