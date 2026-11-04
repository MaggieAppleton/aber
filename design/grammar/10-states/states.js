// Grammar 10 states: renders each state inside the type-first window (the nav/ structure, rows are placeholders) and inside the
// three views that stay as they are (the shared stage), switchable, plus the three open choices.
// Mount: <div class="st-mount" data-scene="failed" data-view="default" data-ch='{"work":"rail"}'></div>
(() => {
  /* ── Atoms ─────────────────────────────────────────── */
  const I = (n, fill) => `<i class="ph${fill ? "-fill" : ""} ph-${n}" aria-hidden="true"></i>`;
  const TY = { theme: ["Themes", "Theme", "binoculars"], theory: ["Theories", "Theory", "target"], prototype: ["Prototypes", "Prototype", "pencil-ruler"],
    signal: ["Signals", "Signal", "pulse"], dump: ["Dumps", "Dump", "tray-arrow-down"], briefing: ["Briefing", "Briefing", "newspaper"], tripwire: ["", "", "signpost"], suggestion: ["", "", "sparkle"] };
  const RAIL = ["theme", "theory", "prototype", "signal", "dump"];
  const COUNT = { theme: 12, theory: 15, prototype: 8, signal: 412, dump: 286 };
  const g = (t, draft) => `<span class="g${draft ? " draft" : ""}" data-type="${t}">${I(TY[t][2])}</span>`;
  const ib = (icon, label, key = "", attr = "") => `<button type="button" class="nv-ib" aria-label="${label}" data-tip="${label}"${key ? ` data-key="${key}"` : ""} ${attr}>${I(icon)}</button>`;
  const dot = (k, label) => `<span class="nv-dot ${k}" role="img" aria-label="${label}"></span>`;
  const ring = label => `<span class="nv-ring" role="img" aria-label="${label}"></span>`;
  const spin = label => `<span class="st-spin" role="img" aria-label="${label}">${I("circle-notch")}</span>`;
  const chip = (t, name, draft) => `<button type="button" class="nv-chip${draft ? " draft" : ""}">${g(t, draft)}<span class="t">${name}</span></button>`;
  const plain = (t, name) => `<span class="nv-chip plain">${g(t)}<span class="t">${name}</span></span>`;
  const empty = text => `<p class="st-empty">${text}</p>`;
  const add = (label, big) => `<button type="button" class="st-add${big ? " big" : ""}">${I("plus")}<span>${label}</span></button>`;
  const btn = (kind, label, attr = "") => `<button type="button" class="nv-btn ${kind}" ${attr}>${label}</button>`;
  const sk = (w, cls = "") => `<span class="st-skel ${cls}" style="width:${w}"></span>`;

  /* ── Content (names from nav/) ─────────────────────── */
  const HELD = ["Tokens become nearly free for routine work", "Frontier intelligence stays scarce and expensive", "Agents run continuously in the background by default", "Agents keep context across months, not sessions",
    "Memory becomes the main lock-in for agent products", "Code review becomes the bottleneck of shipping", "Reviewers read intent, not diffs", "Most software is made for an audience of one", "Labs face a funding correction before agents pay their way"];
  const SIGNALS = [["Lab cuts API prices again for its small tier", "x.com"], ["Open-weight model matches last year's frontier on coding", "news.ycombinator.com"], ["Startup ships an agent that remembers a year of email", "x.com"],
    ["Braintrust raises Series B", "techcrunch.com"], ["Frontier training runs keep growing in cost", "arxiv.org"], ["Half of new pull requests on GitHub now open from agents", "github.blog"], ["Staff engineer thread on reviewer fatigue", "x.com"]];
  const DUMPS = [["Three X links and a ramble about pricing", "09:12"], ["Braintrust funding link", "08:47"], ["Voice note after the Foglamp demo", "18:20"], ["Screenshot of GitHub's agent PR stats", "11:02"], ["Is anyone pricing agents per outcome?", "21:05"], ["Morning links", "07:58"]];
  const NEW_DUMP = "stratechery.com: agents and the price of a seat";

  /* ── The window: rail, item list, main; the composer floats bottom right ── */
  const switcher = () => `<div class="nv-switch" role="group" aria-label="Views">${[["default", "rows", "Default", "⌘1"], ["columns", "columns", "Columns", "⌘2"], ["atlas", "map-trifold", "Atlas", "⌘3"], ["timeline", "chart-scatter", "Timeline", "⌘4"]].map(([v, i, l, k]) =>
    `<button type="button" data-view="${v}" aria-pressed="${v === "default"}" aria-label="${l}" data-tip="${l}" data-key="${k}">${I(i, v === "default")}</button>`).join("")}</div>`;
  const offlineTag = () => `<span class="st-offline" role="status"><span class="st-ring" aria-hidden="true"></span>Offline</span>`;
  const rail = (cur, o, ch) => `
    <aside class="nv-rail">
      <div class="nv-brand"><button type="button" class="nv-home" aria-current="${cur === "home"}">Aber</button>${ib("magnifying-glass", "Find", "⌘K")}</div>
      <nav class="nv-types" aria-label="Types">${RAIL.map(t => {
        const work = t === "dump" && ch.work === "rail" ? o.work : null;
        const n = o.counts === "none" ? "" : o.counts === "skel" ? sk("16px", "st-wait st-skel-n") : work === "busy" ? spin("1 dump processing") : `<span class="nv-n">${COUNT[t]}</span>`;
        const marks = `${(o.fresh || []).includes(t) ? dot("new", "New") : ""}${work === "failed" ? dot("neg", "A dump failed") : ""}`;
        return `<button type="button" class="nv-type" aria-current="${cur === t}"><span class="gw">${g(t)}${marks}</span><span class="nm">${TY[t][0]}</span>${n}</button>`;
      }).join("")}</nav>
      ${o.offline && ch.offline === "switcher" ? offlineTag() : ""}
      ${switcher()}
    </aside>`;
  const list = (t, body, { tools = "", plus = true, meta = COUNT[t] } = {}) => `
    <section class="nv-list" aria-label="${TY[t][0]}">
      <p class="nv-placeholder">Rows are placeholders until 06 Objects.</p>
      <div class="nv-lhead"><span class="h">${TY[t][0]}</span>${meta !== "" && meta != null ? `<span class="nv-meta">${meta}</span>` : ""}${plus ? ib("plus", `New ${TY[t][1].toLowerCase()}`) : ""}</div>
      ${tools ? `<div class="nv-tools">${tools}</div>` : ""}
      <div class="nv-scroll">${body}</div>
    </section>`;
  const group = (label, rows) => `<div class="nv-group">${label ? `<div class="nv-glabel">${label}</div>` : ""}${rows.join("")}</div>`;
  // A row: name; when it has a state, a trailing mark and the words on a second line
  const row = (name, { cur, draft, mark, sub, id } = {}) => `<button type="button" class="nv-row${sub ? " two" : ""}${draft ? " draft" : ""}" aria-current="${!!cur}"${id ? ` data-id="${id}"` : ""}><span class="nm">${name}</span>${mark ? `<span class="mark">${mark}</span>` : ""}${sub ? `<span class="sub"><span>${sub}</span></span>` : ""}</button>`;
  const search = (ph, v = "") => `<label class="nv-search">${I("magnifying-glass")}<input type="search" placeholder="${ph}" value="${v}" aria-label="${ph}"></label>`;
  const filter = (label = "All themes") => `<label class="nv-filter">${I("funnel")}<select aria-label="Filter by theme"><option>${label}</option><option>All themes</option></select></label>`;
  const doc = ({ lead = "", ctl = "", title = "", draft = false, sub = "", body = "" }) => `<article class="nv-doc">
      <div class="nv-top"><div class="nv-chips">${lead}</div>${ctl ? `<span class="ctl">${ctl}</span>` : ""}</div>
      ${title ? `<h3 class="nv-title${draft ? " draft" : ""}">${title}</h3>` : ""}${sub ? `<div class="nv-sub">${sub}</div>` : ""}${body}</article>`;
  const section = (t, label, n, inner) => `<section class="nv-section"><div class="nv-shead">${t ? g(t) : ""}${label}${n !== "" ? `<span class="nv-meta">${n}</span>` : ""}</div>${inner}</section>`;
  const item = (t, name, src, extra = "") => `<button type="button" class="nv-item">${g(t)}<span class="t"><span>${name}</span>${extra}</span>${src ? `<span class="src">${src}</span>` : ""}</button>`;
  const box = items => `<div class="nv-box">${items.join("")}</div>`;

  // Global work and offline marks follow the picks (choice 1 work, choice 3 offline)
  const cbtn = (icon, label, key, extra = "") => `<button type="button" class="ctl-icon" aria-label="${label}" data-st-tip="${label}"${key ? ` data-key="${key}"` : ""} ${extra}>${I(icon)}</button>`;
  const composer = (o, ch) => {
    let seg = "";
    if (o.offline && ch.offline === "composer") seg = `<span class="st-cseg-label" role="status"><span class="st-ring" aria-hidden="true"></span>Offline</span>`;
    else if (o.work === "busy" && ch.work === "composer") seg = `<button type="button" class="ctl-icon st-cseg" aria-label="1 dump processing" data-st-tip="1 dump processing">${spin("")}</button>`;
    else if (o.work === "failed" && ch.work === "composer") seg = `<button type="button" class="ctl-icon st-cseg" aria-label="1 dump failed" data-st-tip="1 dump failed"><span class="nv-dot neg" aria-hidden="true"></span></button>`;
    return `<form class="ctl-composer${o.focusComposer ? " is-focus" : ""}" aria-label="Dump or ask" onsubmit="return false">${seg}${cbtn("microphone", "Voice dump", "V")}
      <textarea rows="1" placeholder="Dump or ask" aria-label="Dump or ask"></textarea>${cbtn("paper-plane-right", "Send", "⏎", 'aria-disabled="true"').replace('class="ctl-icon"', 'class="ctl-icon primary"')}</form>`;
  };
  const frame = (o, ch) => {
    const home = !o.list;
    const cols = `var(--nv-rail-w) ${home ? "" : "280px "}minmax(0, 1fr)`;
    return `<div class="nv" data-v="A" data-switch="rail" style="grid-template-columns:${cols}">${rail(o.cur, o, ch)}${home ? "" : o.list}
      <main class="nv-main"><div class="nv-scroller">${o.main}</div></main>${composer(o, ch)}${o.layer || ""}</div>`;
  };

  /* ── Pieces shared by scenes ───────────────────────── */
  const heldRows = (cur = 0) => group("Held", HELD.slice(0, 8).map((n, i) => row(n, { cur: i === cur })));
  const theoryDoc = (name = HELD[0], { draft, note = "Small models keep getting cheaper faster than demand grows. Routine agent work stops being metered in any way I notice.", noteHTML, extraEv = "" } = {}) => doc({
    lead: chip("theme", "Cost of intelligence"), ctl: ib("archive", "Retire"), title: name, draft,
    body: `<dl class="nv-fields">${draft ? `<dt>Draft</dt><dd><span class="nv-decide">${btn("secondary", "Discard", "data-act=discard-draft")}${btn("primary", "Accept", "data-act=accept")}</span></dd>` : `<dt>Confidence</dt><dd><span class="nv-conf lg" role="img" aria-label="Confidence 3 of 5">${[1, 2, 3, 4, 5].map(i => `<i${i <= 3 ? " data-on" : ""}></i>`).join("")}</span></dd>`}<dt>Happens by</dt><dd>2028</dd></dl>
      ${noteHTML ?? `<p class="nv-note">${note}</p>`}
      <div class="nv-ev"><div class="nv-ev-col"><div class="nv-ev-head">${I("arrow-up")}Supports 2</div>${item("signal", SIGNALS[0][0], SIGNALS[0][1])}${item("signal", SIGNALS[1][0], SIGNALS[1][1])}${extraEv}</div>
        <div class="nv-ev-col"><div class="nv-ev-head">${I("arrow-down")}Undermines 1</div>${item("signal", SIGNALS[4][0], SIGNALS[4][1])}</div></div>` });
  const dumpRows = (top = null) => group("Today", [top, ...DUMPS.slice(0, 2).map(([n]) => row(n))].filter(Boolean)) + group("Yesterday", DUMPS.slice(2, 4).map(([n]) => row(n))) + group("Monday 2 Nov", DUMPS.slice(4, 6).map(([n]) => row(n)));
  const dumpDoc = ({ status = "", made = "", ctl = ib("trash", "Delete dump") } = {}) => doc({
    lead: plain("dump", "Link dump"), ctl, title: NEW_DUMP,
    sub: `<span class="nv-mono">09:31</span><span>Today</span><span>Shortcut</span>`,
    body: `${status}<p class="nv-note">stratechery.com/2026/agents-and-the-price-of-a-seat. Worth reading against the per-outcome pricing theory.</p>${made}` });
  const madeDone = section("", "Signals", 3, box([item("signal", "Seat pricing breaks once agents do the work", "stratechery.com", dot("new", "New")), item("signal", "Vendors test per-task pricing for agents", "stratechery.com", dot("new", "New")), item("signal", "Buyers resist variable software bills", "stratechery.com", dot("new", "New"))]));
  const briefing = (body, sub = `<span>7 changes</span><span>Last looked 18:40</span>`) => doc({ lead: plain("briefing", "Briefing"), title: "Since yesterday", sub, body });
  const toastHTML = (verb, name) => `<div class="st-toast" role="status"><span class="t">${verb}&nbsp;“<span class="q">${name}</span>”</span><button type="button" class="st-undo" data-act="undo">Undo<kbd>⌘Z</kbd></button></div>`;
  const modalHTML = (cls = "nv") => `<div class="st-scrim" data-act="cancel"></div><div class="st-modal" role="dialog" aria-modal="true" aria-labelledby="st-dd-t">
      <div class="hd"><h4 id="st-dd-t">Delete this dump?</h4>${cls === "nv" ? ib("x", "Close", "Esc", 'data-act="cancel"') : `<button type="button" class="stg-iconbtn" aria-label="Close" data-act="cancel">${I("x")}</button>`}</div>
      <p>Removes 3 signals and 2 evidence links. It stays in the bin for 30 days.</p>
      <div class="ft"><button type="button" class="${cls}-btn secondary" data-act="cancel">Cancel</button><button type="button" class="${cls}-btn danger" data-act="delete">Delete dump</button></div></div>`;

  /* ── Scenes: each state, in the default view, plus what changes in the other three ── */
  const ALL = ["default", "columns", "atlas", "timeline"];
  const S = {
    "first-run": { g: "Empty", label: "First run", views: ALL,
      note: "<b>Genuinely empty, the first time.</b> Nothing pretends to be there: no counts, no sample content, no illustration. The composer has the caret, because a dump is how everything starts. The default view rests on Briefing, which says what's absent in one line.",
      o: () => ({ cur: "home", counts: "none", focusComposer: true, main: briefing(empty("Nothing yet"), "") }),
      stg: { columns: s => { pane(s); slot(s, ".stg-col-nav .stg-index", "New theme"); slot(s, ".stg-col:not(.stg-col-nav) .stg-cards", "New theory"); }, atlas: s => { pane(s); canvasSlot(s, "New theme"); }, timeline: s => { pane(s); tlEmpty(s); } } },
    "empty-type": { g: "Empty", label: "Empty type", views: ["default"],
      note: "<b>One type is empty.</b> Where I make the thing, the list shows an Add slot exactly where the first row would sit. Where the agent makes it (Signals, Dumps), one line says so, since the action (the composer) is already on screen.",
      o: () => ({ cur: "prototype", list: list("prototype", add("New prototype"), { meta: "" }), main: briefing(box([item("theory", HELD[3], "Challenge", dot("neg", "Challenge")), item("theory", "Local models absorb most everyday agent work", "Draft")])) }) },
    filtered: { g: "Empty", label: "Filtered to nothing", views: ["default"],
      note: "<b>Filtered-empty is not empty.</b> The search and filter stay put and say what's narrowing the list; the line names the query, and Clear removes both. Esc clears the search.",
      o: () => ({ cur: "theory", list: list("theory", `<div class="st-empty-block">${empty("No theories match “pricing” in Agent identity")}${btn("quiet", "Clear filters", "")}</div>`, { tools: search("Find a theory", "pricing") + filter("Agent identity") }), main: theoryDoc() }) },
    "empty-section": { g: "Empty", label: "Empty section", views: ["default"],
      note: "<b>Inside an object, an empty group keeps its header and offers the Add slot</b> (decided 4 Nov) where its items would be. Agent-made groups say what's absent.",
      o: () => ({ cur: "theme", list: list("theme", group("", ["Cost of intelligence", "Agent memory", "Code review after agents", "AI funding cycle", "Personal software", "Agent identity", "Local-first AI", "Agent observability"].map((n, i) => row(n, { cur: i === 7 })))),
        main: doc({ lead: plain("theme", "Theme"), title: "Agent observability", sub: "<span>6 signals</span><span>0 theories</span>",
          body: section("theory", "Theories", 0, add("Add theory", true)) + section("signal", "Signals", 6, box([item("signal", "Agent tracing tool goes open source", "github.com"), item("signal", "Braintrust raises Series B", "techcrunch.com")])) }) }) },
    "caught-up": { g: "Empty", label: "Caught up", views: ["default"],
      note: "<b>Briefing with nothing new</b> keeps its title and says when you last looked. No “All caught up!”, no confetti.",
      o: () => ({ cur: "home", main: briefing(empty("Nothing new since 18:40"), "<span>Last looked 18:40</span>") }) },

    cold: { g: "Loading", label: "Cold start", views: ALL,
      note: "<b>Nothing for the first 300ms; then a skeleton in the content's own geometry.</b> Chrome that needs no data (the rail's types, the switcher, the composer) renders at once, and the composer works before anything loads. Canvases (Atlas, Timeline) draw their frame and fade their marks in; they don't skeleton shapes they can't know.",
      o: () => ({ cur: "theory", counts: "skel", list: list("theory", `<div class="st-wait">${[70, 92, 64, 84, 76, 58, 88, 68].map(w => `<div class="st-skel-row">${sk(w + "%")}</div>`).join("")}</div>`, { meta: "" }),
        main: `<article class="nv-doc st-wait"><div class="nv-top">${sk("140px")}</div>${sk("62%", "t")}${sk("38%")}<div class="st-skel-lines">${sk("96%")}${sk("88%")}${sk("54%")}</div></article>` }),
      stg: { columns: s => { pane(s); skelCols(s); }, atlas: s => { pane(s); s.querySelector(".stg-canvas").innerHTML = ""; }, timeline: s => { pane(s); tlEmpty(s, true); } } },
    slow: { g: "Loading", label: "Slow media", views: ["default"],
      note: "<b>Content whose size is known keeps its box while it loads:</b> the voice note's player and transcript are drawn at their final size, so nothing below them moves. Local data (opening any object) has no loading state at all.",
      o: () => ({ cur: "dump", list: list("dump", dumpRows(), { plus: false }), main: doc({ lead: plain("dump", "Voice dump"), ctl: ib("trash", "Delete dump"), title: "Voice note after the Foglamp demo", sub: `<span class="nv-mono">18:20</span><span>Yesterday</span><span>2m 14s</span>`,
        body: `<div class="st-media">${I("play")}<span class="st-wave st-wait">${Array.from({ length: 40 }, () => "<i></i>").join("")}</span><span class="nv-mono">2:14</span></div><div class="st-skel-lines st-wait">${sk("94%")}${sk("90%")}${sk("97%")}${sk("62%")}</div>` + section("", "Signals", 3, box([item("signal", SIGNALS[4][0], SIGNALS[4][1]), item("signal", SIGNALS[6][0], SIGNALS[6][1]), item("signal", "Lab pauses memory feature after privacy complaints", "theverge.com")])) }) }) },

    processing: { g: "Working", label: "Dump processing", views: ALL, work: "busy",
      note: "<b>The dump exists the moment it's sent.</b> It sits at the top of Today, says Processing in words, and its page shows the text you sent. Where else the work shows is choice 1. Agent work you didn't start (evidence linking, tripwire checks) shows nothing until it produces something.",
      o: () => ({ cur: "dump", work: "busy", list: list("dump", dumpRows(row(NEW_DUMP, { cur: true, mark: spin("Processing"), sub: "Processing" })), { plus: false }),
        main: dumpDoc({ status: `<div class="st-status">${spin("")}<span>Processing</span></div>` }) }),
      stg: { columns: s => strip(s, spin("1 dump processing")) } },
    paused: { g: "Working", label: "Paused", views: ["default"],
      note: "<b>Paused is not failed.</b> At the spend limit, processing waits and resumes on its own: a hollow ring and the reason, no Retry.",
      o: () => ({ cur: "dump", list: list("dump", dumpRows(row(NEW_DUMP, { cur: true, mark: ring("Paused"), sub: "Spend limit, resumes tomorrow" })), { plus: false }),
        main: dumpDoc({ status: `<div class="st-status">${ring("")}<span>Spend limit, resumes tomorrow</span></div>` }) }) },
    done: { g: "Working", label: "Dump finished", views: ["default"], done: true,
      note: "<b>The result is the feedback:</b> the status line goes, and what it made appears in place with new dots. Whether a toast also reports it is choice 2.",
      o: ch => ({ cur: "dump", fresh: ch.done === "silent" ? ["signal"] : [], list: list("dump", dumpRows(row(NEW_DUMP, { cur: true })), { plus: false }), main: dumpDoc({ made: madeDone }),
        layer: ch.done === "toast" ? `<div class="st-toast" role="status"><span class="t">Made 3 signals</span><button type="button" class="st-undo" data-act="undo">Undo<kbd>⌘Z</kbd></button></div>` : "" }) },
    suggestion: { g: "Working", label: "Suggestion arrives", views: ["default"],
      note: "<b>A suggestion has no in-progress state.</b> When the agent finishes it appears where it applies, dashed (not yet mine) with a new dot, and Briefing counts it. Nothing spins while it's being prepared.",
      o: () => ({ cur: "theory", fresh: ["theory"], list: list("theory", heldRows(0)),
        main: theoryDoc(HELD[0], { extraEv: `<div class="nv-item" style="background:var(--draft-fill);outline:1px dashed var(--hairline-strong);outline-offset:-1px">${g("suggestion")}<span class="t"><span style="color:var(--ink-2)">${SIGNALS[3][0]}</span>${dot("new", "New")}</span><span class="src"><span>Suggested</span><span class="nv-decide">${btn("secondary", "Dismiss")}${btn("primary", "Accept")}</span></span></div>` }) }) },

    failed: { g: "Error", label: "Dump failed", views: ALL, work: "failed",
      note: "<b>A failed dump stays where it was, with the reason in words and Retry beside it.</b> The red dot is the only colour; the message is ink. What you sent is never lost. Try Retry.",
      o: () => ({ cur: "dump", work: "failed", list: list("dump", dumpRows(row(NEW_DUMP, { cur: true, mark: dot("neg", "Failed"), sub: "Couldn't read the page" })), { plus: false }),
        main: dumpDoc({ status: `<div class="st-status">${dot("neg", "")}<span class="msg">Couldn't read stratechery.com. The page needs a login.</span>${btn("secondary", "Retry", 'data-act="retry"')}</div>` }) }),
      stg: { columns: s => strip(s, `<span class="stg-dot neg" role="img" aria-label="A dump failed"></span>`) } },
    unsupported: { g: "Error", label: "Can't process", views: ["default"], work: "failed",
      note: "<b>Not recoverable: say why, offer what's left, no Retry.</b> The file stays; the remaining actions are the dump's own (delete it, or dump the text another way).",
      o: () => ({ cur: "dump", work: "failed", list: list("dump", dumpRows(row("Pricing deck.key", { cur: true, mark: dot("neg", "Failed"), sub: "Can't read Keynote files" })), { plus: false }),
        main: doc({ lead: plain("dump", "File dump"), ctl: ib("trash", "Delete dump"), title: "Pricing deck.key", sub: `<span class="nv-mono">09:40</span><span>Today</span><span>Shortcut</span>`,
          body: `<div class="st-status">${dot("neg", "")}<span class="msg">Can't read Keynote files. Export it as a PDF and dump that.</span></div><div class="st-media">${I("file")}<span>Pricing deck.key</span><span class="nv-meta">4.2 MB</span></div>` }) }) },
    unsaved: { g: "Error", label: "Edit not saved", views: ALL,
      note: "<b>A save that fails shows beside the field, never only in a banner or tooltip.</b> Your text stays in the field, the line says it isn't saved, and Retry tries again. Saves that succeed show nothing.",
      o: () => ({ cur: "theory", list: list("theory", heldRows(0)),
        main: theoryDoc(HELD[0], { noteHTML: `<div style="display:grid;gap:var(--gap-tight)"><p class="nv-note st-unsaved">Small models keep getting cheaper faster than demand grows. Routine agent work stops being metered in any way I notice, and most of it moves on-device.</p><div class="st-err">${dot("neg", "")}<span>Not saved</span>${btn("quiet", "Retry")}</div></div>` }) }),
      stg: { columns: unsavedStg, atlas: unsavedStg, timeline: unsavedStg } },
    "load-failed": { g: "Error", label: "List didn't load", views: ["default", "columns"],
      note: "<b>When data doesn't arrive, the error sits where the data would have been</b>, in the list, with Retry. The rest of the window keeps working.",
      o: () => ({ cur: "theory", list: list("theory", `<div class="st-empty-block"><div class="st-err" style="padding:6px var(--inset-row)">${dot("neg", "")}<span>Couldn't load theories</span></div>${btn("secondary", "Retry")}</div>`, { meta: "" }), main: briefing(box([item("theory", HELD[3], "Challenge", dot("neg", "Challenge"))])) }),
      stg: { columns: s => { pane(s); const c = s.querySelector(".stg-col:not(.stg-col-nav) .stg-cards"); c.innerHTML = `<div class="st-err" style="margin:0"><span class="stg-dot neg"></span>Couldn't load theories<button type="button" class="stg-btn">Retry</button></div>`; } } },

    offline: { g: "Offline", label: "Offline", views: ALL, offline: true,
      note: "<b>Offline shows once, in one place, for as long as it lasts</b> (where is choice 3). Everything keeps working: edits save locally and sync when you're back, and a dump sent offline waits with a hollow ring. Coming back online shows nothing.",
      o: () => ({ cur: "dump", offline: true, list: list("dump", dumpRows(row(NEW_DUMP, { cur: true, mark: ring("Waiting"), sub: "Waiting to send" })), { plus: false }),
        main: dumpDoc({ status: `<div class="st-status">${ring("")}<span>Waiting to send</span></div>` }) }) },

    toast: { g: "Toast", label: "Undo", views: ALL,
      note: "<b>Remove, discard, retire, merge: done at once, with an Undo toast just above the composer.</b> Ink, one line, 44 high; only the name truncates. 5 seconds, held while hovered or focused; ⌘Z works while it shows. One at a time: a second action replaces it and commits the first. Try the trash button: discard twice, then Undo.",
      o: () => ({ cur: "signal", list: list("signal", group("Today", SIGNALS.slice(0, 4).map(([n], i) => row(n, { cur: i === 0, id: `s${i}` }))) + group("Yesterday", SIGNALS.slice(4).map(([n], i) => row(n, { id: `s${i + 4}` }))), { plus: false, tools: search("Find a signal") + filter() }),
        main: signalDoc(0) }),
      stg: { columns: s => toastStg(s), atlas: s => toastStg(s), timeline: s => toastStg(s) } },

    confirm: { g: "Confirm", label: "Delete dump", views: ALL,
      note: "<b>The one confirmation.</b> Deleting a dump takes its signals with it, so it asks first, with the real counts. Cancel and Esc close it; the button names verb and object, in ink. After you confirm, no toast: you already said yes, and the bin keeps it 30 days.",
      o: () => ({ cur: "dump", list: list("dump", dumpRows(row(NEW_DUMP, { cur: true })), { plus: false }), main: dumpDoc({ made: madeDone, ctl: ib("trash", "Delete dump", "", 'data-act="ask-delete"') }), layer: modalHTML("nv") }),
      stg: { columns: s => modalStg(s), atlas: s => modalStg(s), timeline: s => modalStg(s) } },

    accept: { g: "Success", label: "Accept a draft", views: ["default"],
      note: "<b>Success is mostly silent: the object appearing is the feedback.</b> Accept solidifies the draft in place (dashed to solid, 160ms) and nothing else says so. Discard takes it away, so that one gets Undo. Saving, creating (the new object opens) and filing show nothing either.",
      o: () => ({ cur: "theory", list: list("theory", heldRows(-1) + group("Drafts", [row("Local models absorb most everyday agent work", { cur: true, draft: true, id: "d0" }), row("Software is priced per outcome, not per seat", { draft: true }), row("Funding shifts from labs to applications", { draft: true })])),
        main: theoryDoc("Local models absorb most everyday agent work", { draft: true, note: "Draft from your dump this morning. Two signals point the same way." }) }) },
  };
  function signalDoc(i) {
    const [n, src] = SIGNALS[i];
    return doc({ lead: chip("theme", "Cost of intelligence"), ctl: ib("arrows-merge", "Merge") + ib("trash", "Discard signal", "", `data-act="discard" data-i="${i}"`), title: n, sub: `<span>${src}</span><span>Today</span>`,
      body: `<dl class="nv-fields"><dt>Source</dt><dd>${src}</dd><dt>Came from</dt><dd>${chip("dump", DUMPS[0][0])}</dd></dl>` + section("theory", "Evidence for", 1, box([item("theory", HELD[0], "Supports")])) });
  }

  /* ── Stage helpers: the other three views, unchanged except for the state ── */
  function pane(s) { s.querySelector(".stg-pane")?.remove(); s.style.setProperty("--pane-w", "0px"); }
  function slot(s, sel, label) { const el = s.querySelector(sel); if (el) el.innerHTML = add(label); }
  function canvasSlot(s, label) { s.querySelector(".stg-canvas").innerHTML = `<span class="st-canvas-slot">${add(label, true)}</span>`; }
  function tlEmpty(s, loading) { s.querySelectorAll(".stg-tl-item").forEach(x => x.remove()); s.querySelectorAll(".stg-tl-gutter").forEach((x, i) => { if (i) x.innerHTML = ""; });
    if (!loading) { const cell = s.querySelectorAll(".stg-tl-cell")[0]; if (cell) cell.innerHTML = add("New theory"); } }
  function skelCols(s) {
    const idx = s.querySelector(".stg-col-nav .stg-index"); idx.outerHTML = `<div class="st-skel-index st-wait">${[72, 58, 80, 64, 70, 52, 60].map(w => `<span>${sk(w + "%")}</span>`).join("")}</div>`;
    const c = s.querySelector(".stg-col:not(.stg-col-nav) .stg-cards"); c.innerHTML = [0, 1, 2].map(() => `<div class="st-skel-card st-wait">${sk("92%")}${sk("60%")}<span style="display:flex;gap:8px">${sk("44px")}${sk("28px")}</span></div>`).join("");
  }
  function strip(s, mark) { const st = s.querySelector(".stg-strip"); if (st) st.insertAdjacentHTML("beforeend", `<span class="st-strip-mark">${mark}</span>`); }
  function unsavedStg(s) { const n = s.querySelector(".stg-note"); if (!n) return; n.textContent += " Most of it moves on-device."; n.style.boxShadow = "inset 0 0 0 0.5px var(--hairline-strong)";
    n.insertAdjacentHTML("afterend", `<div class="st-err"><span class="stg-dot neg"></span>Not saved<button type="button" class="stg-btn">Retry</button></div>`); }
  function toastStg(s) { s.insertAdjacentHTML("beforeend", toastHTML("Discarded", SIGNALS[0][0])); }
  function modalStg(s) { s.insertAdjacentHTML("beforeend", modalHTML("stg")); }

  /* ── Choices (from the page's picks; option stages force their own) ── */
  const page = document.body.dataset.jig;
  const PICK = { work: ["work", { "A In the composer": "composer", "B On the Dumps type": "rail", "C Only on the dump": "row" }],
    done: ["done", { "A Toast with Undo": "toast", "B Silent: new dots": "silent" }], offline: ["offline", { "A Beside the view switcher": "switcher", "B In the composer": "composer" }] };
  const DEF = { work: "composer", done: "silent", offline: "switcher" };
  const picks = () => {
    const out = { ...DEF };
    for (const [id, [key, vals]] of Object.entries(PICK)) {
      let v; try { v = JSON.parse(localStorage.getItem(`jig:${page}:${id}`))?.choice; } catch {}
      if (v === undefined) v = document.querySelector(`[data-decision="${id}"]`)?.dataset.default;
      if (vals[v]) out[key] = vals[v];
    }
    return out;
  };

  /* ── Mount ─────────────────────────────────────────── */
  const fitNv = host => { const el = host.firstElementChild; if (el?.classList.contains("nv") && host.clientWidth) el.style.zoom = Math.min(1, host.clientWidth / 1280); };
  const ro = new ResizeObserver(es => es.forEach(e => fitNv(e.target)));
  const mount = host => {
    const id = host.dataset.scene, view = host.dataset.view || "default", sc = S[id];
    const ch = { ...picks(), ...JSON.parse(host.dataset.ch || "{}") };
    const o = sc.o(ch);
    if (view === "default" || !window.AberStage) {
      host.innerHTML = frame(o, ch); fitNv(host); ro.observe(host);
    } else {
      host.innerHTML = `<div class="stg-host st-stagehost" data-stage='{"view":"${view}"}'></div>`;
      const sh = host.firstElementChild; window.AberStage.render(sh);
      const s = sh.firstElementChild;
      const vb = s.querySelector('.stg-switch button[data-view="sections"]'); if (vb) { vb.dataset.tip = "Default"; vb.setAttribute("aria-label", "Default"); vb.dataset.view = "default"; }
      sc.stg?.[view]?.(s);
      s.insertAdjacentHTML("beforeend", composer({ work: sc.work, offline: sc.offline }, ch));
      if (sc.offline && ch.offline === "switcher") s.insertAdjacentHTML("beforeend", offlineTag());
      if (sc.done && ch.done === "toast") s.insertAdjacentHTML("beforeend", `<div class="st-toast" role="status"><span class="t">Made 3 signals</span><button type="button" class="st-undo">Undo<kbd>⌘Z</kbd></button></div>`);
    }
    host._s = { id, view };
  };
  const mountAll = (root = document) => root.querySelectorAll(".st-mount[data-scene]").forEach(mount);

  /* ── Tooltips for the window and the composer: name, then key; after 500ms; above in bottom bars ── */
  let tipT;
  const local = (base, el) => { const br = base.getBoundingClientRect(), k = br.width / base.offsetWidth || 1, r = el.getBoundingClientRect(); return { x: (r.left - br.left) / k, y: (r.top - br.top) / k, w: r.width / k, h: r.height / k }; };
  const tipOf = b => b.dataset.stTip ?? (b.closest(".nv") ? b.dataset.tip : null);
  const showTip = b => {
    const base = b.closest(".nv, .stg"); if (!base) return; base.querySelector(".st-tip")?.remove();
    const t = document.createElement("div"); t.className = "st-tip"; t.setAttribute("role", "tooltip");
    t.innerHTML = `<span>${tipOf(b)}</span>${b.dataset.key ? `<kbd>${b.dataset.key}</kbd>` : ""}`; base.append(t);
    const r = local(base, b), tw = t.offsetWidth, th = t.offsetHeight;
    const above = b.closest(".ctl-composer, .nv-switch");
    Object.assign(t.style, { left: `${Math.max(4, Math.min(base.offsetWidth - tw - 4, r.x + r.w / 2 - tw / 2))}px`, top: `${above ? r.y - th - 4 : r.y + r.h + 4}px` });
  };
  const tipTarget = e => { const b = e.target.closest?.("[data-st-tip], .nv [data-tip]"); return b && tipOf(b) ? b : null; };
  document.addEventListener("pointerover", e => { const b = tipTarget(e); if (!b) return; clearTimeout(tipT); tipT = setTimeout(() => showTip(b), 500); });
  document.addEventListener("pointerout", e => { const b = tipTarget(e); if (!b) return; clearTimeout(tipT); b.closest(".nv, .stg")?.querySelector(".st-tip")?.remove(); });
  document.addEventListener("focusin", e => { const b = tipTarget(e); if (b && e.target.matches(":focus-visible")) showTip(b); });
  document.addEventListener("focusout", e => { e.target.closest?.(".nv, .stg")?.querySelector(".st-tip")?.remove(); });

  /* ── Live behaviour ────────────────────────────────── */
  // Toast: one at a time, 5s, held while hovered or focused, ⌘Z while it shows; a new one replaces (and commits) the last
  const toast = (base, verb, name, undo) => {
    const old = base.querySelector(".st-toast"); if (old) { old._commit?.(); old.remove(); }
    base.insertAdjacentHTML("beforeend", toastHTML(verb, name));
    const t = base.querySelector(".st-toast"); let held = false, timer;
    const go = () => { clearTimeout(timer); t.classList.add("out"); setTimeout(() => t.remove(), 160); };
    const arm = (ms = 5000) => { clearTimeout(timer); timer = setTimeout(() => held ? arm(1500) : (t._commit?.(), go()), ms); };
    t._commit = () => {}; t._undo = () => { undo(); t._commit = null; go(); };
    t.addEventListener("pointerenter", () => held = true); t.addEventListener("pointerleave", () => held = false);
    t.addEventListener("focusin", () => held = true); t.addEventListener("focusout", () => held = false);
    arm();
  };
  document.addEventListener("click", e => {
    const host = e.target.closest(".st-mount"); if (!host || host.closest(".thumb")) return;
    const a = e.target.closest("[data-act]"); const base = host.querySelector(".nv, .stg");
    // View switch inside a window: follow it in the viewer
    const vb = e.target.closest(".nv-switch button[data-view], .stg-switch button[data-view]");
    if (vb) { e.preventDefault(); e.stopPropagation(); const v = vb.dataset.view === "sections" ? "default" : vb.dataset.view; if (host.id === "viewer") setView(v); else if ((S[host.dataset.scene].views || ["default"]).includes(v)) { host.dataset.view = v; mount(host); } return; }
    if (!a) return;
    const act = a.dataset.act;
    if (act === "undo") { const t = a.closest(".st-toast"); if (t?._undo) t._undo(); else t?.remove(); }
    if (act === "discard") {
      const i = +a.dataset.i, r = base.querySelector(`.nv-row[data-id="s${i}"]`);
      const rows = [...base.querySelectorAll(".nv-row[data-id]")], next = rows[rows.indexOf(r) + 1] || rows[rows.indexOf(r) - 1];
      const scroller = base.querySelector(".nv-scroller"), before = scroller.innerHTML;
      r.hidden = true; r.setAttribute("aria-current", "false");
      if (next) { next.setAttribute("aria-current", "true"); scroller.innerHTML = signalDoc(+next.dataset.id.slice(1)); }
      toast(base, "Discarded", SIGNALS[i][0], () => { r.hidden = false; base.querySelectorAll(".nv-row[data-id]").forEach(x => x.setAttribute("aria-current", String(x === r))); scroller.innerHTML = before; });
    }
    if (act === "accept") {
      const title = base.querySelector(".nv-title"), cur = base.querySelector(".nv-row.draft[aria-current='true']");
      title.classList.remove("draft"); cur?.classList.remove("draft");
      a.closest("dd").innerHTML = `<span class="nv-conf lg" role="img" aria-label="Confidence 0 of 5">${[1, 2, 3, 4, 5].map(() => "<i></i>").join("")}</span>`;
      a.closest("dl")?.querySelector("dt")?.replaceChildren("Confidence");
    }
    if (act === "discard-draft") {
      const cur = base.querySelector(".nv-row.draft[aria-current='true']"), scroller = base.querySelector(".nv-scroller"), before = scroller.innerHTML;
      cur.hidden = true; scroller.innerHTML = briefing(box([item("theory", HELD[3], "Challenge", dot("neg", "Challenge"))]));
      toast(base, "Discarded", "Local models absorb most everyday agent work", () => { cur.hidden = false; scroller.innerHTML = before; });
    }
    if (act === "cancel") base.querySelectorAll(".st-scrim, .st-modal").forEach(x => x.remove());
    if (act === "ask-delete") base.insertAdjacentHTML("beforeend", modalHTML(base.classList.contains("nv") ? "nv" : "stg"));
    if (act === "delete") {
      base.querySelectorAll(".st-scrim, .st-modal").forEach(x => x.remove());
      const r = base.querySelector(".nv-row[aria-current='true']"); if (r) r.hidden = true;
      const sc = base.querySelector(".nv-scroller"); if (sc) sc.innerHTML = briefing(box([item("theory", HELD[3], "Challenge", dot("neg", "Challenge"))]));
    }
    if (act === "retry") {
      // Retry: the button keeps its width and spins, then the dump is processing again, then it lands
      a.setAttribute("aria-busy", "true"); a.insertAdjacentHTML("beforeend", `<span class="ctl-spin">${I("circle-notch")}</span>`);
      setTimeout(() => { if (host.id === "viewer") setState("processing"); else { host.dataset.scene = "processing"; mount(host); }
        setTimeout(() => { if (host.id === "viewer" ? VS.state === "processing" : host.dataset.scene === "processing") { if (host.id === "viewer") setState("done"); else { host.dataset.scene = "done"; mount(host); } } }, 1800); }, 700);
    }
  }, true);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") document.querySelectorAll(".st-mount .st-modal").forEach(m => { const b = m.closest(".nv, .stg"); b.querySelectorAll(".st-scrim, .st-modal").forEach(x => x.remove()); });
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { const t = document.querySelector("#viewer .st-toast"); if (t?._undo) { e.preventDefault(); t._undo(); } }
  });

  /* ── The viewer ────────────────────────────────────── */
  const VS = { state: "failed", view: "default" };
  let viewer;
  function paintViewer() {
    viewer.dataset.scene = VS.state; viewer.dataset.view = VS.view; mount(viewer);
    document.querySelectorAll("[data-seg='state'] button").forEach(b => b.setAttribute("aria-pressed", String(b.value === VS.state)));
    const ok = S[VS.state].views;
    document.querySelectorAll("[data-seg='view'] button").forEach(b => { b.setAttribute("aria-pressed", String(b.value === VS.view)); b.setAttribute("aria-disabled", String(!ok.includes(b.value))); b.title = ok.includes(b.value) ? "" : "This state lives in the default view"; });
    document.getElementById("state-note").innerHTML = S[VS.state].note;
  }
  function setState(id) { VS.state = id; if (!S[id].views.includes(VS.view)) VS.view = "default"; paintViewer(); }
  function setView(v) { if (!S[VS.state].views.includes(v)) return; VS.view = v; paintViewer(); }

  const start = () => {
    viewer = document.getElementById("viewer");
    const groups = document.getElementById("state-groups");
    if (groups) {
      const by = {}; for (const [id, sc] of Object.entries(S)) (by[sc.g] ??= []).push([id, sc.label]);
      groups.innerHTML = Object.entries(by).map(([gname, items]) => `<span class="seg" data-seg="state"><span>${gname}</span><span class="seg-group">${items.map(([id, l]) => `<button type="button" value="${id}">${l}</button>`).join("")}</span></span>`).join("");
      groups.addEventListener("click", e => { const b = e.target.closest("button[value]"); if (b) setState(b.value); });
      document.querySelector("[data-seg='view']").addEventListener("click", e => { const b = e.target.closest("button[value]"); if (b && b.getAttribute("aria-disabled") !== "true") setView(b.value); });
    }
    const thumbs = document.getElementById("thumbs");
    if (thumbs) {
      thumbs.innerHTML = Object.entries(S).map(([id, sc]) => `<button type="button" class="thumb" data-go="${id}"><span>${sc.label} <small>${sc.g}</small></span><div class="st-mount" data-scene="${id}" data-view="default"></div></button>`).join("");
      thumbs.addEventListener("click", e => { const b = e.target.closest(".thumb"); if (!b) return; setState(b.dataset.go); document.getElementById("board").scrollIntoView({ behavior: "smooth", block: "start" }); });
    }
    mountAll();
    if (viewer) paintViewer();
    // The decide box and the viewer follow the picks
    const paintPicks = () => document.querySelectorAll("[data-pick]").forEach(li => {
      let v = null; try { v = JSON.parse(localStorage.getItem(`jig:${page}:${li.dataset.pick}`))?.choice; } catch {}
      v = v === undefined ? document.querySelector(`[data-decision="${li.dataset.pick}"]`)?.dataset.default : v;
      li.querySelector(".pick").innerHTML = v ? `Current pick: <b>${v}</b>` : "No pick yet";
    });
    addEventListener("load", () => {
      const d = document.querySelector(".jig-dock"), h = document.querySelector(".jig-head"); if (d && h) h.append(d);
      paintPicks();
      document.addEventListener("click", e => { if (e.target.closest(".jig-choose")) setTimeout(() => { paintPicks(); if (viewer) paintViewer(); document.querySelectorAll("#thumbs .st-mount").forEach(mount); }, 0); });
    });
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", start); else start();
  window.AberStates = { S, mount };
})();
