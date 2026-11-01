import { useRef } from "react";
import { Copy } from "../../parts";
import { AppShell, APP_W, APP_H } from "../../../homes/app-shell";
import { AppAt, Cursor, useInert, useScript } from "./stage";

export const notes = `That's the tour. Now the real thing: I'll open the Briefing like I would on a normal morning, accept or argue with a few things, then drop something into the pill and watch where it lands. If anything breaks, that's also a demo of how I feel about my predictions.`;

const S = 1.7;

export default function HandoffSlide() {
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  useInert(root);
  const cursor = useScript(layer, APP_W, async k => {
    await k.wait(1400);
    await k.move('[data-target="pill"]', -20, 2);
  }, { x: 1000, y: 900 });
  return (
    <div className="dk-slide a3 a3-handoff" ref={root}>
      <AppAt layer={layer} x={1520 - APP_W * S} y={828 - APP_H * S} scale={S} w={APP_W} h={APP_H} fade={{ left: 640, soft: 260 }}>
        <AppShell initial="atlas" />
        <Cursor c={cursor} />
      </AppAt>
      <Copy headline="Let me show you." support="Live, with this morning's pile." />
    </div>
  );
}
