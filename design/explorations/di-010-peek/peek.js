// DI-010: Row → Peek → Pane. Renderers for each rung, one peek controller, stage wiring.
// Data: DI-004's demo world (read-only, ../di-004-expansion/data.js) plus the seed fields it lacks
// (app/server/src/db/seed-world.ts: horizon, counts, pending, prototypes). Tripwire sentences and the prototype link are authored for this jig.
(() => {
  const W = window.WORLD;
  const P = window.ICON_PATHS;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ic = (n, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${P[n] || ""}</svg>`;
  const slot = (n, attrs = "") => `<span class="pk-i"${attrs}>${ic(n)}</span>`;

  // ── Data ──
  const THEMES = {
    review: { name: "Code review after agents", signals: 18, fresh: 2, theories: ["t4", "d3"], newest: ["s5", "s6"], prototypes: ["p2"] },
    interfaces: { name: "Novel agent interfaces", signals: 14, fresh: 1, theories: [], newest: ["s12", "x1", "x2"], prototypes: [], draftless: true },
    memory: { name: "Agent memory", signals: 31, fresh: 2, theories: ["t3"], newest: ["s7", "s8"], prototypes: ["p4"] },
    cost: { name: "Cost of intelligence", signals: 23, fresh: 4, theories: ["t1", "t2", "d1"], newest: ["s1", "s2", "s4"], prototypes: ["p1"] },
    funding: { name: "AI funding cycle", signals: 9, fresh: 1, theories: ["t6"], newest: ["s3"], prototypes: [] },
    identity: { name: "Agent identity", signals: 6, fresh: 1, theories: [], newest: ["s13"], prototypes: [], open: true },
  };
  const THEORIES = {
    t3: { claim: "Agents keep context across months, not sessions", conf: 4, horizon: 2027, sup: 8, und: 1, pending: 1, challenge: true,
      tripwire: "a major assistant withdraws memory over privacy", hits: ["s7"], top: { sup: ["s8"], und: ["s7"] }, themes: ["memory"],
      body: "Memory becomes a default feature: an agent knows my projects the way a colleague does." },
    t4: { claim: "Code review becomes the bottleneck, not writing", conf: 4, horizon: 2027, sup: 6, und: 1, pending: 0,
      tripwire: "review times fall while agent pull requests keep rising", hits: [], top: { sup: ["s5", "s6"], und: [] }, themes: ["review"],
      body: "Writing code is cheap; deciding whether to trust it is the scarce skill." },
    t1: { claim: "Tokens become nearly free for routine work", conf: 3, sup: 5, und: 2, pending: 2, horizon: 2028, themes: ["cost"] },
    t2: { claim: "Frontier intelligence stays scarce and expensive", conf: 2, sup: 3, und: 4, pending: 1, horizon: 2029, themes: ["cost"] },
    t6: { claim: "Labs face a funding correction before agents pay their way", conf: 2, sup: 2, und: 2, pending: 0, horizon: 2027, themes: ["funding"] },
    d1: { claim: "Local models absorb most everyday agent work", draft: true, sup: 3, und: 0, horizon: 2028, themes: ["cost"] },
    d3: { claim: "Review shifts from diffs to intent", draft: true, sup: 2, und: 0, horizon: 2028, themes: ["review"] },
  };
  const PROTOS = {
    p2: { name: "Intent review", status: "Building", theories: ["t4", "d3"], links: ["github.com/maggie/intent-review"], media: true },
    p1: { name: "Token budget meter", status: "Idea", theories: ["t1"], links: [] },
    p3: { name: "One-person app kit", status: "Built", theories: ["t5"], links: [] },
    p4: { name: "Memory inspector", status: "Shelved", theories: ["t3"], links: [] },
  };
  const state = { accepted: {}, dismissed: {}, filed: {} };
  // Authored for this jig: a voice-note signal with a long gist and a long note, to test wrapping and the 2-line clamp.
  const EXTRA = {
    L1: { id: "L1", gist: "Regulator wants assistants to show people everything they remember about them, and to delete any of it on request", source: "", themes: ["memory", "identity"], evidence: [{ theory: "t3", stance: "undermines" }], day: "Today", dump: "D2", sources: [],
      note: "The opposite pressure to my memory theory. If every remembered fact becomes a liability, products keep memory short and visible. Watch whether the big three ship a memory inspector before the deadline, or quietly turn memory off in Europe." },
  };
  const sig = id => EXTRA[id] || W.signal(id);
  const dumpOf = id => W.dump(id);
  const theory = id => THEORIES[id] || { claim: W.THEORIES[id]?.claim || id, conf: W.THEORIES[id]?.conf };
  const dumpKind = d => ({ voice: "Voice note", link: "Links", text: "Text note" }[d.kind]);
  const dumpGlyph = d => ({ voice: "waveform", link: "link", text: "text-align-left" }[d.kind]);
  // A signal's kind: link when it has a web source, otherwise the kind of dump it came from. The same glyph leads the
  // signal in its row, its peek header, its pane title and every reference line. Context (a column of signals) says it's a signal.
  const kindOf = s => s.sources?.length ? "link" : dumpOf(s.dump)?.kind === "voice" ? "voice" : "text";
  const KIND = { link: ["link", "Link signal"], voice: ["waveform", "Voice signal"], text: ["text-align-left", "Note signal"] };
  const sigGlyph = s => KIND[kindOf(s)][0];
  const kindSlot = (s, extra = "") => `<span class="pk-i" data-ink role="img" aria-label="${KIND[kindOf(s)][1]}" title="${KIND[kindOf(s)][1]}">${ic(sigGlyph(s))}${extra}</span>`;
  const layoutOf = st => st?.dataset.layout || document.body.dataset.sigLayout || "A";
  const fromLine = s => { const d = dumpOf(s.dump); return d ? `From ${dumpKind(d).toLowerCase()}, ${d.day} ${d.time}` : ""; };
  const conf = n => `<span class="pk-conf" aria-label="Confidence ${n} of 5">${[1, 2, 3, 4, 5].map(i => `<i${i <= n ? " data-on" : ""}></i>`).join("")}</span>`;
  const stanceOf = (s, tid) => s.evidence.find(e => e.theory === tid);
  const isSuggested = (s, e) => e.suggested && !state.accepted[`${s.id}:${e.theory}`];
  const evidenceLive = s => s.evidence.filter(e => !state.dismissed[`${s.id}:${e.theory}`]);

  // ── Rung 1: rows ──
  const R = {
    signal: (s, o = {}) => {
      const row = `<button type="button" class="pk-row" data-peek="signal:${s.id}"${o.eye ? ' data-pane-link' : ' aria-expanded="false" aria-haspopup="dialog"'}${o.eye ? ' style="padding-right:40px"' : ""}>
        ${kindSlot(s, s.fresh ? '<span class="pk-dot" aria-label="New"></span>' : "")}
        <span class="pk-row-text"><span>${esc(s.gist)}</span><span class="pk-2">${esc(s.source)}</span></span></button>`;
      if (!o.eye) return row;
      // Alternative trigger: the row opens the pane; a trailing eye opens the peek.
      return `<div style="position:relative">${row}<button type="button" class="pk-ib pk-peekbtn" data-peek="signal:${s.id}" aria-label="Peek" aria-haspopup="dialog" aria-expanded="false" title="Peek" style="position:absolute;right:6px;top:6px">${ic("eye")}</button></div>`;
    },
    dump: d => `<button type="button" class="pk-row" data-peek="dump:${d.id}" aria-expanded="false" aria-haspopup="dialog">
        <span class="pk-i" data-ink>${ic(dumpGlyph(d))}</span>
        <span class="pk-row-text"><span class="pk-clamp2">${esc(d.first)}</span><span class="pk-2">${esc(d.time)}</span></span>
        <span class="pk-row-end"><span class="pk-badge" title="Made ${d.produced.length}">made ${d.produced.length}</span></span></button>`,
    theme: id => { const t = THEMES[id]; return `<button type="button" class="pk-row" data-peek="theme:${id}" aria-expanded="false" aria-haspopup="dialog" style="grid-template-columns:minmax(0,1fr) auto;padding-left:10px">
        <span>${esc(t.name)}</span><span class="pk-row-end"><span class="pk-num">${t.signals}</span>${t.open ? '<span class="pk-ring" title="Not opened yet"></span>' : t.fresh ? '<span class="pk-dot" style="position:static;box-shadow:none" title="New signals"></span>' : ""}</span></button>`; },
    theory: id => { const t = theory(id); return `<button type="button" class="pk-card" data-peek="theory:${id}" aria-expanded="false" aria-haspopup="dialog"${t.draft ? " data-draft" : ""}>
        <span class="pk-strong">${esc(t.claim)}</span>
        <span class="pk-card-foot">${t.draft ? '<span class="pk-2">Draft</span>' : conf(t.conf)}<span class="pk-num">+${t.sup} −${t.und}</span>${t.challenge ? '<span class="pk-mark" style="margin:0" title="Challenged"></span>' : ""}${t.pending ? `<span class="pk-badge" title="${t.pending} pending">${t.pending}</span>` : ""}</span></button>`; },
    proto: id => { const p = PROTOS[id]; return `<button type="button" class="pk-row" data-peek="prototype:${id}" aria-expanded="false" aria-haspopup="dialog">
        <span class="pk-i" data-ink>${ic("pencil-ruler")}</span><span class="pk-row-text"><span>${esc(p.name)}</span></span><span class="pk-row-end"><span class="pk-num">${p.status}</span></span></button>`; },
  };

  // ── Rung 2: peeks ──
  // Each returns { kind, glyph, label, body, foot?, pane? }. Links inside use data-peek and replace the peek.
  const sigLine = (s, extra = "") => `<button type="button" class="pk-refline pk-line" data-peek="signal:${s.id}"><span class="pk-i">${ic(sigGlyph(s))}</span><span class="pk-line-text">${esc(s.gist)}${extra}</span></button>`;
  const theoryLine = (tid, stanceWord) => { const t = theory(tid); return `<button type="button" class="pk-refline pk-line" data-peek="theory:${tid}"><span class="pk-i">${ic(stanceWord === "Undermines" ? "arrow-down" : stanceWord === "Supports" ? "arrow-up" : "target")}</span><span class="pk-line-text">${stanceWord ? `<span class="pk-2">${stanceWord} </span>` : ""}${esc(t.claim)}</span></button>`; };
  const themeLine = id => `<button type="button" class="pk-refline pk-line" data-peek="theme:${id}"><span class="pk-i">${ic("binoculars")}</span><span class="pk-line-text">${esc(THEMES[id]?.name || W.THEMES[id])}</span></button>`;

  // Connected objects for a signal, rendered once and arranged by each composition.
  function sigConn(s, { peek = false, pane = false } = {}) {
    const d = dumpOf(s.dump), ev = evidenceLive(s);
    const themes = [...s.themes, ...(state.filed[s.id] || [])];
    const themeName = t => THEMES[t]?.name || W.THEMES[t];
    const groups = [];
    if (s.sources.length) groups.push({ label: "Sources", html: s.sources.map(x => pane
      ? `<div class="pk-line"><span class="pk-i">${ic("link")}</span><span class="pk-line-text"><span class="pk-split"><span><a class="pk-ref" href="${esc(x.url)}" onclick="return false">${esc(x.domain)}</a>, ${esc(x.author)}</span><span class="pk-2">${esc(x.date)}</span></span><span class="pk-quote">${esc(x.title)}</span></span></div>`
      : `<div class="pk-line"><span class="pk-i">${ic("link")}</span><span class="pk-line-text pk-split"><span>${esc(x.domain)}</span><span class="pk-2">${esc(x.date)}</span></span></div>`).join("") });
    groups.push({ label: "Themes", html: themes.map(t => pane
      ? `<div class="pk-line"><span class="pk-i">${ic("binoculars")}</span><span class="pk-line-text pk-split"><a class="pk-ref" href="#" onclick="return false">${esc(themeName(t))}</a><button type="button" class="pk-btn" data-quiet data-size="s">Unfile</button></span></div>`
      : themeLine(t)).join("") + (pane ? `<button type="button" class="pk-add">${slot("plus")}File in theme</button>` : "") });
    const evHtml = ev.map(e => {
      const st = e.stance === "supports" ? "Supports" : "Undermines";
      if (!isSuggested(s, e)) return pane
        ? `<div class="pk-line"><span class="pk-i">${ic(st === "Supports" ? "arrow-up" : "arrow-down")}</span><span class="pk-line-text"><span class="pk-2">${st} </span><a class="pk-ref" href="#" onclick="return false">${esc(theory(e.theory).claim)}</a></span></div>`
        : theoryLine(e.theory, st);
      return `<div class="pk-suggest" role="group" aria-label="Suggested link">
          <div class="pk-line"><span class="pk-i">${ic(st === "Supports" ? "arrow-up" : "arrow-down")}</span><span class="pk-line-text"><span class="pk-2">Suggested: ${st.toLowerCase()} </span>${esc(theory(e.theory).claim)}</span></div>
          <div class="pk-suggest-acts"><button type="button" class="pk-btn" data-quiet data-act="dismiss" data-k="${s.id}:${e.theory}">Dismiss</button><button type="button" class="pk-btn" data-act="accept" data-k="${s.id}:${e.theory}">Accept</button></div></div>`;
    }).join("");
    const theoriesHtml = evHtml + (pane ? `<button type="button" class="pk-add">${slot("plus")}Add theory</button>` : "");
    if (ev.length || pane) groups.push({ label: "Theories", html: theoriesHtml });
    const origin = d ? `<button type="button" class="pk-refline pk-line" data-peek="dump:${d.id}" aria-haspopup="dialog" aria-expanded="false"><span class="pk-i">${ic(dumpGlyph(d))}</span><span class="pk-line-text pk-2">${esc(fromLine(s))}</span></button>` : "";
    // C: short names become tokens (sources with their date, themes); claims stay lines.
    const tok = [
      ...s.sources.map(x => `<span class="pk-tok">${slot("link")}<span>${esc(x.domain)}</span><span class="pk-2">${esc(x.date)}</span></span>`),
      ...themes.map(t => pane
        ? `<span class="pk-tok">${slot("binoculars")}<a class="pk-ref" href="#" onclick="return false">${esc(themeName(t))}</a><button type="button" class="pk-tok-x" aria-label="Unfile from ${esc(themeName(t))}" title="Unfile">${ic("x")}</button></span>`
        : `<button type="button" class="pk-tok" data-peek="theme:${t}">${slot("binoculars")}<span>${esc(themeName(t))}</span></button>`),
      ...(pane ? [`<button type="button" class="pk-tok" data-add>${slot("plus")}<span>File in theme</span></button>`] : []),
    ].join("");
    return { groups, origin, tokens: `<div class="pk-toks">${tok}</div>`, theories: theoriesHtml, d };
  }

  const PEEK = {
    // Three compositions share the same anatomy: kind glyph and title in the header, the note as prose right under the
    // title, then connected objects (sources, themes, theories, origin) kept apart from that core.
    //   A: one hairline, then unlabelled icon lines grouped by space.  B: no lines, a short label above each group.
    //   C: the connected objects sit in a sunk tray; short names become tokens, claims stay lines.
    signal(id, opts = {}) {
      const s = sig(id), L = opts.layout || "A", c = sigConn(s, { peek: true });
      const note = s.note ? `<p class="pk-sig-note pk-clamp2">${esc(s.note)}</p>` : "";
      let conn;
      if (L === "B") conn = `<div class="pk-conn" data-l="B">${c.groups.map(g => `<div class="pk-grp"><div class="pk-grp-label">${g.label}</div>${g.html}</div>`).join("")}${c.origin ? `<div class="pk-grp">${c.origin}</div>` : ""}</div>`;
      else if (L === "C") conn = `<div class="pk-conn" data-l="C">${c.tokens}${c.theories ? `<div class="pk-grp">${c.theories}</div>` : ""}${c.origin ? `<div class="pk-grp">${c.origin}</div>` : ""}</div>`;
      else conn = `<div class="pk-conn" data-l="A">${c.groups.map(g => `<div class="pk-grp" role="group" aria-label="${g.label}">${g.html}</div>`).join("")}${c.origin ? `<div class="pk-grp">${c.origin}</div>` : ""}</div>`;
      const foot = opts.verb ? `<button type="button" class="pk-btn" data-act="file" data-k="${s.id}">${ic("plus")}File in theme</button>` : "";
      return { glyphHtml: kindSlot(s), label: KIND[kindOf(s)][1], title: s.gist, body: note + conn, foot, layout: L, sig: true };
    },
    dump(id, opts = {}) {
      const d = dumpOf(id);
      const lines = d.paras.map(p => p.text).join(" ");
      const status = d.failed
        ? `<div class="pk-status" data-tone="neg">${slot("warning", ' data-tone="neg"')}<span>Transcription failed at 07:41. Retry is in the pane.</span></div>`
        : `<div class="pk-status">${slot("check")}<span class="pk-2">Processed, made ${d.produced.length}</span></div>`;
      const made = d.produced.map(x => sig(x) ? sigLine(sig(x)) : theory(x) ? theoryLine(x) : "").join("");
      const body = `<dl class="pk-fields">
          <dt>Captured</dt><dd>${esc(d.day)} ${esc(d.time)}${d.duration ? `, ${d.duration}` : ""}</dd>
          <dt>Status</dt><dd>${status}</dd>
          ${d.failed ? `<dt>Made</dt><dd><span class="pk-2">Nothing yet</span></dd>` : `<dt>Opening</dt><dd><span class="pk-clamp3">${esc(lines)}</span></dd>
          <dt>Made</dt><dd>${made}</dd>`}
        </dl>`;
      return { glyph: dumpGlyph(d), label: dumpKind(d), title: `${esc(d.first)}`, titleHtml: true, body };
    },
    theme(id, opts = {}) {
      const t = THEMES[id];
      const body = `<dl class="pk-fields">
          <dt>Holds</dt><dd><span>${t.signals} signals, ${t.theories.length} ${t.theories.length === 1 ? "theory" : "theories"}, ${t.prototypes.length} ${t.prototypes.length === 1 ? "prototype" : "prototypes"}</span></dd>
          ${t.theories.length ? `<dt>Theories</dt><dd>${t.theories.slice(0, 3).map(x => { const th = theory(x); return `<button type="button" class="pk-refline" data-peek="theory:${x}" style="grid-template-columns:minmax(0,1fr) auto;column-gap:8px;align-items:start"><span>${esc(th.claim)}</span>${th.draft ? '<span class="pk-2">Draft</span>' : conf(th.conf)}</button>`; }).join("")}</dd>` : ""}
          <dt>Newest</dt><dd>${t.newest.slice(0, 3).map(x => sigLine(sig(x))).join("")}</dd>
        </dl>`;
      return { glyph: "binoculars", label: "Theme", title: `${esc(t.name)}`, titleHtml: true, body };
    },
    theory(id, opts = {}) {
      const t = theory(id);
      const sup = (t.top?.sup || []).slice(0, 2).map(x => sigLine(sig(x))).join("");
      const und = (t.top?.und || []).slice(0, 2).map(x => sigLine(sig(x))).join("");
      const live = (t.hits || []).filter(h => !state.accepted[`hit:${h}`] && !state.dismissed[`hit:${h}`]);
      const body = `<dl class="pk-fields">
          <dt>Confidence</dt><dd>${t.draft ? "Draft, not yet held" : `<span style="display:flex;gap:8px;align-items:center">${conf(t.conf)}<span class="pk-num">+${t.sup} −${t.und}</span></span>`}</dd>
          <dt>Happens by</dt><dd>${t.horizon}</dd>
          ${t.tripwire ? `<dt>Tripwire</dt><dd><span>I'd change my mind if ${esc(t.tripwire)}.${live.length ? ` <span class="pk-trip-count" style="vertical-align:1px">${live.length}</span>` : ""}</span></dd>` : ""}
          ${sup ? `<dt>Supports</dt><dd>${sup}</dd>` : ""}
          ${und ? `<dt>Undermines</dt><dd>${und}</dd>` : ""}
        </dl>
        ${t.pending ? `<p class="pk-2">${t.pending} suggestion${t.pending === 1 ? "" : "s"} waiting in the pane</p>` : ""}`;
      return { glyph: "target", label: t.draft ? "Draft theory" : "Theory", title: `${esc(t.claim)}`, titleHtml: true, body };
    },
    prototype(id, opts = {}) {
      const p = PROTOS[id];
      const body = `${p.media ? '<span class="pk-thumb" role="img" aria-label="First screenshot (schematic)"></span>' : ""}
        <dl class="pk-fields">
          <dt>Status</dt><dd>${p.status}</dd>
          <dt>Tests</dt><dd>${p.theories.map(x => theoryLine(x)).join("")}</dd>
          ${p.links.length ? `<dt>Links</dt><dd>${p.links.map(l => `<div class="pk-line"><span class="pk-i">${ic("link")}</span><span class="pk-line-text">${esc(l)}</span></div>`).join("")}</dd>` : ""}
        </dl>`;
      return { glyph: "pencil-ruler", label: "Prototype", title: `${esc(p.name)}`, titleHtml: true, body };
    },
    // A set rather than an object: what a filed token or a tripped count points at.
    filed(id, opts = {}) {
      const d = dumpOf(id);
      const body = `<div style="display:grid;gap:8px">${d.produced.map(x => { const s = sig(x); return s ? `<button type="button" class="pk-refline pk-line" data-peek="signal:${x}"><span class="pk-i">${ic(sigGlyph(s))}</span><span class="pk-line-text">${esc(s.gist)}<br><span class="pk-2">${esc(W.THEMES[s.themes[0]])}</span></span></button>` : ""; }).join("")}</div>`;
      return { glyph: "check", label: "Filed", title: `Filed ${d.produced.length} signals from your ${dumpKind(d).toLowerCase()}`, titleHtml: true, body, paneRef: `dump:${id}` };
    },
    hits(id, opts = {}) {
      const t = theory(id);
      const live = t.hits.filter(h => !state.accepted[`hit:${h}`] && !state.dismissed[`hit:${h}`]);
      const body = `<p class="pk-2">I'd change my mind if ${esc(t.tripwire)}.</p>
        ${live.map(h => { const s = sig(h); return `<div class="pk-suggest">${sigLine(s)}<div class="pk-suggest-acts"><button type="button" class="pk-btn" data-quiet data-act="dismiss" data-k="hit:${h}">Dismiss</button><button type="button" class="pk-btn" data-act="accept" data-k="hit:${h}">Accept</button></div></div>`; }).join("")}`;
      return { glyph: "signpost", label: "Tripwire", title: `${live.length ? `${live.length} signal${live.length === 1 ? " matches" : "s match"} your tripwire` : "Every match is decided"}`, titleHtml: true, body, paneRef: `theory:${id}` };
    },
  };

  // ── Rung 3: panes (Signal and Dump get the full rigour pass; others are named, not built) ──
  function markQuote(text, quote) {
    let h = esc(text); if (!quote) return h;
    quote.split("…").map(q => q.trim().replace(/\.$/, "")).filter(q => q.length > 8).forEach(q => { const e = esc(q); h = h.replace(e, `<mark>${e}</mark>`); });
    return h;
  }
  const PANE = {
    // Same anatomy as the peek: glyph and title, note as editable prose under the title, then connected objects.
    // The pane adds what only a working surface needs: authors and titles of sources, Unfile, add controls,
    // the passage the signal was cut from, and merge history.
    signal(id, stage) {
      const s = sig(id), L = layoutOf(stage), c = sigConn(s, { pane: true });
      const para = s.id in EXTRA ? null : W.passageFor(s);
      const note = `<label class="pk-vh" for="note-${s.id}-${uid + 1}">Note</label><textarea class="pk-note pk-sig-note" id="note-${s.id}-${++uid}" rows="2" placeholder="Add a note">${esc(s.note || "")}</textarea>`;
      const origin = c.d ? `<div class="pk-line"><span class="pk-i">${ic(dumpGlyph(c.d))}</span><span class="pk-line-text"><button type="button" class="pk-ref" data-peek="dump:${c.d.id}" aria-haspopup="dialog" aria-expanded="false">${esc(fromLine(s))}</button></span></div>${para ? `<div class="pk-read pk-passage"><p>${markQuote(para.text, para.quote)}</p></div>` : ""}` : "";
      const merged = s.merged ? `<div class="pk-line"><span class="pk-i">${ic("arrows-merge")}</span><span class="pk-line-text">Merged from ${esc(s.merged.from)} <span class="pk-2">${esc(s.merged.at)}</span></span></div>` : "";
      let conn;
      if (L === "B") conn = `<div class="pk-conn" data-l="B">${c.groups.map(g => `<div class="pk-grp"><div class="pk-grp-label">${g.label}</div>${g.html}</div>`).join("")}${origin ? `<div class="pk-grp">${origin}</div>` : ""}${merged ? `<div class="pk-grp">${merged}</div>` : ""}</div>`;
      else if (L === "C") conn = `<div class="pk-conn" data-l="C">${c.tokens}<div class="pk-grp">${c.theories}</div></div><div class="pk-after">${origin}${merged}</div>`;
      else conn = `<div class="pk-conn" data-l="A">${c.groups.map(g => `<div class="pk-grp" role="group" aria-label="${g.label}">${g.html}</div>`).join("")}${origin ? `<div class="pk-grp">${origin}</div>` : ""}${merged ? `<div class="pk-grp">${merged}</div>` : ""}</div>`;
      return { glyphHtml: kindSlot(s), label: KIND[kindOf(s)][1], acts: ["arrows-merge:Merge", "archive:Retire"], layout: L, body: `
        <div class="pk-doc-head"><h2 class="pk-title" tabindex="-1">${esc(s.gist)}</h2>${note}</div>${conn}` };
    },
    dump(id) {
      const d = dumpOf(id);
      return { glyph: dumpGlyph(d), label: dumpKind(d), acts: ["trash:Delete dump"], body: `
        <div class="pk-doc-head"><h2 class="pk-title" tabindex="-1">${esc(d.first)}</h2></div>
        <dl class="pk-fields">
          <dt>Captured</dt><dd>${esc(d.day)} ${esc(d.time)}</dd>
          <dt>Kind</dt><dd>${esc(dumpKind(d))}${d.duration ? `, ${d.duration}, ${d.words || W.words(d.paras.map(p => p.text).join(" "))} words` : ""}</dd>
          <dt>Made</dt><dd>${d.produced.map(x => { const s = sig(x); return s ? `<div class="pk-line"><span class="pk-i">${ic(sigGlyph(s))}</span><span class="pk-line-text"><button type="button" class="pk-ref" data-peek="signal:${x}" aria-haspopup="dialog" aria-expanded="false">${esc(s.gist)}</button><br><span class="pk-2">${esc(W.THEMES[s.themes[0]])}</span></span></div>` : ""; }).join("")}</dd>
          <dt>Processed</dt><dd><div class="pk-line"><span class="pk-i">${ic("check")}</span><span class="pk-line-text">${esc(d.day)} ${esc(d.time.replace(/(\d+)$/, m => String(+m + 1).padStart(2, "0")))}, made ${d.produced.length}</span></div></dd>
          ${d.duration ? `<dt>Audio</dt><dd><div class="pk-audio"><button type="button" class="pk-ib" aria-label="Play">${ic("play")}</button><span class="pk-bars">${Array.from({ length: 42 }, (_, i) => `<i style="height:${Math.round(4 + 14 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)))}px"></i>`).join("")}</span><span class="pk-num">${d.duration}</span></div></dd>` : ""}
          ${d.links ? `<dt>Links</dt><dd>${d.links.map(l => `<div class="pk-line"><span class="pk-i">${ic("link")}</span><span class="pk-line-text">${esc(l)}</span></div>`).join("")}</dd>` : ""}
          <dt>${d.kind === "voice" ? "Transcript" : "Text"}</dt><dd><div class="pk-read">${d.paras.map(p => `<p>${markQuote(p.text, p.quote)}</p>`).join("")}</div></dd>
        </dl>` };
    },
    theme(id, stage) {
      const t = THEMES[id], eye = stage?.dataset.trigger === "pane";
      const days = [["Today", t.newest.filter(x => sig(x).day === "Today")], ["Yesterday", t.newest.filter(x => sig(x).day !== "Today")]].filter(([, ids]) => ids.length);
      return { glyph: "binoculars", label: "Theme", acts: ["archive:Retire"], body: `
        <div class="pk-doc-head"><h2 class="pk-title" tabindex="-1">${esc(t.name)}</h2><span class="pk-2">${t.signals} signals${t.theories.length ? "" : ", no theories yet"}</span></div>
        <div>${days.map(([day, ids]) => `<div class="pk-day"><span>${day}</span><div>${ids.map(x => R.signal(sig(x), { eye })).join("")}</div></div>`).join("")}</div>` };
    },
    theory(id) {
      const t = theory(id);
      const live = (t.hits || []).filter(h => !state.accepted[`hit:${h}`] && !state.dismissed[`hit:${h}`]);
      return { glyph: "target", label: "Theory", acts: ["archive:Retire"], body: `
        <div class="pk-doc-head"><h2 class="pk-title" tabindex="-1">${esc(t.claim)}</h2></div>
        <dl class="pk-fields">
          <dt>Confidence</dt><dd><span style="display:flex;gap:8px;align-items:center">${conf(t.conf)}<span class="pk-num">+${t.sup} −${t.und}</span></span></dd>
          <dt>Happens by</dt><dd>${t.horizon}</dd>
          <dt>Tripwire</dt><dd><div class="pk-line"><span class="pk-i"${live.length ? ' data-tone="neg"' : ""}>${ic("signpost")}</span><span class="pk-line-text">I'd change my mind if <span class="${live.length ? "pk-trip-phrase" : ""}">${esc(t.tripwire)}</span>.${live.length ? `<button type="button" class="pk-trip-count" data-peek="hits:${id}" aria-haspopup="dialog" aria-expanded="false" aria-label="${live.length} signal matches" style="margin-left:6px;vertical-align:-4px">${live.length}</button>` : ""}</span></div></dd>
          <dt>Body</dt><dd>${esc(t.body)}</dd>
        </dl>` };
    },
  };

  // ── Peek controller: one transient layer per page ──
  let open = null; // { el, anchor, stage, history: [ref], opts }
  let uid = 0;
  // Header for every peek: the object's glyph, its full title (never clamped: the row already shows it whole), then expand and close.
  // No written type: the list it opened from already says what it is.
  function peekHead(v, labelId, { back = false, paneRef = "", live = true } = {}) {
    const g = v.glyphHtml || `<span class="pk-i" data-ink role="img" aria-label="${v.label}" title="${v.label}">${ic(v.glyph)}</span>`;
    return `<div class="pk-peek-head">
        ${back ? `<button type="button" class="pk-ib" data-act="peek-back" aria-label="Back" title="Back">${ic("arrow-left")}</button>` : ""}
        ${g}<p class="pk-peek-title" id="${labelId}">${v.titleHtml ? v.title : esc(v.title)}</p>
        <span class="pk-peek-ctl"><button type="button" class="pk-ib"${live ? ` data-act="to-pane" data-ref="${paneRef}"` : ""} aria-label="Open in pane" title="Open in pane">${ic("arrows-out-simple")}</button><button type="button" class="pk-ib"${live ? ' data-act="peek-close"' : ""} aria-label="Close" title="Close (Esc)">${ic("x")}</button></span>
      </div>`;
  }
  function render(ref, opts) {
    const [kind, id] = ref.split(":");
    const labelId = `pk-peek-l-${++uid}`;
    const v = PEEK[kind](id, { ...opts, labelId });
    const back = open?.history?.length > 1 || opts.historyLen > 1;
    const paneRef = v.paneRef || ref;
    return { labelId, html: `
      ${peekHead(v, labelId, { back, paneRef })}
      <div class="pk-peek-body"${v.layout ? ` data-l="${v.layout}"` : ""}>${v.body}</div>
      ${v.foot ? `<div class="pk-peek-foot">${v.foot}</div>` : ""}` };
  }
  function place(peek, anchor, stage) {
    const sheet = stage.dataset.narrow === "sheet";
    peek.toggleAttribute("data-sheet", sheet);
    if (sheet) { peek.style.left = peek.style.top = ""; return; }
    const sr = stage.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
    const pw = Math.min(360, sr.width - 16);
    peek.style.width = pw + "px";
    const ph = Math.min(peek.scrollHeight, 520);
    const m = 8, gap = 6;
    let left = ar.left - sr.left;
    // Wide rows: start where the text starts so the peek reads as growing from it.
    left = Math.max(m, Math.min(left, sr.width - pw - m));
    const below = sr.bottom - ar.bottom - gap - m, above = ar.top - sr.top - gap - m;
    let top, fromY;
    if (ph > below && ph > above) {
      // Neither side fits: keep the whole peek inside the bounds, sliding it up over the rows above the anchor.
      const max = sr.height - 2 * m, h = Math.min(ph, max);
      top = Math.max(m, Math.min(ar.bottom - sr.top + gap, sr.height - h - m)); fromY = "-6px"; peek.style.setProperty("--pk-peek-max", `${max}px`);
    } else if (ph <= below || below >= above) { top = ar.bottom - sr.top + gap; fromY = "-6px"; peek.style.setProperty("--pk-peek-max", `${Math.max(160, below)}px`); }
    else { top = Math.max(m, ar.top - sr.top - gap - Math.min(ph, above)); fromY = "6px"; peek.style.setProperty("--pk-peek-max", `${Math.max(160, above)}px`); }
    peek.style.left = left + "px"; peek.style.top = top + "px";
    const ox = Math.max(0, Math.min(pw, ar.left - sr.left - left + 12));
    peek.style.setProperty("--pk-origin", `${ox}px ${fromY.startsWith("-") ? "0" : "100%"}`);
    peek.style.setProperty("--pk-from-y", fromY);
  }
  function close({ focus = true } = {}) {
    if (!open) return;
    const { el, anchor } = open;
    anchor.setAttribute("aria-expanded", "false");
    open = null;
    el.setAttribute("data-closing", "");
    setTimeout(() => el.remove(), 120);
    const st = anchor.closest(".pk-stage"), ref = anchor.dataset.peek;
    refreshAll();
    // A refresh can re-render the anchor (or remove it, once every tripwire match is decided).
    const back = anchor.isConnected ? anchor : st?.querySelector(`[data-peek="${ref}"]`) || st?.querySelector(".pk-title");
    if (focus && back) back.focus({ preventScroll: true });
  }
  function show(anchor, ref, { replace = false } = {}) {
    const stage = anchor.closest(".pk-stage");
    if (!stage) return;
    if (open && !replace) { const same = open.anchor === anchor; close({ focus: false }); if (same) return; }
    const opts = { verb: stage.dataset.verb === "on", layout: layoutOf(stage) };
    if (replace && open) {
      open.history.push(ref);
      const r = render(ref, { ...opts, historyLen: open.history.length });
      open.el.innerHTML = r.html; open.el.setAttribute("aria-labelledby", r.labelId);
      place(open.el, open.anchor, stage);
      open.el.querySelector(".pk-peek-body").scrollTop = 0;
      open.el.querySelector(".pk-peek-head button")?.focus({ preventScroll: true });
      return;
    }
    const el = document.createElement("div");
    el.className = "pk-peek pk"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "false"); el.tabIndex = -1;
    open = { el, anchor, stage, history: [ref] };
    const r = render(ref, opts);
    el.innerHTML = r.html; el.setAttribute("aria-labelledby", r.labelId);
    stage.append(el);
    place(el, anchor, stage);
    anchor.setAttribute("aria-expanded", "true");
    el.focus({ preventScroll: true });
  }
  function rerender() {
    if (!open) return;
    const ref = open.history.at(-1);
    const r = render(ref, { verb: open.stage.dataset.verb === "on", layout: layoutOf(open.stage), historyLen: open.history.length });
    open.el.innerHTML = r.html; open.el.setAttribute("aria-labelledby", r.labelId);
    place(open.el, open.anchor, open.stage);
  }

  // ── Pane controller per stage ──
  function paneOpen(stage, ref, { push = true, focus = true } = {}) {
    const host = stage.querySelector("[data-pane-host]");
    if (!host) return;
    stage._stack = stage._stack || [];
    if (push) stage._stack.push(ref);
    const [kind, id] = ref.split(":");
    const v = PANE[kind](id, stage);
    const back = stage._stack.length > 1;
    host.innerHTML = `<div class="pk-pane-bar">${back ? `<button type="button" class="pk-ib" data-act="pane-back" aria-label="Back">${ic("arrow-left")}</button>` : ""}<span class="pk-grow"></span>${v.acts.map(a => { const [i, l] = a.split(":"); return `<button type="button" class="pk-ib" aria-label="${l}" title="${l}">${ic(i)}</button>`; }).join("")}<button type="button" class="pk-ib" data-act="pane-close" aria-label="Close pane" title="Close pane">${ic("x")}</button></div>
      <div class="pk-pane-scroll"><div class="pk-doc"${v.layout ? ` data-l="${v.layout}"` : ""}>${v.body.replace('<div class="pk-doc-head">', `<div class="pk-doc-head">${v.glyphHtml || `<span class="pk-i" data-ink role="img" aria-label="${v.label}" title="${v.label}">${ic(v.glyph)}</span>`}`)}</div></div>`;
    host.hidden = false;
    stage.querySelectorAll("[data-sel]").forEach(e => e.removeAttribute("data-sel"));
    if (focus) host.querySelector(".pk-title")?.focus({ preventScroll: true });
  }

  function toast(stage, text) {
    stage.querySelector(".pk-toast")?.remove();
    const t = document.createElement("div"); t.className = "pk-toast pk"; t.setAttribute("role", "status");
    t.innerHTML = `<span>${esc(text)}</span><button type="button" data-act="undo">Undo</button>`;
    stage.append(t); setTimeout(() => t.remove(), 4000);
  }

  // ── Events ──
  document.addEventListener("click", e => {
    const actEl = e.target.closest("[data-act]");
    const peekEl = e.target.closest(".pk-peek");
    if (actEl && actEl.closest(".pk-stage")) {
      const stage = actEl.closest(".pk-stage"), a = actEl.dataset.act;
      if (a === "peek-close") return close();
      if (a === "peek-back" && open) { open.history.pop(); rerender(); return; }
      if (a === "to-pane") { const ref = actEl.dataset.ref; const host = stage.querySelector("[data-pane-host]"); close({ focus: false }); if (host) paneOpen(stage, ref); else toast(stage, "Opens in the docked pane"); return; }
      if (a === "pane-back") { stage._stack.pop(); paneOpen(stage, stage._stack.at(-1), { push: false }); return; }
      if (a === "pane-close") { const host = stage.querySelector("[data-pane-host]"); stage._stack = []; if (stage.dataset.home) paneOpen(stage, stage.dataset.home); else host.hidden = true; return; }
      if (a === "accept" || a === "dismiss") { (a === "accept" ? state.accepted : state.dismissed)[actEl.dataset.k] = true; rerender(); toast(stage, a === "accept" ? "Accepted" : "Dismissed"); refreshAll(); return; }
      if (a === "file") { toast(stage, "Pick a theme"); return; }
      if (a === "undo") { actEl.closest(".pk-toast").remove(); return; }
    }
    const trig = e.target.closest("[data-peek]");
    if (trig && trig.closest(".pk-stage")) {
      const stage = trig.closest(".pk-stage");
      e.preventDefault();
      if (peekEl) return show(trig, trig.dataset.peek, { replace: true });
      // Alternative trigger: the row opens the pane; its trailing eye opens the peek.
      if (trig.hasAttribute("data-pane-link")) { close({ focus: false }); return paneOpen(stage, trig.dataset.peek); }
      return show(trig, trig.dataset.peek);
    }
    if (open && !peekEl && !open.anchor.contains(e.target)) close({ focus: false });
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && open) { e.preventDefault(); close(); }
  });
  // Scrolling the list under a peek moves the anchor: follow it, and close once it scrolls out of view.
  document.addEventListener("scroll", () => {
    if (!open) return;
    const sr = open.stage.getBoundingClientRect(), ar = open.anchor.getBoundingClientRect();
    if (ar.bottom < sr.top || ar.top > sr.bottom) return close({ focus: false });
    if (!open.el.hasAttribute("data-sheet")) place(open.el, open.anchor, open.stage);
  }, true);
  window.addEventListener("resize", () => { if (open) place(open.el, open.anchor, open.stage); });

  // ── Stage builders ──
  const BUILD = {
    // Theme pane feed: the second signal. Two trigger alternatives share this stage.
    feed(st) {
      st.innerHTML = `<div class="pk pk-app" style="grid-template-columns:minmax(0,1fr)"><div class="pk-pane" data-pane-host></div></div>`;
      st.dataset.home = "theme:interfaces"; paneOpen(st, "theme:interfaces", { focus: false });
    },
    columns(st) {
      const dumps = W.DUMPS.slice(0, 4), sigs = ["s5", "s7", "s12", "s3", "s8"].map(sig);
      st.innerHTML = `<div class="pk pk-app" style="grid-template-columns:repeat(5,minmax(200px,1fr));overflow-x:auto">
        <div class="pk-col"><div class="pk-colhead">${slot("tray-arrow-down")}Dumps</div>${dumps.map(R.dump).join("")}</div>
        <div class="pk-col"><div class="pk-colhead">${slot("pulse")}Signals</div>${sigs.map(s => R.signal(s)).join("")}</div>
        <div class="pk-col"><div class="pk-colhead">${slot("binoculars")}Themes</div>${["cost", "memory", "review", "interfaces", "identity"].map(R.theme).join("")}</div>
        <div class="pk-col" style="gap:8px"><div class="pk-colhead">${slot("target")}Theories</div>${["t3", "t4", "t1", "d3"].map(R.theory).join("")}</div>
        <div class="pk-col"><div class="pk-colhead">${slot("pencil-ruler")}Prototypes</div>${["p2", "p1", "p3", "p4"].map(R.proto).join("")}</div>
      </div>`;
    },
    briefing(st) {
      st.innerHTML = `<div class="pk pk-app"><div class="pk-main" style="display:grid;gap:16px;align-content:start;max-width:560px">
        <div style="display:flex;justify-content:space-between"><span class="pk-strong">Since you last looked</span><span class="pk-num">12 left</span></div>
        <div style="display:grid;gap:6px"><span class="pk-2">Challenges <span class="pk-num">1</span></span>${R.theory("t3")}</div>
        <div style="display:grid;gap:2px"><span class="pk-2">New signals <span class="pk-num">3</span></span>${["s5", "s7", "s12"].map(x => R.signal(sig(x))).join("")}</div>
        <div style="display:grid;gap:2px"><span class="pk-2">Dumps <span class="pk-num">1</span></span>${R.dump(dumpOf("D2"))}</div>
      </div></div>`;
    },
    chat(st) {
      st.innerHTML = `<div class="pk pk-app"><div class="pk-main"><div class="pk-chat">
        <div class="pk-chat-q">What came out of this morning's voice note?</div>
        <p>Three signals. I <button type="button" class="pk-filed" data-peek="filed:D2" aria-haspopup="dialog" aria-expanded="false">${slot("check")}filed 3</button> into three themes. The memory one undermines a theory you hold with high confidence, so it's waiting for you in the briefing.</p>
      </div></div></div>`;
    },
    tripwire(st) {
      st.innerHTML = `<div class="pk pk-app" style="grid-template-columns:minmax(0,1fr)"><div class="pk-pane" data-pane-host></div></div>`;
      st.dataset.home = "theory:t3"; paneOpen(st, "theory:t3", { focus: false });
    },
    provenance(st) {
      st.innerHTML = `<div class="pk pk-app pkj-prov"><div class="pk-col" style="padding:16px"><div class="pk-colhead">${slot("pulse")}Signals</div>${["s5", "s7", "s12"].map(x => R.signal(sig(x))).join("")}</div><div class="pk-pane" data-pane-host></div></div>`;
      st.dataset.home = "signal:s12"; paneOpen(st, "signal:s12", { focus: false });
      st.querySelector('[data-peek="signal:s12"]').setAttribute("aria-current", "true");
    },
    phone(st) {
      st.innerHTML = `<div class="pk pk-app" style="grid-template-columns:minmax(0,1fr)"><div class="pk-pane" data-pane-host></div></div>`;
      st.dataset.home = "theme:interfaces"; paneOpen(st, "theme:interfaces", { focus: false });
    },
    signalPane(st) { st.innerHTML = `<div class="pk pk-app"><div class="pk-pane" data-pane-host></div></div>`; paneOpen(st, "signal:s5", { focus: false }); },
    dumpPane(st) { st.innerHTML = `<div class="pk pk-app"><div class="pk-pane" data-pane-host></div></div>`; paneOpen(st, "dump:D2", { focus: false }); },
  };
  function refreshAll() {
    document.querySelectorAll(".pk-stage[data-build='tripwire']").forEach(st => { if (!open || open.stage !== st) paneOpen(st, st._stack?.at(-1) || "theory:t3", { push: false, focus: false }); });
  }
  // ── Static rungs (for the three-rung strips). Same renderers, not floating. ──
  function staticPeek(ref, opts = {}) {
    const [kind, id] = ref.split(":");
    const labelId = `pk-s-${++uid}`;
    const v = PEEK[kind](id, { layout: opts.layout || layoutOf(), ...opts, labelId });
    return `<div class="pk-peek pk" data-static role="group" aria-labelledby="${labelId}">
      ${peekHead(v, labelId, { live: false })}
      <div class="pk-peek-body"${v.layout ? ` data-l="${v.layout}"` : ""}>${v.body}</div>${v.foot ? `<div class="pk-peek-foot">${v.foot}</div>` : ""}</div>`;
  }
  const STATIC = {
    "row-signal": () => `<div class="pk" style="padding:8px">${R.signal(sig("s5"))}</div>`,
    "row-dump": () => `<div class="pk" style="padding:8px">${R.dump(dumpOf("D2"))}</div>`,
    "row-theme": () => `<div class="pk" style="padding:8px">${R.theme("review")}</div>`,
    "row-theory": () => `<div class="pk" style="padding:8px">${R.theory("t3")}</div>`,
    "row-proto": () => `<div class="pk" style="padding:8px">${R.proto("p2")}</div>`,
    "peek-signal": () => staticPeek("signal:s5"),
    "peek-dump": () => staticPeek("dump:D2"),
    "peek-theme": () => staticPeek("theme:review"),
    "peek-theory": () => staticPeek("theory:t3"),
    "peek-proto": () => staticPeek("prototype:p2"),
    "peek-x1-read": () => staticPeek("signal:x1"),
    "peek-x1-verb": () => staticPeek("signal:x1", { verb: true }),
    "peek-dump-failed": () => { const d = dumpOf("D2"); d.failed = true; const h = staticPeek("dump:D2"); d.failed = false; return h; },
  };

  // Generic static rung: data-sref="row:signal:s5" or "peek:signal:L1", with an optional data-layout.
  const staticRef = el => {
    const [rung, kind, id] = el.dataset.sref.split(":");
    if (rung === "row") return `<div class="pk pkj-pad">${kind === "signal" ? R.signal(sig(id)) : R[kind](kind === "dump" ? dumpOf(id) : id)}</div>`;
    return staticPeek(`${kind}:${id}`, { layout: el.dataset.layout, verb: el.dataset.verb === "on" });
  };
  // Until Maggie chooses a signal composition, the rest of the page shows A. Her choice (or ?layout=B) applies everywhere.
  function pageLayout() {
    const q = new URLSearchParams(location.search).get("layout");
    if (/^[ABC]$/.test(q || "")) return q;
    try { const c = JSON.parse(localStorage.getItem("jig:di-010:signal-peek"))?.choice; if (c) return c[0]; } catch {}
    return "A";
  }
  function paintStatic() {
    document.body.dataset.sigLayout = pageLayout();
    document.querySelectorAll("[data-sig-layout-now]").forEach(el => { el.textContent = document.body.dataset.sigLayout; });
    document.querySelectorAll("[data-static-rung]").forEach(el => { el.innerHTML = STATIC[el.dataset.staticRung](); });
    document.querySelectorAll("[data-sref]").forEach(el => { el.innerHTML = staticRef(el); });
  }
  function boot() {
    paintStatic();
    document.querySelectorAll(".pk-stage[data-build]").forEach(st => BUILD[st.dataset.build](st));
    document.querySelector('[data-decision="signal-peek"]')?.addEventListener("click", e => {
      if (!e.target.closest(".jig-choose")) return;
      queueMicrotask(() => {
        const was = document.body.dataset.sigLayout; paintStatic();
        if (was === document.body.dataset.sigLayout) return;
        close({ focus: false });
        document.querySelectorAll(".pk-stage[data-build]").forEach(st => { if (!st.dataset.layout) { st._stack = []; BUILD[st.dataset.build](st); } });
      });
    });
    // Optional: open a peek on load for screenshots, e.g. ?open=feed-a:signal:x1
    const q = new URLSearchParams(location.search).get("open");
    if (q) { const [sid, ...ref] = q.split(":"); const st = document.getElementById(sid); const a = st?.querySelector(`[data-peek="${ref.join(":")}"]`); if (a) { a.scrollIntoView({ block: "center" }); show(a, ref.join(":")); } }
    document.body.classList.add("pk-ready");
  }
  window.PK = { show, close, paneOpen, get open() { return open; } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
