// Grammar 06b: confidence. Eight encodings of a 1–5 stance, each drawn small (beside a name) and large (the full view's setter).
// Rows, cards and peeks reuse 06's object classes (objects.css is a snapshot); only the confidence slot is new.
(() => {
  /* ═══ Theories (from 06, with a stance log each) ═══════════════════════════════ */
  const TODAY = new Date(2026, 10, 4), START = new Date(2026, 4, 1);
  const day = s => s === "Today" ? TODAY : new Date(`${s} 2026`);
  const T = {
    t6: { name: "Code review becomes the bottleneck of shipping", ev: "+5 −0", by: 2027, hist: [["12 Jun", 3], ["2 Nov", 4]],
      note: "Agents write more than people can read. Review, not writing, sets the pace." },
    t4: { name: "Agents keep context across months, not sessions", ev: "+1 −1", by: 2027, challenge: true, hist: [["5 May", 3], ["1 Sep", 4]] },
    t1: { name: "Tokens become nearly free for routine work", ev: "+2 −1", by: 2028, hist: [["3 Jul", 2], ["20 Sep", 3]],
      note: "Small models keep getting cheaper faster than demand grows." },
    t3: { name: "Agents run continuously in the background by default", ev: "+0 −0", by: 2029, hist: [["9 Sep", 3]] },
    t2: { name: "Frontier intelligence stays scarce and expensive", ev: "+2 −1", by: 2029, hist: [["1 Jun", 4], ["15 Aug", 3], ["3 Nov", 2]],
      note: "The best models keep needing more compute than anyone can amortise." },
    t11: { name: "Local models absorb most everyday agent work", ev: "+1 −0", by: 2028, draft: true, hist: [] },
  };
  for (const [id, t] of Object.entries(T)) { t.id = id; t.c = t.hist.length ? t.hist.at(-1)[1] : 0; }
  const WORD = ["Not set", "Doubtful", "Unlikely", "Possible", "Likely", "Near certain"];
  // A change counts as news for 14 days: "rose" or "fell" from the step before
  const trend = t => {
    if (t.hist.length < 2) return null;
    const [[d, c], [, p]] = [t.hist.at(-1), t.hist.at(-2)];
    return (TODAY - day(d)) / 864e5 <= 14 ? { dir: c > p ? "rose" : "fell", from: p, on: d } : null;
  };
  const label = t => t.c ? `Confidence ${t.c} of 5, ${WORD[t.c].toLowerCase()}${trend(t) ? `, ${trend(t).dir} from ${trend(t).from}` : ""}` : "No confidence set";
  const ico = (n, cls = "") => `<i class="ph ph-${n}${cls ? ` ${cls}` : ""}" aria-hidden="true"></i>`;
  const svg = (w, h, body, cls = "") => `<svg class="cf-svg${cls ? ` ${cls}` : ""}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${body}</svg>`;
  const on = (i, c, pv) => pv ? (i <= pv ? (i <= c ? "on" : "pv") : (i <= c ? "dim" : "off")) : (i <= c ? "on" : "off");
  const tone = t => trend(t) ? (trend(t).dir === "rose" ? "up" : "down") : "";

  /* ═══ Arcs for the ring ═══ */
  const arc = (cx, cy, r, a0, a1) => { const p = a => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  const ring = (size, sw, gap, c, pv, extra = "") => { const r = (size - sw) / 2, m = size / 2;
    return [1, 2, 3, 4, 5].map(i => `<path class="${on(i, c, pv)}" data-v="${i}" d="${arc(m, m, r, (i - 1) * 72 + gap / 2, i * 72 - gap / 2)}" stroke-width="${sw}" fill="none" stroke-linecap="butt"/>`).join("") + extra; };

  /* ═══ The step line: a stance log drawn over time (H's mark, and every large view's history) ═══ */
  // own: the line spans from the first stance to today (small marks); otherwise May to today (the large chart, which has an axis)
  const steps = (hist, w, h, { pad = 1, lo = 1, recentCls = "", own = false } = {}) => {
    if (!hist.length) return "";
    const from = own ? day(hist[0][0]) : START, span = Math.max(TODAY - from, 864e5), X = d => pad + (w - 2 * pad) * Math.max(0, day(d) - from) / span;
    const Y = c => pad + (h - 2 * pad) * (5 - c) / (5 - lo);
    let d = `M${X(hist[0][0]).toFixed(1)} ${Y(hist[0][1]).toFixed(1)}`;
    const last = hist.length - 1;
    for (let i = 1; i < (recentCls ? last : hist.length); i++) d += `H${X(hist[i][0]).toFixed(1)}V${Y(hist[i][1]).toFixed(1)}`;
    let tail = "";
    if (recentCls) { const x = X(hist[last][0]); d += `H${x.toFixed(1)}`; tail = `<path class="${recentCls}" d="M${x.toFixed(1)} ${Y(hist[last - 1][1]).toFixed(1)}V${Y(hist[last][1]).toFixed(1)}H${(w - pad).toFixed(1)}"/>`; }
    else d += `H${(w - pad).toFixed(1)}`;
    return `<path d="${d}"/>${tail}`;
  };

  // Faint lines at 5 and 1 so a step line has a scale
  const frame = (w, h) => `<line class="top" x1="0" x2="${w}" y1="0.5" y2="0.5"/><line class="top" x1="0" x2="${w}" y1="${h - 0.5}" y2="${h - 0.5}"/>`;

  /* ═══ The eight encodings ════════════════════════════════════════════════════
     small(t): the inline mark (≤ 16 tall). large(c, pv, t): the setter's face; every hit zone carries data-v. */
  const E = [
    { k: "A", name: "Ticks", idea: "Five vertical ticks, filled to the level. Your suggestion, and the one I'd ship.",
      small: t => svg(18, 10, [1, 2, 3, 4, 5].map(i => `<rect class="${i <= t.c ? "on" : "off"}" x="${(i - 1) * 4}" y="0" width="2" height="10" rx="1"/>`).join("")),
      large: (c, pv) => `<span class="cf-ticks">${[1, 2, 3, 4, 5].map(i => `<span class="hz" data-v="${i}"><i class="${on(i, c, pv)}"></i></span>`).join("")}</span>`,
      unset: "Five empty ticks: the column keeps its shape, and empty reads as not yet.",
      notes: [["Legibility", "Count is exact at 12px: five 2 × 10 ticks with 2px gaps (cap height, so they sit with the letters) resolve on any screen; 18 wide."], ["Scanning", "Down a list the filled ticks make a little bar chart: 2, 3 and 4 differ by a whole tick of ink."], ["Right of the name", "Fixed width, so the column's left edge is straight; tall enough to sit on the name's first line without looking like punctuation."], ["Without colour", "Filled versus empty is a lightness difference of ink against hairline; the row's aria-label reads \"Confidence 4 of 5, likely\"."], ["Setter", "The same five ticks at 4 × 22 with 28-tall hit zones. Point to preview, click or drag to set; arrows, Home, End or 1–5 on the keyboard."]] },
    { k: "B", name: "Signal bars", idea: "Rising bars, like signal strength: height and count both say how strong.",
      small: t => svg(19, 12, [1, 2, 3, 4, 5].map(i => { const h = 4 + 2 * (i - 1); return `<rect class="${i <= t.c ? "on" : "off"}" x="${(i - 1) * 4}" y="${12 - h}" width="3" height="${h}" rx="1"/>`; }).join("")),
      large: (c, pv) => `<span class="cf-bars">${[1, 2, 3, 4, 5].map(i => `<span class="hz" data-v="${i}"><i class="${on(i, c, pv)}" style="height:${8 + 4 * (i - 1)}px"></i></span>`).join("")}</span>`,
      unset: "Five empty bars.",
      notes: [["Legibility", "Clear at 12px; the staircase silhouette survives even when the empties are faint."], ["Scanning", "The tallest filled bar is the reading, so a list scans by height. Redundant height plus count helps at a glance."], ["Right of the name", "Bottom-aligned bars sit on the baseline like a word; at 19 wide it's the same footprint as ticks."], ["Without colour", "Count and height carry it. aria-label as A."], ["Setter", "Taller bars (8 to 24) on the same hit zones as A. Risk: reads as wifi or phone signal, so it may say \"connection\" before \"belief\"."]] },
    { k: "C", name: "Meter", idea: "One short track with a proportional fill. The quietest mark here.",
      small: t => svg(20, 12, `<rect class="off" x="0" y="4" width="20" height="4" rx="2"/>${t.c ? `<rect class="on" x="0" y="4" width="${4 * t.c}" height="4" rx="2"/>` : ""}`),
      large: (c, pv) => `<span class="cf-meter"><span class="track"><span class="fill${pv && pv !== c ? " ghost" : ""}" style="width:${(pv || c) * 20}%"></span>${pv && pv !== c && c ? `<span class="fill" style="width:${Math.min(c, pv) * 20}%"></span>` : ""}</span>${[1, 2, 3, 4, 5].map(i => `<span class="hz" data-v="${i}"></span>`).join("")}<span class="stops">${[1, 2, 3, 4, 5].map(i => `<i class="${i === (pv || c) ? "at" : ""}"></i>`).join("")}</span></span>`,
      unset: "An empty track.",
      notes: [["Legibility", "A 4px line is legible but its steps are not: 3 against 4 is a 4px difference with no notch to count."], ["Scanning", "Best for comparing magnitude down a list, worst for reading the exact step."], ["Right of the name", "Very light; at the end of a line it can read as a progress bar (\"how far along\") rather than a stance."], ["Without colour", "Length only. aria-label as A."], ["Setter", "A 180 track split into five hit zones, with five stop marks under it so the steps are visible at the large size."]] },
    { k: "D", name: "Ring", idea: "Five arc segments round a 14px ring, filled clockwise from the top.",
      small: t => svg(14, 14, ring(14, 2.5, 22, t.c), "ring"),
      large: (c, pv) => `<span class="cf-ring">${svg(48, 48, ring(48, 6, 10, c, pv), "ring")}<span class="n">${pv || c || "–"}</span></span>`,
      unset: "An empty ring.",
      notes: [["Legibility", "At 14px the five segments blur into a pie; you read \"about three quarters\" more than \"4\"."], ["Scanning", "Rings down a list read as a column of loading spinners or progress charts."], ["Right of the name", "Compact and centred on the line."], ["Without colour", "Filled arcs against hairline arcs. aria-label as A."], ["Setter", "A 48 ring with the number in the middle; click a segment, or use the keys. Segments are short targets, so the whole ring also takes arrows."]] },
    { k: "E", name: "Numeral and arrow", idea: "The number itself, with a trend arrow only when it just rose or fell.",
      small: t => t.c ? `<span class="cf-num"><b>${t.c}</b><span>/5</span>${trend(t) ? ico(trend(t).dir === "rose" ? "trend-up" : "trend-down", tone(t)) : ""}</span>` : `<span class="cf-num"><span>–</span></span>`,
      large: (c, pv) => `<span class="cf-seg">${[1, 2, 3, 4, 5].map(i => `<span class="hz${i === c ? " sel" : ""}${i === pv && i !== c ? " pv" : ""}" data-v="${i}">${i}</span>`).join("")}</span>`,
      unset: "An en dash.",
      notes: [["Legibility", "The most exact and the most concise: \"4/5\" is 22px of 12px type, and the arrow adds 12 when there's news."], ["Scanning", "You read numbers, you don't see them: 3 and 4 look alike down a column, so the list doesn't sort itself by eye."], ["Right of the name", "Sits on the text baseline naturally; it's just more text at the end of the line, which is calm but adds no shape."], ["Without colour", "The number carries it; the arrow's direction carries the trend (colour only doubles it). aria-label adds \"rose from 3\"."], ["Setter", "A five-step segmented control (05's recipe), one number per segment."]] },
    { k: "F", name: "Word", idea: "A plain word for the stance: Doubtful, Unlikely, Possible, Likely, Near certain.",
      small: t => t.draft ? `<span class="cf-word">Draft</span>` : `<span class="cf-word">${WORD[t.c]}</span>`,
      large: (c, pv) => `<span class="cf-ladder">${[5, 4, 3, 2, 1].map(i => `<span class="hz${i === c ? " sel" : ""}${i === pv && i !== c ? " pv" : ""}" data-v="${i}">${i === c ? ico("check") : "<i></i>"}${WORD[i]}</span>`).join("")}</span>`,
      unset: "The word \"Draft\": the slot already holds the theory's key value.",
      notes: [["Legibility", "No decoding at all. You read what you believe."], ["Scanning", "Words are ragged (\"Likely\" against \"Near certain\") and need reading one by one."], ["Right of the name", "Takes 30 to 70px from the name in a 296 column and its left edge is ragged."], ["Without colour", "Pure text, the best for screen readers and print."], ["Setter", "A vertical ladder with 5 at the top, like the Timeline's confidence axis. The words make you commit to a meaning, not a number."]] },
    { k: "G", name: "Ticks with the change", idea: "A's ticks, with the top filled tick coloured for two weeks after a change: accent if it rose, red if it fell.",
      small: t => { const tr = trend(t); return svg(18, 10, [1, 2, 3, 4, 5].map(i => `<rect class="${i <= t.c ? (tr && i === t.c ? `on ${tone(t)}` : "on") : "off"}" x="${(i - 1) * 4}" y="0" width="2" height="10" rx="1"/>`).join("")); },
      large: (c, pv, t) => `<span class="cf-ticks">${[1, 2, 3, 4, 5].map(i => `<span class="hz" data-v="${i}"><i class="${on(i, c, pv)}${!pv && t && trend(t) && c === t.c && i === c ? ` ${tone(t)}` : ""}"></i></span>`).join("")}</span>`,
      unset: "Five empty ticks.",
      notes: [["Legibility", "As A. The coloured tick is the same size, so the count never changes."], ["Scanning", "A list shows what moved this fortnight without a second mark; most rows stay plain ink."], ["Right of the name", "As A, with no extra width for the trend."], ["Without colour", "The trend itself is colour-only on the preview; the peek and full view say \"Rose from 3\" in words, and aria-label says it too."], ["Setter", "As A; the coloured tick stays until you set a new value."]] },
    { k: "H", name: "Stance line", idea: "A 28px step line of the stance log, from the first stance to today: level, trend and history in one mark.",
      small: t => t.hist.length ? svg(28, 12, `${frame(28, 12)}${steps(t.hist, 28, 12, { pad: 1, own: true, recentCls: trend(t) ? tone(t) : "" })}`, "line") : svg(28, 12, frame(28, 12), "line"),
      large: (c, pv, t) => chart(t, c, pv),
      unset: "An empty frame: the two hairlines and no line.",
      notes: [["Legibility", "At 12 tall each step is 2.5px: you see up and down, not 3 versus 4."], ["Scanning", "Great for \"what moved\", weak for \"which do I believe most\". Each line spans its own history, so two rows' time scales differ."], ["Right of the name", "28 wide is the widest mark here and it reads as a chart, which is a lot for a list row."], ["Without colour", "Shape carries direction; faint hairlines mark 5 and 1. aria-label as A."], ["Setter", "The full view becomes the history chart: levels 1–5 run down the side, and pointing at a level on the \"Now\" edge previews the new step."]] },
  ];

  /* ═══ The large history: a step chart whose right edge is the setter (H), and the compact history line (A–G) ═══ */
  function chart(t, c, pv) {
    const w = 260, h = 88, hist = t._hist || t.hist, levels = [5, 4, 3, 2, 1];
    const grid = levels.map(i => `<line class="grid" x1="0" x2="${w}" y1="${6 + (5 - i) * 19}" y2="${6 + (5 - i) * 19}"/>`).join("");
    const line = hist.length ? `<g class="stance" transform="translate(0 6)">${steps(hist, w, 76, { pad: 0 })}</g>` : "";
    const ghost = pv && pv !== c ? `<path class="ghost" d="M${w - 18} ${6 + (5 - (c || pv)) * 19}V${6 + (5 - pv) * 19}H${w}"/>` : "";
    return `<span class="cf-chart"><span class="ax">${levels.map(i => `<span>${i}</span>`).join("")}</span>${svg(w, h, grid + line + ghost, "chart")}<span class="now">${levels.map(i => `<span class="hz${i === (pv || c) ? " at" : ""}" data-v="${i}"></span>`).join("")}</span><span class="dates"><span>May</span><span>Now</span></span></span>`;
  }
  const histText = (t) => {
    const tr = trend(t), h = t._hist || t.hist;
    if (!h.length) return `<span class="cf-htext">No stance yet. Setting one accepts the draft.</span>`;
    const spark = svg(56, 16, `${frame(56, 16)}${steps(h, 56, 16, { pad: 1, own: true, recentCls: tr ? (tr.dir === "rose" ? "up" : "down") : "" })}`, "line");
    const words = tr ? `<span class="cf-htext ${tr.dir === "rose" ? "up" : "down"}">${ico(tr.dir === "rose" ? "trend-up" : "trend-down")}${tr.dir === "rose" ? "Rose" : "Fell"} from ${tr.from}, ${tr.on === "Today" ? "today" : tr.on}</span>`
      : `<span class="cf-htext">Since ${h.at(-1)[0]}</span>`;
    return `<span class="cf-hist">${spark}${words}</span>`;
  };

  /* ═══ Object markup (06's classes; the confidence slot is new) ═══ */
  const tile = (t) => `<span class="g${t.draft ? " draft" : ""}" data-type="theory"><i class="ph ph-target" aria-hidden="true"></i></span>`;
  // No challenge dot on previews (decided 4 Nov); how a challenge shows is open in 06.
  const mark = (e, t) => `<span class="cf-mark" data-enc="${e.k}" role="img" aria-label="${label(t)}" title="${label(t)}">${e.small(t)}</span>`;
  // pos "right": [tile][name][confidence] on the first line, no second line. "below": today's key line.
  const preview = (e, t, as, pos) => {
    const tail = pos === "right" ? `<span class="cf-slot">${mark(e, t)}</span>`
      : `<span class="kv">${t.draft ? (e.k === "F" ? mark(e, t) : `<span>Draft</span>`) : mark(e, t)}<span class="when">By ${t.by}</span></span>`;
    return `<div class="ob-${as} cf-${pos}${t.draft ? " draft" : ""}"><span class="g${t.draft ? " draft" : ""}" data-type="theory"><i class="ph ph-target" aria-hidden="true"></i></span><button type="button" class="nm">${t.name}</button>${tail}</div>`;
  };
  const list = (e, pos, ids = ["t6", "t4", "t1", "t3", "t2", "t11"]) => `<div class="cf-list">${ids.map(id => preview(e, T[id], "row", pos)).join("")}</div>`;
  const cards = (e, pos) => `<div class="cf-cards">${["t6", "t2"].map(id => preview(e, T[id], "card", pos)).join("")}</div>`;
  const trendMeta = t => { const tr = trend(t); return tr ? `<span class="cf-htext ${tr.dir === "rose" ? "up" : "down"}">${ico(tr.dir === "rose" ? "trend-up" : "trend-down")}${tr.dir === "rose" ? "Rose" : "Fell"} from ${tr.from}</span>` : ""; };
  const peekHead = (e, t, pos) => `<div class="ob-peek static" role="dialog" aria-label="${t.name}"><div class="ob-hang">${tile(t)}<div class="ob-col">
      <div class="cf-pkname cf-${pos}"><div class="ob-pk-name">${t.name}</div>${pos === "right" ? mark(e, t) : ""}</div>
      <div class="ob-meta">${pos === "below" ? `<span>${mark(e, t)}</span>` : ""}${trendMeta(t)}<span class="ob-bal">${t.ev}</span><span>By ${t.by}</span></div>
      ${t.note ? `<p class="ob-prose clamp">${t.note}</p>` : ""}</div></div>
      <div class="ob-pk-foot"><button type="button" class="nv-btn secondary">Open${ico("arrow-right")}</button></div></div>`;
  const peekRel = (e, pos) => `<div class="ob-peek static" role="dialog" aria-label="Cost of intelligence"><div class="ob-hang"><span class="g" data-type="theme"><i class="ph ph-binoculars" aria-hidden="true"></i></span><div class="ob-col">
      <div class="ob-pk-name">Cost of intelligence</div><div class="ob-meta"><span>4 theories</span><span>23 signals</span></div></div></div>
      <hr class="ob-div"><div class="ob-pk-rel"><div class="ob-label">Theories<span class="ob-n">4</span></div><div class="ob-pk-list">${["t1", "t3", "t2", "t11"].map(id => preview(e, T[id], "row", pos)).join("")}</div></div>
      <div class="ob-pk-foot"><button type="button" class="nv-btn secondary">Open${ico("arrow-right")}</button></div></div>`;

  /* ═══ The full view head with the setter ═══ */
  const setter = (e, t) => {
    const vert = e.k === "F" || e.k === "H";
    return `<span class="cf-set" data-enc="${e.k}" data-t="${t.id}" role="slider" tabindex="0" aria-label="Confidence" aria-valuemin="1" aria-valuemax="5"${vert ? ' aria-orientation="vertical"' : ""} ${aria(t.c)}>${e.large(t.c, 0, t)}</span>`;
  };
  const aria = c => c ? `aria-valuenow="${c}" aria-valuetext="${c} of 5, ${WORD[c]}"` : `aria-valuetext="Not set"`;
  const valText = (e, c) => e.k === "F" || e.k === "E" || e.k === "D" ? "" : `<span class="cf-val">${c ? `<b>${c}</b> of 5` : "Not set"}</span>`;
  const fullHead = (e, t) => `<div class="cf-full${t.draft ? " draft" : ""}" data-enc="${e.k}" data-t="${t.id}"><div class="ob-hang ob-head">${tile(t)}<div class="ob-col">
      <h3 class="ob-title">${t.name}</h3>
      <div class="cf-setline cf-${e.k}"><span class="cf-lab">Confidence</span><span class="cf-ctl">${setter(e, t)}${valText(e, t.c)}</span>${e.k === "H" ? "" : `<span class="cf-hwrap">${histText(t)}</span>`}</div>
      ${t.draft ? "" : `<div class="ob-meta"><span class="ob-bal">${t.ev}</span><span>By ${t.by}</span></div>`}</div></div></div>`;

  /* ═══ Setter behaviour: one controller for all eight faces ═══ */
  const state = new Map();   // key enc+theory → { c, hist }
  const key = el => `${el.dataset.enc}:${el.dataset.t}`;
  const get = el => { const k = key(el); if (!state.has(k)) { const t = T[el.dataset.t]; state.set(k, { c: t.c, hist: t.hist.slice() }); } return state.get(k); };
  // Repaint only when what's shown changes, so the node under the pointer stays put while you hover
  const paint = (el, pv = 0, force = false) => {
    const sig = `${get(el).c}:${pv}`; if (!force && el._sig === sig) return; el._sig = sig;
    const e = E.find(x => x.k === el.dataset.enc), s = get(el), t = { ...T[el.dataset.t], c: s.c, _hist: s.hist, hist: s.hist };
    el.innerHTML = e.large(s.c, pv, t);
    el.setAttribute("aria-valuetext", s.c ? `${s.c} of 5, ${WORD[s.c]}` : "Not set"); if (s.c) el.setAttribute("aria-valuenow", s.c); else el.removeAttribute("aria-valuenow");
    const full = el.closest(".cf-full"), v = full.querySelector(".cf-val"), hw = full.querySelector(".cf-hwrap");
    if (v) v.innerHTML = (pv || s.c) ? `<b>${pv || s.c}</b> of 5` : "Not set";
    if (hw) hw.innerHTML = histText(t);
  };
  const set = (el, c) => {
    c = Math.max(1, Math.min(5, c)); const s = get(el); if (c === s.c) return;
    const h = s.hist.filter(([d]) => d !== "Today");
    const base = h.length ? h.at(-1)[1] : 0;
    s.hist = c === base ? h : [...h, ["Today", c]]; s.c = c;
    paint(el, 0, true);
  };
  const zone = (ev) => { const z = ev.target.closest?.("[data-v]"); return z && z.closest(".cf-set") ? z : null; };
  document.addEventListener("pointerover", ev => { const z = zone(ev); if (z) paint(z.closest(".cf-set"), +z.dataset.v); });
  document.addEventListener("pointerout", ev => { const el = ev.target.closest?.(".cf-set"); if (el && !el.contains(ev.relatedTarget)) paint(el); });
  let drag = null;
  document.addEventListener("pointerdown", ev => { const z = zone(ev); if (!z) return; drag = z.closest(".cf-set"); set(drag, +z.dataset.v); drag.focus({ preventScroll: true }); ev.preventDefault(); });
  document.addEventListener("pointermove", ev => { if (!drag) return; const z = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("[data-v]"); if (z && drag.contains(z)) { set(drag, +z.dataset.v); paint(drag, +z.dataset.v); } });
  document.addEventListener("pointerup", () => { if (drag) { const d = drag; drag = null; paint(d); } });
  document.addEventListener("keydown", ev => {
    const el = ev.target.closest?.(".cf-set"); if (!el) return;
    const c = get(el).c, k = ev.key;
    const n = k === "ArrowRight" || k === "ArrowUp" ? (c || 0) + 1 : k === "ArrowLeft" || k === "ArrowDown" ? (c || 2) - 1 : k === "Home" ? 1 : k === "End" ? 5 : /^[1-5]$/.test(k) ? +k : 0;
    if (n) { ev.preventDefault(); set(el, n); }
  });

  /* ═══ Page assembly ═══ */
  const cell = (k, html) => `<div class="cf-cell"><div class="cf-k">${k}</div>${html}</div>`;
  const block = (e, rec) => `<section class="jig-section wide cf-enc" id="enc-${e.k}">
    <h2><span class="cf-letter">${e.k}</span>${e.name}${rec ? '<span class="cf-rec">Recommended</span>' : ""}</h2><p>${e.idea}</p>
    <div class="jig-option cf-opt" data-option="${e.k} ${e.name}" data-for="small"><div class="jig-label">Small: in a row, a card and a peek, right of the name</div>
      <div class="cf-small ob-scope ctl" data-align="c">${cell("List rows", list(e, "right"))}${cell("Cards", cards(e, "right"))}${cell("Peek head (just rose)", peekHead(e, T.t6, "right"))}${cell("Peek relation rows (one fell, one draft)", peekRel(e, "right"))}</div></div>
    <div class="cf-lower">
      <div class="jig-option cf-opt" data-option="${e.k} ${e.name}" data-for="large"><div class="jig-label">Large: the full view's setter, with its history</div>
        <div class="cf-fulls ob-scope ctl" data-align="c">${fullHead(e, T.t6)}${fullHead(e, T.t2)}${fullHead(e, T.t11)}</div></div>
      <div class="cf-notes"><dl>${e.notes.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}<dt>Not set</dt><dd>${e.unset}</dd></dl></div>
    </div></section>`;
  const host = document.getElementById("encodings");
  host.outerHTML = E.map(e => block(e, e.k === "A")).join("");

  // Today: the five dashes on the line below (06's current mark, copied)
  const today = { k: "0", small: t => t.c ? `<span class="cf-dash">${[1, 2, 3, 4, 5].map(i => `<i${i <= t.c ? " data-on" : ""}></i>`).join("")}</span>` : "" };
  document.getElementById("today").innerHTML = cell("List rows", list(today, "below")) + cell("Card", cards(today, "below")) + cell("Peek head", peekHead(today, T.t6, "below"));

  // Position: follows the small pick
  const posRender = () => {
    const pick = (window.JigPick && window.JigPick("small")) || "A Ticks";
    const e = E.find(x => pick.startsWith(x.k + " ")) || E[0];
    for (const h of document.querySelectorAll("[data-pos]")) {
      const p = h.dataset.pos;
      h.innerHTML = cell("List rows", list(e, p, ["t6", "t4", "t1", "t2", "t11"])) + cell("Card", cards(e, p)) + cell("Peek relation rows", peekRel(e, p));
    }
    document.querySelectorAll("[data-pos-enc]").forEach(s => s.textContent = `${e.k} ${e.name}`);
  };
  window.CfPos = posRender;
  posRender();
  document.addEventListener("jig:change", ev => { if (ev.detail.id === "small") posRender(); summary(); });
  const summary = () => document.querySelectorAll("[data-pick]").forEach(li => { const v = window.JigPick?.(li.dataset.pick); li.querySelector(".pick").innerHTML = v ? `Current pick: <b>${v}</b>` : "No pick yet"; });
  // choose.js runs after this file; repaint once every pick is loaded
  document.addEventListener("DOMContentLoaded", () => { posRender(); summary(); });
})();
