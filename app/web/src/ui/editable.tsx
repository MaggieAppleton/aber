import { createElement, useLayoutEffect, useRef, type FormEvent, type HTMLAttributes, type KeyboardEvent } from "react";

/* ── Editable text ──
 * Uncontrolled contentEditable kept in step with the store: typing writes to the store, and the DOM is only
 * rewritten when the stored value differs from it (an edit made elsewhere), so the caret never jumps. */
export function Editable({ value, onChange, as = "div", className, placeholder, singleLine, ...rest }: {
  value: string; onChange: (v: string) => void; as?: "div" | "h1"; className?: string; placeholder?: string; singleLine?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, "onChange" | "children">) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => { const el = ref.current; if (el && el.textContent !== value) el.textContent = value; }, [value]);
  return createElement(as, {
    ...rest, ref, className: "pn-edit" + (className ? " " + className : ""), contentEditable: "plaintext-only", suppressContentEditableWarning: true,
    role: "textbox", "aria-multiline": singleLine ? undefined : true, "data-placeholder": placeholder,
    onInput: (e: FormEvent<HTMLElement>) => onChange(e.currentTarget.textContent ?? ""),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === "Escape") { e.stopPropagation(); e.currentTarget.blur(); }
      if (singleLine && e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
    },
  });
}
