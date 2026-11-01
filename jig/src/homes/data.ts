// One shared example world, so the paradigms differ only in structure.
export type Theme = { id: string; name: string; signals: number; fresh: number };
export type Theory = {
  id: string; claim: string; themes: string[]; confidence: number | null; supports: number; undermines: number;
  draft?: boolean; horizon: number; follows: string[]; rivals: string[]; pending: number; challenge?: boolean;
  history: number[]; body: string;
};
export type Stance = "supports" | "undermines";
export type Signal = { id: string; gist: string; source: string; themes: string[]; evidence: { theory: string; stance: Stance; suggested?: boolean }[]; day: string; dump: string };
export type Dump = { id: string; day: string; time: string; kind: "voice" | "link" | "text"; first: string; produced: string[] };
export type Prototype = { id: string; name: string; status: "idea" | "building" | "built" | "shelved"; theories: string[] };

export const THEMES: Theme[] = [
  { id: "cost", name: "Cost of intelligence", signals: 23, fresh: 4 },
  { id: "memory", name: "Agent memory", signals: 31, fresh: 2 },
  { id: "review", name: "Code review after agents", signals: 18, fresh: 2 },
  { id: "personal", name: "Personal software", signals: 27, fresh: 2 },
  { id: "funding", name: "AI funding cycle", signals: 9, fresh: 1 },
  { id: "interfaces", name: "Novel agent interfaces", signals: 14, fresh: 1 },
  { id: "identity", name: "Agent identity", signals: 6, fresh: 1 },
];

export const THEORIES: Theory[] = [
  { id: "t1", claim: "Tokens become nearly free for routine work", themes: ["cost"], confidence: 3, supports: 5, undermines: 2, horizon: 2028, follows: [], rivals: ["t2"], pending: 2, history: [2, 2, 3, 3],
    body: "Small models keep getting cheaper faster than demand grows. Routine agent work stops being metered in any way I notice." },
  { id: "t2", claim: "Frontier intelligence stays scarce and expensive", themes: ["cost", "funding"], confidence: 2, supports: 3, undermines: 4, horizon: 2029, follows: [], rivals: ["t1"], pending: 1, history: [3, 3, 2, 2],
    body: "The best reasoning stays rationed by power and capital, so the frontier is priced like a luxury." },
  { id: "t3", claim: "Agents keep context across months, not sessions", themes: ["memory"], confidence: 4, supports: 8, undermines: 1, horizon: 2027, follows: [], rivals: [], pending: 1, challenge: true, history: [3, 4, 4, 4],
    body: "Memory becomes a default feature: an agent knows my projects the way a colleague does." },
  { id: "t4", claim: "Code review becomes the bottleneck, not writing", themes: ["review"], confidence: 4, supports: 6, undermines: 1, horizon: 2027, follows: [], rivals: [], pending: 0, history: [2, 3, 4, 4],
    body: "Writing code is cheap; deciding whether to trust it is the scarce skill." },
  { id: "t5", claim: "Most software is made for an audience of one", themes: ["personal"], confidence: 3, supports: 4, undermines: 2, horizon: 2030, follows: ["t1"], rivals: [], pending: 0, history: [2, 3, 3, 3],
    body: "When building costs nothing, people make tools for themselves instead of adapting to someone else's." },
  { id: "t6", claim: "Labs face a funding correction before agents pay their way", themes: ["funding"], confidence: 2, supports: 2, undermines: 2, horizon: 2027, follows: [], rivals: [], pending: 0, history: [2, 2, 2, 2],
    body: "Revenue from agents arrives later than the capital expenditure assumes." },
  { id: "t7", claim: "Agents run continuously in the background by default", themes: ["cost", "memory"], confidence: 3, supports: 3, undermines: 0, horizon: 2029, follows: ["t1", "t3"], rivals: [], pending: 0, history: [3, 3],
    body: "If tokens are cheap and agents remember, there's no reason to switch them off." },
  { id: "d1", claim: "Local models absorb most everyday agent work", themes: ["cost"], confidence: null, supports: 3, undermines: 0, draft: true, horizon: 2028, follows: [], rivals: [], pending: 0, history: [],
    body: "Drafted overnight from 3 signals about open-weight models." },
  { id: "d2", claim: "Software is priced per outcome, not per seat", themes: ["cost", "personal"], confidence: null, supports: 1, undermines: 0, draft: true, horizon: 2030, follows: ["t1"], rivals: [], pending: 0, history: [],
    body: "Extrapolated from Tokens become nearly free." },
  { id: "d3", claim: "Review shifts from diffs to intent", themes: ["review"], confidence: null, supports: 2, undermines: 0, draft: true, horizon: 2028, follows: ["t4"], rivals: [], pending: 0, history: [],
    body: "Drafted from yesterday's voice note." },
];

