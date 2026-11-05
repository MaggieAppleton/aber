// Grammar 01 spacing: full-size stage switches.
(() => {

  const viewer = document.getElementById("viewer");
  // The stage's own view switcher also updates the View segmented control
  viewer.addEventListener("click", e => { const vb = e.target.closest(".stg-switch button[data-view]"); if (!vb) return;
    state.view = vb.dataset.view; document.querySelectorAll('[data-seg="view"] button').forEach(x => x.setAttribute("aria-pressed", String(x.value === state.view))); });
  const state = { density: "regular", list: "cards", view: "sections" };
  for (const seg of document.querySelectorAll("[data-seg]")) {
    seg.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      seg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      const key = seg.dataset.seg;
      if (key === "overlay") { viewer.toggleAttribute("data-overlay", b.value === "on"); return; }
      state[key] = b.value;
      viewer.dataset.stage = JSON.stringify(state);
      window.AberStage.render(viewer);
      if (key !== "view") for (const h of document.querySelectorAll(".views-grid .stg-host")) {
        const o = JSON.parse(h.dataset.stage); o[key] = b.value; h.dataset.stage = JSON.stringify(o); window.AberStage.render(h);
      }
    });
  }

})();
