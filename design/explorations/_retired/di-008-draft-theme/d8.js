// DI-008 jig: builds each stage from one data set, then makes accept / rephrase / discard / undo live.
(() => {
  const P = window.D8_ICONS;
  const svg = (n, s = 16) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="${P[n]}"></path></svg>`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Real demo data (Robotics, its draft theory) plus mine neighbours from the live current view.
  const THEMES = [
    { id: "personal", name: "Personal software", signals: 2, cards: [
      { claim: "Most software is made for an audience of one", conf: 3, bal: [1, 0], protos: 1 },
      { claim: "Software is priced per outcome, not per seat", draft: true, bal: [1, 0] } ] },
    { id: "identity", name: "Agent identity", signals: 1, cards: [] },
    { id: "robotics", name: "Robotics", signals: 2, draft: true, fresh: true,
      from: { icon: "mic", what: "voice note", title: "Recovery rehearsal", ago: "2h", at: "Today, 10:52" },
      cards: [{ claim: "Warehouse picking robots still need human recovery at least weekly in 2028", draft: true, bal: [1, 0], protos: 1 }] },
    { id: "humanoid", name: "Humanoid robots in last-mile logistics and warehouse fulfilment", signals: 1, draft: true, hypothetical: true,
      from: { icon: "tray", what: "link", title: "a saved article", ago: "1d", at: "Yesterday, 18:20" }, cards: [] },
    { id: "funding", name: "AI funding cycle", signals: 3, cards: [
      { claim: "Frontier intelligence stays scarce and expensive", conf: 2, bal: [1, 0], ghost: 1 },
      { claim: "Labs face a funding correction before agents pay their way", conf: 2, bal: [1, 0] } ] },
  ];
  const byId = Object.fromEntries(THEMES.map(t => [t.id, t]));
  const theoryCount = t => t.cards.length || "";

  /* ── Markup builders (mirroring current.tsx, atoms.tsx and draft-edge.tsx output) ── */
  const conf = n => `<span class="ap-conf" role="img" aria-label="Confidence ${n} of 5">${[1, 2, 3, 4, 5].map(i => `<i${i <= n ? ' data-on=""' : ""}></i>`).join("")}</span>`;
  const card = (c, v) => {
    const d = c.draft ? ' data-draft=""' : "";
    const meta = `${c.conf ? conf(c.conf) : ""}<span class="ap-balance" role="img" aria-label="${c.bal[0]} support, ${c.bal[1]} undermine"><span class="ap-num">+${c.bal[0]}</span><span class="ap-num ap-neg">−${c.bal[1]}</span></span>${c.protos ? `<span class="ap-muted ap-inline">${svg("proto", 12)}${c.protos}</span>` : ""}${c.ghost ? `<span class="ap-ghost-badge">${c.ghost}</span>` : ""}`;
    const acts = !c.draft ? "" : v !== "current" ? `<span class="d8-edge d8-card-edge" role="group" aria-label="Draft theory actions"><button type="button" class="d8-tbtn" data-act="card-discard" data-tip="Discard draft theory">Discard</button><button type="button" class="d8-tbtn" data-primary data-act="card-accept" aria-keyshortcuts="a" data-tip="Accept draft theory" data-key="A">Accept</button></span>` : `<span class="ab-edge-acts"><button type="button" class="ab-mini" data-edge="no" data-act="card-discard" aria-label="Discard draft (X)" data-tip="Discard draft" data-key="X">${svg("x", 14)}</button><button type="button" class="ab-mini" data-edge="yes" data-act="card-accept" aria-label="Accept draft (A)" data-tip="Accept draft" data-key="A">${svg("check", 14)}</button></span>`;
    return `<div class="cur-card"><div class="ab-edge-host"${d}><div class="ap-card"${d} data-edge-card="" role="button" tabindex="0"><div class="ap-card-claim">${esc(c.claim)}</div><div class="ap-card-meta">${meta}</div></div>${acts}</div></div>`;
  };
  const cards = (t, v) => t.cards.length ? `<div class="cur-cards">${t.cards.map(c => card(c, v)).join("")}</div>` : "";
  const signals = n => `${n} ${n === 1 ? "signal" : "signals"}`;
  const plus = `<button type="button" class="ap-iconbtn" aria-label="State a theory" data-tip="State a theory">${svg("plus")}</button>`;
  const discardTip = t => `Discard draft theme. ${signals(t.signals)} become unthemed`;
  const nameBtn = (t, name, attrs = "") => `<button type="button" class="ap-h cur-theme-name cur-theme-btn" data-name aria-keyshortcuts="${t.draft ? "a r" : ""}"${attrs}>${esc(name)}</button>`;
  const fromText = f => `Drafted from your ${f.what}`;

  function section(v, t, st) {
    const name = st.names[t.id] || t.name;
    const state = !t.draft ? "" : st.theme[t.id] === "mine" ? "mine" : "draft";
    const force = st.force && t.id === "robotics" ? ` data-force="${st.force}"` : "";
    const head = extra => `<div class="cur-theme">${nameBtn(t, name, extra)}<span class="ap-muted ap-num">${signals(t.signals)}</span>${plus}</div>`;
    let inner;
    if (v === "current") {
      inner = `<div class="cur-theme">${nameBtn(t, name, t.draft && state === "draft" ? ' data-draft=""' : "")}<span class="ap-muted ap-num">${signals(t.signals)}</span>${plus}</div>${cards(t, v)}`;
    } else if (v === "a") {
      const f = t.from;
      inner = head(t.draft ? ' data-d8-draft=""' : "") + (t.draft ? `<div class="d8a-meta"><div><div class="d8a-meta-in">
        <span class="d8a-from" data-tip="From your ${esc(f.what)} “${esc(f.title)}”">${svg(f.icon, 12)}${fromText(f)}</span><span class="ap-num" data-tip="${esc(f.at)}">${f.ago}</span>
        <span class="d8a-acts"><button type="button" class="ap-iconbtn" data-act="rephrase" aria-label="Rephrase (R)" aria-keyshortcuts="r" data-tip="Rephrase" data-key="R">${svg("pencil")}</button><button type="button" class="ap-btn" data-act="discard" data-tip="${esc(discardTip(t))}">Discard</button><button type="button" class="ap-btn" data-primary data-act="accept" aria-keyshortcuts="a" data-tip="Accept draft theme" data-key="A">Accept</button></span>
      </div></div></div>` : "") + cards(t, v);
    } else if (v === "b") {
      if (!t.draft) inner = head() + cards(t, v);
      else {
        const f = t.from;
        inner = `<div class="d8b-shell"><span class="d8-edge d8b-edge" role="group" aria-label="Draft theme actions">
          <button type="button" data-act="rephrase" aria-label="Rephrase (R)" aria-keyshortcuts="r" data-tip="Rephrase" data-key="R">${svg("pencil", 14)}</button><button type="button" class="d8-tbtn" data-act="discard" data-tip="${esc(discardTip(t))}">Discard</button><button type="button" class="d8-tbtn" data-primary data-act="accept" aria-keyshortcuts="a" data-tip="Accept draft theme" data-key="A">Accept</button></span>
          <div class="cur-theme">${nameBtn(t, name)}<span class="ap-muted ap-num">${signals(t.signals)}</span><span class="d8b-from" tabindex="0" role="img" aria-label="${esc(fromText(f))}, ${f.ago} ago" data-tip="Drafted from your ${esc(f.what)} “${esc(f.title)}”, ${f.ago} ago">${svg(f.icon, 13)}</span>${plus}</div>${cards(t, v)}</div>`;
      }
    } else { // c: only mine (or accepted) themes render as sections
      inner = head() + cards(t, v);
    }
    return `<div class="d8-collapse" data-k="${t.id}"${st.gone[t.id] ? " data-gone" : ""}><div><section class="cur-section" data-theme="${t.id}"${state ? ` data-state="${state}"` : ""}${force} data-flip="${t.id}">${inner}</section></div></div>`;
  }

  function draftRow(t, st) {
    const name = st.names[t.id] || t.name, f = t.from, open = st.open[t.id];
    const n = t.cards.length;
    return `<div class="d8-collapse" data-k="${t.id}"${st.gone[t.id] ? " data-gone" : ""}><div><div class="d8c-row" data-theme="${t.id}" data-state="draft" data-flip="${t.id}"${open ? " data-open" : ""}${st.force && t.id === "robotics" ? ` data-force="${st.force}"` : ""}>
      <div class="d8c-row-head">
        <span class="d8c-title">${nameBtn(t, name)}<span class="ap-muted ap-num">${signals(t.signals)}</span><span class="ap-muted ap-num">${n ? `${n} ${n === 1 ? "theory" : "theories"}` : "No theory yet"}</span><button type="button" class="ap-iconbtn d8c-toggle" data-act="toggle" aria-expanded="${!!open}" aria-label="${open ? "Hide" : "Show"} its theories">${svg("chevron", 12)}</button></span>
        <span class="d8c-side"><span class="d8a-from" data-tip="From your ${esc(f.what)} “${esc(f.title)}”">${svg(f.icon, 12)}${esc(f.what[0].toUpperCase() + f.what.slice(1))}</span><span class="ap-num" data-tip="${esc(f.at)}">${f.ago}</span>
        <span class="d8a-acts"><button type="button" class="ap-iconbtn" data-act="rephrase" aria-label="Rephrase (R)" aria-keyshortcuts="r" data-tip="Rephrase" data-key="R">${svg("pencil")}</button><button type="button" class="ap-btn" data-act="discard" data-tip="${esc(discardTip(t))}">Discard</button><button type="button" class="ap-btn" data-primary data-act="accept" aria-keyshortcuts="a" data-tip="Accept draft theme" data-key="A">Accept</button></span></span>
      </div>
      <div class="d8c-body"><div>${n ? cards(t, "c") : `<p class="d8c-empty">No theory yet.</p>`}</div></div>
    </div></div></div>`;
  }

  function sidebar(v, st) {
    const row = t => {
      const name = st.names[t.id] || t.name, draft = t.draft && v !== "current";
      const mine = st.theme[t.id] === "mine";
      return `<div class="d8-sb" data-k="${t.id}"${st.gone[t.id] ? " data-gone" : ""} data-flip="sb-${t.id}"><a href="#" data-theme="${t.id}"${draft ? ' data-d8-draft=""' : ""}${draft && mine ? " data-mine" : ""}><span data-sbname>${esc(name)}</span>${t.fresh ? '<span class="ap-mark" role="img" data-kind="fresh" title="New since you last looked" aria-label="New since you last looked"></span>' : ""}<span class="ap-muted ap-num">${theoryCount(t)}</span></a></div>`;
    };
    let rows;
    if (v === "c") {
      const mine = THEMES.filter(t => !t.draft || st.theme[t.id] === "mine"), drafts = THEMES.filter(t => t.draft && st.theme[t.id] !== "mine" && !st.gone[t.id]);
      const order = [...mine.filter(t => !t.draft), ...mine.filter(t => t.draft).sort((a, b) => st.acceptedAt[a.id] - st.acceptedAt[b.id])];
      rows = order.map(row).join("") + (drafts.length ? `<div class="ap-label d8-sb-label" data-flip="sb-drafts">Drafts</div>` + drafts.map(row).join("") : "");
    } else rows = THEMES.map(row).join("");
    return `<aside class="cur-rail" data-sidebar="" aria-label="Theme sidebar"><div class="cur-sidebar-body"><div class="cur-brand"><span>Aber</span>
      <button type="button" class="ap-iconbtn" aria-label="Find (⌘K)" data-tip="Find" data-key="⌘K">${svg("search")}</button><button type="button" class="ap-iconbtn" aria-label="New theme" data-tip="New theme">${svg("plus")}</button><button type="button" class="ap-iconbtn" aria-label="Collapse theme sidebar" data-tip="Collapse sidebar">${svg("sidebar")}</button></div>
      <div class="cur-sidebar-scroll ap-scroll"><nav class="cur-index" aria-label="Themes">${rows}</nav></div></div></aside>`;
  }

  function mainHtml(v, st, only) {
    const list = only ? THEMES.filter(t => only.includes(t.id)) : THEMES;
    if (v !== "c") return list.map(t => section(v, t, st)).join("");
    const mine = list.filter(t => !t.draft), accepted = list.filter(t => t.draft && st.theme[t.id] === "mine").sort((a, b) => st.acceptedAt[a.id] - st.acceptedAt[b.id]);
    const drafts = list.filter(t => t.draft && st.theme[t.id] !== "mine");
    const live = drafts.filter(t => !st.gone[t.id]).length;
    return [...mine, ...accepted].map(t => section(v, t, st)).join("") + (drafts.length ? `<div class="d8c-group" data-flip="drafts"><div class="d8c-head"><span class="ap-label">Drafts</span><span class="ap-label ap-num" data-count>${live || ""}</span></div><div class="d8c-list">${drafts.map(t => draftRow(t, st)).join("")}</div></div>` : "");
  }

  /* ── Stages ── */
  const stages = new Map();
  const freshState = () => ({ theme: {}, names: {}, gone: {}, open: {}, acceptedAt: {}, force: null });
  function build(el, st) {
    const v = el.dataset.variant, layout = el.dataset.layout;
    const only = el.dataset.only ? el.dataset.only.split(",") : null;
    const full = layout === "full";
    el.innerHTML = `<div class="ap ab-production${full ? "" : " d8-mainonly"}"><div class="ap cur d8${v}" data-hosted=""${el.dataset.edge ? ` data-edge="${el.dataset.edge}"` : ""}>${full ? sidebar(v, st) : ""}<main class="cur-main">${mainHtml(v, st, only)}</main></div>
      <div class="d8-toast-slot"><div class="d8-toast" data-hidden role="status" aria-live="polite"><span class="d8-toast-text"></span><button type="button" class="d8-toast-undo">Undo</button></div></div></div>`;
    if (!full) el.classList.add("d8-mainonly");
  }
  function mount(el) {
    const st = freshState();
    const preset = el.dataset.preset;
    if (preset === "mine") st.theme.robotics = "mine", st.acceptedAt.robotics = 1;
    if (preset === "hover") st.force = "hover";
    if (preset === "gone") st.gone.robotics = true;
    stages.set(el, st);
    build(el, st);
    if (preset === "editing") startRename(el, el.querySelector('[data-theme="robotics"] [data-name]'), false);
    if (preset === "gone") toast(el, `<b>Robotics</b> discarded. Its 2 signals are unthemed; its draft theory stays a draft.`, null, true);
  }

  // FLIP: re-render, then slide every keyed element from where it was.
  function rebuild(el, focusKey) {
    const before = new Map([...el.querySelectorAll("[data-flip]")].map(n => [n.dataset.flip, n.getBoundingClientRect()]));
    build(el, stages.get(el));
    if (reduce) return;
    for (const n of el.querySelectorAll("[data-flip]")) {
      const a = before.get(n.dataset.flip); if (!a) continue;
      const b = n.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      n.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
    }
    if (focusKey) el.querySelector(`[data-theme="${focusKey}"] [data-name]`)?.focus({ preventScroll: true });
  }

  /* ── Toast ── */
  function toast(el, html, undo, sticky) {
    const t = el.querySelector(".d8-toast"); if (!t) return;
    t.querySelector(".d8-toast-text").innerHTML = html;
    const u = t.querySelector(".d8-toast-undo");
    u.hidden = !undo && !sticky; u.onclick = () => { hideToast(el); undo ? undo() : reset(el); };
    t.removeAttribute("data-hidden");
    clearTimeout(t._timer);
    if (!sticky) t._timer = setTimeout(() => { if (!t.matches(":hover")) hideToast(el); }, 6000);
  }
  const hideToast = el => el.querySelector(".d8-toast")?.setAttribute("data-hidden", "");

  /* ── Actions ── */
  const secOf = n => n.closest("[data-theme]");
  const sbRow = (el, id) => el.querySelector(`.cur-index a[data-theme="${id}"]`);
  function accept(el, id, how = "accepted") {
    const st = stages.get(el), v = el.dataset.variant, name = st.names[id] || byId[id].name;
    if (v === "current" || st.theme[id] === "mine") return;
    st.theme[id] = "mine"; st.acceptedAt[id] = Date.now(); st.force = null;
    if (v === "c") rebuild(el, id);
    else {
      const sec = el.querySelector(`section[data-theme="${id}"]`);
      sec.dataset.state = "mine"; sec.removeAttribute("data-force");
      sec.setAttribute("data-settling", ""); setTimeout(() => sec.removeAttribute("data-settling"), 400);
      sbRow(el, id)?.setAttribute("data-mine", "");
      sec.querySelector("[data-name]")?.focus({ preventScroll: true });
    }
    const n = byId[id].cards.length;
    toast(el, `<b>${esc(name)}</b> is yours${how === "rephrased" ? ", renamed" : ""}.${n ? ` Its theory is still a draft.` : ""}`, () => unaccept(el, id));
  }
  function unaccept(el, id) {
    const st = stages.get(el); delete st.theme[id];
    if (el.dataset.variant === "c") return rebuild(el);
    const sec = el.querySelector(`section[data-theme="${id}"]`); sec.dataset.state = "draft";
    sbRow(el, id)?.removeAttribute("data-mine");
  }
  function discard(el, id) {
    const st = stages.get(el), name = st.names[id] || byId[id].name, t = byId[id];
    st.gone[id] = true;
    for (const n of el.querySelectorAll(`[data-k="${id}"]`)) n.setAttribute("data-gone", "");
    const c = el.querySelector("[data-count]"); if (c) c.textContent = THEMES.filter(x => x.draft && st.theme[x.id] !== "mine" && !st.gone[x.id]).length || "";
    const next = [...el.querySelectorAll("[data-name]")].find(n => !n.closest("[data-gone]"));
    next?.focus({ preventScroll: true });
    toast(el, `<b>${esc(name)}</b> discarded. Its ${signals(t.signals)} ${t.signals === 1 ? "is" : "are"} unthemed${t.cards.length ? "; its draft theory stays a draft" : ""}.`, () => {
      delete st.gone[id];
      for (const n of el.querySelectorAll(`[data-k="${id}"]`)) n.removeAttribute("data-gone");
      if (c) c.textContent = THEMES.filter(x => x.draft && st.theme[x.id] !== "mine" && !st.gone[x.id]).length || "";
    });
  }
  function startRename(el, btn, select = true) {
    if (!btn || el.dataset.variant === "current") return;
    const sec = secOf(btn), id = sec.dataset.theme, st = stages.get(el);
    const old = btn.textContent, input = document.createElement("input");
    input.className = "d8-rename"; input.value = old; input.size = Math.max(4, old.length); input.setAttribute("aria-label", "Theme name");
    btn.replaceWith(input); sec.dataset.state = "editing";
    if (select) { input.focus(); input.select(); }
    let done = false;
    const finish = commit => {
      if (done) return; done = true;
      const val = input.value.trim();
      const changed = commit && val && val !== old;
      if (changed) st.names[id] = val;
      const b = document.createElement("div"); b.innerHTML = nameBtn(byId[id], changed ? val : old, el.dataset.variant === "a" ? ' data-d8-draft=""' : "");
      const nb = b.firstChild; input.replaceWith(nb); sec.dataset.state = "draft";
      if (changed) {
        el.querySelectorAll(`.cur-index a[data-theme="${id}"] [data-sbname]`).forEach(n => n.textContent = val);
        accept(el, id, "rephrased");
      } else nb.focus({ preventScroll: true });
    };
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); finish(true); }
      if (e.key === "Escape") { e.preventDefault(); finish(false); }
      e.stopPropagation();
    });
    input.addEventListener("input", () => { input.size = Math.max(4, input.value.length); });
    input.addEventListener("blur", () => finish(true));
  }
  function reset(el) { el.querySelectorAll(".d8-toast").forEach(t => clearTimeout(t._timer)); mount(el); }

  function onClick(e) {
    const el = e.currentTarget, b = e.target.closest("[data-act], a[href='#']");
    if (!b) return;
    if (b.matches("a")) { e.preventDefault(); return; }
    const id = secOf(b)?.dataset.theme, act = b.dataset.act;
    if (act === "accept") accept(el, id);
    else if (act === "discard") discard(el, id);
    else if (act === "rephrase") startRename(el, secOf(b).querySelector("[data-name]"));
    else if (act === "toggle") { const st = stages.get(el); st.open[id] = !st.open[id]; const row = secOf(b); row.toggleAttribute("data-open", st.open[id]); b.setAttribute("aria-expanded", String(!!st.open[id])); b.setAttribute("aria-label", `${st.open[id] ? "Hide" : "Show"} its theories`); }
    else if (act === "card-accept") { const host = b.closest(".ab-edge-host"); host.removeAttribute("data-draft"); host.querySelector(".ap-card").removeAttribute("data-draft"); host.setAttribute("data-settling", ""); b.parentElement.remove(); host.querySelector(".ap-card").focus({ preventScroll: true }); setTimeout(() => host.removeAttribute("data-settling"), 400); toast(el, "Theory accepted.", null); }
    else if (act === "card-discard") { const host = b.closest(".ab-edge-host"); host.setAttribute("data-leaving", ""); setTimeout(() => host.closest(".cur-card").remove(), reduce ? 0 : 180); toast(el, "Draft theory discarded.", null); }
  }
  function onKey(e) {
    const el = e.currentTarget, t = e.target;
    if (e.metaKey || e.ctrlKey || e.altKey || t.matches("input")) return;
    const key = e.key.toLowerCase(), sec = secOf(t);
    if (t.matches("[data-name]") && sec && byId[sec.dataset.theme]?.draft && sec.dataset.state === "draft" || t.matches("[data-name]") && sec?.matches(".d8c-row")) {
      const id = sec.dataset.theme;
      if (key === "a") { e.preventDefault(); accept(el, id); }
      if (key === "r") { e.preventDefault(); startRename(el, t); }
    } else if (t.matches(".ap-card[data-draft]")) {
      const host = t.closest(".ab-edge-host");
      if (key === "a") host.querySelector('[data-act="card-accept"]')?.click();
      if (key === "x" && el.dataset.variant === "current") host.querySelector('[data-act="card-discard"]')?.click(); // Current mirrors the app as shipped
    }
  }

  /* ── Tooltip (app .ab-tooltip, shown after a short dwell or immediately on keyboard focus) ── */
  const tip = document.createElement("div"); tip.className = "d8-tip"; tip.hidden = true;
  tip.innerHTML = `<div class="ab-tooltip" data-side="top"><span class="d8-tip-text"></span><span class="ab-tooltip-key"></span></div>`;
  let tipTimer;
  const showTip = (n, now) => {
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => {
      tip.querySelector(".d8-tip-text").textContent = n.dataset.tip;
      const k = tip.querySelector(".ab-tooltip-key"); k.textContent = n.dataset.key || ""; k.hidden = !n.dataset.key;
      tip.hidden = false;
      const r = n.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px`;
      tip.style.top = `${r.top - h - 6}px`;
    }, now ? 0 : 450);
  };
  const hideTip = () => { clearTimeout(tipTimer); tip.hidden = true; };

  /* ── States grid ── */
  const STATES = [
    ["draft", "Draft", "at rest"],
    ["hover", "Draft", "hover / focus"],
    ["editing", "Rephrasing", "name editable in place"],
    ["mine", "Mine", "after accept"],
    ["gone", "Discarded", "consequence + Undo"],
  ];
  function stateGrid() {
    const grid = document.getElementById("state-grid");
    const variants = [["current", "Current"], ["a", "A"], ["b", "B"], ["c", "C"]];
    grid.innerHTML = STATES.map(([key, title, sub]) => `<div class="d8-state-row"><h3>${title}<small>${sub}</small></h3>${variants.map(([v, label]) => {
      if (v === "current" && (key === "editing" || key === "gone")) return `<div class="d8-cell" data-col="${label}"><div class="d8-nd">Not designed here: rename and discard happen in the pane</div></div>`;
      return `<div class="d8-cell" data-col="${label}"><div class="jig-stage" data-stage="st-${key}-${v}" data-variant="${v}" data-layout="cell" data-only="identity,robotics" data-preset="${key}" style="${key === "gone" ? "min-height:150px" : ""}"></div></div>`;
    }).join("")}</div>`).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.body.append(tip);
    stateGrid();
    for (const el of document.querySelectorAll("[data-stage]")) {
      mount(el);
      el.addEventListener("click", onClick);
      el.addEventListener("keydown", onKey);
      el.addEventListener("dblclick", e => { const n = e.target.closest("[data-name]"); if (n && secOf(n)?.dataset.state === "draft") startRename(el, n); });
    }
    document.addEventListener("pointerover", e => { const n = e.target.closest("[data-tip]"); if (n) showTip(n); });
    document.addEventListener("pointerout", e => { if (e.target.closest("[data-tip]")) hideTip(); });
    document.addEventListener("focusin", e => { const n = e.target.closest("[data-tip]"); if (n && n.matches(":focus-visible")) showTip(n, true); else hideTip(); });
    document.addEventListener("focusout", hideTip);
    addEventListener("scroll", hideTip, { passive: true });
    for (const b of document.querySelectorAll("[data-reset]")) b.addEventListener("click", () => reset(document.querySelector(`[data-stage="${b.dataset.reset}"]`)));
    for (const b of document.querySelectorAll("[data-dial]")) b.addEventListener("click", () => {
      const stage = document.querySelector('[data-stage="ctx-a"]');
      b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      stage.dataset.edge = b.dataset.value; stage.querySelector(".cur").dataset.edge = b.dataset.value;
    });
  });
})();
