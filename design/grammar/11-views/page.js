// Grammar 11 page: before/after viewers (state and layout), and choices flowing into the main stages.
(() => {
  const page = document.body.dataset.jig;
  const load = id => { try { return JSON.parse(localStorage.getItem(`jig:${page}:${id}`)) || {}; } catch { return {}; } };
  const CHOICE = {
    dim: v => ({ dim: /recede/i.test(v) ? "recede" : "fade" }),
    size: v => ({ size: /area/i.test(v) ? "area" : "placed" }),
    labels: v => ({ labels: /always/i.test(v) ? "always" : "hover" }),
  };
  const current = () => Object.entries(CHOICE).reduce((o, [id, f]) => {
    const s = load(id), def = document.querySelector(`[data-decision="${id}"]`)?.dataset.default;
    return Object.assign(o, f(s.choice ?? def ?? ""));
  }, {});

  // The main stages (not the option stages) follow whatever is chosen
  const applyChoices = () => {
    const c = current();
    document.querySelectorAll(".cmp-after [data-v11]").forEach(h => { if (!h.v11) return; const S = h.v11; const patch = {};
      if (S.root.dataset.dim !== c.dim) patch.dim = c.dim; if (S.size !== c.size) patch.size = c.size; if (S.labels !== c.labels) patch.labels = c.labels;
      if (Object.keys(patch).length) h.v11.set(patch); });
  };

  // Before/after: state (at rest, selected) and layout (side by side, today, rebuilt)
  document.querySelectorAll(".cmp").forEach(cmp => {
    const grid = cmp.querySelector(".cmp-grid"), img = cmp.querySelector(".cmp-today img"), host = cmp.querySelector("[data-v11]");
    const cfg = JSON.parse(host.dataset.v11);
    cmp.querySelectorAll(".seg").forEach(seg => seg.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      seg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      if (seg.dataset.seg === "mode") grid.dataset.mode = b.value;
      if (seg.dataset.seg === "state") {
        const on = b.value === "sel";
        img.src = `screenshots/today-${cfg.view}${on ? "-sel" : ""}-1440.png`;
        img.alt = `Today's ${cfg.view} view${on ? " with an object open in the pane" : ", nothing open"}`;
        const patch = { sel: on ? cmp.dataset.sel : null };
        if (host.v11 && host.v11.view !== cfg.view) patch.view = cfg.view;
        host.v11?.set(patch);
      }
    }));
  });

  document.addEventListener("jig:change", applyChoices);
  const ready = () => document.querySelectorAll("[data-v11]").length === document.querySelectorAll("[data-v11] .v11").length;
  const wait = () => ready() ? applyChoices() : setTimeout(wait, 50);
  wait();
})();
