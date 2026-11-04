// Grammar 07: moving between levels. The type-first default view and Columns, live, built from 06's components (../06-objects/objects.js).
// Preview → peek (500ms rest or click; Space or →) → full (Open, Enter, ⌘↵) → Back (Esc, ⌘[) returns to where you were.
// Columns: select → the docked pane pushes in; Esc or X closes it. Motion lives in rungs-motion.js (window.R7M).
// Host: <div class="r7-host" data-r7='{"view":"default","type":"home","opt":{"open":"morph","pos":"beside","back":"preview"}}'></div>
(() => {
  const A = window.AberObjects, M = window.R7M, { O, all, tile, row, card, peek, full, digest } = A, ICON = A.ICON;
  const NAMES = { theme: ["Themes", "theme"], theory: ["Theories", "theory"], prototype: ["Prototypes", "prototype"], signal: ["Signals", "signal"], dump: ["Dumps", "dump"] };
  const RAIL = ["theme", "theory", "prototype", "signal", "dump"];
  const TOTAL = { signal: 412, dump: 286 };
  const OLDER = { signal: [["October", 288], ["September", 109]], dump: [["October", 201], ["September", 78]] };
  const STATUS = [["building", "Building"], ["idea", "Idea"], ["built", "Built"], ["shelved", "Shelved"]];
  const HOVER = 500, WARM = 150, GRACE = 300;   // rest to peek; rest to swap an open peek (like tooltips after the first); pointer away before it closes
  const PANE_W = 802, W = 1440, H = 820;   // Columns: the pane takes what the columns leave at 1440 (strips 72, Themes 230, Theories 296, Prototypes folded to 40)
  const PEEKABLE = ".nv-scroller [data-open], .ob-pane [data-open], .ob-peek [data-open]";
  let uid = 0;

  /* ═══ Frames (from 06 frames.js, the decided rail and list) ═══════════════════ */
  const ib = (icon, label, attr = "", key = "") => `<button type="button" class="nv-ib" aria-label="${label}" data-tip="${label}"${key ? ` data-key="${key}"` : ""} ${attr}><i class="ph ph-${icon}" aria-hidden="true"></i></button>`;
  const VIEWS = [["default", "rows", "Default", "⌘1"], ["columns", "columns", "Columns", "⌘2"], ["atlas", "map-trifold", "Atlas", "⌘3"], ["timeline", "chart-scatter", "Timeline", "⌘4"]];
  const switcher = cur => `<div class="nv-switch" role="group" aria-label="Views">${VIEWS.map(([v, i, l, k]) =>
    `<button type="button" data-view="${v}" aria-pressed="${v === cur}" aria-label="${l}" data-tip="${l}" data-key="${k}"${v === "atlas" || v === "timeline" ? ' aria-disabled="true"' : ""}><i class="ph${v === cur ? "-fill" : ""} ph-${i}" aria-hidden="true"></i></button>`).join("")}</div>`;
  const countOf = t => TOTAL[t] ?? all(t).filter(o => !o.retired).length;
  const rail = s => `<aside class="nv-rail">
      <div class="nv-brand"><span>Aber</span>${ib("magnifying-glass", "Find", "", "⌘K")}</div>
      <nav class="nv-types" aria-label="Types">
        <button type="button" class="nv-type ob-brief" data-home aria-current="${s.type === "home"}"><span class="gw">${tile("briefing", ICON.briefing)}</span><span class="nm">Briefing</span></button>${RAIL.map(t => `<button type="button" class="nv-type" data-go="${t}" aria-current="${s.type === t}"><span class="gw">${tile(t, ICON[t])}</span><span class="nm">${NAMES[t][0]}</span><span class="nv-n">${countOf(t)}</span></button>`).join("")}</nav>
      ${switcher("default")}</aside>`;
  const list = s => {
    const t = s.type, cur = s.sel[t];
    const r = (o, omit = "") => row(o, { act: "sel", cur, omit });
    const group = (label, rows, n) => rows.length ? `<div class="ob-group">${label ? `<div class="ob-glabel"><span>${label}</span>${n != null ? `<span class="ob-n">${n}</span>` : ""}</div>` : ""}${rows.join("")}</div>` : "";
    const fold = (label, n) => `<div class="ob-group"><button type="button" class="ob-glabel fold" aria-expanded="false"><i class="ph ph-caret-down shut" aria-hidden="true"></i><span>${label}</span><span class="ob-n">${n}</span></button></div>`;
    let body = "", addBtn = true;
    if (t === "theme") body = group("", all("theme").filter(o => !o.draft).sort((a, b) => (b.fresh ? 1 : 0) - (a.fresh ? 1 : 0)).map(o => r(o))) + group("Drafts", all("theme").filter(o => o.draft).map(o => r(o, "key")));
    else if (t === "theory") { const ts = all("theory"); body = group("Held", ts.filter(o => !o.draft && !o.retired).map(o => r(o))) + group("Drafts", ts.filter(o => o.draft).map(o => r(o, "key"))) + fold("Retired", ts.filter(o => o.retired).length); }
    else if (t === "prototype") body = STATUS.map(([k, label]) => group(label, all("prototype").filter(o => o.status === k && !o.draft).map(o => r(o, "key")))).join("") + group("Drafts", all("prototype").filter(o => o.draft).map(o => r(o, "key")));
    else { addBtn = false; body = A.DAYS.map((d, i) => group(d, all(t).filter(o => o.day === i).map(o => r(o, "when")))).join("") + OLDER[t].map(([m, n]) => fold(m, n)).join(""); }
    return `<section class="nv-list ob-list" aria-label="${NAMES[t][0]}">
        <div class="nv-lhead"><span class="h">${NAMES[t][0]}</span><span class="nv-meta">${countOf(t)}</span>${addBtn ? ib("plus", `New ${NAMES[t][1]}`) : ""}</div>
        <div class="nv-scroll ob-scroll">${body}</div></section>`;
  };
  const backLabel = e => e.pane ? O[e.pane].name : e.type === "home" ? "Since yesterday" : O[e.sel].name;
  const backBtn = st => st.length ? `<button type="button" class="nv-back" data-back aria-keyshortcuts="Escape Meta+BracketLeft"><i class="ph ph-arrow-left" aria-hidden="true"></i><span>${backLabel(st.at(-1))}</span></button>` : "";
  const appFrame = s => {
    const home = s.type === "home", o = !home && O[s.sel[s.type]];
    const cols = home ? "var(--nv-rail-w) minmax(0, 1fr)" : "var(--nv-rail-w) var(--list-w) minmax(0, 1fr)";
    return `<div class="nv ob-win" data-v="A" style="grid-template-columns:${cols}">${rail(s)}${home ? "" : list(s)}<main class="nv-main" aria-label="${home ? "Briefing" : o.name}"><div class="nv-scroller">${o ? full(o, { back: backBtn(s.back) }) : digest()}</div></main></div>`;
  };
  const paneHTML = s => s.pane ? `<div class="ob-pane r7-pane" role="region" aria-label="${O[s.pane].name}">${full(O[s.pane], { where: "pane", back: backBtn(s.pback) })}</div>` : "";
  const colFrame = s => {
    const th = O[s.colTheme], ts = all("theory").filter(t => t.themes.includes(th.id) && !t.retired);
    return `<div class="nv ob-win ob-columns r7-cols"${s.pane ? " data-pane-open" : ""}>
      <div class="ob-strip">${tile("dump", ICON.dump)}</div><div class="ob-strip">${tile("signal", ICON.signal)}</div>
      <section class="ob-colnav" aria-label="Themes"><div class="ob-colhead">${tile("theme", ICON.theme)}<span>Themes</span></div>
        <div class="ob-rows">${all("theme").filter(o => !o.draft).map(o => row(o, { act: "sel", cur: s.colTheme })).join("")}</div></section>
      <section class="ob-colist" aria-label="Theories"><div class="ob-colhead">${tile("theory", ICON.theory)}<span>Theories</span><span class="ob-n">${ts.length}</span></div>
        <div class="ob-cards col">${ts.map(t => card(t, { act: "pane", cur: s.pane })).join("")}</div></section>
      <section class="r7-protos" aria-label="Prototypes"><div class="r7-protos-in"><div class="ob-colhead">${tile("prototype", ICON.prototype)}<span>Prototypes</span></div>
        <div class="ob-rows">${all("prototype").filter(p => !p.draft).map(p => row(p, { act: "pane", cur: s.pane })).join("")}</div></div>
        <div class="r7-fold" aria-hidden="true">${tile("prototype", ICON.prototype)}</div></section>
      <div class="r7-pslot" style="width:${s.pane ? PANE_W : 0}px">${paneHTML(s)}</div>
      ${switcher("columns")}</div>`;
  };

  /* ═══ Render ═════════════════════════════════════════════════════════════════ */
  const winOf = host => host.querySelector(".r7-win");
  const listScroll = host => host.querySelector(".ob-list .ob-scroll");
  const mainScroll = host => host.querySelector(".nv-main .nv-scroller");
  const render = host => {
    const s = host._s, w = winOf(host);
    s.peek = null; s.leaving?.remove(); s.leaving = null; s.still = true;   // no hover peek under a pointer that hasn't moved since the view changed
    w.querySelector(".r7-frame").innerHTML = s.view === "columns" ? colFrame(s) : appFrame(s);
    A.markFades(w);
    // Roving tab stops: one in the rail, one in the list (the current item); arrows move between them
    const rove = (sel, cur) => { const items = [...w.querySelectorAll(sel)]; const c = items.find(cur) || items[0]; items.forEach(b => b.tabIndex = b === c ? 0 : -1); };
    rove(".nv-types .nv-type", b => b.getAttribute("aria-current") === "true");
    rove(".ob-list [data-sel]", b => b.closest('[aria-current="true"]'));
    w.querySelectorAll(".ob-title").forEach(h => h.tabIndex = -1);
    M.mark(w, "peek", null); M.tri(w, null);
  };
  const say = (host, text) => { const r = host.querySelector(".r7-sr"); r.textContent = ""; requestAnimationFrame(() => r.textContent = text); };
  const fit = host => { const w = winOf(host); if (w && host.clientWidth) w.style.zoom = Math.min(1, host.clientWidth / W); };

  /* ═══ Peek (tier 4, tethered) ═══════════════════════════════════════════════════ */
  const anchorOf = trig => trig.closest(".ob-row, .ob-card") || trig;
  const tileOfAnchor = a => a.querySelector(":scope > .g") || a;
  const setExpanded = (trig, on, id) => { if (!trig) return; trig.setAttribute("aria-expanded", String(on)); if (on) trig.setAttribute("aria-controls", id); anchorOf(trig).classList.toggle("is-hover", on); };
  const position = (host, el, trig) => {
    const s = host._s, w = winOf(host), sc = el.parentElement, a = anchorOf(trig), tl = tileOfAnchor(a);
    const base = M.local(w, sc), ar = M.local(w, a), tr = M.local(w, tl), st = sc.scrollTop;
    const rel = r => ({ x: r.x - base.x, y: r.y - base.y + st, w: r.w, h: r.h });
    const A_ = rel(ar), T_ = rel(tr), Wd = sc.clientWidth, pw = el.offsetWidth, ph = el.offsetHeight, top0 = st + 8, bot = st + sc.clientHeight - 8;
    const headTile = 12 + (18.2 - 18) / 2;   // the peek's own tile sits 12 below its top edge (06: inset 12 at the top), centred on the name's first line
    // The peek goes where the siblings aren't: rows and cards stack, so beside keeps them visible; chips run in a line, so they always peek below
    let x, y, side = a.matches(".ob-row, .ob-card") ? s.opt.pos : "below";
    if (side === "beside" && A_.x + A_.w + 8 + pw > Wd - 8) side = "below";   // no room beside: fall back to below
    if (side === "beside") { x = A_.x + A_.w + 8; y = Math.max(top0, Math.min(bot - ph, T_.y - headTile)); }
    else {
      x = Math.max(8, Math.min(Wd - pw - 8, T_.x - 16));   // the peek's tile lands on the trigger's tile column (peek inset 16)
      y = A_.y + A_.h + 4; if (y + ph > bot && A_.y - ph - 4 > top0) y = A_.y - ph - 4;
    }
    Object.assign(el.style, { left: `${x}px`, top: `${y}px` });
    el.dataset.side = side;
    return { x: T_.x + T_.w / 2 - x, y: T_.y + T_.h / 2 - y };   // the trigger tile's centre, in the peek's coordinates
  };
  const make = (host, id, sc) => {
    sc.insertAdjacentHTML("beforeend", peek(O[id], { cls: "r7-peek" }));
    const el = sc.lastElementChild; el.id = `${host.id}-peek`; el.setAttribute("aria-modal", "false"); el.tabIndex = -1; A.markFades(el);
    return el;
  };
  const markPeek = host => { const s = host._s, w = winOf(host); if (!s.peek) return M.mark(w, "peek", null);
    const el = s.peek.el, sc = M.local(w, el.parentElement);   // the peek's resting box (its live rect may still be scaled mid-entrance)
    const t = M.local(w, tileOfAnchor(anchorOf(s.peek.trig))), p = { x: sc.x + el.offsetLeft, y: sc.y + el.offsetTop - el.parentElement.scrollTop, w: el.offsetWidth, h: el.offsetHeight };
    M.mark(w, "peek", [{ rect: t }, { origin: M.centre(t) }, { rect: p, below: true, label: `peek (${el.dataset.side}), grows from the ringed tile` }]); };

  // showPeek(host, trig, { pinned, key, id, instant })
  const showPeek = (host, trig, o = {}) => {
    const s = host._s, id = o.id || trig.dataset.open, sc = anchorOf(trig).closest(".nv-scroller, .ob-pane");
    if (!sc || !O[id]) return;
    clearTimeout(s.leaveT); clearTimeout(s.hoverT); s.exit = null; s.safe = false; M.tri(winOf(host), null);
    if (s.peek && s.peek.trig === trig && s.peek.id === id) { if (o.pinned) s.peek.pinned = true; if (o.key) s.peek.key = true; return; }
    s.leaving?.remove(); s.leaving = null;
    const prev = s.peek, el = make(host, id, sc);
    if (prev) { setExpanded(prev.trig, false); }
    const origin = position(host, el, trig);
    if (prev && prev.el.parentElement === sc && !o.instant) { const from = { x: prev.el.offsetLeft, y: prev.el.offsetTop }; prev.el.remove(); M.slideTo(el, from); }   // warm swap: one card slides along
    else { prev?.el.remove(); if (!o.instant) M.growIn(el, origin); }
    s.peek = { id, trig, el, pinned: !!o.pinned, key: !!o.key };
    setExpanded(trig, true, el.id); markPeek(host);
    if (o.key) say(host, `${O[id].name}. Peek. Tab to move into it, Enter to open, Escape to close.`);
  };
  // Chain: a preview inside the peek replaces it in place; the clicked row's tile and name travel to the head
  const chain = (host, rowTrig) => {
    const s = host._s, p = s.peek; if (!p) return;
    const id = rowTrig.dataset.open, a = anchorOf(rowTrig), w = winOf(host);
    const from = { tile: tileOfAnchor(a), text: rowTrig.matches(".nm") ? rowTrig : rowTrig.querySelector(".t") || rowTrig };
    const snapFrom = { tile: M.local(w, from.tile), text: M.local(w, from.text) };
    const el = make(host, id, p.el.parentElement); const x = p.el.offsetLeft, y = p.el.offsetTop;
    Object.assign(el.style, { left: `${x}px`, top: `${y}px` }); el.dataset.side = p.el.dataset.side;
    const sc = el.parentElement, bot = sc.scrollTop + sc.clientHeight - 8; if (y + el.offsetHeight > bot) el.style.top = `${Math.max(sc.scrollTop + 8, bot - el.offsetHeight)}px`;
    const ghostSrc = { tile: from.tile, text: from.text };
    // Keep the old card in place until the ghosts are measured, then swap
    M.travel(w, ghostSrc, { tile: el.querySelector(".ob-hang > .g"), text: el.querySelector(".ob-pk-name") }, { dur: M.t("surface") });
    p.el.remove(); M.fadeKids(el, M.t("hover"), M.t("hover") / 2);
    s.peek = { ...p, id, el, pinned: true }; setExpanded(p.trig, true, el.id);
    M.mark(w, "move", [{ rect: snapFrom.tile, label: "from the row" }, { from: M.centre(snapFrom.tile), to: M.centre(M.local(w, el.querySelector(".ob-hang > .g"))) }]); markPeek(host);
    el.querySelector(".ob-pk-foot [data-full]")?.focus({ preventScroll: true });
  };
  const closePeek = (host, { instant = false, focus = false } = {}) => {
    const s = host._s, p = s.peek; if (!p) return;
    clearTimeout(s.leaveT); clearTimeout(s.hoverT); s.peek = null; s.exit = null; M.tri(winOf(host), null);
    setExpanded(p.trig, false);
    if (instant || !p.el.isConnected) p.el.remove();
    else { s.leaving = p.el; M.shrinkOut(p.el, () => { p.el.remove(); if (s.leaving === p.el) s.leaving = null; }); }
    M.mark(winOf(host), "peek", null);
    if (focus && p.trig.isConnected) p.trig.focus({ preventScroll: true });
  };

  /* ═══ Peek → full, and Back ════════════════════════════════════════════════════ */
  const ref = (host, trig) => { if (!trig || trig.closest(".ob-peek")) return null; const sc = trig.closest(".nv-scroller, .ob-pane");
    const same = [...sc.querySelectorAll(`[data-open="${trig.dataset.open}"]`)].filter(x => !x.closest(".ob-peek")); return { id: trig.dataset.open, i: same.indexOf(trig) }; };
  const resolve = (host, r) => { if (!r) return null; const sc = host.querySelector(".nv-main .nv-scroller, .ob-pane"); if (!sc) return null;
    return [...sc.querySelectorAll(`[data-open="${r.id}"]`)].filter(x => !x.closest(".ob-peek"))[r.i] || null; };
  const textOf = el => el.matches(".nm, .ob-pk-name, .ob-title") ? el : el.querySelector(".t, .nm, .ob-pk-name") || el;
  // Where the object is on screen before the move: the peek head if it is peeking this object, else the preview you pressed Enter on
  const sourceOf = (host, id, trig) => {
    const p = host._s.peek;
    if (p && p.id === id) return { tile: p.el.querySelector(".ob-hang > .g"), text: p.el.querySelector(".ob-pk-name") };
    if (trig) { const a = anchorOf(trig); return { tile: tileOfAnchor(a), text: textOf(trig) }; }
    return {};
  };
  // Snapshots of what is leaving (the old view, the peek). The shared elements are hidden in them: they travel as ghosts instead.
  const snapAll = (w, clip, els, shared) => {
    const morph = w.closest(".r7-host")._s.opt.open === "morph" && !M.reduced(), S = Object.values(shared || {}).filter(Boolean);
    S.forEach(n => n.setAttribute("data-r7src", ""));
    const out = els.filter(Boolean).map((el, i) => M.snapshot(w, el, clip, i === 0));
    if (morph) out.forEach(b => b.querySelectorAll("[data-r7src]").forEach(n => n.style.visibility = "hidden"));
    S.forEach(n => n.removeAttribute("data-r7src")); return out;
  };
  // Stand-ins: positioned copies of the shared elements in the effects layer, so the ghosts can start from them after the frame re-renders
  const STAND = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "color", "display", "webkitLineClamp", "webkitBoxOrient", "overflow", "textWrap", "background", "borderRadius", "width", "height"];
  const standIn = (w, els) => { const out = {}; for (const k of ["tile", "text"]) { const el = els?.[k]; if (!el) continue;
    const r = M.local(w, el), c = el.cloneNode(true), cs = getComputedStyle(el); STAND.forEach(p => c.style[p] = cs[p]);
    Object.assign(c.style, { position: "absolute", left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, margin: 0, opacity: 0 }); w.querySelector(".r7-fx").append(c); out[k] = c; } return out; };
  const destOf = root => ({ tile: root.querySelector(".ob-head > .g"), text: root.querySelector(".ob-title") });

  // The full view's arrival: shared elements travel (morph) or the whole view slides in (fade); reduced: a cross-fade in place
  const arriveFull = (host, from, art, dir, snaps) => {
    const s = host._s, w = winOf(host), mode = M.reduced() ? "fade" : s.opt.open;
    if (mode === "morph" && art) {
      const to = destOf(art);
      const fr = { tile: from.tile && M.local(w, from.tile), text: from.text && M.local(w, from.text) };
      M.travel(w, from, to);
      [...art.children].filter(c => !c.matches(".ob-head")).forEach(c => M.arrive(c, { delay: M.t("hover") }));
      art.querySelectorAll(".ob-head .ob-meta").forEach(c => M.arrive(c, { delay: M.t("hover") }));
      snaps.forEach(b => M.leave(b));
      if (fr.tile && to.tile) M.mark(w, "move", [{ rect: fr.tile, label: "from" }, { rect: M.local(w, to.tile), label: "lands on the title" }, { from: M.centre(fr.tile), to: M.centre(M.local(w, to.tile)) }]);
    } else {
      snaps.forEach(b => M.leave(b, { dx: -16 * dir }));
      if (art) M.arrive(art, { dx: 16 * dir, delay: M.reduced() ? M.t("hover") / 2 : 0 });
      M.mark(w, "move", art ? [{ rect: M.local(w, art), label: dir > 0 ? "slides in from the right: deeper" : "slides in from the left: back" }] : null);
    }
  };

  const open = (host, id, trig) => {
    const s = host._s; if (!O[id]) return;
    if (s.view === "columns") return paneNav(host, id, trig);
    const o = O[id], w = winOf(host);
    if (s.type === o.kind && s.sel[o.kind] === id) { closePeek(host); return; }
    M.clearSnaps(w);
    const from = sourceOf(host, id, trig), main = host.querySelector(".nv-main");
    const snaps = snapAll(w, main, [main.querySelector(".nv-scroller > *"), s.peek?.el], from);
    const stand = standIn(w, from);
    const railTop = host.querySelector(".nv-types [aria-current='true']")?.offsetTop;
    const p = s.peek, origin = p ? p.trig : trig;
    s.back.push({ type: s.type, sel: s.sel[s.type], list: listScroll(host)?.scrollTop || 0, main: mainScroll(host)?.scrollTop || 0, ref: ref(host, origin), peekId: p ? p.id : null, id });
    s.type = o.kind; s.sel[o.kind] = id; render(host);
    const sel = host.querySelector(`.ob-list [data-sel="${id}"]`); if (sel) { const l = listScroll(host); l.scrollTop = Math.max(0, sel.offsetTop - l.clientHeight / 2); }
    mainScroll(host).scrollTop = 0;
    M.slideCurrent(host.querySelector(".nv-types"), railTop);
    const art = host.querySelector(".nv-main .ob-full");
    arriveFull(host, stand, art, 1, snaps);
    Object.values(stand).forEach(c => c.remove());
    art?.querySelector(".ob-title")?.focus({ preventScroll: true });
    say(host, `Opened ${NAMES[o.kind][1]}: ${o.name}`);
  };

  const back = host => {
    const s = host._s; if (s.view === "columns") return paneBack(host);
    const e = s.back.pop(); if (!e) return;
    const w = winOf(host), main = host.querySelector(".nv-main"), art = main.querySelector(".ob-full");
    closePeek(host, { instant: true }); M.clearSnaps(w);
    const morph = s.opt.open === "morph" && !M.reduced();
    const snaps = snapAll(w, main, [main.querySelector(".nv-scroller > *")], art ? destOf(art) : null);
    const leavingId = s.sel[s.type];
    const stand = art && morph ? standIn(w, destOf(art)) : {};
    const railTop = host.querySelector(".nv-types [aria-current='true']")?.offsetTop;
    s.type = e.type; if (e.sel) s.sel[e.type] = e.sel; render(host);
    const l = listScroll(host); if (l) l.scrollTop = e.list;
    mainScroll(host).scrollTop = e.main;
    M.slideCurrent(host.querySelector(".nv-types"), railTop);
    const trig = resolve(host, e.ref);
    if (trig && s.opt.back === "peek" && e.peekId) showPeek(host, trig, { pinned: true, id: e.peekId, instant: true });
    // The title travels back to where it came from: the peek head (if reopened and showing this object) or the preview
    let to = null;
    if (s.peek && s.peek.id === leavingId) to = { tile: s.peek.el.querySelector(".ob-hang > .g"), text: s.peek.el.querySelector(".ob-pk-name") };
    else if (trig && e.ref.id === leavingId) to = { tile: tileOfAnchor(anchorOf(trig)), text: textOf(trig) };
    if (morph && to) {
      M.travel(w, stand, to);
      const fr = stand.tile && M.local(w, stand.tile);
      if (fr) M.mark(w, "move", [{ rect: fr, label: "from the title" }, { rect: M.local(w, to.tile), label: "back to where it came from" }, { from: M.centre(fr), to: M.centre(M.local(w, to.tile)) }]);
      snaps.forEach(b => M.leave(b));
      const na = host.querySelector(".nv-main .nv-scroller > *"); if (na) M.arrive(na, { delay: M.t("hover") });
      if (s.peek) M.fadeKids(s.peek.el, M.t("float"), M.t("hover"));
    } else {
      snaps.forEach(b => M.leave(b, { dx: 16 }));
      const na = host.querySelector(".nv-main .nv-scroller > *"); if (na) M.arrive(na, { dx: -16 });
    }
    Object.values(stand).forEach(c => c.remove());
    if (trig) trig.focus({ preventScroll: true }); else host.querySelector(".nv-types [aria-current='true']")?.focus({ preventScroll: true });
    say(host, `Back to ${e.type === "home" ? "Briefing" : O[e.sel].name}`);
  };

  /* ═══ Columns: the docked pane (tier 1) pushes in from its edge ═════════════════ */
  const setCur = host => host.querySelectorAll(".r7-cols [data-pane]").forEach(b => { const a = anchorOf(b); a.toggleAttribute("aria-current", b.dataset.pane === host._s.pane); if (b.dataset.pane === host._s.pane) a.setAttribute("aria-current", "true"); });
  const paneOpen = (host, id, from) => {
    const s = host._s, w = winOf(host), slot = host.querySelector(".r7-pslot"), was = s.pane;
    closePeek(host, { instant: true });
    s.pane = id; s.pback = []; s.paneFrom = from ? { pane: from.dataset.pane } : s.paneFrom;
    if (was && slot.firstElementChild) {   // already docked: the contents change in place
      slot.innerHTML = paneHTML(s); A.markFades(slot); M.arrive(slot.firstElementChild);
    } else {
      slot.innerHTML = paneHTML(s); A.markFades(slot);
      host.querySelector(".r7-cols").setAttribute("data-pane-open", "");
      M.pane(slot, PANE_W);
      const r = { x: W - PANE_W, y: 0, w: PANE_W, h: H };
      M.mark(w, "move", [{ rect: { x: r.x + 6, y: 40, w: PANE_W - 12, h: 1 }, label: "pane: from the right edge, pushes the view" }, { from: { x: W - 10, y: H / 2 }, to: { x: W - PANE_W + 40, y: H / 2 } }]);
    }
    slot.querySelectorAll(".ob-title").forEach(h => h.tabIndex = -1);
    setCur(host); say(host, `${O[id].name} open in the pane`);
  };
  const paneClose = host => {
    const s = host._s, slot = host.querySelector(".r7-pslot"); if (!s.pane) return;
    const had = slot.contains(document.activeElement); closePeek(host, { instant: true });
    s.pane = null; s.pback = []; host.querySelector(".r7-cols").removeAttribute("data-pane-open"); setCur(host);
    M.pane(slot, 0, { onEnd: () => { if (!s.pane) slot.innerHTML = ""; } });
    M.mark(winOf(host), "move", [{ from: { x: W - PANE_W + 40, y: H / 2 }, to: { x: W - 10, y: H / 2 } }]);
    if (had || s.paneFrom) { const c = host.querySelector(`.r7-cols [data-pane="${s.paneFrom?.pane}"]`); if (had && c) c.focus({ preventScroll: true }); }
    say(host, "Pane closed");
  };
  // Open from a peek inside the pane: the pane's contents become that object; the title travels from the peek
  const paneNav = (host, id, trig) => {
    const s = host._s, w = winOf(host), slot = host.querySelector(".r7-pslot");
    if (!s.pane) return paneOpen(host, id, null);
    if (s.pane === id) return closePeek(host);
    const from = sourceOf(host, id, trig);
    const stand = standIn(w, from);
    const snaps = snapAll(w, slot, [slot.querySelector(".ob-full"), s.peek?.el], from);
    s.pback.push({ pane: s.pane, main: slot.firstElementChild.scrollTop, ref: ref(host, s.peek?.trig || trig) });
    closePeek(host, { instant: true });
    s.pane = id; s.still = true; slot.innerHTML = paneHTML(s); A.markFades(slot); slot.querySelectorAll(".ob-title").forEach(h => h.tabIndex = -1);
    arriveFull(host, stand, slot.querySelector(".ob-full"), 1, snaps); Object.values(stand).forEach(c => c.remove());
    setCur(host); slot.querySelector(".ob-title")?.focus({ preventScroll: true }); say(host, `Opened ${O[id].name}`);
  };
  const paneBack = host => {
    const s = host._s, slot = host.querySelector(".r7-pslot"), e = s.pback.pop(); if (!e) return paneClose(host);
    closePeek(host, { instant: true }); const w = winOf(host), snap = M.snapshot(w, slot.querySelector(".ob-full"), slot);
    s.pane = e.pane; s.still = true; slot.innerHTML = paneHTML(s); A.markFades(slot); slot.firstElementChild.scrollTop = e.main; slot.querySelectorAll(".ob-title").forEach(h => h.tabIndex = -1);
    M.leave(snap, { dx: 16 }); M.arrive(slot.querySelector(".ob-full"), { dx: -16 }); setCur(host);
    const t = resolve(host, e.ref); (t || slot.querySelector(".ob-title"))?.focus({ preventScroll: true });
  };

  /* ═══ Hover intent and the grace area ═════════════════════════════════════════ */
  // While a hover peek is open and the pointer has left its trigger, the triangle from the exit point to the peek's near edge
  // is a safe path: other previews it crosses don't swap the peek, and the peek doesn't close while the pointer moves inside it.
  const near = (el, side) => { const r = el.getBoundingClientRect();
    return side === "beside" ? [{ x: r.left, y: r.top }, { x: r.left, y: r.bottom }] : side === "below" && r.top >= (el._exitY ?? 0) ? [{ x: r.left, y: r.top }, { x: r.right, y: r.top }] : [{ x: r.left, y: r.bottom }, { x: r.right, y: r.bottom }]; };
  const inTri = (p, a, b, c) => { const s = (p1, p2, p3) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    const d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
  const toLocal = (w, pt) => { const b = w.getBoundingClientRect(), k = M.zoomOf(w); return { x: (pt.x - b.left) / k, y: (pt.y - b.top) / k }; };

  /* ═══ Init and events ════════════════════════════════════════════════════════ */
  const init = host => {
    const cfg = JSON.parse(host.dataset.r7 || "{}");
    host.id ||= `r7-${++uid}`;
    const s = host._s = { view: cfg.view || "default", type: cfg.type || "home", back: [], pback: [], peek: null, colTheme: cfg.colTheme || "coi", pane: cfg.pane || null,
      sel: { theme: "coi", theory: "t1", prototype: "p1", signal: "s1", dump: "d1", ...(cfg.sel || {}) }, opt: { open: "morph", pos: "beside", back: "preview", ...(cfg.opt || {}) } };
    host.innerHTML = `<div class="r7-win ob-win ctl" data-align="c" data-fresh="weight" data-challenge="c"><div class="r7-frame"></div><div class="r7-fx" aria-hidden="true"></div><div class="r7-sr" role="status" aria-live="polite"></div></div>`;
    render(host); s.still = false; fit(host); new ResizeObserver(() => fit(host)).observe(host);
    const w = winOf(host);

    host.addEventListener("pointerover", e => {
      if (e.pointerType === "touch") return;
      const t = e.target;
      if (t.closest(".ob-peek")) { clearTimeout(s.leaveT); s.exit = null; M.tri(w, null); return; }
      const a = t.closest(PEEKABLE); if (!a) return;
      if (s.peek && a === s.peek.trig) { clearTimeout(s.leaveT); s.exit = null; M.tri(w, null); return; }
      if (s.peek?.pinned || s.safe || s.still) return;
      clearTimeout(s.hoverT);
      s.hoverT = setTimeout(() => { if (a.isConnected && !s.peek?.pinned && !s.safe) showPeek(host, a); }, s.peek ? WARM : HOVER);
    });
    host.addEventListener("pointerout", e => {
      const a = e.target.closest(PEEKABLE), to = e.relatedTarget;
      if (a && !(to && a.contains(to))) clearTimeout(s.hoverT);
      const p = s.peek; if (!p || p.pinned) return;
      if (to && (to.closest?.(".ob-peek") || p.trig.contains(to))) return;
      // The grace area's apex: the last point the pointer was seen on the trigger (an event's own position may already be far away)
      if (p.trig.contains(e.target)) { const r = p.trig.getBoundingClientRect(); s.exit = s.lastOn && p.trig.contains(s.lastOn.el) ? { x: s.lastOn.x, y: s.lastOn.y } : { x: r.left + r.width / 2, y: r.top + r.height / 2 }; p.el._exitY = s.exit.y; }
      clearTimeout(s.leaveT); s.leaveT = setTimeout(() => { if (s.peek && !s.peek.pinned) closePeek(host); s.safe = false; }, GRACE);
    });
    host.addEventListener("pointermove", e => {
      if (s.still && (e.movementX || e.movementY)) { s.still = false; const a = e.target.closest(PEEKABLE); if (a && !a.closest(".ob-peek") && !s.peek) { clearTimeout(s.hoverT); s.hoverT = setTimeout(() => { if (a.isConnected && !s.peek && !s.still) showPeek(host, a); }, HOVER); } }
      const on = e.target.closest(PEEKABLE); if (on && !on.closest(".ob-peek")) s.lastOn = { x: e.clientX, y: e.clientY, el: on };
      const p = s.peek; if (!p || p.pinned || !s.exit) { s.safe = false; return; }
      if (e.target.closest(".ob-peek") || p.trig.contains(e.target)) { s.safe = false; return; }
      const [b, c] = near(p.el, p.el.dataset.side), pt = { x: e.clientX, y: e.clientY };
      // Pad the apex a little behind the exit point so a pointer that drifts sideways at the start still counts
      s.safe = inTri(pt, s.exit, b, c);
      if (s.safe) { clearTimeout(s.leaveT); clearTimeout(s.hoverT); s.leaveT = setTimeout(() => { if (s.peek && !s.peek.pinned) closePeek(host); s.safe = false; }, GRACE); }
      M.tri(w, [toLocal(w, s.exit), toLocal(w, b), toLocal(w, c)]);
    });
    host.addEventListener("pointerleave", () => { clearTimeout(s.hoverT); if (s.peek && !s.peek.pinned) { clearTimeout(s.leaveT); s.leaveT = setTimeout(() => closePeek(host), GRACE); } });

    host.addEventListener("click", e => {
      const t = e.target, inPeek = t.closest(".ob-peek");
      const vb = t.closest(".nv-switch button[data-view]");
      if (vb) { if (vb.getAttribute("aria-disabled") === "true") return; s.view = vb.dataset.view === "columns" ? "columns" : "default"; render(host); host.querySelector(`.nv-switch [data-view="${s.view}"]`)?.focus(); return; }
      const el = t.closest("[data-go],[data-sel],[data-open],[data-full],[data-home],[data-back],[data-close],[data-pane]");
      if (s.peek && !inPeek && !(el && el.matches(PEEKABLE))) closePeek(host, { focus: false });
      if (!el) return;
      const d = el.dataset;
      if (d.open) {
        if (inPeek) return chain(host, el);
        if (s.peek && s.peek.trig === el) { if (s.peek.pinned) closePeek(host); else s.peek.pinned = true; return; }   // a click pins a hover peek; a second click closes
        return showPeek(host, el, { pinned: true });
      }
      if (d.full) return open(host, d.full, null);
      if ("back" in d) return back(host);
      if ("close" in d) return paneClose(host);
      if (d.pane) return paneOpen(host, d.pane, el);
      if (s.view === "columns" && d.sel) { s.colTheme = d.sel; const f = document.activeElement === el; render(host); setCur(host); if (f) host.querySelector(`[data-sel="${d.sel}"]`)?.focus(); return; }
      if (d.go) { s.type = d.go; s.back = []; }
      else if ("home" in d) { s.type = "home"; s.back = []; }
      else if (d.sel) { s.sel[s.type] = d.sel; s.back = []; }
      const ls = listScroll(host)?.scrollTop, railTop = host.querySelector(".nv-types [aria-current='true']")?.offsetTop, keepList = !!d.sel;
      render(host);   // selecting in a list or the rail is instant: it is the most frequent move, so nothing animates but the rail's current item
      if (keepList && listScroll(host)) listScroll(host).scrollTop = ls;
      M.slideCurrent(host.querySelector(".nv-types"), railTop);
      (host.querySelector(d.sel ? `.ob-list [data-sel="${d.sel}"]` : ".nv-types [aria-current='true']"))?.focus({ preventScroll: true });
    });

    /* Keyboard: arrows move within a list; Space or → peeks; Enter opens; Esc closes the peek, then goes Back */
    const items = (root, sel) => [...root.querySelectorAll(sel)].filter(x => x.offsetParent);
    host.addEventListener("keydown", e => {
      const t = e.target, k = e.key, inPeek = t.closest?.(".ob-peek"), mod = e.metaKey || e.ctrlKey;
      if (mod && k === "Enter" && s.peek) { e.preventDefault(); return open(host, s.peek.id, null); }
      if (mod && (k === "[" || e.code === "BracketLeft")) { e.preventDefault(); return back(host); }
      if (k === "Escape") {
        e.preventDefault();
        if (s.peek) return closePeek(host, { focus: !!inPeek || t === s.peek.trig || !host.contains(document.activeElement) || document.activeElement === document.body });
        if (s.view === "default" && s.back.length) return back(host);
        if (s.view === "columns" && s.pane) return s.pback.length ? paneBack(host) : paneClose(host);
        return;
      }
      // Rail: arrows move focus; Enter or Space selects (they are buttons)
      if (t.matches(".nv-type") && (k === "ArrowDown" || k === "ArrowUp")) { e.preventDefault(); const L = items(host, ".nv-types .nv-type"), i = L.indexOf(t), n = L[(i + (k === "ArrowDown" ? 1 : -1) + L.length) % L.length]; L.forEach(b => b.tabIndex = b === n ? 0 : -1); n.focus(); return; }
      // The item list (second sidebar): arrows select, and the main area follows at once (like Mail)
      if (t.matches(".ob-list [data-sel], .r7-cols .ob-colnav [data-sel]") && (k === "ArrowDown" || k === "ArrowUp" || k === "Home" || k === "End")) {
        e.preventDefault(); const L = items(t.closest(".ob-list, .ob-colnav"), "[data-sel]"), i = L.indexOf(t);
        const n = L[k === "Home" ? 0 : k === "End" ? L.length - 1 : Math.max(0, Math.min(L.length - 1, i + (k === "ArrowDown" ? 1 : -1)))]; if (n && n !== t) n.click(); return;
      }
      // Columns cards: arrows move focus; once the pane is open it follows (Space or Enter docks it)
      if (t.matches(".r7-cols [data-pane]") && (k === "ArrowDown" || k === "ArrowUp")) {
        e.preventDefault(); const L = items(t.closest("section"), "[data-pane]"), n = L[Math.max(0, Math.min(L.length - 1, L.indexOf(t) + (k === "ArrowDown" ? 1 : -1)))];
        n.focus(); if (s.pane) paneOpen(host, n.dataset.pane, n); return;
      }
      if (t.matches(".r7-cols [data-pane]") && k === "ArrowRight") { e.preventDefault(); return paneOpen(host, t.dataset.pane, t); }
      if (!t.matches?.(PEEKABLE)) {
        if (inPeek && (k === "ArrowLeft")) { e.preventDefault(); closePeek(host, { focus: true }); }
        if (inPeek && k === "Enter" && t === s.peek?.el) { e.preventDefault(); open(host, s.peek.id, null); }
        if (s.peek && inPeek && k === "Tab") {   // Tab out of the peek: it closes and focus goes back to its trigger
          const L = items(s.peek.el, "button, [tabindex='0']"); if ((!e.shiftKey && t === L.at(-1)) || (e.shiftKey && t === L[0])) { e.preventDefault(); closePeek(host, { focus: true }); }
        }
        return;
      }
      const scope = inPeek || t.closest(".nv-scroller, .ob-pane");
      if (k === "ArrowDown" || k === "ArrowUp") {
        e.preventDefault(); const L = items(scope, "[data-open]").filter(x => !!inPeek === !!x.closest(".ob-peek")), i = L.indexOf(t);
        const n = L[Math.max(0, Math.min(L.length - 1, i + (k === "ArrowDown" ? 1 : -1)))]; if (!n || n === t) return; n.focus();
        if (!inPeek && s.peek?.key) showPeek(host, n, { pinned: true, key: true });   // a keyboard peek follows the focus, like Quick Look
        return;
      }
      if (k === " " || k === "ArrowRight") {
        e.preventDefault(); if (inPeek) return chain(host, t);
        if (s.peek && s.peek.trig === t) { if (k === " ") closePeek(host); return; }
        return showPeek(host, t, { pinned: true, key: true });
      }
      if (k === "ArrowLeft" && inPeek) { e.preventDefault(); return closePeek(host, { focus: true }); }
      if (k === "Enter") { e.preventDefault(); return open(host, t.dataset.open, t); }
      if (k === "Tab" && !e.shiftKey && s.peek && s.peek.trig === t) { e.preventDefault(); (items(s.peek.el, "button")[0] || s.peek.el).focus(); }
    });
    host.addEventListener("keyup", e => { if (e.key === " " && e.target.matches?.(PEEKABLE)) e.preventDefault(); });
    // Scrolling keeps the origins overlay honest
    host.addEventListener("scroll", () => { if (s.peek) markPeek(host); }, true);
  };

  /* Outside the window: a click or Esc elsewhere on the page closes an open peek */
  document.addEventListener("pointerdown", e => document.querySelectorAll(".r7-host").forEach(h => { if (h._s?.peek && !h.contains(e.target)) closePeek(h); }));

  /* Tooltips (05): name then key, after 500ms */
  let tipT;
  document.addEventListener("pointerover", e => { const b = e.target.closest(".r7-win [data-tip]"); if (!b) return; clearTimeout(tipT); tipT = setTimeout(() => {
    const w = b.closest(".r7-win"); w.querySelector(".nv-tip")?.remove();
    const tp = document.createElement("div"); tp.className = "nv-tip"; tp.setAttribute("role", "tooltip"); tp.innerHTML = `<span>${b.dataset.tip}</span>${b.dataset.key ? `<kbd>${b.dataset.key}</kbd>` : ""}`; w.append(tp);
    const r = M.local(w, b); let top = r.y + r.h + 4; if (b.closest(".nv-switch")) top = r.y - tp.offsetHeight - 4;
    Object.assign(tp.style, { left: `${Math.max(4, Math.min(w.offsetWidth - tp.offsetWidth - 4, r.x + r.w / 2 - tp.offsetWidth / 2))}px`, top: `${top}px` }); }, 500); });
  document.addEventListener("pointerout", e => { const b = e.target.closest(".r7-win [data-tip]"); if (!b) return; clearTimeout(tipT); b.closest(".r7-win")?.querySelector(".nv-tip")?.remove(); });

  const api = { init, open, back, showPeek, closePeek, paneOpen, paneClose, render,
    set: (host, patch) => { Object.assign(host._s.opt, patch); closePeek(host, { instant: true }); } };
  window.R7 = api;
  const start = () => document.querySelectorAll(".r7-host[data-r7]").forEach(init);
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", start); else start();
})();
