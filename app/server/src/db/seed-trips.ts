type Decision = 'accepted' | 'dismissed';
type Hit = {id:string;gist:string;source:string;day:string;why:string};

/* Seeded tripwires: what would change my mind about a theory, the signals the agent has matched to it, and any
   decisions already made. Theories not listed start with an empty tripwire. */
export type Trip = { text: string; hits: Hit[]; date?: string; decisions?: Record<string, Decision> };

export const TRIPS: Record<string, Trip> = {
  t2: { text: "an open-weight model matches the frontier within six months of its release", hits: [] },
  t3: {
    text: "a major assistant withdraws its memory feature, or people switch memory off once they see what it keeps", date: "31 Oct",
    hits: [{ id: "s7", gist: "Memory feature withdrawn after privacy complaints", source: "theverge.com", day: "Today", why: "A major assistant pulled memory after complaints" }],
  },
  t4: {
    text: "review agents catch most bugs on their own, so people stop reading diffs", date: "2 Oct",
    hits: [{ id: "r1", gist: "Review agent claims to catch 90% of bugs", source: "x.com", day: "2 Oct", why: "Claims review no longer needs a person" }],
    decisions: { r1: "dismissed" },
  },
};

export const tripFor = (id: string): Trip => TRIPS[id] ?? { text: "", hits: [] };