export const SIGNALS: Signal[] = [
  { id: "s1", gist: "Lab cuts API prices again for its small model tier", source: "x.com", themes: ["cost"], evidence: [{ theory: "t1", stance: "supports" }], day: "Today", dump: "D1" },
  { id: "s2", gist: "Open-weight model matches last year's frontier on coding", source: "news.ycombinator.com", themes: ["cost"], evidence: [{ theory: "t1", stance: "supports" }, { theory: "d1", stance: "supports" }], day: "Today", dump: "D1" },
  { id: "s4", gist: "Data-centre power contracts are booked years ahead", source: "ft.com", themes: ["cost", "funding"], evidence: [{ theory: "t2", stance: "supports", suggested: true }], day: "Today", dump: "D1" },
  { id: "s5", gist: "Team reports agents opening 40 PRs a day", source: "x.com", themes: ["review"], evidence: [{ theory: "t4", stance: "supports" }], day: "Today", dump: "D2" },
  { id: "s7", gist: "Memory feature withdrawn after privacy complaints", source: "theverge.com", themes: ["memory"], evidence: [{ theory: "t3", stance: "undermines", suggested: true }], day: "Today", dump: "D2" },
  { id: "s12", gist: "Design studio ships a canvas-style agent UI", source: "x.com", themes: ["interfaces"], evidence: [], day: "Today", dump: "D2" },
  { id: "s3", gist: "Frontier training runs keep growing in cost", source: "arxiv.org", themes: ["cost", "funding"], evidence: [{ theory: "t1", stance: "undermines" }, { theory: "t2", stance: "supports" }], day: "Yesterday", dump: "D4" },
  { id: "s6", gist: "Reviewers skim agent diffs and approve", source: "My observation", themes: ["review"], evidence: [{ theory: "t4", stance: "supports" }, { theory: "d3", stance: "supports" }], day: "Yesterday", dump: "D3" },
  { id: "s8", gist: "Agent recalls a codebase across a month of sessions", source: "x.com", themes: ["memory"], evidence: [{ theory: "t3", stance: "supports" }], day: "Yesterday", dump: "D4" },
  { id: "s13", gist: "Agents get their own OAuth identities", source: "github.blog", themes: ["identity"], evidence: [], day: "Yesterday", dump: "D4" },
  { id: "s9", gist: "Friend built a budgeting app just for her household", source: "My observation", themes: ["personal"], evidence: [{ theory: "t5", stance: "supports" }], day: "Mon 27 Oct", dump: "D5" },
  { id: "s10", gist: "Startup sells agent hours instead of seats", source: "x.com", themes: ["personal", "cost"], evidence: [{ theory: "d2", stance: "supports" }], day: "Mon 27 Oct", dump: "D5" },
  { id: "s11", gist: "Funding for model labs dips for a second quarter", source: "bloomberg.com", themes: ["funding"], evidence: [{ theory: "t6", stance: "supports" }], day: "Mon 27 Oct", dump: "D5" },
];

export const DUMPS: Dump[] = [
  { id: "D1", day: "Today", time: "08:12", kind: "link", first: "3 links and a ramble about small models", produced: ["s1", "s2", "s4"] },
  { id: "D2", day: "Today", time: "07:40", kind: "voice", first: "Voice note, 4 min: review is the new bottleneck", produced: ["s5", "s7", "s12"] },
  { id: "D3", day: "Yesterday", time: "22:05", kind: "text", first: "What if review is about intent, not diffs?", produced: ["s6", "d3"] },
  { id: "D4", day: "Yesterday", time: "18:30", kind: "link", first: "arxiv.org paper on training costs, plus 2 posts", produced: ["s3", "s8", "s13"] },
  { id: "D5", day: "Mon 27 Oct", time: "21:10", kind: "voice", first: "Voice note, 2 min: household software", produced: ["s9", "s10", "s11"] },
];

export const PROTOTYPES: Prototype[] = [
  { id: "p2", name: "Intent review", status: "building", theories: ["t4", "d3"] },
  { id: "p1", name: "Token budget meter", status: "idea", theories: ["t1"] },
  { id: "p3", name: "One-person app kit", status: "built", theories: ["t5"] },
  { id: "p4", name: "Memory inspector", status: "shelved", theories: ["t3"] },
];

export const theme = (id: string) => THEMES.find(t => t.id === id)!;
export const theory = (id: string) => THEORIES.find(t => t.id === id)!;
export const signal = (id: string) => SIGNALS.find(s => s.id === id)!;
export const held = THEORIES.filter(t => !t.draft);
export const drafts = THEORIES.filter(t => t.draft);
export const theoriesIn = (themeId: string) => THEORIES.filter(t => t.themes.includes(themeId));
export const signalsFor = (theoryId: string) => SIGNALS.filter(s => s.evidence.some(e => e.theory === theoryId));
export const prototypesFor = (theoryId: string) => PROTOTYPES.filter(p => p.theories.includes(theoryId));
