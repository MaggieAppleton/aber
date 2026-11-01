/* Example data for the pane-details jig: one theory's stance history and the signals its tripwire catches. */

export type Stance = { id: string; date: string; short: string; level: number; note: string; signal?: string; challenge?: boolean };

/** Append-only stances on "Tokens become nearly free for routine work", May 2025 to today. */
export const STANCES: Stance[] = [
  { id: "h1", date: "12 May 2025", short: "May 25", level: 2, note: "First stated. Small models are cheap, but only for toy tasks." },
  { id: "h2", date: "30 Jul 2025", short: "Jul 25", level: 3, note: "Raised: an open-weight model matches last year's frontier on coding.", signal: "Open-weight model matches last year's frontier on coding" },
  { id: "h3", date: "18 Oct 2025", short: "Oct 25", level: 4, note: "Raised after Lab cuts API prices for the second time in a quarter.", signal: "Lab halves small-tier API prices" },
  { id: "h4", date: "9 Jan 2026", short: "Jan 26", level: 2, note: "Lowered: frontier costs keep rising and agents burn far more tokens per task.", signal: "Reasoning agents use 20× the tokens of chat on the same task", challenge: true },
  { id: "h5", date: "20 Mar 2026", short: "Mar 26", level: 3, note: "Raised: routine coding agents now cost pennies per pull request.", signal: "Team reports agent PRs cost under 5p each" },
  { id: "h6", date: "14 Jun 2026", short: "Jun 26", level: 5, note: "Raised: two labs make their small tier free under a quota.", signal: "Two labs launch free small-model tiers" },
  { id: "h7", date: "2 Aug 2026", short: "Aug 26", level: 3, note: "Lowered: the free tiers were withdrawn after a month.", signal: "Free tiers withdrawn as usage caps return", challenge: true },
  { id: "h8", date: "11 Sep 2026", short: "Sep 26", level: 4, note: "Raised after Lab cuts API prices again for its small model tier.", signal: "Lab cuts API prices again for its small model tier" },
  { id: "h9", date: "29 Oct 2026", short: "Oct 26", level: 3, note: "Lowered: data-centre power is booked years ahead, so prices may floor.", signal: "Data-centre power contracts are booked years ahead" },
];

/** Days since 12 May 2025, for proportional time axes. */
const D0 = Date.UTC(2025, 4, 12);
export const dayOf = (s: string) => (Date.parse(s + " UTC") - D0) / 864e5;
export const TODAY = "31 Oct 2026";
export const SPAN = dayOf(TODAY);

export const LEVELS = ["", "Doubtful", "Unsure", "Even", "Likely", "Sure"];

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
