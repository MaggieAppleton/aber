// Grammar 11: Columns, Atlas and Timeline rebuilt from the decided foundations. Each [data-v11] host gets a live 1360 × 820
// window (today's app frame), scaled to fit. Click to select: the docked pane slides in and the view refits beside it.
// Host config (JSON): { view: "columns" | "atlas" | "timeline", sel: "t1" | "cost" | null, dim, size, labels }.
(() => {
  /* ── Data: the app's seed (jig/src/homes/data.ts) ─────────────────────────── */
  const THEMES = [
    { id: "cost", name: "Cost of intelligence", signals: 23, fresh: 4 },
    { id: "memory", name: "Agent memory", signals: 31, fresh: 2 },
    { id: "review", name: "Code review after agents", signals: 18, fresh: 2 },
    { id: "personal", name: "Personal software", signals: 27, fresh: 2 },
    { id: "funding", name: "AI funding cycle", signals: 9, fresh: 1 },
    { id: "interfaces", name: "Novel agent interfaces", signals: 14, fresh: 1 },
    { id: "identity", name: "Agent identity", signals: 6, fresh: 1 },
  ];
  const THEORIES = [
    { id: "t1", claim: "Tokens become nearly free for routine work", themes: ["cost"], c: 3, year: 2028, follows: [], rivals: ["t2"], pending: 2 },
    { id: "t2", claim: "Frontier intelligence stays scarce and expensive", themes: ["cost", "funding"], c: 2, year: 2029, follows: [], rivals: ["t1"], pending: 1 },
    { id: "t3", claim: "Agents keep context across months, not sessions", themes: ["memory"], c: 4, year: 2027, follows: [], rivals: [], pending: 1, challenge: true },
    { id: "t4", claim: "Code review becomes the bottleneck, not writing", themes: ["review"], c: 4, year: 2027, follows: [], rivals: [], pending: 0 },
    { id: "t5", claim: "Most software is made for an audience of one", themes: ["personal"], c: 3, year: 2030, follows: ["t1"], rivals: [], pending: 0 },
    { id: "t6", claim: "Labs face a funding correction before agents pay their way", themes: ["funding"], c: 2, year: 2027, follows: [], rivals: [], pending: 0 },
    { id: "t7", claim: "Agents run continuously in the background by default", themes: ["cost", "memory"], c: 3, year: 2029, follows: ["t1", "t3"], rivals: [], pending: 0 },
    { id: "d1", claim: "Local models absorb most everyday agent work", themes: ["cost"], c: 0, year: 2028, follows: [], rivals: [], pending: 0, draft: true },
    { id: "d2", claim: "Software is priced per outcome, not per seat", themes: ["cost", "personal"], c: 0, year: 2030, follows: ["t1", "t7"], rivals: [], pending: 0, draft: true },
    { id: "d3", claim: "Review shifts from diffs to intent", themes: ["review"], c: 0, year: 2028, follows: ["t4"], rivals: [], pending: 0, draft: true },
  ];
  const SIGNALS = [["s1", "Lab cuts API prices again for its small model tier", "x.com", ["cost"], ["t1"], "D1", 1], ["s2", "Open-weight model matches last year's frontier on coding", "news.ycombinator.com", ["cost"], ["t1", "d1"], "D1", 1],
    ["s4", "Data-centre power contracts are booked years ahead", "ft.com", ["cost", "funding"], ["t2"], "D1", 1], ["s5", "Team reports agents opening 40 PRs a day", "x.com", ["review"], ["t4"], "D2", 1],
    ["s7", "Memory feature withdrawn after privacy complaints", "theverge.com", ["memory"], ["t3"], "D2", 1], ["s12", "Design studio ships a canvas-style agent UI", "x.com", ["interfaces"], [], "D2", 1],
    ["s3", "Frontier training runs keep growing in cost", "arxiv.org", ["cost", "funding"], ["t1", "t2"], "D4", 0], ["s6", "Reviewers skim agent diffs and approve", "My observation", ["review"], ["t4", "d3"], "D3", 0],
    ["s8", "Agent recalls a codebase across a month of sessions", "x.com", ["memory"], ["t3"], "D4", 0], ["s13", "Agents get their own OAuth identities", "github.blog", ["identity"], [], "D4", 0],
    ["s9", "Friend built a budgeting app just for her household", "My observation", ["personal"], ["t5"], "D5", 0], ["s10", "Startup sells agent hours instead of seats", "x.com", ["personal", "cost"], ["d2"], "D5", 0],
    ["s11", "Funding for model labs dips for a second quarter", "bloomberg.com", ["funding"], ["t6"], "D5", 0]]
    .map(([id, gist, source, themes, theories, dump, today]) => ({ id, gist, source, themes, theories, dump, today }));
  const DUMPS = [["D1", "3 links and a ramble about small models", "08:12"], ["D2", "Voice note, 4 min: review is the new bottleneck", "07:40"], ["D3", "What if review is about intent, not diffs?", "Yesterday"],
    ["D4", "arxiv.org paper on training costs, plus 2 posts", "Yesterday"], ["D5", "Voice note, 2 min: household software", "Mon 27 Oct"]].map(([id, first, when]) => ({ id, first, when }));
  const PROTOS = [{ id: "p2", name: "Intent review", theories: ["t4", "d3"] }, { id: "p1", name: "Token budget meter", theories: ["t1"] }, { id: "p3", name: "One-person app kit", theories: ["t5"] }, { id: "p4", name: "Memory inspector", theories: ["t3"] }];
  const theory = id => THEORIES.find(t => t.id === id), theme = id => THEMES.find(t => t.id === id);
  const inTheme = id => THEORIES.filter(t => t.themes.includes(id));
  const kindOf = id => theory(id) ? "theory" : theme(id) ? "theme" : PROTOS.some(p => p.id === id) ? "prototype" : SIGNALS.some(s => s.id === id) ? "signal" : "dump";

  /* ── Atoms ────────────────────────────────────────────────────────────────── */
  const GLYPH = { dump: "tray-arrow-down", signal: "pulse", theme: "binoculars", theory: "target", prototype: "pencil-ruler" };
  const NAMES = { dump: "Dumps", signal: "Signals", theme: "Themes", theory: "Theories", prototype: "Prototypes" };
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const g = type => `<span class="v-g" data-type="${type}"><i class="ph ph-${GLYPH[type]}" aria-hidden="true"></i></span>`;
  const ib = (icon, label, key, attrs = "") => `<button type="button" class="ctl-icon" aria-label="${esc(label)}" data-tip="${esc(label)}"${key ? ` data-key="${key}"` : ""} ${attrs}><i class="ph ph-${icon}" aria-hidden="true"></i></button>`;
  const conf = n => `<span class="v-conf" role="img" aria-label="Confidence ${n} of 5">${[1, 2, 3, 4, 5].map(i => `<i${i <= n ? " data-on" : ""}></i>`).join("")}</span>`;

  /* What relates to the open object: drives rail counts, dimming and the timeline's chain */
  const related = (sel, chain) => {
    const R = { theme: new Set(), theory: new Set(), prototype: new Set(), signal: new Set(), dump: new Set() };
    if (!sel) return R;
    const k = kindOf(sel);
    if (k === "theory") {
      const t = theory(sel); R.theory.add(sel); t.themes.forEach(x => R.theme.add(x));
      const grow = (id, dir) => THEORIES.forEach(o => {
        const hit = dir > 0 ? o.follows.includes(id) : theory(id).follows.includes(o.id);
        if (hit && !R.theory.has(o.id)) { R.theory.add(o.id); if (chain) grow(o.id, dir); }
      });
      grow(sel, 1); grow(sel, -1); t.rivals.forEach(r => R.theory.add(r));
      SIGNALS.filter(s => s.theories.includes(sel)).forEach(s => { R.signal.add(s.id); R.dump.add(s.dump); });
      PROTOS.filter(p => p.theories.includes(sel)).forEach(p => R.prototype.add(p.id));
    } else if (k === "theme") {
      R.theme.add(sel); inTheme(sel).forEach(t => { R.theory.add(t.id); t.themes.forEach(x => R.theme.add(x)); });
      SIGNALS.filter(s => s.themes.includes(sel)).forEach(s => { R.signal.add(s.id); R.dump.add(s.dump); });
      PROTOS.filter(p => p.theories.some(id => R.theory.has(id))).forEach(p => R.prototype.add(p.id));
    } else if (k === "prototype") {
      R.prototype.add(sel); PROTOS.find(p => p.id === sel).theories.forEach(id => { R.theory.add(id); theory(id).themes.forEach(x => R.theme.add(x)); });
    }
    return R;
  };

  /* ── The pane: the docked surface is this page's; its contents are a placeholder for 06 Objects ── */
  const paneHTML = sel => {
    const k = kindOf(sel), t = theory(sel), th = theme(sel), p = PROTOS.find(x => x.id === sel);
    const title = t ? t.claim : th ? th.name : p ? p.name : sel;
    const chips = t ? t.themes.map(id => `<span class="v-pane-chip">${g("theme")}${esc(theme(id).name)}</span>`).join("") : `<span class="v-pane-chip">${g(k)}${NAMES[k].replace(/s$/, "")}</span>`;
    return `<div class="v-pane-in" data-k="${sel}">
      <div class="v-pane-head">${chips}<span class="ctl">${ib("arrows-out-simple", "Full width")}${ib("x", "Close", "Esc", "data-close")}</span></div>
      <h2 class="v-title">${esc(title)}</h2>
      <div class="v-ph"><b>Placeholder: what the pane holds is 06 Objects and 07 Rungs</b><span class="bar m"></span><span class="bar s"></span><span class="bar m"></span><span class="bar s"></span></div>
    </div>`;
  };

  const switcher = view => `<nav class="v-float v-switch" aria-label="Views">${[["sections", "rows", "Theme sections", "⌘1"], ["columns", "columns", "Columns", "⌘2"], ["atlas", "map-trifold", "Atlas", "⌘3"], ["timeline", "chart-scatter", "Timeline", "⌘4"], ["briefing", "newspaper", "Briefing", "⌘5"]]
    .map(([v, i, l, key]) => {
      const here = v === view, off = v === "sections" || v === "briefing";
      return `<button type="button" class="ctl-icon" data-view="${v}" aria-label="${l}" data-tip="${off ? `${l} is the type-first view (nav/)` : l}" data-key="${key}"${here ? ' aria-current="true"' : ""}${off ? ' aria-disabled="true"' : ""}><i class="ph${here ? "-fill" : ""} ph-${i}" aria-hidden="true"></i></button>`;
    }).join("")}</nav>`;
  const composer = `<div class="v-float v-composer" aria-label="Dump or ask (placeholder)">${ib("clock-counter-clockwise", "Dump log")}<span class="ph-text">Dump or ask</span>${ib("microphone", "Voice dump")}</div>`;

  /* ═══ Columns ═══════════════════════════════════════════════════════════ */
  const COLS = [{ kind: "dump", w: 250, flow: true }, { kind: "signal", w: 290, flow: true }, { kind: "theme", w: 230 }, { kind: "theory", w: 296 }, { kind: "prototype", w: 220 }];
  const columns = {
    html: () => `<div class="v-cols">${COLS.map(c => `
      <section class="v-col" data-kind="${c.kind}" style="--w:${c.w}px"${c.flow ? " data-flow" : ""} aria-label="${NAMES[c.kind]}">
        <button type="button" class="v-rail" aria-label="Show ${NAMES[c.kind]}" data-tip="${NAMES[c.kind]}" data-rail="${c.kind}">${g(c.kind)}<span class="n"></span></button>
        <div class="v-col-in">
          <header class="v-col-head">${g(c.kind)}<span class="name">${NAMES[c.kind]}</span><span class="ctl">${ib("sidebar-simple", `Fold ${NAMES[c.kind]}`, "", `data-fold="${c.kind}"`)}</span></header>
          <div class="v-list">${columns.list(c.kind)}</div>
        </div>
      </section>`).join("")}<div class="v-col-pane"></div></div>`,
    list: kind => kind === "theme" ? THEMES.map(t => `<button type="button" class="v-row" data-id="${t.id}"><span class="v-name">${esc(t.name)}</span></button>`).join("")
      : kind === "theory" ? THEORIES.map(t => `<button type="button" class="v-card" data-id="${t.id}"${t.draft ? " data-draft" : ""}><span class="v-claim">${esc(t.claim)}</span><span class="v-meta">${t.draft ? "" : conf(t.c)}</span></button>`).join("")
      : kind === "prototype" ? PROTOS.map(p => `<button type="button" class="v-proto" data-id="${p.id}">${g("prototype")}<span class="v-name">${esc(p.name)}</span></button>`).join("")
      : kind === "signal" ? SIGNALS.map(s => `<button type="button" class="v-card" data-id="${s.id}" data-flowrow><span class="v-name">${esc(s.gist)}</span><span class="v-meta">${esc(s.source)}</span></button>`).join("")
      : DUMPS.map(d => `<button type="button" class="v-card" data-id="${d.id}" data-flowrow><span class="v-name">${esc(d.first)}</span><span class="v-meta">${esc(d.when)}</span></button>`).join(""),
    init(S) { S.shown = new Set(["theme", "theory", "prototype"]); },
    update(S) {
      const R = related(S.sel), k = S.sel && kindOf(S.sel);
      S.root.querySelectorAll(".v-col").forEach(col => {
        const kind = col.dataset.kind, wide = S.sel ? kind === k : S.shown.has(kind);
        col.toggleAttribute("data-folded", !wide);
        col.querySelector(".v-rail .n").textContent = S.sel && R[kind].size && kind !== k ? R[kind].size : "";
        col.querySelectorAll("[data-id]").forEach(el => {
          const id = el.dataset.id, on = id === S.sel;
          el.setAttribute("aria-current", on ? "true" : "false");
          el.toggleAttribute("data-unrel", !!S.sel && !on && !R[kindOf(id)]?.has(id));
        });
      });
      const pane = S.root.querySelector(".v-col-pane");
      if (S.sel && pane.dataset.k !== S.sel) { pane.innerHTML = `<div class="v-colpane-surface">${paneHTML(S.sel)}</div>`; pane.dataset.k = S.sel; }
      if (!S.sel) { pane.innerHTML = ""; pane.dataset.k = ""; }
    },
    click(S, el) {
      const rail = el.closest("[data-rail]"), fold = el.closest("[data-fold]");
      if (rail) { if (S.sel) S.sel = null; S.shown.add(rail.dataset.rail); return true; }
      if (fold) { S.shown.delete(fold.dataset.fold); return true; }
      const item = el.closest("[data-id]");
      if (item && !item.hasAttribute("data-flowrow")) { S.sel = S.sel === item.dataset.id ? null : item.dataset.id; return true; }
    },
  };

  /* ═══ Atlas ═════════════════════════════════════════════════════════════
     World geometry is today's (measured in jig /app): territory discs and theory pins in a 1240 × 760 world. */
  const AREAS = { cost: [600, 370, 150], memory: [820, 290, 160], review: [980, 540, 120], personal: [420, 230, 130], funding: [520, 560, 100], interfaces: [220, 500, 105], identity: [1070, 150, 75] };
  const PINS = { t1: [647.7, 322.3], t2: [560, 465], t3: [820, 290], t4: [1018.2, 501.8], t5: [420, 230], t6: [520, 560], t7: [710, 330], d1: [552.3, 417.7], d2: [510, 300], d3: [941.8, 578.2] };
  const CLAIM_Z = 1.6;
  const geometry = size => {
    const A = {}, P = {};
    for (const t of THEMES) { const [x, y, r] = AREAS[t.id]; A[t.id] = { x, y, r: size === "area" ? Math.round(28.7 * Math.sqrt(t.signals)) : r }; }
    for (const t of THEORIES) {
      let [x, y] = PINS[t.id];
      if (size === "area") {
        if (t.themes.length === 2) {   // the middle of the lens where its two territories overlap
          const a = A[t.themes[0]], b = A[t.themes[1]], d = Math.hypot(b.x - a.x, b.y - a.y), m = (d - b.r + a.r) / 2;
          x = a.x + (b.x - a.x) * m / d; y = a.y + (b.y - a.y) * m / d;
        } else {                        // stay inside its one territory, 16 from the edge
          const a = A[t.themes[0]], d = Math.hypot(x - a.x, y - a.y), lim = a.r - 16;
          if (d > lim) { x = a.x + (x - a.x) * lim / d; y = a.y + (y - a.y) * lim / d; }
        }
      }
      P[t.id] = { x, y };
    }
    return { A, P };
  };
  const overlaps = (a, b, m = 4) => a.l < b.r + m && b.l < a.r + m && a.t < b.b + m && b.t < a.b + m;
  const atlas = {
    html: S => `<div class="v-main"><div class="v-map" tabindex="-1" aria-label="Atlas">
        ${THEMES.map(t => `<div class="v-area" data-area="${t.id}"><button type="button" class="disc" data-id="${t.id}" aria-label="${esc(t.name)}, ${t.signals} signals"></button>
          <span class="v-alabel">${g("theme")}${esc(t.name)}<span class="n">${t.signals}</span></span></div>`).join("")}
        ${THEORIES.map(t => `<button type="button" class="v-pin" data-id="${t.id}" aria-label="${esc(t.claim)}" style="--d:${t.draft ? 10 : 8 + t.c * 1.5}px"${t.draft ? " data-draft" : ""}><span class="dot"></span></button>
          <span class="v-plabel" data-for="${t.id}"${t.draft ? " data-draft" : ""}>${esc(t.claim)}</span>`).join("")}
      </div><div class="v-float col v-zoom">${ib("magnifying-glass-plus", "Zoom in", "+", 'data-zoom="in"')}${ib("magnifying-glass-minus", "Zoom out", "−", 'data-zoom="out"')}${ib("corners-in", "Fit", "0", 'data-zoom="fit"')}</div></div>`,
    init(S) {
      S.geo = geometry(S.size); S.cam = null;
      const map = S.root.querySelector(".v-map");
      let drag = null;
      map.addEventListener("pointerdown", e => { if (e.target.closest("button")) return; drag = { x: e.clientX, y: e.clientY, cam: { ...S.cam }, moved: false }; map.setPointerCapture(e.pointerId); });
      map.addEventListener("pointermove", e => {
        if (!drag) return; const dx = (e.clientX - drag.x) / S.k, dy = (e.clientY - drag.y) / S.k;
        if (Math.hypot(dx, dy) > 3) drag.moved = true;
        if (drag.moved) { S.root.classList.remove("v-anim"); S.cam = { ...drag.cam, tx: drag.cam.tx + dx, ty: drag.cam.ty + dy }; atlas.place(S); }
      });
      map.addEventListener("pointerup", () => { if (drag && !drag.moved && S.sel) { S.sel = null; S.refresh(); } drag = null; });
      S.root.querySelectorAll(".v-pin").forEach(p => {
        p.addEventListener("pointerenter", () => { S.hover = p.dataset.id; atlas.labels(S); });
        p.addEventListener("pointerleave", () => { S.hover = null; atlas.labels(S); });
      });
    },
    mapSize: S => ({ w: 1360 - (S.sel ? S.paneW : 0), h: 820 }),
    fit(S, ids) {
      const { w, h } = atlas.mapSize(S), A = S.geo.A;
      const list = ids || THEMES.map(t => t.id);
      const bb = list.reduce((b, id) => { const a = A[id]; return { l: Math.min(b.l, a.x - a.r), t: Math.min(b.t, a.y - a.r), r: Math.max(b.r, a.x + a.r), b: Math.max(b.b, a.y + a.r) }; }, { l: 1e9, t: 1e9, r: -1e9, b: -1e9 });
      const pad = { l: 56, r: 16, t: 40, b: 64 };   // clear of the zoom bar (left) and the view switcher (bottom)
      const kMax = ids ? 2.2 : 1;
      const z = Math.min((w - pad.l - pad.r) / (bb.r - bb.l), (h - pad.t - pad.b) / (bb.b - bb.t), kMax);
      return { z, tx: pad.l + (w - pad.l - pad.r - (bb.r - bb.l) * z) / 2 - bb.l * z, ty: pad.t + (h - pad.t - pad.b - (bb.b - bb.t) * z) / 2 - bb.t * z };
    },
    place(S) {
      const { z, tx, ty } = S.cam, A = S.geo.A, P = S.geo.P;
      S.root.querySelectorAll(".v-area").forEach(el => { const a = A[el.dataset.area]; Object.assign(el.style, { left: `${a.x * z + tx - a.r * z}px`, top: `${a.y * z + ty - a.r * z}px`, width: `${a.r * 2 * z}px`, height: `${a.r * 2 * z}px` }); });
      S.root.querySelectorAll(".v-pin").forEach(el => { const p = P[el.dataset.id]; Object.assign(el.style, { left: `${p.x * z + tx}px`, top: `${p.y * z + ty}px` }); });
      atlas.labels(S);
    },
    /* Labels never overlap. Territory names try inside the top of their disc, then just above it, then inside the bottom;
       theory names try the right of their pin, then the left; a name with no clear place waits for hover or zoom. */
    labels(S) {
      const { z, tx, ty } = S.cam, A = S.geo.A, P = S.geo.P;
      // Floating chrome is in the way too: zoom (top-left), view switcher (bottom-left), and the pill when the pane is shut
      const taken = [{ l: 0, r: 52, t: 0, b: 112 }, { l: 0, r: 184, t: 820 - 56, b: 820 }].concat(S.sel ? [] : [{ l: 1360 - 324, r: 1360, t: 820 - 56, b: 820 }]);
      const pinBox = id => { const p = P[id]; const x = p.x * z + tx, y = p.y * z + ty; return { l: x - 7, r: x + 7, t: y - 7, b: y + 7 }; };
      const pins = THEORIES.map(t => ({ id: t.id, box: pinBox(t.id) }));
      const order = [...THEMES].sort((a, b) => (b.id === S.sel) - (a.id === S.sel) || b.signals - a.signals);
      for (const t of order) {
        const a = A[t.id], el = S.root.querySelector(`[data-area="${t.id}"] .v-alabel`);
        const w = el.offsetWidth, h = el.offsetHeight, cx = a.x * z + tx, cy = a.y * z + ty, r = a.r * z;
        const tries = [cy - r + 12, cy - r - h - 4, cy + r - h - 12], lx = Math.max(8 + w / 2, Math.min(atlas.mapSize(S).w - 8 - w / 2, cx));
        let best = null;
        for (const top of tries) {
          const box = { l: lx - w / 2, r: lx + w / 2, t: top, b: top + h };
          if (!taken.some(b => overlaps(b, box)) && !pins.some(p => overlaps(p.box, box, 2))) { best = top; break; }
        }
        const mapW = atlas.mapSize(S).w, ccx = Math.max(8 + w / 2, Math.min(mapW - 8 - w / 2, cx));   // never past the map's edge
        el.toggleAttribute("data-hide", best === null && t.id !== S.sel);   // no clear place: wait rather than collide
        if (best === null) best = tries[0];
        taken.push({ l: ccx - w / 2, r: ccx + w / 2, t: best, b: best + h });
        el.style.left = `${r + ccx - cx}px`; el.style.top = `${best - (cy - r)}px`;
      }
      const R = related(S.sel);
      const order2 = [...THEORIES].sort((a, b) => (b.id === S.sel) - (a.id === S.sel) || (b.id === S.hover) - (a.id === S.hover) || b.c - a.c);
      for (const t of order2) {
        const el = S.root.querySelector(`.v-plabel[data-for="${t.id}"]`), p = P[t.id];
        const x = p.x * z + tx, y = p.y * z + ty, d = (t.draft ? 10 : 8 + t.c * 1.5) * 1.25;
        const want = t.id === S.sel || t.id === S.hover || S.labels === "always" || z >= CLAIM_Z || t.themes.includes(S.sel);
        el.setAttribute("aria-current", t.id === S.sel ? "true" : "false");
        el.toggleAttribute("data-unrel", !!S.sel && !R.theory.has(t.id));
        const mapW = atlas.mapSize(S).w;
        if (!want || x < 0 || x > mapW || y < 0 || y > 820) { el.removeAttribute("data-show"); continue; }   // its pin is off the map
        const w = el.offsetWidth, h = el.offsetHeight;
        const forced = t.id === S.sel || t.id === S.hover, inMap = b => b.l >= 8 && b.r <= mapW - 8 && b.t >= 8 && b.b <= 820 - 8;
        const below = Math.max(8, Math.min(mapW - 8 - w, x - w / 2));   // last resort: centred under the pin, kept on the map
        const tries = [x + d / 2 + 4, x - d / 2 - 4 - w].map(l => ({ l, r: l + w, t: y - h / 2, b: y + h / 2 }))
          .concat([{ l: below, r: below + w, t: y + d / 2 + 4, b: y + d / 2 + 4 + h }]);
        let placed = false;
        for (const [i, box] of tries.entries()) {
          if (!inMap(box)) continue;
          if (forced || (!taken.some(b => overlaps(b, box)) && !pins.some(q => q.id !== t.id && overlaps(q.box, box, 0)))) {
            el.style.left = `${box.l}px`; el.style.top = `${box.t + h / 2}px`; taken.push(box); placed = true; break;
          }
        }
        el.toggleAttribute("data-show", placed);
      }
    },
    update(S) {
      const R = related(S.sel), k = S.sel && kindOf(S.sel);
      S.root.querySelectorAll(".v-area").forEach(el => { const id = el.dataset.area; el.setAttribute("aria-current", id === S.sel ? "true" : "false"); el.toggleAttribute("data-unrel", !!S.sel && !R.theme.has(id)); });
      S.root.querySelectorAll(".v-pin").forEach(el => { const id = el.dataset.id; el.setAttribute("aria-current", id === S.sel ? "true" : "false"); el.toggleAttribute("data-unrel", !!S.sel && !R.theory.has(id)); });
      S.root.classList.toggle("v-anim", !!S.cam);
      S.cam = !S.sel ? atlas.fit(S) : k === "theme" ? atlas.fit(S, [S.sel]) : atlas.fit(S, theory(S.sel).themes);
      if (k === "theory") S.cam = atlas.centre(S, S.geo.P[S.sel], Math.max(S.cam.z, CLAIM_Z));
      atlas.place(S);
    },
    centre(S, p, z) { const { w, h } = atlas.mapSize(S); return { z, tx: (w + 40) / 2 - p.x * z, ty: (h - 24) / 2 - p.y * z }; },
    click(S, el) {
      const zb = el.closest("[data-zoom]");
      if (zb) {
        const { w, h } = atlas.mapSize(S), c = S.cam, f = zb.dataset.zoom === "in" ? 1.4 : 1 / 1.4;
        S.root.classList.add("v-anim");
        if (zb.dataset.zoom === "fit") S.cam = atlas.fit(S);
        else { const z = Math.min(4, Math.max(0.5, c.z * f)), cx = w / 2, cy = h / 2; S.cam = { z, tx: cx - (cx - c.tx) * z / c.z, ty: cy - (cy - c.ty) * z / c.z }; }
        atlas.place(S); return false;
      }
      const item = el.closest("[data-id]");
      if (item) { S.sel = S.sel === item.dataset.id ? null : item.dataset.id; return true; }
    },
  };

  /* ═══ Timeline ══════════════════════════════════════════════════════════ */
  const YEARS = [2027, 2028, 2029, 2030, 2031], LANES = [5, 4, 3, 2, 1, 0];
  const laneOf = t => t.draft ? 0 : t.c;
  const timeline = {
    html: S => {
      const rows = LANES.map(l => THEORIES.some(t => laneOf(t) === l) ? "minmax(min-content, 1fr)" : "40px").join(" ");
      return `<div class="v-main"><div class="v-float v-tools"></div>
        <div class="v-tl" style="--years:${YEARS.length};--lanes:${rows}">
          <svg class="v-links" aria-hidden="true"></svg>
          <span></span>${YEARS.map(y => `<span class="v-tl-year">${y}</span>`).join("")}
          ${LANES.map(l => `<span class="v-tl-gutter">${l ? conf(l) : '<span class="v-draftdot" role="img" aria-label="Drafts"></span>'}</span>${YEARS.map(y => `<div class="v-tl-cell">${THEORIES.filter(t => laneOf(t) === l && t.year === y)
            .map(t => `<button type="button" class="v-tl-item" data-id="${t.id}"${t.draft ? " data-draft" : ""}><span class="dot"></span><span class="t">${esc(t.claim)}</span></button>`).join("")}</div>`).join("")}`).join("")}
        </div></div>`;
    },
    init(S) { S.filter = null; S.chain = false; S.menu = false; },
    tools(S) {
      const box = S.root.querySelector(".v-tools");
      const f = S.filter ? `<button type="button" class="ctl-btn" data-tool="filter" aria-expanded="${S.menu}" aria-label="Filter by theme: ${esc(theme(S.filter).name)}" data-tip="Filter by theme"><i class="ph ph-funnel" aria-hidden="true"></i>${esc(theme(S.filter).name)}</button>`
        : ib("funnel", "Filter by theme", "", `data-tool="filter" aria-expanded="${S.menu}"`);
      box.innerHTML = f + (S.sel ? ib("tree-structure", "Chain", "C", `data-tool="chain" aria-pressed="${S.chain}"`) : "");
      S.root.querySelector(".v-menu")?.remove();
      if (S.menu) box.insertAdjacentHTML("afterend", `<div class="v-menu" role="menu" aria-label="Filter by theme"><button type="button" role="menuitemradio" class="all" data-filter="" aria-checked="${!S.filter}">All themes</button>${THEMES.map(t => `<button type="button" role="menuitemradio" data-filter="${t.id}" aria-checked="${S.filter === t.id}">${g("theme")}<span>${esc(t.name)}</span>${S.filter === t.id ? '<i class="ph ph-check chk" aria-hidden="true"></i>' : ""}</button>`).join("")}</div>`);
    },
    update(S) {
      timeline.tools(S);
      const R = related(S.sel, S.chain);
      S.root.querySelectorAll(".v-tl-item").forEach(el => {
        const id = el.dataset.id, t = theory(id), rel = !S.sel || R.theory.has(id), out = S.filter && !t.themes.includes(S.filter);
        el.setAttribute("aria-current", id === S.sel ? "true" : "false");
        el.dataset.mode = !S.sel ? "wrap" : rel ? "line" : "dot";
        el.toggleAttribute("data-unrel", (!!S.sel && !rel) || !!out);
      });
      timeline.links(S, R);
      clearTimeout(S.lt); S.lt = setTimeout(() => timeline.links(S, related(S.sel, S.chain)), 420);   // again once the pane has docked
    },
    links(S, R) {
      const svg = S.root.querySelector(".v-links"), tl = S.root.querySelector(".v-tl");
      if (!S.sel) { svg.innerHTML = ""; return; }
      const o = tl.getBoundingClientRect(), un = v => v / S.k;
      const at = id => { const dot = S.root.querySelector(`.v-tl-item[data-id="${id}"] .dot`), r = dot.getBoundingClientRect(), c = dot.closest(".v-tl-cell").getBoundingClientRect();
        return { x: un(r.left + r.width / 2 - o.left), y: un(r.top + r.height / 2 - o.top), top: un(c.top - o.top), bottom: un(c.bottom - o.top) }; };
      // Route along the lane edge next to the target, never through a label: down (or up) from the source's dot,
      // across on the target lane's edge, then into the target's dot from above (or below).
      const route = (a, b) => { const down = b.y > a.y, yb = down ? b.top + 3 : b.bottom - 3, end = down ? b.y - 7 : b.y + 7;
        return { d: `M${a.x} ${a.y + (down ? 6 : -6)} V${yb} H${b.x} V${end}`, head: down ? `M${b.x} ${b.y - 5} l-3.5 -5 h7 z` : `M${b.x} ${b.y + 5} l-3.5 5 h7 z` }; };
      let out = "";
      for (const t of THEORIES) for (const f of t.follows) {
        if (!R.theory.has(t.id) || !R.theory.has(f) || !(t.id === S.sel || f === S.sel || S.chain)) continue;
        const r = route(at(f), at(t.id));
        out += `<path d="${r.d}"/><path class="head" d="${r.head}"/>`;
      }
      const s = theory(S.sel);
      for (const rv of s.rivals) out += `<path class="rival" d="${route(at(S.sel), at(rv)).d}"/>`;
      svg.innerHTML = out;
    },
    click(S, el) {
      const tool = el.closest("[data-tool]"), fl = el.closest("[data-filter]");
      if (tool?.dataset.tool === "filter") { S.menu = !S.menu; return true; }
      if (tool?.dataset.tool === "chain") { S.chain = !S.chain; return true; }
      if (fl) { S.filter = fl.dataset.filter || null; S.menu = false; return true; }
      if (S.menu) { S.menu = false; return true; }
      const item = el.closest("[data-id]");
      if (item) { S.sel = S.sel === item.dataset.id ? null : item.dataset.id; if (!S.sel) S.chain = false; return true; }
    },
  };

  const VIEWS = { columns, atlas, timeline };
  const PANE_W = { atlas: 940, timeline: 560 };

  /* ── Mount ────────────────────────────────────────────────────────────── */
  const mount = host => {
    const cfg = JSON.parse(host.dataset.v11 || "{}");
    host.innerHTML = `<div class="v-fit"><div class="v11 ctl" tabindex="-1"></div></div>`;
    const fit = host.firstElementChild, root = fit.firstElementChild;
    const S = { root, k: 1, view: cfg.view || "columns", sel: cfg.sel || null, size: cfg.size || "placed", labels: cfg.labels || "hover" };
    root.dataset.dim = cfg.dim || "fade";
    host.v11 = S;
    const build = () => {
      const V = VIEWS[S.view]; S.paneW = PANE_W[S.view] || 0;
      root.dataset.view = S.view; root.style.setProperty("--pane-w-open", `${S.paneW}px`);
      root.innerHTML = V.html(S) + (S.view === "columns" ? "" : `<aside class="v-pane" aria-label="Object pane"></aside>`) + switcher(S.view) + composer;
      V.init(S); S.refresh();
    };
    S.refresh = () => {
      const V = VIEWS[S.view];
      root.toggleAttribute("data-open", !!S.sel);
      root.style.setProperty("--pane-w", S.sel && S.paneW ? `${S.paneW}px` : "0px");
      const pane = root.querySelector(".v-pane");
      if (pane) { if (S.sel && pane.dataset.k !== S.sel) { pane.innerHTML = paneHTML(S.sel); pane.dataset.k = S.sel; } if (!S.sel) pane.dataset.k = ""; }
      V.update(S);
    };
    S.set = patch => { Object.assign(S, patch); if ("dim" in patch) root.dataset.dim = patch.dim; if ("size" in patch || "view" in patch) build(); else S.refresh(); };
    root.addEventListener("click", e => {
      const el = e.target;
      const vb = el.closest(".v-switch [data-view]");
      if (vb) { if (vb.getAttribute("aria-disabled") !== "true" && vb.dataset.view !== S.view) { S.view = vb.dataset.view; S.sel = null; build(); } return; }
      if (el.closest("[data-close]")) { S.sel = null; S.refresh(); return; }
      if (VIEWS[S.view].click(S, el)) S.refresh();
    });
    root.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      if (S.menu) { S.menu = false; S.refresh(); e.stopPropagation(); return; }
      if (S.sel) { S.sel = null; S.refresh(); e.stopPropagation(); }
    });
    new ResizeObserver(() => { S.k = fit.clientWidth / 1360; root.style.setProperty("--k", S.k); }).observe(fit);
    S.k = fit.clientWidth / 1360 || 1; root.style.setProperty("--k", S.k);
    build();
  };

  /* ── Tooltips: name, then the key in mono; after 500ms, instant for 300ms after one closes ── */
  let tip, timer, warmUntil = 0;
  const hideTip = () => { clearTimeout(timer); if (tip) { tip.remove(); tip = null; warmUntil = Date.now() + 300; } };
  const showTip = el => {
    hideTip();
    const go = () => {
      const r = el.getBoundingClientRect();
      tip = document.createElement("div"); tip.className = "ctl-tip v-tip"; tip.setAttribute("role", "tooltip");
      tip.innerHTML = `<span>${esc(el.dataset.tip)}</span>${el.dataset.key ? `<kbd>${esc(el.dataset.key)}</kbd>` : ""}`;
      document.body.append(tip);
      const up = !!el.closest(".v-switch, .v-composer");
      const left = Math.max(8, Math.min(innerWidth - tip.offsetWidth - 8, r.left + r.width / 2 - tip.offsetWidth / 2));
      tip.style.left = `${left}px`; tip.style.top = `${up ? r.top - tip.offsetHeight - 6 : r.bottom + 6}px`;
    };
    if (Date.now() < warmUntil) go(); else timer = setTimeout(go, 500);
  };
  document.addEventListener("pointerover", e => { const el = e.target.closest(".v11 [data-tip]"); if (el) showTip(el); });
  document.addEventListener("pointerout", e => { if (e.target.closest(".v11 [data-tip]")) hideTip(); });
  document.addEventListener("focusin", e => { const el = e.target.closest(".v11 [data-tip]"); if (el && el.matches(":focus-visible")) showTip(el); });
  document.addEventListener("focusout", hideTip);
  document.addEventListener("scroll", hideTip, true);

  window.V11 = { mount };
  const start = () => document.querySelectorAll("[data-v11]").forEach(mount);
  if (document.fonts?.ready) document.fonts.ready.then(start); else start();
})();
