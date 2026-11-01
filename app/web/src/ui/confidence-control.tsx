import { useEffect, useRef, useState } from "react";
import { Slider } from "@base-ui/react/slider";

/** Number keys select a level directly; navigation keys stay with Base UI. */
export function confidenceDigit(key: string): number | undefined {
  return /^[1-5]$/.test(key) ? Number(key) : undefined;
}

/** The level under a pointer at `x` across a control box. */
export function confidenceAt(x: number, left: number, width: number): number {
  return Math.max(1, Math.min(5, Math.round(1 + 4 * (x - left) / width)));
}

/** Which marks show: set (ink), previewed (a jade tint, up to the hovered step) or neither. */
export function confidenceMarks(value: number | null, preview?: number): ("on" | "pre" | undefined)[] {
  return [1, 2, 3, 4, 5].map(level => preview ? (level <= preview ? (value !== null && level <= value ? "on" : "pre") : undefined)
    : value !== null && level <= value ? "on" : undefined);
}

/**
 * One target and one tab stop, with the five canonical confidence marks. Hovering a step previews the steps up to it
 * in jade; setting a level pops the set steps (and the edit logs a stance). Arrow keys step it.
 */
export function ConfidenceControl({ value, onChange }: { value: number|null; onChange: (value: number) => void }) {
  const [preview, setPreview] = useState<number>();
  // Bumped on every change so the pop restarts even when the same steps stay set; it plays once, then clears.
  const [pop, setPop] = useState(0);
  const [popping, setPopping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const change = (level: number) => {
    if (level !== value) { setPop(n => n + 1); setPopping(true); clearTimeout(timer.current); timer.current = setTimeout(() => setPopping(false), 420); }
    onChange(level);
  };
  const marks = confidenceMarks(value, preview);
  return <Slider.Root className="pn-conf" min={1} max={5} step={1} largeStep={1} value={value??1} onValueChange={level => change(level as number)}>
    <Slider.Control className="pn-conf-control" title={`Confidence ${value===null?"not set":`${value} of 5`}; arrows or keys 1–5 to change`}
      onPointerMove={event=>{if(event.pointerType!=="touch"){const box=event.currentTarget.getBoundingClientRect();setPreview(confidenceAt(event.clientX,box.left,box.width));}}}
      onPointerLeave={()=>setPreview(undefined)}
      onPointerDown={event=>{setPreview(undefined);if(value===null){const box=event.currentTarget.getBoundingClientRect();change(confidenceAt(event.clientX,box.left,box.width));}}}>
      <span className="pn-conf-marks" aria-hidden>{marks.map((mark, i) => <i key={`${i}-${mark === "on" ? pop : 0}`} data-on={mark === "on" ? "" : undefined} data-pre={mark === "pre" ? "" : undefined} data-pop={mark === "on" && popping ? "" : undefined} />)}</span>
      <Slider.Thumb className="pn-conf-thumb" aria-label="Confidence" getAriaValueText={(_formatted, level) => value===null?"Not set":`${level} of 5`}
        onKeyDown={event => {
          if (event.metaKey || event.ctrlKey || event.altKey) return;
          const level = confidenceDigit(event.key);
          if (level !== undefined) { event.preventDefault(); change(level); }
          else if(value===null&&["Home","End","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))change(event.key==="End"?5:["ArrowRight","ArrowUp"].includes(event.key)?2:1);
        }} />
    </Slider.Control>
  </Slider.Root>;
}
