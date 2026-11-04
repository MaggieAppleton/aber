// Grammar 09 page: the decide box shows the current picks, and the live window follows them.
addEventListener("load", () => {
  const d = document.querySelector(".jig-dock"), h = document.querySelector(".jig-head"); if (d && h) h.append(d);
  const page = document.body.dataset.jig;
  const MAP = { send: ["send", { "A same glyph": "plane", "B question mark": "ask" }], log: ["log", { "A thread and Dumps": "none", "B log segment": "segment" }] };
  const pick = id => { let v; try { v = JSON.parse(localStorage.getItem(`jig:${page}:${id}`))?.choice; } catch {} return v === undefined ? document.querySelector(`[data-decision="${id}"]`)?.dataset.default : v; };
  const hero = document.querySelector(".mk-host[data-live]");
  const paint = () => {
    document.querySelectorAll("[data-pick]").forEach(li => { const v = pick(li.dataset.pick); li.querySelector(".pick").innerHTML = v ? `Current pick: <b>${v}</b>` : "No pick yet"; });
    const opt = {}; for (const [id, [k, vals]] of Object.entries(MAP)) { const v = vals[pick(id)]; if (v) opt[k] = v; }
    if (hero?._s) window.AberMake.set(hero, opt);
  };
  paint();
  document.addEventListener("click", e => { if (e.target.closest(".jig-choose")) setTimeout(paint, 0); });
});
