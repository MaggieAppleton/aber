/* How confidence in each held theory has moved: append-only, dated stances. The last stance matches data.ts. */

export type Stance = { id: string; date: string; short: string; level: number; note: string; signal?: string; challenge?: boolean };

export const TODAY = new Date().toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric"});
export const LEVELS = ["", "Doubtful", "Unsure", "Even", "Likely", "Sure"];

/** Days between two "12 May 2025" style dates. */
export const daysBetween = (a: string, b: string) => (Date.parse(b + " UTC") - Date.parse(a + " UTC")) / 864e5;

import { field, json, world } from "../data/live";
export const HISTORY: Record<string, Stance[]> = new Proxy({}, { get: (_target, id: string) => {
  const theory = world.theories.find(t => t.id === id);
  const rows = json<any[]>(theory?.stances ?? theory?.stanceLog ?? theory?.log, []).length ? json<any[]>(theory?.stances ?? theory?.stanceLog ?? theory?.log, []) : (world.stances ?? []).filter((s: any) => field(s,"theoryId") === id);
  return rows.map((s: any) => ({ id: s.id, date: s.date ?? new Date(s.at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}), short: s.short ?? new Date(s.at).toLocaleDateString("en-GB",{month:"short",year:"2-digit"}), level: s.level ?? s.confidence, note: s.note ?? "", challenge: s.challenge ?? s.cause === "challenge_accepted" }));
} });

/** A theory's stances, plus a "Now" stance when the current confidence differs from the last one recorded. */
export function stancesFor(id: string, log: Stance[], confidence: number | null): Stance[] {
  const s = [...(HISTORY[id] ?? []), ...log];
  if (confidence == null) return s;
  if (!s.length || s.at(-1)!.level !== confidence) s.push({ id: "now", date: TODAY, short: "Now", level: confidence, note: "" });
  return s;
}
