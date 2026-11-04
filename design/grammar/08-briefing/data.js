// Grammar 08: Briefing content. Extends 06's world (AberObjects.O) with this morning's signals and dumps, then lists what each day's Briefing holds.
// Decisions wait until handled (challenges, suggestions, drafts); news is only what arrived since you last looked (signals, dumps).
(() => {
  const A = window.AberObjects, { O } = A;
  const add = (kind, list) => list.forEach(o => { o.kind = kind; O[o.id] = o; });

  O.t6.trip = "I'd change my mind if review time per pull request falls while agent pull requests keep growing";
  add("signal", [
    { id: "s20", name: "Teams report review time per pull request fell by a third with AI pre-review", src: "linearb.io", day: 0, themes: ["rev"], ev: [],
      note: "Pre-review bots catch the routine comments, so people only read what's left. Agent pull requests still grew 40% in the same period." },
    { id: "s21", name: "Cloud provider makes its small model free under a million calls a day", src: "x.com", day: 0, themes: ["coi"], ev: [] },
    { id: "s22", name: "Users export their assistant memory to switch providers", src: "reddit.com", day: 0, themes: ["mem"], ev: [] },
    { id: "s23", name: "Merge queue waits double at a large monorepo after agent rollout", src: "news.ycombinator.com", day: 0, themes: ["rev"], ev: [] },
    { id: "s24", name: "Two agent startups shut down after failing to raise", src: "theinformation.com", day: 0, themes: ["fund"], ev: [] },
    { id: "s25", name: "Card network pilots payments started by agents", src: "x.com", day: 0, themes: ["aid"], ev: [] },
    { id: "s26", name: "Assistant now runs scheduled tasks overnight without a prompt", src: "x.com", day: 0, themes: ["mem"], ev: [] },
    { id: "s27", name: "Code host adds an intent summary above every diff", src: "github.blog", day: 0, themes: ["rev"], ev: [] },
    { id: "s28", name: "Agent keeps a running project memory across a month of commits", src: "simonwillison.net", day: 0, themes: ["mem"], ev: [] },
    { id: "s29", name: "Inference prices fall faster than chip prices", src: "semianalysis.com", day: 0, themes: ["coi"], ev: [] },
  ]);
  add("dump", [
    { id: "d9", name: "Voice note on the walk in", kw: "Voice note", len: "1m 02s", day: 0, time: "09:26", via: "Shortcut", made: [], processing: true, text: "" },
    { id: "d10", name: "Two newsletters forwarded", kw: "Links", day: 0, time: "07:52", via: "Email", made: ["s22", "s24", "s25"], text: "newsletter.example/… newsletter.example/…" },
    { id: "d11", name: "Screenshot of a thread on review queues", kw: "Image", day: 0, time: "07:31", via: "Shortcut", made: ["s20", "s23", "s27"], text: "Image, 1 attachment" },
    { id: "d12", name: "Morning links", kw: "Links", day: 0, time: "06:40", via: "Shortcut", made: ["s21", "s26", "s28", "s29"], text: "x.com/… x.com/… simonwillison.net/… semianalysis.com/…" },
  ]);
  O.d8.name = "stratechery.com: agents and the price of a seat";

  // Item kinds: challenge { theory, signal } · sug { target, as, signal | other | text, why } · draft { obj, why } · signal ids · dump ids
  const C = (theory, signal) => ({ id: `c-${theory}`, kind: "challenge", theory, signal });
  const S = (target, as, x, why) => ({ id: `g-${target}-${x.signal || x.other || "w"}`, kind: "sug", target, as, ...x, why });
  const D = (obj, why) => ({ id: `d-${obj}`, kind: "draft", obj, why });

  const DAYS = {
    quiet: {
      looked: "18:40",
      decisions: [
        C("t4", "s8"),
        S("t2", "Undermines", { signal: "s2" }, "If last year's frontier now runs open, only the newest tier stays scarce."),
        D("t11", "From your links dump at 09:12"),
      ],
      signals: ["s1", "s2", "s3", "s4"],
      dumps: ["d1", "d2"],
    },
    busy: {
      looked: "18:40",
      decisions: [
        C("t4", "s8"), C("t6", "s20"),
        S("t1", "Supports", { signal: "s21" }, "Free under a million calls a day is what nearly free looks like for routine work."),
        S("t1", "Supports", { signal: "s29" }, "Prices falling faster than the chips under them means it isn't only cheaper hardware."),
        S("t1", "New wording", { text: "Tokens become nearly free for routine work, but not for frontier reasoning" }, "Three of your signals split routine calls from frontier ones. The claim reads as if both fall."),
        S("t2", "Undermines", { signal: "s2" }, "If last year's frontier now runs open, only the newest tier stays scarce."),
        S("t3", "Supports", { signal: "s26" }, "Overnight runs without a prompt are the default this theory expects."),
        S("t5", "Undermines", { signal: "s22" }, "If memory moves with you, it stops locking you in."),
        S("t5", "Supports", { signal: "s28" }, "A month of project memory is the switching cost this theory depends on."),
        S("t6", "Supports", { signal: "s23" }, "Waiting to merge is review time by another name."),
        S("t7", "Supports", { signal: "s27" }, "A summary of intent above the diff is reading intent, not lines."),
        S("t9", "Supports", { signal: "s24" }, "Shutdowns after failed raises are the correction starting at the edges."),
        S("t10", "Supports", { signal: "s25" }, "A payment an agent starts needs an account the agent holds."),
        S("obs", "Merge with", { other: "evals" }, "4 signals and 1 theory are filed in both."),
        D("t11", "From your links dump at 09:12"),
        D("t13", "From 3 funding signals this week"),
        D("voice", "From 4 signals with no theme yet"),
        D("t12", "From your ask on Monday"),
        D("p8", "Tests Software is priced per outcome, not per seat"),
      ],
      signals: ["s1", "s2", "s21", "s29", "s3", "s22", "s26", "s28", "s20", "s23", "s27", "s4", "s24", "s25"],
      merged: { s1: "theverge.com" },   // near-duplicates the agent merged on its own: logged here, one click to unmerge
      dumps: ["d9", "d8", "d1", "d2", "d10", "d11", "d12"],
    },
    clear: { looked: "18:40", decisions: [], signals: [], dumps: [] },
  };

  // The theory a signal bears on (choice 1 B): its first evidence link, else the theory a pending suggestion or challenge would tie it to
  const theoryOf = (sid, decisions) => {
    const s = O[sid], ev = s.ev?.[0]?.[0];
    if (ev && O[ev] && !O[ev].draft) return ev;
    const d = decisions.find(x => x.signal === sid && O[x.theory || x.target]?.kind === "theory");
    return d ? d.theory || d.target : ev || "";
  };

  window.Brief08Data = { DAYS, theoryOf };
})();
