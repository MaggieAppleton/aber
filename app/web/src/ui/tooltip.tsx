import { useId, useState, type ComponentPropsWithRef, type ReactElement, type ReactNode } from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import "./tooltip.css";

// The shadcn Base UI pattern, using Aber's existing tokens and native controls.
export function TooltipProvider({ delay = 400, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider delay={delay} closeDelay={0} {...props} />;
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
    <TooltipContent id={id} aria-hidden={!open || undefined}>{label}</TooltipContent>
  </Tooltip>;
}

type ButtonProps = Omit<ComponentPropsWithRef<"button">, "title"> & { tooltip?: string };
export function TooltipButton({ tooltip, ...props }: ButtonProps) {
  return <IconTooltip label={tooltip ?? props["aria-label"]}><button {...props} /></IconTooltip>;
}
