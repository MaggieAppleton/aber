import { Slider } from "@base-ui/react/slider";

/** Number keys select a level directly; navigation keys stay with Base UI. */
export function confidenceDigit(key: string): number | undefined {
  return /^[1-5]$/.test(key) ? Number(key) : undefined;
}

/** One target and one tab stop, with the five canonical confidence marks. */
export function ConfidenceControl({ value, onChange }: { value: number|null; onChange: (value: number) => void }) {
  return <Slider.Root className="pn-conf" min={1} max={5} step={1} largeStep={1} value={value??1} onValueChange={onChange}>
    <Slider.Control className="pn-conf-control" title={`Confidence ${value===null?"not set":`${value} of 5`}; arrows or keys 1–5 to change`}
      onPointerDown={event=>{if(value===null){const box=event.currentTarget.getBoundingClientRect();onChange(Math.max(1,Math.min(5,Math.round(1+4*(event.clientX-box.left)/box.width))));}}}>
      <span className="pn-conf-marks" aria-hidden>{[1, 2, 3, 4, 5].map(level => <i key={level} data-on={value!==null&&level <= value ? "" : undefined} />)}</span>
      <Slider.Thumb className="pn-conf-thumb" aria-label="Confidence" getAriaValueText={(_formatted, level) => value===null?"Not set":`${level} of 5`}
        onKeyDown={event => {
          if (event.metaKey || event.ctrlKey || event.altKey) return;
          const level = confidenceDigit(event.key);
          if (level !== undefined) { event.preventDefault(); onChange(level); }
          else if(value===null&&["Home","End","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))onChange(event.key==="End"?5:["ArrowRight","ArrowUp"].includes(event.key)?2:1);
        }} />
    </Slider.Control>
  </Slider.Root>;
}
