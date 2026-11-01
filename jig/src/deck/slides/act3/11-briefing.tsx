import { useRef } from "react";
import { motion } from "motion/react";
import { Copy, EASE } from "../../parts";
import { Icon, Mark, type IconName } from "../../../homes/atoms";
import { AppShell, APP_W, APP_H } from "../../../homes/app-shell";
import { AppAt, Cursor, useInert, useScript, type Script } from "./stage";

export const notes = `While I sleep, background agents do the boring part: file new signals, merge near-duplicates, link evidence to theories and check my tripwires. In the morning I get a Briefing. It's grouped by what needs me: challenges first, then drafts, suggestions, what got merged on its own, and new signals by theme. Point at Merged: the same price cut from two sources became one signal, and I can undo that with one click.`;

const S = 1.3;

/* What the background agents did between 22:40 and the morning, counted from the seed Briefing. */
const JOBS: { icon: IconName; text: string; time: string; mark?: "fresh" | "challenge" }[] = [
  { icon: "signal", text: "Filed 10 signals", time: "23:52", mark: "fresh" },
  { icon: "merge", text: "Merged 1 repeat", time: "01:14" },
  { icon: "chain", text: "Linked 3 as evidence", time: "03:40" },
  { icon: "turn", text: "1 tripwire tripped", time: "05:05", mark: "challenge" },
];

/** Scrolls an element smoothly, like a reader would. */
async function glide(k: Script, el: HTMLElement | null, to: number, ms: number) {
  if (!el) return;
  const from = el.scrollTop, t0 = performance.now();
  if (k.reduced) { el.scrollTop = to; return; }
  await new Promise<void>(res => {
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms), e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      el.scrollTop = from + (to - from) * e;
      if (p < 1 && el.isConnected) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
}

export default function BriefingSlide() {
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  useInert(root);
  const cursor = useScript(layer, APP_W, async k => {
    await k.wait(1800);
    const scroller = k.q(".br-scroll");
    const merged = [...(layer.current?.querySelectorAll<HTMLElement>(".br-group-name") ?? [])].find(h => h.textContent?.startsWith("Merged"));
    const to = merged && scroller ? merged.getBoundingClientRect().top - scroller.getBoundingClientRect().top : 0;
    await glide(k, scroller, scroller ? scroller.scrollTop + to / ((layer.current!.getBoundingClientRect().width / APP_W)) - 220 : 0, 4200);
    await k.wait(500);
    const count = k.q(".br-count");
    if (count) { await k.move(count); await k.click(count); await k.wait(700); k.hide(); }
  }, { x: 1100, y: 900 });
  return (
    <div className="dk-slide a3" ref={root}>
      <AppAt layer={layer} x={1160 - (APP_W / 2) * S} y={48} scale={S} w={APP_W} h={APP_H} fade={{ left: 700 }}>
        <AppShell initial="briefing" />
        <Cursor c={cursor} />
      </AppAt>
      <div className="a3-satpos" style={{ left: 476, top: 628 }}>
        <div className="a3-sat a3-jobs ap" style={{ transform: "scale(1.22)" }} aria-hidden>
          <p className="ap-label a3-jobs-head">Overnight</p>
          {JOBS.map((j, i) => (
            <motion.div key={j.text} className="a3-job" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 0.5 + i * 0.25 }}>
              <span className="a3-job-well" data-mark={j.mark}><Icon name={j.icon} size={13} /></span>
              <span>{j.text}</span>
              {j.mark ? <Mark kind={j.mark} /> : <span />}
              <span className="ap-muted ap-num">{j.time}</span>
            </motion.div>
          ))}
        </div>
      </div>
      <Copy headline="Overnight, the agents tidy up." support="They file, merge repeats, link evidence and watch my tripwires. I wake up to a Briefing." />
    </div>
  );
}
