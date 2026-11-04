// Grammar 07 page: the demo toggles (slow motion, origins, reduced motion), the windows following the picks, and the Play scripts.
(() => {
  const R7 = window.R7, $$ = s => [...document.querySelectorAll(s)];
  const wait = ms => new Promise(r => setTimeout(r, ms * +(document.body.dataset.slow || 1)));

  /* ── Toggles: page-wide, so every window shows the same motion ── */
  const KEY = "jig:grammar-07-rungs:toggles";
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
  const apply = (name, on) => {
    const b = document.querySelector(`[data-tog="${name}"]`); b?.setAttribute("aria-pressed", String(on));
    if (name === "slow") document.body.dataset.slow = on ? "4" : "1";
    if (name === "origins") { document.body.dataset.origins = String(on); if (!on) $$(".r7-orig").forEach(s => s.replaceChildren()); }
    if (name === "reduce") document.body.dataset.reduce = String(on);
  };
  ["slow", "origins", "reduce"].forEach(n => apply(n, !!saved[n]));
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-tog]"); if (!b) return;
    const on = b.getAttribute("aria-pressed") !== "true"; apply(b.dataset.tog, on); saved[b.dataset.tog] = on;
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch {}
  });

  /* ── Play: scripted runs through the same API the pointer and keys use ── */
  let playing = new WeakMap();
  const PLAYS = {
    async open(host) {
      const s = host._s; if (s.view !== "default") return;
      if (s.back.length) { R7.back(host); await wait(700); }
      if (s.type !== "home") { s.type = "home"; s.back = []; R7.render(host); }
      const trig = host.querySelector('.nv-scroller [data-open="t1"]'); if (!trig) return;
      R7.showPeek(host, trig, { pinned: true }); await wait(1100);
      R7.open(host, "t1", null); await wait(1400);
      R7.back(host);
    },
    async pos(host) {
      const s = host._s; R7.closePeek(host, { instant: true });
      if (s.type !== "theme" || s.back.length) { s.type = "theme"; s.sel.theme = "coi"; s.back = []; R7.render(host); }
      const trigs = [...host.querySelectorAll(".nv-scroller .ob-sec [data-open]")].filter(t => t.closest(".ob-rows")).slice(0, 4);
      for (const [i, t] of trigs.entries()) { R7.showPeek(host, t, { pinned: false }); await wait(i ? 650 : 900); }
      R7.closePeek(host);
    },
  };
  document.addEventListener("click", async e => {
    const b = e.target.closest("[data-play]"); if (!b) return;
    const host = b.closest(".jig-option")?.querySelector(".r7-host"); if (!host?._s || playing.get(host)) return;
    playing.set(host, true); b.setAttribute("aria-busy", "true");
    try { await PLAYS[b.dataset.play](host); } finally { playing.delete(host); b.removeAttribute("aria-busy"); }
  });

  /* ── The demo windows follow the picks; the decide box shows them ── */
  const MAP = { open: ["open", { "a Shared tile and title": "morph", "b Cross-fade and slide": "fade" }], pos: ["pos", { "a Beside the trigger": "beside", "b Below the trigger": "below" }], back: ["back", { "a The preview": "preview", "b The peek": "peek" }] };
  addEventListener("load", () => {
    const d = document.querySelector(".jig-dock"), h = document.querySelector(".jig-head"); if (d && h) h.append(d);
    const pick = id => { let v; try { v = JSON.parse(localStorage.getItem(`jig:grammar-07-rungs:${id}`))?.choice; } catch {} return v === undefined ? document.querySelector(`[data-decision="${id}"]`)?.dataset.default : v; };
    const paint = () => {
      $$("[data-pick]").forEach(li => { const v = pick(li.dataset.pick); li.querySelector(".pick").innerHTML = v ? `Current pick: <b>${v}</b>` : "No pick yet"; });
      const patch = {}; for (const [id, [key, vals]] of Object.entries(MAP)) { const v = vals[pick(id)]; if (v) patch[key] = v; }
      $$("[data-follows-picks]").forEach(h => h._s && R7.set(h, patch));
    };
    paint(); document.addEventListener("click", e => { if (e.target.closest(".jig-choose")) setTimeout(paint, 0); });
  });
})();
