// Grammar 12: Aber on a phone (390 × 844) and a tablet (744 × 1000), live. Objects come from _shared/objects.js (06), so every preview, peek,
// full view and proposal block is the decided one; this file adds only what a narrow screen changes: the tab bar, the push stack, sheets,
// the pill above the tabs, the toast, touch triggers and the keyboard.
// Usage: <div class="ph-host" data-phone='{"device":"phone","tabs":"B","scale":"desk","views":"none","start":{"tab":"theory"}}'></div>
//   device: phone | tablet. frame: false renders the bare app (app.html, on a real phone). host.ph is the API the page's flows drive.
(() => {
  const A = window.AberObjects; if (!A) { console.warn("phone.js: load _shared/objects.js first"); return; }
  const { O, all, tile, row, card, peek, full, sugBlock, SUG, tripLine, DAYS } = A;
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const ic = (n, fill) => `<i class="ph${fill ? "-fill" : ""} ph-${n}" aria-hidden="true"></i>`;
  const ib = (icon, label, attr = "") => `<button type="button" class="ph-ib" aria-label="${label}" ${attr}>${ic(icon)}</button>`;
  const short = (t, n = 20) => t.length > n ? `${t.slice(0, n - 1).trim()}…` : t;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const SPRING = "cubic-bezier(0.16, 1, 0.3, 1)", OUT = "cubic-bezier(0.2, 0.8, 0.2, 1)";

  const ICON = { ...A.ICON, more: "dots-three" };
  const NAME = { briefing: "Briefing", theme: "Themes", theory: "Theories", prototype: "Prototypes", signal: "Signals", dump: "Dumps", more: "More", atlas: "Atlas", columns: "Columns", timeline: "Timeline" };
  const ONE = { theme: "theme", theory: "theory", prototype: "prototype", signal: "signal", dump: "dump" };
  const TYPES = ["theme", "theory", "prototype", "signal", "dump"];
  // Choice 1: which items get a tab. Five fit at 390 with their names whole; the rest sit in More.
  const TABS = { A: ["briefing", "theme", "theory", "signal", "more"], B: ["briefing", "theory", "signal", "dump", "more"], C: ["briefing", "theme", "theory", "prototype", "signal", "dump"] };
  // Choice 3: which of Columns, Atlas and Timeline a phone has (all three from 744 up)
  const VIEWS = { none: [], atlas: ["atlas"], all: ["columns", "atlas", "timeline"] };
  const VICON = { sections: "rows", columns: "columns", atlas: "map-trifold", timeline: "chart-scatter" };
  const moreOf = s => TYPES.filter(t => !TABS[s.cfg.tabs].includes(t));

  /* ═══ Content ═══ */
  const obj = (s, id) => (s.newDump?.id === id ? s.newDump : O[id]);
  const BRIEF = [
    ["Challenges", [{ key: "ch:t4", subj: "t4", kind: "challenge" }]],
    ["Suggestions", [{ key: "sug:t1", subj: "t1", kind: "sug" }, { key: "sug:t2", subj: "t2", kind: "sug" }]],
    ["Drafts", [{ key: "dr:t11", subj: "t11", from: "d1", kind: "draft" }, { key: "dr:p8", subj: "p8", from: "d5", kind: "draft" }]],
  ];
  const SAID = { challenge: ["Kept confidence at 4", "Lowered to 3"], sug: ["Dismissed", "Added as support"], draft: ["Draft discarded", "Kept"] };
  const NEWS = [["coi", ["s1", "s2"]], ["mem", ["s3"]], ["obs", ["s4"]]];
  const decideBtns = (no, yes) => `<div class="ob-decide"><button type="button" class="nv-btn secondary" data-decide="no">${no}</button><button type="button" class="nv-btn primary" data-decide="yes">${yes}</button></div>`;

  const unitHTML = (s, u) => {
    const o = O[u.subj], cls = `ph-unit${s.solid === u.key ? " solid" : ""}${s.leaving === u.key ? " leaving" : ""}`;
    let body = "";
    const wire = h => h.replace(`<button type="button" class="nv-btn secondary">`, `<button type="button" class="nv-btn secondary" data-decide="no">`).replace(`<button type="button" class="nv-btn primary">`, `<button type="button" class="nv-btn primary" data-decide="yes">`);
    if (u.kind === "challenge") body = row(o) + wire(tripLine(o, "full"));
    if (u.kind === "sug") body = row(o) + wire(sugBlock(SUG[u.subj][0]));
    if (u.kind === "draft") body = `<div class="ob-block sug"><div class="ob-blabel">Drafted from your dump</div><p class="ob-reason">${esc(O[u.from].name)}</p>${row(o)}${decideBtns("Discard", "Keep")}</div>`;
    return `<div class="${cls}" data-unit="${u.key}">${body}</div>`;
  };
  const briefHTML = s => {
    const secs = BRIEF.map(([label, us]) => [label, us.filter(u => !s.decided.has(u.key))]).filter(([, us]) => us.length);
    const need = secs.reduce((n, [, us]) => n + us.length, 0);
    const news = NEWS.map(([th, ids]) => `<div class="ph-unit ph-theme">${row(O[th], { cls: ids.some(id => !s.seen.has(id)) ? "unseen" : "" })}<div class="ob-rows">${ids.map(id => row(O[id], { cls: s.seen.has(id) ? "" : "unseen" })).join("")}</div></div>`).join("");
    const sum = need ? `${need} ${need === 1 ? "thing needs" : "things need"} you. 4 signals arrived, most in Cost of intelligence; one link couldn't be read.` : "Nothing needs you. 4 signals arrived, most in Cost of intelligence.";
    return `<article class="ob-full ob-digest ph-brief"><header class="ob-hang ob-head">${tile("briefing", "newspaper")}<div class="ob-col"><h3 class="ob-title">Since yesterday</h3><div class="ob-meta lg"><span>Last looked 18:40</span></div></div></header>
      <div class="ob-body"><p class="ph-sum">${sum}</p><div class="ob-rels">
        ${secs.map(([label, us]) => `<section class="ob-sec"><div class="ob-sh"><span>${label}</span><span class="ob-n">${us.length}</span></div><div class="ob-rows">${us.map(u => unitHTML(s, u)).join("")}</div></section>`).join("")}
        <section class="ob-sec"><div class="ob-sh"><span>New signals</span><span class="ob-n">4</span></div><div class="ob-rows">${news}</div></section>
      </div></div></article>`;
  };

  // Lists: the type's root screen. Theories and Signals filter by theme (a filter chip; its menu is a sheet).
  const procRow = d => `<div class="ob-row" data-id="${d.id}">${tile("dump", "tray-arrow-down")}<button type="button" class="nm" data-sel="${d.id}">${esc(d.name)}</button><span class="kv"><span class="ob-st"><i class="ph ph-circle-notch ph-spin" aria-hidden="true"></i>Processing</span></span></div>`;
  const groupsOf = (s, type) => {
    const f = x => !s.filter || (x.themes || []).includes(s.filter);
    if (type === "theory") { const xs = all("theory").filter(t => !t.retired && f(t)); return [["", xs.filter(t => !t.draft)], ["Drafts", xs.filter(t => t.draft)]]; }
    if (type === "theme") return [["", all("theme").filter(t => !t.draft)], ["Drafts", all("theme").filter(t => t.draft)]];
    if (type === "prototype") return [["building", "Building"], ["idea", "Ideas"], ["built", "Built"], ["shelved", "Shelved"]].map(([k, l]) => [l, all("prototype").filter(p => p.status === k)]);
    if (type === "signal") return [0, 1, 2, 3].map(d => [DAYS[d], all("signal").filter(x => x.day === d && f(x))]);
    const ds = [...(s.newDump ? [s.newDump] : []), ...all("dump")];
    return [0, 1, 2, 3].map(d => [DAYS[d], ds.filter(x => x.day === d)]);
  };
  const listHTML = (s, type, cur) => {
    const filt = type === "theory" || type === "signal" ? `<div class="ph-filter"><button type="button" class="ctl-chip" data-filter aria-haspopup="dialog">${ic("funnel")}<span>${s.filter ? esc(O[s.filter].name) : "All themes"}</span></button></div>` : "";
    const rows = xs => xs.map(o => o.processing ? procRow(o) : row(o, { act: "sel", cur, cls: o.kind === "signal" && o.fresh && !s.seen.has(o.id) ? "unseen" : "" })).join("");
    return `${filt}<div class="ph-list">${groupsOf(s, type).filter(([, xs]) => xs.length).map(([l, xs]) => `<div class="ph-group">${l ? `<div class="ph-glabel">${l}<span class="ob-n">${xs.length}</span></div>` : ""}${rows(xs)}</div>`).join("")}</div>`;
  };
  const moreHTML = s => {
    const views = VIEWS[s.cfg.views];
    const tRow = t => `<div class="ob-row one label"><span class="g" data-type="${t}">${ic(ICON[t])}</span><button type="button" class="nm" data-more="${t}">${NAME[t]}</button><span class="kv"><span class="ob-n">${t === "dump" ? all("dump").length + (s.newDump ? 1 : 0) : all(t).length}</span>${ic("caret-right")}</span></div>`;
    const vRow = v => `<div class="ob-row one label"><span class="g" data-type="briefing">${ic(VICON[v])}</span><button type="button" class="nm" data-view="${v}">${NAME[v]}</button><span class="kv">${ic("caret-right")}</span></div>`;
    return `<h2 class="ph-title">More</h2><div class="ph-list"><div class="ph-group">${moreOf(s).map(tRow).join("")}</div>
      ${views.length ? `<div class="ph-group"><div class="ph-glabel">Views</div>${views.map(vRow).join("")}</div>` : ""}</div>`;
  };
  // A full view: 06's, with its top bar taken over by the phone's bar (Back, and its verbs behind ⋯)
  const fullHTML = (s, id) => full(obj(s, id), { back: "" }).replace(/<div class="ob-top">[\s\S]*?<\/div>(\s*<header)/, "$1");

  /* ═══ Views on a phone (choice 3) ═══ */
  const SPOTS = { coi: [250, 230], mem: [610, 250], rev: [230, 560], fund: [600, 590], ps: [420, 820], aid: [760, 860], local: [80, 820], nai: [860, 420], obs: [420, 410], evals: [120, 380] };
  const atlasHTML = s => {
    const a = s.atlas ||= { x: -120, y: -90, k: 0.62 };
    const discs = Object.entries(SPOTS).map(([id, [x, y]]) => { const th = O[id], r = 44 + 13 * Math.sqrt(th.signals);
      return `<div class="ph-disc" style="left:${x - r}px;top:${y - r}px;width:${r * 2}px;height:${r * 2}px"><span class="lbl">${tile("theme", "binoculars")}<span class="t">${esc(th.name)}</span></span></div>`; }).join("");
    const pins = all("theory").filter(t => !t.retired && SPOTS[t.themes[0]]).map((t, i, xs) => { const [x, y] = SPOTS[t.themes[0]], same = xs.filter(u => u.themes[0] === t.themes[0]), j = same.indexOf(t), ang = j * 2.4 + 0.6;
      return `<button type="button" class="ph-pin" style="left:${x + Math.cos(ang) * 30}px;top:${y + 26 + Math.sin(ang) * 26}px;--d:${t.draft ? 10 : 8 + 1.5 * t.c}px" aria-label="${esc(t.name)}" data-open="${t.id}"${s.sheet?.id === t.id ? ' aria-pressed="true"' : ""}><i></i></button>`; }).join("");
    return `<div class="ph-canvas" data-atlas style="height:100%"><div class="ph-world" style="--k:${a.k};transform:translate(${a.x}px,${a.y}px) scale(${a.k});width:980px;height:1000px">${discs}${pins}</div>
      <div class="ph-float" style="left:var(--g);top:var(--gap-item)">${ib("magnifying-glass-plus", "Zoom in", 'data-zoom="1.25"')}${ib("magnifying-glass-minus", "Zoom out", 'data-zoom="0.8"')}${ib("corners-in", "Fit", 'data-zoom="fit"')}</div></div>`;
  };
  const COLS = [["theme", "Themes"], ["theory", "Theories"], ["prototype", "Prototypes"], ["dump", "Dumps"], ["signal", "Signals"]];
  const columnsHTML = s => `<div style="display:grid;grid-template-rows:minmax(0,1fr) auto;height:100%"><div class="ph-pages" data-pages>${COLS.map(([t, l]) => `<section class="ph-col" aria-label="${l}"><div class="ph-col-head">${tile(t, ICON[t])}<span>${l}</span></div>
      <div style="display:grid;gap:var(--gap-item);overflow:auto;min-height:0">${(t === "theory" ? all(t).filter(x => !x.retired) : all(t)).slice(0, 9).map(o => t === "theory" ? card(o) : row(o)).join("")}</div></section>`).join("")}</div>
      <div class="ph-dots" aria-hidden="true">${COLS.map((_, i) => `<i${i === (s.page || 0) ? " data-on" : ""}></i>`).join("")}</div></div>`;
  const timelineHTML = () => {
    const YW = 180, G = 44, LH = 96, xs = all("theory").filter(t => !t.retired), cell = {};
    const items = xs.map(t => { const lane = t.draft ? 5 : 5 - t.c, k = `${t.by}:${lane}`, n = cell[k] = (cell[k] || 0) + 1;
      return `<button type="button" class="ph-tl-item" style="left:${G + (t.by - 2026) * YW + 8}px;top:${34 + lane * LH + (n - 1) * 40}px" data-open="${t.id}"><i${t.draft ? ' style="background:none;outline:1px dashed var(--ink-3)"' : ""}></i><span>${esc(t.name)}</span></button>`; }).join("");
    return `<div class="ph-tl" style="height:100%"><div class="ph-tl-in" style="width:${G + 4 * YW + 160}px;height:${34 + 6 * LH}px;--h:${6 * LH}px">
      ${[2026, 2027, 2028, 2029].map((y, i) => `<span class="yr" style="left:${G + i * YW + 8}px;top:8px">${y}</span>`).join("")}
      ${[5, 4, 3, 2, 1, "Drafts"].map((c, i) => `<span class="lane" style="left:8px;top:${34 + i * LH + 12}px">${c}</span>`).join("")}${items}</div></div>`;
  };
  const viewHTML = (s, v) => v === "atlas" ? atlasHTML(s) : v === "columns" ? columnsHTML(s) : timelineHTML(s);

  /* ═══ Chrome ═══ */
  const titleOf = (s, scr) => scr.v === "brief" ? "Briefing" : scr.v === "list" ? NAME[scr.type] : scr.v === "more" ? "More" : scr.v === "view" ? NAME[scr.view] : short(obj(s, scr.id).name);
  const barHTML = (s, scr, prev) => {
    let right = "";
    if (scr.v === "full") { const o = obj(s, scr.id); right = o.draft ? decideBtns("Discard", "Keep") : ib("dots-three", "More actions", `data-menu="${o.id}"`); }
    else if (scr.v !== "view") right = ib("magnifying-glass", "Find", "data-find");
    return `<div class="ph-bar">${prev ? `<button type="button" class="ph-back" data-back aria-label="Back to ${esc(titleOf(s, prev))}">${ic("caret-left")}<span>${esc(titleOf(s, prev))}</span></button>` : ""}<span class="sp"></span>${right}</div>`;
  };
  const bodyHTML = (s, scr) => scr.v === "brief" ? briefHTML(s) : scr.v === "list" ? `<h2 class="ph-title">${NAME[scr.type]}</h2>${listHTML(s, scr.type)}`
    : scr.v === "more" ? moreHTML(s) : scr.v === "full" ? fullHTML(s, scr.id) : "";
  const screenHTML = (s, scr, prev, cls) => `<section class="ph-screen ${cls}" aria-label="${esc(titleOf(s, scr))}"${cls === "under" ? ' aria-hidden="true" inert' : ""}>${barHTML(s, scr, prev)}
      ${scr.v === "view" ? `<div style="position:relative;min-height:0;padding-bottom:${scr.view === "atlas" ? 0 : "var(--chrome-b)"}">${viewHTML(s, scr.view)}</div>` : `<div class="ph-scroll">${bodyHTML(s, scr)}</div>`}</section>`;

  const tabsHTML = s => `<nav class="ph-tabs" aria-label="Types">${TABS[s.cfg.tabs].map(t => {
    const cur = s.tab === t, holds = t === "more" ? moreOf(s) : [t];
    const working = s.working && holds.includes("dump"), failed = holds.includes("dump");
    const unseen = holds.includes("signal") && NEWS.some(([, ids]) => ids.some(id => !s.seen.has(id)));
    const glyph = working ? `<span class="g" data-type="dump"><i class="ph ph-circle-notch spin" aria-hidden="true"></i></span>`
      : t === "more" ? `<span class="bare">${ic("dots-three")}</span>` : `<span class="g" data-type="${t}">${ic(ICON[t], cur)}</span>`;
    const label = `${NAME[t]}${working ? ", working" : ""}${failed ? ", a dump couldn't be read" : ""}${unseen ? ", unread" : ""}`;
    return `<button type="button" class="ph-tab${unseen ? " unseen" : ""}" data-tab="${t}"${cur ? ' aria-current="page"' : ""} aria-label="${label}"><span class="gw">${glyph}${failed ? `<b class="ph-dot"></b>` : ""}</span><span class="nm">${NAME[t]}</span></button>`;
  }).join("")}</nav>`;
  const mmss = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  const take = s => `<div class="mk-take">${ib("trash", "Discard take", "data-rec-no")}<span class="mk-wave" aria-hidden="true">${Array.from({ length: 30 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</span><span class="mk-time" data-time>${mmss(s.rec.sec)}</span><button type="button" class="ctl-icon primary" aria-label="Stop and dump" data-rec-stop>${ic("stop", true)}</button></div>`;
  const pillHTML = s => s.sheet?.kind === "chat" ? "" : `<div class="ph-pill${s.rec ? " rec" : ""}" role="group" aria-label="Dump or ask">${s.rec ? take(s)
    : `<button type="button" class="ph-pill-open" data-chat-open>${ic("tray-arrow-down")}<span>Dump or ask</span></button>${ib("microphone", "Voice dump", "data-rec-start")}`}</div>`;
  const toastHTML = s => s.toast ? `<div class="ph-toast${s.toast.enter ? " enter" : ""}" role="status"><span class="t">${esc(s.toast.text)}</span>${s.toast.undo ? `<button type="button" data-undo>Undo</button>` : ""}</div>` : "";

  /* ═══ Sheets ═══ */
  const thread = s => s.thread.map(m => m.day != null ? `<div class="mk-day">${DAYS[m.day]}</div>`
    : m.who === "me" ? `<div class="mk-me">${m.voice ? `<div class="mk-bubble mk-voice">${ib("play", "Play voice note")}<span class="mk-wave still" aria-hidden="true">${Array.from({ length: 22 }, (_, k) => `<i style="--i:${k}"></i>`).join("")}</span><span class="mk-time">${m.voice}</span></div>` : `<div class="mk-bubble"><p>${esc(m.text)}</p></div>`}<span class="mk-when">${m.time}</span></div>`
    : m.working ? `<div class="mk-agent mk-working" role="status">${ic("circle-notch")}<span>Reading</span></div>`
    : `<div class="mk-agent"><p class="mk-say">${esc(m.say)}</p>${m.rows ? `<div class="ob-rows">${m.rows.map(id => row(O[id])).join("")}</div>` : ""}</div>`).join("");
  const findResults = (s, q) => {
    const n = q.trim().toLowerCase();
    if (!n) return `<div class="ph-group"><div class="ph-glabel">Recent</div>${["t4", "s3", "coi"].map(id => row(O[id], { act: "sel" })).join("")}</div>`;
    const hits = TYPES.map(t => [t, all(t).filter(o => o.name.toLowerCase().includes(n)).slice(0, 4)]).filter(([, xs]) => xs.length);
    const mark = t => esc(t).replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), m => `<mark>${m}</mark>`);
    return hits.length ? hits.map(([t, xs]) => `<div class="ph-group"><div class="ph-glabel">${NAME[t]}</div>${xs.map(o => row(o, { act: "sel" }).replace(`>${o.name}</button>`, `>${mark(o.name)}</button>`)).join("")}</div>`).join("")
      : `<p class="ph-empty">Nothing called “${esc(q)}”</p>`;
  };
  const MENU = { theory: [["archive", "Retire", "retire"]], prototype: [["archive", "Retire", "retire"]], theme: [["archive", "Retire", "retire"]], signal: [["arrows-merge", "Merge", "merge"], ["trash", "Discard signal", "discard"]], dump: [["trash", "Delete dump", "delete"]] };
  const sheetHTML = s => {
    const sh = s.sheet; if (!sh) return "";
    let body = "", foot = "", cls = "", label = "", detent = sh.detent || "fit";
    if (sh.kind === "peek") { const o = obj(s, sh.id); label = o.name; body = peek(o); foot = `<button type="button" class="nv-btn secondary ph-wide" data-full="${o.id}">Open${ic("arrow-right")}</button>`; if (s.cfg.device === "tablet" && sh.side) cls = "side"; }
    if (sh.kind === "menu") { const o = obj(s, sh.id); label = o.name;
      const date = o.kind === "signal" || o.kind === "dump" ? `Captured ${DAYS[o.day].toLowerCase() === "today" ? "today" : DAYS[o.day]}${o.time ? ` at ${o.time}` : ""}` : o.kind === "theory" && o.by ? `Happens by ${o.by}` : "";
      const verbs = sh.rel ? [["arrow-right", "Open", "open"], ["eye", "Peek", "peek"], null, ["minus", sh.rel, "unlink"]] : sh.verbs ? MENU[o.kind] : [["arrow-right", "Open", "open"], ["eye", "Peek", "peek"]];
      body = `<div class="ph-menu" role="menu">${row(o, { act: "none" })}${date ? `<div class="meta">${date}</div>` : ""}${verbs.map(v => v ? `<button type="button" role="menuitem" data-verb="${v[2]}">${ic(v[0])}<span>${v[1]}</span></button>` : "<hr>").join("")}</div>`; }
    if (sh.kind === "filter") { label = "Filter by theme"; body = `<div class="ph-menu" role="menu"><button type="button" role="menuitemradio" aria-checked="${!s.filter}" data-pick-theme="">${ic(s.filter ? "circle" : "check-circle", !s.filter)}<span>All themes</span></button>${all("theme").filter(t => !t.draft).map(t => `<button type="button" role="menuitemradio" aria-checked="${s.filter === t.id}" data-pick-theme="${t.id}">${tile("theme", "binoculars")}<span>${esc(t.name)}</span></button>`).join("")}</div>`; }
    if (sh.kind === "confirm") { const d = obj(s, sh.id); label = "Delete dump"; body = `<div class="ph-confirm"><h2>Delete this dump?</h2><p>“${esc(d.name)}” goes to the bin for 30 days, with the ${(d.made || []).length} things made only from it.</p><div class="ob-decide"><button type="button" class="nv-btn secondary" data-sheet-close>Cancel</button><button type="button" class="nv-btn primary" data-delete="${d.id}">Delete dump</button></div></div>`; }
    if (sh.kind === "find") { detent = "large"; label = "Find"; body = `<div class="ph-find-head"><label class="ctl-field">${ic("magnifying-glass")}<input type="search" enterkeyhint="search" autocomplete="off" placeholder="Find anything" aria-label="Find anything" data-q value="${esc(sh.q || "")}"></label><button type="button" data-sheet-close>Cancel</button></div><div class="ph-results" data-results style="padding-bottom:calc(var(--kb) + var(--g))">${findResults(s, sh.q || "")}</div>`; }
    if (sh.kind === "chat") { detent = "large"; cls = "chat"; label = "Dump or ask";
      body = `<div class="mk-thread" data-thread>${thread(s)}</div>`;
      const ready = !!(s.draft || "").trim(), ask = (s.draft || "").includes("?");
      foot = s.rec ? `<div class="mk-comp">${take(s)}</div>` : `<form class="mk-comp" onsubmit="return false"><textarea rows="1" placeholder="Dump anything, or ask" aria-label="Dump or ask" enterkeyhint="send" data-comp>${esc(s.draft || "")}</textarea>${`<button type="button" class="ctl-icon" aria-label="Attach">${ic("paperclip")}</button><button type="button" class="ctl-icon" aria-label="Voice dump" data-rec-start>${ic("microphone")}</button>`}<button type="button" class="ctl-icon primary" aria-label="${ask ? "Ask" : "Dump"}" data-send aria-disabled="${!ready}">${ic(ask ? "question" : "paper-plane-right")}</button></form>`; }
    return `<div class="ph-scrim${sh.enter ? " enter" : ""}" data-sheet-close></div><div class="ph-sheet ${cls}" data-detent="${detent}" role="dialog" aria-modal="true" aria-label="${esc(label)}">
      <button type="button" class="ph-grab" data-grab aria-label="Close"><i></i></button><div class="ph-sheet-body">${body}</div><div class="ph-sheet-foot"${cls === "chat" ? ' style="padding:0"' : ""}>${foot}</div></div>`;
  };
  const KEYS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
  const kbdHTML = s => `<div class="ph-kbd${s.kbdEnter ? " enter" : ""}" aria-hidden="true">${KEYS.map(r => `<div class="row">${[...r].map(k => `<span>${k}</span>`).join("")}</div>`).join("")}<div class="row"><span class="m">123</span><span class="w">space</span><span class="m">${s.sheet?.kind === "find" ? "search" : "return"}</span></div></div>`;
  const statusHTML = s => `<div class="ph-status" aria-hidden="true"><span>9:41</span><span class="r">${ic("cell-signal-full", true)}${ic("wifi-high", true)}${ic("battery-full", true)}</span></div><div class="ph-home" aria-hidden="true"></div>`;

  /* ═══ Tablet (744): the icon rail, the list, the full view; views with their pane as a sheet from the right ═══ */
  const tabletHTML = s => {
    const t = s.ttype, view = s.tview, main = view !== "sections" ? viewHTML(s, view) : t === "briefing" ? briefHTML(s) : s.tsel ? fullHTML(s, s.tsel) : "";
    const tp = s.tpeek ? `<div class="ph-tpeek" style="top:${s.tpeek.y}px">${peek(obj(s, s.tpeek.id))}</div>` : "";
    return `<div class="ph-tb${view !== "sections" || t === "briefing" ? " view" : ""}">
      <nav class="ph-rail" aria-label="Types">${ib("magnifying-glass", "Find", "data-find")}
        ${["briefing", ...TYPES].map(k => `<button type="button" class="ph-ib" data-ttype="${k}" aria-label="${NAME[k]}"${view === "sections" && t === k ? ' aria-current="page"' : ""}>${k === "briefing" ? tile("briefing", "newspaper") : `<span class="g" data-type="${k}">${ic(ICON[k], view === "sections" && t === k)}</span>`}</button>`).join("")}
        <span class="sp"></span><div class="ph-switch" role="group" aria-label="Views">${["sections", "columns", "atlas", "timeline"].map(v => `<button type="button" class="ph-ib" data-tview="${v}" aria-label="${v === "sections" ? "Default view" : NAME[v]}"${view === v ? ' aria-current="page"' : ""}>${ic(VICON[v], view === v)}</button>`).join("")}</div></nav>
      ${view === "sections" && t !== "briefing" ? `<div class="ph-col-list"><h2 class="ph-title">${NAME[t]}</h2>${listHTML(s, t, s.tsel)}</div>` : ""}
      <main class="ph-main" style="${view === "atlas" ? "overflow:hidden" : ""}">${view !== "sections" ? `<div style="position:relative;height:100%">${main}</div>` : main}${tp}</main></div>`;
  };

  /* ═══ State and render ═══ */
  const rootOf = t => t === "briefing" ? { v: "brief" } : t === "more" ? { v: "more" } : { v: "list", type: t };
  const stack = s => s.stacks[s.tab] ||= [rootOf(s.tab)];
  const frameOf = s => s.cfg.frame !== false;
  const W = s => s.cfg.device === "tablet" ? 744 : 390;

  const render = host => {
    const s = host._s, ph = host.querySelector(".pw");
    // Keep scroll positions across renders
    if (ph) {
      const top = ph.querySelector(".ph-screen.top .ph-scroll"); if (top && s._top) s._top.sy = top.scrollTop;
      const sb = ph.querySelector(".ph-sheet-body"); if (sb && s.sheet) s.sheet.sy = sb.scrollTop;
      const mn = ph.querySelector(".ph-main"); if (mn) s.tsy = mn.scrollTop;
      const pg = ph.querySelector("[data-pages]"); if (pg) s.pageX = pg.scrollLeft;
    }
    const st = stack(s), scr = st.at(-1), prev = st.at(-2);
    const tablet = s.cfg.device === "tablet";
    host.innerHTML = `<div class="pw ctl ob-win" data-device="${s.cfg.device}" data-scale="${s.cfg.scale}" data-fresh="weight"${frameOf(s) ? " data-frame" : ""} style="${s.kbd ? "--kb:300px;" : ""}">
      ${tablet ? tabletHTML(s) : `<div class="ph-stack">${prev ? screenHTML(s, prev, st.at(-3), "under") : ""}${screenHTML(s, scr, prev, "top")}</div>${tabsHTML(s)}`}
      ${pillHTML(s)}${toastHTML(s)}${sheetHTML(s)}${s.kbd && frameOf(s) ? kbdHTML(s) : ""}${frameOf(s) ? statusHTML(s) : ""}</div>`;
    const el = host.querySelector(".pw");
    const top = el.querySelector(".ph-screen.top .ph-scroll"); if (top) { top.scrollTop = scr.sy || 0; barShade(top); }
    const sb = el.querySelector(".ph-sheet-body"); if (sb && s.sheet?.sy) sb.scrollTop = s.sheet.sy;
    const mn = el.querySelector(".ph-main"); if (mn && s.tsy) mn.scrollTop = s.tsy;
    const pg = el.querySelector("[data-pages]"); if (pg && s.pageX) pg.scrollLeft = s.pageX;
    const th = el.querySelector("[data-thread]"); if (th && s.sheet?.kind === "chat" && s.sheet.toEnd) { sb.scrollTop = sb.scrollHeight; }
    s._top = scr;
    if (s.toast) s.toast.enter = false;
    if (s.sheet?.enter) { const sh = el.querySelector(".ph-sheet"); s.sheet.enter = false; sheetIn(sh, s.sheet.side); }
    if (s.kbdEnter) s.kbdEnter = false;
    fit(host);
    A.markFades(el);
  };
  const barShade = sc => sc.previousElementSibling?.classList.toggle("scrolled", sc.scrollTop > 4);
  const fit = host => { const el = host.querySelector(".pw"); if (!el || !frameOf(host._s)) return; const avail = host.clientWidth; if (!avail) return; el.style.zoom = String(Math.min(1, (avail - 18) / W(host._s))); };
  const k = el => { const ph = el.closest(".pw"); return ph ? ph.getBoundingClientRect().width / ph.offsetWidth || 1 : 1; };

  /* ── Motion: push and pop (07 rule 13; 380 spring in, 260 ease-out back), sheets (380 spring up, 260 ease-out down). Reduced motion cross-fades. ── */
  const sheetIn = (sh, side) => { if (!sh) return; if (reduce.matches) { sh.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 }); return; }
    sh.animate([{ transform: side ? "translateX(100%)" : "translateY(100%)" }, { transform: "none" }], { duration: 380, easing: SPRING }); };
  const sheetOut = (host, then) => {
    const s = host._s, sh = host.querySelector(".ph-sheet"), scrim = host.querySelector(".ph-scrim");
    const done = () => { s.sheet = null; s.kbd = false; then?.(); render(host); };
    if (!sh) return done();
    const cur = getComputedStyle(sh).transform; const side = sh.classList.contains("side");
    const a = reduce.matches ? sh.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 90, fill: "forwards" })
      : sh.animate([{ transform: cur === "none" ? "none" : cur }, { transform: side ? "translateX(100%)" : "translateY(100%)" }], { duration: 260, easing: OUT, fill: "forwards" });
    scrim?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards" });
    a.onfinish = done;
  };
  const push = (host, scr) => {
    const s = host._s; s.tpeek = null; stack(s).push(scr); render(host);
    const top = host.querySelector(".ph-screen.top"), under = host.querySelector(".ph-screen.under");
    if (!top) return;
    if (reduce.matches) { top.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 }); return; }
    top.animate([{ transform: "translateX(100%)" }, { transform: "none" }], { duration: 380, easing: SPRING });
    under?.animate([{ translate: "0 0" }, { translate: "-25% 0" }], { duration: 380, easing: SPRING });
  };
  const pop = (host, from = 0) => {
    const s = host._s, st = stack(s); if (st.length < 2) return;
    const top = host.querySelector(".ph-screen.top"), under = host.querySelector(".ph-screen.under");
    const done = () => { st.pop(); render(host); };
    if (reduce.matches || !top) { top?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 90 }).finished.then(done); if (!top) done(); return; }
    const w = top.offsetWidth;
    top.style.translate = ""; if (under) under.style.translate = "";
    const a = top.animate([{ transform: `translateX(${from}px)` }, { transform: `translateX(${w}px)` }], { duration: 260, easing: OUT, fill: "forwards" });
    under?.animate([{ translate: `${-25 + (from / w) * 25}% 0` }, { translate: "0 0" }], { duration: 260, easing: OUT, fill: "forwards" });
    a.onfinish = done;
  };

  /* ── Acts ── */
  const toast = (host, text, undo) => {
    const s = host._s, id = (s._tid = (s._tid || 0) + 1);
    s.toast = { text, undo, enter: true, id }; clearTimeout(s._tt);
    s._tt = setTimeout(() => { if (s.toast?.id === id) { s.toast = null; render(host); } }, 5000);
  };
  const decide = (host, key, yes) => {
    const s = host._s, u = BRIEF.flatMap(([, us]) => us).find(x => x.key === key); if (!u || s.leaving) return;
    if (yes) { s.solid = key; render(host); }
    setTimeout(() => { s.leaving = key; render(host); setTimeout(() => {
      s.solid = s.leaving = null; s.decided.set(key, yes);
      toast(host, SAID[u.kind][yes ? 1 : 0], () => { s.decided.delete(key); });
      render(host);
    }, reduce.matches ? 0 : 260); }, yes && !reduce.matches ? 220 : 0);
  };
  const openFull = (host, id) => {
    const s = host._s; s.seen.add(id);
    if (s.cfg.device === "tablet") { const o = obj(s, id); s.tview = "sections"; s.ttype = o.kind; s.tsel = id; s.tpeek = null; s.tsy = 0; if (s.sheet) return sheetOut(host); return render(host); }
    if (s.sheet) sheetOut(host, () => setTimeout(() => push(host, { v: "full", id }), 0));
    else push(host, { v: "full", id });
  };
  const goTo = (host, id) => {   // from Find: the result's own tab (or More), its root under it
    const s = host._s, o = obj(s, id), t = TABS[s.cfg.tabs].includes(o.kind) ? o.kind : "more";
    s.sheet = null; s.kbd = false; s.seen.add(id);
    if (s.cfg.device === "tablet") return openFull(host, id);
    s.tab = t; s.stacks[t] = t === "more" ? [rootOf("more"), { v: "list", type: o.kind }] : [rootOf(t)];
    push(host, { v: "full", id });
  };
  const peekSheet = (host, id, trigger) => {
    const s = host._s; s.seen.add(id);
    if (s.cfg.device === "tablet" && trigger && !trigger.closest(".ph-canvas, .ph-tl, .ph-pages")) {   // a tethered card on a tablet: below its row
      const main = host.querySelector(".ph-main"), r = trigger.closest(".ob-row, .ob-card, .ob-chip") || trigger;
      const kk = k(main), y = (r.getBoundingClientRect().bottom - main.getBoundingClientRect().top) / kk + main.scrollTop + 4;
      s.tpeek = { id, y }; return render(host);
    }
    if (s.sheet?.kind === "peek") { s.sheet.id = id; s.sheet.sy = 0; return render(host); }   // a preview inside the peek replaces it in place
    s.sheet = { kind: "peek", id, detent: "medium", enter: true, side: s.cfg.device === "tablet" };
    render(host);
  };
  const startRec = host => { const s = host._s; s.rec = { sec: 0 }; clearInterval(s._ri); s._ri = setInterval(() => { if (!s.rec) return clearInterval(s._ri); s.rec.sec++; const t = host.querySelector("[data-time]"); if (t) t.textContent = mmss(s.rec.sec); }, 1000); render(host); };
  const stopRec = host => {
    const s = host._s; clearInterval(s._ri); const len = s.rec.sec; s.rec = null;
    const d = { id: "dnew", kind: "dump", name: "Voice note from the pill", kw: "Voice note", len: mmss(Math.max(4, len)), day: 0, time: "09:41", via: "Pill", made: ["s1", "s3"], text: "Two more labs cut prices this week, and the memory startup is hiring. Feels like both theories got stronger.", processing: true };
    s.newDump = d; s.working = true;
    if (s.sheet?.kind === "chat") { s.thread.push({ who: "me", voice: d.len, time: "09:41" }, { working: true }); s.sheet.toEnd = true; }
    render(host);
    setTimeout(() => {
      d.processing = false; s.working = false;
      if (s.sheet?.kind === "chat") { s.thread.pop(); s.thread.push({ say: "Filed 2 signals from your voice note.", rows: ["s1", "s3"] }); s.sheet.toEnd = true; }
      else toast(host, "Made 2 signals", () => { s.newDump = null; });
      render(host);
    }, 2600);
  };
  const send = host => {
    const s = host._s, text = (s.draft || "").trim(); if (!text) return;
    s.thread.push({ who: "me", text, time: "09:41" }, { working: true }); s.draft = ""; s.sheet.toEnd = true; s.working = true; render(host);
    setTimeout(() => { s.thread.pop(); s.working = false; s.thread.push(text.includes("?") ? { say: "Two of your signals touch this. The closest theory:", rows: ["t1"] } : { say: "Filed it as a signal in Cost of intelligence.", rows: ["s12"] }); if (s.sheet) s.sheet.toEnd = true; render(host); }, 1600);
  };

  /* ── Gestures: long-press (rule 14), sheet drags, edge swipe back, Atlas pan and pinch, toast swipe ── */
  const bind = host => {
    const s = host._s;
    let lp = null, drag = null, suppress = false;
    const P = new Map();
    host.addEventListener("pointerdown", e => {
      const ph = host.querySelector(".pw"); if (!ph || !ph.contains(e.target)) return;
      const kk = k(ph), x = e.clientX, y = e.clientY;
      // Long-press on a preview opens its menu sheet: its date (hover-only on a desktop) and its actions
      const pv = e.target.closest(".ob-row, .ob-card");
      if (pv && !e.target.closest(".ph-menu, .ph-sheet .ph-results, .ph-tl-item") && pv.dataset.id) {
        clearTimeout(lp?.t);
        lp = { x, y, t: setTimeout(() => { lp = null; suppress = true; navigator.vibrate?.(8); longPress(host, pv); }, 500) };
      }
      // Sheet: drag the handle or the head down to dismiss, up to the large detent
      const sh = e.target.closest(".ph-sheet");
      if (sh && (e.target.closest("[data-grab]") || (e.target.closest(".ob-peek > .ob-hang, .ph-menu > .ob-row, .ph-confirm h2") && !e.target.closest("button")))) {
        drag = { kind: "sheet", el: sh, y0: y, t0: performance.now(), dy: 0, side: sh.classList.contains("side"), x0: x }; sh.setPointerCapture?.(e.pointerId); return;
      }
      // Toast: swipe down to dismiss
      const tt = e.target.closest(".ph-toast");
      if (tt && !e.target.closest("button")) { drag = { kind: "toast", el: tt, y0: y, dy: 0 }; return; }
      // Edge swipe back: from the left 24 of a pushed screen
      const top = e.target.closest(".ph-screen.top");
      if (top && stack(s).length > 1 && !s.sheet && (x - top.getBoundingClientRect().left) / kk < 24) { drag = { kind: "edge", el: top, under: ph.querySelector(".ph-screen.under"), x0: x, t0: performance.now(), dx: 0 }; return; }
      // Atlas: one finger pans, two pinch
      const cv = e.target.closest("[data-atlas]");
      if (cv) { P.set(e.pointerId, { x, y }); cv.setPointerCapture?.(e.pointerId); drag = { kind: "atlas", el: cv, moved: 0, start: { ...s.atlas }, pts: new Map(P), target: e.target }; }
    });
    host.addEventListener("pointermove", e => {
      if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 8) { clearTimeout(lp.t); lp = null; }
      if (!drag) return;
      const kk = k(drag.el);
      if (drag.kind === "sheet") { drag.dy = drag.side ? (e.clientX - drag.x0) / kk : (e.clientY - drag.y0) / kk; const d = Math.max(drag.dy, drag.dy * 0.2);
        drag.el.style.transform = drag.side ? `translateX(${Math.max(0, d)}px)` : `translateY(${d}px)`; }
      if (drag.kind === "toast") { drag.dy = Math.max(0, (e.clientY - drag.y0) / kk); drag.el.style.transform = `translateY(${drag.dy}px)`; drag.el.style.opacity = String(1 - drag.dy / 60); }
      if (drag.kind === "edge") { drag.dx = Math.max(0, (e.clientX - drag.x0) / kk); drag.el.style.translate = `${drag.dx}px 0`; if (drag.under) drag.under.style.translate = `${-25 + (drag.dx / drag.el.offsetWidth) * 25}% 0`; }
      if (drag.kind === "atlas" && P.has(e.pointerId)) {
        P.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const pts = [...P.values()], st = [...drag.pts.values()], a = s.atlas, w = drag.el.querySelector(".ph-world");
        if (pts.length >= 2 && st.length >= 2) {
          const d0 = Math.hypot(st[0].x - st[1].x, st[0].y - st[1].y), d1 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          const r = drag.el.getBoundingClientRect(), cx = ((st[0].x + st[1].x) / 2 - r.left) / kk, cy = ((st[0].y + st[1].y) / 2 - r.top) / kk;
          const nk = Math.min(2.4, Math.max(0.35, drag.start.k * d1 / d0));
          a.k = nk; a.x = cx - (cx - drag.start.x) * nk / drag.start.k; a.y = cy - (cy - drag.start.y) * nk / drag.start.k; drag.moved = 99;
        } else { const p0 = st[0]; const dx = (e.clientX - p0.x) / kk, dy = (e.clientY - p0.y) / kk; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy)); a.x = drag.start.x + dx; a.y = drag.start.y + dy; }
        w.style.transform = `translate(${a.x}px,${a.y}px) scale(${a.k})`; w.style.setProperty("--k", a.k);
      }
    });
    const end = e => {
      if (lp) { clearTimeout(lp.t); lp = null; }
      if (!drag) return;
      const d = drag;
      if (d.kind === "atlas") { P.delete(e.pointerId); if (P.size) { drag = { ...d, start: { ...s.atlas }, pts: new Map(P) }; return; } drag = null; if (d.moved > 6) suppress = true; return; }
      drag = null;
      if (d.kind === "sheet") {
        const v = d.dy / Math.max(1, performance.now() - d.t0), h = d.el.offsetHeight;
        if (d.dy > h * 0.25 || v > 0.6) return sheetOut(host);
        if (d.dy < -40 && s.sheet && s.sheet.detent !== "large") { s.sheet.detent = "large"; return render(host); }
        if (Math.abs(d.dy) > 3) suppress = true;
        d.el.animate([{ transform: d.el.style.transform }, { transform: "none" }], { duration: 260, easing: SPRING }); d.el.style.transform = "";
      }
      if (d.kind === "toast") { if (d.dy > 24) { s.toast = null; render(host); } else { d.el.style.transform = ""; d.el.style.opacity = ""; } }
      if (d.kind === "edge") {
        const v = d.dx / Math.max(1, performance.now() - d.t0);
        if (d.dx > d.el.offsetWidth * 0.35 || v > 0.5) { pop(host, d.dx); }
        else { d.el.animate([{ translate: `${d.dx}px 0` }, { translate: "0 0" }], { duration: 260, easing: SPRING }); d.el.style.translate = ""; if (d.under) d.under.style.translate = ""; }
        if (d.dx > 3) suppress = true;
      }
    };
    host.addEventListener("pointerup", end); host.addEventListener("pointercancel", end);
    host.addEventListener("contextmenu", e => { if (e.target.closest(".pw .ob-row, .pw .ob-card")) e.preventDefault(); });
    host.addEventListener("scroll", e => { if (e.target.classList?.contains("ph-scroll")) barShade(e.target); if (e.target.matches?.("[data-pages]")) { const p = Math.round(e.target.scrollLeft / (e.target.firstElementChild.offsetWidth + 8)); if (p !== s.page) { s.page = p; host.querySelectorAll(".ph-dots i").forEach((x, i) => x.toggleAttribute("data-on", i === p)); } } }, true);

    host.addEventListener("click", e => {
      if (suppress) { suppress = false; e.preventDefault(); e.stopPropagation(); return; }
      const t = e.target, b = t.closest("button, [data-sheet-close]"); if (!b || !host.contains(b)) return;
      const d = b.dataset;
      if ("tab" in d) { const same = s.tab === d.tab; s.sheet = null; s.kbd = false; s.tab = d.tab; if (same) { const st = stack(s); if (st.length > 1) { st.splice(1); } st[0].sy = 0; } return render(host); }
      if ("back" in d) return pop(host);
      if ("sheetClose" in d || "grab" in d) return sheetOut(host);
      if ("undo" in d) { const u = s.toast?.undo; s.toast = null; u?.(); return render(host); }
      if ("decide" in d) { const un = b.closest("[data-unit]"); if (un) return decide(host, un.dataset.unit, d.decide === "yes"); if (b.closest(".ph-bar")) { toast(host, d.decide === "yes" ? "Kept" : "Draft discarded", () => {}); return pop(host); } }
      if ("full" in d) return openFull(host, d.full);
      if ("sel" in d) { if (b.closest(".ph-results")) return goTo(host, d.sel); if (s.cfg.device === "tablet") { s.tsel = d.sel; s.tpeek = null; s.tsy = 0; s.seen.add(d.sel); return render(host); } s.seen.add(d.sel); return push(host, { v: "full", id: d.sel }); }
      if ("open" in d) return peekSheet(host, d.open, b);
      if ("more" in d) return push(host, { v: "list", type: d.more });
      if ("view" in d) return push(host, { v: "view", view: d.view });
      if ("find" in d) { s.sheet = { kind: "find", q: "", enter: true }; s.kbd = true; s.kbdEnter = true; render(host); return host.querySelector("[data-q]")?.focus({ preventScroll: true }); }
      if ("filter" in d) { s.sheet = { kind: "filter", enter: true }; return render(host); }
      if ("pickTheme" in d) { s.filter = d.pickTheme || null; return sheetOut(host); }
      if ("menu" in d) { s.sheet = { kind: "menu", id: d.menu, verbs: true, enter: true }; return render(host); }
      if ("verb" in d) return verb(host, d.verb);
      if ("delete" in d) { s.sheet = null; render(host); return pop(host); }
      if ("chatOpen" in d) { s.sheet = { kind: "chat", enter: true, toEnd: true }; return render(host); }
      if ("recStart" in d) return startRec(host);
      if ("recStop" in d) return stopRec(host);
      if ("recNo" in d) { clearInterval(s._ri); const was = s.rec; s.rec = null; toast(host, "Take discarded", () => { s.rec = was; startRec(host); s.rec.sec = was.sec; }); return render(host); }
      if ("send" in d) return send(host);
      if ("zoom" in d) { const a = s.atlas, cv = host.querySelector("[data-atlas]"); if (d.zoom === "fit") Object.assign(a, { x: -120, y: -90, k: 0.62 }); else { const nk = Math.min(2.4, Math.max(0.35, a.k * +d.zoom)), cx = cv.offsetWidth / 2, cy = cv.offsetHeight / 2; a.x = cx - (cx - a.x) * nk / a.k; a.y = cy - (cy - a.y) * nk / a.k; a.k = nk; } return render(host); }
      if ("ttype" in d) { s.tview = "sections"; s.ttype = d.ttype; s.tsel = d.ttype === "briefing" ? null : (groupsOf(s, d.ttype).flatMap(([, xs]) => xs)[0]?.id); s.tpeek = null; s.tsy = 0; return render(host); }
      if ("tview" in d) { s.tview = d.tview; s.tpeek = null; return render(host); }
    });
    // A tap outside an open tablet peek closes it
    host.addEventListener("click", e => { if (s.tpeek && !e.target.closest(".ph-tpeek, [data-open]")) { s.tpeek = null; render(host); } }, true);
    host.addEventListener("input", e => {
      if (e.target.matches("[data-q]")) { s.sheet.q = e.target.value; host.querySelector("[data-results]").innerHTML = findResults(s, e.target.value); }
      if (e.target.matches("[data-comp]")) { s.draft = e.target.value; const sb = host.querySelector("[data-send]"); const ask = s.draft.includes("?"); sb.setAttribute("aria-disabled", String(!s.draft.trim())); sb.setAttribute("aria-label", ask ? "Ask" : "Dump"); sb.innerHTML = ic(ask ? "question" : "paper-plane-right"); }
    });
    host.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && e.target.matches("[data-comp]")) { e.preventDefault(); send(host); } if (e.key === "Escape" && s.sheet) sheetOut(host); });
    // The keyboard: drawn on a stage frame while the composer or Find has the caret
    host.addEventListener("focusin", e => { if (e.target.matches("[data-comp], [data-q]") && !s.kbd) { s.kbd = true; s.kbdEnter = true; if (frameOf(s)) { const v = e.target.value, pos = e.target.selectionStart; render(host); const f = host.querySelector(e.target.matches("[data-comp]") ? "[data-comp]" : "[data-q]"); f?.focus({ preventScroll: true }); f?.setSelectionRange?.(pos, pos); } } });
    host.addEventListener("focusout", e => { if (e.target.matches("[data-comp]") && s.kbd && !s.sheet?.kind?.match(/find/)) setTimeout(() => { if (!host.querySelector("[data-comp]:focus")) { s.kbd = false; render(host); } }, 120); });
  };
  const longPress = (host, pv) => {
    const s = host._s, id = pv.dataset.id, rm = pv.querySelector(".rm button");
    s.sheet = { kind: "menu", id, rel: rm ? rm.getAttribute("aria-label").split(":")[0] : null, enter: true }; render(host);
  };
  const verb = (host, v) => {
    const s = host._s, id = s.sheet?.id, o = obj(s, id);
    if (v === "open") return openFull(host, id);
    if (v === "peek") { s.sheet = { kind: "peek", id, detent: "medium", enter: true }; return render(host); }
    if (v === "delete") { s.sheet = { kind: "confirm", id, enter: true }; return render(host); }
    sheetOut(host, () => {
      const said = { retire: `Retired “${short(o.name, 24)}”`, unlink: "Removed", merge: "Merge: pick the signal to merge with", discard: "Signal discarded" }[v];
      toast(host, said, v === "merge" ? null : () => {});
      if (v === "retire" || v === "discard") setTimeout(() => pop(host), 0);
    });
  };

  /* ═══ Mount ═══ */
  const mount = (host, cfg = {}) => {
    const c = { device: "phone", tabs: "B", scale: "desk", views: "none", frame: true, ...cfg };
    const fresh = { cfg: c, tab: "briefing", stacks: {}, sheet: null, toast: null, rec: null, working: false, decided: new Map(), seen: new Set(), filter: null, newDump: null,
      ttype: "theory", tsel: "t1", tview: "sections", tpeek: null, atlas: null,
      thread: [{ day: 1 }, { who: "me", voice: "2:14", time: "18:20" }, { say: "Filed 4 signals from your voice note, most in Code review after agents.", rows: ["s16", "s7"] }, { day: 0 }, { who: "me", text: "x.com/… x.com/… Prices keep falling at the small end. Maybe local models eat it entirely?", time: "09:12" }, { say: "Filed 3 signals and drafted a theory from it.", rows: ["s1", "t11"] }] };
    // Keep the state object's identity, so the bound gestures see a reset
    const s = host._s || (host._s = {}); clearInterval(s._ri); clearTimeout(s._tt); Object.keys(s).forEach(key => delete s[key]); Object.assign(s, fresh);
    const st = c.start || {};
    if (st.tab) s.tab = st.tab;
    if (st.push) s.stacks[s.tab] = [rootOf(s.tab), ...st.push];
    if (st.tview) s.tview = st.tview;
    if (st.ttype) { s.ttype = st.ttype; s.tsel = st.tsel ?? null; }
    if (!host._bound) { bind(host); host._bound = true; new ResizeObserver(() => fit(host)).observe(host); }
    render(host);
    if (st.sheet) { s.sheet = { ...st.sheet }; render(host); }
    host.ph = {
      get state() { return s; }, render: () => render(host),
      set(patch) { Object.assign(s.cfg, patch); if (!TABS[s.cfg.tabs].includes(s.tab)) s.tab = "briefing"; s.stacks = Object.fromEntries(Object.entries(s.stacks).filter(([t]) => TABS[s.cfg.tabs].includes(t))); render(host); },
      reset() { mount(host, cfg); },
      el: sel => host.querySelector(sel),
      sheetTo(det) { if (s.sheet) { s.sheet.detent = det; render(host); } },
    };
    return host.ph;
  };
  const init = () => document.querySelectorAll("[data-phone]").forEach(h => { if (!h._s) mount(h, JSON.parse(h.dataset.phone || "{}")); });
  window.AberPhone = { mount, init, TABS, NAME };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
