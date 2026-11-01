import { THEMES, THEORIES, type Theme, type Theory } from "./data";

/*
 * Scale data for the Timeline directions. The shared panes look objects up in data.ts, so the extra themes and
 * theories are appended to those arrays — but only when the /timeline page calls install(), never on import,
 * so other pages keep the original world.
 *
 * "now" = the 10 theories in data.ts plus 5 more held ones (15). "year1" = 60 theories over 40 themes.
 */

type Row = [id: string, claim: string, themes: string[], conf: number | null, horizon: number, follows?: string[], rivals?: string[]];

const NOW_EXTRA: Row[] = [
  ["t8", "Agents get their own legal identities", ["identity"], 2, 2031, ["t7"]],
  ["t9", "Interfaces become canvases people and agents share", ["interfaces"], 3, 2028, [], ["t10"]],
  ["t10", "Chat stays the default way to work with agents", ["interfaces"], 2, 2028, [], ["t9"]],
  ["t11", "Junior developer roles shrink by half", ["review"], 3, 2030, ["t4"]],
  ["t12", "Personal agents negotiate with company agents", ["identity", "personal"], 2, 2032, ["t7", "t8"]],
];

const YEAR1: Row[] = [
  ["u1", "Most households own a general-purpose home robot", ["robotics"], 1, 2034],
  ["u2", "Home robots start with laundry, not cooking", ["robotics"], 2, 2031],
  ["u3", "Power, not chips, limits AI growth", ["energy", "cost"], 4, 2028],
  ["u4", "Labs build their own power plants", ["energy", "funding"], 3, 2030, ["u3"]],
  ["u5", "Every student has a patient personal tutor", ["education"], 3, 2029, ["t1"]],
  ["u6", "Degrees lose their value as hiring signals", ["education", "work"], 2, 2032, ["u5"]],
  ["u7", "Doctors routinely get a second opinion from a model", ["health"], 4, 2028],
  ["u8", "Diagnosis moves into the home", ["health", "wearables"], 2, 2033, ["u7"]],
  ["u9", "The four-day week spreads through knowledge work", ["work"], 2, 2031, ["t7"]],
  ["u10", "Search engines lose most queries to agents", ["search"], 4, 2028],
  ["u11", "Web traffic to publishers halves", ["search", "media"], 3, 2029, ["u10"]],
  ["u12", "Most images online are synthetic", ["media"], 4, 2027],
  ["u13", "Cameras sign every photo they take", ["trust", "media"], 3, 2029, ["u12"], ["u14"]],
  ["u14", "Provenance fails; people trust sources, not files", ["trust"], 2, 2030, [], ["u13"]],
  ["u15", "AI regulation fragments by country", ["regulation", "geo"], 4, 2027],
  ["u16", "Open-weight models stay within a year of the frontier", ["opensource", "cost"], 3, 2028, [], ["t2"]],
  ["u17", "IDEs become review tools first", ["devtools", "review"], 4, 2028, ["t4"]],
  ["u18", "Phones run a capable model offline", ["hardware", "cost"], 4, 2027],
  ["u19", "Agents run a real share of lab experiments", ["science"], 3, 2030],
  ["u20", "A model-led discovery wins a Nobel", ["science"], 2, 2033, ["u19"]],
  ["u21", "Creative tools are driven by talking, not menus", ["creativity", "voice"], 3, 2029],
  ["u22", "Feeds fill with agents talking to agents", ["social", "attention"], 3, 2028],
  ["u23", "People pay to be verified as human online", ["social", "trust"], 3, 2029, ["u22"]],
  ["u24", "Personal data stores come back", ["privacy", "knowledge"], 2, 2031, ["t3"]],
  ["u25", "Agents hold budgets and pay each other", ["economy", "payments"], 3, 2030, ["t7"]],
  ["u26", "Micropayments finally work, for agents", ["payments"], 2, 2031, ["u25"]],
  ["u27", "Evals stop predicting real usefulness", ["evaluation"], 4, 2027],
  ["u28", "A serious agent incident triggers new law", ["safety", "regulation"], 3, 2028],
  ["u29", "Chip export rules split the world into two stacks", ["geo"], 3, 2029, ["u15"]],
  ["u30", "Voice becomes the main way to start work", ["voice", "interfaces"], 2, 2029, [], ["t10"]],
  ["u31", "Smart glasses replace the phone for quick tasks", ["wearables", "hardware"], 2, 2032],
  ["u32", "Games become worlds generated per player", ["games", "creativity"], 2, 2031],
  ["u33", "Routine contracts are drafted without lawyers", ["law"], 4, 2029],
  ["u34", "Designers ship code, not mockups", ["design", "devtools"], 4, 2027],
  ["u35", "One-person companies reach $100M revenue", ["teams", "work"], 3, 2030, ["t5"]],
  ["e1", "Robots learn chores from watching video", ["robotics"], null, 2030],
  ["e2", "Tutoring agents come bundled with phones", ["education"], null, 2029, ["u5"]],
  ["e3", "Power prices rise where data centres cluster", ["energy"], null, 2028, ["u3"]],
  ["e4", "Search ads move into agent answers", ["search"], null, 2028, ["u10"]],
  ["e5", "A synthetic actor stars in a hit series", ["media"], null, 2029, ["u12"]],
  ["e6", "Agents need licences for financial actions", ["regulation", "payments"], null, 2031, ["u25"]],
  ["e7", "Benchmarks are replaced by live trials", ["evaluation"], null, 2028, ["u27"]],
  ["e8", "Glasses ship with an always-on agent", ["wearables"], null, 2031, ["u31", "t7"]],
  ["e9", "Small teams outcompete studios in games", ["games", "teams"], null, 2032],
  ["e10", "Design reviews happen inside the running product", ["design"], null, 2028, ["u34"]],
];

