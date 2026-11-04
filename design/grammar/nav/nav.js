// Grammar nav: a working prototype of type-first navigation, in three structures.
// Usage: <div class="nv-host" data-nav='{"v":"B"}'></div>   v: A (item fills main), B (contents as boxes + pane), C (icon rail + item + pane)
// Each host keeps its own state; the window renders at 1280 wide and zooms to fit its host.
(() => {
  /* ── Content ─────────────────────────────────────────── */
  const TYPES = {
    briefing: { name: "Briefing", icon: "sun-horizon" },
    theme: { name: "Themes", one: "Theme", icon: "binoculars" },
    theory: { name: "Theories", one: "Theory", icon: "target" },
    prototype: { name: "Prototypes", one: "Prototype", icon: "pencil-ruler" },
    signal: { name: "Signals", one: "Signal", icon: "pulse" },
    dump: { name: "Dumps", one: "Dump", icon: "tray-arrow-down" },
    tripwire: { icon: "signpost" },
  };
  const RAIL = ["theme", "theory", "prototype", "signal", "dump"];
  const O = {};
  const add = (kind, list) => list.forEach(o => { o.kind = kind; O[o.id] = o; });
  const all = kind => Object.values(O).filter(o => o.kind === kind);
  const DAYS = ["Today", "Yesterday", "Monday 2 Nov", "Sunday 1 Nov"];
  const OLDER = { signal: [["October", 288], ["September", 109]], dump: [["October", 201], ["September", 78]] };
  const TOTAL = { signal: 412, dump: 286 };

  add("theme", [
    { id: "coi", name: "Cost of intelligence", signals: 23, fresh: 3 },
    { id: "mem", name: "Agent memory", signals: 31, fresh: 1 },
    { id: "rev", name: "Code review after agents", signals: 18 },
    { id: "fund", name: "AI funding cycle", signals: 27, fresh: 1 },
    { id: "ps", name: "Personal software", signals: 14 },
    { id: "aid", name: "Agent identity", signals: 11 },
    { id: "local", name: "Local-first AI", signals: 8, fresh: 1 },
    { id: "nai", name: "Novel agent interfaces", signals: 9 },
    { id: "obs", name: "Agent observability", signals: 6, fresh: 1 },
    { id: "evals", name: "Evals as a product", signals: 5 },
    { id: "voice", name: "Voice as the default input", signals: 4, draft: true },
    { id: "synth", name: "Synthetic data markets", signals: 3, draft: true },
  ]);
  add("theory", [
    { id: "t1", name: "Tokens become nearly free for routine work", themes: ["coi"], c: 3, by: 2028, rival: "t2", pending: 2,
      note: "Small models keep getting cheaper faster than demand grows. Routine agent work stops being metered in any way I notice.",
      trip: "I'd change my mind if a frontier lab prices routine calls above last year's" },
    { id: "t2", name: "Frontier intelligence stays scarce and expensive", themes: ["coi"], c: 2, by: 2029, rival: "t1", pending: 1,
      note: "The best models keep needing more compute than anyone can amortise. The top tier stays a premium product.", trip: "I'd change my mind if a frontier model ships at small-model prices" },
    { id: "t3", name: "Agents run continuously in the background by default", themes: ["coi", "mem"], c: 3, by: 2029, follows: ["t1"],
      note: "Once routine work is free, nobody waits to be asked. Agents keep working on standing goals." },
    { id: "t4", name: "Agents keep context across months, not sessions", themes: ["mem"], c: 4, by: 2027, challenge: "s8",
      note: "Memory stops being a feature and becomes the default. Starting from zero each session will feel broken.", trip: "I'd change my mind if a major lab rolls back long-term memory" },
    { id: "t5", name: "Memory becomes the main lock-in for agent products", themes: ["mem"], c: 3, by: 2028, follows: ["t4"] },
    { id: "t6", name: "Code review becomes the bottleneck of shipping", themes: ["rev"], c: 4, by: 2027,
      note: "Agents write more than people can read. Review, not writing, sets the pace." },
    { id: "t7", name: "Reviewers read intent, not diffs", themes: ["rev"], c: 2, by: 2028, follows: ["t6"] },
    { id: "t8", name: "Most software is made for an audience of one", themes: ["ps"], c: 3, by: 2029 },
    { id: "t9", name: "Labs face a funding correction before agents pay their way", themes: ["fund"], c: 2, by: 2027 },
    { id: "t10", name: "Agents get their own accounts and credentials", themes: ["aid"], c: 3, by: 2028 },
    { id: "t11", name: "Local models absorb most everyday agent work", themes: ["coi", "local"], draft: true, by: 2028 },
    { id: "t12", name: "Software is priced per outcome, not per seat", themes: ["ps", "coi"], draft: true, by: 2029 },
    { id: "t13", name: "Funding shifts from labs to applications", themes: ["fund"], draft: true, by: 2028 },
    { id: "t14", name: "Chat stays the main interface to models", themes: ["nai"], retired: "Disproven", c: 1, by: 2026 },
    { id: "t15", name: "Every agent action needs a human sign-off", themes: ["aid"], retired: "Abandoned", c: 2, by: 2027 },
  ]);
  const STATUS = { building: ["Building", "hammer"], idea: ["Idea", "lightbulb"], built: ["Built", "check-circle"], shelved: ["Shelved", "archive"] };
  add("prototype", [
    { id: "p1", name: "Token budget meter", status: "building", tests: ["t1"], body: "A menu-bar meter showing what each agent task cost today, to test whether routine work really stops being noticed." },
    { id: "p3", name: "Intent diff viewer", status: "building", tests: ["t7"], body: "Shows the stated intent of a change beside the diff, and flags where they disagree." },
    { id: "p2", name: "Memory inspector", status: "idea", tests: ["t4", "t5"] },
    { id: "p5", name: "Agent passport", status: "idea", tests: ["t10"] },
    { id: "p4", name: "Personal app kit", status: "built", tests: ["t8"] },
    { id: "p6", name: "Overnight digest", status: "built", tests: ["t3"] },
    { id: "p7", name: "Review queue for agents", status: "shelved", tests: ["t6"] },
    { id: "p8", name: "Outcome pricing calculator", status: "idea", tests: ["t12"], draft: true },
  ]);
  add("signal", [
    { id: "s1", name: "Lab cuts API prices again for its small tier", src: "x.com", day: 0, themes: ["coi"], ev: [["t1", "+"]], fresh: true },
    { id: "s2", name: "Open-weight model matches last year's frontier on coding", src: "news.ycombinator.com", day: 0, themes: ["coi", "local"], ev: [["t1", "+"], ["t11", "+"]], fresh: true },
    { id: "s3", name: "Startup ships an agent that remembers a year of email", src: "x.com", day: 0, themes: ["mem"], ev: [["t4", "+"], ["t5", "+"]], fresh: true },
    { id: "s4", name: "Braintrust raises Series B", src: "techcrunch.com", day: 0, themes: ["obs", "fund"], ev: [["t13", "+"]], fresh: true },
    { id: "s5", name: "Frontier training runs keep growing in cost", src: "arxiv.org", day: 1, themes: ["coi"], ev: [["t1", "-"], ["t2", "+"]] },
    { id: "s6", name: "Half of new pull requests on GitHub now open from agents", src: "github.blog", day: 1, themes: ["rev"], ev: [["t6", "+"]] },
    { id: "s7", name: "Staff engineer thread on reviewer fatigue", src: "x.com", day: 1, themes: ["rev"], ev: [["t6", "+"], ["t7", "+"]] },
    { id: "s8", name: "Lab pauses memory feature after privacy complaints", src: "theverge.com", day: 1, themes: ["mem"], ev: [["t4", "-"]] },
    { id: "s9", name: "Friend built a budgeting app in an afternoon", src: "My own observation", day: 2, themes: ["ps"], ev: [["t8", "+"]] },
    { id: "s10", name: "Seed rounds for agent startups fall for a second quarter", src: "pitchbook.com", day: 2, themes: ["fund"], ev: [["t9", "+"]] },
    { id: "s11", name: "Bank issues API keys to customers' agents", src: "x.com", day: 2, themes: ["aid"], ev: [["t10", "+"]] },
    { id: "s12", name: "Inference chip startup halves its per-token price", src: "x.com", day: 2, themes: ["coi"], ev: [["t1", "+"]] },
    { id: "s13", name: "Small model runs a full coding agent on a laptop", src: "simonwillison.net", day: 3, themes: ["local", "coi"], ev: [["t11", "+"], ["t2", "-"]] },
    { id: "s14", name: "Agent tracing tool goes open source", src: "github.com", day: 3, themes: ["obs"], ev: [] },
    { id: "s15", name: "Lab raises at a lower valuation than its last round", src: "ft.com", day: 3, themes: ["fund"], ev: [["t9", "+"]] },
  ]);
  add("dump", [
    { id: "d1", name: "Three X links and a ramble about pricing", day: 0, time: "09:12", via: "Shortcut", made: ["s1", "s2", "s3", "t11"],
      text: "x.com/… x.com/… news.ycombinator.com/… Prices keep falling at the small end. Routine stuff just stops costing anything I'd notice. Maybe local models eat it entirely?" },
    { id: "d2", name: "Braintrust funding link", day: 0, time: "08:47", via: "Safari share", made: ["s4"], text: "techcrunch.com/…" },
    { id: "d3", name: "Voice note after the Foglamp demo", day: 1, time: "18:20", len: "2m 14s", via: "Shortcut", made: ["s5", "s7", "s8"],
      text: "Transcript: The demo was great but they kept saying memory is off for now because of the privacy stuff. Also everyone in the room complained about reviewing agent PRs…" },
    { id: "d4", name: "Screenshot of GitHub's agent PR stats", day: 1, time: "11:02", via: "Shortcut", made: ["s6"], text: "Image, 1 attachment" },
    { id: "d5", name: "Is anyone pricing agents per outcome?", day: 2, time: "21:05", via: "Dump-or-ask column", made: ["t12"], ask: true,
      text: "Is anyone pricing agents per outcome?", reply: "Two of your signals touch this. I drafted a theory from it: Software is priced per outcome, not per seat." },
    { id: "d6", name: "Morning links", day: 2, time: "07:58", via: "Shortcut", made: ["s10", "s11", "s12"], text: "pitchbook.com/… x.com/… x.com/…" },
    { id: "d7", name: "Weekend reading list", day: 3, time: "10:30", via: "Web app", made: ["s13", "s14", "s15"], text: "simonwillison.net/… github.com/… ft.com/…" },
  ]);
  const BRIEF = [["Challenges", ["t4"]], ["Drafts", ["t11", "t12", "voice", "p8"]], ["Suggestions", ["t1", "t2"]], ["New signals", ["s1", "s2", "s3", "s4"]]];

  /* ── Relations ─────────────────────────────────────── */
  const theoriesOf = th => all("theory").filter(t => t.themes.includes(th.id) && !t.retired);
  const signalsOf = th => all("signal").filter(s => s.themes.includes(th.id));
  const evOf = t => all("signal").flatMap(s => s.ev.filter(([id]) => id === t.id).map(([, st]) => ({ s, st })));
  const ups = t => evOf(t).filter(e => e.st === "+").length, downs = t => evOf(t).filter(e => e.st === "-").length;
  const protosOf = t => all("prototype").filter(p => p.tests.includes(t.id));
  const followers = t => all("theory").filter(x => (x.follows || []).includes(t.id));
  const dumpsOf = s => all("dump").filter(d => d.made.includes(s.id));
  const neighbours = o => ({
    theme: () => [...theoriesOf(o), ...signalsOf(o)],
    theory: () => [...o.themes.map(id => O[id]), ...evOf(o).map(e => e.s), ...protosOf(o), ...followers(o), ...(o.follows || []).map(id => O[id]), ...(o.rival ? [O[o.rival]] : [])],
    signal: () => [...o.themes.map(id => O[id]), ...o.ev.map(([id]) => O[id]), ...dumpsOf(o)],
    prototype: () => o.tests.map(id => O[id]),
    dump: () => o.made.map(id => O[id]),
  })[o.kind]();
  // Lineage for Columns: neighbours, plus one step further along raw → refined
  const lineage = o => {
    const set = new Set([o.id]); const n1 = neighbours(o); n1.forEach(x => set.add(x.id));
    n1.forEach(x => { if (o.kind === "theme" && x.kind === "theory") protosOf(x).forEach(p => set.add(p.id));
      if (o.kind === "theme" && x.kind === "signal") dumpsOf(x).forEach(d => set.add(d.id));
      if (o.kind === "theory" && x.kind === "signal") dumpsOf(x).forEach(d => set.add(d.id));
      if (o.kind === "signal" && x.kind === "theory") protosOf(x).forEach(p => set.add(p.id));
      if (o.kind === "prototype" && x.kind === "theory") { x.themes.forEach(id => set.add(id)); evOf(x).forEach(e => set.add(e.s.id)); }
      if (o.kind === "dump" && x.kind === "signal") x.themes.forEach(id => set.add(id)); });
    return set;
  };
  const defaultPane = (o, v) => o.kind === "theme" ? theoriesOf(o)[0]?.id ?? null : v === "B" ? o.id : null;

  /* ── Atoms ─────────────────────────────────────────── */
  const g = (t, draft) => `<span class="g${draft ? " draft" : ""}" data-type="${t}"><i class="ph ph-${TYPES[t].icon}" aria-hidden="true"></i></span>`;
  const conf = (n, lg) => `<span class="nv-conf${lg ? " lg" : ""}" role="img" aria-label="Confidence ${n} of 5">${[1, 2, 3, 4, 5].map(i => `<i${i <= n ? " data-on" : ""}></i>`).join("")}</span>`;
  const ib = (icon, label, attr = "") => `<button type="button" class="nv-ib" aria-label="${label}" title="${label}" ${attr}><i class="ph ph-${icon}" aria-hidden="true"></i></button>`;
  const chip = (o, cls = "") => `<button type="button" class="nv-chip ${cls}${o.draft ? " draft" : ""}" data-open="${o.id}" title="${o.name}">${g(o.kind, o.draft)}${o.name}</button>`;
  const dot = (kind, label) => `<span class="nv-dot ${kind}" role="img" aria-label="${label}" title="${label}"></span>`;
  const statusIcon = p => `<i class="ph ph-${STATUS[p.status][1]} st" role="img" aria-label="${STATUS[p.status][0]}" title="${STATUS[p.status][0]}"></i>`;
  const subOf = o => ({
    theme: () => `<span>${o.signals} signals</span><span>${theoriesOf(o).length} theories</span>`,
    theory: () => o.retired ? `<span>Retired, ${o.retired.toLowerCase()}</span>` : o.draft ? `<span>Draft</span><span>+${ups(o)} −${downs(o)}</span>` : `${conf(o.c)}<span>+${ups(o)} −${downs(o)}</span>`,
    signal: () => `<span>${o.src}</span><span>${DAYS[o.day]}</span>`,
    prototype: () => `<span>${STATUS[o.status][0]}</span><span>Tests ${o.tests.length}</span>`,
    dump: () => `<span class="nv-mono">${o.time}</span><span>${DAYS[o.day]}</span><span>Made ${o.made.length}</span>`,
  })[o.kind]();

  // A card: a contained box for an object listed inside another
  const card = (o, cur) => {
    const meta = o.kind === "theory"
      ? `${o.c && !o.draft ? conf(o.c) : ""}<span>+${ups(o)} −${downs(o)}</span>${protosOf(o).length ? `<span class="in">${g("prototype")}${protosOf(o).length}</span>` : ""}${o.pending ? `<span class="nv-pending" aria-label="${o.pending} pending suggestions">${o.pending}</span>` : ""}${o.challenge ? dot("neg", "Challenge") : ""}`
      : o.kind === "signal" ? `<span>${o.src}</span>${o.fresh ? dot("new", "New") : ""}`
      : o.kind === "theme" ? `<span>${o.signals} signals</span><span>${theoriesOf(o).length} theories</span>`
      : o.kind === "prototype" ? `<span class="in">${statusIcon(o)}${STATUS[o.status][0]}</span>`
      : `<span class="nv-mono">${o.time}</span><span>${DAYS[o.day]}</span>`;
    return `<button type="button" class="nv-card${o.draft ? " draft" : ""}" data-open="${o.id}" aria-current="${o.id === cur}"><span class="cn">${o.name}</span><span class="cm">${meta}</span></button>`;
  };
  // A row inside a box (evidence, a feed): glyph, name, source
  const item = (o, cur, extra = "") => {
    const src = o.kind === "signal" ? `<span>${o.src}</span>` : o.kind === "dump" ? `<span class="nv-mono">${o.time}</span><span>${DAYS[o.day]}</span>` : o.kind === "theory" ? subOf(o) : "";
    return `<button type="button" class="nv-item${o.draft ? " draft" : ""}" data-open="${o.id}" aria-current="${o.id === cur}">${g(o.kind, o.draft)}<span class="t"><span>${o.name}</span>${o.fresh ? dot("new", "New") : ""}</span>${src || extra ? `<span class="src">${extra}${src}</span>` : ""}</button>`;
  };
  const feed = (list, cur) => {
    let out = "", day = -1;
    for (const s of list) { if (s.day !== day) { day = s.day; out += `<div class="nv-day">${DAYS[day]}</div>`; } out += item(s, cur); }
    return `<div class="nv-box">${out}</div>`;
  };

  /* ── Rail ──────────────────────────────────────────── */
  const LENSES = [["list", "list-dashes", "List"], ["columns", "columns", "Columns"], ["atlas", "map-trifold", "Atlas"], ["timeline", "chart-scatter", "Timeline"]];
  const countOf = t => t === "briefing" ? BRIEF.reduce((n, [, ids]) => n + ids.length, 0) : TOTAL[t] ?? all(t).filter(o => !o.retired).length;
  const rail = s => `
    <aside class="nv-rail">
      <div class="nv-brand">${s.v === "C" ? "" : "<span>Aber</span>"}${ib("magnifying-glass", "Find")}</div>
      <nav class="nv-types" aria-label="Types">
        ${["briefing", ...RAIL].map(t => `<button type="button" class="nv-type${t === "briefing" ? " brief" : ""}" data-go="${t}" aria-current="${s.type === t}" title="${TYPES[t].name}" aria-label="${TYPES[t].name}">${g(t)}<span class="nm">${TYPES[t].name}</span>${t === "signal" || t === "briefing" ? dot("new", "New since yesterday") : ""}<span class="nv-n">${countOf(t)}</span></button>`).join("")}
      </nav>
      <div class="nv-lenses" role="group" aria-label="Lens">${LENSES.map(([v, i, l]) => `<button type="button" data-lens="${v}" aria-pressed="${s.lens === v}" aria-label="${l}" title="${l}"><i class="ph ph-${i}" aria-hidden="true"></i></button>`).join("")}</div>
    </aside>`;

  /* ── Item list (second sidebar) ────────────────────── */
  const list = s => {
    const t = s.type, cur = s.sel[t], q = s.q.toLowerCase();
    const hit = o => (!q || o.name.toLowerCase().includes(q)) && (!s.tf || (o.themes || []).includes(s.tf));
    const row = (o, inner, cls = "") => `<button type="button" class="nv-row ${cls}${o.draft ? " draft" : ""}" data-sel="${o.id}" aria-current="${o.id === cur}" title="${o.name}">${inner}</button>`;
    const group = (label, rows, opts = {}) => rows.length || opts.always ? `<div class="nv-group">${label ? `<div class="nv-glabel">${label}${opts.n != null ? `<span class="nv-n">${opts.n}</span>` : ""}</div>` : ""}${rows.join("")}</div>` : "";
    const fold = (key, label, n, rows) => `<div class="nv-group"><button type="button" class="nv-glabel" data-toggle="${key}" aria-expanded="${!!s.open[key]}"><i class="ph ph-caret-${s.open[key] ? "down" : "right"}" aria-hidden="true"></i>${label}<span class="nv-n">${n}</span></button>${s.open[key] ? rows.join("") : ""}</div>`;
    const search = ph => `<label class="nv-search"><i class="ph ph-magnifying-glass" aria-hidden="true"></i><input data-q type="search" placeholder="${ph}" value="${s.q}" aria-label="${ph}"></label>`;
    let tools = "", body = "", add = true, meta = countOf(t);

    if (t === "briefing") {
      add = false; meta = "";
      body = BRIEF.map(([label, ids]) => group(label, ids.map(id => O[id]).map(o => row(o, `${g(o.kind, o.draft)}<span class="nm">${o.name}</span>${o.challenge ? dot("neg", "Challenge") : o.pending ? `<span class="nv-pending">${o.pending}</span>` : ""}`, "mixed")), { n: ids.length })).join("");
    } else if (t === "theme") {
      const r = o => row(o, `<span class="nm">${o.name}</span>${o.fresh ? dot("new", `${o.fresh} new signals`) : ""}${theoriesOf(o).length ? `<span class="nv-n">${theoriesOf(o).length}</span>` : '<span class="nv-ring" role="img" aria-label="Open: no theory yet" title="Open: no theory yet"></span>'}`);
      const mine = all("theme").filter(o => !o.draft).sort((a, b) => (b.fresh || 0) - (a.fresh || 0));
      body = group("", mine.map(r)) + group("Drafts", all("theme").filter(o => o.draft).map(r));
    } else if (t === "theory") {
      tools = search("Find a theory");
      const r = o => row(o, `<span class="nm">${o.name}</span><span class="marks">${o.pending ? `<span class="nv-pending" aria-label="${o.pending} pending suggestions">${o.pending}</span>` : ""}${o.challenge ? dot("neg", "Challenge") : ""}</span>`, "two");
      const ts = all("theory").filter(hit);
      body = group("Held", ts.filter(o => !o.draft && !o.retired).map(r)) + group("Drafts", ts.filter(o => o.draft).map(r))
        + fold("retired", "Retired", ts.filter(o => o.retired).length, ts.filter(o => o.retired).map(r));
    } else if (t === "prototype") {
      const r = o => row(o, `<span class="nm">${o.name}</span>${statusIcon(o)}`);
      body = Object.entries(STATUS).map(([k, [label]]) => group(label, all("prototype").filter(o => o.status === k && !o.draft).map(r))).join("")
        + group("Drafts", all("prototype").filter(o => o.draft).map(r));
    } else if (t === "signal") {
      add = false;
      tools = search("Find a signal") + `<select class="nv-filter" data-tf aria-label="Filter by theme"><option value="">All themes</option>${all("theme").filter(o => !o.draft).map(o => `<option value="${o.id}"${s.tf === o.id ? " selected" : ""}>${o.name}</option>`).join("")}</select>`;
      const r = o => row(o, `<span class="nm">${o.name}</span><span class="marks">${o.fresh ? dot("new", "New") : ""}</span><span class="sub"><span>${o.src}</span></span>`, "two");
      body = DAYS.map((d, i) => group(d, all("signal").filter(o => o.day === i && hit(o)).map(r))).join("") + OLDER.signal.map(([m, n]) => fold(m, m, n, [])).join("");
    } else if (t === "dump") {
      add = false;
      tools = search("Find a dump");
      const r = o => row(o, `<span class="nm">${o.name}</span><span class="marks"><span class="nv-mono">${o.time}</span></span><span class="sub"><span>${o.ask ? "Ask, 1 reply" : `${o.made.length} made`}</span>${o.len ? `<span>${o.len}</span>` : ""}</span>`, "two");
      body = DAYS.map((d, i) => group(d, all("dump").filter(o => o.day === i && hit(o)).map(r))).join("") + OLDER.dump.map(([m, n]) => fold(m, m, n, [])).join("");
    }
    if (!body.replace(/<[^>]+>/g, "").trim()) body = `<p class="nv-empty">Nothing matches</p>`;
    return `
      <section class="nv-list" aria-label="${TYPES[t].name}">
        <div class="nv-lhead"><span class="h">${t === "briefing" ? "Since yesterday" : TYPES[t].name}</span>${meta !== "" ? `<span class="nv-meta">${meta}</span>` : ""}${add ? ib("plus", `New ${TYPES[t].one.toLowerCase()}`) : ""}</div>
        ${tools ? `<div class="nv-tools">${tools}</div>` : ""}
        <div class="nv-scroll">${body}</div>
      </section>`;
  };

  /* ── The full view of one object ───────────────────── */
  const doc = (o, s, where) => {
    const cur = where === "main" ? s.pane : null;
    const back = where === "main" && s.v === "A" && s.back.length ? (() => { const [, id] = s.back.at(-1); return `<button type="button" class="nv-back" data-back><i class="ph ph-arrow-left" aria-hidden="true"></i><span>${O[id].name}</span></button>`; })() : "";
    const ctl = where === "pane" ? `<span class="ctl">${ib("arrows-out-simple", "Open in the main area", "data-promote")}${ib("x", "Close", "data-close")}</span>` : "";
    const lead = o.kind === "theory" || o.kind === "signal" ? o.themes.map(id => chip(O[id])).join("")
      : `<span class="nv-chip plain">${g(o.kind, o.draft)}${o.kind === "prototype" ? STATUS[o.status][0] : o.draft ? `Draft ${TYPES[o.kind].one.toLowerCase()}` : TYPES[o.kind].one}</span>`;
    const top = `${back ? `<div class="nv-top">${back}${ctl}</div>` : ""}<div class="nv-top"><div class="nv-chips">${lead}</div>${back ? "" : ctl}</div>`;
    const title = `<h3 class="nv-title${o.draft ? " draft" : ""}">${o.name}</h3>`;
    let body = "";
    if (o.kind === "theory") {
      const ev = evOf(o), sup = ev.filter(e => e.st === "+"), und = ev.filter(e => e.st === "-");
      const evCol = (label, icon, arr) => `<div class="nv-ev-col"><div class="nv-ev-head"><i class="ph ph-${icon}" aria-hidden="true"></i>${label} ${arr.length}</div>${arr.map(e => item(e.s, cur)).join("")}</div>`;
      const rel = [...protosOf(o), ...followers(o)];
      body = `
        <dl class="nv-fields">
          ${o.draft ? `<dt>Draft</dt><dd><span class="nv-decide"><button type="button" class="nv-btn secondary">Discard</button><button type="button" class="nv-btn primary">Accept</button></span></dd>`
            : o.retired ? `<dt>Retired</dt><dd>${o.retired}</dd>` : `<dt>Confidence</dt><dd>${conf(o.c, true)}</dd>`}
          <dt>Happens by</dt><dd>${o.by}</dd>
          ${o.rival ? `<dt>Rival</dt><dd>${chip(O[o.rival])}</dd>` : ""}
          ${o.follows ? `<dt>Follows from</dt><dd>${o.follows.map(id => chip(O[id])).join("")}</dd>` : ""}
        </dl>
        ${o.note ? `<p class="nv-note">${o.note}</p>` : ""}
        ${o.trip ? `<div class="nv-trip">${g("tripwire")}<span>${o.trip}</span>${o.challenge ? dot("neg", "Tripped") : ""}</div>` : ""}
        <div class="nv-ev">${evCol("Supports", "arrow-up", sup)}${evCol("Undermines", "arrow-down", und)}</div>
        ${rel.length ? `<div class="nv-related">${rel.map(x => chip(x)).join("")}</div>` : ""}`;
    } else if (o.kind === "theme") {
      const ts = theoriesOf(o);
      body = `<div class="nv-sub">${subOf(o)}</div>
        <section class="nv-section"><div class="nv-shead">${g("theory")}Theories<span class="nv-meta">${ts.length}</span></div>
          ${ts.length ? `<div class="nv-cards">${ts.map(t => card(t, cur)).join("")}</div>` : `<div class="nv-empty-slot"><i class="ph ph-plus" aria-hidden="true"></i>Add theory</div>`}</section>
        <section class="nv-section"><div class="nv-shead">${g("signal")}Signals<span class="nv-meta">${o.signals}</span></div>${feed(signalsOf(o), cur)}</section>`;
    } else if (o.kind === "signal") {
      const ds = dumpsOf(o);
      body = `<div class="nv-sub">${subOf(o)}</div>
        <dl class="nv-fields"><dt>Source</dt><dd>${o.src}</dd><dt>Came from</dt><dd>${ds.map(d => chip(d)).join("")}</dd></dl>
        <section class="nv-section"><div class="nv-shead">${g("theory")}Evidence for<span class="nv-meta">${o.ev.length}</span></div>
          ${o.ev.length ? `<div class="nv-box">${o.ev.map(([id, st]) => item(O[id], cur, `<span>${st === "+" ? "Supports" : "Undermines"}</span>`)).join("")}</div>` : `<div class="nv-empty-slot"><i class="ph ph-plus" aria-hidden="true"></i>Link to a theory</div>`}</section>`;
    } else if (o.kind === "prototype") {
      body = `${o.body ? `<p class="nv-note">${o.body}</p>` : ""}
        <section class="nv-section"><div class="nv-shead">${g("theory")}Tests<span class="nv-meta">${o.tests.length}</span></div><div class="nv-cards">${o.tests.map(id => card(O[id], cur)).join("")}</div></section>`;
    } else if (o.kind === "dump") {
      body = `<div class="nv-sub"><span class="nv-mono">${o.time}</span><span>${DAYS[o.day]}</span><span>${o.via}</span>${o.len ? `<span>${o.len}</span>` : ""}</div>
        <p class="nv-note">${o.text}</p>
        ${o.reply ? `<p class="nv-note">${o.reply}</p>` : ""}
        <section class="nv-section"><div class="nv-shead">Made<span class="nv-meta">${o.made.length}</span></div><div class="nv-box">${o.made.map(id => item(O[id], cur)).join("")}</div></section>`;
    }
    return `<article class="nv-doc">${top}${title}${body}</article>`;
  };

  /* ── B: the object's contents as boxes ─────────────── */
  const boxes = (o, s) => {
    const cur = s.pane;
    const sec = (type, label, items, render = "cards") => `<section class="nv-section"><div class="nv-shead">${g(type)}${label}<span class="nv-meta">${items.length}</span></div>${
      !items.length ? `<div class="nv-empty-slot"><i class="ph ph-plus" aria-hidden="true"></i>Add ${type}</div>` : render === "feed" ? feed(items, cur) : `<div class="nv-cards">${items.map(x => card(x, cur)).join("")}</div>`}</section>`;
    const groups = {
      theme: () => sec("theory", "Theories", theoriesOf(o)) + sec("signal", "Signals", signalsOf(o), "feed"),
      theory: () => sec("signal", "Supports", evOf(o).filter(e => e.st === "+").map(e => e.s)) + sec("signal", "Undermines", evOf(o).filter(e => e.st === "-").map(e => e.s))
        + (o.rival ? sec("theory", "Rival", [O[o.rival]]) : "") + (followers(o).length ? sec("theory", "Leads to", followers(o)) : "") + sec("prototype", "Prototypes", protosOf(o)),
      signal: () => sec("theory", "Evidence for", o.ev.map(([id]) => O[id])) + sec("theme", "Themes", o.themes.map(id => O[id])) + sec("dump", "Came from", dumpsOf(o)),
      prototype: () => sec("theory", "Tests", o.tests.map(id => O[id])),
      dump: () => sec("signal", "Made", o.made.map(id => O[id])),
    };
    return `<div class="nv-boxes"><button type="button" class="nv-mhead" data-open="${o.id}" aria-current="${s.pane === o.id}" title="Open ${o.name}">${g(o.kind, o.draft)}<span class="h">${o.name}</span><span class="nv-sub">${subOf(o)}</span></button>${groups[o.kind]()}</div>`;
  };

  /* ── Lenses ────────────────────────────────────────── */
  const focusOf = s => (s.v !== "A" && s.pane) || s.sel[s.type];
  const columnsLens = s => {
    const f = O[focusOf(s)], lin = lineage(f);
    return `<div class="nv-cols">${["dump", "signal", "theme", "theory", "prototype"].map(t => {
      const items = all(t).filter(o => !o.retired).sort((a, b) => lin.has(b.id) - lin.has(a.id));
      return `<section class="nv-col"${s.type === t ? " data-cur" : ""}><div class="nv-lhead">${g(t)}<span class="h">${TYPES[t].name}</span><span class="nv-meta">${countOf(t)}</span></div>
        ${items.map(o => `<button type="button" class="nv-ci${lin.has(o.id) ? " rel" : ""}${o.draft ? " draft" : ""}" data-open="${o.id}" aria-current="${o.id === f.id}" title="${o.name}">${o.name}</button>`).join("")}
        ${TOTAL[t] ? `<div class="nv-cols-more">${TOTAL[t] - items.length} earlier</div>` : ""}</section>`; }).join("")}</div>`;
  };
  const AREAS = { coi: [32.2, 41.2, 19.3], mem: [77.3, 27.5, 14.8], rev: [78.6, 71.4, 12.2], fund: [32.2, 85.2, 11.6], ps: [16, 13, 7.7], aid: [55.4, 76.9, 8], local: [7.7, 64.6, 6.4], nai: [54.1, 8.2, 6.2], obs: [87.6, 52.2, 5.8], evals: [60.6, 93.4, 5.2] };
  const atlasLens = s => {
    const f = O[focusOf(s)];
    const selThemes = new Set(f.kind === "theme" ? [f.id] : f.kind === "theory" || f.kind === "signal" ? f.themes : f.kind === "prototype" ? f.tests.flatMap(id => O[id].themes) : f.made.flatMap(id => O[id].themes || []));
    return `<div class="nv-float">${ib("plus", "Zoom in")}${ib("minus", "Zoom out")}${ib("corners-in", "Fit")}</div>
      <div class="nv-canvas">${Object.entries(AREAS).map(([id, [x, y, r]]) => {
        const th = O[id], ts = theoriesOf(th).filter(t => t.themes[0] === id);
        return `<div class="nv-area${selThemes.has(id) ? " is-sel" : ""}" style="left:${x}%;top:${y}%;width:${r * 2}%">
          <button type="button" class="nv-area-label" data-open="${id}">${g("theme")}${th.name}<span class="nv-meta">${th.signals}</span></button>
          ${ts.map((t, i) => `<button type="button" class="nv-pt${t.draft ? " draft" : ""}" data-open="${t.id}" aria-current="${t.id === f.id}" title="${t.name}" style="left:${24 + (i % 2) * 10}%;top:${36 + i * 13}%"><i class="m"></i><span>${t.name}</span></button>`).join("")}
        </div>`; }).join("")}</div>`;
  };
  const YEARS = [2027, 2028, 2029, 2030];
  const timelineLens = s => {
    const f = O[focusOf(s)], lin = lineage(f);
    const ts = all("theory").filter(t => !t.retired);
    const rows = [5, 4, 3, 2, 1, 0];
    return `<div class="nv-float">${ib("binoculars", "Filter by theme")}</div>
      <div class="nv-tl" style="top:calc(var(--inset-float) + var(--control) + 12px)"><div class="nv-tl-gut" style="box-shadow:none"></div>${YEARS.map(y => `<div class="nv-tl-year">${y}</div>`).join("")}
      ${rows.map(c => `<div class="nv-tl-gut">${c ? conf(c) : "Drafts"}</div>${YEARS.map(y => `<div class="nv-tl-cell">${ts.filter(t => (c ? !t.draft && t.c === c : t.draft) && t.by === y).map(t =>
        `<div role="button" tabindex="0" class="nv-tl-item${t.draft ? " draft" : ""}${lin.has(t.id) || f.kind === "theory" && f.id === t.id ? "" : " dim"}" data-open="${t.id}" aria-current="${t.id === f.id}" title="${t.name}"><i class="m"></i><span>${t.name}</span></div>`).join("")}</div>`).join("")}`).join("")}</div>`;
  };
  const peek = s => s.v === "A" && s.peek ? (() => { const o = O[s.sel[s.type]]; return `<div class="nv-peek">${g(o.kind, o.draft)}<span class="nm">${o.name}</span><button type="button" class="nv-btn primary" data-lens="list">Open</button>${ib("x", "Close", "data-peek-close")}</div>`; })() : "";

  /* ── Frame ─────────────────────────────────────────── */
  const W = { A: [200, 280, 0], B: [200, 272, 440], C: [56, 272, 448] };
  const frame = s => {
    const [rw, lw, pw] = W[s.v], pane = s.v !== "A" && s.pane && O[s.pane];
    const cols = [`${rw}px`, s.lens === "columns" ? null : `${lw}px`, "minmax(0, 1fr)", pane ? `${pw}px` : null].filter(Boolean).join(" ");
    const o = O[s.sel[s.type]];
    const main = s.lens === "columns" ? `<main class="nv-main nv-lens">${columnsLens(s)}${peek(s)}</main>`
      : s.lens === "atlas" ? `<main class="nv-main nv-lens">${atlasLens(s)}${peek(s)}</main>`
      : s.lens === "timeline" ? `<main class="nv-main nv-lens">${timelineLens(s)}${peek(s)}</main>`
      : `<main class="nv-main">${s.v === "B" ? boxes(o, s) : doc(o, s, "main")}</main>`;
    return `<div class="nv" data-v="${s.v}" data-lens="${s.lens}" style="grid-template-columns:${cols}">${rail(s)}${s.lens === "columns" ? "" : list(s)}${main}${pane ? `<aside class="nv-pane" aria-label="Open object">${doc(pane, s, "pane")}</aside>` : ""}</div>`;
  };

  const fit = host => { const el = host.firstElementChild; if (el) el.style.zoom = Math.min(1, host.clientWidth / 1280); };
  const ro = new ResizeObserver(es => es.forEach(e => fit(e.target)));
  const render = host => {
    const s = host._s;
    const scrolls = [...host.querySelectorAll(".nv-scroll, .nv-main, .nv-pane")].map(el => el.scrollTop);
    const focused = document.activeElement?.matches?.("[data-q]") && host.contains(document.activeElement);
    host.innerHTML = frame(s); fit(host);
    if (focused) { const i = host.querySelector("[data-q]"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
    host.querySelectorAll(".nv-scroll").forEach((el, i) => el.scrollTop = scrolls[i] || 0);
  };
  const init = host => {
    const o = JSON.parse(host.dataset.nav || "{}");
    host._s = { v: o.v || "B", type: o.type || "theme", lens: o.lens || "list", q: "", tf: "", back: [], open: {}, peek: false,
      sel: { briefing: "t4", theme: "coi", theory: "t1", prototype: "p1", signal: "s1", dump: "d1", ...(o.sel || {}) } };
    host._s.pane = o.pane !== undefined ? o.pane : host._s.v === "A" ? null : defaultPane(O[host._s.sel[host._s.type]], host._s.v);
    render(host); ro.observe(host);
    host.addEventListener("click", e => {
      const el = e.target.closest("[data-go],[data-sel],[data-open],[data-lens],[data-back],[data-close],[data-promote],[data-toggle],[data-peek-close]");
      if (!el || !host.contains(el)) return;
      const s = host._s, d = el.dataset;
      if (d.go) { s.type = d.go; s.q = ""; s.tf = ""; s.back = []; s.peek = false; if (s.v !== "A" && s.lens === "list") s.pane = defaultPane(O[s.sel[s.type]], s.v); }
      else if (d.sel) { s.sel[s.type] = d.sel; s.back = []; if (s.v !== "A") s.pane = defaultPane(O[d.sel], s.v); }
      else if (d.open) {
        const o = O[d.open];
        if (s.v === "A") {
          if (s.lens === "list") { if (o.id === s.sel[s.type]) return; s.back.push([s.type, s.sel[s.type]]); } else s.peek = true;
          s.type = o.kind; s.sel[o.kind] = o.id; s.q = ""; s.tf = "";
        } else s.pane = o.id;
      }
      else if (d.lens) { if (d.lens !== s.lens && s.v !== "A") s.pane = d.lens === "list" ? defaultPane(O[s.sel[s.type]], s.v) : null; s.lens = d.lens; s.peek = false; }
      else if ("back" in d) { const [t, id] = s.back.pop(); s.type = t; s.sel[t] = id; }
      else if ("close" in d) s.pane = null;
      else if ("peekClose" in d) s.peek = false;
      else if ("promote" in d) { const o = O[s.pane]; s.type = o.kind; s.sel[o.kind] = o.id; s.pane = defaultPane(o, s.v); s.lens = "list"; }
      else if (d.toggle) s.open[d.toggle] = !s.open[d.toggle];
      render(host);
      if (d.go || d.sel || d.open || "back" in d || "promote" in d) host.querySelectorAll(".nv-main, .nv-pane").forEach(x => x.scrollTop = 0);
    });
    host.addEventListener("input", e => { if (e.target.matches("[data-q]")) { host._s.q = e.target.value; render(host); } });
    host.addEventListener("change", e => { if (e.target.matches("[data-tf]")) { host._s.tf = e.target.value; render(host); } });
  };
  window.AberNav = { init, set: (host, patch) => { Object.assign(host._s, patch); render(host); } };
  const go = () => document.querySelectorAll("[data-nav]").forEach(init);
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", go); else go();

  /* ── Page: hero variant switch and decide-box picks ── */
  addEventListener("load", () => {
    const d = document.querySelector(".jig-dock"), h = document.querySelector(".jig-head"); if (d && h) h.append(d);
    const hero = document.getElementById("hero");
    document.querySelectorAll("[data-seg]").forEach(seg => seg.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      seg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      const v = b.value, s = hero._s;
      window.AberNav.set(hero, { v, back: [], peek: false, pane: v === "A" ? null : defaultPane(O[s.sel[s.type]], v) });
    }));
    const page = document.body.dataset.jig;
    const paint = () => document.querySelectorAll("[data-pick]").forEach(li => {
      const id = li.dataset.pick, sec = document.querySelector(`[data-decision="${id}"]`);
      let v = null; try { v = JSON.parse(localStorage.getItem(`jig:${page}:${id}`))?.choice; } catch {}
      li.querySelector(".pick").innerHTML = v ? `Current pick: <b>${v}</b>` : "No pick yet";
    });
    paint(); document.addEventListener("click", e => { if (e.target.closest(".jig-choose")) setTimeout(paint, 0); });
  });
})();
