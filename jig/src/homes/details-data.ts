/* Example data for the pane-details jig: one theory's stance history and the signals its tripwire catches. */

import { HISTORY, TODAY, LEVELS, type Stance } from "./histories";
export { TODAY, LEVELS, type Stance };

/** Append-only stances on "Tokens become nearly free for routine work", May 2025 to today. */
export const STANCES: Stance[] = HISTORY.t1;

/* ── Tripwire ── */
export type TripState = "empty" | "watching" | "tripped" | "resolved";
export const TRIP_STATES: { key: TripState; label: string }[] = [
  { key: "empty", label: "Empty" }, { key: "watching", label: "Watching" }, { key: "tripped", label: "Tripped" }, { key: "resolved", label: "Resolved" },
];

export type Hit = { id: string; gist: string; source: string; day: string; why: string };
export const TRIP_TEXT = "Small-model prices stop falling for a year, or agents need so many more tokens per task that the monthly bill rises.";
export const HITS: Hit[] = [
  { id: "x1", gist: "Small-tier API prices unchanged since March", source: "x.com", day: "Today", why: "Seven months without a cut" },
  { id: "x2", gist: "Reasoning agents use 20× the tokens of chat on the same task", source: "arxiv.org", day: "Yesterday", why: "Tokens per task rising faster than price falls" },
];
export const NEAR: Hit = { id: "x0", gist: "Data-centre power contracts are booked years ahead", source: "ft.com", day: "Mon 27 Oct", why: "Could floor prices, not yet a price change" };
export const CHECKED = 41;

/** Several conditions, for the checklist variant. */
export type Cond = { id: string; text: string; hits: Hit[]; resolved?: { how: "dismissed" | "accepted"; date: string; note: string } };
export const CONDS: Cond[] = [
  { id: "c1", text: "Small-model prices stop falling for 12 months", hits: [HITS[0]] },
  { id: "c2", text: "Agents need 10× more tokens per task than today", hits: [HITS[1]] },
  { id: "c3", text: "Two or more labs withdraw a free tier", hits: [], resolved: { how: "accepted", date: "2 Aug 2026", note: "Lowered to 3" } },
];

/** The measurable version: a metric, a direction and a threshold, with readings from signals. */
export const METRIC = { name: "Small-model price per million tokens", change: "year-on-year change", threshold: -50, min: -90, max: 20 };
export const READINGS: { v: number; date: string; gist: string }[] = [
  { v: -82, date: "Oct 2025", gist: "Lab halves small-tier API prices" },
  { v: -74, date: "Mar 2026", gist: "Open-weight hosting price war" },
  { v: -66, date: "Jun 2026", gist: "Two labs launch free small-model tiers" },
  { v: -58, date: "Sep 2026", gist: "Lab cuts API prices again for its small model tier" },
];
export const READING_TRIPPED = { v: -31, date: "Today", gist: "Small-tier API prices unchanged since March" };
