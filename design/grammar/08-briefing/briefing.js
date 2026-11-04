// Grammar 08: Briefing, the main area of the type-first default view when Briefing (first rail item) is selected. No second sidebar (Navigation rule 2).
// Built from 06's decided components (rows, peeks, full views, dashed blocks); 06's frames.js takes over when you leave Briefing (Open, a rail type, Columns).
// Usage: <div class="br8-host" data-br='{"day":"busy","opt":{"group":"theme","settle":"leave","seen":"shown"}}'></div>
(() => {
  const A = window.AberObjects, { O, tile, row, ICON } = A, { DAYS, theoryOf } = window.Brief08Data;
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const ib = (icon, label, attr = "", key = "") => `<button type="button" class="nv-ib" aria-label="${esc(label)}" data-tip="${esc(label)}"${key ? ` data-key="${key}"` : ""} ${attr}><i class="ph ph-${icon}" aria-hidden="true"></i></button>`;
  const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const list = xs => xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  /* ═══ One world per window: reset 06's objects to their baseline, then apply this window's decisions and seen state ═══ */
  const BASE = Object.fromEntries(Object.values(O).map(o => [o.id, { o, name: o.name, c: o.c, draft: o.draft, fresh: o.fresh, failed: o.failed, kw: o.kw, challenge: o.challenge, ev: o.ev?.map(x => [...x]) }]));
  const SUG0 = JSON.stringify(A.SUG);
  const applyWorld = st => {
    for (const k of Object.keys(O)) if (!BASE[k]) delete O[k];
    for (const b of Object.values(BASE)) { O[b.o.id] = b.o; Object.assign(b.o, { name: b.name, c: b.c, draft: b.draft, fresh: b.fresh, failed: b.failed, kw: b.kw, challenge: b.challenge }); if (b.ev) b.o.ev = b.ev.map(x => [...x]); }
    for (const k of Object.keys(A.SUG)) delete A.SUG[k]; Object.assign(A.SUG, JSON.parse(SUG0));
    const day = DAYS[st.day];
    for (const d of day.decisions) {
      const done = st.decided.get(d.id);
      if (d.kind === "challenge") { O[d.theory].challenge = done ? undefined : d.signal; if (done?.v === "accept") O[d.theory].c = Math.max(1, O[d.theory].c - 1); }
      else if (d.kind === "sug" && d.signal) {
        const stance = d.as === "Undermines" ? "-" : "+";
        if (!done) (A.SUG[d.target] ||= []).push({ s: d.signal, st: stance, why: d.why });   // still pending: 06's peek and full view show it too
        else if (done.v === "accept") O[d.signal].ev.push([d.target, stance]);
      } else if (d.kind === "sug" && d.text && done?.v === "accept") O[d.target].name = d.text;
      else if (d.kind === "draft" && done) { if (done.v === "accept") O[d.obj].draft = false; else delete O[d.obj]; }
    }
    if (st.day === "busy" && st.unmerged.has("s1")) O.s1b = { ...O.s1, id: "s1b", src: "theverge.com", ev: [] };
    for (const s of A.all("signal")) s.fresh = day.signals.includes(s.id) && !st.seen.has(s.id);
    if (O.s1b) O.s1b.fresh = !st.seen.has("s1b");
    for (const t of A.all("theme")) { const n = A.all("signal").filter(s => s.fresh && s.themes[0] === t.id).length; t.fresh = n || undefined; }
    const d8 = st.dumps.d8; if (d8 && d8 !== "failed") { O.d8.failed = false; if (d8 === "done") O.d8.kw = "Link"; }
  };

  /* ═══ What this window lists right now ═══ */
  const live = st => {
    const day = DAYS[st.day];
    const shown = d => !st.decided.has(d.id) || st.decided.get(d.id).stay;
    const ds = day.decisions.filter(shown);
    const sigs = day.signals.flatMap(id => id === "s1" && st.unmerged.has("s1") ? ["s1", "s1b"] : [id]);
    return { day, ch: ds.filter(d => d.kind === "challenge"), sug: ds.filter(d => d.kind === "sug"), dr: ds.filter(d => d.kind === "draft"), sigs, dumps: day.dumps };
  };
  const pendingOf = (st, xs) => xs.filter(d => !st.decided.has(d.id));

  /* ═══ Summary before detail: one sentence of what needs you, one of what arrived ═══ */
  const summary = st => {
    const L = live(st), need = [];
    const c = pendingOf(st, L.ch).length, s = pendingOf(st, L.sug).length, d = pendingOf(st, L.dr).length;
    if (c) need.push(plural(c, "challenge")); if (s) need.push(plural(s, "suggestion")); if (d) need.push(plural(d, "draft"));
    const first = need.length ? `${list(need)} need${c + s + d === 1 ? "s" : ""} you.` : "Nothing needs you.";
    const byTheme = {}; L.sigs.forEach(id => { const t = O[id].themes[0]; byTheme[t] = (byTheme[t] || 0) + 1; });
    const top = Object.entries(byTheme).sort((a, b) => b[1] - a[1])[0];
    const failed = L.dumps.filter(id => dumpState(st, id) === "failed").length;
    const working = L.dumps.filter(id => dumpState(st, id) === "processing").length;
    const from = L.dumps.filter(id => O[id].made.some(x => L.sigs.includes(x))).length;
    let second = L.sigs.length ? `${plural(L.sigs.length, "new signal")}${from ? ` from ${plural(from, "dump")}` : ""}${top && L.sigs.length > 3 ? `, most on ${O[top[0]].name}` : ""}.` : "";
    const tails = []; if (failed) tails.push(`${failed} dump couldn't be read`); if (working) tails.push(`${working} is still processing`);
    if (tails.length) second += ` ${list(tails).replace(/^./, m => m.toUpperCase())}.`;
    return `${first} ${second}`.trim();
  };

  /* ═══ Items. Every decision is 06's attached block; its object rows peek and open like rows anywhere ═══ */
  // Button labels (choice 4): generic Dismiss | Accept, or verbs where a generic label leaves you guessing what happens
  const verbs = d => d.kind === "challenge" ? ["Keep confidence", `Lower to ${Math.max(1, O[d.theory].c - 1)}`]
    : d.kind === "draft" ? ["Discard", "Keep"] : d.as === "New wording" ? ["Dismiss", "Use wording"] : d.as === "Merge with" ? ["Keep apart", "Merge"] : ["Dismiss", "Add evidence"];
  const decide = (st, d) => { const [no, yes] = st.opt.labels === "verb" ? verbs(d) : [d.kind === "draft" ? "Discard" : "Dismiss", "Accept"];
    return `<div class="ob-decide"><button type="button" class="nv-btn secondary" data-act="no">${no}</button><button type="button" class="nv-btn primary" data-act="yes">${yes}</button></div>`; };
  const settled = (st, d, name) => { const v = st.decided.get(d.id).v;
    const word = v === "accept" ? "Accepted" : d.kind === "draft" ? "Discarded" : "Dismissed";
    return `<div class="br8-settled" data-item="${d.id}" role="status"><span class="w">${word}</span><span class="q">${esc(name)}</span><button type="button" class="nv-btn quiet" data-act="undo">Undo</button></div>`; };
  const nameOf = d => d.kind === "challenge" ? O[d.signal].name : d.kind === "draft" ? (O[d.obj] || BASE[d.obj].o).name : d.signal ? O[d.signal].name : d.other ? O[d.other].name : d.text;

  const challenge = (st, d) => {
    const t = O[d.theory], s = O[d.signal];
    if (st.decided.has(d.id)) return `<div class="ob-rows br8-g">${row(t, { omit: "when" })}${settled(st, d, s.name)}</div>`;
    // The subject (the theory and its tripwire) sits above; the dashed block holds only what's decided: the signal, the consequence, the buttons
    const why = st.opt.labels === "verb" ? `Lowering takes confidence from ${t.c} to ${Math.max(1, t.c - 1)}.` : `Accepting lowers confidence from ${t.c} to ${Math.max(1, t.c - 1)}.`;
    return `<div class="ob-rows br8-g br8-ch">${row(t, { omit: "when" })}<div class="ob-attach lg">${tile("tripwire", ICON.tripwire)}<p class="ob-prose">${t.trip}</p></div>
      <div class="ob-block sug br8-item" data-item="${d.id}" tabindex="-1"><div class="ob-blabel">Tripped by</div>${row(s, { omit: "when" })}<p class="ob-why-t">${why}</p>${decide(st, d)}</div></div>`;
  };
  const sugBlock = (st, d) => {
    if (st.decided.has(d.id)) return settled(st, d, nameOf(d));
    const body = d.signal ? row(O[d.signal], { omit: "when" }) : d.other ? row(O[d.other], { omit: "when" }) : `<p class="br8-words">${d.text}</p>`;
    return `<div class="ob-block sug br8-item" data-item="${d.id}" tabindex="-1"><div class="ob-blabel">${d.as}</div>${body}<p class="ob-why-t">${d.why}</p>${decide(st, d)}</div>`;
  };
  // Suggestions are grouped by the object they would change: one row for the theory, its proposals under it
  const suggestions = (st, xs) => {
    const by = new Map(); xs.forEach(d => by.set(d.target, [...(by.get(d.target) || []), d]));
    return [...by].map(([t, ds]) => `<div class="ob-rows br8-g">${row(O[t], { omit: "when" })}${ds.map(d => sugBlock(st, d)).join("")}</div>`).join("");
  };
  const draft = (st, d) => {
    if (st.decided.has(d.id)) return settled(st, d, nameOf(d));
    return `<div class="ob-block sug br8-item" data-item="${d.id}" tabindex="-1">${row(O[d.obj], { omit: "key when" })}<p class="ob-why-t">${d.why}</p>${decide(st, d)}</div>`;
  };

  // New signals: folded groups (06's list fold), by theme or by the theory they bear on (choice 1). Three or fewer show; more fold to their count.
  const signalGroups = (st, sigs) => {
    const day = DAYS[st.day], by = new Map();
    for (const id of sigs) { const k = st.opt.group === "theory" ? theoryOf(id === "s1b" ? "s1" : id, day.decisions) || "none" : O[id].themes[0]; by.set(k, [...(by.get(k) || []), id]); }
    return [...by].sort((a, b) => (a[0] === "none") - (b[0] === "none") || b[1].length - a[1].length).map(([k, ids]) => {
      const open = st.open[k] ?? ids.length <= 3, unseen = ids.some(id => O[id].fresh);
      const label = k === "none" ? "No theory yet" : O[k].name;
      const mark = st.opt.seen === "read" && unseen ? `<span class="br8-gact">${ib("check", "Mark seen", `data-seen="${k}" class="nv-ib sm"`)}</span>` : "";
      return `<div class="ob-rows br8-g br8-fold${unseen ? " unseen" : ""}" data-group="${k}" data-ids="${ids.join(" ")}">
        <div class="br8-fhead"><button type="button" class="ob-glabel fold" data-fold="${k}" aria-expanded="${open}" title="${esc(label)}"><i class="ph ph-caret-down${open ? "" : " shut"}" aria-hidden="true"></i><span class="l">${label}</span><span class="ob-n" aria-label="${plural(ids.length, "new signal")}">${ids.length}</span></button>${mark}</div>
        ${open ? ids.map(id => sigRow(st, id)).join("") : ""}</div>`;
    }).join("");
  };
  // Rows are 06's; Briefing only edits their key line or adds one action, through the DOM rather than by string surgery
  const edit = (html, fn) => { const t = document.createElement("template"); t.innerHTML = html.trim(); fn(t.content.firstElementChild); return t.innerHTML; };
  const rowAct = (r, html, on = false) => r.insertAdjacentHTML("beforeend", `<span class="br8-rowact${on ? " on" : ""}">${html}</span>`);
  const sigRow = (st, id) => {
    const also = DAYS[st.day].merged?.[id]; if (!also || st.unmerged.has(id)) return row(O[id]);
    return edit(row(O[id]), r => { r.classList.add("br8-merged"); r.querySelector(".ob-src").textContent = `${O[id].src} and ${also}`;
      rowAct(r, `<button type="button" class="nv-btn quiet" data-unmerge="${id}"><i class="ph ph-arrows-split" aria-hidden="true"></i>Unmerge</button>`); });
  };
  // Dumps: what you sent and what became of it. A failure says why in words, with Retry; work in progress says Processing (10 States)
  const dumpState = (st, id) => st.dumps[id] || (O[id].failed ? "failed" : O[id].processing ? "processing" : "done");
  const dumpRow = (st, id) => {
    const state = dumpState(st, id); if (state === "done") return row(O[id]);
    return edit(row(O[id]), r => {
      const kv = r.querySelector(".kv");
      if (state === "processing") kv.innerHTML = `<span class="br8-work"><i class="ph ph-circle-notch" aria-hidden="true"></i>Processing</span>`;
      else { r.classList.add("br8-failed"); kv.querySelector(".st").innerHTML = "<span>Couldn't open the page</span>"; rowAct(r, `<button type="button" class="nv-btn secondary" data-retry="${id}">Retry</button>`, true); }
    });
  };

  const sec = (label, n, body, id) => body ? `<section class="ob-sec br8-sec" data-sec="${id}"><div class="ob-sh"><span>${label}</span>${n ? `<span class="ob-n">${n}</span>` : ""}</div>${body}</section>` : "";
  const doc = st => {
    const L = live(st), day = L.day, empty = !L.ch.length && !L.sug.length && !L.dr.length && !L.sigs.length && !L.dumps.length;
    const failedFirst = [...L.dumps].sort((a, b) => (dumpState(st, b) === "failed") - (dumpState(st, a) === "failed"));
    const body = empty ? `<p class="ob-empty br8-empty">Nothing new since ${day.looked}</p>`
      : `<p class="ob-prose br8-sum" aria-live="polite">${summary(st)}</p><hr class="ob-div">
        <div class="ob-rels br8-secs">
          ${sec("Challenges", pendingOf(st, L.ch).length, L.ch.map(d => challenge(st, d)).join(""), "ch")}
          ${sec("Suggestions", pendingOf(st, L.sug).length, suggestions(st, L.sug), "sug")}
          ${sec("Drafts", pendingOf(st, L.dr).length, L.dr.length ? `<div class="ob-rows br8-g">${L.dr.map(d => draft(st, d)).join("")}</div>` : "", "dr")}
          ${sec("New signals", L.sigs.length, signalGroups(st, L.sigs), "sig")}
          ${sec("Dumps", L.dumps.length, L.dumps.length ? `<div class="ob-rows br8-g">${failedFirst.map(id => dumpRow(st, id)).join("")}</div>` : "", "dump")}
        </div>`;
    return `<article class="ob-full ob-digest br8-doc"><div class="ob-top">${st.narrow ? ib("sidebar-simple", "Show types", 'data-rail-open') : ""}</div>
      <header class="ob-hang ob-head">${tile("briefing", ICON.briefing)}<div class="ob-col"><h3 class="ob-title">Since yesterday</h3>${empty ? "" : `<div class="ob-meta lg"><span>Last looked ${day.looked}</span></div>`}</div></header>
      <div class="ob-body">${body}</div></article>`;
  };

  /* ═══ The window: rail (Briefing selected), main, composer. Narrow: the rail is a sheet from its edge (04 rule 10) ═══ */
  const NAMES = { theme: "Themes", theory: "Theories", prototype: "Prototypes", signal: "Signals", dump: "Dumps" }, TOTAL = { signal: 412, dump: 286 };
  const VIEWS = [["default", "rows", "Default", "⌘1"], ["columns", "columns", "Columns", "⌘2"], ["atlas", "map-trifold", "Atlas", "⌘3"], ["timeline", "chart-scatter", "Timeline", "⌘4"]];
  const rail = st => `<aside class="nv-rail br8-rail${st.railOpen ? " open" : ""}">
      <div class="nv-brand"><span>Aber</span>${ib("magnifying-glass", "Find", "", "⌘K")}</div>
      <nav class="nv-types" aria-label="Types"><button type="button" class="nv-type ob-brief" data-home aria-current="true"><span class="gw">${tile("briefing", ICON.briefing)}</span><span class="nm">Briefing</span></button>${Object.keys(NAMES).map(t => `<button type="button" class="nv-type" data-go="${t}" aria-current="false"><span class="gw">${tile(t, ICON[t])}</span><span class="nm">${NAMES[t]}</span><span class="nv-n">${TOTAL[t] ?? A.all(t).filter(o => !o.retired).length}</span></button>`).join("")}</nav>
      <div class="nv-switch" role="group" aria-label="Views">${VIEWS.map(([v, i, l, k]) => `<button type="button" data-view="${v}" aria-pressed="${v === "default"}" aria-label="${l}" data-tip="${l}" data-key="${k}"${v === "atlas" || v === "timeline" ? ' aria-disabled="true"' : ""}><i class="ph${v === "default" ? "-fill" : ""} ph-${i}" aria-hidden="true"></i></button>`).join("")}</div></aside>`;
  const composer = `<form class="ctl-composer br8-composer" aria-label="Dump or ask" onsubmit="return false"><button type="button" class="ctl-icon" aria-label="Voice dump" data-tip="Voice dump" data-key="⌘⇧J"><i class="ph ph-microphone" aria-hidden="true"></i></button>
      <textarea rows="1" placeholder="Dump or ask" aria-label="Dump or ask"></textarea><button type="button" class="ctl-icon primary" aria-disabled="true" aria-label="Send" data-tip="Send" data-key="⏎"><i class="ph ph-paper-plane-right" aria-hidden="true"></i></button></form>`;
  const frame = (st, main) => `<div class="nv ctl ob-win br8-win${st.narrow ? " narrow" : ""}" data-v="A" data-fresh="weight" data-align="c" data-challenge="c" style="${st.h ? `height:${st.h}px` : ""}">
      ${rail(st)}${st.narrow && st.railOpen ? `<div class="br8-scrim" data-rail-close></div>` : ""}<main class="nv-main"><div class="nv-scroller">${main}</div></main>${composer}</div>`;

  /* ═══ Render ═══ */
  const NARROW = 720;
  const fit = host => { const el = host.querySelector(":scope > .nv, :scope > .ob-host > .nv"); if (!el) return; el.style.zoom = host._st.narrow ? "" : Math.min(1, host.clientWidth / 1280); };
  const render = host => {
    const st = host._st, sc = host.querySelector(".br8-win .nv-scroller")?.scrollTop || 0;
    if (st.mode !== "brief") return;
    applyWorld(st);
    const toast = host.querySelector(".br8-toast");
    host.innerHTML = frame(st, st.full ? A.full(O[st.full.at(-1)], { back: `<button type="button" class="nv-back" data-back><i class="ph ph-arrow-left" aria-hidden="true"></i><span>${st.full.length > 1 ? O[st.full.at(-2)].name : "Since yesterday"}</span></button>` }) : doc(st));
    if (toast) host.querySelector(".br8-win").append(toast);
    host.querySelector(".nv-scroller").scrollTop = sc; fit(host);
  };

  /* ═══ Leaving Briefing: 06's window takes over (Open, a rail type, Columns). Back or Briefing returns here ═══ */
  const leave = st => { if (st.opt.seen === "shown") live(st).sigs.forEach(id => { const k = st.opt.group === "theory" ? theoryOf(id === "s1b" ? "s1" : id, DAYS[st.day].decisions) || "none" : O[id].themes[0]; if (st.open[k] ?? true) st.seen.add(id); });
    for (const [id, x] of st.decided) if (x.stay) x.stay = false; host0(st)?.querySelector(".br8-toast")?.remove(); };
  const host0 = st => st._host;
  const away = (host, ob) => {
    const st = host._st;
    if (st.narrow) { if (ob.sel) { st.full = [...(st.full || []), Object.values(ob.sel)[0]]; markSeen(st, Object.values(ob.sel)[0]); render(host); } return; }
    leave(st); applyWorld(st); st.mode = "away";
    host.innerHTML = ""; const inner = document.createElement("div"); inner.className = "ob-host"; inner.dataset.ob = JSON.stringify(ob); host.append(inner);
    window.AberObjectFrames.init(inner);
    if (ob.fromBrief) { inner._s.back = [["home", null]]; window.AberObjectFrames.set(inner, {}); }
    inner.addEventListener("click", e => {
      const back = e.target.closest("[data-back]"), home = e.target.closest("[data-home]");
      if (home || (back && inner._s.back.length === 1 && inner._s.back[0][0] === "home")) { e.stopImmediatePropagation(); e.preventDefault(); st.mode = "brief"; render(host); }
      else { const f = e.target.closest("[data-full]"); if (f && O[f.dataset.full]?.kind === "signal") markSeen(st, f.dataset.full); }
    }, true);
  };
  const markSeen = (st, id) => { if (O[id]?.kind === "signal") st.seen.add(id); };

  /* ═══ Peek: 06's tethered card, opened by a 500ms hover or a click; Open leaves Briefing for the object's full view ═══ */
  const local = (base, el) => { const br = base.getBoundingClientRect(), k = br.width / base.offsetWidth || 1, r = el.getBoundingClientRect(); return { x: (r.left - br.left) / k, y: (r.top - br.top) / k, w: r.width / k, h: r.height / k }; };
  const closePeek = host => { host.querySelectorAll(".ob-peek.live").forEach(p => p.remove()); host.querySelectorAll("[data-peeking]").forEach(a => { a.removeAttribute("aria-expanded"); a.removeAttribute("data-peeking"); }); host._st.peek = null; };
  const showPeek = (host, id, trigger, pinned) => {
    const st = host._st, scroller = host.querySelector(".br8-win .nv-scroller"), anchor = trigger.closest(".ob-row") || trigger;
    closePeek(host); st.peek = { id, pinned };
    anchor.setAttribute("aria-expanded", "true"); anchor.setAttribute("data-peeking", "");
    if (O[id].kind === "signal" && O[id].fresh) { markSeen(st, id); O[id].fresh = false; anchor.classList.remove("unseen"); const g = anchor.closest(".br8-fold"); if (g && !g.querySelector(".ob-row.unseen")) g.classList.remove("unseen"); }
    const at = local(scroller, anchor);
    scroller.insertAdjacentHTML("beforeend", A.peek(O[id], { rel: true, cls: "live" }));
    const el = scroller.lastElementChild, W = scroller.clientWidth, top = at.y + scroller.scrollTop; A.markFades(el);
    const left = Math.max(8, Math.min(W - el.offsetWidth - 8, at.x - 8));
    let y = top + at.h + 4;
    if (y + el.offsetHeight > scroller.scrollTop + scroller.clientHeight - 8 && top - el.offsetHeight - 4 > scroller.scrollTop + 8) { y = top - el.offsetHeight - 4; el.classList.add("up"); }
    Object.assign(el.style, { left: `${left}px`, top: `${y}px`, transformOrigin: `${Math.max(12, at.x - left + 12)}px ${el.classList.contains("up") ? "100%" : "0"}` });
  };

  /* ═══ Toast (10 States 6): ink, one line, above the composer; 5s, held while hovered; ⌘Z while shown; a new one replaces the last ═══ */
  const toast = (host, verb, name, undo) => {
    const win = host.querySelector(".br8-win"); win.querySelector(".br8-toast")?.remove();
    win.insertAdjacentHTML("beforeend", `<div class="br8-toast" role="status"><span class="t">${verb}&nbsp;“<span class="q">${esc(name)}</span>”</span><button type="button" class="br8-undo" data-act="toast-undo">Undo<kbd>⌘Z</kbd></button></div>`);
    const t = win.querySelector(".br8-toast"); let held = false, timer;
    const arm = () => { clearTimeout(timer); timer = setTimeout(() => { if (!held && t.isConnected) { t.classList.add("out"); setTimeout(() => t.remove(), 160); } }, 5000); };
    t.addEventListener("pointerenter", () => { held = true; clearTimeout(timer); }); t.addEventListener("pointerleave", () => { held = false; arm(); });
    t._undo = () => { clearTimeout(timer); t.remove(); undo(); }; arm();
  };

  /* ═══ Deciding in place. A: the item solidifies, leaves, and a toast offers Undo. B: it settles to one line with Undo until you leave ═══ */
  const act = (host, el, yes) => {
    const st = host._st, id = el.closest("[data-item]").dataset.item, d = DAYS[st.day].decisions.find(x => x.id === id);
    const v = yes ? "accept" : "no", name = nameOf(d), word = yes ? "Accepted" : d.kind === "draft" ? "Discarded" : "Dismissed";
    const commit = () => { st.decided.set(id, { v, stay: st.opt.settle === "inline" }); render(host); refocus(host, id); };
    if (st.opt.settle === "inline") { commit(); return; }
    const item = el.closest("[data-item]"), g = item.closest(".br8-g"), last = g && g.querySelectorAll("[data-item]").length === 1 && !g.closest('[data-sec="dr"]') ? g : item;
    const undo = () => { st.decided.delete(id); render(host); host.querySelector(`[data-item="${id}"]`)?.focus({ preventScroll: true }); };
    if (yes) item.classList.add("is-accepted");
    if (reduce.matches) { commit(); toast(host, word, name, undo); return; }
    const h = last.offsetHeight;
    last.animate([{ height: `${h}px`, opacity: 1 }, { height: "0px", opacity: 0, marginTop: "0px", marginBottom: "0px", paddingTop: "0px", paddingBottom: "0px" }], { duration: 220, delay: yes ? 160 : 0, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "forwards" })
      .finished.then(() => { commit(); toast(host, word, name, undo); });
    last.style.overflow = "hidden";
  };
  const refocus = (host, id) => { const st = host._st, items = DAYS[st.day].decisions.filter(d => !st.decided.has(d.id)), i = DAYS[st.day].decisions.findIndex(d => d.id === id);
    const next = DAYS[st.day].decisions.slice(i + 1).find(d => !st.decided.has(d.id)) || items.at(-1);
    if (next && st.kbd) host.querySelector(`[data-item="${next?.id}"]`)?.focus({ preventScroll: false }); };

  /* ═══ Init ═══ */
  const init = host => {
    const o = JSON.parse(host.dataset.br || "{}");
    const st = host._st = { _host: host, day: o.day || "quiet", h: o.h, opt: { group: "theme", settle: "leave", seen: "shown", labels: "verb", ...(o.opt || {}) }, decided: new Map(), seen: new Set(), open: {}, unmerged: new Set(), dumps: {}, mode: "brief", narrow: false, railOpen: false, full: null, peek: null };
    const measure = () => { const n = host.clientWidth < NARROW; if (n !== st.narrow) { st.narrow = n; st.railOpen = false; if (st.mode === "brief") render(host); } fit(host); };
    st.narrow = host.clientWidth > 0 && host.clientWidth < NARROW; render(host); new ResizeObserver(measure).observe(host);

    let hoverT, leaveT;
    const peekable = e => st.mode === "brief" && e.target.closest(".nv-scroller [data-open], .ob-peek [data-open]");
    host.addEventListener("pointerover", e => {
      if (st.mode !== "brief") return;
      if (e.target.closest(".ob-peek")) { clearTimeout(leaveT); if (!peekable(e)) return; }
      const a = peekable(e); if (!a) return; clearTimeout(leaveT); clearTimeout(hoverT); if (st.peek?.pinned) return;
      hoverT = setTimeout(() => { if (a.isConnected && !st.peek?.pinned && !a.closest(".ob-peek")) showPeek(host, a.dataset.open, a, false); }, 500);
    });
    host.addEventListener("pointerout", e => { if (st.mode !== "brief") return; clearTimeout(hoverT); const p = st.peek; if (!p || p.pinned) return;
      const to = e.relatedTarget; if (to && (to.closest?.(".ob-peek") || to.closest?.("[data-peeking]"))) return;
      leaveT = setTimeout(() => { if (st.peek && !st.peek.pinned) closePeek(host); }, 250); });

    host.addEventListener("click", e => {
      if (st.mode !== "brief") return;
      const t = e.target, inPeek = t.closest(".ob-peek");
      const el = t.closest("[data-open],[data-full],[data-act],[data-fold],[data-seen],[data-unmerge],[data-retry],[data-go],[data-home],[data-view],[data-back],[data-rail-open],[data-rail-close]");
      if (st.peek && !inPeek && !(el && "open" in el.dataset)) closePeek(host);
      if (!el) return;
      const d = el.dataset;
      if (d.open) { if (st.peek?.id === d.open && st.peek.pinned && !inPeek) { closePeek(host); return; } showPeek(host, d.open, el, true); return; }
      if (d.full) { const ob = O[d.full]; markSeen(st, ob.id); away(host, { frame: "app", type: ob.kind, sel: { [ob.kind]: ob.id }, fromBrief: true }); return; }
      if (d.act === "yes" || d.act === "no") { act(host, el, d.act === "yes"); return; }
      if (d.act === "undo") { const id = el.closest("[data-item]").dataset.item; st.decided.delete(id); render(host); return; }
      if (d.act === "toast-undo") { el.closest(".br8-toast")._undo(); return; }
      if (d.fold) { st.open[d.fold] = el.getAttribute("aria-expanded") !== "true"; render(host); return; }
      if (d.seen) { host.querySelector(`[data-group="${d.seen}"]`).dataset.ids.split(" ").forEach(id => st.seen.add(id)); render(host); return; }
      if (d.unmerge) { st.unmerged.add(d.unmerge); render(host); toast(host, "Unmerged", O[d.unmerge].name, () => { st.unmerged.delete(d.unmerge); render(host); }); return; }
      if (d.retry) { st.dumps[d.retry] = "processing"; render(host); setTimeout(() => { st.dumps[d.retry] = "done"; if (st.mode === "brief") render(host); }, 1800); return; }
      if (d.go) { away(host, { frame: "app", type: d.go }); return; }
      if (d.view) { if (d.view === "columns") away(host, { frame: "columns", pane: "t1" }); return; }
      if ("back" in d) { st.full.pop(); if (!st.full.length) st.full = null; render(host); return; }
      if ("home" in d) { st.full = null; st.railOpen = false; render(host); return; }
      if ("railOpen" in d) { st.railOpen = true; render(host); return; }
      if ("railClose" in d) { st.railOpen = false; render(host); return; }
    });
    // Keys while Briefing has focus: J / K move between decisions, A accepts, O opens what it's about, ⌘Z undoes. No key for Dismiss (DI-009).
    host.addEventListener("keydown", e => {
      if (st.mode !== "brief" || e.target.closest("textarea, input")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { const t = host.querySelector(".br8-toast"); if (t?._undo) { e.preventDefault(); t._undo(); } return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const items = [...host.querySelectorAll(".br8-item[data-item]")], cur = e.target.closest?.(".br8-item"), i = items.indexOf(cur);
      if (e.key === "j" || e.key === "k") { e.preventDefault(); st.kbd = true; const n = items[Math.max(0, Math.min(items.length - 1, i < 0 ? 0 : i + (e.key === "j" ? 1 : -1)))]; n?.focus(); n?.scrollIntoView({ block: "nearest" }); }
      else if (e.key === "a" && cur) { e.preventDefault(); act(host, cur.querySelector('[data-act="yes"]'), true); }
      else if (e.key === "o" && cur) { e.preventDefault(); const r = cur.closest(".br8-g")?.querySelector(":scope > .ob-row [data-open]") || cur.querySelector("[data-open]"); if (r) showPeek(host, r.dataset.open, r, true); }
    });
  };
  document.addEventListener("keydown", e => { if (e.key === "Escape") document.querySelectorAll(".br8-host").forEach(h => { if (h._st?.peek) closePeek(h); if (h._st?.railOpen) { h._st.railOpen = false; render(h); } }); });

  // The day toggle (page chrome): swap a window's day and start it fresh
  window.Brief08 = { reset: (host, patch = {}) => { const st = host._st; Object.assign(st, { decided: new Map(), seen: new Set(), open: {}, unmerged: new Set(), dumps: {}, mode: "brief", full: null, peek: null, ...patch }); render(host); } };
  const start = () => document.querySelectorAll(".br8-host[data-br]").forEach(init);
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", start); else start();
})();
