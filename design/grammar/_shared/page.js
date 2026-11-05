// Load the input-modality tracker on every page (focus rings only for keyboard interaction).
if (!document.querySelector('script[src$="modality.js"]')) { const m = document.createElement("script"); m.src = new URL("modality.js", document.currentScript ? document.currentScript.src : location.href).href; document.head.appendChild(m); }
// The grammar page template's behaviour. Load after manifest.js, both deferred, before the shell's jig.js runs its init
// (jig.js waits for DOMContentLoaded, so any deferred order works).
// - Fills <header class="pg-head"> from the manifest: back link, number and title, one sentence, a live status line.
// - Marks decided questions (data-decided) and revised targets (data-revised) from the manifest, so the index and page agree.
// - Labels revised targets "Revised 5 Nov", and "New since you last looked" when newer than your previous visit.
// - Lists the manifest's decided questions at the top of .pg-decided.
// - Details open closed; opening one fires a resize so stages inside can measure themselves.
(() => {
  const G = window.GRAMMAR, U = G?.util;
  const key = document.body.dataset.jig;
  const page = G?.pages.find(p => p.key === key);
  if (!page) { console.warn(`page.js: no manifest entry for ${key}`); return; }
  const visit = U.visit(page);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const target = id => document.querySelector(`[data-decision="${CSS.escape(id)}"]`) || document.getElementById(id);

  // Decided questions and revised targets come from the manifest
  for (const d of page.decisions) {
    const g = document.querySelector(`[data-decision="${CSS.escape(d.id)}"]`);
    if (!g) { console.warn(`page.js: ${key} has no [data-decision="${d.id}"]`); continue; }
    if (d.pick) g.dataset.decided = d.pick;
  }
  const newRevs = [];
  for (const r of page.revised) {
    const el = target(r.target);
    if (!el) { console.warn(`page.js: ${key} has no revised target "${r.target}"`); continue; }
    el.dataset.revised = r.at;
    const isNew = U.isNew(page, r, visit.prev);
    if (isNew) newRevs.push(r);
    const p = document.createElement("p"); p.className = "pg-rev";
    p.innerHTML = `<span>Revised ${U.day(r.at)}</span>${isNew ? `<span class="new">New since you last looked</span>` : ""}<span class="what">${esc(r.what)}</span>`;
    const h = el.querySelector(":scope > h2");
    if (h) h.after(p); else el.prepend(p);
  }

  // Header
  const head = document.querySelector(".pg-head");
  if (head) {
    head.innerHTML = `<a class="pg-back" href="../"><i class="ph ph-arrow-left" aria-hidden="true"></i>Grammar</a>
      <h1><span class="pg-num">${esc(page.num)}</span>${esc(page.title)}</h1>
      <p class="pg-sum">${esc(page.sum)}</p>
      <p class="pg-status"></p>`;
    const status = head.querySelector(".pg-status");
    const paint = () => {
      const open = U.open(page), left = U.unpicked(page);
      const bits = [];
      if (open.length) bits.push(`<span class="is-open">${left.length} of ${open.length} ${open.length === 1 ? "choice" : "choices"} open</span>`);
      else bits.push(`<span>Decided ${U.day(page.decided)}</span>`);
      const last = U.latest(page);
      if (last) bits.push(`<span>Revised ${U.day(last)}</span>`);
      if (newRevs.length) bits.push(`<span class="is-new">New since you last looked</span>`);
      status.innerHTML = bits.join("");
    };
    paint();
    document.addEventListener("jig:change", paint);
  }

  // Decided: the manifest's decided questions first, then any page-specific lines already in the list
  const list = document.querySelector(".pg-decided .pg-list");
  if (list) {
    const items = page.decisions.filter(d => d.pick).map(d => {
      const li = document.createElement("li"); li.innerHTML = `<b>${esc(d.q)}</b>${esc(d.pick)}`; return li;
    });
    list.prepend(...items);
  }

  // Details: closed by default; stages inside measure on open
  document.querySelectorAll(".pg-details").forEach(d => {
    d.open = false;
    d.addEventListener("toggle", () => { if (d.open) requestAnimationFrame(() => dispatchEvent(new Event("resize"))); });
  });
  // A link to something inside closed Details opens it
  const reveal = () => { const el = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null; const d = el?.closest(".pg-details"); if (d) { d.open = true; el.scrollIntoView(); } };
  addEventListener("hashchange", reveal); addEventListener("load", reveal);
})();
