import { useEffect, useLayoutEffect, useState, type ComponentType } from "react";
import { MotionConfig } from "motion/react";
import * as Title from "./slides/01-title";
import { SLIDES as ACT12 } from "./slides/act12";
import { SLIDES as ACT3 } from "./slides/act3";
import "./deck.css";

export type Slide = { default: ComponentType; notes: string };

export const SLIDES: Slide[] = [Title, ...ACT12, ...ACT3];

const W = 1600, H = 900;

const fromHash = () => {
  const n = parseInt(location.hash.slice(1), 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), SLIDES.length) - 1 : 0;
};

/** Talk deck: fixed 16:9 stage scaled to fit, ←/→/space/Home/End, slide number in the hash. */
export function Deck() {
  const [i, setI] = useState(fromHash);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(innerWidth / W, innerHeight / H));
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    history.replaceState(null, "", `#${i + 1}`);
  }, [i]);

  useEffect(() => {
    const onHash = () => setI(fromHash());
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest("input, textarea, [contenteditable]")) return;
      const last = SLIDES.length - 1;
      const go = (n: number) => { e.preventDefault(); setI(Math.min(Math.max(n, 0), last)); };
      if (e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) go(i + 1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) go(i - 1);
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(last);
    };
    addEventListener("keydown", onKey);
    addEventListener("hashchange", onHash);
    return () => { removeEventListener("keydown", onKey); removeEventListener("hashchange", onHash); };
  }, [i]);

  const Current = SLIDES[i].default;

  return (
    <div className="dk-page">
      <div className="dk-stage" style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <MotionConfig reducedMotion="user">
          <Current key={i} />
        </MotionConfig>
        <div className="dk-progress" aria-label={`Slide ${i + 1} of ${SLIDES.length}`}>
          {SLIDES.map((_, k) => <i key={k} data-on={k === i ? "" : undefined} />)}
        </div>
      </div>
    </div>
  );
}
