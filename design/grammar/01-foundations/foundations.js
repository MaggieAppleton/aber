// Grammar 1: foundations. One mini Aber screen renders every in-context sample; Dial Kit dials drive tokens.css.
(() => {
  // Object glyphs match app/web/src/ui/atoms.tsx OBJECT_ICONS. Tripwire is ICONS.turn (Signpost). Suggestion has no app icon: Sparkle.
  const TYPES = {
    dump:       { icon: "tray-arrow-down", name: "Dump",       plural: "Dumps",       purpose: "What I said" },
    signal:     { icon: "pulse",           name: "Signal",     plural: "Signals",     purpose: "One observation" },
    theme:      { icon: "binoculars",      name: "Theme",      plural: "Themes",      purpose: "An area of attention" },
    theory:     { icon: "target",          name: "Theory",     plural: "Theories",    purpose: "A claim that could be wrong" },
    prototype:  { icon: "pencil-ruler",    name: "Prototype",  plural: "Prototypes",  purpose: "A theory, built" },
    tripwire:   { icon: "signpost",        name: "Tripwire",   plural: "Tripwires",   purpose: "What would change my mind" },
    suggestion: { icon: "sparkle",         name: "Suggestion", plural: "Suggestions", purpose: "An agent's proposed change" },
  };
  const glyph = t => `<i class="ph ph-${TYPES[t].icon} i-reg" aria-hidden="true"></i><i class="ph-fill ph-${TYPES[t].icon} i-fill" aria-hidden="true"></i>`;
  const tile = (t, extra = "") => `<span class="tile ${extra}" data-type="${t}">${glyph(t)}</span>`;
  const unit = (v, u) => `${v}<span class="unit">${u}</span>`;
  const chip = (t, name, draft) => `<a class="chip${draft ? " draft" : ""}" href="#"${draft ? ` aria-label="Suggested link: ${name}"` : ""}>${tile(t, "sm")}<span>${name}</span><i class="ph ph-arrow-up-right go" aria-hidden="true"></i></a>`;
  const tag = (kind, icon, word) => `<span class="tag ${kind}"><i class="ph ph-${icon}" aria-hidden="true"></i>${word}</span>`;
  const iconBtn = (icon, name, key, open) => `
    <span class="tip-host${open ? " is-open" : ""}">
      <button type="button" class="btn btn-icon${open ? " is-hover" : ""}" aria-label="${name}" aria-keyshortcuts="${key}"><i class="ph ph-${icon}" aria-hidden="true"></i></button>
      <span class="tip" role="tooltip">${name}<kbd>${key}</kbd></span>
    </span>`;

  const THEORY = "Small teams will run their own eval suites";
  const ROWS = [
    { t: "signal", name: "Foglamp ships agent HUD", ctx: "foglamp.dev", end: `<span class="tag"><span class="dot-new" role="img" aria-label="New"></span><span class="mono">2d</span></span>` },
    { t: "theory", name: THEORY, ctx: "Held since March", end: `<span class="row-value">${unit(4, "/5")}</span>`, sel: true },
    { t: "tripwire", name: "A frontier lab ships a hosted eval suite that small teams adopt", ctx: `On: ${THEORY}`, end: tag("neg", "signpost", "Tripped") },
    { t: "prototype", name: "Eval notebook", ctx: `Tests: ${THEORY}`, end: tag("building", "hammer", "Building") },
    { t: "dump", name: "Ramble about eval tooling after the Foglamp demo", ctx: "Voice note, 2m 14s", end: tag("", "circle-notch spin", "Processing") },
    { t: "suggestion", name: "Add Braintrust raises Series B as evidence", ctx: `Supports: ${THEORY}`, end: tag("", "circle-dashed", "Pending"), draft: true },
    { t: "signal", name: "Braintrust raises Series B", ctx: "techcrunch.com", end: `<span class="tag mono">5d</span>` },
  ];
  const NAV = [
    { t: "dump", n: 12 }, { t: "signal", n: 214 }, { t: "theme", n: 9, sel: true }, { t: "theory", n: 23 },
    { t: "prototype", n: 4 }, { t: "tripwire", n: 11 }, { t: "suggestion", n: 3, pending: true },
  ];
  const HEROES = [
    { t: "signal", label: "Signals", value: unit(41, "this month"), foot: `<span class="tag">30 last month</span>` },
    { t: "theory", label: "Confidence", value: unit(4, "/5"), foot: tag("pos", "trend-up", "Up from 3") },
    { t: "tripwire", label: "Tripwires", value: unit(9, "watching"), foot: tag("neg", "signpost", "1 tripped") },
    { t: "dump", label: "Dumps", value: unit(128, "/30d"), foot: tag("", "check-circle", "All processed") },
  ];

  const rowHTML = (r, i, selIndex) => `
    <div class="row${r.draft ? " draft" : ""}${i === selIndex ? " is-selected" : ""}" tabindex="0" role="button" aria-pressed="${i === selIndex}" data-i="${i}">
      ${tile(r.t)}
      <div class="row-main"><span class="row-name">${r.name}</span><span class="row-ctx">${r.ctx}</span></div>
      <div class="row-end">${r.end}</div>
    </div>`;
  const heroesHTML = () => HEROES.map(h => `
    <div class="surface hero">
      <div class="hero-head">${tile(h.t, "sm")}<span>${h.label}</span></div>
      <div class="hero-value">${h.value}</div>
      <div class="hero-foot">${h.foot}</div>
    </div>`).join("");

  const peekHTML = r => {
    const theory = r.t === "theory";
    return `
      <div class="peek-head">
        ${tile(r.t)}
        <div class="peek-actions">${iconBtn("pencil-simple", "Edit", "E", false)}${iconBtn("arrows-out-simple", "Open in pane", "Enter")}${iconBtn("x", "Close", "Esc")}</div>
      </div>
      <div class="peek-title">${r.name}</div>
      ${theory ? `
      <dl class="fields">
        <dt>Status</dt><dd>${tag("ink", "check-circle", "Held")}</dd>
        <dt>Confidence</dt><dd><span>${unit(4, "/5")}</span></dd>
        <dt>Happens by</dt><dd>2028</dd>
        <dt>Theme</dt><dd>${chip("theme", "Agent observability")}</dd>
        <dt>Supports</dt><dd>${chip("signal", "Foglamp ships agent HUD")}</dd>
      </dl>
      <div class="peek-suggestion">
        <div class="peek-sug-line">${tile("suggestion", "sm")}<span><b>Add as evidence</b></span></div>
        ${chip("signal", "Braintrust raises Series B", true)}
        <div class="decision"><button type="button" class="btn btn-secondary">Dismiss</button><button type="button" class="btn btn-primary">Accept</button></div>
      </div>` : `<p class="row-ctx peek-ctx">${r.ctx}</p>`}`;
  };

  // The mini Aber screen. opts: sel ("white" | "sunk"), primary ("accent" | "ink"), mark ("tile" | "bare"), hero ("display"), mode ("list" | "theme"), peek ("wide" | "always" | "none")
  const miniScreen = (o = {}) => {
    const sel = o.selIndex ?? 1;
    const listRows = o.mode === "theme" ? ROWS.slice(0, 3) : ROWS;
    return `
    <div class="ms fx${o.hero === "display" ? " display" : ""}"
      ${o.mark ? `data-mark="${o.mark}"` : ""} ${o.sel ? `data-sel="${o.sel}"` : ""} ${o.primary ? `data-primary="${o.primary}"` : ""} data-peek="${o.peek || "wide"}">
      <div class="ms-grid">
        <nav class="ms-nav" aria-label="Object types">
          ${NAV.map(n => `<a href="#" class="nav-item${n.sel ? " is-selected" : ""}" aria-label="${TYPES[n.t].plural}">${tile(n.t)}<span class="nav-label">${TYPES[n.t].plural}</span><span class="nav-count${n.pending ? " badge pending" : ""}">${n.n}</span></a>`).join("")}
        </nav>
        <main class="ms-main">
          <div class="ms-head">
            ${tile("theme")}
            <span class="ms-title">Agent observability</span>
            <button type="button" class="btn btn-primary has-icon ms-new"><i class="ph ph-plus" aria-hidden="true"></i>New theory</button>
          </div>
          ${o.mode === "theme" ? `<div class="heroes ms-heroes">${heroesHTML()}</div>` : ""}
          <div class="surface list" data-rows>${listRows.map((r, i) => rowHTML(r, i, sel)).join("")}</div>
        </main>
        ${o.peek === "none" ? "" : `<aside class="ms-peek" aria-label="Peek">${peekHTML(listRows[sel])}</aside>`}
      </div>
    </div>`;
  };

  // Render every mini screen
  for (const host of document.querySelectorAll("[data-ms]")) {
    host.innerHTML = miniScreen(JSON.parse(host.dataset.ms || "{}"));
  }
  // Rows: click to select; the peek follows
  document.addEventListener("click", e => {
    const row = e.target.closest(".row"); if (row) {
      const list = row.parentElement;
      list.querySelectorAll(".row").forEach(x => { x.classList.remove("is-selected"); x.setAttribute("aria-pressed", "false"); });
      row.classList.add("is-selected"); row.setAttribute("aria-pressed", "true");
      const peek = row.closest(".ms")?.querySelector(".ms-peek");
      const ms = row.closest(".ms");
      if (peek) { const rows = ms.querySelector(".heroes") ? ROWS.slice(0, 3) : ROWS; peek.innerHTML = peekHTML(rows[+row.dataset.i]); }
      return;
    }
    if (e.target.closest(".chip, .nav-item")) e.preventDefault();
  });
  document.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches?.(".row")) { e.preventDefault(); e.target.click(); } });

  // ── Specimens ──
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
  for (const host of document.querySelectorAll("[data-heroes]")) host.innerHTML = heroesHTML();
  for (const host of document.querySelectorAll("[data-buttons]")) {
    host.innerHTML = `
      <div class="btn-row">
        <button type="button" class="btn btn-primary has-icon"><i class="ph ph-plus"></i>New theory</button>
        <button type="button" class="btn btn-secondary">Link theme</button>
        <button type="button" class="btn btn-quiet">Undo merge</button>
      </div>
      <div class="btn-row" style="margin-top:var(--s-3); padding-top:30px">
        <span class="icon-group">${iconBtn("pencil-simple", "Edit", "E", true)}${iconBtn("link-simple", "Link", "L")}${iconBtn("x", "Close", "Esc")}</span>
      </div>
      <div class="decision" style="margin-top:var(--s-4)"><button type="button" class="btn btn-secondary">Dismiss</button><button type="button" class="btn btn-primary">Accept</button></div>`;
  }

  // ── Global palette, selected style and pin ──
  const root = document.documentElement;
  const store = { get: k => { try { return localStorage.getItem(`g01v3:${k}`); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(`g01v3:${k}`, v); } catch {} } };
  for (const seg of document.querySelectorAll("[data-seg]")) {
    const key = seg.dataset.seg;
    const apply = v => {
      if (key === "pin") root.toggleAttribute("data-pinned", v === "on"); else root.dataset[key] = v;
      seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.value === v)));
      store.set(key, v);
    };
    apply(store.get(key) || seg.dataset.default);
    seg.addEventListener("click", e => { const b = e.target.closest("button"); if (b) apply(b.value); });
  }

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

  // ── Dial Kit ──
  const DIALS = {
    radius:         { token: "--r",         def: [7, 4, 12, 1],       unit: "px" },
    bodySize:       { token: "--text-body", def: [13, 12, 16, 1],     unit: "px" },
    shadowSoftness: { token: "--soft",      def: [1, 0.5, 2, 0.05],   unit: "" },
  };
  const start = () => {
    if (!window.DialKit) return console.warn("Dial Kit did not load");
    window.DialKit.createDialRoot({ position: "top-right", defaultOpen: matchMedia("(min-width: 1100px)").matches, theme: "light" });
    const config = Object.fromEntries(Object.entries(DIALS).map(([k, d]) => [k, d.def]));
    config.copyValues = { type: "action", label: "Copy values" };
    let current = {};
    const kit = window.DialKit.createDialKit("Foundations", config, {
      persist: { key: "grammar-01-foundations-v3" },
      onAction: async path => {
        if (path !== "copyValues") return;
        const text = [...Object.entries(DIALS).map(([k, d]) => `${d.token}: ${current[k]}${d.unit};`),
          `selected: ${root.dataset.sel};`, `primary: ${root.dataset.primary};`, `type mark: ${root.dataset.mark};`].join("\n");
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
