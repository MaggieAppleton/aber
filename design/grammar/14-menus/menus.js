// Grammar 14: menus, pickers and popovers, live in the type-first default view (rail → list → full view; 06 objects, nav rail).
// One engine for the three kinds: a menu (verbs or a value), a picker (objects, Find focused) and a popover (a small editor).
// Usage: <div class="mn-host" data-mn='{"type":"theory","sel":"t1","h":520,"open":"retire","ch":{"mh":"32"}}'></div>
//   type, sel: what the window shows; chat: 1 opens the chat column; open: a menu shown open on load (not focused);
//   ch: per-window option overrides (mh item height, pt picker tiles, cur current mark). Without ch, a window follows the page's picks.
(() => {
  const A = window.AberObjects, { O, all, tile, row, full, chip, ICON, DAYS } = A;
  const STATUS = { idea: ["Idea", "lightbulb"], building: ["Building", "hammer"], built: ["Built", "check-circle"], shelved: ["Shelved", "archive"] };
  const NAMES = { theme: "Themes", theory: "Theories", prototype: "Prototypes", signal: "Signals", dump: "Dumps" };
  const RAIL = ["theme", "theory", "prototype", "signal", "dump"];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ic = (n, cls = "") => `<i class="ph ph-${n}${cls ? ` ${cls}` : ""}" aria-hidden="true"></i>`;
  const ib = (icon, label, attr = "", key = "") => `<button type="button" class="nv-ib" aria-label="${esc(label)}" data-tip="${esc(label)}"${key ? ` data-key="${key}"` : ""} ${attr}>${ic(icon)}</button>`;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let uid = 0;

  /* ── Choices: each window follows the page's pick (or the recommendation) unless its stage fixes one ── */
  const PICKS = { mh: ["mh", { "A 32": "32", "B 28": "28" }, "32"], pt: ["tiles", { "A Tiles": "tile", "B Bare glyphs": "glyph" }, "tile"], cur: ["current", { "A Check": "check", "B Fill and weight": "fill", "C Raised": "sel", "A+B: check and filled glyph": "ab" }, "ab"] };
  const picked = k => { const [id, map, rec] = PICKS[k]; let v; try { v = JSON.parse(localStorage.getItem(`jig:grammar-14-menus:${id}`))?.choice; } catch {} return map[v] || rec; };

  /* ── The window ── */
  const VIEWS = [["default", "rows", "Default", "⌘1"], ["columns", "columns", "Columns", "⌘2"], ["atlas", "map-trifold", "Atlas", "⌘3"], ["timeline", "chart-scatter", "Timeline", "⌘4"]];
  const switcher = s => `<div class="nv-switch" role="group" aria-label="Views">${VIEWS.map(([v, i, l, k]) =>
    `<button type="button" data-view="${v}" aria-pressed="${v === s.view}" aria-label="${l}" data-tip="${l}" data-key="${k}">${ic(i).replace('class="ph ', `class="ph${v === s.view ? "-fill" : ""} `)}</button>`).join("")}</div>`;
  const count = t => ({ signal: 412, dump: 286 })[t] ?? all(t).filter(o => !o.retired).length;
  const rail = s => `<aside class="nv-rail">
      <div class="nv-brand"><span>Aber</span>${ib("magnifying-glass", "Find", "", "⌘K")}</div>
      <nav class="nv-types" aria-label="Types">
        <button type="button" class="nv-type ob-brief" data-home aria-current="false"><span class="gw">${tile("briefing", ICON.briefing)}</span><span class="nm">Briefing</span></button>${RAIL.map(t => `<button type="button" class="nv-type" data-go="${t}" aria-current="${s.type === t}"><span class="gw">${tile(t, ICON[t])}</span><span class="nm">${NAMES[t]}</span><span class="nv-n">${count(t)}</span></button>`).join("")}</nav>
      ${switcher(s)}</aside>`;

  const themesOf = (s, o) => s.themes[o.id] || o.themes || [];
  const statusOf = (s, o) => s.status[o.id] || o.status;
  const list = s => {
    const t = s.type, cur = s.sel;
    const r = (o, omit = "") => row(o, { act: "sel", cur, omit });
    const group = (label, rows) => rows.length ? `<div class="ob-group">${label ? `<div class="ob-glabel"><span>${label}</span></div>` : ""}${rows.join("")}</div>` : "";
    let tools = "", body = "";
    if (t === "theory") {
      const th = s.tf && O[s.tf];
      tools = `<label class="nv-search"><i class="ph ph-magnifying-glass" aria-hidden="true"></i><input type="search" placeholder="Find a theory" aria-label="Find a theory"></label>
        <button type="button" class="mn-filter${th ? " set" : ""}" data-mn="filter" aria-label="${th ? `Filtered by ${esc(th.name)}` : "Filter by theme"}"${th ? "" : ' data-tip="Filter by theme"'}>${th ? `${ic("funnel").replace('class="ph ', 'class="ph-fill ')}<span>${esc(th.name)}</span>` : ic("funnel")}</button>`;
      const ts = all("theory").filter(o => !s.tf || o.themes.includes(s.tf));
      body = group("Held", ts.filter(o => !o.draft && !o.retired).map(o => r(o))) + group("Drafts", ts.filter(o => o.draft).map(o => r(o, "key")));
      if (!ts.length) body = `<p class="ob-empty">No theories in ${esc(th.name)}</p>`;
    } else if (t === "prototype") {
      body = Object.entries(STATUS).map(([k, [label]]) => group(label, all("prototype").filter(o => statusOf(s, o) === k && !o.draft).map(o => withStatus(s, o, () => r(o, "key"))))).join("");
    } else {
      body = DAYS.map((d, i) => group(d, all(t).filter(o => o.day === i).map(o => r(o, "when")))).join("");
    }
    return `<section class="nv-list ob-list" aria-label="${NAMES[t]}">
        <div class="nv-lhead"><span class="h">${NAMES[t]}</span><span class="nv-meta">${count(t)}</span>${t === "signal" || t === "dump" ? "" : ib("plus", `New ${t}`)}</div>
        ${tools ? `<div class="nv-tools">${tools}</div>` : ""}
        <div class="nv-scroll ob-scroll">${body}</div></section>`;
  };
  // Render with this window's overrides in place (status, themes), then restore the shared data
  const withStatus = (s, o, fn) => { const was = o.status; o.status = statusOf(s, o); try { return fn(); } finally { o.status = was; } };
  const withThemes = (s, o, fn) => { const was = o.themes; o.themes = themesOf(s, o); try { return fn(); } finally { o.themes = was; } };

  const chat = s => s.chat ? `<aside class="mn-chat" aria-label="Dump or ask">
      <div class="mn-thread"><div class="mn-me">What would make the cost-of-intelligence theories wrong?</div>
        <p class="mn-agent">The clearest test is frontier training cost. If it keeps rising, routine work gets cheaper but the frontier stays scarce, which is your rival theory.</p></div>
      <div class="mn-ctx">${s.ctx.map(id => `<span class="ctl-chip ob-chip mn-ctxchip">${A.tileOf(O[id])}<span class="t">${esc(O[id].name)}</span><button type="button" class="rm" aria-label="Stop sharing ${esc(O[id].name)}" data-ctx-rm="${id}">${ic("minus")}</button></span>`).join("")}${ib("crosshair", "Show the agent something", 'data-mn="context"')}</div>
      <div class="mn-composer"><span class="ph-t">Dump anything, or ask</span>${ib("paperclip", "Attach")}${ib("microphone", "Voice dump")}<button type="button" class="nv-btn primary mn-send" aria-label="Send">${ic("paper-plane-right")}</button></div></aside>` : "";

  const frame = s => {
    const o = O[s.sel];
    const main = o.kind === "prototype" ? withStatus(s, o, () => full(o)) : o.kind === "signal" ? withThemes(s, o, () => full(o)) : full(o);
    return `<div class="nv ctl ob-win mn-win" data-v="A" data-fresh="weight" data-align="c" data-challenge="c" data-mh="${s.ch.mh || picked("mh")}" data-pt="${s.ch.pt || picked("pt")}" data-cur="${s.ch.cur || picked("cur")}"
      style="height:${s.h}px;grid-template-columns:var(--nv-rail-w) var(--list-w) minmax(0, 1fr)${s.chat ? " 384px" : ""}">${rail(s)}${list(s)}
      <main class="nv-main"><div class="nv-scroller">${main}</div></main>${chat(s)}${s.toast ? `<div class="mn-toast" role="status"><span class="t">${esc(s.toast)}</span><button type="button" class="mn-undo" data-undo>Undo<kbd>⌘Z</kbd></button></div>` : ""}</div>`;
  };

  // After each render: turn the full view's existing controls into this page's triggers, and add what the rules add
  const wire = (host, s) => {
    const win = host.querySelector(".mn-win"), main = win.querySelector(".nv-main");
    const set = (el, kind) => { if (!el) return; el.dataset.mn = kind; };
    set(main.querySelector('.ob-tools [aria-label="Retire"]'), "retire");
    set(main.querySelector('.ob-tools [aria-label="Merge"]'), "merge");
    // Prototype status: the key line's status becomes the trigger for its menu
    const st = main.querySelector(".ob-head .ob-st");
    if (st) { const b = document.createElement("button"); b.type = "button"; b.className = "ob-st mn-valuebtn"; b.dataset.mn = "status"; b.innerHTML = `${st.innerHTML}${ic("caret-down", "cv")}`; b.setAttribute("aria-label", `Status: ${st.textContent.trim()}`); st.replaceWith(b); }
    // Add evidence: a + at the end of the Supports header (09 rule 12)
    main.querySelectorAll(".ob-sec").forEach(sec => {
      const label = sec.querySelector(".ob-sh > span")?.textContent;
      if (O[s.sel].kind === "theory" && (label === "Supports" || label === "Undermines")) {
        sec.querySelector(".ob-sh").insertAdjacentHTML("beforeend", ib("plus", label === "Supports" ? "Add support" : "Add counter-evidence", `class="nv-ib sm mn-add" data-mn="evidence" data-st="${label === "Supports" ? "+" : "-"}"`));
        const rows = sec.querySelector(".ob-rows");
        (s.added[label] || []).forEach((id, i, arr) => rows.insertAdjacentHTML("beforeend", row(O[id], { rm: `Remove evidence: ${O[id].name}`, cls: i === arr.length - 1 && s.flash ? "mn-just" : "" })));
      }
      sec.querySelectorAll(".ob-slot").forEach(b => { if (b.textContent.trim() === "File in theme") b.dataset.mn = "file"; });
    });
    s.flash = false;
    win.querySelectorAll("[data-mn]").forEach(b => {
      const k = KINDS[SPECS[b.dataset.mn]?.kind];
      b.setAttribute("aria-haspopup", k?.haspopup || "true"); b.setAttribute("aria-expanded", "false"); b.id ||= `mn-t${++uid}`;
    });
  };

  // A render mid-choice keeps the open surface for its 90ms exit, so a pick never makes it vanish
  const render = host => {
    const s = host._s, cur = host._open; host._open = null; const ghost = cur?.pop; ghost?.remove();
    host.innerHTML = frame(s); fit(host); wire(host, s);
    if (ghost && !reduce.matches) { ghost.classList.add("out"); host.querySelector(".mn-win").append(ghost); setTimeout(() => ghost.remove(), 140); }
    window.AberRail?.apply(host, { chat: !!s.chat });
  };
  const local = (base, el) => { const br = base.getBoundingClientRect(), k = br.width / base.offsetWidth || 1, r = el.getBoundingClientRect();
    return { x: (r.left - br.left) / k, y: (r.top - br.top) / k, w: r.width / k, h: r.height / k }; };
  const fit = host => { const el = host.firstElementChild; if (el && host.clientWidth) el.style.zoom = Math.min(1, host.clientWidth / 1280); };

  /* ── The specs: what each trigger opens ── */
  const sigMeta = x => `<span class="mn-meta">${esc(x.src)}</span>`;
  const notDraft = o => !o.draft && !o.retired;
  const SPECS = {
    // Menu: a value (reasons) with no icons, so no icon slot
    retire: { kind: "menu", label: "Retire", groups: () => [{ label: "Retire as", items: [["disproven", "Disproven"], ["superseded", "Superseded"], ["abandoned", "Abandoned"]].map(([id, label]) => ({ id, label })) }],
      pick: (host, s, id) => toast(host, `Retired as ${id}`) },
    // Menu of values: the current one marked (choice 3)
    status: { kind: "menu", label: "Status", radio: true, groups: s => [{ items: Object.entries(STATUS).map(([id, [label, icon]]) => ({ id, label, icon, on: statusOf(s, O[s.sel]) === id })) }],
      pick: (host, s, id) => { s.status[s.sel] = id; render(host); host.querySelector('[data-mn="status"]')?.focus(); } },
    // Picker, single: All themes first, then themes; current marked
    filter: { kind: "picker", label: "Filter by theme", find: "Find a theme", width: 320,
      groups: s => [{ items: [{ id: "", icon: "funnel", label: "All themes", on: !s.tf }] }, { label: "Themes", items: all("theme").filter(notDraft).map(o => ({ id: o.id, o, on: s.tf === o.id, meta: `<span class="mn-meta">${A.all("theory").filter(t => t.themes.includes(o.id) && !t.retired).length}</span>` })) }],
      pick: (host, s, id) => { s.tf = id; render(host); host.querySelector('[data-mn="filter"]')?.focus(); } },
    // Picker: related first (the theory's own themes), linked left out
    evidence: { kind: "picker", label: t => t.dataset.st === "-" ? "Add counter-evidence" : "Add support", find: "Find a signal", width: 360,
      groups: (s, t) => { const th = O[s.sel], linked = new Set([...(th.ev || []).map(e => e.s), ...Object.values(s.added).flat(), ...A.sugsFor(th, "+").map(x => x.s), ...A.sugsFor(th, "-").map(x => x.s)]);
        const pool = all("signal").filter(x => !linked.has(x.id) && !(x.ev || []).some(([id]) => id === th.id)); const near = pool.filter(x => x.themes.some(id => th.themes.includes(id)));
        return [{ label: `In ${O[th.themes[0]].name}`, items: near.map(o => ({ id: o.id, o, meta: sigMeta(o) })) }, { label: "Other signals", items: pool.filter(x => !near.includes(x)).map(o => ({ id: o.id, o, meta: sigMeta(o) })) }]; },
      empty: "Every signal is already linked", none: q => `No signals match “${q}”`,
      pick: (host, s, id, t) => { const k = t.dataset.st === "-" ? "Undermines" : "Supports"; (s.added[k] ||= []).push(id); s.flash = true; render(host); host.querySelector(`[data-mn="evidence"][data-st="${t.dataset.st}"]`)?.focus(); } },
    // Picker, multi: filed themes first and marked; toggling keeps it open; Create when nothing matches exactly
    file: { kind: "picker", label: "File in theme", find: "Find or create a theme", width: 320, multi: true,
      groups: s => { const sig = O[s.sel], on = themesOf(s, sig), was = s.filedAtOpen || on;   // order stays as it was when the picker opened
        return [{ label: "Filed in", items: was.map(id => ({ id, o: O[id], on: on.includes(id) })) }, { label: "Themes", items: all("theme").filter(o => notDraft(o) && !was.includes(o.id)).map(o => ({ id: o.id, o, on: on.includes(o.id) })) }]; },
      create: q => `Create theme “${q}”`,
      pick: (host, s, id) => { const sig = O[s.sel], cur = [...themesOf(s, sig)]; s.themes[sig.id] = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]; chipsNow(host); return "keep"; },
      onCreate: (host, s, q) => { const id = `new-${++uid}`; O[id] = { id, kind: "theme", name: q, signals: 1, themes: [] }; s.themes[s.sel] = [...themesOf(s, O[s.sel]), id]; (s.filedAtOpen ||= []).push(id); chipsNow(host); return "keep"; } },
    // Picker: the same theme first, itself left out; Return merges, with Undo
    merge: { kind: "picker", label: "Merge with", find: "Find a signal", width: 360,
      groups: s => { const sig = O[s.sel], pool = all("signal").filter(x => x.id !== sig.id), near = pool.filter(x => x.themes.some(id => sig.themes.includes(id)));
        return [{ label: `Also in ${O[sig.themes[0]].name}`, items: near.map(o => ({ id: o.id, o, meta: sigMeta(o) })) }, { label: "Other signals", items: pool.filter(x => !near.includes(x)).map(o => ({ id: o.id, o, meta: sigMeta(o) })) }]; },
      none: q => `No signals match “${q}”`,
      pick: (host, s, id) => toast(host, `Merged into “${O[id].name}”`) },
    // Picker: what's on screen first, then recent; anything already shared left out
    context: { kind: "picker", label: "Show the agent", find: "Find anything", width: 360, above: true,
      groups: s => { const here = [s.sel, ...O[s.sel].themes, ...(O[s.sel].ev || []).map(e => e.s)].filter((v, i, a) => O[v] && a.indexOf(v) === i && !s.ctx.includes(v));
        const recent = ["t4", "s3", "p2", "mem", "d1", "t6", "s6"].filter(id => !here.includes(id) && !s.ctx.includes(id));
        return [{ label: "On screen", items: here.map(id => ({ id, o: O[id] })) }, { label: "Recent", items: recent.map(id => ({ id, o: O[id] })) }]; },
      none: q => `Nothing matches “${q}”`,
      pick: (host, s, id) => { s.ctx.push(id); render(host); host.querySelector('[data-mn="context"]')?.focus(); } },
  };
  // The signal's theme chips change in place while the multi-select picker stays open
  const chipsNow = host => {
    const s = host._s, sec = [...host.querySelectorAll(".nv-main .ob-sec")].find(x => x.querySelector(".ob-sh > span")?.textContent === "Themes"); if (!sec) return;
    const box = sec.querySelector(".ob-chips"), slot = box.querySelector('[data-mn="file"]');
    box.querySelectorAll(".ob-chip").forEach(c => c.remove()); slot.insertAdjacentHTML("beforebegin", themesOf(s, O[s.sel]).map(id => chip(O[id])).join(""));
    const n = sec.querySelector(".ob-sh .ob-n"); if (n) n.textContent = themesOf(s, O[s.sel]).length;
  };
  const toast = (host, text) => { const s = host._s; s.toast = text; render(host); clearTimeout(s.toastT); s.toastT = setTimeout(() => { s.toast = null; host.querySelector(".mn-toast")?.remove(); }, 5000); };

  /* ── Builders ── */
  const KINDS = { menu: { role: "menu", haspopup: "menu" }, picker: { role: "dialog", haspopup: "dialog" } };
  const curMark = `<span class="mn-check">${ic("check")}</span>`;
  const glyph = (name, on) => `<span class="mn-ic">${ic(name, "off")}<i class="ph-fill ph-${name} on" aria-hidden="true"></i></span>`;
  const menuHtml = (spec, s, id) => {
    const gs = spec.groups(s);
    return `<div class="mn-pop mn-menu" role="menu" id="${id}" aria-label="${esc(spec.label)}">${gs.map((g, gi) => `${gi ? '<div class="mn-sep" role="separator"></div>' : ""}<div role="group"${g.label ? ` aria-label="${esc(g.label)}"` : ""}>${g.label ? `<div class="mn-label" aria-hidden="true">${esc(g.label)}</div>` : ""}${g.items.map(it =>
      `<button type="button" class="mn-item${it.danger ? " danger" : ""}" role="${spec.radio ? "menuitemradio" : "menuitem"}"${spec.radio ? ` aria-checked="${!!it.on}"` : ""} tabindex="-1" data-id="${it.id}">${it.icon ? glyph(it.icon) : ""}<span class="t">${esc(it.label)}</span>${spec.radio ? curMark : ""}${it.key ? `<kbd>${it.key}</kbd>` : ""}</button>`).join("")}</div>`).join("")}</div>`;
  };
  const pickerHtml = (spec, s, id, label) => `<div class="mn-pop mn-picker" role="dialog" id="${id}" aria-label="${esc(label)}" style="width:${spec.width}px">
      <label class="mn-find">${ic("magnifying-glass")}<input type="text" placeholder="${esc(spec.find)}" aria-label="${esc(spec.find)}" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="${id}-l" autocomplete="off" spellcheck="false"></label>
      <div class="mn-list" role="listbox" id="${id}-l" aria-label="${esc(label)}"${spec.multi ? ' aria-multiselectable="true"' : ""}></div></div>`;
  const optHtml = (spec, it, oid) => {
    const lead = it.o ? A.tileOf(it.o).replace('class="ph ', 'class="ph off ') .replace("</span>", `<i class="ph-fill ph-${ICON[it.o.kind]} on" aria-hidden="true"></i></span>`) : it.create ? `<span class="mn-ic">${ic("plus")}</span>` : glyph(it.icon);
    return `<div class="mn-opt" role="option" id="${oid}" data-id="${esc(it.id)}"${it.create ? " data-create" : ""} aria-selected="${!!it.on}"><span class="mn-lead">${lead}</span><span class="t">${it.create ? esc(it.label) : esc(it.o ? it.o.name : it.label)}</span>${it.meta || ""}${curMark}</div>`;
  };
  const fillList = (cur) => {
    const { spec, pop, s, host } = cur, q = pop.querySelector("input").value.trim(), ql = q.toLowerCase();
    const gs = spec.groups(s, cur.trigger).map(g => ({ ...g, items: g.items.filter(it => !ql || (it.o ? it.o.name : it.label).toLowerCase().includes(ql)) })).filter(g => g.items.length);
    const exact = all("theme").some(o => o.name.toLowerCase() === ql);
    if (spec.create && q && !exact) gs.push({ items: [{ id: `create:${q}`, create: true, label: spec.create(q) }] });
    cur.opts = []; let n = 0;
    const html = gs.map(g => `<div role="group"${g.label ? ` aria-label="${esc(g.label)}"` : ""}>${g.label ? `<div class="mn-label" aria-hidden="true">${esc(g.label)}</div>` : ""}${g.items.map(it => { const oid = `${pop.id}-o${n++}`; cur.opts.push({ oid, it }); return optHtml(spec, it, oid); }).join("")}</div>`).join("");
    const list = pop.querySelector(".mn-list");
    list.innerHTML = html || `<p class="mn-empty">${esc(q ? (spec.none ? spec.none(q) : `Nothing matches “${q}”`) : spec.empty || "Nothing to pick")}</p>`;
    cur.i = Math.min(Math.max(0, cur.i ?? 0), cur.opts.length - 1);
    activate(cur, cur.i, false);
  };
  const activate = (cur, i, scroll = true) => {
    const input = cur.pop.querySelector("input");
    cur.pop.querySelectorAll(".mn-opt.is-active").forEach(o => o.classList.remove("is-active"));
    cur.i = i; const o = cur.opts[i];
    if (!o) { input.removeAttribute("aria-activedescendant"); return; }
    const el = cur.pop.querySelector(`#${CSS.escape(o.oid)}`); el.classList.add("is-active"); input.setAttribute("aria-activedescendant", o.oid);
    if (scroll) el.scrollIntoView({ block: "nearest" });
  };

  /* ── Open, place, close: one transient per window (04 rule 7) ── */
  const place = (win, trig, pop, spec) => {
    const W = win.offsetWidth, H = win.offsetHeight, r = local(win, trig), g = 4, m = 8;
    const list = pop.querySelector(".mn-list");
    const room = { below: H - (r.y + r.h + g) - m, above: r.y - g - m };
    let up = spec.above ? room.above > 160 : pop.offsetHeight > room.below && room.above > room.below;
    if (list) { const fixed = pop.offsetHeight - list.offsetHeight; list.style.maxHeight = `${Math.max(120, Math.min(296, (up ? room.above : room.below) - fixed))}px`; }
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = r.x; if (x + pw > W - m) x = r.x + r.w - pw;   // below-start; at the window's edge, end edges align
    x = Math.max(m, Math.min(W - pw - m, x));
    const y = up ? r.y - g - ph : r.y + r.h + g;
    Object.assign(pop.style, { left: `${x}px`, top: `${Math.max(m, y)}px`, transformOrigin: `${Math.round(r.x + r.w / 2 - x)}px ${up ? "100%" : "0"}` });
  };
  const open = (host, trig, { focus = true } = {}) => {
    const s = host._s, spec = SPECS[trig.dataset.mn]; if (!spec) return;
    close(host, null, true);
    const win = host.querySelector(".mn-win"); win.querySelector(".nv-tip")?.remove();
    const id = `mn-p${++uid}`, label = typeof spec.label === "function" ? spec.label(trig) : spec.label;
    win.insertAdjacentHTML("beforeend", spec.kind === "menu" ? menuHtml(spec, s, id) : pickerHtml(spec, s, id, label));
    const pop = win.lastElementChild;
    const cur = host._open = { pop, trigger: trig, spec, s, host, i: 0, opts: [] };
    trig.setAttribute("aria-expanded", "true"); trig.setAttribute("aria-controls", id);
    s.filedAtOpen = spec.multi ? [...themesOf(s, O[s.sel])] : null;
    if (spec.kind === "picker") fillList(cur);
    place(win, trig, pop, spec);
    if (reduce.matches) pop.classList.add("rm");
    if (spec.kind === "menu") {
      const items = [...pop.querySelectorAll(".mn-item")], on = items.find(b => b.getAttribute("aria-checked") === "true");
      if (focus === "menu") { pop.tabIndex = -1; pop.focus({ preventScroll: true }); }
      else if (focus) (focus === "last" ? items.at(-1) : on || items[0]).focus({ preventScroll: true });
    } else if (focus) pop.querySelector("input").focus({ preventScroll: true });
  };
  // why: "esc" | "pick" | "tab" | "toggle" return focus to the trigger; "outside" leaves it where you clicked; silent skips the exit
  const close = (host, why, silent = false) => {
    const cur = host._open; if (!cur) return;
    host._open = null;
    const { pop, trigger, spec } = cur;
    if (trigger.isConnected) { trigger.setAttribute("aria-expanded", "false"); trigger.removeAttribute("aria-controls"); }
    if (silent || reduce.matches) pop.remove();
    else { pop.classList.add("out"); pop.addEventListener("animationend", () => pop.remove(), { once: true }); setTimeout(() => pop.remove(), 140); }
    const t = trigger.isConnected ? trigger : host.querySelector(`[data-mn="${trigger.dataset.mn}"]`);
    if (why && why !== "outside") t?.focus({ preventScroll: true });
  };
  const choose = (host, el) => {
    const cur = host._open; if (!cur) return;
    const { spec, s, trigger } = cur, id = el.dataset.id;
    if (spec.kind === "picker" && "create" in el.dataset) {
      const q = cur.pop.querySelector("input").value.trim();
      if (spec.onCreate?.(host, s, q) === "keep") { cur.pop.querySelector("input").value = ""; fillList(cur); return; }
    }
    const keep = spec.pick(host, s, id, trigger) === "keep";
    if (keep) { const i = cur.i; fillList(cur); activate(cur, Math.min(i, cur.opts.length - 1)); return; }
    if (host._open === cur) close(host, "pick");
    else host.querySelector(`[data-mn="${trigger.dataset.mn}"]${trigger.dataset.st ? `[data-st="${trigger.dataset.st}"]` : ""}`)?.focus({ preventScroll: true });   // the window re-rendered: focus the new trigger
  };

  /* ── Keys ── */
  const menuKeys = (host, e) => {
    const cur = host._open, items = [...cur.pop.querySelectorAll(".mn-item")], i = items.indexOf(document.activeElement);
    const go = j => { e.preventDefault(); items[(j + items.length) % items.length].focus({ preventScroll: true }); };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i < 0 ? items.length - 1 : i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(items.length - 1);
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(host, "esc"); }
    else if (e.key === "Tab") { e.preventDefault(); close(host, "tab"); }
    else if (e.key === "Enter" || e.key === " ") { if (i >= 0) { e.preventDefault(); choose(host, items[i]); } }
    else if (e.key.length === 1 && /\S/.test(e.key) && !e.metaKey && !e.ctrlKey) {   // typeahead: the next item starting with that letter
      const k = e.key.toLowerCase(), order = [...items.slice(i + 1), ...items.slice(0, i + 1)];
      const hit = order.find(b => b.querySelector(".t").textContent.trim().toLowerCase().startsWith(k)); if (hit) { e.preventDefault(); hit.focus({ preventScroll: true }); }
    }
  };
  const pickerKeys = (host, e) => {
    const cur = host._open, n = cur.opts.length;
    if (e.key === "ArrowDown" && n) { e.preventDefault(); activate(cur, (cur.i + 1) % n); }
    else if (e.key === "ArrowUp" && n) { e.preventDefault(); activate(cur, (cur.i - 1 + n) % n); }
    else if (e.key === "Enter") { e.preventDefault(); const o = cur.opts[cur.i]; if (o) choose(host, cur.pop.querySelector(`#${CSS.escape(o.oid)}`)); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(host, "esc"); }
    else if (e.key === "Tab") { e.preventDefault(); close(host, "tab"); }
  };

  /* ── Tooltips (03 rule 7): name, then key; after 500ms; never over an open menu's trigger ── */
  let tipT;
  document.addEventListener("pointerover", e => { const b = e.target.closest(".mn-win [data-tip]"); if (!b || b.closest(".nv-rail")?.closest("[data-rail='icons']")) return; clearTimeout(tipT); tipT = setTimeout(() => {
    if (!b.isConnected || b.getAttribute("aria-expanded") === "true") return;
    const w = b.closest(".mn-win"); w.querySelector(".nv-tip")?.remove();
    const t = document.createElement("div"); t.className = "nv-tip"; t.setAttribute("role", "tooltip"); t.innerHTML = `<span>${esc(b.dataset.tip)}</span>${b.dataset.key ? `<kbd>${b.dataset.key}</kbd>` : ""}`; w.append(t);
    const r = local(w, b), top = b.closest(".nv-switch, .mn-ctx") ? r.y - t.offsetHeight - 4 : r.y + r.h + 4;
    Object.assign(t.style, { left: `${Math.max(4, Math.min(w.offsetWidth - t.offsetWidth - 4, r.x + r.w / 2 - t.offsetWidth / 2))}px`, top: `${top}px` }); }, 500); });
  document.addEventListener("pointerout", e => { const b = e.target.closest(".mn-win [data-tip]"); if (!b) return; clearTimeout(tipT); b.closest(".mn-win")?.querySelector(".nv-tip:not(.rail)")?.remove(); });

  /* ── Init ── */
  const init = host => {
    const o = JSON.parse(host.dataset.mn || "{}");
    host._s = { type: o.type || O[o.sel || "t1"].kind, sel: o.sel || "t1", h: o.h || 520, chat: !!o.chat, ch: o.ch || {}, view: "default", tf: "", status: {}, themes: {}, added: {}, ctx: o.ctx || ["t1"], toast: null };
    render(host);
    new ResizeObserver(() => { fit(host); const c = host._open; if (c) place(host.querySelector(".mn-win"), c.trigger, c.pop, c.spec); }).observe(host);
    document.fonts.ready.then(() => {
      const sc = o.scroll && host.querySelector(`[data-mn="${o.scroll}"]`), box = host.querySelector(".nv-main .nv-scroller");
      if (sc && box) box.scrollTop = Math.max(0, local(box, sc).y - 96);   // bring a trigger below the fold into view
      const t = o.open && host.querySelector(`[data-mn="${o.open}"]`); if (t) open(host, t, { focus: false });
    });

    host.addEventListener("click", e => {
      const s = host._s, cur = host._open;
      const item = e.target.closest(".mn-item, .mn-opt");
      if (item && cur && cur.pop.contains(item)) { choose(host, item); return; }
      const t = e.target.closest("[data-mn]");
      // From the keyboard a menu focuses its current or first item; from a pointer it takes focus without marking an item
      if (t) { if (cur?.trigger === t) close(host, "toggle"); else open(host, t, { focus: e.detail === 0 || SPECS[t.dataset.mn]?.kind !== "menu" ? true : "menu" }); return; }
      if (cur && cur.pop.contains(e.target)) return;
      const el = e.target.closest("[data-go],[data-sel],[data-view],[data-undo],[data-ctx-rm]"); if (!el) return;
      const d = el.dataset;
      if (d.view) { s.view = d.view; render(host); host.querySelector(`[data-view="${d.view}"]`)?.focus(); return; }
      if ("undo" in d) { s.toast = null; host.querySelector(".mn-toast")?.remove(); return; }
      if (d.ctxRm) { s.ctx = s.ctx.filter(x => x !== d.ctxRm); render(host); host.querySelector('[data-mn="context"]')?.focus(); return; }
      if (d.go) { s.type = d.go; s.sel = d.go === "theory" ? "t1" : d.go === "prototype" ? "p1" : d.go === "signal" ? "s1" : d.go === "dump" ? "d1" : "coi"; }
      if (d.sel) s.sel = d.sel;
      render(host);
    });
    // Outside: a press anywhere else in the window closes without moving focus
    host.addEventListener("pointerdown", e => { const cur = host._open; if (cur && !cur.pop.contains(e.target) && !cur.trigger.contains(e.target)) close(host, "outside"); });
    host.addEventListener("keydown", e => {
      const cur = host._open;
      if (cur && cur.pop.contains(e.target)) { (cur.spec.kind === "menu" ? menuKeys : pickerKeys)(host, e); return; }
      const t = e.target.closest?.("[data-mn]");
      if (t && !cur && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); open(host, t, { focus: e.key === "ArrowUp" ? "last" : true }); }
      if (cur && e.key === "Escape") { e.preventDefault(); close(host, "esc"); }
    });
    host.addEventListener("pointermove", e => {
      const cur = host._open; if (!cur) return;
      const it = e.target.closest(".mn-item"); if (it && cur.pop.contains(it) && document.activeElement !== it) it.focus({ preventScroll: true });
      const op = e.target.closest(".mn-opt"); if (op && cur.pop.contains(op)) { const i = cur.opts.findIndex(x => x.oid === op.id); if (i !== cur.i) activate(cur, i, false); }
    });
    host.addEventListener("input", e => { const cur = host._open; if (cur && e.target.closest(".mn-find")) { cur.i = 0; fillList(cur); } });
    host.addEventListener("focusout", e => { const cur = host._open; if (cur && e.relatedTarget && !host.contains(e.relatedTarget)) close(host, "outside"); });
  };
  document.addEventListener("jig:change", () => document.querySelectorAll(".mn-host").forEach(h => { if (h._s && !Object.keys(h._s.ch).length) render(h); }));
  window.Menus14 = { open: (host, kind) => { const t = host.querySelector(`[data-mn="${kind}"]`); if (t) open(host, t); }, close };
  const start = () => document.querySelectorAll(".mn-host[data-mn]").forEach(init);
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", start); else start();
})();
