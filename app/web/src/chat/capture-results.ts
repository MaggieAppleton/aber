import { useEffect, useMemo, useRef, useState } from "react";
import { field, mutate, useWorld, world, type Row } from "../data/live";
import type { ToastPart, ToastT } from "../ui/pill-study";
import { onNotice, type Notice } from "../ui/notices";

export function producedParts(dumps: Row[]): ToastPart[] {
  const signals = new Set<string>();
  const drafts = new Set<string>();
  for (const dump of dumps) {
    for (const id of dump.produced ?? []) {
      const signal=world.signals.find(signal=>signal.id===id);
      const capturedAt=field(dump,"capturedAt"),createdAt=signal&&field(signal,"createdAt");
      if(signal&&(!capturedAt||!createdAt||createdAt>=capturedAt))signals.add(id);
      if (world.theories.some(theory => theory.id === id && theory.status === "draft") ||
          world.themes.some(theme => theme.id === id && theme.status === "draft") ||
          world.prototypes.some(prototype => prototype.id === id && prototype.draft)) drafts.add(id);
    }
    for (const draft of dump.drafts ?? []) drafts.add(draft.id);
  }
  return [
    ...(signals.size ? [{ icon: "signal" as const, n: signals.size, one: "signal", many: "signals" }] : []),
    ...(drafts.size ? [{ icon: "theory" as const, n: drafts.size, one: "draft", many: "drafts" }] : []),
  ];
}

const undoKey = "aber.captureUndo";
function savedUndo(): string[] {
  try { return JSON.parse(sessionStorage.getItem(undoKey) ?? "[]"); } catch { return []; }
}
const typing = (target: EventTarget | null) => target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/** A capture finishes when its persisted processing status settles, independently of chat streaming. */
export function useCaptureResults(open: boolean) {
  const { revision } = useWorld();
  const [toast, setToast] = useState<ToastT | null>(null);
  const [, rerender] = useState(0);
  const held = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestUndo = useRef<string[]>(savedUndo());
  const undoing = useRef(false);
  // The notice (a toast from elsewhere in the app) currently showing, if any.
  const notice = useRef<Notice | undefined>(undefined);
  const column = useRef(new Set<string>());
  const queue = useRef<{ ids: string[]; direct: boolean }[]>([]);
  const session = useRef(0);
  const currentOpen = useRef(open);
  const previousOpen = useRef(open);
  currentOpen.current = open;

  const api = useMemo(() => {
    const remember = (ids: string[]) => {
      latestUndo.current = ids;
      try { sessionStorage.setItem(undoKey, JSON.stringify(ids)); } catch {}
    };
    // A notice that leaves without Undo settles; one replaced by another toast settles too.
    const settleNotice = () => { const n = notice.current; notice.current = undefined; n?.settle?.(); };
    const present = (toast: Omit<ToastT, "id">, next?: Notice) => {
      clearTimeout(timer.current);
      settleNotice();
      notice.current = next;
      const id = crypto.randomUUID();
      setToast({ id, ...toast });
      const dismiss = () => {
        timer.current = setTimeout(() => {
          if (held.current) dismiss();
          else { if (notice.current === next) settleNotice(); setToast(value => value?.id === id ? null : value); }
        }, held.current ? 1500 : 5000);
      };
      dismiss();
    };
    const show = (parts: ToastPart[], ids: string[] = []) => {
      if (ids.length) remember(ids);
      present({ parts });
    };
    const announce = (n: Notice) => present({ parts: [], text: n.text, undoable: !!n.undo }, n);
    const undo = () => {
      if (notice.current) {
        const n = notice.current; notice.current = undefined;
        clearTimeout(timer.current); setToast(null);
        if (n.undo) n.undo(); else n.settle?.();
        return !!n.undo;
      }
      const ids = latestUndo.current.filter(id => {
        const dump = world.dumps.find(dump => dump.id === id);
        return dump && !field(dump, "deletedAt");
      });
      if (!ids.length || undoing.current) return false;
      undoing.current = true;
      void (async () => {
        try {
          for (const id of ids) await mutate("deleteDump", { id });
          remember([]);
          setToast(null);
        } catch {} finally { undoing.current = false; }
      })();
      return true;
    };
    const flush = () => {
      if(currentOpen.current)return;
      const ready = queue.current.filter(batch => batch.ids.every(id => {
        const dump = world.dumps.find(row => row.id === id);
        return dump && (["done", "failed"].includes(dump.status) || field(dump, "deletedAt"));
      }));
      if (!ready.length) return;
      queue.current = queue.current.filter(batch => !ready.includes(batch));
      const ids = [...new Set(ready.flatMap(batch => batch.ids))];
      const done = world.dumps.filter(dump => ids.includes(dump.id) && dump.status === "done" && !field(dump, "deletedAt"));
      if(done.length)remember(done.map(dump=>dump.id));
      const parts = producedParts(done);
      if (parts.length) show(parts, done.map(dump => dump.id));
      else if (ready.some(batch => batch.direct) && done.length) show([{ icon: "signal", n: 0, one: "signal", many: "signals" }], done.map(dump => dump.id));
    };
    return {
      token: () => ({ open: currentOpen.current, session: session.current }),
      track: (id: string, origin: { open: boolean; session: number }) => {
        if (origin.open && currentOpen.current && origin.session === session.current) column.current.add(id);
        else queue.current.push({ ids: [id], direct: true });
        rerender(value => value + 1);
        flush();
      },
      flush,
      show,
      announce,
      undo,
      dismiss: () => { held.current=false;clearTimeout(timer.current); settleNotice(); setToast(null); },
      hold: (value: boolean) => { held.current = value; },
    };
  }, []);

  useEffect(() => onNotice(api.announce), [api]);
  // A notice still waiting when the host goes away settles rather than vanishing.
  useEffect(() => () => { const n = notice.current; notice.current = undefined; n?.settle?.(); }, []);
  useEffect(() => {
    if (open !== previousOpen.current) {
      // Opening the column clears capture results; a notice stays, above the composer.
      if (open) { session.current++; if (!notice.current) api.dismiss(); }
      else if (column.current.size) {
        queue.current.push({ ids: [...column.current], direct: false });
        column.current.clear();
      }
      previousOpen.current = open;
    }
    api.flush();
  }, [open, revision, api]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== "z" || event.defaultPrevented || (typing(event.target)&&!(event.target instanceof Element&&event.target.closest(".ps-surface")&&!currentOpen.current)) || document.querySelector(".ab-dialog")) return;
      if (api.undo()) event.preventDefault();
    };
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); clearTimeout(timer.current); };
  }, [api]);
  return { toast, api };
}