const NEW_THEMES: [string, string][] = [
  ["robotics", "Home robots"], ["energy", "Power and compute"], ["education", "Learning with agents"], ["health", "AI in medicine"],
  ["work", "Shape of work"], ["search", "End of search"], ["media", "Synthetic media"], ["trust", "Provenance and trust"],
  ["regulation", "AI regulation"], ["opensource", "Open weights"], ["devtools", "Developer tools"], ["hardware", "On-device hardware"],
  ["science", "Automated science"], ["creativity", "Creative tools"], ["social", "Social platforms"], ["privacy", "Personal data"],
  ["economy", "Agent economy"], ["payments", "Agent payments"], ["writing", "Writing with models"], ["evaluation", "Evals and benchmarks"],
  ["safety", "Model safety"], ["geo", "Compute geopolitics"], ["voice", "Voice interfaces"], ["wearables", "Wearables"],
  ["games", "Games and worlds"], ["cities", "Cities and transport"], ["climate", "Climate tech"], ["law", "Legal work"],
  ["design", "Design practice"], ["knowledge", "Personal knowledge"], ["teams", "Small teams"], ["ownership", "Who owns models"],
  ["attention", "Attention and feeds"],
];

/** Small deterministic hash, so counts look varied but never change between reloads. */
const h = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function toTheory([id, claim, themes, conf, horizon, follows = [], rivals = []]: Row): Theory {
  const k = h(id);
  return {
    id, claim, themes, confidence: conf, horizon, follows, rivals, draft: conf === null ? true : undefined,
    supports: 1 + (k % 6), undermines: k % 3, pending: k % 5 === 0 ? 1 : 0, challenge: k % 11 === 0 ? true : undefined,
    history: conf === null ? [] : [Math.max(1, conf - (k % 2)), conf], body: "",
  };
}

let installed = false;
export function install() {
  if (installed) return;
  installed = true;
  for (const [id, name] of NEW_THEMES) THEMES.push({ id, name, signals: 2 + (h(id) % 20), fresh: h(id) % 4 === 0 ? 1 : 0 } satisfies Theme);
  for (const r of [...NOW_EXTRA, ...YEAR1]) THEORIES.push(toTheory(r));
}

export type Scale = "now" | "year1";
const NOW_IDS = new Set(["t1", "t2", "t3", "t4", "t5", "t6", "t7", "d1", "d2", "d3", ...NOW_EXTRA.map(r => r[0])]);
export const inScale = (scale: Scale, id: string) => scale === "year1" || NOW_IDS.has(id);
const NOW_THEMES = new Set(["cost", "memory", "review", "personal", "funding", "interfaces", "identity"]);
export const themeInScale = (scale: Scale, id: string) => scale === "year1" || NOW_THEMES.has(id);
