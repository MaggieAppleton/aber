import { useEffect, useRef, useState } from "react";

export type Decision = { choice?: string; note?: string; picks?: string[]; updatedAt?: string; [k: string]: unknown };
export type Decisions = Record<string, Decision>;

/** Decisions live in design/decisions.json via the Vite dev server. */
export function useDecisions() {
  const [decisions, setDecisions] = useState<Decisions>({});
  const [saved, setSaved] = useState(true);
  const timer = useRef<number>(undefined);

  useEffect(() => {
    fetch("/api/decisions").then(r => r.json()).then(setDecisions);
  }, []);

  function update(id: string, patch: Decision) {
    setDecisions(prev => {
      const next = { ...prev, [id]: { ...prev[id], ...patch, updatedAt: new Date().toISOString() } };
      setSaved(false);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        fetch("/api/decisions", { method: "POST", body: JSON.stringify(next) }).then(() => setSaved(true));
      }, 400);
      return next;
    });
  }

  return { decisions, update, saved };
}
