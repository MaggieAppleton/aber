// Grammar 1: foundations. Renders repeated samples and wires the Dial Kit dials to tokens.css.
(() => {
  const TYPES = {
    dump:       { icon: "tray-arrow-down", name: "Dump",       purpose: "What I said" },
    signal:     { icon: "broadcast",       name: "Signal",     purpose: "One observation" },
    theme:      { icon: "stack",           name: "Theme",      purpose: "An area of attention" },
    theory:     { icon: "lightbulb",       name: "Theory",     purpose: "A claim that could be wrong" },
    prototype:  { icon: "cube",            name: "Prototype",  purpose: "A theory, built" },
    tripwire:   { icon: "signpost",        name: "Tripwire",   purpose: "What would change my mind" },
    suggestion: { icon: "sparkle",         name: "Suggestion", purpose: "An agent's proposed change" },
  };
  const glyph = t => `<i class="ph ph-${TYPES[t].icon} i-reg" aria-hidden="true"></i><i class="ph-fill ph-${TYPES[t].icon} i-fill" aria-hidden="true"></i>`;
  const tile = (t, extra = "") => `<span class="tile ${extra}" data-type="${t}">${glyph(t)}</span>`;

  // 3. Glyph table: rest / hover / selected
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

  // Fill any empty tile (chips use these)
  for (const el of document.querySelectorAll(".tile:empty")) el.innerHTML = glyph(el.dataset.type);

  // Rows
  const unit = (v, u) => `${v}<span class="unit">${u}</span>`;
  const ROWS = [
    { t: "theory", name: "Small teams will run their own eval suites", ctx: "Agent observability", end: `<span class="row-value">${unit(4, "/5")}</span>`, sel: true },
    { t: "signal", name: "Foglamp ships agent HUD", ctx: "foglamp.dev", end: `<span class="tag"><span class="dot-new" role="img" aria-label="New"></span>2d</span>` },
    { t: "theme", name: "Agent observability", ctx: "3 theories", end: `<span class="badge">41</span>` },
    { t: "tripwire", name: "A frontier lab ships a hosted eval suite that small teams adopt", ctx: "Small teams will run their own eval suites", end: `<span class="tag neg"><i class="ph-fill ph-signpost"></i>Tripped</span>` },
    { t: "prototype", name: "Eval notebook", ctx: "Tests Small teams will run their own eval suites", end: `<span class="tag warn"><i class="ph ph-hammer"></i>Building</span>` },
    { t: "dump", name: "Ramble about eval tooling after the Foglamp demo", ctx: "Voice note, 2m 14s", end: `<span class="tag"><i class="ph ph-circle-notch spin"></i>Processing</span>` },
    { t: "suggestion", name: "Add Braintrust raises Series B as evidence", ctx: "Supports Small teams will run their own eval suites", end: `<span class="tag"><i class="ph ph-circle-dashed"></i>Pending</span>`, draft: true },
  ];
  const rowHTML = (r, withSel) => `
    <div class="row${r.draft ? " draft" : ""}${withSel && r.sel ? " is-selected" : ""}" tabindex="0" role="button" aria-pressed="${withSel && r.sel ? "true" : "false"}">
      ${tile(r.t)}
      <div class="row-main"><span class="row-name">${r.name}</span><span class="row-ctx">${r.ctx}</span></div>
      <div class="row-end">${r.end}</div>
    </div>`;
  for (const host of document.querySelectorAll("[data-sample-rows]")) {
    const all = host.dataset.sampleRows === "all";
    const rows = all ? ROWS : ROWS.filter(r => ["signal", "theory", "theme", "tripwire"].includes(r.t));
    host.innerHTML = rows.map(r => rowHTML(r, all)).join("");
    host.addEventListener("click", e => {
      const row = e.target.closest(".row"); if (!row) return;
      const on = !row.classList.contains("is-selected");
      host.querySelectorAll(".row").forEach(x => { x.classList.remove("is-selected"); x.setAttribute("aria-pressed", "false"); });
      row.classList.toggle("is-selected", on); row.setAttribute("aria-pressed", String(on));
    });
    host.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches(".row")) { e.preventDefault(); e.target.click(); } });
  }

  // Hero numbers
  const HEROES = [
    { t: "signal", label: "Signals", value: unit(42, "this week"), foot: `<span class="tag">30 last week</span>` },
    { t: "theory", label: "Confidence", value: unit(4, "/5"), foot: `<span class="tag pos"><i class="ph ph-trend-up"></i>Up from 3</span>` },
    { t: "tripwire", label: "Tripwires", value: unit(9, "watching"), foot: `<span class="tag neg"><i class="ph-fill ph-signpost"></i>1 tripped</span>` },
    { t: "dump", label: "Dumps", value: unit(128, "/30d"), foot: `<span class="tag pos"><i class="ph ph-check-circle"></i>All processed</span>` },
  ];
  for (const host of document.querySelectorAll("[data-heroes]")) {
    host.innerHTML = HEROES.map(h => `
      <div class="surface hero">
        <div class="hero-head">${tile(h.t, "sm")}<span>${h.label}</span></div>
        <div class="hero-value">${h.value}</div>
        <div class="hero-foot">${h.foot}</div>
      </div>`).join("");
  }

  // Buttons
  const iconBtn = (icon, name, key, open) => `
    <span class="tip-host${open ? " is-open" : ""}">
      <button type="button" class="btn btn-icon${open ? " is-hover" : ""}" aria-label="${name}" aria-keyshortcuts="${key}"><i class="ph ph-${icon}"></i></button>
      <span class="tip" role="tooltip">${name}<kbd>${key}</kbd></span>
    </span>`;
  for (const host of document.querySelectorAll("[data-buttons]")) {
    host.innerHTML = `
      <p class="cap">Primary, secondary, quiet, icon</p>
      <div class="btn-row">
        <button type="button" class="btn btn-primary has-icon"><i class="ph ph-plus"></i>New theory</button>
        <button type="button" class="btn btn-secondary">Link theme</button>
        <button type="button" class="btn btn-quiet">Undo merge</button>
      </div>
      <div class="btn-row" style="margin-top:var(--s-3); padding-top:30px">
        <span class="icon-group">
          ${iconBtn("pencil-simple", "Edit", "E", true)}
          ${iconBtn("link-simple", "Link", "L")}
          ${iconBtn("x", "Close", "Esc")}
        </span>
      </div>
      <p class="cap" style="margin-top:var(--s-5)">A decision: Dismiss, then Accept</p>
      <div class="surface" style="padding:var(--s-3) var(--s-4) var(--s-3)">
        <div style="display:flex; gap:var(--s-3); align-items:flex-start; padding-bottom:var(--s-3)">
          ${tile("suggestion")}
          <div style="min-width:0"><span class="t-strong">Add as evidence</span><div class="chips" style="margin-top:var(--s-2)">
            <a class="chip draft" href="#"><span class="tile sm" data-type="signal">${glyph("signal")}</span><span>Braintrust raises Series B</span><i class="ph ph-arrow-up-right go"></i></a>
          </div></div>
        </div>
        <div class="decision">
          <button type="button" class="btn btn-secondary">Dismiss</button>
          <button type="button" class="btn btn-primary">Accept</button>
        </div>
      </div>`;
  }

  // Show resolved pixel values next to token names
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
  const DIALS = {
    groundWarmth:   { token: "--warmth",    def: [0.5, 0, 1, 0.05], unit: "" },
    radius:         { token: "--r",         def: [10, 4, 16, 1],    unit: "px" },
    tintStrength:   { token: "--tint",      def: [1, 0, 2, 0.05],   unit: "" },
    bodySize:       { token: "--text-body", def: [14, 12, 16, 1],   unit: "px" },
    shadowSoftness: { token: "--soft",      def: [1, 0.5, 2, 0.05], unit: "" },
  };
  const start = () => {
    if (!window.DialKit) return console.warn("Dial Kit did not load");
    window.DialKit.createDialRoot({ position: "top-right", defaultOpen: matchMedia("(min-width: 900px)").matches, theme: "light" });
    const config = Object.fromEntries(Object.entries(DIALS).map(([k, d]) => [k, d.def]));
    config.copyValues = { type: "action", label: "Copy values" };
    let current = {};
    const kit = window.DialKit.createDialKit("Foundations", config, {
      persist: { key: "grammar-01-foundations" },
      onAction: async path => {
        if (path !== "copyValues") return;
        const text = Object.entries(DIALS).map(([k, d]) => `${d.token}: ${current[k]}${d.unit};`).join("\n");
        try { await navigator.clipboard.writeText(text); } catch { console.log(text); }
      },
    });
    kit.subscribe(values => {
      current = values;
      for (const [k, d] of Object.entries(DIALS)) document.documentElement.style.setProperty(d.token, `${values[k]}${d.unit}`);
      paintPx();
    });
  };
  if (document.readyState === "complete") start(); else addEventListener("load", start);
})();
