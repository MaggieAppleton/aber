// DI-006 / DI-007 jig: renders the same real contexts under Current, A, B and C.
(() => {
  const I = (name, size = 14, weight = "regular") => {
    const paths = (window.ICONS[`${name}.${weight}`] || window.ICONS[`${name}.regular`] || [])
      .map(p => `<path d="${p.d}"${p.o != null ? ` opacity="${p.o}"` : ""}></path>`).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">${paths}</svg>`;
  };
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  // ── Data. Seed mirrors the live app; Stress pushes names, counts and combinations. ──
  const SEED = {
    themes: [
      { name: "Cost of intelligence", theories: 5, signals: 5, fresh: 3, active: true },
      { name: "Agent memory", theories: 2, signals: 2, fresh: 0, chal: 1 },
      { name: "Code review after agents", theories: 2, signals: 2, fresh: 1 },
      { name: "Personal software", theories: 2, signals: 2, fresh: 0 },
      { name: "Novel agent interfaces", open: true, signals: 1, fresh: 0 },
      { name: "Agent identity", open: true, signals: 0, fresh: 0 },
    ],
    feed: [
      { day: "Today", items: [
        { g: "Link", gist: "Startup sells agent hours instead of seats", src: "x.com", to: "Software is priced per outcome, not per seat", dir: "ArrowUp", unseen: true },
        { g: "TextAlignLeft", gist: "Inference price for small models halves again", src: "Note", to: "Tokens become nearly free for routine work", dir: "ArrowUp", unseen: true },
        { g: "Link", gist: "Frontier lab raises prices for its top model", src: "theinformation.com", to: "Frontier intelligence stays scarce and expensive", dir: "ArrowUp" },
      ] },
      { day: "Yesterday", items: [
        { g: "Link", gist: "Frontier training runs keep growing in cost", src: "epoch.ai", to: "Frontier intelligence stays scarce and expensive", dir: "ArrowUp" },
      ] },
    ],
    cards: [
      { claim: "Tokens become nearly free for routine work", conf: 3, s: 2, u: 1, protos: 1, pending: 0 },
      { claim: "Agents keep context across months, not sessions", conf: 4, s: 3, u: 1, protos: 0, pending: 1, chal: true },
    ],
    pane: {
      title: "Agents keep context across months, not sessions", conf: 4, chal: 1,
      tw: "a major assistant withdraws its memory feature, or people switch memory off once they see what it keeps",
      ev: [
        { gist: "Agent recalls a codebase across a month of sessions", src: "x.com", unseen: true },
        { gist: "Memory feature withdrawn after privacy complaints", src: "theverge.com" },
      ],
    },
    briefing: {
      chals: [{ title: "Agents keep context across months, not sessions", why: "A major assistant pulled memory after complaints" }],
      themes: [{ title: "Agent identity", why: "3 signals about agents holding their own accounts" }],
      drafts: [{ title: "Local models absorb most everyday agent work", theme: "Cost of intelligence" }],
    },
    atlas: [
      { name: "Cost of intelligence", x: 50, y: 60, r: 22, signals: 5, fresh: 3, pins: [{ x: 44, y: 66, c: 3 }, { x: 56, y: 58, c: 2 }] },
      { name: "Agent memory", x: 76, y: 34, r: 16, signals: 2, fresh: 0, pins: [{ x: 76, y: 42, c: 4, chal: true }] },
      { name: "Personal software", x: 26, y: 20, r: 15, signals: 2, fresh: 0, pins: [{ x: 26, y: 28, c: 2 }] },
      { name: "Agent identity", x: 22, y: 78, r: 12, signals: 0, fresh: 0, open: true, pins: [] },
    ],
  };

  const STRESS = {
    themes: [
      { name: "What happens to per-seat SaaS pricing when inference is nearly free", theories: 5, signals: 140, fresh: 128, active: true },
      { name: "Agent memory", theories: 2, signals: 14, fresh: 12, chal: 1 },
      { name: "Code review after agents", theories: 4, signals: 30, fresh: 23, chal: 2 },
      { name: "Personal software", theories: 2, signals: 2, fresh: 0 },
      { name: "Novel agent interfaces for long-running background work", open: true, signals: 4, fresh: 4 },
      { name: "Agent identity", open: true, signals: 0, fresh: 0 },
    ],
    feed: [
      { day: "Today", items: [
        { g: "Link", gist: "Startup sells agent hours instead of seats, and publishes the per-task margin for the first time", src: "x.com", to: "Software is priced per outcome, not per seat", dir: "ArrowUp", unseen: true },
        { g: "TextAlignLeft", gist: "Inference price for small models halves again", src: "Note", to: "Tokens become nearly free for routine work", dir: "ArrowUp", unseen: true },
        { g: "Link", gist: "Frontier lab raises prices for its top model", src: "theinformation.com", to: "Frontier intelligence stays scarce and expensive", dir: "ArrowUp", unseen: true },
        { g: "Link", gist: "Enterprise buyers ask for seat pricing back", src: "ft.com", to: "Software is priced per outcome, not per seat", dir: "ArrowDown", unseen: true },
        { g: "TextAlignLeft", gist: "Our own agent bill tripled this month", src: "Note", to: "Tokens become nearly free for routine work", dir: "ArrowDown" },
      ] },
      { day: "Yesterday", items: [
        { g: "Link", gist: "Frontier training runs keep growing in cost", src: "epoch.ai", to: "Frontier intelligence stays scarce and expensive", dir: "ArrowUp", unseen: true },
      ] },
    ],
    cards: [
      { claim: "Per-seat pricing survives only where a human is still the bottleneck, and everywhere else moves to metered agent hours", conf: 2, s: 6, u: 4, protos: 3, pending: 12, chal: true },
      { claim: "Agents keep context across months, not sessions", conf: 4, s: 3, u: 1, protos: 0, pending: 1, chal: true },
      { claim: "Tokens become nearly free for routine work", conf: 3, s: 2, u: 1, protos: 1, pending: 0 },
    ],
    pane: {
      title: "Per-seat pricing survives only where a human is still the bottleneck", conf: 2, chal: 3,
      tw: "two or more of the big suites drop seat pricing within a year",
      ev: [
        { gist: "Startup sells agent hours instead of seats, and publishes the per-task margin for the first time", src: "x.com", unseen: true },
        { gist: "Enterprise buyers ask for seat pricing back", src: "ft.com", unseen: true },
        { gist: "Suite vendor adds an agent tier priced per task", src: "theverge.com" },
      ],
    },
    briefing: {
      chals: [
        { title: "Per-seat pricing survives only where a human is still the bottleneck, and everywhere else moves to metered agent hours", why: "Two suites dropped seats this quarter" },
        { title: "Agents keep context across months, not sessions", why: "A major assistant pulled memory after complaints" },
      ],
      themes: [
        { title: "Novel agent interfaces for long-running background work", why: "4 signals about agents that work overnight" },
        { title: "Agent identity", why: "3 signals about agents holding their own accounts" },
      ],
      drafts: [{ title: "Local models absorb most everyday agent work", theme: "Cost of intelligence" }],
    },
    atlas: [
      { name: "What happens to per-seat SaaS pricing", x: 50, y: 60, r: 22, signals: 140, fresh: 128, pins: [{ x: 44, y: 66, c: 2, chal: true }, { x: 56, y: 58, c: 3 }] },
      { name: "Agent memory", x: 76, y: 34, r: 16, signals: 14, fresh: 12, pins: [{ x: 76, y: 42, c: 4, chal: true }] },
      { name: "Personal software", x: 26, y: 20, r: 15, signals: 2, fresh: 0, pins: [{ x: 26, y: 28, c: 2 }] },
      { name: "Novel agent interfaces", x: 24, y: 80, r: 12, signals: 4, fresh: 4, open: true, pins: [] },
    ],
  };
  // Atlas themes inherit challenged-theory counts from their pins.
  for (const set of [SEED, STRESS]) for (const r of set.atlas) r.chal = r.pins.filter(p => p.chal).length;

  // ── Mark vocabulary per strategy ──
  const LABEL = { fresh: "New since you last looked", open: "No theory yet", challenge: "Challenged" };
  const cur = kind => `<span class="ap-mark tipped" role="img" data-kind="${kind}" title="${LABEL[kind]}" aria-label="${LABEL[kind]}" data-tip="${LABEL[kind]}"></span>`;

  const tipFor = st => {
    const parts = [];
    if (st.chal) parts.push(st.chal === true ? "Challenged" : `${plural(st.chal, "challenged theory", "challenged theories")}`);
    if (st.fresh) parts.push(st.fresh === true ? "New since you last looked" : `${plural(st.fresh, "new signal", "new signals")}`);
    if (st.open) parts.push("No theory yet");
    return parts.join(", ");
  };
  // A: one mark, by precedence challenge > new > open, in a reserved gutter. The tooltip names every state.
  const gut = st => {
    const tip = tipFor(st);
    let inner = "";
    if (st.chal) inner = `<span class="mk tipped" data-k="challenge" role="img" aria-label="${tip}" title="${tip}" data-tip="${tip}">${I("Signpost", 12, "fill")}</span>`;
    else if (st.fresh) inner = `<span class="mk tipped" data-k="fresh" role="img" aria-label="${tip}" title="${tip}" data-tip="${tip}"></span>`;
    else if (st.open) inner = `<span class="mk tipped" data-k="open" role="img" aria-label="${tip}" title="${tip}" data-tip="${tip}"></span>`;
    return `<span class="gut">${inner}</span>`;
  };
  // B: one trailing slot of worded counts.
  const slot = st => {
    const f = st.fresh ? `<span class="att" data-k="fresh">${st.fresh} new</span>` : "";
    const c = st.chal ? (() => { const t = plural(st.chal, "challenged theory", "challenged theories"); return `<span class="att tipped" data-k="challenge" role="img" aria-label="${t}" title="${t}" data-tip="${t}">${I("Signpost", 11, "fill")}${st.chal}</span>`; })() : "";
    return f || c ? `<span class="slot">${f}${c}</span>` : "";
  };

  // ── Atoms ──
  const conf = n => `<span class="ap-conf" role="img" aria-label="Confidence ${n} of 5">${[1, 2, 3, 4, 5].map(i => `<i${i <= n ? " data-on" : ""}></i>`).join("")}</span>`;
  const balance = (s, u) => `<span class="ap-balance" role="img" aria-label="${s} support, ${u} undermine"><span class="ap-num">+${s}</span><span class="ap-num ap-neg">−${u}</span></span>`;
  const ghost = n => n ? `<span class="ap-ghost-badge" role="img" title="${n} suggestions" aria-label="${n} suggestions">${n}</span>` : "";
  const protosN = n => n ? `<span class="ap-muted ap-inline">${I("PencilRuler", 12)}${n}</span>` : "";
  const challengeTag = text => `<span class="ap-challenge tagB">${I("Signpost", 12, "fill")}${text}</span>`;
  const spark = n => `<span class="cs" role="img" aria-label="Confidence history, now ${n} of 5"><svg width="56" height="18" viewBox="0 0 56 18" aria-hidden="true"><path class="cs-line" data-tone="down" d="M2 5 L18 6 L34 9 L52 ${16 - n * 2}" fill="none"></path><circle class="cs-end" cx="52" cy="${16 - n * 2}" r="2.5"></circle></svg></span>`;

  // ── Contexts ──
  const sidebar = (S, d) => {
    const rows = d.themes.map((t, i) => {
      const act = t.active ? " data-active" : "";
      const num = `<span class="ap-muted ap-num">${t.open ? "" : t.theories}</span>`;
      if (S === "current") return `<a href="#"${act}><span>${esc(t.name)}</span>${t.fresh ? cur("fresh") : ""}${num}</a>`;
      if (S === "A") return `<a href="#" class="sA"${act}>${gut(t)}<span class="nm">${esc(t.name)}</span>${num}</a>`;
      if (S === "B") return `<a href="#" class="sB"${act}><span class="nm">${esc(t.name)}</span>${slot(t)}</a>`;
      return `<a href="#"${act}><span>${esc(t.name)}</span>${num}</a>`;
    }).join("");
    const att = d.themes.reduce((n, t) => n + (t.chal || 0), 0) + d.briefing.themes.length + d.briefing.drafts.length;
    const brief = S === "C" ? `<a href="#" class="cBrief"><span>${I("Newspaper", 14)}Briefing</span><span class="ap-num">${att}</span></a>` : "";
    return `<div class="ap ab-production cx" style="background:var(--ap-sunk)"><nav class="cur-index" aria-label="Themes">${brief}${rows}</nav></div>`;
  };

  const feed = (S, d) => {
    const ev = (it, i) => {
      const glyph = `<span class="pn-feed-glyph">${I(it.g, 14)}${S === "current" && it.unseen ? cur("fresh") : ""}</span>`;
      const text = `<span class="pn-feed-text"><span>${esc(it.gist)}</span><span class="ap-muted">${esc(it.src)}</span></span>`;
      const to = `<span class="pn-feed-to"><span class="pn-feed-chip" title="${it.dir === "ArrowUp" ? "Supports" : "Undermines"}">${I(it.dir, 12)}<span>${esc(it.to)}</span></span></span>`;
      const seen = S === "B" ? (it.unseen ? " data-unseen" : " data-seen") : "";
      if (S === "A") return `<div class="pn-sig"><button type="button" class="pn-ev fA">${gut({ fresh: !!it.unseen })}${glyph}${text}${to}</button></div>`;
      return `<div class="pn-sig"${seen}><button type="button" class="pn-ev">${glyph}${text}${to}</button></div>`;
    };
    let days = d.feed;
    if (S === "C") {
      // Unseen first, under one "New" label; the rest keep their dates.
      const all = d.feed.flatMap(g => g.items.map(it => ({ ...it, day: g.day })));
      const fresh = all.filter(it => it.unseen);
      const rest = d.feed.map(g => ({ day: g.day, items: g.items.filter(it => !it.unseen) })).filter(g => g.items.length);
      days = [{ day: "New", isNew: true, items: fresh }, ...rest];
    }
    const html = days.map(g => {
      let col = g.items.map(ev).join("");
      if (S === "B") {
        const n = g.items.filter(it => it.unseen).length;
        if (n) col = `<div class="newrule">${n} new</div>` + col;
      }
      return `<div class="pn-feed-day"><div class="ap-label pn-feed-date"${g.isNew ? " data-new" : ""}>${g.day}</div><div class="pn-col">${col}</div></div>`;
    }).join("");
    return `<div class="ap ab-production cx"><div class="pn-feed">${html}</div></div>`;
  };

  const cards = (S, d) => {
    const html = d.cards.map(c => {
      const claim = S === "A" && c.chal
        ? `<div class="ap-card-claim gA">${gut({ chal: true })}<span>${esc(c.claim)}</span></div>`
        : `<div class="ap-card-claim">${esc(c.claim)}</div>`;
      const end = S === "current" && c.chal ? cur("challenge") : S === "B" && c.chal ? challengeTag("Challenged") : "";
      return `<div class="ap-card" role="button" tabindex="0">${claim}<div class="ap-card-meta">${conf(c.conf)}${balance(c.s, c.u)}${protosN(c.protos)}${ghost(c.pending)}${end}</div></div>`;
    }).join("");
    return `<div class="ap ab-production cx" style="background:var(--ap-sunk)"><div class="cur-cards">${html}</div></div>`;
  };

  const pane = (S, d) => {
    const p = d.pane;
    const title = S === "A" ? `<h2 class="pn-title gA">${gut({ chal: p.chal })}<span>${esc(p.title)}</span></h2>` : `<h2 class="pn-title">${esc(p.title)}</h2>`;
    const confMark = S === "current" ? cur("challenge") : S === "B" ? challengeTag(`Challenged by ${plural(p.chal, "signal", "signals")}`) : "";
    const confRow = `<div class="pn-conf"><div class="pn-conf-control"><span class="pn-conf-marks" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i${i <= p.conf ? " data-on" : ""}></i>`).join("")}</span></div></div>${spark(p.conf)}${confMark}`;
    const tw = `<div class="tw-tc" role="group" aria-label="What would change my mind"><div class="tw-tc-line"><span class="tw-tc-lead"><span class="tw-tc-icon" data-tripped>${I("Signpost", 16, "fill")}</span>I'd change my mind if </span><div class="pn-edit tw-tc-phrase" data-tripped>${esc(p.tw)}</div><span class="tw-tc-end">.<span class="ap-ghost-badge">${p.chal}</span></span></div></div>`;
    const ev = p.ev.map(e => {
      const line = S === "current" ? `<span class="pn-line">${e.unseen ? cur("fresh") : ""}<span>${esc(e.gist)}</span></span>`
        : S === "A" ? `<span class="pn-line gA">${gut({ fresh: !!e.unseen })}<span>${esc(e.gist)}</span></span>`
        : `<span class="pn-line"><span${S === "B" && e.unseen ? ' style="font-weight:600;color:var(--ap-ink)"' : ""}>${esc(e.gist)}</span></span>`;
      const src = `<span class="ap-muted"${S === "A" ? ' style="padding-left:calc(var(--m6-gutter) + var(--m6-gap))"' : ""}>${esc(e.src)}</span>`;
      return `<div class="pn-sig"><button type="button" class="pn-ev">${line}${src}</button></div>`;
    }).join("");
    const newHead = S === "B" ? `<span class="att" data-k="fresh" style="margin-left:auto">${p.ev.filter(e => e.unseen).length} new</span>` : "";
    return `<div class="ap ab-production cx"><div class="pn-doc">${title}<dl class="pn-meta"><div class="pn-meta-row"><dt class="ap-label">Confidence</dt><dd>${confRow}</dd></div></dl>${tw}<div class="pn-col"><div class="pn-ev-head">${I("ArrowUp", 12)}<span class="ap-label">Supports</span><span class="ap-num pn-field-val">${p.ev.length}</span>${newHead}</div>${ev}</div></div></div>`;
  };

  const columns = (S, d) => {
    const themes = d.themes.slice(0, 5).map(t => {
      let line;
      if (S === "current") line = `<span class="cd-line cd-spread"><span>${esc(t.name)}</span>${t.open ? cur("open") : t.fresh ? cur("fresh") : ""}</span>`;
      else if (S === "A") line = `<span class="cd-line gA">${gut(t)}<span>${esc(t.name)}</span></span>`;
      else if (S === "B") line = `<span class="cd-line cd-spread"><span>${esc(t.name)}</span>${slot(t)}</span>`;
      else line = `<span class="cd-line"><span>${esc(t.name)}</span></span>`;
      return `<div class="cd-item" data-stock><button class="cd-item-btn">${line}</button></div>`;
    }).join("");
    const theories = d.cards.slice(0, 2).map(c => {
      const meta = S === "current"
        ? `${conf(c.conf)}${c.chal ? cur("challenge") : ""}${ghost(c.pending)}`
        : `${conf(c.conf)}${ghost(c.pending)}${S === "B" && c.chal ? challengeTag("Challenged") : ""}`;
      if (S === "A") return `<div class="cd-item" data-stock><button class="cd-item-btn"><span class="gA">${gut({ chal: c.chal })}<span style="display:grid;gap:3px"><span class="cd-claim">${esc(c.claim)}</span><span class="cd-line">${meta}</span></span></span></button></div>`;
      return `<div class="cd-item" data-stock><button class="cd-item-btn"><span class="cd-claim">${esc(c.claim)}</span><span class="cd-line">${meta}</span></button></div>`;
    }).join("");
    return `<div class="ap ab-production cx"><div class="cd-colhead">${I("Binoculars", 14)}Themes</div><div class="cd-col" data-kind="theme"><div class="cd-list">${themes}</div></div><div class="cd-colhead" style="margin-top:10px">${I("Target", 14)}Theories</div><div class="cd-col" data-kind="theory"><div class="cd-list">${theories}</div></div></div>`;
  };

  const briefing = (S, d) => {
    const b = d.briefing;
    const row = (glyph, title, mark, detail, acts, draft, chal) => {
      const t = S === "A"
        ? `<div class="br-title gA">${gut({ chal })}<button class="br-open">${esc(title)}</button></div>`
        : `<div class="br-title"><button class="br-open">${esc(title)}${mark}</button></div>`;
      return `<div class="br-item"><div class="br-row"${draft ? " data-draft" : ""}><span class="br-glyph">${I(glyph, 14)}</span><div class="br-main">${t}<div class="br-detail">${detail}</div></div><span class="br-acts"><button class="ap-btn">${acts}</button></span></div></div>`;
    };
    const head = (name, n, icon) => `<h3 class="ap-label br-group-name">${icon || ""}${name}<span class="ap-num">${n}</span></h3>`;
    const chalHead = S === "B" || S === "C" ? `<span style="color:var(--ab-tripped);display:inline-flex">${I("Signpost", 12, "fill")}</span>` : "";
    const chals = b.chals.map(c => row("Signpost", c.title, S === "current" ? cur("challenge") : "", `<span class="br-why">${esc(c.why)}</span>`, "Review", false, true)).join("");
    const themes = b.themes.map(c => row("Binoculars", c.title, S === "current" ? cur("fresh") : "", `<span class="br-why">${esc(c.why)}</span>`, "Open", false, false)).join("");
    const drafts = b.drafts.map(c => row("Target", c.title, "", `<span class="br-meta">${balance(1, 0)}<span class="ap-muted ap-inline">${I("Binoculars", 12)}${esc(c.theme)}</span></span>`, "Accept", true, false)).join("");
    return `<div class="ap ab-production cx" style="background:var(--ap-sunk)"><div class="br-stack"><section class="br-group" style="margin-top:0">${head("Challenges", b.chals.length, chalHead)}${chals}</section><section class="br-group">${head("New themes", b.themes.length)}${themes}</section><section class="br-group">${head("Drafts", b.drafts.length)}${drafts}</section></div></div>`;
  };

  const atlas = (S, d) => {
    const regions = d.atlas.map(r => `<button class="a2-region"${r.open ? " data-open" : ""} aria-label="${esc(r.name)}, ${r.signals} signals${r.fresh ? `, ${r.fresh} new` : ""}" style="left:calc(${r.x}% - ${r.r}%);top:calc(${r.y}% - ${r.r * 1.32}%);width:${r.r * 2}%;height:${r.r * 2.64}%"></button>`).join("");
    const names = d.atlas.map(r => {
      const pos = `style="left:${r.x}%;top:calc(${r.y}% - ${r.r * 1.32}% + 8px)"`;
      let inner;
      if (S === "current") inner = `${esc(r.name)}${r.open ? cur("open") : ""}${r.signals ? `<span class="a2-count ap-num"><span>${r.signals}</span>${r.fresh ? `<span class="a2-count-new">${cur("fresh")}${r.fresh}</span>` : ""}</span>` : ""}`;
      else if (S === "A") inner = `${gut(r)}${esc(r.name)}${r.signals ? `<span class="a2-count ap-num"><span>${r.signals}</span></span>` : ""}`;
      else if (S === "B") inner = `${esc(r.name)}${slot(r)}`;
      else inner = `${esc(r.name)}${r.signals ? `<span class="a2-count ap-num"><span>${r.signals}</span></span>` : ""}`;
      return `<span class="a2-name" ${pos}>${inner}</span>`;
    }).join("");
    const pins = d.atlas.flatMap(r => r.pins).map(p => {
      const mark = !p.chal ? "" : S === "current" ? cur("challenge") : S === "A" ? `<span class="mk tipped" data-k="challenge" role="img" aria-label="Challenged" data-tip="Challenged">${I("Signpost", 12, "fill")}</span>` : "";
      return `<button class="a2-pin" aria-label="Theory${p.chal ? ", challenged" : ""}" style="left:${p.x}%;top:${p.y}%;--c:${p.c}"><i></i>${mark}</button>`;
    }).join("");
    return `<div class="ap ab-production a2 cx mini"><div class="a2-map" style="--z:1"><div class="a2-world">${regions}${names}${pins}</div></div></div>`;
  };

  const CONTEXTS = [
    { id: "sidebar", title: "Sidebar themes", note: "Watch where the mark sits against the name and the count, and whether the challenged theme (Agent memory) is visible at all.", fn: sidebar },
    { id: "feed", title: "Theme feed", note: "Today the dot sits on the glyph's corner. Compare a gutter, a “new” rule with bold titles, and unseen-first ordering.", fn: feed },
    { id: "cards", title: "Theory cards", note: "Challenge plus a long claim, a suggestion count and prototypes. The current dot is last in the meta row, after the dashed badge.", fn: cards },
    { id: "pane", title: "Theory pane: confidence, tripwire, evidence", note: "The tripped tripwire sentence is in every column: it is the challenge's real explanation. Strategy C relies on it alone.", fn: pane },
    { id: "columns", title: "Columns", note: "Themes put the mark flush right; theories put challenge before the suggestions badge, the reverse of cards.", fn: columns },
    { id: "briefing", title: "Briefing", note: "Every item here is new, so a new dot adds nothing. The group heading already names the kind.", fn: briefing },
    { id: "atlas", title: "Atlas (scaled down)", note: "Labels mix ring, total, dot and new count; challenge sits on a pin's shoulder. Mini-map at zoom 1.", fn: atlas },
  ];
  const COLS = [
    { id: "current", label: `<span class="jig-label" data-current>Current</span>` },
    { id: "A", label: `<span class="jig-label"><b>A</b> One gutter</span>` },
    { id: "B", label: `<span class="jig-label"><b>B</b> Roll up, in words</span>` },
    { id: "C", label: `<span class="jig-label"><b>C</b> No persistent marks</span>` },
  ];

  const state = { data: "seed", force: false, show: { current: true, a: true, b: true, c: true } };

  function renderMatrix() {
    const root = document.getElementById("m6-matrix");
    const d = state.data === "stress" ? STRESS : SEED;
    root.innerHTML = CONTEXTS.map(c => `<div class="m6-ctx" data-ctx="${c.id}"><h3>${c.title}</h3><p>${c.note}</p><div class="m6-grid">${COLS.map(col => `<div class="m6-cell" data-col="${col.id}">${col.label}<div class="jig-stage">${c.fn(col.id, d)}</div></div>`).join("")}</div></div>`).join("");
    root.querySelectorAll(".m6-cell").forEach(cell => cell.querySelector(".tipped")?.classList.add("tip-demo"));
    root.querySelectorAll("a[href='#']").forEach(a => a.addEventListener("click", e => e.preventDefault()));
    applyView();
  }
  function applyView() {
    const root = document.getElementById("m6-matrix");
    root.toggleAttribute("data-force", state.force);
    for (const k of ["current", "a", "b", "c"]) root.toggleAttribute(`data-hide-${k}`, !state.show[k]);
    root.style.setProperty("--cols", Math.max(1, Object.values(state.show).filter(Boolean).length));
  }

  // ── DI-007 ──
  const PROTOS = [
    { name: "Intent review", status: "building" },
    { name: "Token budget meter", status: "idea" },
    { name: "One-person app kit", status: "built" },
    { name: "Memory inspector", status: "shelved" },
  ];
  const PROTOS_STRESS = [...PROTOS, { name: "Recovery rehearsal for agents that lose their working memory", status: "idea" }];
  const STATUSES = ["idea", "building", "built", "shelved"];
  const WORD = { idea: "Idea", building: "Building", built: "Built", shelved: "Shelved" };
  const OPTS = [
    { id: "current", label: `<span class="jig-label" data-current>Current</span>`, note: "Building is #2f6fed, the only blue in the app. Built is ink. Selected switches the glyph to fill." },
    { id: "A", label: `<span class="jig-label"><b>A</b> Green ramp by fill</span>`, note: "One glyph, three fills: outline idea, half building, solid built. Green only once work has started; shelved fades." },
    { id: "B", label: `<span class="jig-label"><b>B</b> Words</span>`, note: "The glyph is a neutral object icon; the status is a word. Only “Building” is green." },
    { id: "C", label: `<span class="jig-label"><b>C</b> Swap blue for green</span>`, note: "Building takes --ap-pos green; built stays ink. The smallest change." },
  ];
  const proto = (O, status, selected) => {
    if (O === "A") {
      const w = { idea: "regular", building: "duotone", built: "fill", shelved: "regular" }[status];
      return `<span class="ap-proto pA" role="img" data-status="${status}" title="${status}" aria-label="${status}">${I("PencilRuler", 14, w)}</span>`;
    }
    const cls = O === "B" ? " pB" : O === "C" ? " pC" : "";
    return `<span class="ap-proto${cls}" role="img" data-status="${status}" title="${status}" aria-label="${status}">${I("PencilRuler", 14, selected && O !== "B" ? "fill" : "regular")}</span>`;
  };
  const word = s => `<span class="stw" data-status="${s}">${WORD[s]}</span>`;
  const sel = { current: "building", A: "building", B: "building", C: "building" };

  function statusOption(O) {
    const list = state.data === "stress" ? PROTOS_STRESS : PROTOS;
    const radio = O === "B"
      ? `<span class="pn-status wB" role="radiogroup" aria-label="Status">${STATUSES.map(s => `<button role="radio" aria-checked="${s === sel[O]}" tabindex="${s === sel[O] ? 0 : -1}" data-s="${s}">${word(s)}</button>`).join("")}</span>`
      : `<span class="pn-status" role="radiogroup" aria-label="Status">${STATUSES.map(s => `<button role="radio" aria-checked="${s === sel[O]}" aria-label="${s}" tabindex="${s === sel[O] ? 0 : -1}" data-s="${s}"><span class="pn-status-glyph" aria-hidden="true">${proto(O, s, s === sel[O])}</span>${s === sel[O] ? `<span class="pn-reveal"><span class="pn-reveal-in"><span class="pn-status-name">${s}</span></span></span>` : ""}</button>`).join("")}</span>`;
    const rows = list.map(p => {
      const line = O === "B"
        ? `<span class="cd-line cd-spread"><span class="cd-line">${proto(O, p.status)}<span>${esc(p.name)}</span></span>${word(p.status)}</span>`
        : `<span class="cd-line">${proto(O, p.status)}<span>${esc(p.name)}</span></span>`;
      return `<div class="cd-item"><button class="cd-item-btn">${line}</button></div>`;
    }).join("");
    const chips = list.slice(0, 3).map(p => `<button class="pn-chip" title="Prototype">${proto(O, p.status)}<span class="pn-chip-name">${esc(p.name)}</span>${O === "B" ? word(p.status) : ""}</button>`).join("");
    const collide = `<span class="cd-line"><span class="ap-mark" role="img" data-kind="fresh" aria-label="New since you last looked"></span><span>New signal</span></span><span class="cd-line">${proto(O, "building")}<span>Intent review</span>${O === "B" ? word("building") : ""}</span><span class="cd-line">${proto(O, "built")}<span>One-person app kit</span>${O === "B" ? word("built") : ""}</span>`;
    return `<div class="ap ab-production cx"><div class="s7">
      <div class="s7-row"><span class="ap-label">Prototype pane: status</span><div>${radio}</div></div>
      <div class="s7-row"><span class="ap-label">Columns: prototypes</span><div class="cd-list">${rows}</div></div>
      <div class="s7-row"><span class="ap-label">Theory pane: prototype chips</span><div class="pn-chips">${chips}</div></div>
      <div class="s7-row"><span class="ap-label">Beside a new mark</span><div class="s7-collide">${collide}</div></div>
    </div></div>`;
  }
  function renderStatus() {
    const root = document.getElementById("m6-status");
    root.innerHTML = OPTS.map(o => `<div class="jig-option" data-opt="${o.id}">${o.label}<p class="jig-note">${o.note}</p><div class="jig-stage">${statusOption(o.id)}</div></div>`).join("");
  }
  function setStatus(opt, s, focus) {
    sel[opt] = s;
    const host = document.querySelector(`#m6-status [data-opt="${opt}"] .jig-stage`);
    host.innerHTML = statusOption(opt);
    if (focus) host.querySelector(`[role=radio][data-s="${s}"]`)?.focus();
  }

  function wire() {
    document.querySelectorAll(".m6-seg").forEach(seg => seg.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      seg.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      if (seg.dataset.ctl === "data") { state.data = b.dataset.v; renderMatrix(); renderStatus(); }
      else { state.force = b.dataset.v === "force"; applyView(); }
    }));
    document.querySelectorAll("[data-show]").forEach(cb => cb.addEventListener("change", () => { state.show[cb.dataset.show] = cb.checked; applyView(); }));
    const st = document.getElementById("m6-status");
    st.addEventListener("click", e => {
      const b = e.target.closest("[role=radio]"); if (!b) return;
      setStatus(b.closest("[data-opt]").dataset.opt, b.dataset.s, true);
    });
    st.addEventListener("keydown", e => {
      const b = e.target.closest("[role=radio]"); if (!b) return;
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!step) return;
      e.preventDefault();
      const i = (STATUSES.indexOf(b.dataset.s) + step + STATUSES.length) % STATUSES.length;
      setStatus(b.closest("[data-opt]").dataset.opt, STATUSES[i], true);
    });
  }

  renderMatrix();
  renderStatus();
  wire();
})();
