/* DI-002 dialogs jig. Builds every stage from captured app markup (markup/*.html) and wires each alternative. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const FIXTURES = ["current-view-prototype-open", "dialog-new-prototype", "prototype-pane-doc", "sidebar-current-protos-open", "theme-pane-doc", "theme-section-first", "theory-pane-doc"];
  const F = {};
  const SVG = {};
  const HORIZON = new Date().getFullYear() + 2;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let uid = 0;
  let activeCtrl = null;

  const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const clone = (name) => el(F[name]);
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const text = (n) => (n.textContent || "").trim();
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce.matches ? 0 : ms));
  const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const shake = (n) => { n.classList.remove("jx-shake"); void n.offsetWidth; n.classList.add("jx-shake"); n.addEventListener("animationend", () => n.classList.remove("jx-shake"), { once: true }); };
  const tidy = (n) => { if (!text(n)) n.innerHTML = ""; };
  const placeCaret = (n) => { n.focus(); const r = document.createRange(); r.selectNodeContents(n); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
  async function animateOut(n, cls = "jx-shrink", ms = 200) { n.classList.add(cls); await wait(ms); n.remove(); }

  /* ── App scaffolding ─────────────────────────────────────────────── */
  function buildApp({ protosOpen = false, pane = null } = {}) {
    const app = clone("current-view-prototype-open");
    app.removeAttribute("style");
    $$(".ps-log-slot, .ps-toast-slot, .ps-surface", app).forEach((n) => n.remove());
    if (protosOpen) $(".cur-rail", app).replaceWith(clone("sidebar-current-protos-open"));
    const holder = $(".as-pane-scroll > div", app);
    holder.innerHTML = "";
    if (pane) holder.append(pane); else $(".as-pane", app).setAttribute("data-closed", "");
    return app;
  }
  function layout(app) {
    const W = app.clientWidth;
    if (!W) return;
    const pane = $(".as-pane", app);
    const open = !pane.hasAttribute("data-closed");
    const narrow = W < 640;
    const paneW = narrow ? W : Math.max(400, W - 528);
    const contentW = open && !narrow ? W - paneW : W;
    pane.style.width = paneW + "px";
    $(".as-content", app).style.width = contentW + "px";
    $(".as-view", app).style.width = contentW + "px";
  }
  function setPane(app, open) {
    $(".as-pane", app).toggleAttribute("data-closed", !open);
    layout(app);
  }
  function paneDoc(app, doc, animate = true) {
    const holder = $(".as-pane-scroll > div", app);
    holder.innerHTML = "";
    if (doc) { holder.append(doc); noXReject(doc); if (animate) doc.classList.add("jx-doc-in"); $(".as-pane-scroll", app).scrollTop = 0; }
  }
  const currentDoc = (app) => $(".as-pane-scroll .pn-doc", app);
  /* Proposals never use X to reject: Discard/Dismiss become labelled buttons left of the primary, with no key. */
  function noXReject(root) {
    if (root.closest(".jig-option")?.dataset.alt === "current") return;
    const labelled = (b, label) => { const n = el(`<button type="button" class="ap-btn ab-btn-ghost">${label}</button>`); b.replaceWith(n); return n; };
    $$(".ab-edge-acts", root).forEach((g) => {
      const strip = el(`<span class="jx-edge-acts"><button type="button" class="ap-btn ab-btn-ghost">Discard</button><button type="button" class="ap-btn">Accept</button></span>`);
      g.replaceWith(strip);
    });
    $$(".tw-hit-acts", root).forEach((g) => {
      const d = $(".tw-dismiss", g); if (!d) return;
      g.prepend(labelled(d, "Dismiss"));
    });
    $$("[aria-label='Discard suggestion']", root).forEach((b) => b.parentElement.prepend(labelled(b, "Discard")));
    $$("[aria-keyshortcuts]", root).forEach((b) => b.removeAttribute("aria-keyshortcuts"));
  }
  function mount(stage, app) {
    stage.innerHTML = "";
    stage.append(app);
    noXReject(app);
    layout(app);
    if (!stage._ro) { stage._ro = new ResizeObserver(() => { const a = $(":scope > .ap.as", stage); if (a) layout(a); }); stage._ro.observe(stage); }
    return app;
  }
  function scrollMainTo(app, section) { const main = $(".cur-main", app); main.scrollTop = Math.max(0, section.offsetTop - main.offsetTop - 8); }
  const section = (app, label) => $(`.cur-theme-name[data-label="${label}"]`, app)?.closest(".cur-section");
  const protoList = (app) => $(".cur-prototype-list", app);
  const newProtoRow = (app) => $$(".cur-prototype-row", app).find((r) => text(r) === "New prototype");

  /* ── Object docs, emptied to their just-created state ───────────── */
  function setStatus(doc, status) {
    const reveal = $(".pn-reveal", doc);
    $$(".pn-status [role=radio]", doc).forEach((b) => {
      const on = b.getAttribute("aria-label") === status;
      b.setAttribute("aria-checked", String(on));
      if (on) { b.append(reveal); $(".pn-status-name", reveal).textContent = status; }
    });
  }
  function protoDoc({ name = "", tests = null, status = "idea" } = {}) {
    const doc = clone("prototype-pane-doc");
    const title = $(".pn-title", doc);
    title.textContent = name;
    title.dataset.placeholder = "Name";
    title.removeAttribute("style");
    setStatus(doc, status);
    $$(".pn-status [role=radio]", doc).forEach((b) => b.addEventListener("click", () => setStatus(doc, b.getAttribute("aria-label"))));
    const testsRow = $(".pn-rivals", doc).closest(".pn-meta-row");
    if (tests) $(".pn-tested-claim", doc).textContent = tests; else testsRow.remove();
    $(".pn-body", doc).removeAttribute("style");
    $$("input[type=file]", doc).forEach((n) => n.removeAttribute("style"));
    wireEditables(doc);
    return doc;
  }
  function theoryDoc({ claim = "", theme = "Agent memory" } = {}) {
    const doc = clone("theory-pane-doc");
    $(".pn-theory-themes .pn-chip-name", doc).textContent = theme;
    const title = $(".pn-title", doc);
    title.textContent = claim;
    title.dataset.placeholder = "What do you think will happen?";
    $$(".pn-conf-marks i", doc).forEach((i) => i.removeAttribute("data-on"));
    $$(".pn-conf-thumb, .pn-meta .cs, .pn-meta .ap-mark", doc).forEach((n) => n.remove());
    $(".pn-conf-control", doc).title = "Confidence not set; keys 1–5 to set";
    const year = $(".pn-year .pn-field-val", doc);
    year.textContent = HORIZON;
    $$(".pn-year .pn-step", doc).forEach((b) => b.addEventListener("click", () => { year.textContent = +year.textContent + (b.getAttribute("aria-label") === "Later" ? 1 : -1); }));
    const body = $(".pn-body", doc);
    body.textContent = "";
    body.dataset.placeholder = "Why you think so";
    const phrase = $(".tw-tc-phrase", doc);
    phrase.textContent = "";
    phrase.dataset.placeholder = "When would you doubt this?";
    $$("[data-tripped]", doc).forEach((n) => n.removeAttribute("data-tripped"));
    $$(".tw-tc-flag, .tw-unfold, .pn-proposal", doc).forEach((n) => n.remove());
    $$(".pn-grid .pn-col", doc).forEach((col) => { $$(":scope > :not(.pn-ev-head)", col).forEach((n) => n.remove()); $(".pn-field-val", col).textContent = "0"; });
    $(".pn-links", doc).innerHTML = "";
    wireEditables(doc);
    return doc;
  }
  function existingTheoryDoc() { const doc = clone("theory-pane-doc"); wireEditables(doc); return doc; }
  function themeDoc({ name = "" } = {}) {
    const doc = clone("theme-pane-doc");
    const title = $(".pn-title", doc);
    title.textContent = name;
    title.dataset.placeholder = "Name";
    $(".pn-meta .pn-field-val", doc).textContent = "0";
    $$(".pn-deck .pn-tile:not(.pn-add)", doc).forEach((n) => n.remove());
    $(".pn-feed", doc)?.remove();
    wireEditables(doc);
    return doc;
  }
  function wireEditables(root) {
    $$("[contenteditable]", root).forEach((n) => { n.spellcheck = false; n.addEventListener("input", () => tidy(n)); });
    $$(".pn-title", root).forEach((t) => t.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      ($(".pn-body", root) || t).focus();
    }));
  }
  function protoRowButton(name) {
    return el(`<button class="cur-prototype-row">${SVG.protoRow}<span class="cur-sidebar-label">${esc(name)}</span>${SVG.chevron}</button>`);
  }
  function cardEl(claim) {
    return el(`<div class="cur-card" data-kind="theory"><div class="ab-edge-host"><div class="ap-card" role="button" tabindex="0"><div class="ap-card-claim">${esc(claim)}</div>${cardMeta()}</div></div></div>`);
  }
  const cardMeta = () => `<div class="ap-card-meta"><span class="ap-conf" role="img" aria-label="Confidence not set"><i></i><i></i><i></i><i></i><i></i></span><span class="ap-balance" role="img" aria-label="0 support, 0 undermine"><span class="ap-num">+0</span><span class="ap-num ap-neg">−0</span></span></div>`;
  function indexRow(name, { editing = false } = {}) {
    return el(`<a href="#" class="${editing ? "jx-index-new" : ""}"><span data-placeholder="Untitled">${esc(name)}</span><span class="ap-mark" role="img" data-kind="open" title="Open: no theory yet" aria-label="Open: no theory yet"></span><span class="ap-muted ap-num">0</span></a>`);
  }
  function sectionEl(name) {
    return el(`<section class="cur-section"><div class="cur-theme"><button class="ap-h cur-theme-name cur-theme-btn" data-kind="theme" data-label="${esc(name)}">${esc(name)}</button><span class="ap-mark" role="img" data-kind="open" title="Open: no theory yet" aria-label="Open: no theory yet"></span><span class="ap-muted ap-num">0 signals</span><button type="button" class="ap-iconbtn" aria-label="State a theory">${SVG.plus}</button></div><div class="cur-cards"></div></section>`);
  }

  /* ── Current dialog (the real ask() markup) ─────────────────────── */
  function currentDialog(app, { title, field, submit = "Create", focus = true, onSubmit, onClose }) {
    const dlg = clone("dialog-new-prototype");
    dlg.removeAttribute("aria-labelledby"); dlg.removeAttribute("aria-describedby");
    $(".ap-h", dlg).textContent = title;
    const label = $(".ab-field", dlg);
    label.firstChild.textContent = field;
    $(".ap-btn", dlg).textContent = submit;
    const backdrop = el(`<div class="ab-backdrop"></div>`);
    app.append(backdrop, dlg);
    const input = $("input", dlg);
    const close = () => { backdrop.remove(); dlg.remove(); onClose?.(); };
    $("form", dlg).addEventListener("submit", (e) => { e.preventDefault(); const v = input.value.trim(); if (!v) { input.reportValidity(); return; } backdrop.remove(); dlg.remove(); onSubmit(v); });
    $(".ap-iconbtn", dlg).addEventListener("click", close);
    backdrop.addEventListener("click", close);
    if (focus) input.focus();
    return { dlg, input, close, esc: close };
  }

  /* ── Proposal A: shadcn anatomy ─────────────────────────────────── */
  function shadcnDialog(app, { title, desc = "", field, placeholder = "", submit = "Create", size, body = "", ink = true, empty = "", disabled = false, focus = true, onSubmit, onClose }) {
    const id = "jx-dlg-" + ++uid;
    const backdrop = el(`<div class="jx-backdrop"></div>`);
    const dlg = el(`<div class="ap jx-dialog" role="dialog" aria-modal="true" aria-labelledby="${id}-t" ${desc ? `aria-describedby="${id}-d"` : ""} ${size ? `data-size="${size}"` : ""}>
      <div class="jx-dialog-header"><h2 class="jx-dialog-title" id="${id}-t">${title}</h2>${desc ? `<p class="jx-dialog-desc" id="${id}-d">${desc}</p>` : ""}</div>
      <form novalidate>
        ${field ? `<div class="jx-field"><label class="ap-label" for="${id}-i">${field}</label><input class="jx-input" id="${id}-i" placeholder="${esc(placeholder)}" autocomplete="off" aria-describedby="${id}-m"><p class="jx-field-msg" id="${id}-m" hidden>${empty}</p></div>` : ""}
        ${body}
        <div class="ab-dialog-actions jx-dialog-footer"><button type="button" class="ap-btn ab-btn-ghost" data-cancel>Cancel</button><button class="ap-btn ${ink ? "ab-btn-ink" : ""}" data-submit ${disabled ? "disabled" : ""}>${submit}</button></div>
      </form>
      <button type="button" class="ap-iconbtn jx-dialog-close" aria-label="Close">${SVG.x}</button>
    </div>`);
    app.append(backdrop, dlg);
    void dlg.offsetWidth;
    backdrop.setAttribute("data-open", ""); dlg.setAttribute("data-open", "");
    const input = $(".jx-input", dlg);
    const msg = $(".jx-field-msg", dlg);
    let closed = false;
    const dismiss = async () => { if (closed) return; closed = true; backdrop.removeAttribute("data-open"); dlg.removeAttribute("data-open"); await wait(150); backdrop.remove(); dlg.remove(); };
    const close = () => { dismiss(); onClose?.(); };
    const invalid = () => { input.setAttribute("aria-invalid", "true"); msg.hidden = false; shake(dlg); input.focus(); };
    input?.addEventListener("input", () => { input.removeAttribute("aria-invalid"); msg.hidden = true; });
    $("form", dlg).addEventListener("submit", (e) => {
      e.preventDefault();
      if (input && !input.value.trim()) return invalid();
      dismiss(); onSubmit(input ? input.value.trim() : new FormData(e.target));
    });
    $("[data-cancel]", dlg).addEventListener("click", close);
    $(".jx-dialog-close", dlg).addEventListener("click", close);
    backdrop.addEventListener("click", close);
    if (focus) (input || $("[data-submit]", dlg)).focus({ preventScroll: true });
    return { dlg, input, close, esc: close, invalid };
  }

  /* ── Controller plumbing ────────────────────────────────────────── */
  function option(flow, alt) {
    const opt = $(`[data-flow="${flow}"] > [data-alt="${alt}"]`);
    return { opt, stage: $(".jx-stage", opt), controls: $(".jx-controls", opt) };
  }
  function makeControls(box, items) {
    box.innerHTML = "";
    for (const it of items) {
      if (it === "|") { box.append(el(`<span class="jx-sep" aria-hidden="true"></span>`)); continue; }
      const b = el(`<button type="button">${it[0]}</button>`);
      b.addEventListener("click", it[1]);
      box.append(b);
    }
  }
  function register(flow, alt, ctrl) {
    const { stage, controls } = option(flow, alt);
    ctrl.stage = stage;
    stage.addEventListener("pointerdown", () => (activeCtrl = ctrl), true);
    stage.addEventListener("focusin", () => (activeCtrl = ctrl));
    makeControls(controls, ctrl.controls().map((it) => (it === "|" || it[0] === "Reset" ? it : [it[0], () => { ctrl.reset(); it[1](); }])));
    ctrl.reset();
    ctrl.initial?.();
    return ctrl;
  }
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !activeCtrl || !activeCtrl.stage.contains(document.activeElement) && document.activeElement !== document.body) return;
    if (activeCtrl.esc?.()) e.preventDefault();
  });
  function typeInto(n, value) {
    if ("value" in n && n.tagName === "INPUT") { n.value = value; n.dispatchEvent(new Event("input", { bubbles: true })); return; }
    n.textContent = value; n.dispatchEvent(new Event("input", { bubbles: true }));
  }

  /* ════ New prototype ═══════════════════════════════════════════════ */
  let protoScenario = "sidebar";
  const PROTO_TESTS = "Agents keep context across months, not sessions";
  function protoContext() {
    if (protoScenario === "sidebar") {
      const app = buildApp({ protosOpen: true, pane: protoDoc({ name: "One-person app kit", tests: "Most software is made for an audience of one", status: "built" }) });
      $(".pn-body", app).textContent = "A starter kit for making software for one person.";
      return app;
    }
    const app = buildApp({ protosOpen: true, pane: existingTheoryDoc() });
    const trigger = el(`<button class="pn-chip jx-proposed-trigger" data-trigger>${SVG.plus}<span>New prototype</span></button>`);
    $(".pn-links", app).append(trigger);
    $(".pn-theory-head", app).closest(".pn-doc").querySelector(".tw-unfold")?.remove();
    $(".tw-tc-flag", app)?.setAttribute("aria-expanded", "false");
    return app;
  }
  function revealInPane(app, node) {
    requestAnimationFrame(() => {
      const sc = $(".as-pane-scroll", app); if (!node?.isConnected) return;
      sc.scrollTop += node.getBoundingClientRect().top - sc.getBoundingClientRect().top - sc.clientHeight / 2;
    });
  }
  const protoTrigger = (app) => (protoScenario === "sidebar" ? newProtoRow(app) : $("[data-trigger]", app));
  function addProtoRow(app, name, { animate = true } = {}) {
    const row = protoRowButton(name);
    if (animate) row.classList.add("jx-grow");
    protoList(app).insertBefore(row, newProtoRow(app));
    return row;
  }

  function protoDialogFlow(kind) {
    return {
      controls() { return [["Reset", () => this.reset()], "|", ["Open", () => this.open()], ["Typing", () => this.open({ type: "Recall timeline" })], ["Needs a name", () => this.open({ submitEmpty: true })], ["Created", () => this.created()]]; },
      reset() {
        this.dialog = null;
        this.app = mount(this.stage, protoContext());
        protoTrigger(this.app).addEventListener("click", () => this.open({ focus: true }));
        if (protoScenario === "theory") revealInPane(this.app, protoTrigger(this.app));
        $(".as-pane-close [aria-label^='Close']", this.app).addEventListener("click", () => setPane(this.app, false));
      },
      initial() { this.open({ focus: false }); },
      open({ focus = false, type, submitEmpty } = {}) {
        if (this.dialog) this.reset();
        const tests = protoScenario === "theory" ? PROTO_TESTS : null;
        const onSubmit = (name) => this.commit(name);
        const onClose = () => (this.dialog = null);
        if (kind === "current") this.dialog = currentDialog(this.app, { title: "New prototype", field: "Name", focus, onSubmit, onClose });
        else this.dialog = shadcnDialog(this.app, {
          title: "New prototype",
          desc: tests ? `It will test <span class="pn-chip">${SVG.target}<span class="pn-tested-claim">${esc(tests)}</span></span>` : "Name it now. Status, notes and links go on its page.",
          field: "Name", placeholder: "e.g. Recall timeline", empty: "A prototype needs a name.", focus, onSubmit, onClose,
        });
        if (type) typeInto(this.dialog.input, type);
        if (submitEmpty) { kind === "current" ? this.dialog.input.reportValidity() : this.dialog.invalid(); }
      },
      commit(name) {
        this.dialog = null;
        const tests = kind === "A" && protoScenario === "theory" ? PROTO_TESTS : null;
        addProtoRow(this.app, name);
        paneDoc(this.app, protoDoc({ name, tests }));
        setPane(this.app, true);
      },
      created() { this.reset(); this.commit("Recall timeline"); },
      esc() { if (this.dialog) { this.dialog.esc(); return true; } },
    };
  }

  const protoB = {
    controls() { return [["Reset", () => this.reset()], "|", ["Empty", () => this.open()], ["Typing", () => this.open({ type: "Recall timeline" })], ["Needs a name", () => this.needsName()], ["Saved", () => this.saved()]]; },
    reset() {
      this.draft = null;
      this.app = mount(this.stage, protoContext());
      protoTrigger(this.app).addEventListener("click", () => this.open({ focus: true }));
      if (protoScenario === "theory") revealInPane(this.app, protoTrigger(this.app));
      $(".as-pane-close [aria-label^='Close']", this.app).addEventListener("click", () => this.closePane());
    },
    initial() { this.open({ focus: false }); },
    open({ focus = false, type } = {}) {
      if (this.draft) this.reset();
      const prev = currentDoc(this.app);
      const doc = protoDoc({ tests: protoScenario === "theory" ? PROTO_TESTS : null });
      const row = addProtoRow(this.app, "");
      row.classList.add("jx-row-new", "jx-active");
      $(".cur-sidebar-label", row).dataset.placeholder = "Untitled";
      paneDoc(this.app, doc);
      setPane(this.app, true);
      const title = $(".pn-title", doc);
      title.addEventListener("input", () => { $(".cur-sidebar-label", row).textContent = text(title); $(".jx-inline-msg", doc)?.remove(); });
      $(".pn-body", doc).addEventListener("input", () => {});
      this.draft = { prev, doc, row, title };
      if (type) typeInto(title, type);
      if (focus) placeCaret(title);
    },
    closePane() {
      const d = this.draft;
      if (!d) return setPane(this.app, false);
      const name = text(d.title), body = text($(".pn-body", d.doc));
      if (name) return this.keep();
      if (!body) return this.discard();
      let msg = $(".jx-inline-msg", d.doc);
      if (!msg) {
        msg = el(`<p class="jx-inline-msg" role="status">Name it to keep it.<button type="button" class="ap-btn">Discard</button></p>`);
        $("button", msg).addEventListener("click", () => this.discard());
        d.title.after(msg);
      }
      shake(msg);
      placeCaret(d.title);
    },
    keep() {
      const d = this.draft; this.draft = null;
      d.row.classList.remove("jx-row-new");
      setPane(this.app, false);
      setTimeout(() => d.row.classList.remove("jx-active"), 400);
    },
    async discard() {
      const d = this.draft; this.draft = null;
      animateOut(d.row);
      if (d.prev) paneDoc(this.app, d.prev); else setPane(this.app, false);
    },
    needsName() { this.open({}); $(".pn-body", this.draft.doc).textContent = "Shows what the agent remembers, and when it learned it."; this.closePane(); },
    saved() { this.open({ type: "Recall timeline" }); this.keep(); },
    esc() { if (this.draft) { this.closePane(); return true; } if (!$(".as-pane", this.app).hasAttribute("data-closed")) { setPane(this.app, false); return true; } },
  };

  const protoC = {
    controls() { return [["Reset", () => this.reset()], "|", ["Empty", () => this.open()], ["Typing", () => this.open({ type: "Recall timeline" })], ["Needs a name", () => { this.open(); this.commit(); }], ["Saved", () => { this.open({ type: "Recall timeline" }); this.commit(); }]]; },
    reset() {
      this.edit = null;
      this.app = mount(this.stage, protoContext());
      this.bindTrigger();
      if (protoScenario === "theory") revealInPane(this.app, protoTrigger(this.app));
      $(".as-pane-close [aria-label^='Close']", this.app).addEventListener("click", () => setPane(this.app, false));
    },
    bindTrigger() { protoTrigger(this.app).addEventListener("click", () => this.open({ focus: true })); },
    initial() { this.open({ focus: false }); },
    open({ focus = false, type } = {}) {
      if (this.edit) this.reset();
      const trigger = protoTrigger(this.app);
      const theory = protoScenario === "theory";
      const box = theory
        ? el(`<span class="pn-chip jx-editing">${SVG.protoIdea}<input class="jx-inline-input" aria-label="New prototype name" placeholder="Name the prototype"></span>`)
        : el(`<div class="cur-prototype-row jx-editing">${SVG.protoIdea}<input class="jx-inline-input" aria-label="New prototype name" placeholder="Name"></div>`);
      trigger.replaceWith(box);
      const input = $("input", box);
      this.edit = { box, input, theory };
      if (theory) revealInPane(this.app, box);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); this.commit({ open: true }); }
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); this.revert(); }
      });
      input.addEventListener("input", () => input.removeAttribute("aria-invalid"));
      input.addEventListener("blur", () => setTimeout(() => { if (this.edit?.input !== input || document.activeElement === input) return; input.value.trim() ? this.commit({ open: false }) : this.revert(); }, 120));
      if (type) input.value = type;
      if (focus) input.focus();
    },
    commit({ open = true } = {}) {
      const e = this.edit; if (!e) return;
      const name = e.input.value.trim();
      if (!name) { e.input.setAttribute("aria-invalid", "true"); shake(e.box); e.input.focus(); return; }
      this.edit = null;
      if (e.theory) {
        const chip = el(`<button class="pn-chip jx-card-in" title="Prototype">${SVG.protoIdea}${esc(name)}</button>`);
        const trigger = el(`<button class="pn-chip jx-proposed-trigger" data-trigger>${SVG.plus}<span>New prototype</span></button>`);
        e.box.replaceWith(chip);
        chip.after(trigger);
        addProtoRow(this.app, name);
        this.bindTrigger();
        return;
      }
      const row = protoRowButton(name);
      e.box.replaceWith(row);
      const plus = el(`<button class="cur-prototype-row">${SVG.plus}<span class="cur-sidebar-label">New prototype</span></button>`);
      plus.classList.add("jx-grow");
      row.after(plus);
      this.bindTrigger();
      if (open) {
        const doc = protoDoc({ name });
        paneDoc(this.app, doc);
        setPane(this.app, true);
        $(".pn-body", doc).focus({ preventScroll: true });
      }
    },
    revert() {
      const e = this.edit; if (!e) return;
      this.edit = null;
      const trigger = e.theory
        ? el(`<button class="pn-chip jx-proposed-trigger" data-trigger>${SVG.plus}<span>New prototype</span></button>`)
        : el(`<button class="cur-prototype-row">${SVG.plus}<span class="cur-sidebar-label">New prototype</span></button>`);
      e.box.replaceWith(trigger);
      this.bindTrigger();
    },
    esc() { if (this.edit) { this.revert(); return true; } if (!$(".as-pane", this.app).hasAttribute("data-closed")) { setPane(this.app, false); return true; } },
  };

  /* ════ State a theory ══════════════════════════════════════════════ */
  const THEME = "Agent memory";
  function theoryContext() {
    const app = buildApp({});
    return app;
  }
  function afterMount(app) { requestAnimationFrame(() => scrollMainTo(app, section(app, THEME))); }
  const theoryTrigger = (app) => $(".cur-theme [aria-label='State a theory']", section(app, THEME));
  const themeChip = () => `<span class="pn-chip">${SVG.binoculars}<span class="pn-chip-name">${THEME}</span></span>`;

  function theoryDialogFlow(kind) {
    return {
      controls() { return [["Reset", () => this.reset()], "|", ["Open", () => this.open()], ["Typing", () => this.open({ type: "Agents forget on purpose" })], ["Needs a claim", () => this.open({ submitEmpty: true })], ["Created", () => { this.reset(); this.commit("Agents forget on purpose"); }]]; },
      reset() {
        this.dialog = null;
        this.app = mount(this.stage, theoryContext());
        afterMount(this.app);
        theoryTrigger(this.app).addEventListener("click", () => this.open({ focus: true }));
        $(".as-pane-close [aria-label^='Close']", this.app).addEventListener("click", () => setPane(this.app, false));
      },
      initial() { this.open({ focus: false }); },
      open({ focus = false, type, submitEmpty } = {}) {
        if (this.dialog) this.reset();
        const onSubmit = (v) => this.commit(v), onClose = () => (this.dialog = null);
        if (kind === "current") this.dialog = currentDialog(this.app, { title: "State a theory", field: "Claim", focus, onSubmit, onClose });
        else this.dialog = shadcnDialog(this.app, { title: "State a theory", desc: `Files into ${themeChip()}`, field: "Claim", placeholder: "Something you think will happen", submit: "State theory", empty: "A theory needs a claim.", focus, onSubmit, onClose });
        if (type) typeInto(this.dialog.input, type);
        if (submitEmpty) kind === "current" ? this.dialog.input.reportValidity() : this.dialog.invalid();
      },
      commit(claim) {
        this.dialog = null;
        const card = cardEl(claim); card.classList.add("jx-card-in");
        $(".cur-cards", section(this.app, THEME)).append(card);
        $(".ap-card", card).setAttribute("data-hot", "");
        paneDoc(this.app, theoryDoc({ claim }));
        setPane(this.app, true);
      },
      esc() { if (this.dialog) { this.dialog.esc(); return true; } },
    };
  }

  const theoryB = {
    controls() { return [["Reset", () => this.reset()], "|", ["Empty", () => this.open()], ["Typing", () => this.open({ type: "Agents forget on purpose" })], ["Needs a claim", () => this.needsClaim()], ["Saved", () => { this.open({ type: "Agents forget on purpose" }); this.keep(); }]]; },
    reset() {
      this.draft = null;
      this.app = mount(this.stage, theoryContext());
      afterMount(this.app);
      theoryTrigger(this.app).addEventListener("click", () => this.open({ focus: true }));
      $(".as-pane-close [aria-label^='Close']", this.app).addEventListener("click", () => this.closePane());
    },
    initial() { this.open({ focus: false }); },
    open({ focus = false, type } = {}) {
      if (this.draft) this.reset();
      const doc = theoryDoc({});
      const card = el(`<div class="cur-card" data-kind="theory"><div class="ab-edge-host"><div class="ap-card" data-hot="" role="button" tabindex="0"><div class="ap-card-claim" data-placeholder="New theory"></div>${cardMeta()}</div></div></div>`);
      card.classList.add("jx-card-in");
      $(".cur-cards", section(this.app, THEME)).append(card);
      paneDoc(this.app, doc);
      setPane(this.app, true);
      const title = $(".pn-title", doc);
      const claim = $(".ap-card-claim", card);
      title.addEventListener("input", () => { claim.textContent = text(title); $(".jx-inline-msg", doc)?.remove(); });
      this.draft = { doc, card, title };
      if (type) typeInto(title, type);
      if (focus) placeCaret(title);
    },
    closePane() {
      const d = this.draft;
      if (!d) return setPane(this.app, false);
      const filled = text($(".pn-body", d.doc)) || text($(".tw-tc-phrase", d.doc));
      if (text(d.title)) return this.keep();
      if (!filled) { this.draft = null; animateOut(d.card); setPane(this.app, false); return; }
      let msg = $(".jx-inline-msg", d.doc);
      if (!msg) {
        msg = el(`<p class="jx-inline-msg" role="status">State the claim to keep it.<button type="button" class="ap-btn">Discard</button></p>`);
        $("button", msg).addEventListener("click", () => { this.draft = null; animateOut(d.card); setPane(this.app, false); });
        d.title.after(msg);
      }
      shake(msg);
      placeCaret(d.title);
    },
    keep() { const d = this.draft; this.draft = null; $(".ap-card", d.card).removeAttribute("data-hot"); setPane(this.app, false); },
    needsClaim() { this.open({}); $(".tw-tc-phrase", this.draft.doc).textContent = "an assistant ships memory that decays by default"; this.closePane(); },
    esc() { if (this.draft) { this.closePane(); return true; } if (!$(".as-pane", this.app).hasAttribute("data-closed")) { setPane(this.app, false); return true; } },
  };

  const theoryC = {
    controls() { return [["Reset", () => this.reset()], "|", ["Empty", () => this.open()], ["Typing", () => this.open({ type: "Agents forget on purpose" })], ["Needs a claim", () => { this.open(); this.commit(); }], ["Saved", () => { this.open({ type: "Agents forget on purpose" }); this.commit(); }]]; },
    reset() {
      this.edit = null;
      this.app = mount(this.stage, theoryContext());
      afterMount(this.app);
      theoryTrigger(this.app).addEventListener("click", () => this.open({ focus: true }));
      $(".as-pane-close [aria-label^='Close']", this.app).addEventListener("click", () => setPane(this.app, false));
    },
    initial() { this.open({ focus: false }); },
    open({ focus = false, type } = {}) {
      if (this.edit) this.reset();
      const card = el(`<div class="cur-card" data-kind="theory"><div class="ab-edge-host"><div class="ap-card jx-editing jx-card-in"><div class="ap-card-claim" contenteditable="plaintext-only" role="textbox" aria-label="Claim" data-placeholder="What do you think will happen?"></div></div></div></div>`);
      $(".cur-cards", section(this.app, THEME)).prepend(card);
      const claim = $(".ap-card-claim", card);
      this.edit = { card, claim };
      claim.addEventListener("input", () => tidy(claim));
      claim.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); this.commit(); }
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); this.revert(); }
      });
      claim.addEventListener("blur", () => setTimeout(() => { if (this.edit?.claim !== claim || document.activeElement === claim) return; text(claim) ? this.commit({ open: false }) : this.revert(); }, 120));
      if (type) claim.textContent = type;
      if (focus) placeCaret(claim);
    },
    commit({ open = true } = {}) {
      const e = this.edit; if (!e) return;
      const claimText = text(e.claim);
      if (!claimText) { shake($(".ap-card", e.card)); placeCaret(e.claim); return; }
      this.edit = null;
      e.claim.removeAttribute("contenteditable"); e.claim.removeAttribute("role"); e.claim.removeAttribute("aria-label");
      const card = $(".ap-card", e.card);
      card.classList.remove("jx-editing");
      card.setAttribute("role", "button"); card.tabIndex = 0;
      card.insertAdjacentHTML("beforeend", cardMeta());
      if (open) {
        card.setAttribute("data-hot", "");
        const doc = theoryDoc({ claim: claimText });
        paneDoc(this.app, doc);
        setPane(this.app, true);
        $(".pn-body", doc).focus({ preventScroll: true });
      }
    },
    revert() { const e = this.edit; if (!e) return; this.edit = null; animateOut(e.card); },
    esc() { if (this.edit) { this.revert(); return true; } if (!$(".as-pane", this.app).hasAttribute("data-closed")) { setPane(this.app, false); return true; } },
  };

  /* ════ New theme ═══════════════════════════════════════════════════ */
  const themeTrigger = (app) => $(".cur-brand [aria-label='New theme']", app);
  function themeDialogFlow(kind) {
    return {
      controls() { return [["Reset", () => this.reset()], "|", ["Open", () => this.open()], ["Typing", () => this.open({ type: "Synthetic data" })], ["Needs a name", () => this.open({ submitEmpty: true })], ["Created", () => { this.reset(); this.commit("Synthetic data"); }]]; },
      reset() {
        this.dialog = null;
        this.app = mount(this.stage, buildApp({}));
        themeTrigger(this.app).addEventListener("click", () => this.open({ focus: true }));
        $(".as-pane-close [aria-label^='Close']", this.app).addEventListener("click", () => setPane(this.app, false));
      },
      initial() { this.open({ focus: false }); },
      open({ focus = false, type, submitEmpty } = {}) {
        if (this.dialog) this.reset();
        const onSubmit = (v) => this.commit(v), onClose = () => (this.dialog = null);
        if (kind === "current") this.dialog = currentDialog(this.app, { title: "New theme", field: "Name", focus, onSubmit, onClose });
        else this.dialog = shadcnDialog(this.app, { title: "New theme", desc: "A topic you're tracking. Signals and theories file into it.", field: "Name", placeholder: "e.g. Synthetic data", empty: "A theme needs a name.", focus, onSubmit, onClose });
        if (type) typeInto(this.dialog.input, type);
        if (submitEmpty) kind === "current" ? this.dialog.input.reportValidity() : this.dialog.invalid();
      },
      commit(name) {
        this.dialog = null;
        const row = indexRow(name); row.classList.add("jx-grow");
        $(".cur-index", this.app).prepend(row);
        const sec = sectionEl(name); sec.classList.add("jx-grow");
        $(".cur-main", this.app).prepend(sec);
        paneDoc(this.app, themeDoc({ name }));
        setPane(this.app, true);
      },
      esc() { if (this.dialog) { this.dialog.esc(); return true; } },
    };
  }

  const themeB = {
    controls() { return [["Reset", () => this.reset()], "|", ["Empty", () => this.open()], ["Typing", () => this.open({ type: "Synthetic data" })], ["Saved", () => { this.open({ type: "Synthetic data" }); this.keep(); }]]; },
    reset() {
      this.draft = null;
      this.app = mount(this.stage, buildApp({}));
      themeTrigger(this.app).addEventListener("click", () => this.open({ focus: true }));
      $(".as-pane-close [aria-label^='Close']", this.app).addEventListener("click", () => this.closePane());
    },
    initial() { this.open({ focus: false }); },
    open({ focus = false, type } = {}) {
      if (this.draft) this.reset();
      const doc = themeDoc({});
      const row = indexRow("", { editing: true });
      row.classList.add("jx-active", "jx-grow");
      $$(".cur-index a[data-active]", this.app).forEach((a) => a.removeAttribute("data-active"));
      $(".cur-index", this.app).prepend(row);
      paneDoc(this.app, doc);
      setPane(this.app, true);
      const title = $(".pn-title", doc);
      title.addEventListener("input", () => { $("span", row).textContent = text(title); });
      this.draft = { doc, row, title };
      if (type) typeInto(title, type);
      if (focus) placeCaret(title);
    },
    closePane() {
      const d = this.draft;
      if (!d) return setPane(this.app, false);
      if (text(d.title)) return this.keep();
      this.draft = null; animateOut(d.row); setPane(this.app, false);
    },
    keep() {
      const d = this.draft; this.draft = null;
      d.row.classList.remove("jx-index-new", "jx-active");
      const sec = sectionEl(text(d.title)); sec.classList.add("jx-grow");
      $(".cur-main", this.app).prepend(sec);
      $(".cur-main", this.app).scrollTop = 0;
      setPane(this.app, false);
    },
    esc() { if (this.draft) { this.closePane(); return true; } if (!$(".as-pane", this.app).hasAttribute("data-closed")) { setPane(this.app, false); return true; } },
  };

  const themeC = {
    controls() { return [["Reset", () => this.reset()], "|", ["Empty", () => this.open()], ["Typing", () => this.open({ type: "Synthetic data" })], ["Needs a name", () => { this.open(); this.commit(); }], ["Saved", () => { this.open({ type: "Synthetic data" }); this.commit(); }]]; },
    reset() {
      this.edit = null;
      this.app = mount(this.stage, buildApp({}));
      themeTrigger(this.app).addEventListener("click", () => this.open({ focus: true }));
      $(".as-pane-close [aria-label^='Close']", this.app).addEventListener("click", () => setPane(this.app, false));
    },
    initial() { this.open({ focus: false }); },
    open({ focus = false, type } = {}) {
      if (this.edit) this.reset();
      const sec = el(`<section class="cur-section jx-editing jx-grow"><div class="cur-theme"><span class="ap-h cur-theme-name" contenteditable="plaintext-only" role="textbox" aria-label="Theme name" data-placeholder="Name this theme"></span><span class="ap-mark" role="img" data-kind="open" title="Open: no theory yet" aria-label="Open: no theory yet"></span><span class="ap-muted ap-num">0 signals</span><button type="button" class="ap-iconbtn" aria-label="State a theory">${SVG.plus}</button></div><div class="cur-cards"></div></section>`);
      const row = indexRow("", { editing: true });
      row.classList.add("jx-grow");
      $(".cur-main", this.app).prepend(sec);
      $(".cur-main", this.app).scrollTop = 0;
      $(".cur-index", this.app).prepend(row);
      const name = $(".cur-theme-name", sec);
      this.edit = { sec, row, name };
      name.addEventListener("input", () => { tidy(name); $("span", row).textContent = text(name); });
      name.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); this.commit(); }
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); this.revert(); }
      });
      name.addEventListener("blur", () => setTimeout(() => { if (this.edit?.name !== name || document.activeElement === name) return; text(name) ? this.commit({ focusNext: false }) : this.revert(); }, 120));
      if (type) { name.textContent = type; $("span", row).textContent = type; }
      if (focus) placeCaret(name);
    },
    commit({ focusNext = true } = {}) {
      const e = this.edit; if (!e) return;
      const v = text(e.name);
      if (!v) { shake($(".cur-theme", e.sec)); placeCaret(e.name); return; }
      this.edit = null;
      e.sec.classList.remove("jx-editing");
      e.row.classList.remove("jx-index-new");
      const btn = el(`<button class="ap-h cur-theme-name cur-theme-btn" data-kind="theme" data-label="${esc(v)}">${esc(v)}</button>`);
      e.name.replaceWith(btn);
      if (focusNext) $(".cur-theme [aria-label='State a theory']", e.sec).focus();
    },
    revert() { const e = this.edit; if (!e) return; this.edit = null; animateOut(e.sec); animateOut(e.row); },
    esc() { if (this.edit) { this.revert(); return true; } },
  };

  /* ════ Retire theory ═══════════════════════════════════════════════ */
  const REASONS = [["disproven", "Disproven", "The evidence went against it."], ["superseded", "Superseded", "A better theory replaces it."], ["abandoned", "Abandoned", "No longer worth tracking."]];
  function retireContext() {
    const app = buildApp({ pane: existingTheoryDoc() });
    return app;
  }
  const retireTrigger = (app) => $("[aria-label='Retire theory']", app);

  const retireCurrent = {
    controls() { return [["Reset", () => this.reset()], "|", ["Open", () => this.open()], ["Filtering", () => { this.open(); typeInto($("input", this.dlg), "su"); }]]; },
    reset() {
      this.dlg = null;
      this.app = mount(this.stage, retireContext());
      retireTrigger(this.app).addEventListener("click", () => this.open({ focus: true }));
      $(".as-pane-close [aria-label^='Close']", this.app).addEventListener("click", () => setPane(this.app, false));
    },
    initial() { this.open({}); },
    open({ focus = false } = {}) {
      if (this.dlg) this.reset();
      const backdrop = el(`<div class="ab-backdrop"></div>`);
      const dlg = el(`<div class="ap ab-dialog" role="dialog"><h2 class="ap-h">Retire theory</h2><p class="ab-description"></p><input aria-label="Find" placeholder="Find" class="ab-input"><div class="ab-options">${REASONS.map(([id, label]) => `<button class="ab-option" data-id="${id}"><span>${label}</span>${SVG.chevron}</button>`).join("")}</div></div>`);
      this.app.append(backdrop, dlg);
      this.dlg = dlg; this.backdrop = backdrop;
      const input = $("input", dlg);
      input.addEventListener("input", () => {
        const q = input.value.toLowerCase();
        $$(".ab-option", dlg).forEach((o) => (o.hidden = !text(o).toLowerCase().includes(q)));
      });
      $$(".ab-option", dlg).forEach((o) => o.addEventListener("click", () => { this.close(); setPane(this.app, false); }));
      backdrop.addEventListener("click", () => this.close());
      if (focus) input.focus();
    },
    close() { this.dlg?.remove(); this.backdrop?.remove(); this.dlg = null; },
    esc() { if (this.dlg) { this.close(); return true; } },
  };

  const retireA = {
    controls() { return [["Reset", () => this.reset()], "|", ["Open", () => this.open()], ["Reason picked", () => { this.open(); $("input[value=disproven]", this.dialog.dlg).click(); }]]; },
    reset() {
      this.dialog = null;
      this.app = mount(this.stage, retireContext());
      retireTrigger(this.app).addEventListener("click", () => this.open({ focus: true }));
      $(".as-pane-close [aria-label^='Close']", this.app).addEventListener("click", () => setPane(this.app, false));
    },
    initial() { this.open({}); },
    open({ focus = false } = {}) {
      if (this.dialog) this.reset();
      const name = "jx-reason-" + ++uid;
      const body = `<div class="jx-reasons" role="radiogroup" aria-label="Reason">${REASONS.map(([id, label, sub]) => `<label class="jx-reason"><input type="radio" name="${name}" value="${id}"><b>${label}</b><small>${sub}</small></label>`).join("")}</div>`;
      this.dialog = shadcnDialog(this.app, {
        title: "Retire this theory?", desc: "It leaves your active theories. Its evidence and history stay.", body, submit: "Retire", disabled: true, focus,
        onSubmit: () => { this.dialog = null; setPane(this.app, false); }, onClose: () => (this.dialog = null),
      });
      const submit = $("[data-submit]", this.dialog.dlg);
      $$("input[type=radio]", this.dialog.dlg).forEach((r) => r.addEventListener("change", () => (submit.disabled = false)));
      if (focus) $("input[type=radio]", this.dialog.dlg).focus();
    },
    esc() { if (this.dialog) { this.dialog.esc(); return true; } },
  };

  const retireB = {
    controls() { return [["Reset", () => this.reset()], "|", ["Open", () => this.open()], ["Retired + Undo", () => { this.reset(); this.retire("disproven"); }]]; },
    reset() {
      this.menu = null;
      this.app = mount(this.stage, retireContext());
      const trig = retireTrigger(this.app);
      trig.setAttribute("aria-haspopup", "menu");
      trig.addEventListener("click", () => (this.menu ? this.closeMenu() : this.open({ focus: true })));
      $(".as-pane-close [aria-label^='Close']", this.app).addEventListener("click", () => setPane(this.app, false));
      this.app.addEventListener("pointerdown", (e) => { if (this.menu && !this.menu.contains(e.target) && !retireTrigger(this.app).contains(e.target)) this.closeMenu(); });
    },
    initial() { requestAnimationFrame(() => this.open({})); },
    open({ focus = false } = {}) {
      if (this.menu) this.closeMenu(true);
      const trig = retireTrigger(this.app);
      const a = this.app.getBoundingClientRect(), r = trig.getBoundingClientRect();
      const menu = el(`<div class="ap jx-menu" role="menu" aria-label="Retire theory"><div class="ap-label jx-menu-label">Retire because</div>${REASONS.map(([id, label, sub]) => `<button role="menuitem" data-id="${id}">${label}<small>${sub}</small></button>`).join("")}</div>`);
      menu.style.top = r.bottom - a.top + 6 + "px";
      menu.style.right = Math.max(8, a.right - r.right) + "px";
      this.app.append(menu);
      void menu.offsetWidth;
      menu.setAttribute("data-open", "");
      trig.setAttribute("aria-expanded", "true");
      this.menu = menu;
      const items = $$("button", menu);
      items.forEach((b, i) => {
        b.addEventListener("click", () => { this.closeMenu(); this.retire(b.dataset.id); });
        b.addEventListener("keydown", (e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
          if (e.key === "ArrowUp") { e.preventDefault(); items[(i + items.length - 1) % items.length].focus(); }
        });
      });
      if (focus) items[0].focus();
    },
    async closeMenu(instant) {
      const m = this.menu; if (!m) return;
      this.menu = null;
      retireTrigger(this.app).setAttribute("aria-expanded", "false");
      m.removeAttribute("data-open");
      if (!instant) await wait(120);
      m.remove();
    },
    retire(id) {
      const doc = currentDoc(this.app);
      doc.setAttribute("data-retired", "");
      $(".jx-toast", this.app)?.remove();
      const toast = el(`<div class="ap jx-toast" role="status">Retired as ${id}<button type="button" class="ap-btn">Undo</button></div>`);
      this.app.append(toast);
      void toast.offsetWidth;
      toast.setAttribute("data-open", "");
      $("button", toast).addEventListener("click", async () => { doc.removeAttribute("data-retired"); toast.removeAttribute("data-open"); await wait(200); toast.remove(); });
    },
    esc() { if (this.menu) { this.closeMenu(); retireTrigger(this.app).focus(); return true; } },
  };

  /* ════ Delete dump ═════════════════════════════════════════════════ */
  const CONSEQUENCE = "Removes 3 signals and 2 evidence links. It stays in the bin for 30 days.";
  const deleteCurrent = {
    controls() { return [["Reset", () => this.reset()], "|", ["Open", () => this.open()]]; },
    reset() { this.dlg = null; this.app = mount(this.stage, buildApp({})); },
    initial() { this.open(); },
    open() {
      if (this.dlg) this.reset();
      const backdrop = el(`<div class="ab-backdrop"></div>`);
      const dlg = el(`<div class="ap ab-dialog" data-confirm role="dialog"><h2 class="ap-h">Delete this dump?</h2><p class="ab-description">${CONSEQUENCE}</p><form><div class="ab-dialog-actions"><button type="button" class="ap-btn ab-btn-ghost">Cancel</button><button class="ap-btn ab-btn-ink" data-destructive>Move to bin</button></div></form></div>`);
      this.app.append(backdrop, dlg);
      this.dlg = dlg;
      const close = () => { backdrop.remove(); dlg.remove(); this.dlg = null; };
      this.close = close;
      $("form", dlg).addEventListener("submit", (e) => { e.preventDefault(); close(); });
      $(".ab-btn-ghost", dlg).addEventListener("click", close);
      backdrop.addEventListener("click", close);
    },
    esc() { if (this.dlg) { this.close(); return true; } },
  };
  const deleteA = {
    controls() { return [["Reset", () => this.reset()], "|", ["Open", () => this.open()]]; },
    reset() { this.dialog = null; this.app = mount(this.stage, buildApp({})); },
    initial() { this.open(); },
    open() {
      if (this.dialog) this.reset();
      this.dialog = shadcnDialog(this.app, { title: "Delete this dump?", desc: CONSEQUENCE, submit: "Move to bin", size: "sm", focus: false, onSubmit: () => (this.dialog = null), onClose: () => (this.dialog = null) });
    },
    esc() { if (this.dialog) { this.dialog.esc(); return true; } },
  };

  /* ── Boot ───────────────────────────────────────────────────────── */
  async function boot() {
    try {
      await Promise.all(FIXTURES.map(async (n) => {
        const res = await fetch(`markup/${n}.html`);
        if (!res.ok) throw new Error(`markup/${n}.html: ${res.status}`);
        F[n] = (await res.text()).replace(/ id="base-ui-[^"]*"/g, "").replace(/ aria-(controls|labelledby|describedby)="base-ui-[^"]*"/g, "");
      }));
    } catch (err) {
      document.querySelectorAll(".jx-stage").forEach((s) => (s.textContent = "Couldn't load captured markup. Serve the repo root over HTTP."));
      console.warn(err);
      return;
    }
    const svgOf = (frag, sel) => $(sel, el(F[frag]))?.outerHTML ?? "";
    SVG.x = svgOf("dialog-new-prototype", ".ab-dialog-actions .ap-iconbtn svg");
    SVG.plus = svgOf("theme-section-first", ".ap-iconbtn svg");
    SVG.protoRow = svgOf("sidebar-current-protos-open", ".cur-prototype-row svg");
    SVG.chevron = $$(".cur-prototype-row", el(F["sidebar-current-protos-open"]))[0].querySelectorAll("svg")[1].outerHTML;
    SVG.target = svgOf("prototype-pane-doc", ".pn-rival svg");
    SVG.protoIdea = svgOf("prototype-pane-doc", ".ap-proto[data-status=idea]");
    SVG.binoculars = svgOf("theory-pane-doc", ".pn-theory-themes .pn-chip svg");

    const flows = {
      prototype: { current: protoDialogFlow("current"), A: protoDialogFlow("A"), B: protoB, C: protoC },
      theory: { current: theoryDialogFlow("current"), A: theoryDialogFlow("A"), B: theoryB, C: theoryC },
      theme: { current: themeDialogFlow("current"), A: themeDialogFlow("A"), B: themeB, C: themeC },
      retire: { current: retireCurrent, A: retireA, B: retireB },
      delete: { current: deleteCurrent, A: deleteA },
    };
    await raf2();
    for (const [flow, alts] of Object.entries(flows)) for (const [alt, ctrl] of Object.entries(alts)) register(flow, alt, ctrl);

    $$("[data-scenario]").forEach((b) => b.addEventListener("click", () => {
      protoScenario = b.dataset.scenario;
      $$("[data-scenario]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      for (const ctrl of Object.values(flows.prototype)) { ctrl.reset(); ctrl.initial(); }
    }));
    document.body.dataset.ready = "";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
