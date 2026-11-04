// Grammar 07: motion between levels. Every move here is interruptible: it starts from what is on screen now, and a new move
// cancels the running one (nothing queues). Durations come from the decided tokens (05: 90 / 160, 11: the 380 pane spring),
// multiplied by the page's slow-motion factor. Reduced motion swaps every scale and travel for a cross-fade in place.
(() => {
  const SPRING = "cubic-bezier(0.16, 1, 0.3, 1)", OUT = "cubic-bezier(0.2, 0.8, 0.2, 1)";
  const MS = { hover: 90, float: 160, surface: 260, travel: 380 };
  const slow = () => +(document.body.dataset.slow || 1);
  const t = k => MS[k] * slow();
  const reduced = () => document.body.dataset.reduce === "true" || matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Window-local, unzoomed coordinates (the window is scaled with CSS zoom to fit the page) */
  const winOf = el => el.closest(".r7-win");
  const zoomOf = w => (w.getBoundingClientRect().width / w.offsetWidth) || 1;
  const local = (w, el) => { const b = w.getBoundingClientRect(), k = zoomOf(w), r = el.getBoundingClientRect();
    return { x: (r.left - b.left) / k, y: (r.top - b.top) / k, w: r.width / k, h: r.height / k }; };
  const fx = w => w.querySelector(".r7-fx");
  const place = (el, r) => Object.assign(el.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px` });

  /* ── Tethered surfaces: grow from the trigger, leave toward it ── */
  // origin: the trigger tile's centre, in the peek's own coordinates (it may lie outside the peek: the card emanates from the tile)
  const growIn = (el, origin) => {
    el._a?.cancel();
    el.style.transformOrigin = `${origin.x}px ${origin.y}px`;
    el._a = reduced()
      ? el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: t("hover"), easing: "linear" })
      : el.animate([{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "none" }], { duration: t("float"), easing: SPRING });
  };
  // Leave in 90ms from wherever the entrance got to (read the live value, then cancel), shrinking a little toward the same origin
  const shrinkOut = (el, done) => {
    const cs = getComputedStyle(el), from = { opacity: cs.opacity, transform: cs.transform === "none" ? "none" : cs.transform };
    el._a?.cancel();
    el._a = el.animate([from, { opacity: 0, transform: reduced() ? from.transform : "scale(0.98)" }], { duration: t("hover"), easing: OUT, fill: "forwards" });
    el._a.onfinish = done;
    return el._a;
  };
  // Warm swap: the one card slides to its new trigger (FLIP from where it was) and its contents fade in. Never two cards.
  const slideTo = (el, from) => {
    el._a?.cancel();
    const dx = from.x - el.offsetLeft, dy = from.y - el.offsetTop;
    if (!reduced() && (dx || dy)) el._a = el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: t("float"), easing: SPRING });
    fadeKids(el, t("hover"));
  };
  const fadeKids = (el, d, delay = 0) => [...el.children].forEach(c => c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: d, delay, easing: "linear", fill: "backwards" }));

  /* ── Shared elements: a tile and a name travel from where they were to where they land ── */
  // Each window has at most one flight. land() ends it at once (reveals the real elements, removes the ghosts).
  const flights = new WeakMap();
  const land = w => { const f = flights.get(w); if (f) f.end(); flights.delete(w); };
  // What is in the air right now, as a source for the next move (so an interrupted move starts from the current on-screen value)
  const inflight = w => { const f = flights.get(w); if (!f) return null;
    const pick = g => g && g.isConnected ? { rect: local(w, g), bw: g.offsetWidth, scale: g.getBoundingClientRect().width / zoomOf(w) / g.offsetWidth, node: g.cloneNode(true) } : null;
    return { tile: pick(f.tileGhost), text: pick(f.textGhost) }; };

  const STYLE = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "color", "textWrap", "overflowWrap", "display", "webkitLineClamp", "webkitBoxOrient", "overflow", "whiteSpace", "textOverflow"];
  const textGhost = (src, r) => { const g = document.createElement("div"); g.className = "r7-ghost text"; g.textContent = src.textContent.trim();
    const cs = getComputedStyle(src); STYLE.forEach(p => g.style[p] = cs[p]); place(g, r); return g; };
  const tileGhost = (dst, r) => { const g = dst.cloneNode(true); g.classList.add("r7-ghost"); g.removeAttribute("id");
    const cs = getComputedStyle(dst), ci = dst.firstElementChild && getComputedStyle(dst.firstElementChild);
    Object.assign(g.style, { display: "grid", placeItems: "center", width: `${r.w}px`, height: `${r.h}px`, background: cs.backgroundColor, color: cs.color, borderRadius: cs.borderRadius, outline: cs.outline, outlineOffset: cs.outlineOffset, margin: 0 });
    if (ci) Object.assign(g.firstElementChild.style, { width: ci.width, height: ci.height, fontSize: ci.fontSize });
    place(g, r); g.style.height = `${r.h}px`; return g; };

  // travel(w, { from: { tile, text } (elements or in-flight records), to: { tile, text } (elements) })
  const travel = (w, from, to, { dur = t("travel"), onEnd } = {}) => {
    const prev = inflight(w); land(w);
    if (reduced()) return;   // nothing travels: callers fade in place
    const layer = fx(w), anims = [], ghosts = [], hidden = [];
    const src = k => prev?.[k] || (from[k] && from[k].isConnected ? { rect: local(w, from[k]), scale: 1, el: from[k] } : null);
    const hide = el => { el.style.opacity = "0"; hidden.push(el); };
    const f = { end: () => { anims.forEach(a => a.cancel()); ghosts.forEach(g => g.remove()); hidden.forEach(el => el.style.opacity = ""); } };
    // Tile: the destination tile, scaled down onto the source tile, grows into place
    const st = src("tile");
    if (st && to.tile) {
      const d = local(w, to.tile), g = tileGhost(to.tile, d); layer.append(g); ghosts.push(g); hide(to.tile); f.tileGhost = g;
      anims.push(g.animate([{ transform: `translate(${st.rect.x - d.x}px, ${st.rect.y - d.y}px) scale(${st.rect.w / d.w}, ${st.rect.h / d.h})` }, { transform: "none" }], { duration: dur, easing: SPRING }));
    }
    // Name: two ghosts on one path. The source wording (its size, its wrapping) fades out as the destination wording fades in.
    const sx = src("text");
    if (sx && to.text) {
      const d = local(w, to.text), dg = textGhost(to.text, d); hide(to.text); f.textGhost = dg;
      const sg = sx.node ? (() => { const c = sx.node; c.style.transform = ""; c.style.opacity = ""; place(c, { ...sx.rect, w: sx.bw }); return c; })() : textGhost(sx.el, sx.rect);
      const s0 = sx.scale || 1, fs = parseFloat(getComputedStyle(to.text).fontSize), ss = parseFloat(sg.style.fontSize) || fs, r = fs / ss;
      layer.append(sg, dg); ghosts.push(sg, dg);
      const T = (x, y, k) => `translate(${x}px, ${y}px) scale(${k})`;
      [sg, dg].forEach(g => g.style.transformOrigin = "0 0");
      anims.push(sg.animate([{ transform: T(0, 0, s0) }, { transform: T(d.x - sx.rect.x, d.y - sx.rect.y, r) }], { duration: dur, easing: SPRING }));
      anims.push(sg.animate([{ opacity: 1 }, { opacity: 0, offset: 0.5 }, { opacity: 0 }], { duration: dur, easing: "linear", fill: "forwards" }));
      anims.push(dg.animate([{ transform: T(sx.rect.x - d.x, sx.rect.y - d.y, s0 / r) }, { transform: "none" }], { duration: dur, easing: SPRING }));
      anims.push(dg.animate([{ opacity: 0 }, { opacity: 0, offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 1 }], { duration: dur, easing: "linear", fill: "both" }));
    }
    if (!anims.length) return;
    flights.set(w, f);
    Promise.all(anims.map(a => a.finished)).then(() => { if (flights.get(w) === f) { f.end(); flights.delete(w); onEnd?.(); } }, () => {});
  };

  /* ── Cross-fades: a snapshot of what was there leaves while the new content arrives ── */
  // snapshot(w, el): a static copy of el in the effects layer, clipped to clipEl, so the real one can be replaced underneath
  const snapshot = (w, el, clipEl = el, ground = false) => {
    const c = local(w, clipEl), r = local(w, el), box = document.createElement("div"); box.className = `r7-snap${ground ? " ground" : ""}`;
    Object.assign(box.style, { left: `${c.x}px`, top: `${c.y}px`, width: `${c.w}px`, height: `${c.h}px` });
    const copy = el.cloneNode(true); copy.removeAttribute("id"); copy.querySelectorAll("[id]").forEach(n => n.removeAttribute("id"));
    Object.assign(copy.style, { position: "absolute", left: `${r.x - c.x}px`, top: `${r.y - c.y}px`, width: `${r.w}px`, margin: 0 });
    box.append(copy); fx(w).append(box); return box;
  };
  const leave = (box, { dx = 0, dur = t("hover") } = {}) => {
    const a = box.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: reduced() || !dx ? "none" : `translateX(${dx}px)` }], { duration: dur, easing: OUT, fill: "forwards" });
    a.onfinish = () => box.remove(); return a;
  };
  const arrive = (el, { dx = 0, delay = 0, dur = t("float") } = {}) => {
    el.getAnimations?.().forEach(a => a.cancel());
    return reduced() || !dx
      ? el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, delay, easing: "linear", fill: "backwards" })
      : el.animate([{ opacity: 0, transform: `translateX(${dx}px)` }, { opacity: 1, transform: "none" }], { duration: t("surface"), delay, easing: SPRING, fill: "backwards" });
  };
  const clearSnaps = w => fx(w).querySelectorAll(".r7-snap").forEach(s => s.remove());

  /* ── The rail's current item slides to the new type (where you went, on the map) ── */
  const slideCurrent = (list, fromTop) => {
    const cur = list.querySelector('[aria-current="true"]'); if (!cur || fromTop == null || cur.offsetTop === fromTop || reduced()) return;
    const pill = document.createElement("span"); pill.className = "r7-pill";
    Object.assign(pill.style, { top: `${cur.offsetTop}px`, left: `${cur.offsetLeft}px`, width: `${cur.offsetWidth}px`, height: `${cur.offsetHeight}px` });
    list.prepend(pill); cur.classList.add("r7-pilled");
    pill.animate([{ transform: `translateY(${fromTop - cur.offsetTop}px)` }, { transform: "none" }], { duration: t("float"), easing: SPRING }).onfinish = () => { pill.remove(); cur.classList.remove("r7-pilled"); };
  };

  /* ── The docked pane pushes in from its edge on the spring and pushes the view; closing reverses ── */
  const pane = (slot, to, { onEnd } = {}) => {
    const from = parseFloat(getComputedStyle(slot).width) || 0;   // the live width, mid-flight if it is moving
    slot._a?.cancel(); slot.style.width = `${to}px`;
    if (reduced()) { const inner = slot.firstElementChild; if (to && inner) inner.animate([{ opacity: 0 }, { opacity: 1 }], { duration: t("float"), easing: "linear" }); onEnd?.(); return; }
    const open = to > from;
    slot._a = slot.animate([{ width: `${from}px` }, { width: `${to}px` }], { duration: open ? t("travel") : t("surface"), easing: open ? SPRING : OUT });
    slot._a.onfinish = () => onEnd?.();
  };

  /* ── Show origins: where each surface came from, and the hover grace area ── */
  const NS = "http://www.w3.org/2000/svg";
  const svgOf = w => { let s = fx(w).querySelector("svg.r7-orig"); if (!s) { s = document.createElementNS(NS, "svg"); s.setAttribute("class", "r7-orig"); s.setAttribute("aria-hidden", "true"); fx(w).append(s); } return s; };
  const on = () => document.body.dataset.origins === "true";
  const el = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
  const label = (g, x, y, text) => { const tx = el("text", { x, y, class: "lab" }); tx.textContent = text; g.append(tx); };
  // marks: [{ rect, label }, { origin: {x, y} }, { from: {x, y}, to: {x, y} }]; layer: "move" | "peek"
  const mark = (w, layer, marks) => {
    const s = svgOf(w); s.querySelector(`g[data-l="${layer}"]`)?.remove(); if (!on() || !marks) return;
    const g = el("g", { "data-l": layer }); s.append(g);
    for (const m of marks) {
      if (m.rect) { g.append(el("rect", { x: m.rect.x - 2, y: m.rect.y - 2, width: m.rect.w + 4, height: m.rect.h + 4, rx: 5, class: "box" })); if (m.label) label(g, m.rect.x, m.below ? m.rect.y + m.rect.h + 16 : m.rect.y - 7, m.label); }
      if (m.origin) { g.append(el("circle", { cx: m.origin.x, cy: m.origin.y, r: 7, class: "ring" }), el("circle", { cx: m.origin.x, cy: m.origin.y, r: 2.5, class: "dot" })); if (m.label) label(g, m.origin.x + 11, m.origin.y + 4, m.label); }
      if (m.from) { g.append(el("line", { x1: m.from.x, y1: m.from.y, x2: m.to.x, y2: m.to.y, class: "path", "marker-end": "url(#r7-arrow)" })); }
    }
    if (!s.querySelector("#r7-arrow")) s.insertAdjacentHTML("afterbegin", `<defs><marker id="r7-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="head"/></marker></defs>`);
  };
  const tri = (w, pts) => { const s = svgOf(w); let p = s.querySelector("polygon.tri");
    if (!on() || !pts) { p?.remove(); return; }
    if (!p) { p = el("polygon", { class: "tri" }); s.append(p); }
    p.setAttribute("points", pts.map(q => `${q.x},${q.y}`).join(" ")); };
  const centre = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

  window.R7M = { t, reduced, local, zoomOf, growIn, shrinkOut, slideTo, fadeKids, travel, land, inflight, snapshot, leave, arrive, clearSnaps, slideCurrent, pane, mark, tri, centre, SPRING, OUT };
})();
