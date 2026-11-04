// Grammar 03 icons: viewer switches, the icon-specs overlay (tags every icon with role, size, weight and slot), a pinned tooltip, decide box picks.
(() => {
  addEventListener("load", () => { const d = document.querySelector(".jig-dock"), h = document.querySelector(".jig-head"); if (d && h) h.append(d); paintPicks(); document.fonts.ready.then(tagAll); });

  // Each icon's spec, read from its computed style: role, glyph size, weight, slot
  const spec = el => {
    const i = el.matches("i") ? el : el.querySelector("i"); if (!i) return null;
    const sz = Math.round(parseFloat(getComputedStyle(i).fontSize));
    const wt = i.classList.contains("ph-fill") ? "Fill" : "Regular";
    const box = Math.round(parseFloat(getComputedStyle(el).width));
    if (el.matches(".g")) {
      const tiled = getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)";
      return `object ${sz} ${wt}, ${tiled ? `tile ${box}` : `slot ${box}`}`;
    }
    if (el.matches(".stg-switch button")) return `view ${sz} ${wt}, box ${box}`;
    if (el.matches(".stg-iconbtn")) return `button ${sz} ${wt}, box ${box}`;
    return `inline ${sz} ${wt}`;
  };
  const w0 = el => parseFloat(getComputedStyle(el).width);
  const tag = stg => {
    stg.querySelector(".is-layer")?.remove();
    const layer = document.createElement("div"); layer.className = "is-layer"; layer.setAttribute("aria-hidden", "true");
    const sr = stg.getBoundingClientRect(), k = sr.width / parseFloat(getComputedStyle(stg).width) || 1;
    const slots = [...stg.querySelectorAll(".g, .stg-iconbtn, .stg-switch button, .stg-ev-head > i")];
    for (const el of slots) {
      const r = el.getBoundingClientRect(); if (!r.width) continue;
      el.dataset.is = "";
      // Buttons side by side (view switch, zoom stack, pane controls, stepper) share one tag on the first
      const grp = el.closest(".stg-switch, .stg-zoom, .stg-pane-close, .stg-fields dd");
      const sibs = grp ? [...grp.querySelectorAll(":scope > .stg-iconbtn, :scope > button")] : [];
      if (sibs.length > 1 && sibs[0] !== el) continue;
      if (el.closest(".stg-strip") && el.closest(".stg-strip").previousElementSibling?.matches(".stg-strip")) continue;
      const t = document.createElement("span"); t.className = "is-tag"; t.textContent = el.closest(".stg-strip") ? `2 ${spec(el).replace("object", "objects")}` : spec(el);
      if (sibs.length > 1) t.textContent = el.matches(".stg-switch button") ? `${sibs.length} views ${spec(el).split(" ")[1]} Regular, current Fill, box ${Math.round(w0(el))}` : `${sibs.length} buttons ${spec(el).replace(/^button /, "")}`;
      const x = (r.left - sr.left) / k, y = (r.top - sr.top) / k, w = r.width / k, h = r.height / k;
      const side = el.closest(".stg-zoom, .stg-pane-close") ? "below" : "above";
      if (el.closest(".stg-zoom")) Object.assign(t.style, { left: `${x + w + 4}px`, top: `${y + h / 2 - 7}px` });
      else if (el.closest(".stg-ev-head .plus")) Object.assign(t.style, { right: `${parseFloat(getComputedStyle(stg).width) - x - w}px`, top: `${y + h + 2}px` });
      else if (el.closest(".stg-pane-close")) Object.assign(t.style, { right: `${parseFloat(getComputedStyle(stg).width) - x - w}px`, top: `${y + h + 2}px` });
      else Object.assign(t.style, { left: `${x}px`, top: `${y - 14}px` });
      t.dataset.side = side; layer.append(t);
    }
    stg.append(layer);
  };
  // Tooltips: name, then key; below the button, above it in bottom bars, beside it in the zoom stack
  const local = (stg, el) => { const sr = stg.getBoundingClientRect(), k = sr.width / parseFloat(getComputedStyle(stg).width) || 1, r = el.getBoundingClientRect();
    return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k, W: parseFloat(getComputedStyle(stg).width) }; };
  const showTip = (btn, pinned) => {
    const stg = btn.closest(".stg[data-icons]"); if (!stg) return;
    if (!pinned) stg.querySelector(".stg-tip:not([data-pinned])")?.remove();
    const t = document.createElement("div"); t.className = "stg-tip"; t.setAttribute("role", "tooltip"); if (pinned) t.dataset.pinned = "";
    t.innerHTML = `<span>${btn.dataset.tip}</span>${btn.dataset.key ? `<kbd>${btn.dataset.key}</kbd>` : ""}`;
    stg.append(t);
    const { x, y, w, h, W } = local(stg, btn), tw = t.offsetWidth, th = t.offsetHeight;
    let left = x + w / 2 - tw / 2, top = y + h + 4;
    if (btn.closest(".stg-switch")) top = y - th - 4;
    if (btn.closest(".stg-zoom")) { left = x + w + 4; top = y + h / 2 - th / 2; }
    left = Math.max(4, Math.min(W - tw - 4, left));
    Object.assign(t.style, { left: `${left}px`, top: `${top}px` });
  };
  let timer;
  document.addEventListener("pointerover", e => { const b = e.target.closest(".stg[data-icons] [data-tip]"); if (!b || b.hasAttribute("data-tip-pin")) return; clearTimeout(timer); timer = setTimeout(() => showTip(b), 500); });
  document.addEventListener("pointerout", e => { const b = e.target.closest(".stg[data-icons] [data-tip]"); if (!b) return; clearTimeout(timer); b.closest(".stg")?.querySelector(".stg-tip:not([data-pinned])")?.remove(); });
  document.addEventListener("focusin", e => { const b = e.target.closest(".stg[data-icons] [data-tip]"); if (b && !b.hasAttribute("data-tip-pin")) showTip(b); });
  document.addEventListener("focusout", e => { e.target.closest(".stg")?.querySelector(".stg-tip:not([data-pinned])")?.remove(); });

  const tagAll = () => document.querySelectorAll(".stg[data-icons]").forEach(stg => { tag(stg);
    stg.querySelector(".stg-tip[data-pinned]")?.remove(); const p = stg.querySelector("[data-tip-pin]"); if (p) showTip(p, true); });
  // Re-tag whenever a stage re-renders or is refitted
  const mo = new MutationObserver(() => requestAnimationFrame(tagAll));
  document.querySelectorAll(".stg-host").forEach(h => mo.observe(h, { childList: true }));

  const viewer = document.getElementById("viewer");
  const pin = () => viewer.querySelector('.stg-pane-close [data-key="Esc"]')?.setAttribute("data-tip-pin", "");
  const state = { view: "sections", icons: 1, iconsize: "one", tile: "lists" };
  const rerender = () => { viewer.dataset.stage = JSON.stringify(state); window.AberStage.render(viewer); pin(); };
  for (const seg of document.querySelectorAll("[data-seg]")) {
    seg.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      seg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      const key = seg.dataset.seg;
      if (key === "overlay") { viewer.toggleAttribute("data-iconoverlay", b.value === "on"); requestAnimationFrame(tagAll); return; }
      state[key] = b.value; rerender();
      if (key !== "view") for (const h of document.querySelectorAll(".views-grid .stg-host")) {
        const o = JSON.parse(h.dataset.stage); o[key] = b.value; h.dataset.stage = JSON.stringify(o); window.AberStage.render(h);
      }
    });
  }
  viewer.addEventListener("click", e => { const vb = e.target.closest(".stg-switch button[data-view]"); if (!vb) return;
    state.view = vb.dataset.view; document.querySelectorAll('[data-seg="view"] button').forEach(x => x.setAttribute("aria-pressed", String(x.value === state.view)));
    requestAnimationFrame(pin); });
  addEventListener("DOMContentLoaded", pin);
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
