// Grammar 01 spacing: full-size stage switches, decide box picks, Copy choices in the header.
(() => {
  addEventListener("load", () => { const d = document.querySelector(".jig-dock"), h = document.querySelector(".jig-head"); if (d && h) h.append(d); paintPicks(); });

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
