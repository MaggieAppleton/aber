export type ObjectKey = "dump" | "signal" | "theme" | "theory" | "prototype";

export type ObjectReq = {
  key: ObjectKey;
  name: string;
  kind: "Flow" | "Stock";
  y1: number;          // total after one year
  y3: number;          // total after three years
  live: number;        // how many you care about at once
  liveWhat: string;
  arrives: string;
  asks: string[];      // questions you put to it
  all: string;         // how to see every one
  context: string;     // how it's mostly seen
  reachedFrom: string;
};

// Estimates, low confidence: about 5 dumps a day and about 2 new signals per dump after de-duplication.
export const OBJECTS: ObjectReq[] = [
  { key: "dump", name: "Dumps", kind: "Flow", y1: 1800, y3: 5500, live: 5, liveWhat: "today",
    arrives: "About 5 a day, in bursts", asks: ["Did it get processed?", "Where did this signal come from?"],
    all: "A log by date, searchable", context: "Behind a signal, as its origin", reachedFrom: "A signal, the capture pill" },
  { key: "signal", name: "Signals", kind: "Flow", y1: 3500, y3: 10000, live: 40, liveWhat: "new this week",
    arrives: "About 10 a day, filed by agents", asks: ["What's new?", "What's in this theme?", "What backs this theory?"],
    all: "Never all at once: search and filter only", context: "Inside a theme, or as evidence on a theory", reachedFrom: "A theme, a theory, search" },
  { key: "theme", name: "Themes", kind: "Stock", y1: 40, y3: 150, live: 8, liveWhat: "active",
    arrives: "A few a month, clustered overnight", asks: ["What am I paying attention to?", "Where is there no theory yet?"],
    all: "An index with counts and recent activity", context: "As the home of signals and theories", reachedFrom: "The index, a theory, a signal" },
  { key: "theory", name: "Theories", kind: "Stock", y1: 60, y3: 200, live: 15, liveWhat: "held",
    arrives: "A few a week, mostly as agent drafts", asks: ["What do I believe?", "How sure am I?", "What would change my mind?"],
    all: "Every held claim on one screen", context: "Among rivals, causes and consequences", reachedFrom: "A theme, another theory, a prototype" },
  { key: "prototype", name: "Prototypes", kind: "Stock", y1: 10, y3: 30, live: 2, liveWhat: "being built",
    arrives: "One or two a month", asks: ["What am I building?", "Does it still rest on a held theory?"],
    all: "A gallery with media", context: "Above the theory it embodies", reachedFrom: "A theory, the prototypes area" },
];

/** What a population can bear, by order of magnitude. */
export const SCALES = [
  { max: 20, name: "All visible", how: "Every item on screen at once, arranged in space. Cards, a wall, a gallery." },
  { max: 200, name: "Index", how: "One line each, sorted and searchable. Fits in a scroll, with the live few lifted to the top." },
  { max: 2000, name: "Stream", how: "Ordered by time and grouped by day. You read the recent end; the rest is search." },
  { max: Infinity, name: "Only in context", how: "Never listed whole. Seen through a parent (a theme, a theory) or a query." },
];

export const scaleOf = (n: number) => SCALES.findIndex(s => n <= s.max);
