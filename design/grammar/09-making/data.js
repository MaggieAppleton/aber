// Grammar 09: seed content for the making windows. Each window gets its own copy, so one window's edits never leak into another.
window.MkSeed = () => {
  const O = {};
  const add = (kind, list) => list.forEach(o => { o.kind = kind; O[o.id] = o; });
  add("theme", [
    { id: "coi", name: "Cost of intelligence", signals: 23 },
    { id: "mem", name: "Agent memory", signals: 31 },
    { id: "rev", name: "Code review after agents", signals: 18 },
    { id: "fund", name: "AI funding cycle", signals: 27 },
    { id: "ps", name: "Personal software", signals: 14 },
    { id: "local", name: "Local-first AI", signals: 8 },
    { id: "voice", name: "Voice as the default input", signals: 4, draft: true, from: "d3" },
  ]);
  add("theory", [
    { id: "t1", name: "Tokens become nearly free for routine work", themes: ["coi"], c: 3, by: 2028,
      note: "Small models keep getting cheaper faster than demand grows. Routine agent work stops being metered in any way I notice.",
      ev: [["s1", "+"], ["s2", "+"], ["s5", "-"], ["s12", "+", "suggested"]] },
    { id: "t2", name: "Frontier intelligence stays scarce and expensive", themes: ["coi"], c: 2, by: 2029, ev: [["s5", "+"]] },
    { id: "t3", name: "Agents run continuously in the background by default", themes: ["coi", "mem"], c: 3, by: 2029, ev: [] },
    { id: "t4", name: "Agents keep context across months, not sessions", themes: ["mem"], c: 4, by: 2027, ev: [["s3", "+"], ["s8", "-"]] },
    { id: "t6", name: "Code review becomes the bottleneck of shipping", themes: ["rev"], c: 4, by: 2027, ev: [["s6", "+"], ["s7", "+"]] },
    { id: "t8", name: "Most software is made for an audience of one", themes: ["ps"], c: 3, by: 2029, ev: [["s9", "+"]] },
    { id: "t11", name: "Local models absorb most everyday agent work", themes: ["coi", "local"], draft: true, from: "d1", by: 2028, ev: [["s2", "+"], ["s13", "+"]] },
    { id: "t12", name: "Software is priced per outcome, not per seat", themes: ["ps"], draft: true, from: "d5", by: 2029, ev: [] },
  ]);
  add("prototype", [
    { id: "p1", name: "Token budget meter", status: "Building", tests: ["t1"], note: "A menu-bar meter showing what each agent task cost today." },
    { id: "p2", name: "Memory inspector", status: "Idea", tests: ["t4"] },
    { id: "p4", name: "Personal app kit", status: "Built", tests: ["t8"] },
    { id: "p8", name: "Outcome pricing calculator", status: "Idea", tests: ["t12"], draft: true, from: "d5" },
  ]);
  add("signal", [
    { id: "s1", name: "Lab cuts API prices again for its small tier", src: "x.com", day: 0, themes: ["coi"], fresh: true },
    { id: "s2", name: "Open-weight model matches last year's frontier on coding", src: "news.ycombinator.com", day: 0, themes: ["coi", "local"], fresh: true },
    { id: "s3", name: "Startup ships an agent that remembers a year of email", src: "x.com", day: 0, themes: ["mem"], fresh: true },
    { id: "s5", name: "Frontier training runs keep growing in cost", src: "arxiv.org", day: 1, themes: ["coi"] },
    { id: "s6", name: "Half of new pull requests on GitHub now open from agents", src: "github.blog", day: 1, themes: ["rev"] },
    { id: "s7", name: "Staff engineer thread on reviewer fatigue", src: "x.com", day: 1, themes: ["rev"] },
    { id: "s8", name: "Lab pauses memory feature after privacy complaints", src: "theverge.com", day: 1, themes: ["mem"] },
    { id: "s9", name: "Friend built a budgeting app in an afternoon", src: "My own observation", day: 2, themes: ["ps"] },
    { id: "s12", name: "Inference chip startup halves its per-token price", src: "x.com", day: 2, themes: ["coi"] },
    { id: "s13", name: "Small model runs a full coding agent on a laptop", src: "simonwillison.net", day: 2, themes: ["local", "coi"] },
    { id: "s14", name: "Cloud provider bundles a million free tokens with every account", src: "theinformation.com", day: 3, themes: ["coi"] },
    { id: "s15", name: "Batch inference prices fall below a cent per thousand calls", src: "x.com", day: 3, themes: ["coi"] },
    { id: "s16", name: "Agent tracing tool goes open source", src: "github.com", day: 3, themes: [] },
  ]);
  add("dump", [
    { id: "d1", name: "Three X links and a ramble about pricing", day: 0, time: "09:12", via: "Shortcut", made: ["s1", "s2", "s3", "t11"],
      text: "Prices keep falling at the small end. Routine stuff just stops costing anything I'd notice. Maybe local models eat it entirely?" },
    { id: "d2", name: "Braintrust funding link", day: 0, time: "08:47", via: "Safari share", made: [], text: "techcrunch.com/2026/11/04/braintrust-series-b" },
    { id: "d3", name: "Voice note after the Foglamp demo", day: 1, time: "18:20", len: "2:14", via: "Shortcut", made: ["s5", "s7", "s8", "voice"],
      text: "The demo was great but they kept saying memory is off for now because of the privacy stuff. Also everyone in the room complained about reviewing agent PRs." },
    { id: "d5", name: "Is anyone pricing agents per outcome?", day: 2, time: "21:05", via: "Dump or ask", made: ["t12", "p8"], text: "Is anyone pricing agents per outcome?" },
  ]);
  return O;
};
