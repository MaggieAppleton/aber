import { useId, useState, type ComponentPropsWithRef, type ReactElement, type ReactNode } from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import "./tooltip.css";

// The shadcn Base UI pattern, using Aber's existing tokens and native controls.
// Warm-up: about 450ms the first time, then instant for any tooltip opened within 400ms of the last one closing.
export function TooltipProvider({ delay = 450, timeout = 400, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider delay={delay} closeDelay={0} timeout={timeout} {...props} />;
}

/** A label's keyboard shortcut, written as a trailing "(⌘K)", "(A)" or "(Esc)". Counts such as "(3)" are not shortcuts. */
export function splitShortcut(label: string): { name: string; key?: string } {
  const m = /^(.*\S) \(((?:[⌘⇧⌥⌃]+.{1,3})|[A-Z]|Esc|Enter|Tab|Space|↵)\)$/.exec(label);
  return m ? { name: m[1], key: m[2] } : { name: label };
}

/** The name, then its shortcut in mono. The brackets stay in the text for assistive tech and tests, but are not shown. */
function TipLabel({ label }: { label: ReactNode }) {
  if (typeof label !== "string") return <>{label}</>;
  const { name, key } = splitShortcut(label);
  if (!key) return <>{label}</>;
  return <>{name}<kbd className="ab-tooltip-key"><span className="ab-tooltip-bracket"> (</span>{key}<span className="ab-tooltip-bracket">)</span></kbd></>;
}

export function Tooltip({ onOpenChange, ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root disableHoverablePopup {...props} onOpenChange={(open, details) => {
    // Escape dismisses this transient label before an underlying pane or dialog.
    if (details.reason === "escape-key") details.event.preventDefault();
    onOpenChange?.(open, details);
  }} />;
}

export const TooltipTrigger = TooltipPrimitive.Trigger;

type ContentProps = TooltipPrimitive.Popup.Props & Pick<TooltipPrimitive.Positioner.Props, "side" | "sideOffset" | "align" | "alignOffset">;
export function TooltipContent({ children, side = "top", sideOffset = 6, align = "center", alignOffset = 0, ...props }: ContentProps) {
  return <TooltipPrimitive.Portal>
    <TooltipPrimitive.Positioner className="ab-tooltip-positioner" side={side} sideOffset={sideOffset} align={align} alignOffset={alignOffset}>
      <TooltipPrimitive.Popup className="ab-tooltip" role="tooltip" {...props}>
        {children}
        <TooltipPrimitive.Arrow className="ab-tooltip-arrow" aria-hidden />
      </TooltipPrimitive.Popup>
    </TooltipPrimitive.Positioner>
  </TooltipPrimitive.Portal>;
}

/** Reuses the supplied button, including Motion and Base UI controls, without a wrapper. */
export function IconTooltip({ label, children }: { label: ReactNode; children: ReactElement<ComponentPropsWithRef<"button">> }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const description = [children.props["aria-describedby"], open ? id : undefined].filter(Boolean).join(" ") || undefined;
  return <Tooltip open={open} onOpenChange={setOpen}>
    <TooltipTrigger render={children} aria-describedby={description} />
    <TooltipContent id={id} aria-hidden={!open || undefined}><TipLabel label={label} /></TooltipContent>
  </Tooltip>;
}

type ButtonProps = Omit<ComponentPropsWithRef<"button">, "title"> & { tooltip?: string };
export function TooltipButton({ tooltip, ...props }: ButtonProps) {
  return <IconTooltip label={tooltip ?? props["aria-label"]}><button {...props} /></IconTooltip>;
}
