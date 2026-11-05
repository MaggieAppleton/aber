// Grammar nav: the type rail collapses to an icon bar (DECIDED 5 Nov, Maggie: A, auto-collapse while the chat is open). Shared by nav/, 06, 07, 08, 09 and 10; each page renders its rail markup
// and calls AberRail.apply(host, { chat }) after every render. Load this before the page's own script.
//   Host attributes: data-rail-start="icons" (start collapsed), data-rail-persist (the toggle is remembered, and the narrow-window rule applies:
//   these windows stand for the app), data-rail-auto="on" | "off" (overrides the nav page's Choose).
//   Rule: collapsed = toggled to icons, or (auto on and (chat open, or a persisted window in a browser narrower than 1280)), unless you
//   expanded it by hand while that lasts. When the chat closes, the rail returns to how you left it.
// Keys: ⌘\ toggles the window you're in (not ⌘B: the usual bold key in text). ⌥1–⌥6 go to Briefing and the five types (proposed; shown in tooltips).
(() => {
  const me = document.currentScript?.src;
  if (me) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = new URL("rail.css", me).href; document.head.append(l); }

  const SAVED = "aber:rail", PICK = "jig:grammar-nav:railauto", NARROW = 1280, ICONS_W = "48px";
  const ORDER = ["briefing", "theme", "theory", "prototype", "signal", "dump"];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const read = () => { try { return localStorage.getItem(SAVED); } catch { return null; } };
  const write = v => { try { localStorage.setItem(SAVED, v); } catch {} };
  const autoOn = host => {
    const o = host.dataset.railAuto; if (o) return o === "on";
    let v; try { v = JSON.parse(localStorage.getItem(PICK))?.choice; } catch {}
    return !(typeof v === "string" && v.startsWith("B"));   // A (recommended) unless B is picked
  };
  const persist = host => host.hasAttribute("data-rail-persist");
  const state = host => host._rail ||= { manual: (persist(host) && read()) || host.dataset.railStart || "full", force: false, ctx: {}, prev: null };
  const collapsed = host => {
    const st = state(host), auto = autoOn(host) && !!(st.ctx.chat || (persist(host) && innerWidth < NARROW));
    if (!auto) st.force = false;
    st.auto = auto;
    return st.manual === "icons" || (auto && !st.force);
  };
  const typeOf = b => b.dataset.go || ("home" in b.dataset ? "briefing" : "");
  const keyOf = t => ORDER.includes(t) ? `⌥${ORDER.indexOf(t) + 1}` : "";

  // Tooltips in the rail come from here (data-rtip), placed to the right; page tooltips (data-tip) stay as they are elsewhere.
  const decorate = (rail, on) => {
    let tg = rail.querySelector(".nv-rail-toggle");
    if (!tg) {
      tg = document.createElement("button"); tg.type = "button"; tg.className = "nv-ib nv-rail-toggle"; tg.dataset.railToggle = "";
      tg.innerHTML = `<i class="ph ph-sidebar-simple" aria-hidden="true"></i>`; tg.dataset.rkey = "⌘\\";
      rail.insertBefore(tg, rail.querySelector(".nv-switch"));   // focus order follows the eye: types, toggle, then the switcher below it
    }
    const label = on ? "Expand sidebar" : "Collapse sidebar";
    tg.setAttribute("aria-label", label); tg.dataset.rtip = label; tg.setAttribute("aria-expanded", String(!on));
    rail.querySelectorAll(".nv-type").forEach(b => {
      const nm = b.querySelector(".nm")?.textContent.trim() || b.getAttribute("aria-label") || "", n = b.querySelector(".nv-n");
      if (!b.hasAttribute("aria-label")) b.setAttribute("aria-label", nm);
      if (on) { b.dataset.rtip = nm; b.dataset.rcount = n ? (n.getAttribute("aria-label") || n.textContent.trim()) : ""; b.dataset.rkey = keyOf(typeOf(b)); }
      else { delete b.dataset.rtip; }
    });
    rail.querySelectorAll(".nv-brand [data-tip], .nv-switch [data-tip], .nv-brand [data-rtip-was], .nv-switch [data-rtip-was]").forEach(b => {
      if (on && b.dataset.tip) { b.dataset.rtip = b.dataset.tip; b.dataset.rkey = b.dataset.key || ""; b.dataset.rtipWas = b.dataset.tip; delete b.dataset.tip; }
      else if (!on && b.dataset.rtipWas) { b.dataset.tip = b.dataset.rtipWas; delete b.dataset.rtip; delete b.dataset.rtipWas; }
    });
  };

  const fullW = () => getComputedStyle(document.documentElement).getPropertyValue("--nv-rail-w").trim() || "160px";
  const set = (host, nv, on, from) => {
    const target = on ? "icons" : "full";
    if (from == null || from === on || reduce.matches || !nv.checkVisibility?.({ contentVisibilityAuto: true })) { nv.dataset.rail = target; return; }   // nothing to see moving (a closed Details)
    nv.querySelector(".nv-tip.rail")?.remove();
    clearTimeout(nv._railT); nv.classList.add("rail-anim");
    if (nv.dataset.rail !== (from ? "icons" : "full")) {   // a fresh render: start it at the old width, then let it move
      nv.dataset.rail = target; nv.style.setProperty("--nv-rail-w", from ? ICONS_W : fullW()); void nv.offsetWidth; nv.style.removeProperty("--nv-rail-w");
    } else nv.dataset.rail = target;
    nv._railT = setTimeout(() => { nv.classList.remove("rail-anim"); nv.getAnimations().forEach(x => x.transitionProperty === "grid-template-columns" && x.cancel()); }, 220);
  };

  const apply = (host, ctx) => {
    const st = state(host); if (ctx) st.ctx = { ...st.ctx, ...ctx };
    const nv = host.querySelector(".nv"), rail = nv?.querySelector(":scope > .nv-rail"); if (!rail || nv.dataset.v === "C") return;   // round 1's C has its own icon rail
    const on = collapsed(host);
    decorate(rail, on);
    set(host, nv, on, st.prev);
    st.prev = on; all.add(host);
  };
  const toggle = host => {
    const st = state(host), on = collapsed(host);
    if (on) { if (st.manual === "icons") st.manual = "full"; if (st.auto) st.force = true; }
    else if (st.auto && st.force) st.force = false;
    else st.manual = "icons";
    if (persist(host)) write(st.manual);
    apply(host);
  };
  const all = new Set(), hosts = () => [...all].filter(h => h.isConnected);
  const refresh = () => hosts().forEach(h => apply(h));

  /* ── Pointer, keys, tooltips ── */
  let last = null, tipT;
  const hostOf = el => { for (let h = el; h; h = h.parentElement) if (h._rail) return h; return null; };
  document.addEventListener("pointerdown", e => { const h = hostOf(e.target); if (h) last = h; }, true);
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-rail-toggle]"); if (!b) return;
    const h = hostOf(b); if (h) { last = h; toggle(h); }
  });
  const target = () => hostOf(document.activeElement) || (last?.isConnected ? last : null) || document.querySelector("[data-rail-persist]");
  document.addEventListener("keydown", e => {
    const typing = e.target.closest?.("input, textarea, select, [contenteditable]");
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (e.key === "\\" || e.code === "Backslash")) {
      const h = target(); if (!h?._rail) return; e.preventDefault(); toggle(h); return;
    }
    if (e.altKey && !e.metaKey && !e.ctrlKey && !typing && /^Digit[1-6]$/.test(e.code)) {
      const h = target(); if (!h?._rail) return;
      const t = ORDER[+e.code.slice(5) - 1];
      const b = [...h.querySelectorAll(".nv-rail .nv-type")].find(x => typeOf(x) === t); if (!b) return;
      e.preventDefault(); b.click();
    }
  });
  const local = (base, el) => { const br = base.getBoundingClientRect(), k = br.width / base.offsetWidth || 1, r = el.getBoundingClientRect();
    return { x: (r.left - br.left) / k, y: (r.top - br.top) / k, w: r.width / k, h: r.height / k }; };
  const showTip = b => {
    const nv = b.closest(".nv"); if (!nv || !b.dataset.rtip) return; nv.querySelectorAll(".nv-tip").forEach(t => t.remove());
    const t = document.createElement("div"); t.className = "nv-tip rail"; t.setAttribute("role", "tooltip");
    t.innerHTML = `<span>${b.dataset.rtip}</span>${b.dataset.rcount ? `<span class="n">${b.dataset.rcount}</span>` : ""}${b.dataset.rkey ? `<kbd>${b.dataset.rkey}</kbd>` : ""}`;
    nv.append(t);
    const r = local(nv, b);
    Object.assign(t.style, { left: `${r.x + r.w + 6}px`, top: `${Math.max(4, Math.min(nv.offsetHeight - t.offsetHeight - 4, r.y + r.h / 2 - t.offsetHeight / 2))}px` });
  };
  const hideTip = b => { clearTimeout(tipT); b?.closest(".nv")?.querySelector(".nv-tip.rail")?.remove(); };
  document.addEventListener("pointerover", e => { const b = e.target.closest(".nv-rail [data-rtip]"); if (!b) return; clearTimeout(tipT); tipT = setTimeout(() => b.isConnected && showTip(b), 500); });
  document.addEventListener("pointerout", e => { const b = e.target.closest(".nv-rail [data-rtip]"); if (b) hideTip(b); });
  document.addEventListener("focusin", e => { const b = e.target.closest?.(".nv-rail [data-rtip]"); if (b && b.matches(":focus-visible")) showTip(b); });
  document.addEventListener("focusout", e => { const b = e.target.closest?.(".nv-rail [data-rtip]"); if (b) hideTip(b); });
  document.addEventListener("pointerdown", e => { const b = e.target.closest(".nv-rail [data-rtip]"); if (b) hideTip(b); });

  addEventListener("resize", () => hosts().filter(persist).forEach(h => apply(h)));
  document.addEventListener("jig:change", refresh);
  addEventListener("storage", e => { if (e.key === PICK) refresh(); });

  window.AberRail = { apply, toggle, refresh, collapsed };
})();
