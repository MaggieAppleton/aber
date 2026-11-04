// Grammar 04 surfaces: viewer switches, the Show layers overlay (tags each surface with tier, fill, edge, shadow, radius), decide box picks.
(() => {
  addEventListener("load", () => { const d = document.querySelector(".jig-dock"), h = document.querySelector(".jig-head"); if (d && h) h.append(d); paintPicks(); document.fonts.ready.then(tagAll); });

  // Name a computed value by matching it against the tokens, measured on a probe inside the same stage
  const namer = (stg, prop, names) => {
    const probe = document.createElement("i"); probe.style.cssText = "position:absolute;visibility:hidden"; stg.append(probe);
    const out = names.map(([n, v]) => { probe.style[prop] = v; return [n, getComputedStyle(probe)[prop]]; }); probe.remove(); return out;
  };
  const SURFACES = [
    [".stg-main, .stg-col:not(.stg-col-nav), .stg-view:is([data-view=atlas], [data-view=timeline])", "0 base"],
    [".stg-rail, .stg-col-nav, .stg-strip", "1 docked"], [".stg-pane", "1 docked"], [".stg-switch, .stg-zoom", "1 floating"],
    [".stg-index a[data-active]", "2 raised"], [".stg-card", "2 raised", 2], [".stg-area.is-sel .stg-area-label, .stg-tl-item.is-sel", "2 raised"],
    [".stg-ev", "flush box"], [".stg-note", "well"], [".stg-chip", "control", 1],
    [".stg-peek, .stg-menu", "4 tethered"], [".stg-modal", "5 modal"], [".stg-toast", "6 toast"], [".stg-tip", "7 tooltip"],
  ];
  const tag = stg => {
    stg.querySelector(".ly-layer")?.remove();
    const fills = namer(stg, "backgroundColor", [["ground", "var(--ground)"], ["sunk", "var(--ground-2)"], ["surface", "var(--surface)"], ["ink", "var(--ink)"], ["hover", "var(--hover)"], ["none", "transparent"]]);
    const shadows = namer(stg, "boxShadow", [["selected", "var(--sel)"], ["float", "var(--sh-float)"], ["raised", "var(--sh-raised)"], ["pop", "var(--sh-pop)"], ["modal", "var(--sh-modal)"], ["toast", "var(--sh-toast)"], ["tip", "var(--sh-tip)"],
      ["ring", "var(--ring)"], ["ring", "inset 0 0 0 0.5px var(--hairline-strong)"], ["seam", "inset -0.5px 0 0 var(--hairline)"], ["seam", "-0.5px 0 0 var(--hairline-strong)"], ["seam", "inset -0.5px 0 0 var(--hairline)"], ["none", "none"]]);
    const layer = document.createElement("div"); layer.className = "ly-layer"; layer.setAttribute("aria-hidden", "true");
    const sr = stg.getBoundingClientRect(), W = parseFloat(getComputedStyle(stg).width), k = sr.width / W || 1;
    for (const [sel, tier, max] of SURFACES) {
      let els = [...stg.querySelectorAll(sel)].filter(e => e.getBoundingClientRect().width);
      if (tier === "1 docked" && sel.includes("strip")) els = els.slice(0, 1);
      if (max) els = els.slice(0, max);
      for (const el of els) {
        const cs = getComputedStyle(el), r = el.getBoundingClientRect();
        // A transparent surface shows the plane under it
        let bgEl = el; while (bgEl && bgEl !== stg.parentElement && getComputedStyle(bgEl).backgroundColor === "rgba(0, 0, 0, 0)") bgEl = bgEl.parentElement;
        const bg = bgEl ? getComputedStyle(bgEl).backgroundColor : "";
        const fill = (fills.find(([, v]) => v === bg)?.[0] ?? "tint") + (bgEl !== el ? " (shows through)" : "");
        let sh = shadows.filter(([, v]) => v === cs.boxShadow).map(([n]) => n);
        if (tier.includes("floating")) sh = sh.filter(n => n !== "raised"); else sh = sh.filter(n => n !== "float");
        const shadow = sh[0] ?? "custom", edge = cs.outlineStyle === "dashed" ? "dashed" : shadow === "ring" ? "hairline" : shadow === "seam" ? "seam" : ["none"].includes(shadow) ? "no edge" : shadow === "custom" ? "" : "ring";
        const rad = Math.round(parseFloat(cs.borderTopLeftRadius)) || 0;
        el.dataset.ly = "";
        const t = document.createElement("span"); t.className = "ly-tag";
        t.textContent = `${tier}: ${fill}, ${edge ? edge + ", " : ""}${["ring", "seam", "none"].includes(shadow) ? "no shadow" : shadow + " shadow"}, r ${rad}`;
        const x = (r.left - sr.left) / k, y = (r.top - sr.top) / k;
        Object.assign(t.style, { left: `${Math.min(Math.max(0, x), W - 220)}px`, top: `${Math.max(0, y)}px` });
        layer.append(t);
      }
    }
    stg.append(layer);
  };
  const tagAll = () => document.querySelectorAll(".stg").forEach(tag);
  const mo = new MutationObserver(() => requestAnimationFrame(() => { pinTips(); tagAll(); }));
  document.querySelectorAll(".stg-host").forEach(h => mo.observe(h, { childList: true }));
  // Layer "tip": the Close tooltip, pinned
  const pinTips = () => document.querySelectorAll('.stg[data-layer="tip"]').forEach(stg => { stg.querySelector(".stg-tip")?.remove(); const b = stg.querySelector('.stg-pane-close [data-key="Esc"]'); if (b) window.AberStage.showTip(b, true); });

  const viewer = document.getElementById("viewer");
  const state = { view: "sections", layer: "peek", cards: "shadow", pop: "crisp", float: "shadow" };
  for (const seg of document.querySelectorAll("[data-seg]")) {
    seg.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      seg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      const key = seg.dataset.seg;
      if (key === "overlay") { viewer.toggleAttribute("data-layeroverlay", b.value === "on"); requestAnimationFrame(tagAll); return; }
      state[key] = b.value; viewer.dataset.stage = JSON.stringify(state); window.AberStage.render(viewer);
      if (!["view", "layer"].includes(key)) for (const h of document.querySelectorAll(".views-grid .stg-host")) {
        const o = JSON.parse(h.dataset.stage); o[key] = b.value; h.dataset.stage = JSON.stringify(o); window.AberStage.render(h);
      }
    });
  }
  viewer.addEventListener("click", e => { const vb = e.target.closest(".stg-switch button[data-view]"); if (!vb) return;
    state.view = vb.dataset.view; document.querySelectorAll('[data-seg="view"] button').forEach(x => x.setAttribute("aria-pressed", String(x.value === state.view))); });
  addEventListener("resize", () => requestAnimationFrame(tagAll));

  const page = document.body.dataset.jig;
  const paintPicks = () => {
    for (const li of document.querySelectorAll("[data-pick]")) {
      const id = li.dataset.pick, sec = document.querySelector(`[data-decision="${id}"]`);
      let v = null; try { v = JSON.parse(localStorage.getItem(`jig:${page}:${id}`))?.choice; } catch {}
      v = v ?? sec?.dataset.default;
      li.querySelector(".pick").innerHTML = v ? `Current pick: <b>${v}</b>` : "No pick yet";
    }
  };
  document.addEventListener("click", e => { if (e.target.closest(".jig-choose")) setTimeout(paintPicks, 0); });
})();
