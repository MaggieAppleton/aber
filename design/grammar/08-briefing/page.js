// Grammar 08 page: the day toggle and Reset for the live Briefing.
(() => {
  const start = () => {
    const host = document.getElementById("hero"), bar = document.getElementById("days");
    if (!host || !bar) return;
    bar.addEventListener("click", e => {
      const b = e.target.closest("button[data-day]");
      if (b) { bar.querySelectorAll("button[data-day]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); window.Brief08.reset(host, { day: b.dataset.day }); }
      else if (e.target.closest("[data-reset]")) window.Brief08.reset(host);
    });
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", start); else start();
})();
