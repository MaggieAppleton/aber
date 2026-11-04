// Grammar 1: foundations. Specimens, the decide box, and Dial Kit dials on top of ../_shared/tokens.css.
// The stage itself comes from ../_shared/stage.js.
(() => {
  // Object glyphs: app/web/src/ui/atoms.tsx OBJECT_ICONS, plus Signpost (tripwire) and Sparkle (suggestion, no app icon).
  const TYPES = {
    dump:       { icon: "tray-arrow-down", name: "Dump",       purpose: "What I said" },
    signal:     { icon: "pulse",           name: "Signal",     purpose: "One observation" },
    theme:      { icon: "binoculars",      name: "Theme",      purpose: "An area of attention" },
    theory:     { icon: "target",          name: "Theory",     purpose: "A claim that could be wrong" },
    prototype:  { icon: "pencil-ruler",    name: "Prototype",  purpose: "A theory, built" },
    tripwire:   { icon: "signpost",        name: "Tripwire",   purpose: "What would change my mind" },
    suggestion: { icon: "sparkle",         name: "Suggestion", purpose: "An agent's proposed change" },
  };
  const glyph = t => `<i class="ph ph-${TYPES[t].icon} i-reg" aria-hidden="true"></i><i class="ph-fill ph-${TYPES[t].icon} i-fill" aria-hidden="true"></i>`;
  const tile = (t, extra = "") => `<span class="tile ${extra}" data-type="${t}">${glyph(t)}</span>`;
  const unit = (v, u) => `${v}<span class="unit">${u}</span>`;
  const tag = (kind, icon, word) => `<span class="tag ${kind}"><i class="ph ph-${icon}" aria-hidden="true"></i>${word}</span>`;
  const iconBtn = (icon, name, key, open) => `
    <span class="tip-host${open ? " is-open" : ""}">
      <button type="button" class="btn btn-icon${open ? " is-hover" : ""}" aria-label="${name}" aria-keyshortcuts="${key}"><i class="ph ph-${icon}" aria-hidden="true"></i></button>
      <span class="tip" role="tooltip">${name}<kbd>${key}</kbd></span>
    </span>`;

  // Specimens
  const table = document.getElementById("glyph-table");
  for (const t of Object.keys(TYPES)) {
    table.insertAdjacentHTML("beforeend", `
      <span class="gn">${TYPES[t].name}<small>${TYPES[t].purpose}</small></span>
      <div><button type="button" class="tile" data-type="${t}" aria-pressed="false" aria-label="${TYPES[t].name}">${glyph(t)}</button></div>
      <div class="is-hover">${tile(t)}</div>
      <div class="is-selected">${tile(t)}</div>`);
  }
  table.addEventListener("click", e => {
    const b = e.target.closest("button.tile"); if (!b) return;
    b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
  });
  for (const el of document.querySelectorAll(".tile:empty")) el.innerHTML = glyph(el.dataset.type);
  const HEROES = [
    { t: "signal", label: "Signals", value: unit(41, "this month"), foot: `<span class="tag">30 last month</span>` },
    { t: "theory", label: "Confidence", value: unit(4, "/5"), foot: tag("pos", "trend-up", "Up from 3") },
    { t: "tripwire", label: "Tripwires", value: unit(9, "watching"), foot: tag("neg", "signpost", "1 tripped") },
  ];
  for (const host of document.querySelectorAll("[data-heroes]")) host.innerHTML = HEROES.map(h => `
    <div class="surface hero"><div class="hero-head">${tile(h.t, "sm")}<span>${h.label}</span></div><div class="hero-value">${h.value}</div><div>${h.foot}</div></div>`).join("");
  for (const host of document.querySelectorAll("[data-buttons]")) host.innerHTML = `
    <div class="btn-row">
      <button type="button" class="btn btn-primary has-icon"><i class="ph ph-plus"></i>New theory</button>
      <button type="button" class="btn btn-secondary">Link theme</button>
      <button type="button" class="btn btn-quiet">Undo merge</button>
    </div>
    <div class="btn-row" style="margin-top:var(--s-3); padding-top:30px">
      <span class="icon-group">${iconBtn("pencil-simple", "Edit", "E", true)}${iconBtn("link-simple", "Link", "L")}${iconBtn("x", "Close", "Esc")}</span>
    </div>
    <div class="decision" style="margin-top:var(--s-4)"><button type="button" class="btn btn-secondary">Dismiss</button><button type="button" class="btn btn-primary">Accept</button></div>`;

  // Decide box: show each open choice's current pick (jig.js stores them in localStorage)
  const page = document.body.dataset.jig;
  const paintPicks = () => {
    for (const li of document.querySelectorAll("[data-pick]")) {
      const id = li.dataset.pick, sec = document.querySelector(`[data-decision="${id}"]`);
      let v = null; try { v = JSON.parse(localStorage.getItem(`jig:${page}:${id}`))?.choice; } catch {}
      v = v ?? sec?.dataset.default;
      li.querySelector(".pick").innerHTML = v ? `Current pick: <b>${v}</b>` : "No pick yet";
    }
  };
  addEventListener("load", paintPicks);
  document.addEventListener("click", e => { if (e.target.closest(".jig-choose")) setTimeout(paintPicks, 0); });

  // Resolved pixel values next to token names
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;height:0";
  document.body.append(probe);
  const paintPx = () => {
    for (const el of document.querySelectorAll("[data-px]")) {
      probe.style.width = `var(${el.dataset.px})`;
      el.textContent = `${Math.round(probe.getBoundingClientRect().width)}px`;
    }
  };
  paintPx();

  // Dial Kit
  const root = document.documentElement;
  const DIALS = {
    neutralTone:  { token: "--tone",      def: [0.25, -1, 1, 0.05], unit: "" },
    typeColour:   { token: "--type-k",    def: [1, 0, 1, 0.05],     unit: "" },
    radius:       { token: "--r",         def: [7, 4, 12, 1],       unit: "px" },
    bodySize:     { token: "--text-body", def: [13, 12, 16, 1],     unit: "px" },
    shadowSoftness: { token: "--soft",    def: [1, 0.5, 2, 0.05],   unit: "" },
  };
  const start = () => {
    if (!window.DialKit) return console.warn("Dial Kit did not load");
    window.DialKit.createDialRoot({ position: "top-right", defaultOpen: matchMedia("(min-width: 1100px)").matches, theme: "light" });
    const config = Object.fromEntries(Object.entries(DIALS).map(([k, d]) => [k, d.def]));
    config.copyValues = { type: "action", label: "Copy values" };
    let current = {};
    const kit = window.DialKit.createDialKit("Foundations", config, {
      persist: { key: "grammar-01-foundations-v4" },
      onAction: async path => {
        if (path !== "copyValues") return;
        const text = Object.entries(DIALS).map(([k, d]) => `${d.token}: ${current[k]}${d.unit};`).join("\n");
        try { await navigator.clipboard.writeText(text); } catch { console.log(text); }
      },
    });
    kit.subscribe(values => {
      current = values;
      for (const [k, d] of Object.entries(DIALS)) root.style.setProperty(d.token, `${values[k]}${d.unit}`);
      paintPx();
    });
  };
  if (document.readyState === "complete") start(); else addEventListener("load", start);
})();
