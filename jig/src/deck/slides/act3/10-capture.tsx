import { useRef } from "react";
import { MotionConfig } from "motion/react";
import { useState } from "react";
import { Copy } from "../../parts";
import { BriefingView } from "../../../homes/briefing-app";
import { DumpOrAsk, PhoneFrame, useDump } from "../../../homes/pill-study";
import { DumpLog, useDumpLog, useLogFromDump } from "../../../homes/dump-log";
import { motion } from "motion/react";
import { EASE } from "../../parts";
import { AppAt, Cursor, useInert, useScript } from "./stage";
import "../../../homes/homes.css";
import "../../../homes/app-shell.css";

export const notes = `Capture has to be faster than forgetting. On a walk I tap the mic on the pill and just talk; it transcribes as I go. When I stop, the note turns into signals, already filed under Cost of intelligence and Personal software, plus a draft theory I can take or leave. Point at the filed tokens: each signal keeps a link back to the voice note it came from.`;

const PW = 390, PH = 844, S = 1.2, LOG_W = 300, LS = 1.35;

export default function CaptureSlide() {
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const { s, api } = useDump({ ctx: [] });
  const log = useDumpLog();
  useLogFromDump(s, log.api);
  const [showLog, setShowLog] = useState(false);
  useInert(root);
  const cursor = useScript(layer, PW, async k => {
    await k.wait(1200);
    await k.move('[data-target="mic"]');
    await k.click('[data-target="mic"]');
    await k.wait(4200);
    await k.move('[data-target="stop"]');
    await k.click('[data-target="stop"]');
    await k.wait(2400);
    setShowLog(true);
    await k.wait(900);
    const filed = k.q(".ps-filed");
    if (filed) { await k.move(filed); await k.click(filed); await k.wait(500); k.hide(); }
  }, { x: PW * 0.75, y: PH + 80 });
  return (
    <div className="dk-slide a3" ref={root}>
      <Copy headline="Dump it in seconds." support="Talk into the pill. A minute later it's signals, filed in themes, each linked back to the note." />
      <AppAt layer={layer} x={1040} y={860 - PH * S} scale={S} w={PW} h={PH}>
        <MotionConfig reducedMotion="user">
          <div className="a3-phone">
            <PhoneFrame>
              <div ref={frame} className="ps-frame ap aph" data-variant="P" style={{ width: PW, height: PH }}>
                <BriefingView phone host={{ onOpen: () => {} }} />
                <DumpOrAsk variant="P" corner s={s} api={api} w={PW} h={PH} frameRef={frame} sees={[{ label: "Briefing", kind: "screen" }]} keys={false} live={false} />
              </div>
            </PhoneFrame>
          </div>
        </MotionConfig>
        <Cursor c={cursor} touch />
      </AppAt>
      {/* The dump log: the same note, and what it became */}
      <motion.div className="a3-satpos" style={{ left: 660, top: 470 }}
        initial={false} animate={showLog ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }} transition={{ duration: 0.6, ease: EASE }}>
        <div className="a3-sat a3-log ap" style={{ width: LOG_W, transform: `scale(${LS})` }} aria-hidden>
          <DumpLog entries={log.entries} bin={log.bin} api={log.api} onClose={() => {}} />
        </div>
      </motion.div>
    </div>
  );
}
