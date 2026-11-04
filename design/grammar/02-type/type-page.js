// Grammar 02 type: viewer switches, the type-roles overlay (fills each label with its computed spec), decide box picks.
(() => {
  addEventListener("load", () => { const d = document.querySelector(".jig-dock"), h = document.querySelector(".jig-head"); if (d && h) h.append(d); paintPicks(); fillSpecs(); });

  // Each labelled text shows "size/weight ink" from its computed style
  const inkName = (el, color) => {
    const probe = document.createElement("span"); el.closest(".stg").append(probe);
    const names = [["ink", "--ink"], ["ink 2", "--ink-2"], ["on accent", "--on-primary"]];
    for (const [n, v] of names) { probe.style.color = `var(${v})`; if (getComputedStyle(probe).color === color) { probe.remove(); return n; } }
    probe.remove(); return "";
  };
  const fillSpecs = (root = document) => {
    for (const el of root.querySelectorAll("[data-tr]")) {
      const cs = getComputedStyle(el);
      el.dataset.trs = `${parseFloat(cs.fontSize)}/${cs.fontWeight} ${inkName(el, cs.color)}`;
    }
  };

  const viewer = document.getElementById("viewer");
  const state = { view: "sections", scale: "decided", title: "24", sechead: "quiet" };
  const rerender = () => { viewer.dataset.stage = JSON.stringify(state); window.AberStage.render(viewer); fillSpecs(viewer); };
  for (const seg of document.querySelectorAll("[data-seg]")) {
    seg.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      seg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      const key = seg.dataset.seg;
      if (key === "overlay") { viewer.toggleAttribute("data-typeoverlay", b.value === "on"); return; }
      state[key] = b.value; rerender();
      if (key !== "view") for (const h of document.querySelectorAll(".views-grid .stg-host")) {
        const o = JSON.parse(h.dataset.stage); o[key] = b.value; h.dataset.stage = JSON.stringify(o); window.AberStage.render(h); fillSpecs(h);
      }
    });
  }
  viewer.addEventListener("click", e => { const vb = e.target.closest(".stg-switch button[data-view]"); if (!vb) return;
    state.view = vb.dataset.view; document.querySelectorAll('[data-seg="view"] button').forEach(x => x.setAttribute("aria-pressed", String(x.value === state.view)));
    requestAnimationFrame(() => fillSpecs(viewer)); });
  document.addEventListener("click", e => { if (e.target.closest(".views-grid .stg-switch")) requestAnimationFrame(() => fillSpecs()); });

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
