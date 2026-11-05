// Grammar 12 page: the main phone and tablet follow the choices; the flows play themselves in the main phone, with a finger.
(() => {
  const page = document.body.dataset.jig;
  const load = id => { try { return JSON.parse(localStorage.getItem(`jig:${page}:${id}`)) || {}; } catch { return {}; } };
  const pick = id => load(id).choice ?? document.querySelector(`[data-decision="${id}"]`)?.dataset.default ?? "";
  const current = () => ({ tabs: pick("tabs")[0] || "B", scale: /touch/i.test(pick("scale")) ? "touch" : "desk", views: /^B/.test(pick("views")) ? "atlas" : /^C/.test(pick("views")) ? "all" : "none" });
  const phone = () => document.getElementById("main-phone"), tablet = () => document.getElementById("main-tablet");
  const apply = () => { const c = current(); phone()?.ph?.set(c); tablet()?.ph?.set({ scale: c.scale }); };

  /* ── Flows ── */
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const T = () => phone().ph.state.cfg.tabs;
  const FLOWS = [
    ["Accept a suggestion, then undo", [
      ["Open Briefing", '[data-tab="briefing"]'],
      ["Add evidence: the dash goes and the item leaves", '[data-unit="sug:t1"] [data-decide="yes"]'],
      ["A toast above the pill offers Undo", null, 1200],
      ["Undo puts it back", ".ph-toast [data-undo]"],
    ]],
    ["A theory, a signal's peek, Open, Back", [
      ["Theories", '[data-tab="theory"]'],
      ["Tap a theory: it pushes in from the right", '.ph-screen.top [data-sel="t1"]'],
      ["Tap a supporting signal: its peek rises as a sheet", '.ph-screen.top [data-open="s1"]'],
      ["Drag the handle up for every relation", ".ph-sheet [data-grab]", 0, "large"],
      ["Open pushes the signal in", ".ph-sheet-foot [data-full]"],
      ["Back to the theory", ".ph-screen.top [data-back]"],
      ["Back to the list", ".ph-screen.top [data-back]"],
    ]],
    ["Dump by voice from the pill", [
      ["The microphone records in the pill", "[data-rec-start]"],
      ["Talk", null, 2400],
      ["Stop dumps it; Dumps shows the Working spinner", "[data-rec-stop]"],
      ["When it's read, a toast says what it made", null, 3000],
      ["Dumps lists it at the top of Today", () => T() === "A" ? '[data-tab="more"]' : '[data-tab="dump"]'],
    ]],
    ["Find", [
      ["Find: a sheet with the field focused", ".ph-screen.top [data-find]"],
      ["Type “memory”: results by type", "[data-q]", 0, "type:memory"],
      ["A result opens in its own tab", "[data-results] [data-sel]"],
    ]],
  ];
  const finger = (host, el, hold) => {
    const ph = host.querySelector(".pw"), k = ph.getBoundingClientRect().width / ph.offsetWidth, r = el.getBoundingClientRect(), p = ph.getBoundingClientRect();
    const f = document.createElement("div"); f.className = `ph-touch${hold ? " hold" : ""}`;
    f.style.left = `${(r.left + r.width / 2 - p.left) / k}px`; f.style.top = `${(r.top + r.height / 2 - p.top) / k}px`;
    ph.append(f); setTimeout(() => f.remove(), 1000);
  };
  const reveal = el => {
    const sc = el.closest(".ph-scroll, .ph-sheet-body"); if (!sc) return;
    const r = el.getBoundingClientRect(), s = sc.getBoundingClientRect();
    if (r.top < s.top + 40 || r.bottom > s.bottom - 160) sc.scrollTop += (r.top - s.top) - s.height / 3;
  };
  let running = false;
  const play = async (i, list) => {
    if (running) return; running = true;
    const host = phone(), btns = document.querySelectorAll(".nr-flows .run button");
    btns.forEach(b => b.setAttribute("aria-busy", "true"));
    host.ph.reset(); host.ph.set(current()); await wait(500);
    const items = list.querySelectorAll("li");
    for (const [n, [, sel, ms = 0, act]] of FLOWS[i][1].entries()) {
      items.forEach((li, j) => li.classList.toggle("on", j === n));
      if (sel) {
        const q = typeof sel === "function" ? sel() : sel, el = host.querySelector(q);
        if (!el) { console.warn(`flow ${i}: no ${q}`); break; }
        reveal(el); await wait(250); finger(host, el);
        await wait(200);
        if (act === "large") host.ph.sheetTo("large");
        else if (act?.startsWith("type:")) { el.focus(); for (const ch of act.slice(5)) { el.value += ch; el.dispatchEvent(new Event("input", { bubbles: true })); await wait(90); } }
        else el.click();
      }
      await wait(ms || 1100);
    }
    items.forEach(li => li.classList.remove("on"));
    btns.forEach(b => b.removeAttribute("aria-busy")); running = false;
  };
  const flowsEl = document.getElementById("flows");
  if (flowsEl) flowsEl.innerHTML = FLOWS.map(([name, steps], i) => `<li><span class="run"><button type="button" data-play="${i}"><i class="ph-fill ph-play" aria-hidden="true"></i>Play</button>${name}</span><ol>${steps.map(s => `<li>${s[0]}</li>`).join("")}</ol></li>`).join("");
  flowsEl?.addEventListener("click", e => { const b = e.target.closest("[data-play]"); if (b) play(+b.dataset.play, b.closest("li").querySelector("ol")); });

  document.addEventListener("jig:change", apply);
  const ready = () => phone()?.ph && tablet()?.ph;
  const go = () => ready() ? apply() : setTimeout(go, 50);
  go();
})();
