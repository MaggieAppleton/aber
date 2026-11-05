// Grammar 09 page: the live window follows the ⌘⇧L pick (or the recommendation until there is one).
addEventListener("load", () => {
  const MAP = { log: ["log", { "A the Dumps sheet": "sheet", "B Dumps in the rail": "rail" }] };
  const hero = document.querySelector(".mk-host[data-live]");
  const paint = () => {
    const opt = {}; for (const [id, [k, vals]] of Object.entries(MAP)) { const v = vals[window.Jig?.pick(id)]; if (v) opt[k] = v; }
    if (hero?._s) window.AberMake.set(hero, opt);
  };
  paint();
  document.addEventListener("jig:change", paint);
});
