/* How confidence in each held theory has moved: append-only, dated stances. The last stance matches data.ts. */

export type Stance = { id: string; date: string; short: string; level: number; note: string; signal?: string; challenge?: boolean };

export const TODAY = "31 Oct 2026";
export const LEVELS = ["", "Doubtful", "Unsure", "Even", "Likely", "Sure"];

/** Days between two "12 May 2025" style dates. */
export const daysBetween = (a: string, b: string) => (Date.parse(b + " UTC") - Date.parse(a + " UTC")) / 864e5;

export const HISTORY: Record<string, Stance[]> = {
  t1: [
    { id: "h1", date: "12 May 2025", short: "May 25", level: 2, note: "First stated. Small models are cheap, but only for toy tasks." },
    { id: "h2", date: "30 Jul 2025", short: "Jul 25", level: 3, note: "Raised: an open-weight model matches last year's frontier on coding.", signal: "Open-weight model matches last year's frontier on coding" },
    { id: "h3", date: "18 Oct 2025", short: "Oct 25", level: 4, note: "Raised after Lab cuts API prices for the second time in a quarter.", signal: "Lab halves small-tier API prices" },
    { id: "h4", date: "9 Jan 2026", short: "Jan 26", level: 2, note: "Lowered: frontier costs keep rising and agents burn far more tokens per task.", signal: "Reasoning agents use 20× the tokens of chat on the same task", challenge: true },
    { id: "h5", date: "20 Mar 2026", short: "Mar 26", level: 3, note: "Raised: routine coding agents now cost pennies per pull request.", signal: "Team reports agent PRs cost under 5p each" },
    { id: "h6", date: "14 Jun 2026", short: "Jun 26", level: 5, note: "Raised: two labs make their small tier free under a quota.", signal: "Two labs launch free small-model tiers" },
    { id: "h7", date: "2 Aug 2026", short: "Aug 26", level: 3, note: "Lowered: the free tiers were withdrawn after a month.", signal: "Free tiers withdrawn as usage caps return", challenge: true },
    { id: "h8", date: "11 Sep 2026", short: "Sep 26", level: 4, note: "Raised after Lab cuts API prices again for its small model tier.", signal: "Lab cuts API prices again for its small model tier" },
    { id: "h9", date: "29 Oct 2026", short: "Oct 26", level: 3, note: "Lowered: data-centre power is booked years ahead, so prices may floor.", signal: "Data-centre power contracts are booked years ahead" },
  ],
  t2: [
    { id: "h1", date: "12 May 2025", short: "May 25", level: 3, note: "First stated, as the rival to cheap tokens." },
    { id: "h2", date: "4 Sep 2025", short: "Sep 25", level: 4, note: "Raised: the newest frontier model launches at triple the price.", signal: "Frontier model launches at 3× the previous price" },
    { id: "h3", date: "22 Feb 2026", short: "Feb 26", level: 3, note: "Lowered: an open-weight model closes most of the gap within months.", signal: "Open-weight model matches last year's frontier on coding" },
    { id: "h4", date: "14 Jun 2026", short: "Jun 26", level: 2, note: "Lowered: two labs give away their small tier; scarcity looks temporary.", signal: "Two labs launch free small-model tiers" },
  ],
  t3: [
    { id: "h1", date: "3 Jun 2025", short: "Jun 25", level: 3, note: "First stated. Memory is a demo, not a default." },
    { id: "h2", date: "28 Nov 2025", short: "Nov 25", level: 4, note: "Raised: memory ships on by default in two assistants.", signal: "Memory ships on by default in two assistants" },
    { id: "h3", date: "15 Apr 2026", short: "Apr 26", level: 5, note: "Raised: an agent recalls a codebase across a month of sessions.", signal: "Agent recalls a codebase across a month of sessions" },
    { id: "h4", date: "8 Aug 2026", short: "Aug 26", level: 4, note: "Lowered: people ask for memory to be scoped per project, not global.", signal: "Users ask for per-project memory controls" },
  ],
  t4: [
    { id: "h1", date: "20 Jul 2025", short: "Jul 25", level: 2, note: "First stated. Writing still looks like the slow part." },
    { id: "h2", date: "10 Dec 2025", short: "Dec 25", level: 3, note: "Raised: teams report agents opening dozens of PRs a day.", signal: "Team reports agents opening 40 PRs a day" },
    { id: "h3", date: "6 May 2026", short: "May 26", level: 4, note: "Raised: reviewers skim agent diffs and approve.", signal: "Reviewers skim agent diffs and approve" },
  ],
  t5: [
    { id: "h1", date: "1 Sep 2025", short: "Sep 25", level: 2, note: "First stated, after building a tool just for me." },
    { id: "h2", date: "12 Mar 2026", short: "Mar 26", level: 3, note: "Raised: a friend built a budgeting app just for her household.", signal: "Friend built a budgeting app just for her household" },
  ],
  t6: [
    { id: "h1", date: "14 Aug 2025", short: "Aug 25", level: 3, note: "First stated. Capital expenditure is running far ahead of revenue." },
    { id: "h2", date: "30 Jan 2026", short: "Jan 26", level: 2, note: "Lowered: agent revenue grows faster than expected for a quarter.", signal: "Agent revenue doubles in a quarter at two labs" },
    { id: "h3", date: "27 Oct 2026", short: "Oct 26", level: 2, note: "Held: funding dips again, but nothing breaks.", signal: "Funding for model labs dips for a second quarter" },
  ],
  t7: [
    { id: "h1", date: "5 Feb 2026", short: "Feb 26", level: 2, note: "First stated, following cheap tokens and long memory." },
    { id: "h2", date: "18 Jul 2026", short: "Jul 26", level: 3, note: "Raised: background agents ship in two coding tools.", signal: "Background agents ship in two coding tools" },
  ],
};

/** A theory's stances, plus a "Now" stance when the current confidence differs from the last one recorded. */
export function stancesFor(id: string, log: Stance[], confidence: number | null): Stance[] {
  const s = [...(HISTORY[id] ?? []), ...log];
  if (confidence == null) return s;
  if (!s.length || s.at(-1)!.level !== confidence) s.push({ id: "now", date: TODAY, short: "Now", level: confidence, note: "" });
  return s;
}
