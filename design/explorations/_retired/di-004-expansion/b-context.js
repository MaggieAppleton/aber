// DI-004/005, in context: provenance popovers, popovers beside the docked B pane, and the two open
// decisions (shared grammar, action placement) shown as working panes. Stages here use data-pstage,
// so app.js leaves them alone. One popover manager serves the whole page: one transient layer at a time.
(() => {
  const W = window.WORLD, { ic, esc, markQuote, when, kindName, dumpIcon, theme, claim, wordsOf } = window.DI4;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const isNarrow = () => matchMedia("(max-width: 700px)").matches;
  const POP_API = typeof HTMLElement.prototype.showPopover === "function";
  const FOCUSABLE = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";
  let uid = 0;
  const nid = p => `${p}-${++uid}`;

  /* ── Data ── */
  const sig = id => W.signal(id);
  const dumpOf = s => W.dump(s.dump);
  const srcOf = s => s.sources[0];
  const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
  const sentences = t => t.match(/[^.!?]+[.!?]+["”’)]*\s*|[^.!?]+$/g) || [t];
  // Maggie's words in context: the sentences holding the quote, plus `pad` sentences either side.
  function excerpt(s, pad) {
    const d = dumpOf(s), p = W.passageFor(s);
    if (!p) return { html: esc(sentences(d.paras[0].text).slice(0, 2).join("").trim()), real: false, pi: 0, d };
    const ss = sentences(p.text), frags = (p.quote || "").split("…").map(q => q.trim().replace(/\.$/, "")).filter(q => q.length > 8);
    const hits = ss.map((x, i) => frags.some(f => x.includes(f)) ? i : -1).filter(i => i >= 0);
    const a = Math.max(0, (hits[0] ?? 0) - pad), b = Math.min(ss.length - 1, (hits.at(-1) ?? 1) + pad);
    return { html: markQuote(ss.slice(a, b + 1).join("").trim(), p.quote), real: true, pi: d.paras.indexOf(p), d };
  }
  // The quote alone, for the compact chain: the words this signal came from, with no surrounding sentences.
  function quoteOnly(s) {
    const p = W.passageFor(s);
    return p && p.quote ? { html: `“${esc(p.quote.trim())}”`, real: true } : excerpt(s, 0);
  }
  const kindOne = d => d.kind === "voice" ? "Voice note" : "Capture";
  const originLine = s => { const d = dumpOf(s), x = srcOf(s); return `${kindOne(d)}, ${when(d)}${x ? `, via ${x.author}` : ""}`; };
  const madeSignals = d => d.produced.filter(id => sig(id));

  /* ── Popover pieces (14px text, 16px icons in 24px tiles, 40px rows) ── */
  const tile = (name, extra = "") => `<span class="xp-tile"${extra}>${ic(name, 16)}</span>`;
  const ILLUS = `<p class="xp-illus">The highlight is illustrative: the app stores which dump a signal came from, not which words.</p>`;
  const srcLink = s => {
    const x = srcOf(s);
    if (!x) return `<p class="xp-plain">Your own observation, no external source</p>`;
    return `<a class="xp-link" href="${x.url}" target="_blank" rel="noreferrer"><span class="xp-row-text"><span><b>${esc(x.author)}</b> <span class="xp-muted">${esc(x.domain)}, ${esc(x.date)}</span></span><span class="xp-sub">${esc(x.title)}</span></span>${ic("arrow-square-out", 16)}</a>`;
  };
  const openDumpLink = (d, sub = true) => `<button class="xp-link" data-pact="open-dump" data-d="${d.id}"><span class="xp-row-text"><span>Open the ${d.kind === "voice" ? "voice note" : "dump"}</span>${sub ? `<span class="xp-sub">Made ${plural(madeSignals(d).length, "signal")}</span>` : ""}</span>${ic("arrow-right", 16)}</button>`;
  const themeLink = t => `<button class="xp-link" data-pact="open-theme" data-t="${t}"><span class="xp-row-text">${esc(theme(t))}</span>${ic("arrow-right", 16)}</button>`;
  const stanceText = e => `${e.stance === "supports" ? "Supports" : "Undermines"}${e.suggested ? ", suggested" : ""}`;
  const evLink = e => `<button class="xp-link" data-pact="open-theory" data-t="${e.theory}"${e.suggested ? " data-suggested" : ""}><span class="xp-row-text"><span>${esc(claim(e.theory))}</span><span class="xp-sub">${stanceText(e)}</span></span>${ic("arrow-right", 16)}</button>`;
  const none = t => `<p class="xp-plain xp-muted">${t}</p>`;
  const step = (icon, label, body, attrs = "") => `<li class="xp-step"${attrs}>${tile(icon)}<div class="xp-main"><div class="xp-k">${label}</div>${body}</div></li>`;

  // The provenance chain, in C's order: source, Maggie's words, this signal, filed in, evidence for.
  function chain(s, { withThis = true, themes = s.themes, ev = s.evidence } = {}) {
    const d = dumpOf(s), e = quoteOnly(s);
    return `<ol class="xp-chain" aria-label="Provenance">
      ${step("link", "Source", srcLink(s))}
      ${step(dumpIcon(d), `${kindName(d)}, ${esc(when(d))}`, `<blockquote class="xp-quote">${e.html}</blockquote>${e.real ? ILLUS : ""}${openDumpLink(d)}`)}
      ${withThis ? step("pulse", "This signal", `<p class="xp-plain">${esc(s.gist)}</p>`, " data-this") : ""}
      ${step("binoculars", "Filed in", themes.map(themeLink).join("") || none("Not filed"))}
      ${step("target", "Evidence for", ev.map(evLink).join("") || none("No theory yet"))}
    </ol>`;
  }
  // B: Maggie's passage first, beside the row.
  function beside(s) {
    const d = dumpOf(s), e = excerpt(s, 1), made = madeSignals(d);
    return `<div class="xp-head">${tile(dumpIcon(d))}<div class="xp-row-text"><span class="xp-strong">${kindName(d)}${d.duration ? `, ${d.duration}` : ""}</span><span class="xp-sub">${esc(when(d))}${e.real ? `, passage ${e.pi + 1} of ${d.paras.length}` : ""}</span></div></div>
      <blockquote class="xp-passage">${e.html}</blockquote>${e.real ? ILLUS : ""}
      <div class="xp-k">Via</div>${srcLink(s)}
      <div class="xp-k">Made ${plural(made.length, "signal")}</div>
      <ul class="xp-made">${made.map(id => id === s.id
        ? `<li><p class="xp-plain xp-this" aria-current="true"><span>${esc(sig(id).gist)}</span><span class="xp-sub">This signal</span></p></li>`
        : `<li><button class="xp-link" data-pact="goto-signal" data-id="${id}"><span class="xp-row-text">${esc(sig(id).gist)}</span>${ic("arrow-right", 16)}</button></li>`).join("")}</ul>
      <div class="xp-sep"></div>${openDumpLink(d, false)}`;
  }
  // C: each part of the origin line opens its own small popover.
  function dumpPart(s, { inPane = false } = {}) {
    const d = dumpOf(s), e = excerpt(s, 0);
    return `<div class="xp-head">${tile(dumpIcon(d))}<div class="xp-row-text"><span class="xp-strong">${kindName(d)}${d.duration ? `, ${d.duration}` : ""}</span><span class="xp-sub">${esc(when(d))}</span></div></div>
      <blockquote class="xp-passage">${e.html}</blockquote>${e.real ? ILLUS : ""}${inPane ? `<div class="xp-sep"></div>` : ""}${openDumpLink(d)}`;
  }
  function sourcePart(s) {
    const x = srcOf(s);
    return `<div class="xp-head">${tile("link")}<div class="xp-row-text"><span class="xp-strong">${esc(x.author)}</span><span class="xp-sub">${esc(x.domain)}, ${esc(x.date)}</span></div></div>
      <p class="xp-plain">${esc(x.title)}</p>
      <a class="xp-link" href="${x.url}" target="_blank" rel="noreferrer"><span class="xp-row-text">Open on ${esc(x.domain)}</span>${ic("arrow-square-out", 16)}</a>`;
  }
  // Coexistence: a quick peek from the row; the full detail lives in the pane.
  function peek(s) {
    const d = dumpOf(s), e = excerpt(s, 0), x = srcOf(s);
    return `<div class="xp-head">${tile(dumpIcon(d))}<div class="xp-row-text"><span class="xp-strong">${kindName(d)}, ${esc(when(d))}</span>${x ? `<span class="xp-sub">Via ${esc(x.author)}</span>` : ""}</div></div>
      <blockquote class="xp-passage">${e.html}</blockquote>${e.real ? ILLUS : ""}
      <div class="xp-sep"></div><button class="xp-link" data-pact="pane" data-id="${s.id}"><span class="xp-row-text">Open in the pane</span>${ic("sidebar-simple", 16)}</button>`;
  }
  const moreMenu = () => `<div role="menu" aria-label="Signal actions" class="xp-menu">
      <button role="menuitem" class="xp-mi" data-pact="merge">${ic("arrows-merge", 16)}<span>Merge</span></button>
      <button role="menuitem" class="xp-mi" data-pact="discard">${ic("trash", 16)}<span>Discard</span></button></div>`;

  const BUILD = {
    chain: t => chain(sig(t.dataset.sid)),
    beside: t => beside(sig(t.dataset.sid)),
    dump: t => dumpPart(sig(t.dataset.sid)),
    source: t => sourcePart(sig(t.dataset.sid)),
    peek: t => peek(sig(t.dataset.sid)),
    from: t => dumpPart(sig(t.dataset.sid), { inPane: true }),
    more: () => moreMenu(),
  };
  const LABEL = { chain: "Where this signal came from", beside: "Where this signal came from", dump: "The voice note", source: "The source", peek: "Where this signal came from", from: "The voice note", more: "" };
  // A trigger and its popover are DOM neighbours, so Tab moves from the trigger into the popover.
  function trigger(kind, sid, inner, { cls = "", anchor = "", place = "below", w = "", label = "" } = {}) {
    const id = nid("xp-pop"), menu = kind === "more";
    return `<button type="button" class="${cls}" data-pop="${kind}" data-sid="${sid}"${anchor ? ` data-anchor="${anchor}"` : ""} data-place="${place}"${w ? ` data-w="${w}"` : ""} aria-haspopup="${menu ? "menu" : "dialog"}" aria-expanded="false" aria-controls="${id}"${label ? ` aria-label="${esc(label)}"` : ""}>${inner}</button><div class="xp-pop${menu ? " xp-pop-menu" : ""}" id="${id}"${menu ? "" : ` role="dialog" aria-label="${LABEL[kind]}"`} hidden></div>`;
  }

  /* ── Popover manager ── */
  let cur = null;
  const arm = root => { if (POP_API) root.querySelectorAll(".xp-pop[hidden]").forEach(p => { p.hidden = false; p.setAttribute("popover", "manual"); }); };
  const isOpen = p => POP_API ? p.matches(":popover-open") : !p.hidden;
  function openPop(t) {
    if (cur) closePop(false);
    const pop = document.getElementById(t.getAttribute("aria-controls"));
    pop.innerHTML = BUILD[t.dataset.pop](t);
    if (POP_API) { if (!isOpen(pop)) pop.showPopover(); } else pop.hidden = false;
    pop.dataset.state = "pre";
    t.setAttribute("aria-expanded", "true");
    cur = { t, pop };
    place(t, pop, true);
    requestAnimationFrame(() => requestAnimationFrame(() => { if (cur?.pop === pop) pop.dataset.state = "open"; }));
    // Focus moves in only when the popover has something to act on; every popover here does.
    const f = pop.querySelector(FOCUSABLE); if (f) f.focus({ preventScroll: true });
  }
  function closePop(returnFocus) {
    if (!cur) return;
    const { t, pop } = cur; cur = null;
    t.setAttribute("aria-expanded", "false");
    pop.dataset.state = "closing";
    const hide = () => { if (pop.dataset.state !== "closing") return; delete pop.dataset.state; if (POP_API) { if (isOpen(pop)) pop.hidePopover(); } else pop.hidden = true; pop.innerHTML = ""; };
    if (returnFocus && t.isConnected) t.focus({ preventScroll: true });
    reduce.matches ? hide() : setTimeout(hide, 110);
  }
  // Fixed coordinates in the top layer, so no column or stage can clip it.
  function place(t, pop, first) {
    const M = 12, G = 6, vw = document.documentElement.clientWidth, vh = innerHeight;
    const a = (t.dataset.anchor ? t.closest(t.dataset.anchor) : t).getBoundingClientRect(), tr = t.getBoundingClientRect();
    let mode = isNarrow() ? "full" : t.dataset.place;
    const w = mode === "full" ? vw - 2 * M : Math.min(+t.dataset.w || Math.max(a.width, 320), vw - 2 * M);
    pop.style.width = `${w}px`; pop.style.maxHeight = ""; pop.dataset.place = mode;
    const h = pop.offsetHeight;
    let left, top, ox, oy;
    if (mode === "side") {
      left = a.right + 8;
      if (left + w > vw - M) left = a.left - 8 - w;
      if (left < M) mode = "below";
      else {
        top = Math.max(M, Math.min(a.top, vh - M - h));
        ox = left > a.left ? 0 : w; oy = Math.max(0, Math.min(h, tr.top + tr.height / 2 - top));
      }
    }
    if (mode !== "side") {
      left = mode === "full" ? M : Math.max(M, Math.min(a.left, vw - M - w));
      const below = a.bottom + G, above = a.top - G - h;
      if (below + h <= vh - M) { top = below; oy = 0; }
      else if (above >= M) { top = above; oy = h; }
      else {
        if (first) { const by = Math.min(below + h - (vh - M), a.top - M); if (by > 1) { window.scrollBy({ top: by, behavior: "instant" }); return place(t, pop, false); } }
        top = below; oy = 0; pop.style.maxHeight = `${Math.max(200, vh - M - below)}px`;
      }
      ox = Math.max(0, Math.min(w, tr.left + tr.width / 2 - left));
    }
    pop.style.left = `${Math.round(left)}px`; pop.style.top = `${Math.round(top)}px`;
    pop.style.transformOrigin = `${Math.round(ox)}px ${Math.round(oy)}px`;
  }

  document.addEventListener("click", e => {
    const t = e.target.closest("[data-pop]");
    if (t) { e.preventDefault(); if (cur?.t === t) closePop(true); else openPop(t); return; }
    const b = e.target.closest("[data-pact]"); if (!b) return;
    const el = b.closest("[data-pstage]") || document.getElementById(b.closest(".xp-pop")?.id)?.closest("[data-pstage]");
    const F = el && FR.get(el); if (!F) return;
    e.preventDefault(); ACT[b.dataset.pact]?.(F, b);
  });
  document.addEventListener("pointerdown", e => { if (cur && !cur.pop.contains(e.target) && !cur.t.contains(e.target)) closePop(false); }, true);
  document.addEventListener("focusin", e => { if (cur && !cur.pop.contains(e.target) && cur.t !== e.target) closePop(false); });
  window.addEventListener("keydown", e => {
    if (!cur) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closePop(true); return; }
    if (/^Arrow(Up|Down)$/.test(e.key) && e.target.matches?.('[role="menuitem"]')) {
      const items = [...cur.pop.querySelectorAll('[role="menuitem"]')], i = items.indexOf(e.target);
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus(); e.preventDefault();
    }
  }, true);
  window.addEventListener("resize", () => { if (cur) place(cur.t, cur.pop, false); });
  document.addEventListener("scroll", e => {
    if (!cur) return;
    const sc = cur.t.closest(".cd-list, .xp-panescroll");
    if (sc && e.target === sc) {
      const r = cur.t.getBoundingClientRect(), b = sc.getBoundingClientRect();
      if (r.bottom < b.top || r.top > b.bottom) { closePop(false); return; }
    }
    place(cur.t, cur.pop, false);
  }, true);

  /* ── Frames ── */
  const FR = new Map();
  const fresh = s => s.fresh || s.day === "Today" ? `<span class="ap-mark" data-kind="fresh"></span>` : "";
  const toastEl = `<div class="x-toast xp-toast" role="status" aria-live="polite"></div>`;
  const timers = new WeakMap();
  function toast(F, msg) {
    const t = F.el.querySelector(".xp-toast"); if (!t) return;
    t.textContent = msg; clearTimeout(timers.get(F)); timers.set(F, setTimeout(() => { t.textContent = ""; }, 3200));
  }
  function render(F, focusSel) {
    if (cur && F.el.contains(cur.t)) closePop(false);
    const scrolls = {}; F.el.querySelectorAll("[data-sc]").forEach(x => { scrolls[x.dataset.sc] = x.scrollTop; });
    F.el.innerHTML = HTML[F.type](F);
    F.el.querySelectorAll("[data-sc]").forEach(x => { if (scrolls[x.dataset.sc] != null) x.scrollTop = scrolls[x.dataset.sc]; });
    arm(F.el);
    if (focusSel) F.el.querySelector(focusSel)?.focus({ preventScroll: true });
  }

  /* Columns for the popover options: Dumps, Signals, Themes, Theories, as in the app. */
  const colHead = (icon, name) => `<header class="cd-head">${ic(icon, 16)}<span>${name}</span></header>`;
  const col = (kind, icon, name, items) => `<div class="cd-col" data-kind="${kind}"><div class="cd-inner">${colHead(icon, name)}<div class="cd-list-wrap"><div class="cd-list ap-scroll" data-sc="${kind}">${items}</div></div></div></div>`;
  const dumpRows = F => W.DUMPS.map(d => `<div class="cd-item xp-item xp-ditem" data-d="${d.id}"${F.ringD === d.id ? " data-current" : ""}><div class="xp-face"><span class="xp-line">${ic(dumpIcon(d), 16)}<span class="xp-clip">${esc(d.first)}</span></span><span class="xp-muted ap-num">${esc(d.day === "Today" ? d.time : d.day)}, made ${d.produced.length}</span></div></div>`).join("");
  const quietRows = (icon, list) => list.map(x => `<div class="cd-item xp-item"><div class="xp-face"><span class="xp-line">${ic(icon, 16)}<span class="xp-clip">${esc(x)}</span></span></div></div>`).join("");
  function sigRow(F, s) {
    const d = dumpOf(s), x = srcOf(s), ring = F.ringS === s.id ? " data-current" : "";
    if (F.type === "pop-B") return `<div class="cd-item xp-item" data-s="${s.id}"${ring}>${trigger("beside", s.id, `<span class="xp-line">${fresh(s)}<span>${esc(s.gist)}</span></span><span class="xp-muted">${esc(s.source)}</span>`, { cls: "xp-rowbtn", anchor: ".xp-item", place: "side", w: 380 })}</div>`;
    if (F.type === "pop-A") return `<div class="cd-item xp-item" data-s="${s.id}"${ring}><div class="xp-face"><span class="xp-line">${fresh(s)}<span>${esc(s.gist)}</span></span></div>${trigger("chain", s.id, `${ic(dumpIcon(d), 16)}<span>${esc(originLine(s))}</span>`, { cls: "xp-originbtn", anchor: ".xp-item", place: "below", w: 340 })}</div>`;
    // pop-C: each part of the origin is its own trigger.
    return `<div class="cd-item xp-item" data-s="${s.id}"${ring}><div class="xp-face"><span class="xp-line">${fresh(s)}<span>${esc(s.gist)}</span></span></div>
      <div class="xp-parts"><span class="xp-muted">From</span>${trigger("dump", s.id, `<span>${kindOne(d).toLowerCase()}, ${esc(d.day === "Today" ? d.time : d.day)}</span>`, { cls: "xp-part", place: "below", w: 340, label: `From ${kindOne(d).toLowerCase()}, ${when(d)}` })}${x ? `<span class="xp-keep"><span class="xp-muted">via</span>${trigger("source", s.id, `<span>${esc(x.author)}</span>`, { cls: "xp-part", place: "below", w: 320, label: `Via ${x.author}` })}</span>` : ""}</div></div>`;
  }
  const THEORY_LIST = Object.keys(W.THEORIES).filter(t => !W.THEORIES[t].draft).map(claim);
  const popCols = F => `<div class="ap ab-production x-cols xp-cols"><div class="cd"><div class="cd-row">
      ${col("dump", "tray-arrow-down", "Dumps", dumpRows(F))}
      ${col("signal", "pulse", "Signals", W.SIGNALS.map(s => sigRow(F, s)).join(""))}
      ${col("theme", "binoculars", "Themes", quietRows("binoculars", Object.values(W.THEMES)))}
      ${col("theory", "target", "Theories", quietRows("target", THEORY_LIST))}
    </div></div>${toastEl}</div>`;

  /* The docked pane, B, used by the coexistence stage and both open decisions. */
  const meta = (k, v) => `<div class="xp-mrow"><dt>${k}</dt><dd>${v}</dd></div>`;
  const chip = (icon, text, attrs = "") => `<button type="button" class="xp-chip" ${attrs}>${ic(icon, 16)}<span>${text}</span></button>`;
  function picker(F, s, kind) {
    if (F.picker !== kind) return "";
    if (kind === "file") return `<div class="xa-picker xb-picker" role="dialog" aria-label="File in theme"><div class="xa-picker-head">File in which theme? <button class="xa-x" data-pact="picker-close" aria-label="Close">${ic("x", 14)}</button></div>
      ${Object.keys(W.THEMES).filter(t => !F.themes.includes(t)).map(t => `<button class="xb-pick" data-pact="file" data-t="${t}">${ic("binoculars", 16)}<span>${esc(theme(t))}</span></button>`).join("")}</div>`;
    const have = F.ev.map(e => e.theory);
    return `<div class="xa-picker xb-picker" role="dialog" aria-label="Add theory"><div class="xa-picker-head">Which theory does this bear on? <button class="xa-x" data-pact="picker-close" aria-label="Close">${ic("x", 14)}</button></div>
      ${Object.keys(W.THEORIES).filter(t => !W.THEORIES[t].draft && !have.includes(t)).map(t => `<div class="xb-pick-row"><span>${esc(claim(t))}</span><span class="xb-pick-acts"><button class="xb-stance" data-pact="link" data-stance="supports" data-t="${t}" aria-label="Supports the theory ${esc(claim(t))}">${ic("arrow-up", 16)}Supports</button><button class="xb-stance" data-pact="link" data-stance="undermines" data-t="${t}" aria-label="Undermines the theory ${esc(claim(t))}">${ic("arrow-down", 16)}Undermines</button></span></div>`).join("")}</div>`;
  }
  const addSlot = (F, kind, label) => `<button class="xb-addslot" data-pact="picker" data-pk="${kind}" data-slot="${kind}" aria-haspopup="dialog" aria-expanded="${F.picker === kind}">${ic("plus", 16)}<span>${label}</span></button>`;
  function confirmBox(F, s) {
    const d = dumpOf(s);
    return `<div class="xp-confirm" role="group" aria-labelledby="${F.el.dataset.pstage}-cf"><p id="${F.el.dataset.pstage}-cf"><b>Discard this signal?</b></p><ul>
      <li>${F.themes.length ? `Leaves ${F.themes.map(theme).join(", ")}` : "It isn't filed in any theme"}</li>
      <li>${F.ev.length ? `Stops counting as evidence for ${plural(F.ev.length, "theory", "theories")}` : "Not evidence for any theory"}</li>
      <li>Agents won't extract it from “${esc(d.first)}” again</li></ul>
      <div class="xp-acts"><button class="xp-btn" data-pact="discard-no" data-focus="cancel">Cancel</button><button class="xp-btn" data-primary data-pact="discard-yes">Discard</button></div></div>`;
  }
  // verbs: "fields" (each relationship carries its own verb), "toolbar" (verbs live in the pane header).
  function signalDoc(F, s, { verbs = "fields", body = "meta" } = {}) {
    if (F.discard === "done") return `<div class="xp-doc"><div class="xp-tomb" role="status"><span>Signal discarded</span><button class="xp-btn" data-pact="undiscard" data-focus="undo">Undo</button></div></div>`;
    const x = srcOf(s), d = dumpOf(s), onField = verbs !== "toolbar";
    const source = x ? (onField ? `<a class="xp-chip" href="${x.url}" target="_blank" rel="noreferrer" aria-label="Open source: ${esc(x.author)}">${ic("link", 16)}<span>${esc(x.author)}</span>${ic("arrow-square-out", 16)}</a>` : `<span class="xp-plain">${esc(x.author)}, ${esc(x.date)}</span>`) : `<span class="xp-muted">Your own observation</span>`;
    const from = trigger("from", s.id, `${ic(dumpIcon(d), 16)}<span>${kindName(d)}, ${esc(when(d))}</span>`, { cls: "xp-chip", place: "below", w: 360 });
    const themes = `<div class="xp-chips">${F.themes.map(t => chip("binoculars", esc(theme(t)), `data-pact="open-theme" data-t="${t}"`)).join("")}</div>${!F.themes.length && !onField ? none("Not filed") : ""}${onField ? addSlot(F, "file", "File in theme") : ""}${picker(F, s, "file")}`;
    const theories = `${F.ev.map(evLink).join("")}${!F.ev.length && !onField ? none("No theory yet") : ""}${onField ? addSlot(F, "link", "Add theory") : ""}${picker(F, s, "link")}`;
    const head = `${F.discard === "confirm" ? confirmBox(F, s) : ""}<h3 class="xp-title">${esc(s.gist)}</h3>`;
    if (body === "trail") return `<div class="xp-doc">${head}<p class="xp-caption">Signal, seen ${esc(s.day)}</p>${chain(s, { withThis: false, themes: F.themes, ev: F.ev })}</div>`;
    return `<div class="xp-doc">${head}
      <dl class="xp-meta">${meta("Source", source)}${meta("From", from)}${meta("Themes", themes)}${meta("Theories", theories)}</dl>
      ${s.note ? `<section class="xp-sec"><h4 class="xp-k">Note</h4><p class="xp-body">${esc(s.note)}</p></section>` : ""}
      ${x ? `<section class="xp-sec"><h4 class="xp-k">What the source says</h4><blockquote class="xp-bq">${esc(x.title)}</blockquote></section>` : ""}
    </div>`;
  }
  // body: "meta" (labelled meta list, then the text) or "reading" (the text first, what it made beneath each passage).
  function dumpDoc(F, d, { body = "meta", caption = false } = {}) {
    const made = madeSignals(d), shown = F.more ? d.paras : d.paras.slice(0, 4), rest = d.paras.length - 4;
    const madeRow = id => `<button class="xp-link" data-pact="goto-signal" data-id="${id}"><span class="xp-row-text"><span>${esc(sig(id).gist)}</span><span class="xp-sub">${sig(id).themes.map(theme).join(", ")}</span></span>${ic("arrow-right", 16)}</button>`;
    const more = rest > 0 ? `<button class="xp-disclose" data-pact="more" aria-expanded="${!!F.more}" data-focus="more">${ic(F.more ? "caret-down" : "caret-right", 16)}<span>${F.more ? "Show fewer paragraphs" : `Show the other ${rest} paragraphs`}</span></button>` : "";
    const kind = `${kindName(d)}${d.duration ? `, ${d.duration}` : ""}, ${wordsOf(d)} words`;
    if (body === "reading") return `<div class="xp-doc"><h3 class="xp-title">${esc(d.first)}</h3>${caption ? `<p class="xp-caption">Dump, ${esc(when(d))}</p>` : `<p class="xp-caption">${kind}, ${esc(when(d))}</p>`}
      <div class="xp-read">${shown.map(p => `<p>${esc(p.text)}</p>${(p.made || []).filter(id => sig(id)).map(id => `<div class="xp-yield">${tile("pulse")}<div class="xp-main"><div class="xp-k">Made</div>${madeRow(id)}</div></div>`).join("")}`).join("")}</div>${more}</div>`;
    return `<div class="xp-doc"><h3 class="xp-title">${esc(d.first)}</h3>
      <dl class="xp-meta">${meta("Captured", esc(when(d)))}${meta("Kind", `<span class="ap-num">${kind}</span>`)}${meta("Made", made.map(madeRow).join(""))}</dl>
      <section class="xp-sec"><h4 class="xp-k">Transcript</h4><div class="xp-read">${shown.map(p => `<p>${esc(p.text)}</p>`).join("")}</div>${more}</section></div>`;
  }
  const btn = (icon, label, act, extra = "") => `<button class="xp-btn" data-pact="${act}" ${extra}>${ic(icon, 16)}<span>${label}</span></button>`;
  function bar(F, kind, { acts = "", back = "", close = false } = {}) {
    const lead = back || `<span class="xp-barlabel">${ic(kind === "signal" ? "pulse" : "tray-arrow-down", 16)}${kind === "signal" ? "Signal" : "Dump"}</span>`;
    return `<div class="xp-bar">${lead}<span class="xp-sp"></span>${acts}${close ? `<button class="ap-iconbtn xp-ib" data-pact="close-pane" aria-label="Close pane" data-focus="close">${ic("x", 16)}</button>` : ""}</div>`;
  }
  const objActs = F => F.discard ? "" : `${btn("trash", "Discard", "discard", 'data-focus="discard"')}${btn("arrows-merge", "Merge", "merge")}`;
  const strip = (label, row) => `<div class="xp-strip"><div class="xp-strip-k">${label}</div>${row}</div>`;
  const sigStrip = s => strip("Signals column, selected", `<div class="cd-item xp-item" data-current><div class="xp-face"><span class="xp-line"><span>${esc(s.gist)}</span></span><span class="xp-muted">${esc(s.source)}</span></div></div>`);
  const dumpStrip = d => strip("Dumps column, selected", `<div class="cd-item xp-item" data-current><div class="xp-face"><span class="xp-line">${ic(dumpIcon(d), 16)}<span class="xp-clip">${esc(d.first)}</span></span><span class="xp-muted ap-num">${esc(d.time)}, made ${d.produced.length}</span></div></div>`);

  const S7 = sig("s7"), D2 = W.dump("D2");
  const GRAMMAR = {
    // One grammar: same bar, title, labelled meta list and labelled sections for both objects.
    "g-yes": F => [signalDoc(F, S7), dumpDoc(F, D2)],
    // Shared frame, own body: same bar, title and caption; the signal body is its trail, the dump body is its text.
    "g-frame": F => [signalDoc(F, S7, { body: "trail" }), dumpDoc(F, D2, { body: "reading", caption: true })],
    // Two grammars: the signal is a trail with no page title; the dump is a reading document.
    "g-no": F => [`<div class="xp-doc">${chain(S7, { themes: F.themes, ev: F.ev })}</div>`, dumpDoc(F, D2, { body: "reading" })],
  };
  const HTML = {
    "pop-A": popCols, "pop-B": popCols, "pop-C": popCols,
    grammar: F => {
      const [sd, dd] = GRAMMAR[F.g](F);
      return `<div class="ap ab-production xp-frame xp-two">
        <div class="xp-half">${sigStrip(S7)}<aside class="xp-pane" aria-label="Signal pane">${bar(F, "signal", { acts: objActs(F) })}${sd}</aside></div>
        <div class="xp-half">${dumpStrip(D2)}<aside class="xp-pane" aria-label="Dump pane">${bar(F, "dump")}${dd}</aside></div>${toastEl}</div>`;
    },
    action: F => {
      const s = S7, v = F.v;
      let acts = "";
      if (v === "toolbar") acts = F.discard ? "" : `${btn("binoculars", "File in theme", "picker", `data-pk="file" aria-haspopup="dialog" aria-expanded="${F.picker === "file"}" data-slot="file"`)}${btn("target", "Add theory", "picker", `data-pk="link" aria-haspopup="dialog" aria-expanded="${F.picker === "link"}" data-slot="link"`)}<a class="xp-btn" href="${srcOf(s).url}" target="_blank" rel="noreferrer">${ic("arrow-square-out", 16)}<span>Open source</span></a><span class="xp-vr" aria-hidden="true"></span>${objActs(F)}`;
      if (v === "menu") acts = F.discard ? "" : trigger("more", s.id, ic("dots-three", 16), { cls: "ap-iconbtn xp-ib", place: "below", w: 220, label: "More actions" });
      const foot = v === "foot" && !F.discard ? `<div class="xp-foot">${btn("trash", "Discard", "discard", 'data-focus="discard"')}<span class="xp-sp"></span>${btn("arrows-merge", "Merge", "merge")}</div>` : "";
      return `<div class="ap ab-production xp-frame">${sigStrip(s)}<aside class="xp-pane" aria-label="Signal pane">${bar(F, "signal", { acts })}${signalDoc(F, s, { verbs: v === "toolbar" ? "toolbar" : "fields" })}${foot}</aside>${toastEl}</div>`;
    },
    coexist: F => {
      const top = F.pane.at(-1);
      const rows = W.SIGNALS.map(s => { const d = dumpOf(s), on = top?.k === "signal" && top.id === s.id;
        return `<div class="cd-item xp-item" data-s="${s.id}"${on ? " data-current" : ""}><button class="xp-gistbtn" data-pact="pane" data-id="${s.id}" aria-controls="${F.el.dataset.pstage}-pane"${on ? ' aria-current="true"' : ""} data-focus="row-${s.id}"><span class="xp-line">${fresh(s)}<span>${esc(s.gist)}</span></span></button>${trigger("peek", s.id, `${ic(dumpIcon(d), 16)}<span>${esc(originLine(s))}</span>`, { cls: "xp-originbtn", anchor: ".xp-item", place: "side", w: 340 })}</div>`; }).join("");
      let pane = "";
      if (top) {
        const back = F.pane.length > 1 ? `<button class="xp-back" data-pact="back" data-focus="back">${ic("arrow-right", 16, "rotate:180deg")}<span>${esc(sig(F.pane[0].id).gist)}</span></button>` : "";
        const doc = top.k === "signal" ? signalDoc(F, sig(top.id)) : dumpDoc(F, W.dump(top.id));
        pane = `<aside class="xp-pane xp-panescroll" id="${F.el.dataset.pstage}-pane" aria-label="${top.k === "signal" ? "Signal" : "Dump"}" tabindex="-1" data-sc="pane" data-focus="pane">${bar(F, top.k, { acts: top.k === "signal" ? objActs(F) : "", back, close: true })}${doc}</aside>`;
      } else pane = `<div class="xp-pane xp-pane-empty"><p class="xp-muted">Select a signal to open it here.</p></div>`;
      return `<div class="ap ab-production x-cols xp-cols"><div class="cd"><div class="cd-row">${col("signal", "pulse", "Signals", rows)}</div></div>${pane}${toastEl}</div>`;
    },
  };

  /* ── Actions ── */
  const ringRow = (F, sel) => { const r = F.el.querySelector(sel); if (!r) return; r.scrollIntoView({ block: "nearest", behavior: reduce.matches ? "auto" : "smooth" }); };
  const resetSignal = F => { const s = sig(F.sid || "s7"); F.themes = [...s.themes]; F.ev = s.evidence.map(e => ({ ...e })); F.discard = null; F.picker = null; };
  const ACT = {
    "open-dump": (F, b) => {
      closePop(false);
      if (F.type === "coexist") { F.pane = [F.pane[0] || { k: "signal", id: "s7" }, { k: "dump", id: b.dataset.d }]; render(F, '[data-focus="back"]'); return; }
      if (F.type.startsWith("pop-")) { F.ringD = b.dataset.d; render(F); ringRow(F, `[data-d="${b.dataset.d}"]`); toast(F, "Opens the voice note in the pane"); return; }
      toast(F, "Opens the voice note in the pane");
    },
    "goto-signal": (F, b) => {
      closePop(false); const id = b.dataset.id;
      if (F.type === "coexist") { F.pane = [{ k: "signal", id }]; resetFor(F, id); render(F, '[data-focus="pane"]'); return; }
      if (F.type.startsWith("pop-")) { F.ringS = id; render(F, `[data-s="${id}"] [data-pop]`); ringRow(F, `[data-s="${id}"]`); return; }
      toast(F, `Opens “${sig(id).gist}”`);
    },
    pane: (F, b) => { closePop(false); const id = b.dataset.id; F.pane = [{ k: "signal", id }]; resetFor(F, id); render(F, '[data-focus="pane"]'); },
    back: F => { F.pane = F.pane.slice(0, 1); render(F, '[data-focus="pane"]'); },
    "close-pane": F => { const id = F.pane[0]?.id; F.pane = []; render(F, `[data-focus="row-${id}"]`); },
    "open-theme": (F, b) => { closePop(false); toast(F, `Opens the theme: ${theme(b.dataset.t)}`); },
    "open-theory": (F, b) => { closePop(false); toast(F, "Opens the theory pane"); },
    picker: (F, b) => { const k = b.dataset.pk; F.picker = F.picker === k ? null : k; render(F, F.picker ? ".xb-picker button:not(.xa-x)" : `[data-slot="${k}"]`); },
    "picker-close": F => { const k = F.picker; F.picker = null; render(F, `[data-slot="${k}"]`); },
    file: (F, b) => { F.themes = [...F.themes, b.dataset.t]; F.picker = null; render(F, '[data-slot="file"]'); toast(F, `Filed in ${theme(b.dataset.t)}`); },
    link: (F, b) => { F.ev = [...F.ev, { theory: b.dataset.t, stance: b.dataset.stance }]; F.picker = null; render(F, '[data-slot="link"]'); toast(F, `Theory added, ${b.dataset.stance}`); },
    merge: F => { closePop(false); toast(F, "Opens the two-step merge dialog"); },
    discard: F => { closePop(false); F.picker = null; F.discard = "confirm"; render(F, '[data-focus="cancel"]'); },
    "discard-no": F => { F.discard = null; render(F, F.v === "menu" ? "[data-pop=more]" : '[data-focus="discard"]'); },
    "discard-yes": F => { F.discard = "done"; render(F, '[data-focus="undo"]'); },
    undiscard: F => { F.discard = null; render(F, F.v === "menu" ? "[data-pop=more]" : '[data-focus="discard"]'); },
    more: F => { F.more = !F.more; render(F, '[data-focus="more"]'); },
  };
  function resetFor(F, id) { F.sid = id; resetSignal(F); }

  function init(el) {
    const type = el.dataset.pstage.startsWith("pop-") ? el.dataset.pstage.slice(0, 5) : el.dataset.kind;
    const F = { el, type, g: el.dataset.g, v: el.dataset.v, sid: "s7", pane: [], more: false, ringS: null, ringD: null };
    resetSignal(F);
    if (type === "coexist" && !isNarrow()) F.pane = [{ k: "signal", id: "s7" }];
    FR.set(el, F); render(F);
  }
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape" || cur) return;
    const el = e.target.closest?.("[data-pstage]"), F = el && FR.get(el); if (!F) return;
    if (F.picker) { ACT["picker-close"](F); e.preventDefault(); return; }
    if (F.discard === "confirm") { ACT["discard-no"](F); e.preventDefault(); return; }
    if (F.type === "coexist" && e.target.closest(".xp-pane") && F.pane.length) { e.preventDefault(); F.pane.length > 1 ? ACT.back(F) : ACT["close-pane"](F); }
  });
  document.addEventListener("click", e => {
    const r = e.target.closest("[data-preset]"); if (!r) return;
    const el = document.querySelector(`[data-pstage="${r.dataset.preset}"]`); if (el) { if (cur && el.contains(cur.t)) closePop(false); FR.delete(el); init(el); }
  });
  document.querySelectorAll("[data-pstage]").forEach(init);
})();
