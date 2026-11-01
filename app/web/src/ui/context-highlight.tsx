import { useLayoutEffect, useState, type RefObject } from "react";
import { motion, useReducedMotion } from "motion/react";

type Rect = { x: number; y: number; w: number; h: number };
type Highlight = { region: string; bounds: Rect; clips: Rect[]; radius: string };
const rectOf = (rect: DOMRect): Rect => ({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });

function intersect(a: Rect, b: Rect, x = true, y = true): Rect | null {
  const left = x ? Math.max(a.x, b.x) : a.x, top = y ? Math.max(a.y, b.y) : a.y;
  const right = x ? Math.min(a.x + a.w, b.x + b.w) : a.x + a.w;
  const bottom = y ? Math.min(a.y + a.h, b.y + b.h) : a.y + a.h;
  return right > left && bottom > top ? { x: left, y: top, w: right - left, h: bottom - top } : null;
}

/** The source's visible area, including clipping by its real scroll ancestors. */
function visibleBounds(source: HTMLElement, frame: HTMLElement): Rect | null {
  let bounds = rectOf(source.getBoundingClientRect());
  // Atlas landmarks use a zero-sized anchor with a visible glyph positioned around it.
  if (!bounds.w || !bounds.h) {
    const children = [...source.children].map(child => rectOf(child.getBoundingClientRect())).filter(rect => rect.w && rect.h);
    if (!children.length) return null;
    const x = Math.min(...children.map(rect => rect.x)), y = Math.min(...children.map(rect => rect.y));
    bounds = { x, y, w: Math.max(...children.map(rect => rect.x + rect.w)) - x, h: Math.max(...children.map(rect => rect.y + rect.h)) - y };
  }
  let clipped = intersect(bounds, { x: 0, y: 0, w: innerWidth, h: innerHeight });
  for (let ancestor = source.parentElement; ancestor && clipped; ancestor = ancestor.parentElement) {
    const style = getComputedStyle(ancestor), rect = ancestor.getBoundingClientRect();
    const clipX = /(hidden|clip|scroll|auto)/.test(style.overflowX), clipY = /(hidden|clip|scroll|auto)/.test(style.overflowY);
    if (clipX || clipY) {
      const sx = rect.width / ancestor.offsetWidth || 1, sy = rect.height / ancestor.offsetHeight || 1;
      clipped = intersect(clipped, { x: rect.left + ancestor.clientLeft * sx, y: rect.top + ancestor.clientTop * sy, w: ancestor.clientWidth * sx, h: ancestor.clientHeight * sy }, clipX, clipY);
    }
    if (ancestor === frame) break;
  }
  return clipped && intersect(clipped, rectOf(frame.getBoundingClientRect()));
}

/** Disjoint windows into one painted rectangle keep its glow out of chat without creating internal seams. */
function excluding(bounds: Rect, chat?: Rect): Rect[] {
  const cut = chat && intersect(bounds, chat);
  if (!cut) return [bounds];
  return [
    { x: bounds.x, y: bounds.y, w: bounds.w, h: cut.y - bounds.y },
    { x: bounds.x, y: cut.y + cut.h, w: bounds.w, h: bounds.y + bounds.h - cut.y - cut.h },
    { x: bounds.x, y: cut.y, w: cut.x - bounds.x, h: cut.h },
    { x: cut.x + cut.w, y: cut.y, w: bounds.x + bounds.w - cut.x - cut.w, h: cut.h },
  ].filter(rect => rect.w > 0 && rect.h > 0);
}

/** A pointer-transparent preview of the context chip's visible source, below functional chrome. */
export function ContextHighlight({ frameRef, chatRef, region }: {
  frameRef: RefObject<HTMLDivElement | null>; chatRef: RefObject<HTMLDivElement | null>; region: string | null;
}) {
  const reduced = useReducedMotion();
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame || !region) { setHighlight(null); return; }
    let raf = 0;
    const measure = () => {
      const chatRect = chatRef.current?.getBoundingClientRect();
      const chat = chatRect && rectOf(chatRect);
      const candidates = [...frame.querySelectorAll<HTMLElement>(`[data-region="${CSS.escape(region)}"]`)].flatMap(source => {
        const bounds = visibleBounds(source, frame);
        const clips = bounds ? excluding(bounds, chat) : [];
        return bounds && clips.length ? [{ source, bounds, clips }] : [];
      }).sort((a, b) => a.bounds.w - b.bounds.w || a.bounds.h - b.bounds.h);
      const candidate = candidates[0];
      let next: Highlight | null = null;
      if (candidate) {
        const { source, bounds, clips } = candidate;
        const host = frame.getBoundingClientRect(), sx = host.width / frame.offsetWidth || 1, sy = host.height / frame.offsetHeight || 1;
        const local = (rect: Rect): Rect => ({ x: (rect.x - host.left) / sx, y: (rect.y - host.top) / sy, w: rect.w / sx, h: rect.h / sy });
        next = { region, bounds: local(bounds), clips: clips.map(local), radius: getComputedStyle(source).borderRadius };
      }
      setHighlight(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      raf = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(raf);
  }, [region, frameRef, chatRef]);

  if (!region || !highlight || highlight.region !== region) return null;
  return <motion.div key={region} className="ps-hl-layer" aria-hidden="true" data-context-region={region}
    initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : .12 }}>
    {highlight.clips.map((clip, index) => <div className="ps-hl-clip" key={index} style={{ left: clip.x, top: clip.y, width: clip.w, height: clip.h }}>
      <div className="ps-hl" style={{ left: highlight.bounds.x - clip.x, top: highlight.bounds.y - clip.y, width: highlight.bounds.w, height: highlight.bounds.h, borderRadius: highlight.radius }} />
    </div>)}
  </motion.div>;
}
