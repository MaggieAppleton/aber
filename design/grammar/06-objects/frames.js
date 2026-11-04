// Grammar 06: the objects in context. The type-first default view (rail → list → item fills main, Briefing home; frame and rail from nav/)
// and Columns (strips, Themes, Theories, docked pane), both built from objects.js. Preview → peek (hover 500ms or click) → Open → full → Back.
// Usage: <div class="ob-host" data-ob='{"frame":"app","type":"theory","opt":{"rows":"two","peek":"rel","full":"prose"},"peekOn":"s1"}'></div>
(() => {
  const A = window.AberObjects, { O, all, tile, row, card, peek, full, digest } = A;
  const ICON = A.ICON;
  const NAMES = { theme: ["Themes", "theme"], theory: ["Theories", "theory"], prototype: ["Prototypes", "prototype"], signal: ["Signals", "signal"], dump: ["Dumps", "dump"] };
  const RAIL = ["theme", "theory", "prototype", "signal", "dump"];
  const TOTAL = { signal: 412, dump: 286 };
  const OLDER = { signal: [["October", 288], ["September", 109]], dump: [["October", 201], ["September", 78]] };
  const STATUS = [["building", "Building"], ["idea", "Idea"], ["built", "Built"], ["shelved", "Shelved"]];
  const OPT = { fresh: "none", peek: "rel", full: "prose", align: document.body.dataset.align || "c", challenge: document.body.dataset.challenge || "c" };
  const ib = (icon, label, attr = "", key = "") => `<button type="button" class="nv-ib" aria-label="${label}" data-tip="${label}"${key ? ` data-key="${key}"` : ""} ${attr}><i class="ph ph-${icon}" aria-hidden="true"></i></button>`;
  const dot = (kind, label) => `<span class="nv-dot ${kind}" role="img" aria-label="${label}"></span>`;

  /* ── Rail and view switcher (nav, decided) ── */
  const VIEWS = [["default", "rows", "Default", "⌘1"], ["columns", "columns", "Columns", "⌘2"], ["atlas", "map-trifold", "Atlas", "⌘3"], ["timeline", "chart-scatter", "Timeline", "⌘4"]];
  const switcher = cur => `<div class="nv-switch" role="group" aria-label="Views">${VIEWS.map(([v, i, l, k]) =>
    `<button type="button" data-view="${v}" aria-pressed="${v === cur}" aria-label="${l}" data-tip="${l}" data-key="${k}"${v === "atlas" || v === "timeline" ? ' aria-disabled="true"' : ""}><i class="ph${v === cur ? "-fill" : ""} ph-${i}" aria-hidden="true"></i></button>`).join("")}</div>`;
  const countOf = t => TOTAL[t] ?? all(t).filter(o => !o.retired).length;
  const rail = s => `<aside class="nv-rail">
      <div class="nv-brand"><span>Aber</span>${ib("magnifying-glass", "Find", "", "⌘K")}</div>
      <nav class="nv-types" aria-label="Types">
        <button type="button" class="nv-type ob-brief" data-home aria-current="${s.type === "home"}"><span class="gw">${tile("briefing", ICON.briefing)}</span><span class="nm">Briefing</span></button>${RAIL.map(t => `<button type="button" class="nv-type" data-go="${t}" aria-current="${s.type === t}"><span class="gw">${tile(t, ICON[t])}</span><span class="nm">${NAMES[t][0]}</span><span class="nv-n">${countOf(t)}</span></button>`).join("")}</nav>
      ${switcher("default")}</aside>`;

  /* ── Item list (second sidebar): the new rows. A row never repeats its group header. ── */
  const list = s => {
    const t = s.type, cur = s.sel[t], q = s.q.toLowerCase(), one = false;
    const hit = o => (!q || o.name.toLowerCase().includes(q)) && (!s.tf || (o.themes || []).includes(s.tf));
    const r = (o, omit = "") => row(o, { act: "sel", cur, omit, cls: one ? "one" : "" });
    const group = (label, rows, n) => rows.length ? `<div class="ob-group">${label ? `<div class="ob-glabel"><span>${label}</span>${n != null ? `<span class="ob-n">${n}</span>` : ""}</div>` : ""}${rows.join("")}</div>` : "";
    const fold = (key, label, n, rows) => `<div class="ob-group"><button type="button" class="ob-glabel fold" data-toggle="${key}" aria-expanded="${!!s.open[key]}"><i class="ph ph-caret-down${s.open[key] ? "" : " shut"}" aria-hidden="true"></i><span>${label}</span><span class="ob-n">${n}</span></button>${s.open[key] ? rows.join("") : ""}</div>`;
    const search = ph => `<label class="nv-search"><i class="ph ph-magnifying-glass" aria-hidden="true"></i><input data-q type="search" placeholder="${ph}" value="${s.q}" aria-label="${ph}"></label>`;
    const filter = () => `<label class="nv-filter"><i class="ph ph-funnel" aria-hidden="true"></i><select data-tf aria-label="Filter by theme"><option value="">All themes</option>${all("theme").filter(o => !o.draft).map(o => `<option value="${o.id}"${s.tf === o.id ? " selected" : ""}>${o.name}</option>`).join("")}</select></label>`;
    let tools = "", body = "", addBtn = true;
    if (t === "theme") {
      body = group("", all("theme").filter(o => !o.draft).sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0)).map(o => r(o))) + group("Drafts", all("theme").filter(o => o.draft).map(o => r(o, "key")));
    } else if (t === "theory") {
      tools = search("Find a theory") + filter();
      const ts = all("theory").filter(hit);
      body = group("Held", ts.filter(o => !o.draft && !o.retired).map(o => r(o))) + group("Drafts", ts.filter(o => o.draft).map(o => r(o, "key")))
        + (ts.some(o => o.retired) ? fold("retired", "Retired", ts.filter(o => o.retired).length, ts.filter(o => o.retired).map(o => r(o))) : "");
    } else if (t === "prototype") {
      body = STATUS.map(([k, label]) => group(label, all("prototype").filter(o => o.status === k && !o.draft).map(o => r(o, "key")))).join("") + group("Drafts", all("prototype").filter(o => o.draft).map(o => r(o, "key")));
    } else if (t === "signal") {
      addBtn = false; tools = search("Find a signal") + filter();
      const sigs = all("signal").filter(hit);
      body = A.DAYS.map((d, i) => group(d, sigs.filter(o => o.day === i).map(o => r(o, "when")))).join("") + OLDER.signal.map(([m, n]) => fold(m, m, n, [])).join("");
    } else if (t === "dump") {
      addBtn = false; tools = search("Find a dump");
      body = A.DAYS.map((d, i) => group(d, all("dump").filter(o => o.day === i && hit(o)).map(o => r(o, "when")))).join("") + OLDER.dump.map(([m, n]) => fold(m, m, n, [])).join("");
    }
    if (!body.replace(/<[^>]+>/g, "").trim()) body = `<p class="ob-empty">Nothing matches</p>`;
    return `<section class="nv-list ob-list" aria-label="${NAMES[t][0]}">
        <div class="nv-lhead"><span class="h">${NAMES[t][0]}</span><span class="nv-meta">${countOf(t)}</span>${addBtn ? ib("plus", `New ${NAMES[t][1]}`) : ""}</div>
        ${tools ? `<div class="nv-tools">${tools}</div>` : ""}
        <div class="nv-scroll ob-scroll">${body}</div></section>`;
  };

  /* ── Frames ── */
  const backBtn = s => s.back.length ? `<button type="button" class="nv-back" data-back><i class="ph ph-arrow-left" aria-hidden="true"></i><span>${(([t, id]) => t === "home" || !id ? "Since yesterday" : O[id].name)(s.back.at(-1))}</span></button>` : "";
  const appFrame = s => {
    const home = s.type === "home", o = !home && s.sel[s.type] && O[s.sel[s.type]];
    const cols = home ? "var(--nv-rail-w) minmax(0, 1fr)" : "var(--nv-rail-w) var(--list-w) minmax(0, 1fr)";
    const main = o ? full(o, { layout: s.opt.full, back: backBtn(s) }) : digest();
    return `<div class="nv ctl ob-win" data-v="A" data-fresh="${s.opt.fresh}" data-align="${s.opt.align}" data-challenge="${s.opt.challenge}" style="grid-template-columns:${cols}">${rail(s)}${home ? "" : list(s)}<main class="nv-main"><div class="nv-scroller">${main}</div></main></div>`;
  };
  // Columns, as it stays: dump and signal strips, Themes (navigation), Theories (cards), the docked pane. Its objects are the new previews.
  const colFrame = s => {
    const th = O[s.colTheme], ts = A.all("theory").filter(t => t.themes.includes(th.id) && !t.retired);
    const pane = s.pane && O[s.pane];
    return `<div class="nv ctl ob-win ob-columns" data-fresh="${s.opt.fresh}" data-align="${s.opt.align}" data-challenge="${s.opt.challenge}" style="grid-template-columns:36px 36px var(--colnav-w, 230px) var(--list-w) minmax(0, 1fr)">
      <div class="ob-strip">${tile("dump", ICON.dump)}</div><div class="ob-strip">${tile("signal", ICON.signal)}</div>
      <section class="ob-colnav"><div class="ob-colhead">${tile("theme", ICON.theme)}<span>Themes</span></div>
        <div class="ob-rows">${A.all("theme").filter(o => !o.draft).map(o => row(o, { act: "sel", cur: s.colTheme })).join("")}</div></section>
      <section class="ob-colist"><div class="ob-colhead">${tile("theory", ICON.theory)}<span>Theories</span><span class="ob-n">${ts.length}</span></div>
        <div class="ob-cards col">${ts.map(t => card(t, { act: "pane", cur: s.pane })).join("")}</div></section>
      <aside class="ob-pane">${pane ? full(pane, { layout: s.opt.full, where: "pane" }) : ""}</aside>
      ${switcher("columns")}</div>`;
  };

  /* ── Tooltips: name, then key; after 500ms ── */
  const local = (base, el) => { const br = base.getBoundingClientRect(), k = br.width / base.offsetWidth || 1, r = el.getBoundingClientRect();
    return { x: (r.left - br.left) / k, y: (r.top - br.top) / k, w: r.width / k, h: r.height / k }; };
  let tipT;
  document.addEventListener("pointerover", e => { const b = e.target.closest(".ob-win [data-tip]"); if (!b) return; clearTimeout(tipT); tipT = setTimeout(() => {
    const w = b.closest(".ob-win"); w.querySelector(".nv-tip")?.remove();
    const t = document.createElement("div"); t.className = "nv-tip"; t.setAttribute("role", "tooltip"); t.innerHTML = `<span>${b.dataset.tip}</span>${b.dataset.key ? `<kbd>${b.dataset.key}</kbd>` : ""}`; w.append(t);
    const r = local(w, b); let top = r.y + r.h + 4; if (b.closest(".nv-switch")) top = r.y - t.offsetHeight - 4;
    Object.assign(t.style, { left: `${Math.max(4, Math.min(w.offsetWidth - t.offsetWidth - 4, r.x + r.w / 2 - t.offsetWidth / 2))}px`, top: `${top}px` }); }, 500); });
  document.addEventListener("pointerout", e => { const b = e.target.closest(".ob-win [data-tip]"); if (!b) return; clearTimeout(tipT); b.closest(".ob-win")?.querySelector(".nv-tip")?.remove(); });

  /* ── Peek: tethered to the row, card or chip it came from ── */
  const closePeek = host => { host.querySelectorAll(".ob-peek.live").forEach(p => p.remove()); host.querySelectorAll("[aria-expanded='true'][data-peeking]").forEach(a => { a.removeAttribute("aria-expanded"); a.removeAttribute("data-peeking"); }); host._s.peek = null; };
  const showPeek = (host, id, trigger, pinned) => {
    const s = host._s, scroller = trigger.closest(".nv-scroller, .ob-pane, .ob-scroll, .ob-colist, .ob-colnav") || host.querySelector(".nv-scroller");
    const anchor = trigger.closest(".ob-row, .ob-card") || trigger;
    closePeek(host); s.peek = { id, pinned };
    const exp = anchor.matches(".ob-row, .ob-card") ? anchor : trigger; exp.setAttribute("aria-expanded", "true"); exp.setAttribute("data-peeking", "");
    const at = local(scroller, anchor);
    scroller.insertAdjacentHTML("beforeend", peek(O[id], { rel: s.opt.peek === "rel", cls: "live" }));
    const el = scroller.lastElementChild, W = scroller.clientWidth, top = at.y + scroller.scrollTop;
    A.markFades(el);
    const left = Math.max(8, Math.min(W - el.offsetWidth - 8, at.x - (anchor.matches(".ob-row") ? 16 - 8 : anchor.matches(".ob-card") ? 16 - 10 : 0)));   // the peek's tile lands on the row's tile
    let y = top + at.h + 4;
    if (y + el.offsetHeight > scroller.scrollTop + scroller.clientHeight - 8 && top - el.offsetHeight - 4 > scroller.scrollTop + 8) { y = top - el.offsetHeight - 4; el.classList.add("up"); }
    Object.assign(el.style, { left: `${left}px`, top: `${y}px`, transformOrigin: `${Math.max(12, at.x - left + 12)}px ${el.classList.contains("up") ? "100%" : "0"}` });
  };

  /* ── Render and navigate ── */
  const fit = host => { const el = host.firstElementChild; if (el && host.clientWidth) el.style.zoom = Math.min(1, host.clientWidth / 1280); };
  const ro = new ResizeObserver(es => es.forEach(e => fit(e.target)));
  const render = host => {
    const s = host._s, scrolls = [...host.querySelectorAll(".ob-scroll")].map(el => el.scrollTop);
    const focused = document.activeElement?.matches?.("[data-q]") && host.contains(document.activeElement);
    s.peek = null; host.innerHTML = s.frame === "columns" ? colFrame(s) : appFrame(s); fit(host);
    if (focused) { const i = host.querySelector("[data-q]"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
    host.querySelectorAll(".ob-scroll").forEach((el, i) => el.scrollTop = scrolls[i] || 0);
  };
  const navigate = (s, o) => { if (s.frame === "columns") { if (o.kind === "theory") { s.colTheme = o.themes[0]; } s.pane = o.id; return; }
    if (s.type === o.kind && s.sel[o.kind] === o.id) return; s.back.push([s.type, s.sel[s.type]]); s.type = o.kind; s.sel[o.kind] = o.id; s.q = ""; s.tf = ""; };

  const init = host => {
    const o = JSON.parse(host.dataset.ob || "{}");
    const s = host._s = { frame: o.frame || "app", type: o.type || "home", q: "", tf: "", back: [], open: {}, peek: null, opt: { ...OPT, ...(o.opt || {}) },
      sel: { theme: "coi", theory: "t1", prototype: "p1", signal: "s1", dump: "d1", ...(o.sel || {}) }, colTheme: o.colTheme || "coi", pane: o.pane ?? "t1" };
    render(host); ro.observe(host);
    if (o.peekOn) document.fonts.ready.then(() => { const a = host.querySelector(`.nv-scroller [data-open="${o.peekOn}"], .ob-pane [data-open="${o.peekOn}"]`); if (a) showPeek(host, o.peekOn, a, true); });

    let hoverT, leaveT;
    const peekable = e => e.target.closest(".nv-scroller [data-open], .ob-pane [data-open], .ob-peek [data-open]");
    host.addEventListener("pointerover", e => {
      if (e.target.closest(".ob-peek")) { clearTimeout(leaveT); if (!peekable(e)) return; }
      const a = peekable(e); if (!a) return;
      clearTimeout(leaveT); clearTimeout(hoverT); if (host._s.peek?.pinned) return;
      hoverT = setTimeout(() => { if (a.isConnected && !host._s.peek?.pinned && !a.closest(".ob-peek")) showPeek(host, a.dataset.open, a, false); }, 500);
    });
    host.addEventListener("pointerout", e => {
      clearTimeout(hoverT); const p = host._s.peek; if (!p || p.pinned) return;
      const to = e.relatedTarget; if (to && (to.closest?.(".ob-peek") || to.closest?.("[data-peeking]"))) return;
      leaveT = setTimeout(() => { if (host._s.peek && !host._s.peek.pinned) closePeek(host); }, 250);
    });
    host.addEventListener("click", e => {
      const s = host._s;
      const vb = e.target.closest(".nv-switch button[data-view]");
      if (vb) { if (vb.getAttribute("aria-disabled") === "true") return; s.frame = vb.dataset.view === "columns" ? "columns" : "app"; render(host); return; }
      const el = e.target.closest("[data-go],[data-sel],[data-open],[data-full],[data-home],[data-back],[data-toggle],[data-close],[data-pane]");
      const inPeek = e.target.closest(".ob-peek");
      if (s.peek && !inPeek && !(el && "open" in el.dataset)) closePeek(host);
      if (!el) return;
      const d = el.dataset;
      if (d.open) { if (s.peek?.id === d.open && s.peek.pinned && !inPeek) { closePeek(host); return; } showPeek(host, d.open, el, true); return; }
      if (d.full) navigate(s, O[d.full]);
      else if (d.go) { s.type = d.go; s.q = ""; s.tf = ""; s.back = []; }
      else if ("home" in d) { s.type = "home"; s.back = []; }
      else if (d.sel) { if (s.frame === "columns") { s.colTheme = d.sel; s.pane = A.all("theory").find(t => t.themes.includes(d.sel) && !t.retired)?.id ?? null; } else { s.sel[s.type] = d.sel; s.back = []; } }
      else if ("back" in d) { const [t, id] = s.back.pop(); s.type = t; if (id) s.sel[t] = id; }
      else if (d.pane) s.pane = d.pane;
      else if ("close" in d) s.pane = null;
      else if (d.toggle) s.open[d.toggle] = !s.open[d.toggle];
      render(host);
      if (d.go || d.sel || d.full || "home" in d || "back" in d) host.querySelectorAll(".nv-scroller, .ob-pane").forEach(x => x.scrollTop = 0);
    });
    host.addEventListener("input", e => { if (e.target.matches("[data-q]")) { host._s.q = e.target.value; render(host); } });
    host.addEventListener("change", e => { if (e.target.matches("[data-tf]")) { host._s.tf = e.target.value; render(host); } });
  };
  document.addEventListener("keydown", e => { if (e.key === "Escape") document.querySelectorAll(".ob-host").forEach(h => h._s?.peek && closePeek(h)); });
  window.AberObjectFrames = { init, set: (host, patch) => { Object.assign(host._s.opt, patch); render(host); } };
  const start = () => document.querySelectorAll(".ob-host[data-ob]").forEach(init);
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", start); else start();
})();
