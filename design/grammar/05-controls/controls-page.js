// Grammar 05 controls: makes the stages' controls live (confidence, stepper, composer, delete modal, retire),
// switches the viewer, builds the states board and its tooltips, and paints the decide box.
(() => {
  const icon = (n, fill) => `<i class="ph${fill ? "-fill" : ""} ph-${n}" aria-hidden="true"></i>`;
  const spin = `<span class="ctl-spin">${icon("circle-notch")}</span>`;
  const conf = (n, extra = "") => `<span class="ctl-conf" role="slider" tabindex="0" aria-label="Confidence" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${n}" aria-valuetext="${n} of 5"${extra}>${[1, 2, 3, 4, 5].map(i => `<i${i <= n ? " data-on" : ""}></i>`).join("")}</span>`;
  const step = (y, tipAttr) => `<span class="ctl-step" role="spinbutton" tabindex="0" aria-label="Happens by" aria-valuenow="${y}" aria-valuemin="2026" aria-valuemax="2040">`
    + `<button type="button" class="ctl-icon sm" tabindex="-1" aria-label="Earlier" ${tipAttr ? 'data-tip="Earlier"' : ""} data-step="-1">${icon("caret-left")}</button><span class="v">${y}</span>`
    + `<button type="button" class="ctl-icon sm" tabindex="-1" aria-label="Later" ${tipAttr ? 'data-tip="Later"' : ""} data-step="1">${icon("caret-right")}</button></span>`;
  const composer = () => `<form class="ctl-composer" aria-label="Dump or ask" onsubmit="return false">
      <button type="button" class="ctl-icon" aria-label="Voice dump" data-tip="Voice dump" data-key="V">${icon("microphone")}</button>
      <textarea rows="1" placeholder="Dump or ask" aria-label="Dump or ask"></textarea>
      <button type="submit" class="ctl-icon primary" aria-label="Send" data-tip="Send" data-key="⏎" aria-disabled="true">${icon("paper-plane-right")}</button></form>`;

  /* ── Make each rendered stage's controls live ─────────────── */
  const enhanceStg = stg => {
    if (stg.dataset.ctl) return; stg.dataset.ctl = "1";
    const pane = stg.querySelector(".stg-pane");
    const close = stg.querySelector(".stg-pane-close");
    if (close) close.insertAdjacentHTML("afterbegin", `<button type="button" class="stg-iconbtn" aria-label="Retire" data-tip="Retire">${icon("archive")}</button>`);
    const dds = pane ? [...pane.querySelectorAll(".stg-fields dd")] : [];
    if (dds[0]) { const old = dds[0].querySelector(".stg-conf"); old?.insertAdjacentHTML("afterend", conf(3)); old?.remove(); }
    if (dds[1]) dds[1].innerHTML = step(2028, true);
    stg.insertAdjacentHTML("beforeend", composer());
    const modal = stg.querySelector(".stg-modal");
    if (modal) modal.innerHTML = `<h4>Delete this dump?</h4><p>The voice note and its transcript are deleted for good. Signals made from it stay.</p>
      <div class="stg-modal-foot"><button type="button" class="stg-btn secondary">Cancel</button><button type="button" class="stg-btn danger">Delete dump</button></div>`;
    const menu = stg.querySelector(".stg-menu");
    if (menu) menu.querySelectorAll(".stg-menu-item").forEach(b => b.removeAttribute("data-first"));
  };
  const enhanceNv = nv => {
    if (nv.dataset.ctl) return; nv.dataset.ctl = "1";
    nv.querySelectorAll(".nv-fields").forEach(dl => {
      [...dl.querySelectorAll("dt")].forEach(dt => {
        const dd = dt.nextElementSibling; if (!dd) return;
        if (dt.textContent === "Confidence") { const n = dd.querySelectorAll("i[data-on]").length; dd.innerHTML = conf(n); }
        if (dt.textContent === "Happens by" && /^\d{4}$/.test(dd.textContent.trim())) dd.innerHTML = step(+dd.textContent.trim());
      });
    });
    nv.querySelectorAll(".nv-decide .nv-btn.secondary").forEach(b => { if (b.textContent === "Dismiss" && b.closest(".nv-fields")?.querySelector("dt")?.textContent === "Draft") b.textContent = "Discard"; });
    nv.insertAdjacentHTML("beforeend", composer());
  };
  const enhance = root => { root.querySelectorAll(".stg").forEach(enhanceStg); root.querySelectorAll(".nv").forEach(enhanceNv); };
  const watch = host => new MutationObserver(() => enhance(host)).observe(host, { childList: true, subtree: true });

  /* ── Live behaviour: confidence, stepper, composer ─────────── */
  const setConf = (el, n) => { n = Math.max(0, Math.min(5, n)); el.setAttribute("aria-valuenow", n); el.setAttribute("aria-valuetext", `${n} of 5`); [...el.children].forEach((b, i) => b.toggleAttribute("data-on", i < n)); };
  const setStep = (el, d) => { const v = el.querySelector(".v"), min = +el.getAttribute("aria-valuemin"), max = +el.getAttribute("aria-valuemax");
    const y = Math.max(min, Math.min(max, +v.textContent + d)); v.textContent = y; el.setAttribute("aria-valuenow", y);
    el.querySelector('[data-step="-1"]').setAttribute("aria-disabled", String(y <= min)); el.querySelector('[data-step="1"]').setAttribute("aria-disabled", String(y >= max)); };
  document.addEventListener("click", e => {
    const bar = e.target.closest(".ctl-conf:not([aria-disabled='true']) > i");
    if (bar) { const el = bar.parentElement, i = [...el.children].indexOf(bar) + 1; setConf(el, +el.getAttribute("aria-valuenow") === i ? i - 1 : i); el.focus({ preventScroll: true }); return; }
    const sb = e.target.closest(".ctl-step [data-step]:not([aria-disabled='true'])");
    if (sb) { e.stopPropagation(); setStep(sb.closest(".ctl-step"), +sb.dataset.step); }
  }, true);
  document.addEventListener("pointerover", e => { const bar = e.target.closest(".ctl-conf > i"); if (!bar) return; const el = bar.parentElement, i = [...el.children].indexOf(bar);
    [...el.children].forEach((b, j) => b.classList.toggle("pv", j <= i)); });
  document.addEventListener("pointerout", e => { const el = e.target.closest(".ctl-conf"); if (el && !el.contains(e.relatedTarget)) [...el.children].forEach(b => b.classList.remove("pv")); });
  document.addEventListener("keydown", e => {
    const c = e.target.closest?.(".ctl-conf:not([aria-disabled='true'])");
    if (c) { const n = +c.getAttribute("aria-valuenow"), k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (k) { setConf(c, n + k); e.preventDefault(); } else if (e.key === "Home") { setConf(c, 0); e.preventDefault(); } else if (e.key === "End") { setConf(c, 5); e.preventDefault(); } return; }
    const s = e.target.closest?.(".ctl-step");
    if (s) { const k = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 }[e.key]; if (k) { setStep(s, k); e.preventDefault(); } }
  });
  document.addEventListener("input", e => { const t = e.target.closest(".ctl-composer textarea"); if (!t) return;
    t.closest(".ctl-composer").querySelector(".primary").setAttribute("aria-disabled", String(!t.value.trim())); });

  /* ── Viewer ───────────────────────────────────────────────── */
  const viewer = document.getElementById("viewer");
  const state = { view: "default", layer: "", secondary: "hairline", input: "filled", danger: "ink" };
  const mount = () => {
    for (const k of ["secondary", "input", "danger"]) viewer.dataset[k] = state[k];
    const host = document.createElement("div");
    if (state.view === "default") { host.className = "nv-host"; host.dataset.nav = JSON.stringify({ v: "A", type: "theory" }); }
    else { host.className = "stg-host"; host.dataset.stage = JSON.stringify({ view: state.view, layer: state.layer }); }
    viewer.replaceChildren(host); watch(host);
    if (state.view === "default") window.AberNav?.init(host); else window.AberStage.render(host);
    enhance(host);
  };
  for (const seg of document.querySelectorAll("[data-seg]")) seg.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    seg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    const key = seg.dataset.seg; state[key] = b.value;
    if (["secondary", "input", "danger"].includes(key)) { viewer.dataset[key] = b.value; document.querySelector(".views-grid").dataset[key] = b.value; return; }
    if (key === "layer" && state.view === "default") { state.view = "sections"; document.querySelectorAll('[data-seg="view"] button').forEach(x => x.setAttribute("aria-pressed", String(x.value === "sections"))); }
    mount();
  });

  /* ── States board ─────────────────────────────────────────── */
  const STATES = [["rest", "Rest (live)"], ["hover", "Hover"], ["focus", "Focus"], ["press", "Pressed"], ["sel", "Selected, open"], ["dis", "Disabled"], ["load", "Loading"]];
  const cls = s => ({ hover: "is-hover", focus: "is-focus", press: "is-hover is-press" })[s] || "";
  const dis = s => s === "dis" ? ' aria-disabled="true"' : "";
  const busy = s => s === "load" ? ' aria-busy="true"' : "";
  const sp = s => s === "load" ? spin : "";
  const NA = null;
  const glyph = (t, n) => `<span class="g" data-type="${t}">${icon(n)}</span>`;
  const btn = (kind, label, lead, trail) => s => s === "sel" ? NA : `<button type="button" class="ctl-btn ${kind} ${cls(s)}"${dis(s)}${busy(s)}>${lead ? icon(lead) : ""}<span>${label}</span>${trail ? icon(trail) : ""}${sp(s)}</button>`;
  const boardStep = s => {
    const y = s === "dis" ? 2040 : 2028, later = s === "hover" ? " is-hover" : s === "press" ? " is-hover is-press" : "";
    return `<span class="ctl-step${s === "focus" ? " is-focus" : ""}" role="spinbutton" tabindex="0" aria-label="Happens by" aria-valuenow="${y}" aria-valuemin="2026" aria-valuemax="2040">`
      + `<button type="button" class="ctl-icon sm" tabindex="-1" aria-label="Earlier" data-tip="Earlier" data-step="-1">${icon("caret-left")}</button><span class="v">${y}</span>`
      + `<button type="button" class="ctl-icon sm${later}" tabindex="-1" aria-label="Later" data-tip="Later" data-step="1"${s === "dis" ? ' aria-disabled="true"' : ""}>${icon("caret-right")}</button></span>`;
  };
  const boardConf = s => {
    const n = s === "dis" ? 0 : 3;
    return `<span class="ctl-conf${s === "hover" ? " is-hover" : s === "focus" ? " is-focus" : ""}" role="slider" tabindex="0" aria-label="Confidence" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${n}" aria-valuetext="${n} of 5"${dis(s)}>`
      + [1, 2, 3, 4, 5].map(i => `<i${i <= n ? " data-on" : ""}${s === "hover" && i <= 4 ? " data-pv" : ""}></i>`).join("") + "</span>";
  };
  const ROWS = [
    ["Primary", btn("primary", "Accept")],
    ["Secondary", btn("secondary", "Open", null, "arrow-right")],
    ["Quiet", s => s === "load" || s === "sel" ? NA : `<button type="button" class="ctl-btn quiet ${cls(s)}"${dis(s)}>${icon("arrow-left")}<span>Agent memory</span></button>`],
    ["Icon-only", s => s === "load" ? NA : `<button type="button" class="ctl-icon ${cls(s)}" aria-label="Add support" data-tip="Add support"${dis(s)}${s === "sel" ? ' aria-expanded="true"' : ""}>${icon("plus")}</button>`],
    ["Destructive confirm", btn("danger", "Delete dump")],
    ["Dismiss | Accept", s => s === "sel" ? NA : `<span class="pair"><button type="button" class="ctl-btn secondary sm">Dismiss</button><button type="button" class="ctl-btn primary sm ${cls(s)}"${dis(s)}${busy(s)}><span>Accept</span>${sp(s)}</button></span>`, true],
    ["Text field", s => ["press", "sel", "load"].includes(s) ? NA : `<label class="ctl-field ${cls(s)}"${dis(s)}><input placeholder="Name this theme" aria-label="Theme name"${s === "dis" ? " disabled" : ""}></label>`, true],
    ["Textarea", s => ["press", "sel", "load"].includes(s) ? NA : `<label class="ctl-field area ${cls(s)}"${dis(s)}><textarea rows="3" placeholder="Add a note" aria-label="Note"${s === "dis" ? " disabled" : ""}></textarea></label>`, true],
    ["Search", s => ["press", "sel", "load"].includes(s) ? NA : `<label class="ctl-field ${cls(s)}"${dis(s)}>${icon("magnifying-glass")}<input type="search" placeholder="Find a theory" aria-label="Find a theory"${s === "dis" ? " disabled" : ""}></label>`, true],
    ["Composer", s => ["press", "sel", "dis"].includes(s) ? NA : `<form class="ctl-composer ${cls(s)}" onsubmit="return false"><button type="button" class="ctl-icon" aria-label="Voice dump">${icon("microphone")}</button><input type="text" placeholder="Dump or ask" aria-label="Dump or ask" value="${s === "load" ? "Tokens are getting cheaper faster than demand" : ""}"><button type="submit" class="ctl-icon primary" aria-label="Send" data-tip="Send" data-key="⏎"${s === "load" ? ' aria-busy="true"' : ' aria-disabled="true"'}>${icon("paper-plane-right")}${sp(s)}</button></form>`, true],
    ["Linked chip", s => s === "load" ? NA : `<button type="button" class="ctl-chip ${cls(s)}"${dis(s)}${s === "sel" ? ' aria-expanded="true"' : ""}>${glyph("theme", "binoculars")}<span class="t">Cost of intelligence</span></button>`, true],
    ["Removable chip", s => ["press", "sel", "load"].includes(s) ? NA : `<span class="ctl-chip removable ${cls(s)}"${dis(s)}>${glyph("theme", "binoculars")}<span class="t">Agent memory</span><button type="button" class="rm" aria-label="Remove Agent memory from this theory" data-tip="Remove"${s === "dis" ? ' aria-disabled="true"' : ""}>${icon("minus")}</button></span>`, true],
    ["Filter chip", s => s === "load" ? NA : `<button type="button" class="ctl-chip filter ${cls(s)}"${dis(s)} aria-pressed="${s === "sel"}">${icon("funnel", s === "sel")}<span class="t">${s === "sel" ? "Cost of intelligence" : "Theme"}</span></button>`],
    ["Tag", s => s === "rest" ? `<span class="tagrow"><span class="ctl-tag">${icon("arrow-up")}Supports</span><span class="ctl-tag">${icon("arrow-down")}Undermines</span></span>` : s === "hover" ? `<span class="note">Not a control: no states</span>` : NA],
    ["Segmented", s => s === "load" ? NA : `<span class="ctl-seg" role="tablist" aria-label="Theme contents"><button type="button" role="tab" aria-selected="${s !== "sel"}">Theories</button><button type="button" role="tab" aria-selected="${s === "sel"}" class="${cls(s)}"${dis(s)}>Signals</button></span>`],
    ["View switcher", s => s === "load" ? NA : `<span class="ctl-seg views" role="group" aria-label="Views"><button type="button" aria-pressed="${s !== "sel"}" aria-label="Default" data-tip="Default" data-key="⌘1">${icon("rows", s !== "sel")}</button><button type="button" aria-pressed="${s === "sel"}" class="${cls(s)}" aria-label="Columns" data-tip="Columns" data-key="⌘2"${dis(s)}>${icon("columns", s === "sel")}</button></span>`, true],
    ["Menu item", s => s === "load" ? NA : `<div class="ctl-menu mini" role="menu" aria-label="Retire"><button type="button" role="menuitem${s === "sel" ? "radio" : ""}" class="ctl-item ${cls(s)}"${dis(s)}${s === "sel" ? ' aria-checked="true"' : ""}>${icon("archive")}<span>${s === "sel" ? "Disproven" : "Retire"}</span>${s === "sel" ? `<i class="ph ph-check on" aria-hidden="true"></i>` : "<kbd>R</kbd>"}</button></div>`, true],
    ["Peek header", s => s === "load" ? NA : `<div class="ctl-head"><span class="t">Signal</span><span class="ctl-tools"><button type="button" class="ctl-icon" aria-label="Open in the main area" data-tip="Open in the main area">${icon("arrows-out-simple")}</button><button type="button" class="ctl-icon ${cls(s)}" aria-label="Close" data-tip="Close" data-key="Esc"${dis(s)}${s === "sel" ? ' aria-pressed="true"' : ""}>${icon("x")}</button></span></div>`, true],
    ["Stepper", s => ["sel", "load"].includes(s) ? NA : boardStep(s), true],
    ["Confidence", s => ["press", "sel", "load"].includes(s) ? NA : boardConf(s), true],
    ["Tooltip", s => s === "rest" ? `<span class="ctl-tip" role="tooltip">Close<kbd>Esc</kbd></span>` : s === "hover" ? `<button type="button" class="ctl-icon" aria-label="Find" data-tip="Find" data-key="⌘K">${icon("magnifying-glass")}</button><span class="note">Point or Tab: 500ms, then instant</span>` : NA],
  ];
  const board = document.getElementById("board-grid");
  if (board) {
    board.innerHTML = STATES.map(([, l]) => `<div class="bh" role="columnheader">${l}</div>`).join("")
      + ROWS.map(([name, f, surf]) => `<div class="bn" role="rowheader">${name}</div>${STATES.map(([s, l]) => { const h = f(s);
        return `<div class="bc${surf ? " on-surface" : ""}${h == null ? " is-na" : ""}" role="cell" data-s="${l}">${h ?? '<span class="na">–</span>'}</div>`; }).join("")}`).join("");
  }

  /* ── Board tooltips: after 500ms, then instantly for 300ms after one closes ── */
  let tip, tTimer, lastClose = 0;
  const hideTip = () => { clearTimeout(tTimer); if (tip) { tip.remove(); tip = null; lastClose = performance.now(); } };
  const showTip = b => {
    hideTip(); tip = document.createElement("div"); tip.className = "ctl-tip floating"; tip.setAttribute("role", "tooltip");
    tip.innerHTML = `<span>${b.dataset.tip}</span>${b.dataset.key ? `<kbd>${b.dataset.key}</kbd>` : ""}`; document.body.append(tip);
    const r = b.getBoundingClientRect(), w = tip.offsetWidth;
    Object.assign(tip.style, { left: `${Math.max(4, Math.min(innerWidth - w - 4, r.left + r.width / 2 - w / 2))}px`, top: `${r.bottom + 4}px` });
  };
  const inBoard = e => e.target.closest?.(".ctl-board [data-tip], .ctl-viewer .nv .ctl-composer [data-tip], .nv .ctl-step [data-tip]");
  document.addEventListener("pointerover", e => { const b = inBoard(e); if (!b) return; clearTimeout(tTimer); tTimer = setTimeout(() => showTip(b), performance.now() - lastClose < 300 ? 0 : 500); });
  document.addEventListener("pointerout", e => { if (inBoard(e)) hideTip(); });
  document.addEventListener("focusin", e => { const b = e.target.closest?.(".ctl-board [data-tip]"); if (b && b.matches(":focus-visible")) showTip(b); });
  document.addEventListener("focusout", e => { if (e.target.closest?.(".ctl-board")) hideTip(); });
  addEventListener("scroll", hideTip, { passive: true });

  /* ── Start: enhance the stages, mount the viewer, paint picks ── */
  const start = () => {
    document.querySelectorAll(".stg-host, .nv-host").forEach(h => { watch(h); enhance(h); });
    mount();
  };
  addEventListener("load", () => {
    start();
    const d = document.querySelector(".jig-dock"), h = document.querySelector(".jig-head"); if (d && h && !h.contains(d)) h.append(d);
    const page = document.body.dataset.jig;
    const paint = () => document.querySelectorAll("[data-pick]").forEach(li => {
      let v = null; try { v = JSON.parse(localStorage.getItem(`jig:${page}:${li.dataset.pick}`))?.choice; } catch {}
      v = v === undefined ? document.querySelector(`[data-decision="${li.dataset.pick}"]`)?.dataset.default : v;
      li.querySelector(".pick").innerHTML = v ? `Current pick: <b>${v}</b>` : "No pick yet";
    });
    paint(); document.addEventListener("click", e => { if (e.target.closest(".jig-choose")) setTimeout(paint, 0); });
  });
})();
