// DI-004 / DI-005 jig: renders the current expansion (rebuilt from panes.tsx / columns2.tsx) and three alternatives.
// Every stage owns a small state object and re-renders itself; focus and scroll are restored by data-key / data-scroll.
(() => {
  const W = window.WORLD, P = window.ICON_PATHS;
  const ic = (n, s = 12, style = "") => `<svg data-icon="${n}" width="${s}" height="${s}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"${style ? ` style="${style}"` : ""}>${P[n] || ""}</svg>`;
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const dumpIcon = d => d.kind === "voice" ? "waveform" : d.kind === "link" ? "link" : "text-align-left";
  const kindName = d => d.kind === "voice" ? "Voice note" : d.kind === "link" ? "Links" : "Text";
  const when = d => d.day === "Today" ? `Today ${d.time}` : d.day;
  const theme = t => W.THEMES[t];
  const claim = t => W.THEORIES[t].claim;
  const wordsOf = d => d.words ?? d.paras.reduce((n, p) => n + W.words(p.text), 0);
  const isSignal = id => !!W.signal(id);
  const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
  const madeSummary = d => {
    const s = d.produced.filter(isSignal).length, t = d.produced.filter(id => W.THEORIES[id]).length;
    return [s && plural(s, "signal"), t && plural(t, "draft theory", "draft theories")].filter(Boolean).join(", ");
  };
  const FEED = { theme: "interfaces", days: [["Today", ["s12"]], ["Yesterday", ["x1", "x2"]]] };
  const wave = n => Array.from({ length: n }, (_, i) => `<i style="height:${Math.round(6 + 16 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)))}px"></i>`).join("");

  // Highlight Maggie's extracted span inside a passage. `quote` uses " … " between fragments.
  function markQuote(text, quote) {
    if (!quote) return esc(text);
    const ranges = [];
    quote.split("…").map(q => q.trim().replace(/\.$/, "")).filter(q => q.length > 8).forEach(q => {
      const i = text.indexOf(q); if (i >= 0) ranges.push([i, i + q.length]);
    });
    ranges.sort((a, b) => a[0] - b[0]);
    let out = "", at = 0;
    for (const [a, b] of ranges) { if (a < at) continue; out += esc(text.slice(at, a)) + `<mark class="x-q">${esc(text.slice(a, b))}</mark>`; at = b; }
    return out + esc(text.slice(at));
  }

  /* ── State ── */
  const STATES = new Map();
  function init(el) {
    const surface = el.dataset.surface, opt = el.dataset.option;
    const st = { el, id: el.dataset.stage, surface, opt, open: new Set(), full: new Set(), runs: new Set(), peek: new Set(), show: new Set(),
      themes: {}, evidence: {}, notes: {}, gists: {}, discard: {}, flash: {}, unmerged: {}, picker: null, menu: null, editThemes: new Set(), real: false, pane: [], hl: null, modal: null, enter: null, scrollTo: null };
    if (surface === "feed") st.pane = [{ k: "theme", id: FEED.theme }];
    if (surface === "columns") { if (opt === "B") st.pane = NARROW ? [] : [{ k: "signal", id: "s12" }]; else st.open.add("signal:s12"); if (opt === "A") st.peek.add("s12"); }
    if (surface === "dumps") { if (opt === "B") st.pane = NARROW ? [] : [{ k: "dump", id: "D2" }]; else st.open.add("dump:D2"); }
    if (surface === "feed" && opt !== "B") st.open.add("signal:s12");
    STATES.set(el, st);
    render(st);
  }
  const themesOf = (st, s) => st.themes[s.id] ?? s.themes;
  const evOf = (st, s) => st.evidence[s.id] ?? s.evidence;
  const noteOf = (st, s) => st.notes[s.id] ?? s.note ?? "";
  const gistOf = (st, s) => st.gists[s.id] ?? s.gist;
  const NARROW = matchMedia("(max-width: 700px)").matches;
  const paneTop = st => st.pane[st.pane.length - 1];

  /* ── Shared pieces ── */
  const fresh = s => s.fresh || s.day === "Today" ? `<span class="ap-mark" data-kind="fresh"></span>` : "";
  const editable = (cls, field, id, text, label, placeholder, key) =>
    `<div class="${cls} pn-edit" contenteditable="plaintext-only" role="textbox"${field === "note" ? ` aria-multiline="true"` : ""} aria-label="${label}" data-edit="${field}" data-id="${id}"${placeholder ? ` data-placeholder="${placeholder}"` : ""}${key ? ` data-key="${key}"` : ""}>${esc(text)}</div>`;
  const voiceRow = (d, cls = "x-voice") => d.kind !== "voice" ? "" :
    `<div class="${cls}"><button class="cd-play" aria-label="Play voice note" data-act="play">${ic("play", 10)}</button><span class="cd-wave" aria-hidden="true">${wave(34)}</span><span class="ap-muted ap-num">${d.duration}</span></div>`;
  const linksOf = d => (d.links || []).map(u => `<a class="cd-link" href="https://${u}" target="_blank" rel="noreferrer">${ic("link")}<span>${esc(u)}</span></a>`).join("");
  const madeRow = (id, ctx = "") => {
    const s = W.signal(id);
    if (s) return `<button class="xa-made" data-act="goto-signal" data-id="${id}" data-key="made:${ctx}${id}">${ic("pulse")}<span>${esc(s.gist)}<small>${s.themes.map(theme).join(", ")}</small></span></button>`;
    const t = W.THEORIES[id];
    return t ? `<button class="xa-made" data-draft data-act="open-theory" data-t="${id}">${ic("target")}<span>${esc(t.claim)}<small>Draft theory, suggested</small></span></button>` : "";
  };
  const evLink = (e, cls = "") => `<button class="pn-link ${cls}" ${e.suggested ? "data-suggested" : ""} data-act="open-theory" data-t="${e.theory}" title="${e.stance === "supports" ? "Supports" : "Undermines"}">${ic(e.stance === "supports" ? "arrow-up" : "arrow-down")}<span>${esc(claim(e.theory))}</span>${cls ? `<span class="xa-stance">${e.suggested ? "suggested, " : ""}${e.stance}</span>` : ""}</button>`;

  /* Theme relationships. No × on chips: × only closes fleeting surfaces. Each option unfiles with a labelled control that names the theme. */
  const themeName = (t, ctx) => `${esc(theme(t))}${t === ctx ? ` <span class="ap-muted">(this theme)</span>` : ""}`;
  function themeChips(st, s, ctx) {
    const ts = themesOf(st, s), pickOpen = st.picker?.id === s.id && st.picker.kind === "file";
    const add = `<button class="xa-add" data-act="picker" data-pk="file" data-id="${s.id}" data-key="pick:file:${s.id}" aria-haspopup="dialog" aria-expanded="${pickOpen}">${ic("plus", 10)} File</button>`;
    const tail = `${flash(st, s, "themes")}${pickOpen ? filePicker(st, s) : ""}`;
    const none = ts.length ? "" : `<span class="xa-none">Not filed</span>`;
    if (st.opt === "A") {
      // A: the field owns its verbs; an Edit mode lists each theme with a labelled Unfile.
      const editing = st.editThemes.has(s.id);
      if (editing) return `<ul class="xa-unfile-list" aria-label="Themes, editing">${ts.map(t => `<li><span class="xa-unfile-name">${ic("binoculars")}<span>${themeName(t, ctx)}</span></span><button class="xa-text-btn" data-act="unfile" data-id="${s.id}" data-t="${t}" data-key="unfile:${s.id}:${t}" aria-label="Unfile from ${esc(theme(t))}">Unfile</button></li>`).join("")}</ul>
        <div class="xa-chips">${none}${add}<button class="xa-add" data-act="edit-themes" data-id="${s.id}" data-key="edit-themes:${s.id}" aria-pressed="true">Done</button></div>${tail}`;
      return `<div class="xa-chips">${ts.map(t => `<button class="pn-chip" data-act="open-theme" data-t="${t}">${ic("binoculars")}<span>${themeName(t, ctx)}</span></button>`).join("")}${none}${add}${ts.length ? `<button class="xa-add" data-act="edit-themes" data-id="${s.id}" data-key="edit-themes:${s.id}" aria-pressed="false" aria-label="Edit themes">Edit</button>` : ""}</div>${tail}`;
    }
    if (st.opt === "C") {
      // C: object verbs live in menus; each chip opens a small menu.
      return `<div class="xa-chips">${ts.map(t => { const id = `chip:${s.id}:${t}`, open = st.menu === id; return `<span class="xc-menu-wrap"><button class="pn-chip xc-chipbtn" aria-haspopup="menu" aria-expanded="${open}" data-act="menu" data-id="${id}" data-key="menu:${id}">${ic("binoculars")}<span>${themeName(t, ctx)}</span></button>${open ? `<div class="xc-menu xc-chipmenu" role="menu" aria-label="${esc(theme(t))}"><button role="menuitem" data-act="open-theme" data-t="${t}" data-key="menu-first">${ic("arrow-right")} Open theme</button><button role="menuitem" data-act="unfile" data-id="${s.id}" data-t="${t}">${ic("minus")} Unfile from ${esc(theme(t))}</button></div>` : ""}</span>`; }).join("")}${none}${add}</div>${tail}`;
    }
    // B: the pane has room; a labelled Unfile sits beside the chip, revealed on hover or focus and always shown on touch.
    return `<div class="xa-chips">${ts.map(t => `<span class="xb-chiprow"><button class="pn-chip" data-act="open-theme" data-t="${t}">${ic("binoculars")}<span>${themeName(t, ctx)}</span></button><button class="xa-text-btn xb-unfile" data-act="unfile" data-id="${s.id}" data-t="${t}" data-key="unfile:${s.id}:${t}" aria-label="Unfile from ${esc(theme(t))}">Unfile</button></span>`).join("")}${none}${add}</div>${tail}`;
  }
  function evidenceRows(st, s) {
    const ev = evOf(st, s);
    return `${ev.length ? ev.map(e => evLink(e, "xa-ev")).join("") : `<span class="xa-none">Not evidence for a theory yet</span>`}
      <div><button class="xa-add" data-act="picker" data-pk="link" data-id="${s.id}" data-key="pick:link:${s.id}" aria-haspopup="dialog" aria-expanded="${st.picker?.id === s.id && st.picker.kind === "link"}">${ic("plus", 10)} Use as evidence</button></div>
      ${flash(st, s, "evidence")}${st.picker?.id === s.id && st.picker.kind === "link" ? linkPicker(st, s) : ""}`;
  }
  const flash = (st, s, field) => { const f = st.flash[s.id]; return f && f.field === field ? `<div class="xa-flash" role="status">${esc(f.msg)} <button class="xa-link-btn" data-act="undo" data-id="${s.id}" data-key="undo:${s.id}">Undo</button></div>` : ""; };
  function filePicker(st, s) {
    const have = themesOf(st, s);
    return `<div class="xa-picker" role="dialog" aria-label="File in a theme"><div class="xa-picker-head">File in a theme <button class="xa-x" data-act="picker-close" data-id="${s.id}" aria-label="Close">${ic("x", 10)}</button></div>
      ${Object.keys(W.THEMES).filter(t => !have.includes(t)).map((t, i) => `<button class="xa-pick" data-act="file" data-id="${s.id}" data-t="${t}"${i === 0 ? ` data-key="picker-first"` : ""}>${ic("binoculars")}${esc(theme(t))}</button>`).join("")}</div>`;
  }
  function linkPicker(st, s) {
    const have = evOf(st, s).map(e => e.theory);
    return `<div class="xa-picker" role="dialog" aria-label="Use as evidence"><div class="xa-picker-head">Evidence for which theory? <button class="xa-x" data-act="picker-close" data-id="${s.id}" aria-label="Close">${ic("x", 10)}</button></div>
      ${Object.keys(W.THEORIES).filter(t => !W.THEORIES[t].draft && !have.includes(t)).map((t, i) => `<div class="xa-pick-row"><span>${esc(claim(t))}</span><button class="xa-x" data-act="link" data-stance="supports" data-id="${s.id}" data-t="${t}" aria-label="Supports: ${esc(claim(t))}"${i === 0 ? ` data-key="picker-first"` : ""}>${ic("arrow-up", 11)}</button><button class="xa-x" data-act="link" data-stance="undermines" data-id="${s.id}" data-t="${t}" aria-label="Undermines: ${esc(claim(t))}">${ic("arrow-down", 11)}</button></div>`).join("")}</div>`;
  }
  function sourceLinks(st, s) {
    const srcs = s.sources.map(x => `<a class="xa-src" href="${x.url}" target="_blank" rel="noreferrer"><span class="xa-src-by"><b>${esc(x.domain)}</b> ${esc(x.author)}, ${esc(x.date)} ${ic("arrow-square-out", 10)}</span><span class="xa-src-text">${esc(x.title)}</span></a>`).join("");
    return (srcs || `<span class="xa-none">Your own observation, no external source</span>`) + merged(st, s);
  }
  const merged = (st, s) => s.merged && !st.unmerged[s.id] ? `<div class="xa-merged">${ic("arrows-merge", 10)} Merged from “${esc(s.merged.from)}”, ${esc(s.merged.at)} <button class="xa-link-btn" data-act="unmerge" data-id="${s.id}">Undo merge</button></div>` : "";
  function consequence(st, s) {
    const ts = themesOf(st, s), ev = evOf(st, s), d = W.dump(s.dump);
    return `<div class="x-confirm" role="group" aria-labelledby="cf-${st.id}-${s.id}"><p id="cf-${st.id}-${s.id}"><b>Discard this signal?</b></p><ul>
      <li>${ts.length ? `Leaves ${ts.map(t => esc(theme(t))).join(", ")}` : "It isn't filed in any theme"}</li>
      <li>${ev.length ? `Stops counting as evidence for ${plural(ev.length, "theory", "theories")}; their confidence is recalculated` : "Not evidence for any theory"}</li>
      <li>Agents won't extract it from “${esc(d.first)}” again</li></ul>
      <div class="x-confirm-acts"><button class="ap-btn" data-act="discard-no" data-id="${s.id}" data-key="discard-no:${s.id}">Cancel</button><button class="ap-btn x-danger" data-act="discard-yes" data-id="${s.id}">Discard</button></div></div>`;
  }
  const tomb = (st, s, current) => `<div class="x-tomb" data-item="signal:${s.id}">${ic("trash")}<s>${esc(gistOf(st, s))}</s><button class="xa-link-btn" data-act="undiscard" data-id="${s.id}" data-key="undiscard:${s.id}">${current ? "Restore (jig only)" : "Undo"}</button></div>`;
  /* Quote spans and passage positions aren't stored (signal_origins links a signal to a whole dump). Highlights are illustrative; "today's data" shows only what the schema can back. */
  const illus = (st, what = "Passage and highlights") => `<div class="x-illus" role="note"><span>${st.real ? "Today's data: a signal links to its whole dump, not a passage." : `<b>Illustrative.</b> ${what} are matched by hand; quote spans aren't stored yet.`}</span><button class="xa-link-btn" data-act="illus" data-key="illus" aria-pressed="${st.real}">${st.real ? "Show proposed" : "Show today's data"}</button></div>`;
  const markQ = (st, text, quote) => st.real ? esc(text) : markQuote(text, quote);
  const passageOf = (st, s) => st.real ? null : W.passageFor(s);
  const grow = (st, key, inner, cls = "") => `<div class="x-grow ${cls}"${st.enter === key ? " data-enter" : ""}><div>${inner}</div></div>`;

  /* ── Current, rebuilt from SignalDetail (panes.tsx:93) and DumpDetail (columns2.tsx:261) ── */
  function curSignalDetail(st, s, ctx) {
    const d = W.dump(s.dump);
    return `<div class="pn-detail-inner">
      ${editable("pn-note", "gist", s.id, gistOf(st, s), "Signal gist")}
      ${editable("pn-note", "note", s.id, noteOf(st, s), "Note", "Add a note")}
      ${evOf(st, s).filter(e => e.theory !== ctx).map(e => evLink(e)).join("")}
      <div class="pn-chips">${themesOf(st, s).filter(t => t !== ctx).map(t => `<button class="pn-chip" title="Theme" data-act="open-theme" data-t="${t}">${ic("binoculars")}${esc(theme(t))}</button>`).join("")}<button class="pn-chip pn-origin" title="${esc(d.first)}" data-act="open-dump" data-d="${d.id}" data-key="origin:${s.id}">${ic(dumpIcon(d))}<span>${esc(d.first)}</span></button></div>
      <div class="pn-chips">${s.sources.map(x => `<a class="pn-chip" href="${x.url}" target="_blank" rel="noreferrer">${ic("link")}${esc(s.gist)}</a>`).join("")}</div>
      <div class="pn-chips"><button class="ap-iconbtn" aria-label="Merge signal" title="Merge signal" data-act="merge">${ic("arrows-merge", 14)}</button><button class="ap-iconbtn" aria-label="Unfile from a theme" title="Unfile from a theme" data-act="cur-ask" data-msg="Opens a dialog: “Unfile signal”, choose a theme">${ic("minus", 14)}</button>${s.merged && !st.unmerged[s.id] ? `<button class="ap-btn" data-act="unmerge" data-id="${s.id}">Undo merge</button>` : ""}<button class="ap-iconbtn" aria-label="File in a theme" title="File in a theme" data-act="cur-ask" data-msg="Opens a dialog: “File signal”, choose a theme">${ic("plus", 14)}</button><button class="ap-iconbtn" aria-label="Discard signal" title="Discard signal" data-act="cur-discard" data-id="${s.id}">${ic("trash", 14)}</button></div>
    </div>`;
  }
  function curDumpDetail(st, d) {
    return `<div class="cd-detail-inner">${d.kind === "voice" ? `<div class="cd-line"><button class="cd-play" aria-label="Play" data-act="play">${ic("play", 10)}</button><span class="cd-wave">${wave(34)}</span></div>` : ""}
      <p class="cd-transcript">${esc(d.paras.map(p => p.text).join(" "))}</p>${linksOf(d)}
      ${d.produced.map(id => { const s = W.signal(id); return s ? `<button class="cd-link" data-act="goto-signal" data-id="${id}">${ic("pulse")}${esc(s.gist)}</button>` : W.THEORIES[id] ? `<button class="cd-link" data-suggested data-act="open-theory" data-t="${id}">${ic("target")}${esc(claim(id))}</button>` : ""; }).join("")}</div>`;
  }

  /* ── A: field sheet in place ── */
  function aSignalBody(st, s, ctx) {
    const d = W.dump(s.dump), p = passageOf(st, s), pi = d.paras.indexOf(p), peek = st.peek.has(s.id);
    return `<div class="xa-body">
      <dl class="xa-sheet">
        <div class="xa-f"><dt>Note</dt><dd>${editable("xa-note", "note", s.id, noteOf(st, s), "Note", "Add a note")}</dd></div>
        <div class="xa-f"><dt>Themes</dt><dd>${themeChips(st, s, ctx)}</dd></div>
        <div class="xa-f"><dt>Theories</dt><dd>${evidenceRows(st, s)}</dd></div>
        <div class="xa-f"><dt>From</dt><dd><button class="xa-from" aria-expanded="${peek}" data-act="peek" data-id="${s.id}" data-key="peek:${s.id}">${ic(dumpIcon(d))}<span>${esc(d.first)} <span class="ap-muted">${esc(when(d))}</span></span><span class="xa-caret-sm">${ic("caret-right", 10)}</span></button>
          ${peek ? illus(st) + (p ? `<blockquote class="xa-passage">${markQuote(p.text, p.quote)}</blockquote><div class="xa-passage-foot"><span class="ap-num">Passage ${pi + 1} of ${d.paras.length}</span><button class="xa-link-btn" data-act="open-dump" data-d="${d.id}" data-para="${pi}">Open in dump</button></div>` : `<blockquote class="xa-passage">${esc(d.paras[0].text)}</blockquote><div class="xa-passage-foot"><span>Opening of the dump</span><button class="xa-link-btn" data-act="open-dump" data-d="${d.id}">Open dump</button></div>`) : ""}</dd></div>
        <div class="xa-f"><dt>Source</dt><dd>${sourceLinks(st, s)}</dd></div>
      </dl>
      ${st.discard[s.id] === "confirm" ? consequence(st, s) : `<div class="xa-acts"><button class="ap-btn x-danger" data-act="discard" data-id="${s.id}" data-key="discard:${s.id}">${ic("trash")} Discard</button><span class="xa-spacer"></span><button class="ap-btn" data-act="merge">${ic("arrows-merge")} Merge</button></div>`}
    </div>`;
  }
  function aDumpBody(st, d) {
    const full = st.full.has(d.id), rest = d.paras.slice(1), restWords = rest.reduce((n, p) => n + W.words(p.text), 0);
    const para = (p, i) => `<p data-para="${d.id}:${i}"${st.hl === `${d.id}:${i}` ? " data-hl" : ""}>${esc(p.text)}</p>`;
    return `<div class="xa-body">
      <section class="xa-sec"><div class="ap-label">Made <span class="ap-num">${d.produced.length}</span></div>${d.produced.map(id => madeRow(id, d.id + ":")).join("")}</section>
      ${voiceRow(d)}${d.links ? `<section class="xa-sec"><div class="ap-label">Links <span class="ap-num">${d.links.length}</span></div>${linksOf(d)}</section>` : ""}
      <section class="xa-sec"><div class="ap-label">${d.kind === "voice" ? "Transcript" : "Text"}</div>
        <div class="xa-text">${para(d.paras[0], 0)}${full ? rest.map((p, i) => para(p, i + 1)).join("") : ""}</div>
        ${rest.length ? `<button class="xa-more" aria-expanded="${full}" data-act="full" data-d="${d.id}" data-key="full:${d.id}">${ic(full ? "caret-down" : "caret-right", 10)} ${full ? "Show less" : "Read the full transcript"}${full ? "" : `<span class="ap-muted ap-num">${plural(rest.length, "more paragraph")}, ${restWords} words</span>`}</button>` : ""}
      </section></div>`;
  }

  /* ── C: provenance trail ──
     One type size (14px). Hierarchy comes from weight and ink. Every trail control is one row variant (.xc-row, 40px min)
     and every icon button is .ap-iconbtn at a 40px hit area. Trailing icons say what a row does:
     arrow-right opens an object here, arrow-square-out leaves the app, dots-three opens a menu. Chevrons only expand or collapse. */
  const cLabel = (name, aside = "") => `<div class="xc-k"><span>${name}</span>${aside ? `<span class="ap-num">${aside}</span>` : ""}</div>`;
  const cDot = (name, self) => `<span class="xc-dot"${self ? " data-self" : ""}>${ic(name, 16)}</span>`;
  const cItem = (attrs, icon, text, first) => `<button role="menuitem" ${attrs}${first ? ` data-key="menu-first"` : ""}>${ic(icon, 16)}<span>${text}</span></button>`;
  const cMenu = (label, items, align = "end", pick = false) => `<div class="xc-menu" role="menu" aria-label="${esc(label)}" data-align="${align}"${pick ? " data-pick" : ""}>${items}</div>`;
  const cChev = (open, key, noun) => `<button class="ap-iconbtn xc-ib x-tog" aria-expanded="${open}" aria-label="${open ? "Collapse" : "Expand"} ${noun}" title="${open ? "Collapse" : "Expand"} (Esc)" data-act="toggle" data-k="${key}" data-key="tog:${key}">${ic(open ? "caret-down" : "caret-right", 16)}</button>`;
  const cMore = (st, s) => {
    const open = st.menu === s.id;
    return `<span class="xc-menu-wrap"><button class="ap-iconbtn xc-ib" aria-haspopup="menu" aria-expanded="${open}" aria-label="More actions" title="More actions" data-act="menu" data-id="${s.id}" data-key="menu:${s.id}">${ic("dots-three", 16)}</button>${open ? cMenu("Signal actions",
      cItem(`data-act="merge"`, "arrows-merge", "Merge with another signal", true) + `<div class="xc-sep" role="separator"></div>` + cItem(`data-act="discard" data-id="${s.id}"`, "trash", "Discard signal")) : ""}</span>`;
  };
  const cFlash = (st, s, field) => { const f = st.flash[s.id]; return f && f.field === field ? `<div class="xc-flash" role="status"><span>${esc(f.msg)}</span><button class="xc-textbtn" data-act="undo" data-id="${s.id}" data-key="undo:${s.id}">Undo</button></div>` : ""; };
  const cMerged = (st, s) => s.merged && !st.unmerged[s.id] ? `<div class="xc-flash"><span>Merged from “${esc(s.merged.from)}”, ${esc(s.merged.at)}</span><button class="xc-textbtn" data-act="unmerge" data-id="${s.id}">Undo merge</button></div>` : "";
  const cIllus = (st, d) => `<p class="xc-illus"><span>${st.real ? `Today's data links a signal to its whole ${d.kind === "voice" ? "voice note" : "dump"}.` : "Illustrative. Quote spans aren't stored yet."}</span> <button class="xc-textbtn" data-act="illus" data-key="illus" aria-pressed="${st.real}">${st.real ? "Show proposed" : "Show today's data"}</button></p>`;
  const cAdd = (st, s, kind, text, menuHtml) => {
    const open = st.picker?.id === s.id && st.picker.kind === kind;
    return `<div class="xc-menu-wrap" data-block><button class="xc-row" data-quiet aria-haspopup="menu" aria-expanded="${open}" data-act="picker" data-pk="${kind}" data-id="${s.id}" data-key="pick:${kind}:${s.id}">${ic("plus", 16)}<span class="xc-row-text">${text}</span></button>${open ? menuHtml() : ""}</div>`;
  };
  function cThemes(st, s, ctx) {
    const rows = themesOf(st, s).map(t => {
      const id = `chip:${s.id}:${t}`, open = st.menu === id;
      return `<div class="xc-menu-wrap" data-block><button class="xc-row" aria-haspopup="menu" aria-expanded="${open}" data-act="menu" data-id="${id}" data-key="menu:${id}"><span class="xc-row-text"><span>${esc(theme(t))}</span>${t === ctx ? `<span class="xc-sub">This theme</span>` : ""}</span>${ic("dots-three", 16)}</button>${open ? cMenu(theme(t),
        cItem(`data-act="open-theme" data-t="${t}"`, "arrow-right", "Open theme", true) + cItem(`data-act="unfile" data-id="${s.id}" data-t="${t}" aria-label="Unfile from ${esc(theme(t))}"`, "minus", "Unfile"), "start") : ""}</div>`;
    }).join("");
    const menu = () => cMenu("File in a theme", Object.keys(W.THEMES).filter(t => !themesOf(st, s).includes(t)).map((t, i) => cItem(`data-act="file" data-id="${s.id}" data-t="${t}"`, "binoculars", esc(theme(t)), i === 0)).join(""), "start", true);
    return `${rows || `<p class="xc-none">Not filed in a theme</p>`}${cAdd(st, s, "file", "File in a theme", menu)}${cFlash(st, s, "themes")}`;
  }
  function cEvidence(st, s) {
    const ev = evOf(st, s), stance = st.stance || "supports";
    const rows = ev.map(e => `<button class="xc-row" data-ev${e.suggested ? " data-suggested" : ""} data-act="open-theory" data-t="${e.theory}"><span class="xc-row-text"><span>${esc(claim(e.theory))}</span><span class="xc-sub xc-stance">${ic(e.stance === "supports" ? "arrow-up" : "arrow-down", 16)}${e.stance === "supports" ? "Supports" : "Undermines"}${e.suggested ? ", suggested" : ""}</span></span>${ic("arrow-right", 16)}</button>`).join("");
    const menu = () => cMenu("Use as evidence", `<div class="xc-seg" role="group" aria-label="Stance">${["supports", "undermines"].map((v, i) => `<button role="menuitemradio" aria-checked="${stance === v}" data-act="stance" data-v="${v}" data-key="${i === 0 ? "menu-first" : `stance:${v}`}">${v === "supports" ? "Supports" : "Undermines"}</button>`).join("")}</div><div class="xc-sep" role="separator"></div>`
      + Object.keys(W.THEORIES).filter(t => !W.THEORIES[t].draft && !ev.some(e => e.theory === t)).map(t => cItem(`data-act="link" data-stance="${stance}" data-id="${s.id}" data-t="${t}"`, stance === "supports" ? "arrow-up" : "arrow-down", esc(claim(t)))).join(""), "start", true);
    return `${rows || `<p class="xc-none">Not evidence for a theory yet</p>`}${cAdd(st, s, "link", "Use as evidence", menu)}${cFlash(st, s, "evidence")}`;
  }
  const cConfirm = (st, s) => {
    const ts = themesOf(st, s), ev = evOf(st, s), d = W.dump(s.dump);
    return `<div class="xc-confirm" role="group" aria-labelledby="cf-${st.id}-${s.id}"><p id="cf-${st.id}-${s.id}"><b>Discard this signal?</b></p><ul>
      <li>${ts.length ? `Leaves ${ts.map(t => esc(theme(t))).join(", ")}` : "It isn't filed in any theme"}</li>
      <li>${ev.length ? `Stops counting as evidence for ${plural(ev.length, "theory", "theories")}; their confidence is recalculated` : "Not evidence for any theory"}</li>
      <li>Agents won't extract it from “${esc(d.first)}” again</li></ul>
      <div class="xc-confirm-acts"><button class="ap-btn xc-btn" data-act="discard-no" data-id="${s.id}" data-key="discard-no:${s.id}">Cancel</button><button class="ap-btn xc-btn" data-primary data-act="discard-yes" data-id="${s.id}">Discard</button></div></div>`;
  };
  function cSignalBody(st, s, ctx) {
    const d = W.dump(s.dump), p = passageOf(st, s), pi = d.paras.indexOf(p), dk = d.kind === "voice" ? "voice note" : "dump";
    const src = s.sources.length
      ? s.sources.map((x, i) => `<li class="xc-node">${cDot("link")}<div class="xc-main">${cLabel(esc(x.author), esc(x.date))}<a class="xc-row" href="${x.url}" target="_blank" rel="noreferrer" aria-label="Open source on ${esc(x.domain)}" aria-describedby="src-${st.id}-${s.id}-${i}"><span class="xc-row-text"><span id="src-${st.id}-${s.id}-${i}">${esc(x.title)}</span><span class="xc-sub">${esc(x.domain)}</span></span>${ic("arrow-square-out", 16)}</a></div></li>`).join("")
      : `<li class="xc-node">${cDot("pencil-ruler")}<div class="xc-main">${cLabel("Your own observation")}</div></li>`;
    const passage = p
      ? `<button class="xc-row" data-act="open-dump" data-d="${d.id}" data-para="${pi}"><span class="xc-row-text"><span class="xc-quote">${esc(p.quote || p.text)}</span><span class="x-sr">Open in the ${dk}</span></span>${ic("arrow-right", 16)}</button>`
      : `<button class="xc-row" data-act="open-dump" data-d="${d.id}"><span class="xc-row-text"><span>${esc(d.first)}</span><span class="x-sr">Open the ${dk}</span></span>${ic("arrow-right", 16)}</button>`;
    return `<div class="xc-body">${st.discard[s.id] === "confirm" ? cConfirm(st, s) : ""}<ol class="xc-trail" aria-label="Where this signal came from and where it goes">
      ${src}
      <li class="xc-node">${cDot(dumpIcon(d))}<div class="xc-main">${cLabel(kindName(d), esc(when(d)))}${passage}${cIllus(st, d)}</div></li>
      <li class="xc-node">${cDot("pulse")}<div class="xc-main">${cLabel("This signal", esc(s.day))}${cMerged(st, s)}${editable("xc-note", "note", s.id, noteOf(st, s), "Note", "Why it matters to you")}</div></li>
      <li class="xc-node">${cDot("binoculars")}<div class="xc-main">${cLabel("Filed in")}${cThemes(st, s, ctx)}</div></li>
      <li class="xc-node">${cDot("target")}<div class="xc-main">${cLabel("Evidence for")}${cEvidence(st, s)}</div></li>
    </ol></div>`;
  }
  const cMade = (id, ctx) => {
    const s = W.signal(id);
    if (s) return `<button class="xc-row" data-act="goto-signal" data-id="${id}" data-key="made:${ctx}${id}">${ic("pulse", 16)}<span class="xc-row-text"><span>${esc(s.gist)}</span><span class="xc-sub">${s.themes.map(theme).join(", ")}</span></span>${ic("arrow-right", 16)}</button>`;
    const t = W.THEORIES[id];
    return t ? `<button class="xc-row" data-suggested data-act="open-theory" data-t="${id}">${ic("target", 16)}<span class="xc-row-text"><span>${esc(t.claim)}</span><span class="xc-sub">Draft theory, suggested</span></span>${ic("arrow-right", 16)}</button>` : "";
  };
  const cVoice = d => d.kind !== "voice" ? "" : `<div class="xc-voice"><button class="cd-play xc-play" aria-label="Play voice note" title="Play" data-act="play">${ic("play", 12)}</button><span class="cd-wave" aria-hidden="true">${wave(30)}</span><span class="ap-num">${d.duration}</span></div>`;
  const cLinks = d => (d.links || []).map(u => `<a class="xc-row" href="https://${u}" target="_blank" rel="noreferrer">${ic("link", 16)}<span class="xc-row-text">${esc(u)}</span>${ic("arrow-square-out", 16)}</a>`).join("");
  function cDumpBody(st, d) {
    const top = `${cVoice(d)}${cLinks(d)}${cIllus(st, d)}`;
    if (st.real) return `<div class="xc-body">${top}<section class="xc-sec">${cLabel("Made", `${d.produced.length}`)}${d.produced.map(id => cMade(id, d.id + ":")).join("")}</section><div class="xc-text">${d.paras.map((p, i) => `<p data-para="${d.id}:${i}">${esc(p.text)}</p>`).join("")}</div></div>`;
    const segs = []; let run = null;
    d.paras.forEach((p, i) => { if (p.made) { run = null; segs.push({ made: true, i }); } else { if (!run) { run = { start: i, idx: [] }; segs.push(run); } run.idx.push(i); } });
    const body = segs.map(sg => {
      if (sg.made) { const p = d.paras[sg.i]; return `<li class="xc-p" data-para="${d.id}:${sg.i}"${st.hl === `${d.id}:${sg.i}` ? " data-hl" : ""}><p>${markQuote(p.text, p.quote)}</p><div class="xc-yield">${p.made.map(id => cMade(id, d.id + ":")).join("")}</div></li>`; }
      const key = `${d.id}:${sg.start}`, open = st.runs.has(key), words = sg.idx.reduce((n, i) => n + W.words(d.paras[i].text), 0);
      return `<li class="xc-p" data-quiet><button class="xc-row xc-run" aria-expanded="${open}" data-act="run" data-run="${key}" data-key="run:${key}">${ic(open ? "caret-down" : "caret-right", 16)}<span class="xc-row-text">${plural(sg.idx.length, "passage")}, nothing extracted</span><span class="ap-num xc-aside">${words} words</span></button>${open ? sg.idx.map(i => `<p data-para="${d.id}:${i}">${esc(d.paras[i].text)}</p>`).join("") : ""}</li>`;
    }).join("");
    return `<div class="xc-body">${top}<ol class="xc-pass" aria-label="Passages and what they made">${body}</ol></div>`;
  }

  /* ── B: documents in the object pane ── */
  const metaRow = (k, v) => `<div class="pn-meta-row"><dt class="ap-muted">${k}</dt><dd>${v}</dd></div>`;
  function signalDoc(st, s, ctx) {
    const d = W.dump(s.dump), p = passageOf(st, s), pi = d.paras.indexOf(p);
    return `<div class="pn-doc">${st.discard[s.id] === "confirm" ? consequence(st, s) : ""}
      ${editable("pn-title", "gist", s.id, gistOf(st, s), "Signal gist")}
      <dl class="pn-meta">
        ${metaRow("Source", s.sources.length ? s.sources.map(x => `<a class="pn-chip" href="${x.url}" target="_blank" rel="noreferrer">${ic("link")}${esc(x.domain)}, ${esc(x.author)}</a>`).join("") : `<span class="ap-muted">Your own observation</span>`)}
        ${metaRow("From", `<button class="pn-chip pn-origin" data-act="open-dump" data-d="${d.id}" data-para="${pi}">${ic(dumpIcon(d))}<span>${esc(d.first)}</span></button>`)}
        ${metaRow("Themes", `<div style="display:grid;gap:4px;width:100%">${themeChips(st, s, ctx)}</div>`)}
        ${metaRow("Theories", `<div style="display:grid;gap:2px;width:100%">${evidenceRows(st, s)}</div>`)}
        ${metaRow("Seen", `<span class="ap-num">${esc(s.day)}</span>`)}
      </dl>
      ${editable("pn-body", "note", s.id, noteOf(st, s), "Note", "Add a note")}
      ${s.sources.length ? `<section class="xb-sec"><div class="ap-label">${ic("quotes")} What the source says</div>${s.sources.map(x => `<blockquote class="xb-q">${esc(x.title)}</blockquote>`).join("")}${merged(st, s)}</section>` : ""}
      <section class="xb-sec"><div class="ap-label">${ic(dumpIcon(d))} ${p ? `In your ${d.kind === "voice" ? "voice note" : "dump"}, passage ${pi + 1} of ${d.paras.length}` : `Your ${d.kind === "voice" ? "voice note" : "dump"}, opening`}</div>${illus(st)}<blockquote class="xb-q">${p ? markQuote(p.text, p.quote) : esc(d.paras[0].text)}</blockquote><div><button class="xa-link-btn" data-act="open-dump" data-d="${d.id}"${p ? ` data-para="${pi}"` : ""}>Read the whole ${d.kind === "voice" ? "note" : "dump"}</button></div></section>
    </div>`;
  }
  function dumpDoc(st, d) {
    return `<div class="pn-doc">
      <h1 class="pn-title" style="font-size:22px">${esc(d.first)}</h1>
      <dl class="pn-meta">${metaRow("Captured", esc(when(d)))}${metaRow("Kind", `<span class="ap-num">${kindName(d)}${d.duration ? `, ${d.duration}` : ""}, ${wordsOf(d)} words</span>`)}</dl>
      <section class="xb-sec"><div class="ap-label">Made <span class="ap-muted">${esc(madeSummary(d))}</span></div><div class="xb-made">${d.produced.map(id => madeRow(id, "doc:")).join("")}</div></section>
      ${voiceRow(d)}${d.links ? `<section class="xb-sec"><div class="ap-label">Links</div>${linksOf(d)}</section>` : ""}
      <section class="xb-sec"><div class="ap-label">${d.kind === "voice" ? "Transcript" : "Text"}</div>${illus(st, "Margin marks and underlines")}<div class="xb-text">${d.paras.map((p, i) => `<p data-para="${d.id}:${i}"${st.hl === `${d.id}:${i}` ? " data-hl" : ""}>${p.made && !st.real ? `<button class="ap-iconbtn xb-gut" data-act="goto-signal" data-id="${p.made[0]}" aria-label="Made: ${esc(W.signal(p.made[0])?.gist)}" title="Made: ${esc(W.signal(p.made[0])?.gist)}">${ic("pulse", 13)}</button>` : ""}${markQ(st, p.text, p.quote)}</p>`).join("")}</div></section>
    </div>`;
  }
  function themeDoc(st) {
    return `<div class="pn-doc"><div class="pn-edit pn-title" contenteditable="plaintext-only" role="textbox" aria-label="Theme name">${esc(theme(FEED.theme))}</div>
      <p class="x-desc">Interfaces for agents beyond the chat box: canvases, boards, voice.</p>
      <div class="ap-label">Signals <span class="ap-num">14</span></div>
      <div class="pn-feed">${FEED.days.map(([day, ids]) => `<div class="pn-feed-day"><span class="ap-label pn-feed-date">${day}</span><div class="pn-col" style="display:grid;gap:2px">${ids.map(id => feedRow(st, W.signal(id))).join("")}</div></div>`).join("")}</div>
    </div>`;
  }
  function pane(st, inStage) {
    const top = paneTop(st); if (!top) return "";
    const back = st.pane.length > 1 ? st.pane[st.pane.length - 2] : null;
    const label = top.k === "signal" ? "Signal" : top.k === "dump" ? "Dump" : "Theme";
    const backLabel = back && (back.k === "theme" ? theme(back.id) : back.k === "dump" ? W.dump(back.id).first : W.signal(back.id).gist);
    const doc = top.k === "signal" ? signalDoc(st, W.signal(top.id), st.surface === "feed" ? FEED.theme : null) : top.k === "dump" ? dumpDoc(st, W.dump(top.id)) : themeDoc(st);
    const acts = top.k === "signal" && st.discard[top.id] !== "confirm" ? `<button class="ap-btn x-danger" data-act="discard" data-id="${top.id}" data-key="discard:${top.id}">${ic("trash")} Discard</button><button class="ap-btn" data-act="merge">${ic("arrows-merge")} Merge</button>` : "";
    const close = inStage ? "" : `<button class="ap-iconbtn" aria-label="Close pane" data-act="close" data-key="close">${ic("x", 14)}</button>`;
    const bar = top.k === "theme" ? "" : `<div class="xb-bar">${back ? `<button class="xb-back" data-act="back" data-key="back">${ic("arrow-right", 12, "rotate:180deg")}<span>${esc(backLabel)}</span></button>` : `<span class="ap-label">${ic(top.k === "signal" ? "pulse" : "tray-arrow-down")} ${label}</span>`}<span class="xb-sp"></span>${acts}${close}</div>`;
    return `<aside class="${inStage ? "" : "xb-pane"}" aria-label="${label}" tabindex="-1" data-key="pane"${inStage ? "" : ` data-scroll="pane"`}>${bar}${doc}</aside>`;
  }

  /* ── Rows ── */
  // A and C rows expand in place, so the chevron is always visible: caret-right at rest, caret-down when open, same corner.
  const rowChev = o => `<span class="x-chev" aria-hidden="true">${ic("caret-right", o === "C" ? 16 : 14)}</span>`;
  function signalItem(st, s) {
    const key = `signal:${s.id}`, open = st.open.has(key), o = st.opt;
    if (st.discard[s.id] === "done") return tomb(st, s, o === "current");
    const face = `<span class="cd-line">${o === "current" || !open ? fresh(s) : ""}<span>${esc(gistOf(st, s))}</span></span><span class="ap-muted cd-sub">${esc(s.source)}</span>`;
    if (o === "current") return `<div class="cd-item" data-item="${key}"${open ? " data-open" : ""}><button class="cd-item-btn" data-act="toggle" data-k="${key}" data-key="tog:${key}">${face}</button>${open ? grow(st, key, curSignalDetail(st, s), "cd-detail") : ""}</div>`;
    if (o === "B") { const cur = paneTop(st)?.k === "signal" && paneTop(st).id === s.id; return `<div class="cd-item" data-item="${key}"${cur ? " data-current" : ""}><button class="cd-item-btn" data-act="openpane" data-k="${key}" data-key="tog:${key}" aria-controls="pane-${st.id}"${cur ? ` aria-current="true"` : ""}>${face}</button></div>`; }
    if (!open) return `<div class="cd-item" data-x="${o}" data-item="${key}"><button class="cd-item-btn x-tog" aria-expanded="false" data-act="toggle" data-k="${key}" data-key="tog:${key}">${face}${rowChev(o)}<span class="x-sr">, expand</span></button></div>`;
    const caret = `<button class="ap-iconbtn x-tog" aria-expanded="true" aria-label="Collapse signal" data-act="toggle" data-k="${key}" data-key="tog:${key}">${ic("caret-down", 14)}</button>`;
    const gist = editable("xa-gist", "gist", s.id, gistOf(st, s), "Signal gist");
    const head = o === "A" ? `<div class="xa-head">${gist}${caret}</div>` : `<div class="xc-head">${gist}${cMore(st, s)}${cChev(true, key, "signal")}</div>`;
    return `<div class="cd-item" data-x="${o}" data-open data-item="${key}">${head}${grow(st, key, o === "A" ? aSignalBody(st, s) : cSignalBody(st, s))}</div>`;
  }
  function feedRow(st, s) {
    const key = `signal:${s.id}`, open = st.open.has(key), o = st.opt;
    if (st.discard[s.id] === "done") return tomb(st, s, o === "current");
    const glyph = `<span class="pn-feed-glyph">${ic(/\./.test(s.source) ? "link" : "text-align-left", 14)}${!open || o === "current" ? fresh(s) : ""}</span>`;
    const ev = evOf(st, s);
    const face = `${glyph}<span class="pn-feed-text"><span>${esc(gistOf(st, s))}</span><span class="ap-muted">${esc(s.source)}</span></span>${ev.length ? `<span class="pn-feed-to">${ev.map(e => `<span class="pn-feed-chip"${e.suggested ? " data-suggested" : ""}>${ic(e.stance === "supports" ? "arrow-up" : "arrow-down")}<span>${esc(claim(e.theory))}</span></span>`).join("")}</span>` : ""}`;
    if (o === "current") return `<div class="pn-sig" data-item="${key}"${open ? " data-open" : ""}><button class="pn-ev" data-act="toggle" data-k="${key}" data-key="tog:${key}">${face}</button>${open ? grow(st, key, curSignalDetail(st, s, FEED.theme), "pn-detail") : ""}</div>`;
    if (o === "B") return `<div class="pn-sig" data-item="${key}"><button class="pn-ev" data-act="openpane" data-k="${key}" data-key="tog:${key}">${face}</button></div>`;
    if (!open) return `<div class="pn-sig" data-x="${o}" data-item="${key}"><button class="pn-ev x-tog" aria-expanded="false" data-act="toggle" data-k="${key}" data-key="tog:${key}">${face}${rowChev(o)}<span class="x-sr">, expand</span></button></div>`;
    const caret = `<button class="ap-iconbtn x-tog" aria-expanded="true" aria-label="Collapse signal" data-act="toggle" data-k="${key}" data-key="tog:${key}">${ic("caret-down", 14)}</button>`;
    const gist = editable("xa-gist", "gist", s.id, gistOf(st, s), "Signal gist");
    const head = o === "A" ? `<div class="xa-head">${glyph}${gist}${caret}</div>` : `<div class="xc-head">${glyph}${gist}${cMore(st, s)}${cChev(true, key, "signal")}</div>`;
    return `<div class="pn-sig" data-x="${o}" data-open data-item="${key}">${head}${grow(st, key, o === "A" ? aSignalBody(st, s, FEED.theme) : cSignalBody(st, s, FEED.theme))}</div>`;
  }
  function dumpItem(st, d) {
    const key = `dump:${d.id}`, open = st.open.has(key), o = st.opt;
    const sub = `${esc(d.day === "Today" ? d.time : d.day)}${o === "current" ? "" : `, made ${d.produced.length}`}`;
    const face = `<span class="cd-line">${ic(dumpIcon(d), o === "C" ? 16 : 14)}<span${o === "C" ? "" : ` class="cd-clip"`}>${esc(d.first)}</span></span><span class="ap-muted ap-num cd-sub">${sub}</span>`;
    if (o === "current") return `<div class="cd-item" data-item="${key}"${open ? " data-open" : ""}><button class="cd-item-btn" data-act="toggle" data-k="${key}" data-key="tog:${key}">${face}</button>${open ? grow(st, key, curDumpDetail(st, d), "cd-detail") : ""}</div>`;
    if (o === "B") { const cur = paneTop(st)?.k === "dump" && paneTop(st).id === d.id; return `<div class="cd-item" data-item="${key}"${cur ? " data-current" : ""}><button class="cd-item-btn" data-act="openpane" data-k="${key}" data-key="tog:${key}" aria-controls="pane-${st.id}"${cur ? ` aria-current="true"` : ""}>${face}</button></div>`; }
    if (!open) return `<div class="cd-item" data-x="${o}" data-item="${key}"><button class="cd-item-btn x-tog" aria-expanded="false" data-act="toggle" data-k="${key}" data-key="tog:${key}">${face}${rowChev(o)}<span class="x-sr">, expand</span></button></div>`;
    const head = o === "C"
      ? `<div class="xc-head" data-dump>${ic(dumpIcon(d), 16)}<div class="xa-title">${esc(d.first)}</div>${cChev(true, key, "dump")}</div>
      <div class="xc-meta ap-num"><span>${kindName(d)}${d.duration ? `, ${d.duration}` : ""}, ${wordsOf(d)} words</span><span>${esc(when(d))}</span></div>`
      : `<div class="xa-head" data-dump>${ic(dumpIcon(d), 14)}<div class="xa-title">${esc(d.first)}</div><button class="ap-iconbtn x-tog" aria-expanded="true" aria-label="Collapse dump" data-act="toggle" data-k="${key}" data-key="tog:${key}">${ic("caret-down", 14)}</button></div>
      <div class="xa-meta ap-muted ap-num">${kindName(d)}${d.duration ? `, ${d.duration}` : ""}, ${wordsOf(d)} words, ${esc(when(d))}</div>`;
    return `<div class="cd-item" data-x="${o}" data-open data-item="${key}">${head}${grow(st, key, o === "A" ? aDumpBody(st, d) : cDumpBody(st, d))}</div>`;
  }
  function column(st, kind) {
    const name = kind === "dump" ? "Dumps" : "Signals", icon = kind === "dump" ? "tray-arrow-down" : "pulse";
    const shown = st.show.has(kind);
    const items = kind === "dump" ? W.DUMPS.map(d => dumpItem(st, d)) : W.SIGNALS.map(s => signalItem(st, s));
    return `<div class="cd-col" data-kind="${kind}"${shown ? " data-show" : ""}><div class="cd-inner"><header class="cd-head">${ic(icon, 14)}<span>${name}</span><button class="cd-colhead-toggle" data-act="showcol" data-col="${kind}" aria-expanded="${shown}">${ic(shown ? "caret-down" : "caret-right", 16)}<span>${shown ? "Hide" : "Show"}</span></button></header>
      <div class="cd-list-wrap"><div class="cd-list ap-scroll" data-scroll="col-${kind}">${items.join("")}</div></div></div></div>`;
  }
  function modal(st) {
    const d = W.dump(st.modal);
    // Rebuilt from inspectDump (dialogs.tsx:99): read-only, max-height 65dvh, scrolls inside.
    return `<div class="x-modal-back"><div class="x-modal" role="dialog" aria-modal="true" aria-label="${esc(d.first)}" data-current-trap tabindex="-1" data-key="modal"><h2>${esc(d.first)}</h2><div class="ab-dump-content">${esc(d.paras.map(p => p.text).join(" "))}</div><div class="x-modal-acts"><button class="ap-btn" data-act="modal-close">Close</button></div></div></div>`;
  }
  function html(st) {
    const toast = `<div class="x-toast" role="status" aria-live="polite"></div>`;
    if (st.surface === "feed") return `<div class="ap ab-production"><div class="x-feedstage" data-scroll="feed" id="pane-${st.id}">${pane(st, true)}</div>${st.modal ? modal(st) : ""}${toast}</div>`;
    return `<div class="ap ab-production x-cols"><div class="cd"><div class="cd-row">${column(st, "dump")}${column(st, "signal")}</div></div>${st.opt === "B" && st.pane.length ? pane(st, false).replace("<aside ", `<aside id="pane-${st.id}" `) : ""}${toast}</div>`;
  }

  /* ── Render ── */
  function render(st, focusKey) {
    const saved = {};
    st.el.querySelectorAll("[data-scroll]").forEach(x => { saved[x.dataset.scroll] = x.scrollTop; });
    st.el.innerHTML = html(st);
    st.el.querySelectorAll("[data-scroll]").forEach(x => { if (saved[x.dataset.scroll] != null) x.scrollTop = saved[x.dataset.scroll]; });
    if (focusKey) st.el.querySelector(`[data-key="${CSS.escape(focusKey)}"]`)?.focus({ preventScroll: true });
    if (st.scrollTo) { const t = st.el.querySelector(st.scrollTo); if (t) reveal(t); st.scrollTo = null; }
    if (st.opt === "C") { const m = st.el.querySelector(".xc-menu, .xc-confirm"); if (m) nearest(m); }
    st.enter = null;
  }
  function nearest(t) {
    const sc = t.closest("[data-scroll]");
    if (!sc || sc.scrollHeight <= sc.clientHeight + 1 || getComputedStyle(sc).overflowY === "visible") return;
    const s = sc.getBoundingClientRect(), pad = 8, top = t.getBoundingClientRect().top, r = { top, bottom: top + t.offsetHeight };
    if (r.bottom > s.bottom - pad) sc.scrollTop += Math.min(r.bottom - s.bottom + pad, r.top - s.top - pad);
    else if (r.top < s.top + pad) sc.scrollTop -= s.top + pad - r.top;
  }
  function reveal(t) {
    const sc = t.closest("[data-scroll]");
    if (sc && sc.scrollHeight > sc.clientHeight + 1 && getComputedStyle(sc).overflowY !== "visible") {
      const r = t.getBoundingClientRect(), s = sc.getBoundingClientRect();
      sc.scrollTo({ top: sc.scrollTop + r.top - s.top - 56, behavior: reduce.matches ? "auto" : "smooth" });
    } else t.scrollIntoView({ block: "center", behavior: reduce.matches ? "auto" : "smooth" });
  }
  const timers = new WeakMap();
  function toast(st, msg, action) {
    const t = st.el.querySelector(".x-toast"); if (!t) return;
    t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button data-act="${action.act}" data-id="${action.id}">${esc(action.label)}</button>` : ""}`;
    clearTimeout(timers.get(st)); timers.set(st, setTimeout(() => { t.innerHTML = ""; }, action ? 6000 : 3200));
  }

  /* ── Actions ── */
  const kindOf = k => k.split(":");
  function setOpen(st, key) { const [kind] = kindOf(key); [...st.open].filter(x => x.startsWith(kind + ":")).forEach(x => st.open.delete(x)); st.open.add(key); st.enter = key; }
  function toggle(st, key) {
    if (st.open.has(key)) {
      const g = st.el.querySelector(`[data-item="${key}"] > .x-grow`);
      const done = () => { st.open.delete(key); st.menu = null; st.picker = null; render(st, `tog:${key}`); };
      if (g && !reduce.matches) { g.removeAttribute("data-enter"); g.setAttribute("data-leave", ""); setTimeout(done, 150); } else done();
    } else { setOpen(st, key); st.menu = null; st.picker = null; render(st, `tog:${key}`); }
  }
  function openDump(st, id, para) {
    const hl = para != null && para !== "" && para !== "-1" ? `${id}:${para}` : null;
    if (st.surface === "feed" || st.opt === "B") {
      if (st.surface === "feed" && st.opt === "current") { st.modal = id; render(st, "modal"); return; }
      st.pane.push({ k: "dump", id }); if (st.surface !== "feed" && st.pane.length > 1 && st.pane[st.pane.length - 2].k === "dump" && st.pane[st.pane.length - 2].id === id) st.pane.pop();
      st.hl = hl; st.scrollTo = hl ? `[data-para="${hl}"]` : null; render(st, "pane"); return;
    }
    setOpen(st, `dump:${id}`); st.show.add("dump"); st.hl = st.opt === "current" ? null : hl;
    if (st.opt === "A" && hl && hl !== `${id}:0`) st.full.add(id);
    st.scrollTo = st.hl ? `[data-para="${st.hl}"]` : `[data-item="dump:${id}"]`;
    render(st, `tog:dump:${id}`);
  }
  function gotoSignal(st, id) {
    if (st.opt === "B") { st.pane.push({ k: "signal", id }); render(st, "pane"); return; }
    if (st.surface === "feed") {
      const inFeed = FEED.days.some(([, ids]) => ids.includes(id));
      if (inFeed) { st.pane = [st.pane[0]]; setOpen(st, `signal:${id}`); st.scrollTo = `[data-item="signal:${id}"]`; render(st, `tog:signal:${id}`); }
      else { st.pane.push({ k: "signal", id }); render(st, "pane"); }
      return;
    }
    setOpen(st, `signal:${id}`); st.show.add("signal"); st.scrollTo = `[data-item="signal:${id}"]`; render(st, `tog:signal:${id}`);
  }
  const ACT = {
    toggle: (st, b) => toggle(st, b.dataset.k),
    openpane: (st, b) => { const [k, id] = kindOf(b.dataset.k); if (st.surface === "feed") st.pane.push({ k, id }); else st.pane = [{ k, id }]; st.hl = null; st.lastRow = b.dataset.k; render(st, "pane"); st.el.querySelector("[data-scroll=pane], [data-scroll=feed]")?.scrollTo(0, 0); },
    back: st => { const was = st.pane.pop(); render(st, st.pane.length === 1 && st.surface === "feed" ? `tog:${was.k}:${was.id}` : "pane"); },
    close: st => { st.pane = []; render(st, `tog:${st.lastRow || "signal:s12"}`); },
    "open-dump": (st, b) => openDump(st, b.dataset.d, b.dataset.para),
    "goto-signal": (st, b) => gotoSignal(st, b.dataset.id),
    peek: (st, b) => { const id = b.dataset.id; st.peek.has(id) ? st.peek.delete(id) : st.peek.add(id); render(st, `peek:${id}`); },
    full: (st, b) => { const id = b.dataset.d, was = st.full.has(id); was ? st.full.delete(id) : st.full.add(id); render(st, `full:${id}`); if (was) reveal(st.el.querySelector(`[data-key="full:${id}"]`)); },
    run: (st, b) => { const k = b.dataset.run; st.runs.has(k) ? st.runs.delete(k) : st.runs.add(k); render(st, `run:${k}`); },
    showcol: (st, b) => { const c = b.dataset.col; st.show.has(c) ? st.show.delete(c) : st.show.add(c); render(st); },
    picker: (st, b) => { const id = b.dataset.id, kind = b.dataset.pk; st.menu = null; st.picker = st.picker?.id === id && st.picker.kind === kind ? null : { id, kind }; render(st, st.picker ? (st.opt === "C" ? "menu-first" : "picker-first") : `pick:${kind}:${id}`); },
    "picker-close": (st, b) => { const p = st.picker; st.picker = null; render(st, p ? `pick:${p.kind}:${p.id}` : null); },
    file: (st, b) => { const s = W.signal(b.dataset.id); st.themes[s.id] = [...themesOf(st, s), b.dataset.t]; st.picker = null; st.flash[s.id] = { field: "themes", msg: `Filed in ${theme(b.dataset.t)}.`, undo: { type: "unfile", t: b.dataset.t } }; render(st, `undo:${s.id}`); },
    illus: st => { st.real = !st.real; st.hl = st.real ? null : st.hl; render(st, "illus"); },
    "edit-themes": (st, b) => { const id = b.dataset.id; st.editThemes.has(id) ? st.editThemes.delete(id) : st.editThemes.add(id); render(st, `edit-themes:${id}`); },
    unfile: (st, b) => { st.menu = null; const s = W.signal(b.dataset.id), t = b.dataset.t; st.themes[s.id] = themesOf(st, s).filter(x => x !== t); st.flash[s.id] = { field: "themes", msg: `Unfiled from ${theme(t)}. It stays in Signals.`, undo: { type: "file", t } }; render(st, `undo:${s.id}`); },
    link: (st, b) => { const s = W.signal(b.dataset.id); st.evidence[s.id] = [...evOf(st, s), { theory: b.dataset.t, stance: b.dataset.stance }]; st.picker = null; st.flash[s.id] = { field: "evidence", msg: `Now ${b.dataset.stance === "supports" ? "supports" : "undermines"} “${claim(b.dataset.t)}”.`, undo: { type: "unlink", t: b.dataset.t } }; render(st, `undo:${s.id}`); },
    undo: (st, b) => { const s = W.signal(b.dataset.id), u = st.flash[s.id]?.undo; if (!u) return;
      if (u.type === "file") st.themes[s.id] = [...themesOf(st, s), u.t];
      if (u.type === "unfile") st.themes[s.id] = themesOf(st, s).filter(x => x !== u.t);
      if (u.type === "unlink") st.evidence[s.id] = evOf(st, s).filter(e => e.theory !== u.t);
      delete st.flash[s.id]; render(st, `pick:file:${s.id}`); },
    stance: (st, b) => { st.stance = b.dataset.v; render(st, b.dataset.v === "supports" ? "menu-first" : "stance:undermines"); },
    menu: (st, b) => { const id = b.dataset.id; st.menu = st.menu === id ? null : id; render(st, st.menu ? "menu-first" : `menu:${id}`); },
    discard: (st, b) => { st.menu = null; st.picker = null; st.discard[b.dataset.id] = "confirm"; render(st, `discard-no:${b.dataset.id}`); },
    "discard-no": (st, b) => { delete st.discard[b.dataset.id]; render(st, st.opt === "C" ? `menu:${b.dataset.id}` : `discard:${b.dataset.id}`); },
    "discard-yes": (st, b) => { const id = b.dataset.id; st.discard[id] = "done"; st.open.delete(`signal:${id}`); if (st.opt === "B") { st.pane = st.surface === "feed" ? [st.pane[0]] : []; } render(st, `undiscard:${id}`); },
    undiscard: (st, b) => { delete st.discard[b.dataset.id]; render(st, `tog:signal:${b.dataset.id}`); },
    "cur-discard": (st, b) => { const id = b.dataset.id; st.discard[id] = "done"; st.open.delete(`signal:${id}`); render(st, `undiscard:${id}`); toast(st, "Discarded at once: no confirmation, no consequence shown, no undo (current behaviour)."); },
    "cur-ask": (st, b) => toast(st, b.dataset.msg),
    merge: st => { st.menu = null; render(st); toast(st, "Opens the existing two-step merge dialog (signal-merge.tsx): pick a candidate, then review sources."); },
    unmerge: (st, b) => { st.unmerged[b.dataset.id] = true; render(st); toast(st, "Merge undone: the absorbed signal is restored."); },
    "open-theme": (st, b) => { if (st.menu) { st.menu = null; render(st); } toast(st, `Opens the theme pane: ${theme(b.dataset.t)}`); },
    "open-theory": (st, b) => toast(st, `Opens the theory pane: ${claim(b.dataset.t)}`),
    play: st => toast(st, "Plays the recording."),
    "modal-close": st => { st.modal = null; render(st, "origin:s12"); },
  };

  document.addEventListener("click", e => {
    const reset = e.target.closest("[data-reset]");
    if (reset) { const el = document.querySelector(`[data-stage="${reset.dataset.reset}"]`); STATES.delete(el); init(el); return; }
    const b = e.target.closest("[data-act]"); if (!b) return;
    const stEl = b.closest("[data-stage]"); const st = stEl && STATES.get(stEl); if (!st) return;
    const f = ACT[b.dataset.act]; if (!f) return;
    e.preventDefault(); f(st, b);
  });
  document.addEventListener("input", e => {
    const el = e.target.closest?.("[data-edit]"); const stEl = el?.closest("[data-stage]"); if (!el || !stEl) return;
    const st = STATES.get(stEl), id = el.dataset.id;
    (el.dataset.edit === "note" ? st.notes : st.gists)[id] = el.textContent;
  });
  document.addEventListener("animationend", e => { e.target.removeAttribute?.("data-enter"); });
  document.addEventListener("keydown", e => {
    const stEl = e.target.closest?.("[data-stage]"); const st = stEl && STATES.get(stEl); if (!st) return;
    if (e.target.matches('[role^="menuitem"]') && /^Arrow(Up|Down)$/.test(e.key)) {
      const items = [...e.target.closest('[role="menu"]').querySelectorAll('[role^="menuitem"]')], i = items.indexOf(e.target);
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus(); e.preventDefault(); return;
    }
    if (e.key !== "Escape") return;
    e.preventDefault();
    if (st.menu) { const id = st.menu; st.menu = null; render(st, `menu:${id}`); return; }
    if (st.picker) { const p = st.picker; st.picker = null; render(st, `pick:${p.kind}:${p.id}`); return; }
    const confirming = Object.keys(st.discard).find(k => st.discard[k] === "confirm");
    if (confirming) { delete st.discard[confirming]; render(st, st.opt === "C" ? `menu:${confirming}` : `discard:${confirming}`); return; }
    if (st.modal) { st.modal = null; render(st, "origin:s12"); return; }
    if (st.opt === "B" && e.target.closest("aside")) {
      if (st.pane.length > 1) ACT.back(st); else if (st.surface !== "feed") ACT.close(st);
      return;
    }
    if (st.opt === "current") return; // the app has no Escape-to-collapse today
    const item = e.target.closest("[data-item]");
    if (item && st.open.has(item.dataset.item)) toggle(st, item.dataset.item);
  });

  document.querySelectorAll("[data-stage]").forEach(init);
})();
