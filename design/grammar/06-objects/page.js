// Grammar 06 page: the anatomy, the matrix, states, before/after, the full-size viewer, and the hero following the picks.
(() => {
  const A = window.AberObjects, { O, row, card, chip, peek, full } = A;
  const $ = s => document.querySelector(s);
  const list = (...rows) => `<div class="ob-cell-list ob-scope ctl">${rows.join("")}</div>`;
  const scaled = (o, opts = {}) => `<div class="ob-scaled" role="button" tabindex="0" data-big="${o.id}" data-opts='${JSON.stringify(opts)}' aria-label="Open ${o.name} at full size"><div class="ob-scaled-in" inert>${full(o, opts)}</div><span class="ob-scaled-hint"><i class="ph ph-arrows-out-simple" aria-hidden="true"></i>Full size</span></div>`;

  /* ── The matrix: rows = object types, columns = rungs ── */
  const TYPES = [
    ["Theme", "theme count", "coi", "mem", "Theory count"],
    ["Theory", "theory", "t1", "t6", "Confidence"],
    ["Prototype", "prototype", "p1", "p2", "Status"],
    ["Signal", "signal", "s1", "s16", "Source"],
    ["Dump", "dump", "d3", "d1", "Kind and time"],
  ];
  const matrix = $("#matrix-grid");
  if (matrix) {
    const head = `<div class="mx-h"></div><div class="mx-h">Preview: list row</div><div class="mx-h">Preview: card and chip</div><div class="mx-h">Peek: tethered card</div><div class="mx-h">Full: fills the main area</div>`;
    const typeRow = ([label, , a, b, key]) => {
      const o = O[a], p = O[b];
      return `<div class="mx-type"><span class="ob-scope ctl">${A.tileOf(o)}</span><b>${label}</b><span>Key value: ${key}</span></div>
        <div class="mx-c" data-rung="Preview: list row">${list(row(o, { act: "none" }), row(p, { act: "none" }))}</div>
        <div class="mx-c" data-rung="Preview: card and chip"><div class="ob-scope ctl mx-stack">${card(o, { act: "none" })}<div class="ob-chips">${chip(o, "none")}${chip(p, "none")}</div></div></div>
        <div class="mx-c" data-rung="Peek"><div class="ob-scope ctl">${peek(o).replace('class="ob-peek"', 'class="ob-peek static"')}</div></div>
        <div class="mx-c" data-rung="Full"><div class="ob-scope ctl">${scaled(o)}</div></div>`;
    };
    const t4 = O.t4, t1 = O.t1;
    const attached = `
      <div class="mx-type"><span class="ob-scope ctl">${A.tile("tripwire", A.ICON.tripwire)}</span><b>Tripwire</b><span>Attached to a theory. Key value: its sentence</span></div>
        <div class="mx-c" data-rung="Preview: list row"><p class="mx-note">Nothing on the host's row by default (choice 2)</p>${list(row(t4, { act: "none" }))}</div>
        <div class="mx-c" data-rung="Preview: card and chip"><p class="mx-note">Nothing on the host's card by default (choice 2)</p><div class="ob-scope ctl mx-stack">${card(t4, { act: "none" })}</div></div>
        <div class="mx-c" data-rung="Peek"><p class="mx-note">One line inside the host's peek</p><div class="ob-scope ctl">${peek(t4).replace('class="ob-peek"', 'class="ob-peek static"')}</div></div>
        <div class="mx-c" data-rung="Full"><p class="mx-note">The sentence, the tripping signal and Dismiss | Accept</p><div class="ob-scope ctl">${scaled(t4)}</div></div>
      <div class="mx-type"><span class="ob-scope ctl">${A.tile("suggestion", A.ICON.suggestion, "draft")}</span><b>Suggestion</b><span>Attached to what it would change. Key value: what it proposes</span></div>
        <div class="mx-c" data-rung="Preview: list row"><p class="mx-note">Not on previews (decided)</p>${list(row(t1, { act: "none" }))}</div>
        <div class="mx-c" data-rung="Preview: card and chip"><p class="mx-note">Not on previews (decided)</p><div class="ob-scope ctl mx-stack">${card(t1, { act: "none" })}</div></div>
        <div class="mx-c" data-rung="Peek"><p class="mx-note">A dashed row, first in the group it would join</p><div class="ob-scope ctl">${peek(t1).replace('class="ob-peek"', 'class="ob-peek static"')}</div></div>
        <div class="mx-c" data-rung="Full"><p class="mx-note">Inside the group it would join: a dashed block with the signal as a row, why, Dismiss | Accept</p><div class="ob-scope ctl"><div class="mx-sugwrap ob-full"><div class="ob-body"><section class="ob-sec"><div class="ob-sh"><span>Supports</span><span class="ob-n">2</span></div><div class="ob-rows">${A.sugsFor(t1, "+").map(A.sugBlock).join("")}</div></section></div></div></div></div>`;
    matrix.innerHTML = head + TYPES.map(typeRow).join("") + attached;
  }

  /* ── States: one subject per state, every rung ── */
  const states = $("#states-grid");
  if (states) {
    const S = [
      ["Rest", "t6", ""], ["Hover", "t6", "hover"], ["Selected, current", "t6", "cur"], ["Draft", "t11", ""], ["Challenged", "t4", ""], ["Pending suggestion: peek and full only", "t1", ""],
    ];
    const head = ["", "List row", "Card", "Chip", "Peek", "Full"].map(h => `<div class="st-h">${h}</div>`).join("");
    const headOnly = o => { const el = document.createElement("div"); el.innerHTML = full(o, {}); const art = el.firstElementChild; art.querySelector(".ob-top")?.remove();
      const body = art.querySelector(".ob-body"); const rel = art.querySelector(".ob-rels"); rel?.remove(); art.querySelector(".ob-prose:not(.ph-note)")?.remove(); return art.outerHTML; };
    states.innerHTML = head + S.map(([label, id, st]) => {
      const o = O[id], hv = st === "hover" ? " is-hover" : "", cur = st === "cur" ? id : null;
      const pk = peek(o, { rel: false }).replace('class="ob-peek"', `class="ob-peek static"`);
      let fullCell = headOnly(o);
      if (st === "hover") fullCell = `<div class="st-rel"><div class="ob-sh"><span>Supports</span><span class="ob-n">2</span></div><div class="ob-rows">${row(O.s6, { rm: "Remove evidence: " + O.s6.name, cls: "is-hover" })}${row(O.s7, { rm: "Remove evidence: " + O.s7.name })}</div></div>`;
      if (st === "cur") fullCell = `<p class="mx-note">The object in the main area is the current item in its list</p>`;
      return `<div class="st-l">${label}</div>
        <div class="st-c">${list(row(o, { act: "none", cur, cls: hv.trim() }))}</div>
        <div class="st-c ob-scope ctl">${card(o, { act: "none", cur, cls: hv.trim() })}</div>
        <div class="st-c ob-scope ctl">${chip(o, "none").replace('class="ctl-chip ob-chip"', `class="ctl-chip ob-chip${hv}"`)}</div>
        <div class="st-c ob-scope ctl">${st === "hover" ? '<p class="mx-note">No hover state: a peek is already the hover</p>' : st === "cur" ? '<p class="mx-note">Its trigger shows the hover layer while it is open</p>' : pk}</div>
        <div class="st-c ob-scope ctl st-full">${fullCell}</div>`;
    }).join("");
  }

  /* ── Before and after ── */
  const ba = $("#ba-grid");
  if (ba) {
    const B = [
      ["Theme", ["before-theme-row.png", "Rail row: name and a bare count"], ["before-theme-chip.png", "Pane chip"], ["coi", "fund"]],
      ["Theory", ["before-theory-card.png", "Theme sections card: claim, confidence, balance, prototype count, pending, challenge"], ["t1", "t4"]],
      ["Prototype", ["before-prototype-row.png", "Rail entry, no list"], ["before-prototype-draft.png", "Briefing draft"], ["p1", "p8"]],
      ["Signal", ["before-signal-evidence-row.png", "Evidence row in the pane"], ["before-signal-card.png", "Signal inside a suggestion (decided D)"], ["s1", "s16"]],
      ["Dump", ["before-dump-row.png", "Dump log row"], ["d3", "d8"]],
    ];
    ba.innerHTML = B.map(([label, ...rest]) => {
      const ids = rest.pop(), imgs = rest;
      return `<div class="ba"><h3>${label}</h3><div class="ba-pair"><div class="ba-col"><div class="ba-k">Today in /app</div>${imgs.map(([src, cap]) => `<figure><img src="screenshots/${src}" alt="${cap}" onload="this.style.width = this.naturalWidth / 2 + 'px'"><figcaption>${cap}</figcaption></figure>`).join("")}</div>
        <div class="ba-col"><div class="ba-k">Proposed</div>${list(...ids.map(id => row(O[id], { act: "none" })))}<div class="ob-scope ctl mx-stack">${card(O[ids[0]], { act: "none" })}<div class="ob-chips">${chip(O[ids[0]], "none")}</div></div></div></div></div>`;
    }).join("");
  }

  /* ── Anatomy: one row, card, peek and full header on one left edge, slots numbered ── */
  const an = $("#anatomy");
  if (an) {
    const o = O.t1;
    an.innerHTML = `<div class="an-guide g1"></div><div class="an-guide g2"></div>
      <div class="an-item"><span class="an-k">List row</span><div class="an-row ob-scope ctl">${row(o, { act: "none", cls: "is-hover" })}</div></div>
      <div class="an-item"><span class="an-k">Card</span><div class="an-card ob-scope ctl">${card(o, { act: "none" })}</div></div>
      <div class="an-item"><span class="an-k">Peek</span><div class="an-peek ob-scope ctl">${peek(o).replace('class="ob-peek"', 'class="ob-peek static"')}</div></div>
      <div class="an-item"><span class="an-k">Full</span><div class="an-full ob-scope ctl">${full(o).replace(/<div class="ob-rels">[\s\S]*<\/div><\/div>\s*<\/article>$/, "</div></article>")}</div></div>`;
    const tag = (el, n) => { if (!el) return; const r = el.getBoundingClientRect(), b = an.getBoundingClientRect(); const t = document.createElement("span"); t.className = "an-tag"; t.textContent = n;
      t.style.left = `${r.left - b.left - 7}px`; t.style.top = `${r.top - b.top - 7}px`; an.append(t); };
    const mark = () => { an.querySelectorAll(".an-tag").forEach(t => t.remove());
      an.querySelectorAll(".an-item").forEach(it => { tag(it.querySelector(".g"), 1); tag(it.querySelector(".nm, .ob-pk-name, .ob-title"), 2);
        tag(it.querySelector(".ob-rk > *, .ob-pk-key > *, .kv > *, .ob-meta > *"), 3); tag(it.querySelector(".st > *"), 4); });
      const p = an.querySelector(".an-peek"); tag(p.querySelector(".ob-meta > span:nth-child(3)"), 5); tag(p.querySelector(".ob-attach, .ob-row.suggested"), 6); tag(p.querySelector(".ob-pk-rel"), 7);
      const r = an.querySelector(".an-row"); tag(r.querySelector(".when"), 5); };
    document.fonts.ready.then(mark); addEventListener("resize", mark);
  }

  A.markFades();
  /* Scaled full views fit their cell */
  const fitScaled = () => document.querySelectorAll(".ob-scaled").forEach(b => { const w = b.clientWidth; if (w) b.firstElementChild.style.zoom = Math.min(1, w / 760); });
  new ResizeObserver(fitScaled).observe(document.body); fitScaled();

  /* ── Full size viewer (a transient surface: X and Esc close it) ── */
  const dlg = $("#big");
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-big]"); if (!b || !dlg) return;
    dlg.querySelector(".big-body").innerHTML = `<div class="ob-scope ctl big-surface">${full(O[b.dataset.big], JSON.parse(b.dataset.opts || "{}"))}</div>`;
    dlg.showModal();
  });
  document.addEventListener("keydown", e => { const b = (e.key === "Enter" || e.key === " ") && e.target.closest?.("[data-big]"); if (b) { e.preventDefault(); b.click(); } });
  dlg?.addEventListener("click", e => { if (e.target === dlg || e.target.closest("[data-big-close]")) dlg.close(); });

  /* ── Hero follows the picks; the decide box shows them ── */
  const MAP = { challenge: ["challenge", { "a Signpost at the bottom right": "a", "b Under the type tile": "b", "c Not on previews": "c" }], align: ["align", { "a Tile matches the line": "a", "b Tile top on the caps": "b", "c Smaller tile, centred": "c" }], fresh: ["fresh", { "a Nothing on objects": "none", "b Unread weight": "weight", "c Text in the key value": "text" }], peek: ["peek", { "a Essentials and relations": "rel", "b Essentials only": "own" }], full: ["full", { "a Prose first": "prose", "b Fields table": "fields" }] };
  addEventListener("load", () => {
    const d = document.querySelector(".jig-dock"), h = document.querySelector(".jig-head"); if (d && h) h.append(d);
    const page = document.body.dataset.jig;
    const pick = id => { let v; try { v = JSON.parse(localStorage.getItem(`jig:${page}:${id}`))?.choice; } catch {} return v === undefined ? document.querySelector(`[data-decision="${id}"]`)?.dataset.default : v; };
    const paint = () => {
      document.querySelectorAll("[data-pick]").forEach(li => { const v = pick(li.dataset.pick); li.querySelector(".pick").innerHTML = v ? `Current pick: <b>${v}</b>` : "No pick yet"; });
      const patch = {}; for (const [id, [key, vals]] of Object.entries(MAP)) { const v = pick(id); if (vals[v]) patch[key] = vals[v]; }
      if (patch.align) document.body.dataset.align = patch.align;
      if (patch.challenge) document.body.dataset.challenge = patch.challenge;
      if (patch.fresh) document.body.dataset.fresh = patch.fresh;
      document.querySelectorAll("[data-follows-picks]").forEach(h => h._s && window.AberObjectFrames.set(h, patch));
    };
    paint(); document.addEventListener("click", e => { if (e.target.closest(".jig-choose")) setTimeout(paint, 0); });
  });
})();
