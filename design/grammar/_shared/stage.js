// The stage: the app's current layout, unchanged (jig /app: rail of themes, theme sections of cards, docked object pane).
// Usage: <div class="stg-host" data-stage='{"system":"clean","primary":"ink","mark":"bare"}'></div>
// The stage renders at a fixed natural width and zooms to fit its host, so every copy shows identical layout.
(() => {
  const ICON = { dump: "tray-arrow-down", signal: "pulse", theme: "binoculars", theory: "target", prototype: "pencil-ruler", tripwire: "signpost", suggestion: "sparkle" };
  const g = (t, lg) => `<span class="g${lg ? " lg" : ""}" data-type="${t}"><i class="ph ph-${ICON[t]}" aria-hidden="true"></i></span>`;
  const conf = (n, lg) => `<span class="stg-conf${lg ? " lg" : ""}" role="img" aria-label="Confidence ${n} of 5">${[1, 2, 3, 4, 5].map(i => `<i${i <= n ? " data-on" : ""}></i>`).join("")}</span>`;
  const iconBtn = (icon, label) => `<button type="button" class="stg-iconbtn" aria-label="${label}" title="${label}"><i class="ph ph-${icon}" aria-hidden="true"></i></button>`;

  const THEMES = [["Cost of intelligence", 5, true], ["Agent memory", 2], ["Code review after agents", 2], ["Personal software", 2], ["AI funding cycle", 2], ["Novel agent interfaces"], ["Agent observability"]];
  const card = (claim, { c, up, down, proto, pending, neg, open, draft, sp } = {}) => `
    <div class="stg-card"${sp ? ` data-sp="${sp}" data-gap` : ""}${open ? " data-open" : ""}${draft ? " data-draft" : ""} role="button" tabindex="0">
      <div class="stg-claim">${claim}</div>
      <div class="stg-meta">${c ? conf(c) : ""}<span>+${up} −${down}</span>${proto ? `<span class="stg-inline">${g("prototype")}${proto}</span>` : ""}${pending ? `<span class="stg-pending" aria-label="${pending} pending suggestions">${pending}</span>` : ""}${neg ? `<span class="stg-dot neg" role="img" aria-label="Challenge"></span>` : ""}</div>
    </div>`;

  const html = () => `
    <aside class="stg-rail" data-sp="region inset y, rail inset x, group gap" data-gap>
      <div class="stg-brand"><span>Aber</span>${iconBtn("magnifying-glass", "Find")}</div>
      <nav class="stg-index">${THEMES.map(([n, c, a], i) => `<a href="#"${a ? " data-active" : ""}${i === 1 ? ' data-sp="row inset, row height"' : ""}><span>${n}</span><span>${c ?? ""}</span></a>`).join("")}</nav>
      <a href="#" class="stg-protos">${g("prototype")}<span>Prototypes</span><span>4</span></a>
      <div class="stg-switch" role="group" aria-label="Views">
        <button type="button" aria-pressed="true" aria-label="Theme sections"><i class="ph ph-rows"></i></button>
        <button type="button" aria-pressed="false" aria-label="Columns"><i class="ph ph-columns"></i></button>
        <button type="button" aria-pressed="false" aria-label="Atlas"><i class="ph ph-map-trifold"></i></button>
        <button type="button" aria-pressed="false" aria-label="Timeline"><i class="ph ph-chart-scatter"></i></button>
      </div>
    </aside>
    <main class="stg-main" data-sp="region inset, section gap" data-gap>
      <section>
        <div class="stg-sec-head">${g("theme")}<span>Cost of intelligence</span><span class="n">23 signals</span></div>
        <div class="stg-cards" data-sp="item gap" data-gap>
          ${card("Tokens become nearly free for routine work", { c: 3, up: 5, down: 2, proto: 1, pending: 2, open: true })}
          ${card("Frontier intelligence stays scarce and expensive", { c: 2, up: 3, down: 4, pending: 1, sp: "card inset, item gap" })}
          ${card("Local models absorb most everyday agent work", { up: 3, down: 0, draft: true })}
        </div>
      </section>
      <section>
        <div class="stg-sec-head">${g("theme")}<span>Agent memory</span><span class="n">31 signals</span></div>
        <div class="stg-cards">${card("Agents keep context across months, not sessions", { c: 4, up: 8, down: 1, proto: 1, neg: true })}</div>
      </section>
    </main>
    <aside class="stg-pane" aria-label="Open object" data-sp="region inset, group gap" data-gap>
      <div class="stg-pane-close">${iconBtn("arrows-out-simple", "Full width")}${iconBtn("x", "Close")}</div>
      <div class="stg-chips"><a href="#" class="stg-chip" data-sp="chip inset">${g("theme")}Cost of intelligence</a></div>
      <h3 class="stg-title">Tokens become nearly free for routine work</h3>
      <dl class="stg-fields" data-sp="item gap, group gap" data-gap>
        <dt>Confidence</dt><dd>${conf(3, true)}<svg class="stg-spark" viewBox="0 0 64 16" aria-hidden="true"><path d="M1 13h10v-3h8v3h8V7h7v4h8V3h6v6h8" fill="none" stroke="var(--pos-mark)" stroke-width="1.5"/><path d="M50 3v6h6" fill="none" stroke="var(--neg-dot)" stroke-width="1.5"/></svg></dd>
        <dt>Happens by</dt><dd>${iconBtn("minus", "Earlier")}<span>2028</span>${iconBtn("plus", "Later")}</dd>
        <dt>Rival</dt><dd><a href="#" class="stg-chip">${g("theory")}Frontier intelligence stays scarce and expensive</a></dd>
      </dl>
      <p class="stg-note">Small models keep getting cheaper faster than demand grows. Routine agent work stops being metered in any way I notice.</p>
      <div class="stg-trip">${g("tripwire")}<span>I'd change my mind if a frontier lab prices routine calls above last year's</span></div>
      <div class="stg-ev">
        <div class="stg-ev-col">
          <div class="stg-ev-head"><i class="ph ph-arrow-up"></i>Supports 2<span class="plus">${iconBtn("plus", "Add support")}</span></div>
          <div class="stg-ev-item" data-sp="row inset, card inset x">${g("signal")}<span class="t">Lab cuts API prices again for its small tier<span class="stg-dot new" role="img" aria-label="New"></span></span><span class="src">x.com</span></div>
          <div class="stg-ev-item" data-draft>${g("suggestion")}<span class="t">Braintrust raises Series B</span><span class="src">Suggested by agent</span>
            <div class="stg-decide"><button type="button" class="stg-btn secondary">Dismiss</button><button type="button" class="stg-btn primary" data-sp="control inset">Accept</button></div></div>
        </div>
        <div class="stg-ev-col">
          <div class="stg-ev-head"><i class="ph ph-arrow-down"></i>Undermines 1<span class="plus">${iconBtn("plus", "Add undermining")}</span></div>
          <div class="stg-ev-item">${g("signal")}<span class="t">Frontier training runs keep growing in cost</span><span class="src">arxiv.org</span></div>
          <div class="stg-ev-item">${g("dump")}<span class="t">Voice note after the Foglamp demo</span><span class="src">2m 14s</span></div>
        </div>
      </div>
      <div class="stg-related"><a href="#" class="stg-chip">${g("theory")}Most software is made for an audience of one</a><a href="#" class="stg-chip">${g("prototype")}Token budget meter</a></div>
    </aside>`;

  const fit = host => {
    const el = host.firstElementChild; if (!el) return;
    const natural = parseFloat(getComputedStyle(el).getPropertyValue("--stg-w")) || 1080;
    el.style.zoom = Math.min(1, host.clientWidth / natural);
  };
  const ro = new ResizeObserver(entries => entries.forEach(e => fit(e.target)));
  const render = host => {
    const o = JSON.parse(host.dataset.stage || "{}");
    const attrs = [o.system && `data-system="${o.system}"`, o.primary && `data-primary="${o.primary}"`, o.mark && `data-mark="${o.mark}"`, o.density && `data-density="${o.density}"`, o.list && `data-list="${o.list}"`].filter(Boolean).join(" ");
    host.innerHTML = `<div class="stg" ${attrs}>${html()}</div>`;
    fit(host); ro.observe(host);
  };
  document.addEventListener("click", e => {
    if (e.target.closest(".stg a")) e.preventDefault();
    const c = e.target.closest(".stg-card"); if (!c) return;
    c.parentElement.closest(".stg-main").querySelectorAll(".stg-card").forEach(x => x.toggleAttribute("data-open", x === c));
  });
  window.AberStage = { renderAll: (root = document) => root.querySelectorAll("[data-stage]").forEach(render), render };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", () => window.AberStage.renderAll()); else window.AberStage.renderAll();
})();
