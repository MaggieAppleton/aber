// Grammar 01 spacing: full-size stage switches, decide box picks, Copy choices in the header.
(() => {
  addEventListener("load", () => { const d = document.querySelector(".jig-dock"), h = document.querySelector(".jig-head"); if (d && h) h.append(d); paintPicks(); });

  const viewer = document.getElementById("viewer");
  const state = { density: "regular", list: "cards" };
  for (const seg of document.querySelectorAll("[data-seg]")) {
    seg.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      seg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      const key = seg.dataset.seg;
      if (key === "overlay") { viewer.toggleAttribute("data-overlay", b.value === "on"); return; }
      state[key] = b.value;
      viewer.dataset.stage = JSON.stringify(state);
      window.AberStage.render(viewer);
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
