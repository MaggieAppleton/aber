import { useSyncExternalStore } from "react";
import { PROTOTYPES, theme, theory, type Prototype } from "./data";
import type { Stance } from "./histories";
import type { Decision } from "./tripwire";
import { tripFor } from "./trips";

/**
 * Per-object edits, shared by every surface on the page (Columns, Atlas) for the page session.
 * One record per object, seeded from data.ts on first read, replaced (never mutated) on each edit,
 * so `useSyncExternalStore` sees a new snapshot only for the object that changed.
 */
export type Edits = {
  theory: {
    claim: string; body: string; tripwire: string; confidence: number | null; horizon: number;
    /** Accepted or dismissed tripwire matches, by signal id. */
    decisions: Record<string, Decision>;
    /** Stances added this session (accepted tripwire challenges), after the theory's recorded history. */
    log: Stance[];
  };
  theme: { name: string };
  prototype: { name: string; body: string; status: Prototype["status"] };
  signal: { note: string };
};
export type EditKind = keyof Edits;

const records = new Map<string, unknown>();
const listeners = new Set<() => void>();

function seed<K extends EditKind>(kind: K, id: string): Edits[K] {
  const s: { [k in EditKind]: () => Edits[k] } = {
    theory: () => { const t = theory(id); const trip = tripFor(id); return { claim: t.claim, body: t.body, tripwire: trip.text, confidence: t.confidence, horizon: t.horizon, decisions: trip.decisions ?? {}, log: [] }; },
    theme: () => ({ name: theme(id).name }),
    prototype: () => { const p = PROTOTYPES.find(x => x.id === id)!; return { name: p.name, body: "", status: p.status }; },
    signal: () => ({ note: "" }),
  };
  return s[kind]();
}

export function getEdit<K extends EditKind>(kind: K, id: string): Edits[K] {
  const k = `${kind}:${id}`;
  let v = records.get(k) as Edits[K] | undefined;
  if (!v) { v = seed(kind, id); records.set(k, v); }
  return v;
}

export function setEdit<K extends EditKind>(kind: K, id: string, patch: Partial<Edits[K]>) {
  const prev = getEdit(kind, id);
  if (Object.entries(patch).every(([f, v]) => prev[f as keyof Edits[K]] === v)) return;
  records.set(`${kind}:${id}`, { ...prev, ...patch });
  listeners.forEach(l => l());
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** The current record for one object, and a setter that merges a patch into it. */
export function useEdit<K extends EditKind>(kind: K, id: string) {
  const v = useSyncExternalStore(subscribe, () => getEdit(kind, id));
  return [v, (patch: Partial<Edits[K]>) => setEdit(kind, id, patch)] as const;
}
