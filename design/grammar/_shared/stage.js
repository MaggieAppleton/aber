// The stage: the app's current layout, unchanged (jig /app: rail of themes, theme sections of cards, docked object pane).
// Usage: <div class="stg-host" data-stage='{"system":"clean","primary":"ink","mark":"bare"}'></div>
// The stage renders at a fixed natural width and zooms to fit its host, so every copy shows identical layout.
(() => {
  const ICON = { dump: "tray-arrow-down", signal: "pulse", theme: "binoculars", theory: "target", prototype: "pencil-ruler", tripwire: "signpost", suggestion: "sparkle" };
  const g = (t, lg) => `<span class="g${lg ? " lg" : ""}" data-type="${t}"><i class="ph ph-${ICON[t]}" aria-hidden="true"></i></span>`;
  const conf = (n, lg) => `<span class="stg-conf${lg ? " lg" : ""}" role="img" aria-label="Confidence ${n} of 5">${[1, 2, 3, 4, 5].map(i => `<i${i <= n ? " data-on" : ""}></i>`).join("")}</span>`;
  // Icon rules (decided 4 Nov): every stage uses the one-icon-per-meaning vocabulary, Fill only for the current view,
  // and data-tip tooltips (name + key). {"icons":0} renders the old glyphs for comparison.
  let V = false;
  const I = (today, rule) => V ? rule : today;
  const iconBtn = (icon, label, key) => `<button type="button" class="stg-iconbtn" aria-label="${label}${key ? ` (${key})` : ""}" ${V ? `data-tip="${label}"${key ? ` data-key="${key}"` : ""}` : `title="${label}"`}><i class="ph ph-${icon}" aria-hidden="true"></i></button>`;

  const THEMES = [["Cost of intelligence", 5, true], ["Agent memory", 2], ["Code review after agents", 2], ["Personal software", 2], ["AI funding cycle", 2], ["Novel agent interfaces"], ["Agent observability"]];
  // No pending-suggestion badge, challenge dot or new dot on previews (decided 4 Nov).
  const card = (claim, { c, up, down, proto, open, draft, sp } = {}) => `
    <div class="stg-card"${sp ? ` data-sp="${sp}" data-gap` : ""}${open ? " data-open" : ""}${draft ? " data-draft" : ""} role="button" tabindex="0">
      <div class="stg-claim"${open ? ' data-tr="card name"' : ""}>${claim}</div>
      <div class="stg-meta">${c ? conf(c) : ""}<span>+${up} −${down}</span>${proto ? `<span class="stg-inline">${g("prototype")}${proto}</span>` : ""}</div>
    </div>`;

  const switcher = view => `
      <div class="stg-switch" role="group" aria-label="Views" data-sp="float offset">
        ${[["sections", "rows", "Theme sections"], ["columns", "columns", "Columns"], ["atlas", "map-trifold", "Atlas"], ["timeline", "chart-scatter", "Timeline"]].map(([v, i, l]) =>
          `<button type="button" data-view="${v}" aria-pressed="${v === view}" aria-label="${l}"${V ? ` data-tip="${l}"` : ""}><i class="ph${V && v === view ? "-fill" : ""} ph-${i}" aria-hidden="true"></i></button>`).join("")}
      </div>`;

  const sections = () => `
    <aside class="stg-rail" data-sp="nav inset, group gap" data-gap>
      <div class="stg-brand"><span data-tr="app name">Aber</span>${iconBtn("magnifying-glass", "Find", "⌘K")}</div>
      <nav class="stg-index">${THEMES.map(([n, c, a], i) => `<a href="#"${a ? " data-active" : ""}${i === 1 ? ' data-sp="row inset, row height"' : ""}><span${i < 2 ? ` data-tr="${a ? "nav item, current" : "nav item"}"` : ""}>${n}</span><span${i === 1 ? ' data-tr="count"' : ""}>${c ?? ""}</span></a>`).join("")}</nav>
      <a href="#" class="stg-protos">${g("prototype")}<span>Prototypes</span><span>4</span></a>
    </aside>
    <main class="stg-main" data-sp="list inset, section gap" data-gap>
      <section>
        <div class="stg-sec-head">${g("theme")}<span data-tr="section header">Cost of intelligence</span><span class="n" data-tr="meta">23 signals</span></div>
        <div class="stg-cards" data-sp="item gap" data-gap>
          ${card("Tokens become nearly free for routine work", { c: 3, up: 5, down: 2, proto: 1, open: true })}
          ${card("Frontier intelligence stays scarce and expensive", { c: 2, up: 3, down: 4, sp: "card inset, item gap" })}
          ${card("Local models absorb most everyday agent work", { up: 3, down: 0, draft: true })}
        </div>
      </section>
      <section>
        <div class="stg-sec-head">${g("theme")}<span>Agent memory</span><span class="n">31 signals</span></div>
        <div class="stg-cards">${card("Agents keep context across months, not sessions", { c: 4, up: 8, down: 1, proto: 1 })}</div>
      </section>
    </main>`;

  const columns = () => `
    <div class="stg-strip">${g("dump")}</div><div class="stg-strip">${g("signal")}</div>
    <section class="stg-col stg-col-nav" data-sp="nav inset, row height">
      <div class="stg-col-head">${g("theme")}<span data-tr="section header">Themes</span></div>
      <nav class="stg-index">${THEMES.map(([n, c, a]) => `<a href="#"${a ? " data-active" : ""}><span>${n}</span><span>${c ?? ""}</span></a>`).join("")}</nav>
    </section>
    <section class="stg-col" data-sp="list inset, item gap" data-gap>
      <div class="stg-col-head">${g("theory")}<span>Theories</span></div>
      <div class="stg-cards">
        ${card("Tokens become nearly free for routine work", { c: 3, up: 5, down: 2, open: true })}
        ${card("Frontier intelligence stays scarce and expensive", { c: 2, up: 3, down: 4 })}
        ${card("Agents keep context across months, not sessions", { c: 4, up: 8, down: 1 })}
        ${card("Local models absorb most everyday agent work", { up: 3, down: 0, draft: true })}
      </div>
    </section>`;

  const AREAS = [["Cost of intelligence", 5, 40, 42, 22, true], ["Agent memory", 2, 72, 30, 20], ["Personal software", 2, 24, 18, 16], ["AI funding cycle", 3, 36, 78, 16], ["Code review after agents", 2, 74, 74, 18], ["Novel agent interfaces", 1, 16, 58, 13]];
  const atlas = () => `
    <div class="stg-zoom" data-sp="float offset">${iconBtn(I("plus", "magnifying-glass-plus"), "Zoom in", "+")}${iconBtn(I("minus", "magnifying-glass-minus"), "Zoom out", "−")}${iconBtn("corners-in", "Fit")}</div>
    <div class="stg-canvas" data-sp="canvas inset">
      ${AREAS.map(([n, c, x, y, r, sel]) => `<div class="stg-area${sel ? " is-sel" : ""}" style="left:${x}%;top:${y}%;width:${r * 2}%;"><span class="stg-area-label" ${sel ? 'data-sp="label inset" data-tr="section header"' : ""}>${g("theme")}${n}<span class="n">${c}</span></span><i class="stg-pt" style="left:40%;top:55%"></i>${c > 2 ? '<i class="stg-pt" style="left:62%;top:38%"></i>' : ""}</div>`).join("")}
    </div>`;

  const YEARS = ["2027", "2028", "2029"];
  const LANES = [[4, [["Agents keep context across months, not sessions"], [], []]], [3, [[], ["Tokens become nearly free for routine work", true], ["Agents run continuously in the background by default"]]], [2, [["Labs face a funding correction before agents pay their way"], [], ["Frontier intelligence stays scarce and expensive"]]], [0, [[], ["Local models absorb most everyday agent work", false, true], []]]];
  const timeline = () => `
    <div class="stg-zoom" data-sp="float offset">${iconBtn(I("binoculars", "funnel"), "Filter by theme")}</div>
    <div class="stg-tl" data-sp="canvas inset">
      <div class="stg-tl-gutter"></div>${YEARS.map(y => `<div class="stg-tl-year"${y === "2027" ? ' data-tr="meta"' : ""}>${y}</div>`).join("")}
      ${LANES.map(([c, cells], li) => `<div class="stg-tl-gutter">${c ? conf(c) : '<span class="stg-ring" aria-label="Draft"></span>'}</div>${cells.map(([t, sel, draft], ci) => `<div class="stg-tl-cell"${li === 1 && ci === 1 ? ' data-sp="row inset, item gap" data-gap' : ""}>${t ? `<a href="#" class="stg-tl-item${sel ? " is-sel" : ""}${draft ? " is-draft" : ""}">${draft ? '<span class="stg-ring"></span>' : '<i class="stg-pt"></i>'}<span${sel ? ' data-tr="list name"' : ""}>${t}</span></a>` : ""}</div>`).join("")}`).join("")}
    </div>`;

  const VIEWS = { sections, columns, atlas, timeline };
  // One transient layer at a time (04-surfaces): {"layer":"peek"|"menu"|"modal"|"toast"}
  let L = "";
  const layers = {
    peek: () => `<div class="stg-peek" role="dialog" aria-label="Signal preview">
        <div class="stg-peek-head">${g("signal")}<span class="t">Lab cuts API prices again for its small tier</span></div>
        <p class="stg-peek-gist">The small tier drops to a fifth of last year's price; routine calls now cost less than the logging around them.</p>
        <div class="stg-peek-meta"><span>x.com</span><span>2 days ago</span><span class="stg-peek-stance"><i class="ph ph-arrow-up" aria-hidden="true"></i>Supports</span></div>
      </div>`,
    menu: () => `<div class="stg-menu" role="menu" aria-label="Add support">
        <button type="button" role="menuitem" class="stg-menu-item">${g("signal")}<span>Link a signal</span><kbd>L</kbd></button>
        <button type="button" role="menuitem" class="stg-menu-item">${g("dump")}<span>Dump new evidence</span><kbd>D</kbd></button>
      </div>`,
    modal: () => `<div class="stg-scrim"></div><div class="stg-modal" role="dialog" aria-label="Retire this theory?">
        <h4>Retire this theory?</h4><p>It leaves the theme and its evidence stays. You can bring it back from Retired.</p>
        <div class="stg-modal-foot"><button type="button" class="stg-btn secondary">Cancel</button><button type="button" class="stg-btn primary">Retire</button></div>
      </div>`,
    toast: () => `<div class="stg-toast" role="status"><span>Theory retired</span><button type="button" class="stg-toast-act">Undo</button></div>`,
  };
  const html = (view = "sections") => `
    <div class="stg-view" data-view="${view}">${VIEWS[view]()}${switcher(view)}</div>
    <aside class="stg-pane" aria-label="Open object" data-sp="pane inset, group gap" data-gap>
      <div class="stg-pane-close">${iconBtn("arrows-out-simple", "Full width")}${iconBtn("x", "Close", "Esc")}</div>
      <div class="stg-chips"><a href="#" class="stg-chip" data-sp="chip inset" data-tr="chip label">${g("theme")}Cost of intelligence</a></div>
      <h3 class="stg-title" data-tr="pane title">Tokens become nearly free for routine work</h3>
      <dl class="stg-fields" data-sp="item gap, group gap" data-gap>
        <dt data-tr="field label">Confidence</dt><dd>${conf(3, true)}<svg class="stg-spark" viewBox="0 0 64 16" aria-hidden="true"><path d="M1 13h10v-3h8v3h8V7h7v4h8V3h6v6h8" fill="none" stroke="var(--pos-mark)" stroke-width="1.5"/><path d="M50 3v6h6" fill="none" stroke="var(--neg-dot)" stroke-width="1.5"/></svg></dd>
        <dt>Happens by</dt><dd>${iconBtn(I("minus", "caret-left"), "Earlier")}<span data-tr="field value">2028</span>${iconBtn(I("plus", "caret-right"), "Later")}</dd>
        <dt>Rival</dt><dd><a href="#" class="stg-chip">${g("theory")}Frontier intelligence stays scarce and expensive</a></dd>
      </dl>
      <p class="stg-note" data-tr="prose">Small models keep getting cheaper faster than demand grows. Routine agent work stops being metered in any way I notice.</p>
      <div class="stg-trip">${g("tripwire")}<span>I'd change my mind if a frontier lab prices routine calls above last year's</span></div>
      <div class="stg-ev">
        <div class="stg-ev-col">
          <div class="stg-ev-head"><i class="ph ph-arrow-up"></i><span data-tr="group label">Supports 2</span><span class="plus">${iconBtn("plus", "Add support")}</span></div>
          <div class="stg-ev-item" data-sp="row inset, card inset x">${g("signal")}<span class="t"><span data-tr="list name">Lab cuts API prices again for its small tier</span></span><span class="src" data-tr="meta">x.com</span></div>
          <div class="stg-ev-item" data-draft>${g("suggestion")}<span class="t">Braintrust raises Series B</span><span class="src">Suggested by agent</span>
            <div class="stg-decide"><button type="button" class="stg-btn secondary">Dismiss</button><button type="button" class="stg-btn primary" data-sp="control inset" data-tr="button label">Accept</button></div></div>
        </div>
        <div class="stg-ev-col">
          <div class="stg-ev-head"><i class="ph ph-arrow-down"></i>Undermines 1<span class="plus">${iconBtn("plus", "Add undermining")}</span></div>
          <div class="stg-ev-item">${g("signal")}<span class="t">Frontier training runs keep growing in cost</span><span class="src">arxiv.org</span></div>
          <div class="stg-ev-item">${g("dump")}<span class="t">Voice note after the Foglamp demo</span><span class="src">2m 14s</span></div>
        </div>
      </div>
      <div class="stg-related"><a href="#" class="stg-chip">${g("theory")}Most software is made for an audience of one</a><a href="#" class="stg-chip">${g("prototype")}Token budget meter</a></div>
    </aside>${L && layers[L] ? layers[L]() : ""}`;

  const fit = host => {
    const el = host.firstElementChild; if (!el) return;
    const natural = parseFloat(getComputedStyle(el).getPropertyValue("--stg-w")) || 1080;
    el.style.zoom = Math.min(1, host.clientWidth / natural);
  };
  const ro = new ResizeObserver(entries => entries.forEach(e => fit(e.target)));
  const render = host => {
    const o = JSON.parse(host.dataset.stage || "{}");
    const pass = ["scale", "title", "sechead", "system", "primary", "mark", "density", "list", "iconsize", "tile", "cards", "pop", "float", "layer"];
    const attrs = [...pass.filter(k => o[k]).map(k => `data-${k}="${o[k]}"`), o.icons !== 0 && "data-icons"].filter(Boolean).join(" ");
    V = o.icons !== 0; L = o.layer || "";
    host.innerHTML = `<div class="stg" ${attrs}>${html(o.view)}</div>`;
    fit(host); ro.observe(host);
    if (o.layer) place(host.firstElementChild);
  };
  document.addEventListener("click", e => {
    if (e.target.closest(".stg a")) e.preventDefault();
    const vb = e.target.closest(".stg-switch button[data-view]");
    if (vb) { const host = vb.closest(".stg-host"); const o = JSON.parse(host.dataset.stage || "{}"); o.view = vb.dataset.view; host.dataset.stage = JSON.stringify(o); render(host); return; }
    const c = e.target.closest(".stg-card"); if (!c) return;
    c.parentElement.closest(".stg-main").querySelectorAll(".stg-card").forEach(x => x.toggleAttribute("data-open", x === c));
  });
  // Tooltips (icons rule 7): name, then key; below the button, above it in bottom bars, beside it in the zoom stack
  const local = (stg, el) => { const sr = stg.getBoundingClientRect(), k = sr.width / parseFloat(getComputedStyle(stg).width) || 1, r = el.getBoundingClientRect();
    return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k, W: parseFloat(getComputedStyle(stg).width) }; };
  const showTip = (btn, pinned) => {
    const stg = btn.closest(".stg[data-icons]"); if (!stg) return;
    if (!pinned) stg.querySelector(".stg-tip:not([data-pinned])")?.remove();
    const t = document.createElement("div"); t.className = "stg-tip"; t.setAttribute("role", "tooltip"); if (pinned) t.dataset.pinned = "";
    t.innerHTML = `<span>${btn.dataset.tip}</span>${btn.dataset.key ? `<kbd>${btn.dataset.key}</kbd>` : ""}`;
    stg.append(t);
    const { x, y, w, h, W } = local(stg, btn), tw = t.offsetWidth, th = t.offsetHeight;
    let left = x + w / 2 - tw / 2, top = y + h + 4;
    if (btn.closest(".stg-switch")) top = y - th - 4;
    if (btn.closest(".stg-zoom")) { left = x + w + 4; top = y + h / 2 - th / 2; }
    left = Math.max(4, Math.min(W - tw - 4, left));
    Object.assign(t.style, { left: `${left}px`, top: `${top}px` });
  };
  let timer;
  document.addEventListener("pointerover", e => { const b = e.target.closest(".stg[data-icons] [data-tip]"); if (!b || b.hasAttribute("data-tip-pin")) return; clearTimeout(timer); timer = setTimeout(() => showTip(b), 500); });
  document.addEventListener("pointerout", e => { const b = e.target.closest(".stg[data-icons] [data-tip]"); if (!b) return; clearTimeout(timer); b.closest(".stg")?.querySelector(".stg-tip:not([data-pinned])")?.remove(); });
  document.addEventListener("focusin", e => { const b = e.target.closest(".stg[data-icons] [data-tip]"); if (b && !b.hasAttribute("data-tip-pin")) showTip(b); });
  document.addEventListener("focusout", e => { e.target.closest(".stg")?.querySelector(".stg-tip:not([data-pinned])")?.remove(); });

  // Tethered layers grow from their trigger: the peek from its evidence row, the menu from Add support
  const place = stg => {
    const peek = stg.querySelector(".stg-peek"), menu = stg.querySelector(".stg-menu");
    if (peek) { const row = stg.querySelector(".stg-ev-item"); row.setAttribute("data-hover", ""); const r = local(stg, row), gl = local(stg, row.querySelector(".g"));
      Object.assign(peek.style, { left: `${gl.x - 12}px`, top: `${r.y + r.h + 4}px`, transformOrigin: "24px 0" }); }
    if (menu) { const b = stg.querySelector('.stg-iconbtn[aria-label="Add support"]'); b.setAttribute("aria-expanded", "true"); const r = local(stg, b);
      Object.assign(menu.style, { left: `${r.x + r.w - menu.offsetWidth}px`, top: `${r.y + r.h + 4}px`, transformOrigin: "100% 0" }); }
  };
  document.fonts?.ready.then(() => document.querySelectorAll(".stg[data-layer]").forEach(place));
  window.AberStage = { renderAll: (root = document) => root.querySelectorAll("[data-stage]").forEach(render), render, showTip };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", () => window.AberStage.renderAll()); else window.AberStage.renderAll();
})();
