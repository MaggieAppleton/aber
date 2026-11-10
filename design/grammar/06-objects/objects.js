// Grammar 06: objects. One anatomy for every object, rendered at three rungs: preview (row, card, chip), peek (tethered card), full (fills the main area).
// Every rung on the page comes from the components below, so a column of the matrix shows every object as the same kind of thing.
// Hosts: <div class="ob-host" data-ob='{"frame":"app","type":"theory"}'></div>   frame: app (type-first default) | columns
(() => {
  /* ═══ Content (from nav/nav.js, plus kinds, notes, suggestions) ═══════════════════ */
  const ICON = { briefing: "newspaper", theme: "binoculars", theory: "target", prototype: "pencil-ruler", signal: "pulse", dump: "tray-arrow-down", tripwire: "signpost", suggestion: "sparkle" };
  const NAME = { briefing: ["Briefing"], theme: ["Themes", "Theme"], theory: ["Theories", "Theory"], prototype: ["Prototypes", "Prototype"], signal: ["Signals", "Signal"], dump: ["Dumps", "Dump"] };
  const RAIL = ["theme", "theory", "prototype", "signal", "dump"];
  const DAYS = ["Today", "Yesterday", "Monday 2 Nov", "Sunday 1 Nov"];
  const OLDER = { signal: [["October", 288], ["September", 109]], dump: [["October", 201], ["September", 78]] };
  const TOTAL = { signal: 412, dump: 286 };
  const STATUS = { building: ["Building", "hammer"], idea: ["Idea", "lightbulb"], built: ["Built", "check-circle"], shelved: ["Shelved", "archive"] };
  const O = {};
  const add = (kind, list) => list.forEach(o => { o.kind = kind; O[o.id] = o; });
  const all = kind => Object.values(O).filter(o => o.kind === kind);

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
    { id: "t1", name: "Tokens become nearly free for routine work", themes: ["coi"], c: 3, by: 2028, rival: "t2",
      note: "Small models keep getting cheaper faster than demand grows. Routine agent work stops being metered in any way I notice.",
      trip: "I'd change my mind if a frontier lab prices routine calls above last year's" },
    { id: "t2", name: "Frontier intelligence stays scarce and expensive", themes: ["coi"], c: 2, by: 2029, rival: "t1",
      note: "The best models keep needing more compute than anyone can amortise. The top tier stays a premium product.", trip: "I'd change my mind if a frontier model ships at small-model prices" },
    { id: "t3", name: "Agents run continuously in the background by default", themes: ["coi", "mem"], c: 3, by: 2029, follows: ["t1"],
      note: "Once routine work is free, nobody waits to be asked. Agents keep working on standing goals." },
    { id: "t4", name: "Agents keep context across months, not sessions", themes: ["mem"], c: 4, by: 2027, challenge: "s8", chwhy: "A major lab paused long-term memory, which is the rollback your tripwire names.",
      note: "Memory stops being a feature and becomes the default. Starting from zero each session will feel broken.", trip: "I'd change my mind if a major lab rolls back long-term memory" },
    { id: "t5", name: "Memory becomes the main lock-in for agent products", themes: ["mem"], c: 3, by: 2028, follows: ["t4"] },
    { id: "t6", name: "Code review becomes the bottleneck of shipping", themes: ["rev"], c: 4, by: 2027,
      note: "Agents write more than people can read. Review, not writing, sets the pace." },
    { id: "t7", name: "Reviewers read intent, not diffs", themes: ["rev"], c: 2, by: 2028, follows: ["t6"] },
    { id: "t8", name: "Most software is made for an audience of one", themes: ["ps"], c: 3, by: 2029 },
    { id: "t9", name: "Labs face a funding correction before agents pay their way", themes: ["fund"], c: 2, by: 2027 },
    { id: "t10", name: "Agents get their own accounts and credentials", themes: ["aid"], c: 3, by: 2028 },
    { id: "t11", name: "Local models absorb most everyday agent work", themes: ["coi", "local"], draft: true, by: 2028,
      note: "Drafted from your dump this morning: laptops already run a full coding agent." },
    { id: "t12", name: "Software is priced per outcome, not per seat", themes: ["ps", "coi"], draft: true, by: 2029 },
    { id: "t13", name: "Funding shifts from labs to applications", themes: ["fund"], draft: true, by: 2028 },
    { id: "t14", name: "Chat stays the main interface to models", themes: ["nai"], retired: "Disproven", c: 1, by: 2026 },
    { id: "t15", name: "Every agent action needs a human sign-off", themes: ["aid"], retired: "Abandoned", c: 2, by: 2027 },
  ]);
  add("prototype", [
    { id: "p1", name: "Token budget meter", status: "building", tests: ["t1"], body: "A menu-bar meter showing what each agent task cost today, to test whether routine work really stops being noticed." },
    { id: "p3", name: "Intent diff viewer", status: "building", tests: ["t7"], body: "Shows the stated intent of a change beside the diff, and flags where they disagree." },
    { id: "p2", name: "Memory inspector", status: "idea", tests: ["t4", "t5"], body: "Lists everything an agent remembers about you, with when it learned it." },
    { id: "p5", name: "Agent passport", status: "idea", tests: ["t10"] },
    { id: "p4", name: "Personal app kit", status: "built", tests: ["t8"] },
    { id: "p6", name: "Overnight digest", status: "built", tests: ["t3"] },
    { id: "p7", name: "Review queue for agents", status: "shelved", tests: ["t6"] },
    { id: "p8", name: "Outcome pricing calculator", status: "idea", tests: ["t12"], draft: true, body: "Drafted from your ask: price a task by what it saves, not by tokens." },
  ]);
  add("signal", [
    { id: "s1", name: "Lab cuts API prices again for its small tier", src: "x.com", day: 0, themes: ["coi"], ev: [["t1", "+"]], fresh: true,
      note: "The small tier is now a fifth of last year's price. Routine calls cost less than the logging around them." },
    { id: "s2", name: "Open-weight model matches last year's frontier on coding", src: "news.ycombinator.com", day: 0, themes: ["coi", "local"], ev: [["t1", "+"], ["t11", "+"]], fresh: true },
    { id: "s3", name: "Startup ships an agent that remembers a year of email", src: "x.com", day: 0, themes: ["mem"], ev: [["t4", "+"], ["t5", "+"]], fresh: true },
    { id: "s4", name: "Braintrust raises Series B", src: "techcrunch.com", day: 0, themes: ["obs", "fund"], ev: [["t13", "+"]], fresh: true },
    { id: "s5", name: "Frontier training runs keep growing in cost", src: "arxiv.org", day: 1, themes: ["coi"], ev: [["t1", "-"], ["t2", "+"]] },
    { id: "s6", name: "Half of new pull requests on GitHub now open from agents", src: "github.blog", day: 1, themes: ["rev"], ev: [["t6", "+"]] },
    { id: "s16", name: "Everyone at the Foglamp demo complained about reviewing agent PRs", src: "Voice note", k: "voice", day: 1, themes: ["rev"], ev: [["t6", "+"]] },
    { id: "s7", name: "Staff engineer thread on reviewer fatigue", src: "x.com", day: 1, themes: ["rev"], ev: [["t6", "+"], ["t7", "+"]] },
    { id: "s8", name: "Lab pauses memory feature after privacy complaints", src: "theverge.com", day: 1, themes: ["mem"], ev: [["t4", "-"]],
      note: "A major assistant pulled long-term memory after complaints. They say it's paused, not cancelled." },
    { id: "s9", name: "Friend built a budgeting app in an afternoon", src: "My own observation", k: "note", day: 2, themes: ["ps"], ev: [["t8", "+"]] },
    { id: "s10", name: "Seed rounds for agent startups fall for a second quarter", src: "pitchbook.com", day: 2, themes: ["fund"], ev: [["t9", "+"]] },
    { id: "s11", name: "Bank issues API keys to customers' agents", src: "x.com", day: 2, themes: ["aid"], ev: [["t10", "+"]] },
    { id: "s12", name: "Inference chip startup halves its per-token price", src: "x.com", day: 2, themes: ["coi"], ev: [] },
    { id: "s13", name: "Small model runs a full coding agent on a laptop", src: "simonwillison.net", day: 3, themes: ["local", "coi"], ev: [["t11", "+"], ["t2", "-"]] },
    { id: "s14", name: "Agent tracing tool goes open source", src: "github.com", day: 3, themes: ["obs", "rev"], ev: [["t6", "+"]] },
    { id: "s15", name: "Lab raises at a lower valuation than its last round", src: "ft.com", day: 3, themes: ["fund"], ev: [["t9", "+"]] },
    { id: "s17", name: "Data-centre power contracts are booked years ahead", src: "ft.com", day: 3, themes: ["coi"], ev: [] },
    { id: "s18", name: "Review bots now comment on a third of open-source pull requests", src: "github.blog", day: 2, themes: ["rev"], ev: [["t6", "+"]] },
  ]);
  add("dump", [
    { id: "d1", name: "Three X links and a ramble about pricing", kw: "Links", day: 0, time: "09:12", via: "Shortcut", made: ["s1", "s2", "s3", "t11"],
      text: "x.com/… x.com/… news.ycombinator.com/… Prices keep falling at the small end. Routine stuff just stops costing anything I'd notice. Maybe local models eat it entirely?" },
    { id: "d2", name: "Braintrust funding link", kw: "Link", day: 0, time: "08:47", via: "Safari share", made: ["s4"], text: "techcrunch.com/…" },
    { id: "d8", name: "stratechery.com: agents and the price of a seat", kw: "Link", day: 0, time: "08:20", via: "Safari share", made: [], failed: true, text: "stratechery.com/…" },
    { id: "d3", name: "Voice note after the Foglamp demo", kw: "Voice note", len: "2m 14s", day: 1, time: "18:20", via: "Shortcut", made: ["s5", "s16", "s7", "s8"],
      text: "The demo was great but they kept saying memory is off for now because of the privacy stuff. Also everyone in the room complained about reviewing agent PRs. Nobody's reading the diffs anymore, they're reading the description." },
    { id: "d4", name: "Screenshot of GitHub's agent PR stats", kw: "Image", day: 1, time: "11:02", via: "Shortcut", made: ["s6"], text: "Image, 1 attachment" },
    { id: "d5", name: "Is anyone pricing agents per outcome?", kw: "Ask", day: 2, time: "21:05", via: "Dump-or-ask column", made: ["t12", "p8"],
      text: "Is anyone pricing agents per outcome?", reply: "Two of your signals touch this. I drafted a theory from it: Software is priced per outcome, not per seat." },
    { id: "d6", name: "Morning links", kw: "Links", day: 2, time: "07:58", via: "Shortcut", made: ["s10", "s11", "s12"], text: "pitchbook.com/… x.com/… x.com/…" },
    { id: "d7", name: "Weekend reading list", kw: "Links", day: 3, time: "10:30", via: "Web app", made: ["s13", "s14", "s15", "s17"], text: "simonwillison.net/… github.com/… ft.com/… ft.com/…" },
  ]);
  // Suggestions: an agent proposes, I decide (Dismiss | Accept). Attached to the theory they'd change.
  const SUG = { t1: [{ s: "s12", st: "+", why: "Halving the per-token price is the trend this theory predicts." }], t2: [{ s: "s17", st: "+", why: "Power booked years ahead keeps frontier compute scarce." }] };
  const BRIEF = [["Challenges", ["t4"]], ["Suggestions", ["t1", "t2"]], ["Drafts", ["t11", "t12", "voice", "p8"]], ["New signals", ["s1", "s2", "s3", "s4"]]];

  /* ═══ Relations ═══════════════════════════════════════════════════════════════ */
  const theoriesOf = th => all("theory").filter(t => t.themes.includes(th.id) && !t.retired);
  const signalsOf = th => all("signal").filter(s => s.themes.includes(th.id));
  const evOf = t => all("signal").flatMap(s => s.ev.filter(([id]) => id === t.id).map(([, st]) => ({ s, st })));
  const ups = t => evOf(t).filter(e => e.st === "+").length, downs = t => evOf(t).filter(e => e.st === "-").length;
  const protosOf = t => all("prototype").filter(p => p.tests.includes(t.id));
  const followers = t => all("theory").filter(x => (x.follows || []).includes(t.id));
  const dumpsOf = s => all("dump").filter(d => d.made.includes(s.id));

  /* ═══ Atoms ═══════════════════════════════════════════════════════════════════ */
  const esc = s => String(s).replace(/"/g, "&quot;");
  // Every object shows its type glyph on its tile; a signal is always Pulse (Maggie, 4 Nov). Kind, if shown, is text in the key value.
  const glyphOf = o => ICON[o.kind];
  const tile = (type, icon, cls = "") => `<span class="g${cls ? ` ${cls}` : ""}" data-type="${type}"><i class="ph ph-${icon}" aria-hidden="true"></i></span>`;
  const tileOf = (o, cls = "") => tile(o.kind, glyphOf(o), `${o.draft ? "draft" : ""} ${cls}`.trim());
  // Confidence on previews: one short meter track with a proportional fill (06b option C, decided 4 Nov); unset is an empty track
  const meter = n => `<span class="ob-meter" role="img" aria-label="${n ? `Confidence ${n} of 5` : "No confidence yet"}"><i style="width:${(n || 0) * 20}%"></i></span>`;
  const conf = (n, label = true) => `<span class="ob-conf" role="img"${label ? ` aria-label="Confidence ${n} of 5"` : ""}>${[1, 2, 3, 4, 5].map(i => `<i${i <= n ? " data-on" : ""}></i>`).join("")}</span>`;
  const ib = (icon, label, attr = "", key = "") => `<button type="button" class="nv-ib" aria-label="${esc(label)}" data-tip="${esc(label)}"${key ? ` data-key="${key}"` : ""} ${attr}><i class="ph ph-${icon}" aria-hidden="true"></i></button>`;
  const mono = t => `<span class="ob-mono">${t}</span>`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  /* ═══ The anatomy ═════════════════════════════════════════════════════════════
     Slots, in this order, at every rung: 1 type glyph tile · 2 name · 3 the one key value · 4 status (one mark, the end of the key line)
     · 5 on-demand attributes (peek and full) · 6 attached objects (tripwire, suggestions) · 7 relations (peek: up to 3; full: all). */

  // 3. The one key value
  // compact: the short form for one-line rows in narrow columns (a bare count, the time alone, the status glyph alone)
  const keyOf = (o, compact = false) => {
    if (o.draft) return `<span>Draft</span>`;
    return ({
      theme: () => { const n = theoriesOf(o).length; return compact ? (n ? `<span class="ob-n" aria-label="${plural(n, "theory", "theories")}">${n}</span>` : "") : `<span>${n ? plural(n, "theory", "theories") : "No theories yet"}</span>`; },
      theory: () => o.retired ? `<span>${compact ? "Retired" : `Retired, ${o.retired.toLowerCase()}`}</span>` : conf(o.c),
      prototype: () => compact ? `<span class="ob-st" role="img" aria-label="${STATUS[o.status][0]}" title="${STATUS[o.status][0]}"><i class="ph ph-${STATUS[o.status][1]}" aria-hidden="true"></i></span>` : `<span class="ob-st"><i class="ph ph-${STATUS[o.status][1]}" aria-hidden="true"></i>${STATUS[o.status][0]}</span>`,
      signal: () => `<span class="ob-src">${o.src}</span>`,
      dump: () => compact ? mono(o.time) : `<span>${o.kw}</span>${mono(o.time)}`,
    })[o.kind]();
  };
  // Revealed on hover: the object's date
  const whenOf = o => o.kind === "signal" || o.kind === "dump" ? DAYS[o.day] : "";   // a theory's horizon is not on previews; peek and full only
  // 4. Status: the single most urgent mark. Challenge > pending suggestion > new. A failed dump is "bad", so red.
  // Status: one quiet red mark, only for what needs you: a challenge, or a dump that couldn't be read.
  // Not marks (Maggie, 4 Nov): pending suggestions (peek, full view and Briefing only) and "new" (see the unseen-activity choice).
  // No dots (Maggie, 4 Nov): a failed dump says so in words; a challenge shows by the page's choice (data-challenge), never as a red dot.
  const statusOf = o => o.failed ? `<span>Couldn't read</span>` : "";
  const chalOf = o => o.challenge ? `<span class="ob-chal" role="img" aria-label="Challenged" title="Challenged">${tile("tripwire", ICON.tripwire, "xs")}</span>` : "";
  // A count is a bare type glyph (ink 2, 14) and a tabular number, no noun
  const cnt = (icon, n, label) => `<span class="ob-cnt" role="img" aria-label="${n} ${label}"><i class="ph ph-${icon}" aria-hidden="true"></i>${n}</span>`;
  const bal = o => `<span class="ob-cnts">${cnt("arrow-up", ups(o), "supporting")}${cnt("arrow-down", downs(o), "undermining")}</span>`;
  // Unseen activity, rendered for every object and shown only by the page's choice (data-fresh on a window): weight, text or nothing
  const freshOf = o => o.kind === "theme" && o.fresh ? `${o.fresh} new` : o.kind === "signal" && o.fresh ? "New" : "";
  // 5. On-demand attributes: label + value, so the meta line (prose-first) and the fields table come from one list
  const attrsOf = (o, rung) => {
    const full = rung === "full";
    const A = ({
      theme: () => [["Counts", `<span class="ob-cnts">${cnt(ICON.theory, theoriesOf(o).length, "theories")}${cnt(ICON.signal, o.signals, "signals")}</span>`]],
      theory: () => o.draft ? [["Status", keyOf(o)], ["Evidence", bal(o)], ["Happens by", full ? stepper(o.by) : `<span>By ${o.by}</span>`]]
        : o.retired ? [["Status", keyOf(o)], ["Evidence", bal(o)]]
        : [["Confidence", full ? setter(o.c) : conf(o.c)], ["Evidence", bal(o)], ["Happens by", full ? stepper(o.by) : `<span>By ${o.by}</span>`]],
      prototype: () => [["Status", keyOf(o)]],
      signal: () => [["Source", keyOf(o)], ["Captured", `<span>${DAYS[o.day]}</span>`], o.fresh && ["New", `<span class="ob-fresh">New</span>`]],
      dump: () => [["Kind", `<span>${o.kw}${o.len ? `, ${o.len}` : ""}</span>`], ["Captured", `<span>${DAYS[o.day]}</span>${mono(o.time)}`], full && ["Via", `<span>${o.via}</span>`]],
    })[o.kind]().filter(Boolean);
    return A;
  };
  // The key line: the key value first, its status mark right after it, then the on-demand attributes
  const metaLine = (o, rung) => { const a = attrsOf(o, rung).map(([, v]) => v), st = statusOf(o); return (st ? [a[0], `<span class="st">${st}</span>`, ...a.slice(1)] : a).join(""); };
  const setter = n => `<span class="ctl-conf ob-setter" role="slider" tabindex="0" aria-label="Confidence" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${n}">${[1, 2, 3, 4, 5].map(i => `<i${i <= n ? " data-on" : ""}></i>`).join("")}</span>`;
  const stepper = y => `<span class="ctl-step ob-step" role="spinbutton" tabindex="0" aria-label="Happens by" aria-valuenow="${y}">${ib("caret-left", "Earlier", 'tabindex="-1" class="nv-ib sm"')}<span class="v">${y}</span>${ib("caret-right", "Later", 'tabindex="-1" class="nv-ib sm"')}</span>`;

  /* ═══ Rung 1: preview ═════════════════════════════════════════════════════════
     The row and the card are the same grid: [tile][name][status-free] / [ ][key value … when][status]. The card is the row on a raised surface,
     with the name at card weight. A row inside a group drops whatever its group header already says (omit: "key" | "when"). */
  const preview = (o, { as = "row", act = "open", cur = null, omit = "", rm = "", cls = "", host = "" } = {}) => {
    const label = o.kind === "theme" || o.kind === "prototype";   // short labels: one line, compact key at the right
    const one = label || /\bone\b/.test(cls);
    if (one && !/\bone\b/.test(cls)) cls = `${cls} one`.trim();
    if (label) cls = `${cls} label`;
    if (o.fresh) cls = `${cls} unseen`;
    const k = omit.includes("key") || o.kind === "theory" ? "" : keyOf(o, one), w = omit.includes("when") || one ? "" : whenOf(o), st = statusOf(o);
    const rk = o.kind === "theory" ? `<span class="ob-rk">${meter(o.draft ? 0 : o.c)}</span>` : "";   // a short key value right of the name's first line
    const f = (freshOf(o) ? `<span class="ob-fresh">${freshOf(o)}</span>` : "") + (/\bsuggested\b/.test(cls) ? `<span>Suggested</span>` : "");
    const line = k || w || st || f ? `<span class="kv">${one ? f + k : k + f}${st ? `<span class="st">${st}</span>` : ""}${w ? `<span class="when">${w}</span>` : ""}</span>` : "";
    const attr = act === "sel" ? `data-sel="${o.id}"` : act === "pane" ? `data-pane="${o.id}"` : act === "none" ? "" : `data-open="${o.id}"`;
    return `<div class="ob-${as}${o.kind === "theory" ? " has-rk" : ""}${o.draft ? " draft" : ""}${o.retired ? " retired" : ""}${line || o.kind === "theory" ? "" : " solo"}${cls ? ` ${cls}` : ""}"${cur === o.id ? ' aria-current="true"' : ""} data-id="${o.id}"${host ? ` data-host="${host}"` : ""}>
      ${tileOf(o)}<button type="button" class="nm" ${attr}>${o.name}</button>${rk}${line}${chalOf(o)}${rm ? `<span class="rm">${ib("minus", rm, 'class="nv-ib sm"')}</span>` : ""}</div>`;
  };
  const row = (o, opt) => preview(o, { ...opt, as: "row" });
  const card = (o, opt) => preview(o, { ...opt, as: "card" });
  // The chip: the smallest preview, a reference inside another object. Tile flush, name, nothing else.
  const chip = (o, act = "open") => `<button type="button" class="ctl-chip ob-chip"${o.draft ? " data-draft" : ""} ${act === "open" ? `data-open="${o.id}"` : ""}>${tileOf(o)}<span class="t">${o.name}</span></button>`;

  /* ═══ Attached objects: never alone. A mark on the host's preview, a line in its peek, a block with the decision in its full view ═══ */
  const tripLine = (o, rung) => {
    if (!o.trip) return "";
    const by = o.challenge && O[o.challenge];
    if (rung === "peek") return `<div class="ob-attach${by ? " tripped" : ""}">${tile("tripwire", ICON.tripwire)}<span>${by ? `Tripped by <b>${by.name}</b>` : o.trip}</span></div>`;   // text in ink; only the glyph is red
    // One glyph column: the signpost hangs where the title's tile hangs; the sentence starts on the body's text edge
    return `<div class="ob-trip${by ? " tripped" : ""}"><div class="ob-attach lg">${tile("tripwire", ICON.tripwire)}<p class="ob-prose">${o.trip}</p></div>
        ${by ? `<div class="ob-block sug"><div class="ob-blabel">Tripped by a new signal</div>${o.chwhy ? `<p class="ob-reason">${o.chwhy}</p>` : ""}${row(by, { omit: "when" })}
          <div class="ob-dfoot">${changeLine(o.c, Math.max(1, o.c - 1))}${decide("Keep confidence", `Lower to ${Math.max(1, o.c - 1)}`)}</div></div>` : ""}</div>`;
  };
  // Decision buttons say what happens (05 rule 6, decided 5 Nov): the reject verb left, the accept verb right
  const decide = (no, yes) => `<div class="ob-decide"><button type="button" class="nv-btn secondary">${no}</button><button type="button" class="nv-btn primary">${yes}</button></div>`;
  // A challenge's consequence as a picture (08, decided): a confidence mark with the step that would go in the "down" red at 40%, then the words
  const changeLine = (from, to) => `<p class="ob-change" aria-label="I suggest lowering confidence from ${from} to ${to}"><span class="ob-lose" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i${i <= to ? " data-on" : i <= from ? " data-gone" : ""}></i>`).join("")}</span><span>I suggest lowering confidence from ${from} to ${to}</span></p>`;
  // A suggested relation sits inside the group it would join (a suggested support first in Supports), dashed = not yet mine.
  // Peek: a dashed row whose key line says "Suggested". Full: a dashed block with its label, why, that row and its verbs. No Sparkle inside.
  const sugsFor = (o, st) => (SUG[o.id] || []).filter(x => x.st === st);
  const sugRow = x => row(O[x.s], { omit: "when", cls: "suggested" });
  // Proposal block (06 rule 9, decided 5 Nov): label, reason, the object row, the verbs
  const sugBlock = x => `<div class="ob-block sug"><div class="ob-blabel">${x.st === "-" ? "Suggested counter-evidence" : "Suggested support"}</div><p class="ob-reason">${x.why}</p>${row(O[x.s], { omit: "when" })}${decide("Dismiss", "Add evidence")}</div>`;
  const stanceOf = label => label === "Supports" ? "+" : label === "Undermines" ? "-" : null;

  /* ═══ 7. Relations, in order of importance per type ═══════════════════════════ */
  const relsOf = o => ({
    theme: () => [["Theories", theoriesOf(o), "cards"], ["Signals", signalsOf(o), "days"]],
    // A theory's themes are not a relation section: they sit as chips above its title (Maggie, 10 Nov; see eyebrowOf)
    theory: () => [["Supports", evOf(o).filter(e => e.st === "+").map(e => e.s), "rows", "Remove evidence"], ["Undermines", evOf(o).filter(e => e.st === "-").map(e => e.s), "rows", "Remove evidence"],
      ["Rival", o.rival ? [O[o.rival]] : [], "rows"], ["Follows from", (o.follows || []).map(id => O[id]), "rows"], ["Leads to", followers(o), "rows"], ["Prototypes", protosOf(o), "rows"]],
    signal: () => [["Supports", o.ev.filter(([, st]) => st === "+").map(([id]) => O[id]), "rows", "Remove evidence", "Add theory"], ["Undermines", o.ev.filter(([, st]) => st === "-").map(([id]) => O[id]), "rows", "Remove evidence"],
      ["Themes", o.themes.map(id => O[id]), "chips", "", "File in theme"], ["Came from", dumpsOf(o), "rows"]],
    prototype: () => [["Tests", o.tests.map(id => O[id]), "rows", "Remove theory"]],
    dump: () => [["Signals", o.made.map(id => O[id]).filter(x => x.kind === "signal"), "rows"], ["Drafts", o.made.map(id => O[id]).filter(x => x.kind !== "signal"), "rows"]],
  })[o.kind]().filter(([label, items, , , slot]) => items.length || slot || (o.kind === "theory" && stanceOf(label) && sugsFor(o, stanceOf(label)).length));
  // The peek shows the first relation that holds objects, as up to three one-line rows
  // As many relations as fit, then a fade rising from the bottom edge; no scroll, no "show more"; Open shows everything (Maggie, 4 Nov)
  const peekRel = o => {
    const r = relsOf(o).find(([label, items, how]) => how !== "chips" && (items.length || (o.kind === "theory" && stanceOf(label) && sugsFor(o, stanceOf(label)).length))); if (!r) return "";
    const [label, held] = r, sugs = o.kind === "theory" && stanceOf(label) ? sugsFor(o, stanceOf(label)) : [];
    const items = [...sugs.map(x => ({ ...O[x.s], _sug: true })), ...held], extra = items.length - 3;
    return `<div class="ob-pk-rel"><div class="ob-label">${label}<span class="ob-n">${held.length}</span></div>
      <div class="ob-pk-list">${items.map((x, i) => row(x._sug ? O[x.id] : x, { omit: "when", cls: `${i >= 3 ? "extra" : ""}${x._sug ? " suggested" : ""}`.trim() })).join("")}<span class="ob-fade" aria-hidden="true"></span></div>
