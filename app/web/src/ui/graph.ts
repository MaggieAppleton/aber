import { DUMPS, SIGNALS, THEMES, THEORIES, PROTOTYPES, signalsFor, prototypesFor } from "./data";

export type Kind = "dump" | "signal" | "theme" | "theory" | "prototype";
export const key = (k: Kind, id: string) => `${k}:${id}`;

/** Everything in the lineage of one object: where it came from and what it led to. */
export function lineage(kind: Kind, id: string): Set<string> {
  const out = new Set<string>([key(kind, id)]);
  const addTheory = (tid: string, deep = true) => {
    out.add(key("theory", tid));
    const t = THEORIES.find(x => x.id === tid); if(!t)return;
    t.themes.forEach(th => out.add(key("theme", th)));
    prototypesFor(tid).forEach(p => out.add(key("prototype", p.id)));
    if (deep) {
      signalsFor(tid).forEach(s => { out.add(key("signal", s.id)); out.add(key("dump", s.dump)); });
      [...t.follows, ...t.rivals, ...THEORIES.filter(x => x.follows.includes(tid)).map(x => x.id)].forEach(x => out.add(key("theory", x)));
    }
  };
  const addSignal = (sid: string) => {
    const s = SIGNALS.find(x => x.id === sid);if(!s)return;
    out.add(key("signal", sid)); out.add(key("dump", s.dump));
    s.themes.forEach(th => out.add(key("theme", th)));
    s.evidence.forEach(e => addTheory(e.theory, false));
  };
  if (kind === "dump") (DUMPS.find(d => d.id === id)?.produced??[]).forEach(x => SIGNALS.some(s=>s.id===x) ? addSignal(x) : addTheory(x, false));
  if (kind === "signal") addSignal(id);
  if (kind === "theory") addTheory(id);
  if (kind === "theme") {
    THEORIES.filter(t => t.themes.includes(id)).forEach(t => addTheory(t.id, false));
    SIGNALS.filter(s => s.themes.includes(id)).forEach(s => { out.add(key("signal", s.id)); out.add(key("dump", s.dump)); });
  }
  if (kind === "prototype") (PROTOTYPES.find(p => p.id === id)?.theories??[]).forEach(t => addTheory(t));
  void THEMES;
  return out;
}