</div>`;
  };

  /* ═══ Prose: the object's own words ═══════════════════════════════════════════ */
  const proseOf = o => ({ theory: o.note, prototype: o.body, signal: o.note, dump: o.text })[o.kind] || "";

  /* ═══ Rung 2: peek (tethered card). Same header as the row, its own essentials, then up to three relations, then Open ═══ */
  // Every peek: a head (tile, title, key line), a full-bleed hairline, then the body (prose, attached lines) and the relation group.
  const peek = (o, { rel = true, cls = "" } = {}) => {
    const p = proseOf(o), trip = o.kind === "theory" ? tripLine(o, "peek") : "", rels = rel ? peekRel(o) : "";
    // A short key value (a status, a count) sits right-aligned on the title's first line; the key line below keeps only what's left
    const short = ((o.kind === "prototype" || o.kind === "theme") && !o.draft) || (o.kind === "theory" && !o.retired);
    const st = statusOf(o), rest = attrsOf(o, "peek").slice(short ? 1 : 0).map(([, v]) => v);
    const meta = short ? rest.join("") : metaLine(o, "peek");
    const body = p || trip ? `<div class="ob-pk-body">${p ? `<p class="ob-prose clamp">${p}</p>` : ""}${trip}</div>` : "";
    return `<div class="ob-peek${meta ? " has-meta" : ""}${cls ? ` ${cls}` : ""}" role="dialog" aria-label="${esc(o.name)}" data-id="${o.id}">
      <div class="ob-hang">${tileOf(o)}<div class="ob-col">
        ${short ? `<div class="ob-pk-title"><div class="ob-pk-name${o.draft ? " draft" : ""}">${o.name}</div><span class="ob-pk-key">${o.kind === "theme" ? attrsOf(o, "peek")[0][1] : o.kind === "theory" ? meter(o.draft ? 0 : o.c) : keyOf(o)}</span></div>` : `<div class="ob-pk-name${o.draft ? " draft" : ""}">${o.name}</div>`}
        ${meta ? `<div class="ob-meta">${meta}</div>` : ""}
      </div></div>
      ${body || rels ? `<hr class="ob-div">${body}${rels}` : ""}
      <div class="ob-pk-foot"><button type="button" class="nv-btn secondary" data-full="${o.id}">Open<i class="ph ph-arrow-right" aria-hidden="true"></i></button></div>
    </div>`;
  };

  /* ═══ Rung 3: full (fills the main area). The same header at title size, then prose, attached objects and every relation ═══ */
  const section = (o, [label, items, how, rm, slot], cur) => {
    let body = "";
    if (how === "chips") body = `<div class="ob-chips">${items.map(x => chip(x)).join("")}${slot ? `<button type="button" class="ob-slot sm"><i class="ph ph-plus" aria-hidden="true"></i>${slot}</button>` : ""}</div>`;
    else if (how === "cards") body = items.length ? `<div class="ob-cards">${items.map(x => card(x, { cur })).join("")}</div>` : `<button type="button" class="ob-slot"><i class="ph ph-plus" aria-hidden="true"></i>Add theory</button>`;
    else if (how === "days") { let d = -1; body = `<div class="ob-rows">${items.map(x => (x.day !== d ? `<div class="ob-day">${DAYS[d = x.day]}</div>` : "") + row(x, { cur, omit: "when" })).join("")}</div>`; }
    else body = `<div class="ob-rows">${o.kind === "theory" && stanceOf(label) ? sugsFor(o, stanceOf(label)).map(sugBlock).join("") : ""}${items.map(x => row(x, { cur, rm: rm ? `${rm}: ${x.name}` : "" })).join("")}${slot ? `<button type="button" class="ob-slot"><i class="ph ph-plus" aria-hidden="true"></i>${slot}</button>` : ""}</div>`;
    const n = how === "days" ? o.signals : items.length;
    return `<section class="ob-sec"><div class="ob-sh"><span>${label}</span>${items.length ? `<span class="ob-n">${n}</span>` : ""}</div>${body}</section>`;
  };
  // A theory's themes lead the head: chips on one line above the title, on the title's text edge (Maggie, 10 Nov). None, no band.
  const eyebrowOf = o => o.kind === "theory" && o.themes?.length ? `<div class="ob-eyebrow">${o.themes.map(id => chip(O[id])).join("")}</div>` : "";
  const full = (o, { layout = "prose", back = "", cur = null, where = "main" } = {}) => {
    const attrs = attrsOf(o, "full"), p = proseOf(o);
    const acts = o.draft ? `<span class="ob-decide"><button type="button" class="nv-btn secondary">Discard</button><button type="button" class="nv-btn primary">Keep</button></span>`
      : where === "pane" ? `<span class="ob-tools">${ib("arrows-out-simple", "Pane full width")}${ib("x", "Close", "data-close", "Esc")}</span>`
      : o.kind === "dump" ? `<span class="ob-tools">${ib("trash", "Delete dump")}</span>` : o.kind === "signal" ? `<span class="ob-tools">${ib("arrows-merge", "Merge")}${ib("trash", "Discard signal")}</span>`
      : `<span class="ob-tools">${ib("archive", "Retire")}</span>`;
    const top = `<div class="ob-top">${back}${acts}</div>`;
    const meta = layout === "fields"
      ? `<dl class="ob-fields">${attrs.map(([l, v]) => `<dt>${l}</dt><dd>${v}</dd>`).join("")}${statusOf(o) ? `<dt>Attention</dt><dd>${statusOf(o)}</dd>` : ""}</dl>`
      : `<div class="ob-meta lg">${metaLine(o, "full")}</div>`;
    const prose = p ? `<p class="ob-prose${o.kind === "dump" ? " well" : ""}">${p}</p>` : o.kind === "signal" ? `<p class="ob-prose ph-note">Add a note</p>` : "";
    const reply = o.reply ? `<div class="ob-reply"><div class="ob-label">Reply</div><p class="ob-prose">${o.reply}</p></div>` : "";
    return `<article class="ob-full${o.draft ? " draft" : ""}" data-id="${o.id}">${top}
      <header class="ob-hang ob-head">${eyebrowOf(o)}${tileOf(o)}<div class="ob-col"><h3 class="ob-title">${o.name}</h3>${meta}</div></header>
      <div class="ob-body">${prose}${reply}${o.kind === "theory" ? tripLine(o, "full") : ""}
        ${relsOf(o).length ? `<hr class="ob-div"><div class="ob-rels">${relsOf(o).map(r => section(o, r, cur)).join("")}</div>` : ""}</div>
    </article>`;
  };

  /* ═══ Briefing: the home of the default view's main area ══════════════════════ */
  const digest = () => `<article class="ob-full ob-digest"><div class="ob-top"></div>
      <header class="ob-hang ob-head">${tile("briefing", ICON.briefing)}<div class="ob-col"><h3 class="ob-title">Since yesterday</h3><div class="ob-meta lg"><span>${BRIEF.reduce((n, [, ids]) => n + ids.length, 0)} changes</span><span>Last looked 18:40</span></div></div></header>
      <div class="ob-body"><div class="ob-rels">${BRIEF.map(([label, ids]) => `<section class="ob-sec"><div class="ob-sh"><span>${label}</span><span class="ob-n">${ids.length}</span></div><div class="ob-rows">${ids.map(id => row(O[id])).join("")}</div></section>`).join("")}</div></div></article>`;

  // One fade rule for every peek: the relations list has one max height; when its rows overflow it, a surface fade rises from its bottom edge
  const markFades = (root = document) => root.querySelectorAll(".ob-pk-list").forEach(l => l.closest(".ob-pk-rel").classList.toggle("overflows", l.scrollHeight > l.clientHeight + 1));
  document.fonts?.ready.then(() => markFades()); addEventListener("resize", () => markFades());
  window.AberObjects = { markFades, O, SUG, ICON, all, tile, tileOf, row, card, chip, peek, full, keyOf, statusOf, attrsOf, tripLine, sugBlock, sugsFor, digest, relsOf, DAYS };
})();
