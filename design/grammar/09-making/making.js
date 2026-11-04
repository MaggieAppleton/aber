// Grammar 09: making things in the type-first default view. Every flow here is live: capture a dump (text, links, voice),
// create a theme, create a theory inside a theme, add a signal as evidence, rename, accept or discard a draft, delete a dump.
// Usage: <div class="mk-host" data-mk='{"type":"theme","sel":"coi","opt":{"unnamed":"untitled"},"scene":"picker"}'></div>
// The window renders at 1280 × 760 and zooms to fit its host; data-crop="composer" shows its bottom-right corner at full size.
(() => {
  const TYPES = {
    theme: { name: "Themes", one: "theme", icon: "binoculars" }, theory: { name: "Theories", one: "theory", icon: "target" },
    prototype: { name: "Prototypes", one: "prototype", icon: "pencil-ruler" }, signal: { name: "Signals", one: "signal", icon: "pulse" },
    dump: { name: "Dumps", one: "dump", icon: "tray-arrow-down" }, suggestion: { icon: "sparkle" },
  };
  const RAIL = ["theme", "theory", "prototype", "signal", "dump"];
  const MAKE = ["theme", "theory", "prototype"];
  const DAYS = ["Today", "Yesterday", "Monday 2 Nov", "Sunday 1 Nov"];
  const OPT = { unnamed: "untitled", draftEdit: "accept", evAdd: "two" };
  const PH = { theme: "Name this theme", theory: "State the claim", prototype: "Name this prototype", signal: "Say what you saw" };
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  /* ── Atoms ─────────────────────────────────────────── */
  const g = (t, draft) => `<span class="g${draft ? " draft" : ""}" data-type="${t}"><i class="ph ph-${TYPES[t].icon}" aria-hidden="true"></i></span>`;
  const ic = (n, fill) => `<i class="ph${fill ? "-fill" : ""} ph-${n}" aria-hidden="true"></i>`;
  const ib = (icon, label, attr = "", key = "") => `<button type="button" class="nv-ib" aria-label="${label}" data-tip="${label}"${key ? ` data-key="${key}"` : ""} ${attr}>${ic(icon)}</button>`;
  const conf = n => `<span class="nv-conf lg" role="img" aria-label="Confidence ${n} of 5">${[1, 2, 3, 4, 5].map(i => `<i${i <= n ? " data-on" : ""}></i>`).join("")}</span>`;
  // No new dots on objects or rail tiles (decided 4 Nov).
  const nameOf = o => o.name || `Untitled ${TYPES[o.kind].one}`;
  const chip = o => `<button type="button" class="ctl-chip ob-chip"${o.draft ? " data-draft" : ""} data-go-to="${o.id}">${g(o.kind, o.draft)}<span class="t">${esc(nameOf(o))}</span></button>`;
  // 06 objects (decided): rows and cards from _shared/objects.css. Previews show a 20 × 4 confidence meter; the full view keeps the five-segment setter.
  const meter = n => `<span class="ob-meter" role="img" aria-label="${n ? `Confidence ${n} of 5` : "No confidence yet"}"><i style="width:${(n || 0) * 20}%"></i></span>`;
  const keyOf = (s, o) => o.kind === "theme" ? (o.draft ? "" : `<span class="kv"><span class="ob-n">${theoriesOf(s, o).length || ""}</span></span>`)
    : o.kind === "signal" ? `<span class="kv"><span class="ob-src">${esc(o.src)}</span></span>`
    : o.kind === "dump" ? `<span class="kv"><span class="nv-mono">${o.time}</span></span>` : "";
  // A preview row: tile, name, key value. act: "sel" (the list) or "go" (a relation inside a full view)
  const orow = (s, o, { cur, act = "go", kv = true, cls = "", attr = "" } = {}) => {
    const label = o.kind === "theme" || o.kind === "prototype", k = kv ? keyOf(s, o) : "";
    const rk = o.kind === "theory" ? `<span class="ob-rk">${meter(o.draft ? 0 : o.c)}</span>` : "";
    return `<div class="ob-row${label ? " one label" : ""}${rk ? " has-rk" : ""}${!k && !rk ? " solo" : ""}${o.draft ? " draft" : ""}${o.fresh ? " unseen" : ""}${o.name ? "" : " untitled"}${cls ? ` ${cls}` : ""}"${o.id === cur ? ' aria-current="true"' : ""} ${attr}>${g(o.kind, o.draft)}<button type="button" class="nm" ${act === "sel" ? `data-sel="${o.id}"` : `data-go-to="${o.id}"`}>${esc(nameOf(o))}</button>${rk}${k}</div>`;
  };

  /* ── Relations ─────────────────────────────────────── */
  const all = (s, k) => Object.values(s.O).filter(o => o.kind === k && !o.gone);
  const theoriesOf = (s, th) => all(s, "theory").filter(t => t.themes.includes(th.id));
  const signalsOf = (s, th) => all(s, "signal").filter(x => x.themes.includes(th.id));
  const evFor = (s, sig) => all(s, "theory").flatMap(t => t.ev.filter(e => e[0] === sig.id && !e[2]).map(e => [t, e[1]]));
  const countOf = (s, t) => all(s, t).length;

  /* ── Rail ──────────────────────────────────────────── */
  const rail = s => `<aside class="nv-rail">
      <div class="nv-brand"><span>Aber</span>${ib("magnifying-glass", "Find", "", "⌘K")}</div>
      <nav class="nv-types" aria-label="Types">${RAIL.map(t => `<button type="button" class="nv-type" data-go="${t}" aria-current="${s.type === t}"><span class="gw">${g(t)}</span><span class="nm">${TYPES[t].name}</span><span class="nv-n">${countOf(s, t)}</span></button>`).join("")}</nav>
      <div class="nv-switch" role="group" aria-label="Views">${[["rows", "Default", "⌘1"], ["columns", "Columns", "⌘2"], ["map-trifold", "Atlas", "⌘3"], ["chart-scatter", "Timeline", "⌘4"]].map(([i, l, k], n) =>
        `<button type="button" aria-pressed="${n === 0}" aria-label="${l}" data-tip="${l}" data-key="${k}">${ic(i, n === 0)}</button>`).join("")}</div>
    </aside>`;

  /* ── List (rows are placeholders: 06 Objects designs them) ── */
  const list = s => {
    const t = s.type, cur = s.sel;
    const row = o => orow(s, o, { cur, act: "sel", kv: !(o.kind === "prototype" || o.draft || o.kind === "signal" && false) });
    const group = (label, rows) => rows.length ? `<div class="ob-group">${label ? `<div class="ob-glabel"><span>${label}</span></div>` : ""}${rows.map(row).join("")}</div>` : "";
    const xs = all(s, t);
    let body = "";
    if (t === "theme") body = group("", xs.filter(o => !o.draft)) + group("Drafts", xs.filter(o => o.draft));
    else if (t === "theory") body = group("Held", xs.filter(o => !o.draft)) + group("Drafts", xs.filter(o => o.draft));
    else if (t === "prototype") body = ["Building", "Idea", "Built"].map(k => group(k, xs.filter(o => o.status === k && !o.draft))).join("") + group("Drafts", xs.filter(o => o.draft));
    else body = DAYS.map((d, i) => group(d, xs.filter(o => o.day === i))).join("");
    const add = MAKE.includes(t) ? ib("plus", `New ${TYPES[t].one}`, "data-new", "N") : "";
    return `<section class="nv-list ob-list" aria-label="${TYPES[t].name}">
        <div class="nv-lhead"><span class="h">${TYPES[t].name}</span><span class="nv-meta">${xs.length}</span>${add}</div>
        <div class="nv-scroll ob-scroll">${body}</div></section>`;
  };

  /* ── Title: always an editable field, prose until clicked ── */
  const title = (s, o, key = "") => {
    const editable = o.kind !== "dump";
    const err = s.err === o.id;
    return `<header class="nv-head">${g(o.kind, o.draft)}<div class="mk-titlewrap">
      <h3 class="nv-title mk-title${o.draft ? " draft" : ""}${s.focusCls === "title" ? " is-focus" : ""}" ${editable ? `contenteditable="plaintext-only" role="textbox" aria-label="${o.kind === "theory" ? "Claim" : "Name"}" data-title="${o.id}" data-placeholder="${PH[o.kind]}"${err ? ` aria-invalid="true" aria-describedby="mk-err-${o.id}"` : ""} spellcheck="false"` : ""}>${esc(o.name)}</h3>
      <div class="mk-msg" data-msg="${o.id}" aria-live="polite">${err ? errLine(o) : dupLine(s, o)}</div>${key ? `<div class="nv-sub">${key}</div>` : ""}</div></header>`;
  };
  const errLine = o => `<p class="mk-err" id="mk-err-${o.id}">${ic("warning-circle")}<span>Name this ${TYPES[o.kind].one} to keep it</span><button type="button" class="nv-btn quiet mk-quiet" data-discard-new="${o.id}">Discard</button></p>`;
  const dupLine = (s, o) => {
    if (o.kind !== "theme" || !o.name.trim()) return "";
    const twin = all(s, "theme").find(x => x !== o && x.name.toLowerCase() === o.name.trim().toLowerCase());
    return twin ? `<p class="mk-dup"><span>A theme with this name already exists</span>${chip(twin)}</p>` : "";
  };

  /* ── Draft bar: agent-made, not yet mine. Discard left of Accept. ── */
  // A draft (agent-made, not yet mine): Discard | Accept at the top right of its full view (06), "Draft" as a dashed tag with its dump in the key line
  const draftVerbs = o => o.draft ? `<span class="ctl nv-decide mk-verbs"><button type="button" class="nv-btn secondary" data-draft-no="${o.id}">Discard</button><button type="button" class="nv-btn primary" data-draft-yes="${o.id}">Accept</button></span>` : "";
  const draftKey = (s, o) => o.draft ? `<span class="mk-draftkey"><span class="mk-tag">Draft</span><span>from</span>${chip(s.O[o.from])}</span>` : "";

  /* ── Full views ────────────────────────────────────── */
  const evItem = (s, t, e) => {
    const x = s.O[e[0]], sug = e[2] === "suggested", just = s.just === `${t.id}:${x.id}`;
    const r = orow(s, x, { cls: `mk-ev${just ? " mk-just" : ""}`, attr: `data-ev="${x.id}"` });
    return sug ? `<div class="ob-block sug mk-sug"><div class="ob-blabel">Suggested by agent</div>${r}
      <div class="ob-decide"><button type="button" class="nv-btn secondary" data-sug-no="${x.id}">Dismiss</button><button type="button" class="nv-btn primary" data-sug-yes="${x.id}">Accept</button></div></div>` : r;
  };
  const evidence = (s, t) => {
    const two = s.opt.evAdd === "two";
    const col = (st, label) => {
      const items = t.ev.filter(e => e[1] === st).sort((x, y) => !!y[2] - !!x[2]);   // a suggestion sits first in the group it would join (06)
      const n = items.filter(e => !e[2]).length;
      return `<section class="nv-section"><div class="nv-shead"><span>${label}</span>${n ? `<span class="nv-meta">${n}</span>` : ""}${two ? `<span class="mk-evadd">${ib("plus", st === "+" ? "Add support" : "Add undermining", `data-ev-add="${st}"`)}</span>` : ""}</div>
        ${items.length ? `<div class="ob-rows">${items.map(e => evItem(s, t, e)).join("")}</div>` : `<p class="mk-none">None yet</p>`}</section>`;
    };
    return `${two ? "" : `<div class="nv-shead mk-evsec"><span>Evidence</span><span class="mk-evadd">${ib("plus", "Add evidence", 'data-ev-add="any"')}</span></div>`}${col("+", "Supports")}${col("-", "Undermines")}`;
  };
  const card = (s, t) => `<div class="ob-card has-rk${t.draft ? " draft" : ""}">${g("theory", t.draft)}<button type="button" class="nm" data-go-to="${t.id}">${esc(nameOf(t))}</button><span class="ob-rk">${meter(t.draft ? 0 : t.c)}</span></div>`;
  const newCard = (s, th) => s.cardFor === th.id ? `<div class="ob-card has-rk mk-newcard">${g("theory")}<div class="nm mk-cardname${s.focusCls === "card" ? " is-focus" : ""}" contenteditable="plaintext-only" role="textbox" aria-label="Claim" data-card="${th.id}" data-placeholder="State the claim" spellcheck="false">${esc(s.cardText || "")}</div><span class="ob-rk">${meter(0)}</span></div>` : "";
  const cnt = (icon, n, label) => `<span class="ob-cnt" role="img" aria-label="${n} ${label}"><i class="ph ph-${icon}" aria-hidden="true"></i>${n}</span>`;
  const themesSec = (s, o) => o.themes.length ? `<section class="nv-section"><div class="nv-shead"><span>Themes</span></div><div class="nv-chips">${o.themes.map(id => chip(s.O[id])).join("")}</div></section>` : "";

  // Full view (06): verbs at the top right; the 32 title tile and the title, the key line under it (no labels); prose; then relation sections
  const doc = (s, o) => {
    const ctl = o.kind === "dump" ? `<span class="ctl">${ib("trash", "Delete dump", `data-del="${o.id}"`)}</span>` : "";
    let key = "", body = "";
    if (o.kind === "theme") {
      const ts = theoriesOf(s, o), sg = signalsOf(s, o);
      key = `${draftKey(s, o)}<span class="ob-cnts">${cnt("target", ts.length, "theories")}${cnt("pulse", o.signals ?? sg.length, "signals")}</span>`;
      body = `<section class="nv-section"><div class="nv-shead"><span>Theories</span>${ts.length ? `<span class="nv-meta">${ts.length}</span>` : ""}</div>
          ${ts.length || s.cardFor === o.id ? `<div class="ob-cards">${ts.map(t => card(s, t)).join("")}${newCard(s, o)}</div>` : ""}
          ${s.cardFor === o.id ? "" : `<button type="button" class="mk-add" data-add-theory="${o.id}">${ic("plus")}<span>Add theory</span></button>`}</section>
        <section class="nv-section"><div class="nv-shead"><span>Signals</span>${sg.length ? `<span class="nv-meta">${sg.length}</span>` : ""}</div>
          ${sg.length ? `<div class="ob-rows">${sg.map(x => orow(s, x)).join("")}</div>` : `<p class="nv-empty mk-empty">No signals yet</p>`}</section>`;
    } else if (o.kind === "theory") {
      key = `${draftKey(s, o)}${o.draft ? "" : conf(o.c || 0)}<span>By ${o.by}</span>`;
      body = `<div class="mk-note${s.focusCls === "note" ? " is-focus" : ""}" contenteditable="plaintext-only" role="textbox" aria-multiline="true" aria-label="Note" data-note="${o.id}" data-placeholder="Add a note">${esc(o.note || "")}</div>
        ${evidence(s, o)}${themesSec(s, o)}`;
    } else if (o.kind === "prototype") {
      key = `${draftKey(s, o)}<span>${o.status}</span>`;
      body = `<div class="mk-note" contenteditable="plaintext-only" role="textbox" aria-multiline="true" aria-label="Notes" data-note="${o.id}" data-placeholder="What it is and what you learned">${esc(o.note || "")}</div>
        <section class="nv-section"><div class="nv-shead"><span>Tests</span><span class="nv-meta">${o.tests.length}</span></div><div class="ob-rows">${o.tests.map(id => orow(s, s.O[id])).join("")}</div></section>`;
    } else if (o.kind === "signal") {
      const ev = evFor(s, o), from = all(s, "dump").filter(d => d.made.includes(o.id));
      key = `<span>${esc(o.src)}</span><span>${DAYS[o.day]}</span>`;
      const evSec = (st, label) => { const xs = ev.filter(([, x]) => x === st); return xs.length ? `<section class="nv-section"><div class="nv-shead"><span>${label}</span><span class="nv-meta">${xs.length}</span></div><div class="ob-rows">${xs.map(([t]) => orow(s, t)).join("")}</div></section>` : ""; };
      body = `${ev.length ? evSec("+", "Supports") + evSec("-", "Undermines") : `<section class="nv-section"><div class="nv-shead"><span>Supports</span></div><p class="nv-empty mk-empty">Not evidence for a theory</p></section>`}
        ${themesSec(s, o)}
        <section class="nv-section"><div class="nv-shead"><span>Came from</span></div>${from.length ? `<div class="ob-rows">${from.map(d => orow(s, d)).join("")}</div>` : "<p class='mk-none'>Unknown</p>"}</section>`;
    } else if (o.kind === "dump") {
      key = `<span class="nv-mono">${o.time}</span><span>${DAYS[o.day]}</span><span>${esc(o.via)}</span>${o.len ? `<span class="nv-mono">${o.len}</span>` : ""}`;
      const made = o.made.map(id => s.O[id]).filter(x => !x.gone);
      body = `<p class="nv-note">${esc(o.text)}</p>
        <section class="nv-section"><div class="nv-shead"><span>Made</span><span class="nv-meta">${made.length}</span></div>
          ${made.length ? `<div class="ob-rows">${made.map(x => orow(s, x)).join("")}</div>` : `<p class="nv-empty mk-empty">${o.processing ? "Working on it" : "Nothing yet"}</p>`}</section>`;
    }
    return `<article class="nv-doc nv-full${o.solid ? " mk-solidify" : ""}"><div class="nv-top">${ctl}${draftVerbs(o)}</div>${title(s, o, key)}${body}</article>`;
  };

  /* ── Composer: the dump-or-ask bar (05 anatomy) and its states ── */
  const mmss = sec => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
  const ATT_ICON = { link: "link", image: "image", voice: "waveform" };
  const composer = s => {
    const c = s.comp;
    if (c.rec) return `<form class="ctl-composer mk-comp" data-rec aria-label="Recording a voice dump" onsubmit="return false">
        ${`<button type="button" class="ctl-icon" aria-label="Discard take" data-tip="Discard take" data-key="Esc" data-rec-no>${ic("trash")}</button>`}
        <span class="mk-wave" aria-hidden="true">${Array.from({ length: 28 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</span>
        <span class="mk-time nv-mono" data-time>${mmss(c.rec.sec || 0)}</span>
        <button type="button" class="ctl-icon primary" aria-label="Stop and send" data-tip="Stop and send" data-key="⏎" data-rec-stop${c.busy ? ' aria-busy="true"' : ""}>${ic("stop", true)}${c.busy ? `<span class="ctl-spin">${ic("circle-notch")}</span>` : ""}</button></form>`;
    const ready = c.text.trim() || c.atts.length;
    return `<form class="ctl-composer mk-comp${c.atts.length ? " has-atts" : ""}" aria-label="Dump or ask" onsubmit="return false">
        ${c.atts.length ? `<div class="mk-atts">${c.atts.map(a => `<span class="mk-att">${ic(ATT_ICON[a.kind])}<span class="t">${esc(a.title)}</span><button type="button" class="rm" aria-label="Remove ${esc(a.title)}" data-att-rm="${a.id}"${c.busy ? ' aria-disabled="true"' : ""}>${ic("minus")}</button></span>`).join("")}</div>` : ""}
        <button type="button" class="ctl-icon" aria-label="Voice dump" data-tip="Voice dump" data-key="⌘⇧J" data-rec-start${c.busy ? ' aria-disabled="true"' : ""}>${ic("microphone")}</button>
        <textarea rows="1" placeholder="Dump or ask" aria-label="Dump or ask" data-comp${c.busy ? " readonly" : ""}${s.focusCls === "comp" ? ' class="is-focus"' : ""}>${esc(c.text)}</textarea>
        <button type="button" class="ctl-icon" aria-label="Attach" data-tip="Attach" data-attach${c.busy ? ' aria-disabled="true"' : ""}>${ic("paperclip")}</button>
        <button type="button" class="ctl-icon primary" aria-label="Send" data-tip="Send" data-key="⏎" data-send aria-disabled="${!ready}"${c.busy ? ' aria-busy="true"' : ""}>${ic("paper-plane-right")}${c.busy ? `<span class="ctl-spin">${ic("circle-notch")}</span>` : ""}</button></form>`;
  };

  /* ── Transient layers: one at a time (picker, modal, toast) ── */
  const toast = s => s.toast ? `<div class="mk-toast" role="status"><span class="t">${esc(s.toast.text)}</span>${s.toast.undo ? `<button type="button" class="mk-undo" data-undo>Undo<kbd>⌘Z</kbd></button>` : ""}</div>` : "";
  const modal = s => {
    if (!s.modal) return "";
    const d = s.O[s.modal];
    return `<div class="mk-scrim" data-modal-close></div><div class="mk-modal" role="dialog" aria-modal="true" aria-labelledby="mk-mt" aria-describedby="mk-md">
        <div class="mk-mhead"><h2 id="mk-mt">Delete this dump?</h2>${ib("x", "Close", "data-modal-close", "Esc")}</div>
        <p id="mk-md">“${esc(d.name)}” goes to the bin for 30 days. It removes ${d.made.length} things made only from it.</p>
        <div class="mk-mfoot"><button type="button" class="nv-btn secondary" data-modal-close>Cancel</button><button type="button" class="nv-btn primary" data-del-yes="${d.id}">Delete dump</button></div></div>`;
  };
  const picker = s => {
    if (!s.pop) return "";
    const t = s.O[s.sel], q = s.pop.q.toLowerCase(), linked = new Set(t.ev.map(e => e[0]));
    const pool = all(s, "signal").filter(x => !linked.has(x.id) && x.name.toLowerCase().includes(q));
    const near = pool.filter(x => x.themes.some(id => t.themes.includes(id))), rest = pool.filter(x => !near.includes(x));
    s.pop.opts = [...near, ...rest].map(x => x.id);
    const opt = x => `<button type="button" class="mk-opt" role="option" id="mk-o-${x.id}" data-opt="${x.id}" aria-selected="${s.pop.opts[s.pop.i] === x.id}">${g("signal")}<span class="t">${esc(x.name)}</span><span class="src">${esc(x.src)}</span></button>`;
    const grp = (label, xs) => xs.length ? `<div class="mk-ogroup" role="group" aria-label="${label}"><div class="nv-glabel">${label}</div>${xs.map(opt).join("")}</div>` : "";
    const st = s.pop.st;
    return `<div class="mk-pop" role="dialog" aria-label="${st === "-" ? "Add undermining" : st === "+" ? "Add support" : "Add evidence"}">
        ${s.pop.any ? `<div class="ctl-seg mk-stance" role="radiogroup" aria-label="Stance"><button type="button" role="radio" aria-checked="${st === "+"}" aria-pressed="${st === "+"}" data-stance="+">${ic("arrow-up")}Supports</button><button type="button" role="radio" aria-checked="${st === "-"}" aria-pressed="${st === "-"}" data-stance="-">${ic("arrow-down")}Undermines</button></div>` : ""}
        <label class="ctl-field mk-find">${ic("magnifying-glass")}<input data-pq type="search" placeholder="Find a signal" value="${esc(s.pop.q)}" aria-label="Find a signal" role="combobox" aria-expanded="true" aria-controls="mk-olist-${s.uid}" aria-activedescendant="${s.pop.opts[s.pop.i] ? `mk-o-${s.pop.opts[s.pop.i]}` : ""}" autocomplete="off"></label>
        <div class="mk-olist" id="mk-olist-${s.uid}" role="listbox">${grp(t.themes.length ? `In ${esc(s.O[t.themes[0]].name)}` : "Signals", near)}${grp("Other signals", rest)}${pool.length ? "" : `<p class="mk-none">No signals match</p>`}</div></div>`;
  };

  /* ── Frame ─────────────────────────────────────────── */
  const frame = s => {
    const o = s.O[s.sel];
    return `<div class="nv mk" data-v="A" style="grid-template-columns:var(--nv-rail-w) 280px minmax(0,1fr)">${rail(s)}${list(s)}
      <main class="nv-main"><div class="nv-scroller">${o && !o.gone ? doc(s, o) : `<p class="nv-empty mk-empty mk-nothing">Nothing selected</p>`}</div></main>
      ${composer(s)}${picker(s)}${toast(s)}${modal(s)}</div>`;
  };

  /* ── Render and placement ─────────────────────────── */
  const local = (base, el) => { const br = base.getBoundingClientRect(), k = br.width / base.offsetWidth || 1, r = el.getBoundingClientRect();
    return { x: (r.left - br.left) / k, y: (r.top - br.top) / k, w: r.width / k, h: r.height / k }; };
  const fit = host => { const el = host.firstElementChild; if (!el || host.dataset.crop) return; el.style.zoom = Math.min(1, host.clientWidth / 1280); };
  const ro = new ResizeObserver(es => es.forEach(e => fit(e.target)));
  const place = host => {
    const s = host._s, nv = host.querySelector(".nv"), comp = nv.querySelector(".mk-comp"), t = nv.querySelector(".mk-toast");
    if (t) t.style.bottom = `${12 + comp.offsetHeight + 8}px`;
    const pop = nv.querySelector(".mk-pop");
    if (pop) {
      const trig = nv.querySelector(s.pop.any ? '[data-ev-add="any"]' : `[data-ev-add="${s.pop.st}"]`); if (!trig) return;
      const r = local(nv, trig), main = local(nv, nv.querySelector(".nv-main")), ol = pop.querySelector(".mk-olist");
      ol.style.maxHeight = `${Math.max(120, Math.min(300, nv.offsetHeight - (r.y + r.h + 4) - (pop.offsetHeight - ol.offsetHeight) - 12))}px`;
      const left = Math.max(main.x + 12, Math.min(main.x + main.w - pop.offsetWidth - 12, r.x + r.w - pop.offsetWidth + 6));
      Object.assign(pop.style, { left: `${left}px`, top: `${r.y + r.h + 4}px`, transformOrigin: `${r.x + r.w / 2 - left}px 0` });
      trig.setAttribute("aria-expanded", "true");
    }
  };
  const render = (host, focus) => {
    const s = host._s;
    const keep = [...host.querySelectorAll(".nv-scroll, .nv-scroller")].map(el => el.scrollTop);
    host.innerHTML = frame(s); fit(host);
    host.querySelectorAll(".nv-scroll, .nv-scroller").forEach((el, i) => el.scrollTop = keep[i] || 0);
    place(host);
    if (focus) { const el = host.querySelector(focus); if (el) { el.focus({ preventScroll: !host.dataset.live }); caretEnd(el); } }
  };
  const caretEnd = el => {
    if (el.isContentEditable) { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }
    else if (el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length);
  };

  /* ── Toasts: one line, Undo, just above the composer; one at a time ── */
  const say = (host, text, undo) => {
    const s = host._s; clearTimeout(s.toastT);
    s.toast = { text, undo }; s.pop = null;
    const inComp = document.activeElement?.matches?.("[data-comp]") && host.contains(document.activeElement);
    render(host, inComp ? "[data-comp]" : null);
    s.toastT = setTimeout(() => hideToast(host), 5000);
  };
  // Leaving never re-renders, so a toast that times out can't take the caret from whatever you're typing in
  const hideToast = host => { const s = host._s; if (s.hovering) { s.toastT = setTimeout(() => hideToast(host), 1500); return; } s.toast = null; host.querySelector(".mk-toast")?.remove(); };
  const undo = host => { const s = host._s; if (!s.toast?.undo) return false; const fn = s.toast.undo; clearTimeout(s.toastT); s.toast = null; fn(); return true; };

  /* ── Making ────────────────────────────────────────── */
  let nid = 0;
  const leave = host => {   // Called before any navigation. Returns false to stay (hold with an inline error).
    const s = host._s, o = s.O[s.newId];
    if (!o || o.gone) { s.newId = null; return true; }
    if (o.name.trim()) { o.isNew = false; s.newId = null; return true; }
    const content = (o.note || "").trim();
    if (!content) { o.gone = true; s.newId = null; return true; }   // nothing to lose: it just goes
    if (s.opt.unnamed === "hold") { s.err = o.id; render(host, `[data-title="${o.id}"]`); return false; }
    o.isNew = false; s.newId = null;
    const back = { type: o.kind, sel: o.id };
    queueMicrotask(() => say(host, `Kept as Untitled ${TYPES[o.kind].one}`, () => { s.type = back.type; s.sel = back.sel; s.newId = o.id; o.isNew = true; render(host, `[data-title="${o.id}"]`); }));
    return true;
  };
  const go = (host, id) => { const s = host._s, o = s.O[id]; if (!o || o.gone || id === s.sel) return; if (!leave(host)) return; s.err = null; s.pop = null; s.type = o.kind; s.sel = id; s.cardFor = null; render(host); host.querySelector(".nv-scroller").scrollTop = 0; };
  const newObject = (host, kind) => {
    const s = host._s; if (!leave(host)) return;
    const id = `n${++nid}`;
    const o = { id, kind, name: "", isNew: true, themes: [], ev: [], by: new Date().getFullYear() + 2, status: "Idea", tests: [], signals: 0 };
    s.O = { [id]: o, ...s.O }; s.type = kind; s.sel = id; s.newId = id; s.err = null; s.pop = null;
    render(host, `[data-title="${id}"]`);
  };
  const commitTitle = (host, el, how) => {
    const s = host._s, o = s.O[el.dataset.title]; if (!o) return;
    const text = el.textContent.replace(/\s+/g, " ").trim(), orig = el.dataset.orig ?? o.name;
    if (how === "revert") { o.name = orig; el.textContent = orig; syncRow(host, o); if (o.isNew && !orig && !(o.note || "").trim()) { o.gone = true; s.newId = null; s.sel = Object.values(s.O).find(x => x.kind === o.kind && !x.gone)?.id; render(host); } el.blur(); return; }
    if (!text && !o.isNew) { o.name = orig; el.textContent = orig; syncRow(host, o); return; }   // a blank rename keeps the old name
    o.name = text; el.textContent = text;
    if (o.isNew && text) { o.isNew = false; s.newId = null; s.err = null; }
    if (o.draft && text !== orig && s.opt.draftEdit === "accept") { const old = orig; void old; accept(host, o); return; }
    if (o.draft && text !== orig) o.edited = true;
    if (s.err === o.id && text) { s.err = null; render(host); }
  };
  const syncRow = (host, o) => { const r = host.querySelector(`[data-sel="${o.id}"]`)?.closest(".ob-row"); if (!r) return; r.classList.toggle("untitled", !o.name.trim()); r.querySelector(".nm").textContent = o.name.trim() || `Untitled ${TYPES[o.kind].one}`; };
  const accept = (host, o, text = `${TYPES[o.kind].one[0].toUpperCase()}${TYPES[o.kind].one.slice(1)} accepted`, revert) => {
    // Success is silent (10 States): the dashes going is the feedback, so no toast
    o.draft = false; o.solid = true; if (o.kind === "theory") o.c = 0; void text; void revert;
    render(host);
    setTimeout(() => { o.solid = false; }, 400);
  };
  const addEvidence = (host, sid, st) => {
    const s = host._s, t = s.O[s.sel];
    t.ev.push([sid, st]); s.just = `${t.id}:${sid}`; s.pop = null;
    render(host, `[data-ev-add="${s.opt.evAdd === "one" ? "any" : st}"]`);   // the row appears where it will stay; no toast
    setTimeout(() => { if (s.just === `${t.id}:${sid}`) s.just = null; }, 1600);
  };

  /* ── Capture ───────────────────────────────────────── */
  const send = host => {
    const s = host._s, c = s.comp; if (c.busy || (!c.text.trim() && !c.atts.length)) return;
    c.busy = true; render(host);
    setTimeout(() => {
      const text = c.text.trim(), atts = c.atts, voice = atts.find(a => a.kind === "voice");
      const d = { id: `d${++nid}x`, kind: "dump", name: text.split("\n")[0].slice(0, 64) || (voice ? "Voice note" : atts[0]?.title) || "Dump", day: 0,
        time: new Date().toTimeString().slice(0, 5), via: "Dump or ask", made: [], text: text || atts.map(a => a.title).join(", "), len: voice?.len, fresh: true, processing: true };
      s.O = { [d.id]: d, ...s.O }; s.fresh.dump = true;
      c.text = ""; c.atts = []; c.busy = false;
      say(host, text.includes("?") ? "Asked" : voice && !text ? "Voice note saved" : "Dump saved", () => { d.gone = true; s.fresh.dump = false; c.text = text; c.atts = atts; render(host, "[data-comp]"); });
      if (host.dataset.live) host.querySelector("[data-comp]")?.focus({ preventScroll: true });
    }, 650);
  };
  const recStart = host => {
    const s = host._s; s.comp.rec = { t0: Date.now(), sec: 0 }; render(host);
    s.recT = setInterval(() => { const r = s.comp.rec; if (!r) return clearInterval(s.recT); r.sec = (Date.now() - r.t0) / 1000; const el = host.querySelector("[data-time]"); if (el) el.textContent = mmss(r.sec); }, 250);
    host.querySelector("[data-rec-stop]")?.focus({ preventScroll: true });
  };
  const recStop = (host, keep) => {
    const s = host._s, r = s.comp.rec; if (!r) return; clearInterval(s.recT);
    const len = mmss(Math.max(1, r.sec));
    if (!keep) { s.comp.rec = null; say(host, "Take discarded", () => { s.comp.atts.push({ id: `a${++nid}`, kind: "voice", title: `Voice note ${len}`, len }); render(host, "[data-comp]"); }); return; }
    s.comp.rec = null; s.comp.atts.push({ id: `a${++nid}`, kind: "voice", title: `Voice note ${len}`, len }); send(host);
  };

  /* ── Tooltips: name, then key; after 500ms ─────────── */
  let tipT;
  const showTip = btn => {
    const nv = btn.closest(".nv"); if (!nv) return; nv.querySelector(".nv-tip")?.remove();
    const t = document.createElement("div"); t.className = "nv-tip"; t.setAttribute("role", "tooltip");
    t.innerHTML = `<span>${btn.dataset.tip}</span>${btn.dataset.key ? `<kbd>${btn.dataset.key}</kbd>` : ""}`; nv.append(t);
    const r = local(nv, btn), tw = t.offsetWidth, th = t.offsetHeight;
    let top = r.y + r.h + 4; if (btn.closest(".nv-switch, .mk-comp")) top = r.y - th - 4;
    Object.assign(t.style, { left: `${Math.max(4, Math.min(nv.offsetWidth - tw - 4, r.x + r.w / 2 - tw / 2))}px`, top: `${top}px` });
  };
  document.addEventListener("pointerover", e => { const b = e.target.closest(".mk [data-tip]"); if (!b) return; clearTimeout(tipT); tipT = setTimeout(() => b.isConnected && showTip(b), 500); });
  document.addEventListener("pointerout", e => { const b = e.target.closest(".mk [data-tip]"); if (!b) return; clearTimeout(tipT); b.closest(".nv")?.querySelector(".nv-tip")?.remove(); });

  /* ── Scenes: a window set to one step of a flow ───── */
  const scene = (host, name) => {
    const s = host._s, nv = () => host.querySelector(".nv");
    const at = {
      "comp-typing": () => { s.comp.text = "Cloud provider now bundles a million free tokens. Routine calls are basically free?"; s.focusCls = "comp"; },
      "comp-attach": () => { s.comp.text = "Two more on falling prices"; s.comp.atts = [{ id: "a1", kind: "link", title: "theinformation.com" }, { id: "a2", kind: "image", title: "Price chart.png" }]; s.focusCls = "comp"; },
      "comp-rec": () => { s.comp.rec = { t0: Date.now() - 7000, sec: 7 }; },
      "comp-sending": () => { s.comp.text = "Cloud provider now bundles a million free tokens"; s.comp.busy = true; },
      "comp-sent": () => { s.toast = { text: "Dump saved", undo: () => {} }; },
      "new-theme": () => { const id = "n0"; s.O = { [id]: { id, kind: "theme", name: "Robots in the home", isNew: true, themes: [], ev: [], signals: 0 }, ...s.O }; s.type = "theme"; s.sel = id; s.newId = id; s.focusCls = "title"; },
      "dup-theme": () => { const id = "n0"; s.O = { [id]: { id, kind: "theme", name: "Agent memory", isNew: true, themes: [], ev: [], signals: 0 }, ...s.O }; s.type = "theme"; s.sel = id; s.newId = id; s.focusCls = "title"; },
      "new-card": () => { s.cardFor = s.sel; s.cardText = "Inference becomes a utility line item"; s.focusCls = "card"; },
      "rename": () => { s.focusCls = "title"; },
      "picker": () => { s.pop = { st: "+", any: s.opt.evAdd === "one", q: "", i: 0 }; },
      "linked": () => { const t = s.O[s.sel]; t.ev.push(["s14", "+"]); s.just = `${t.id}:s14`; },
      "unnamed": () => { const id = "n0"; s.O = { [id]: { id, kind: "theory", name: "", themes: ["coi"], ev: [], by: 2028, note: "Inference stops being a line item anyone budgets for. It folds into the cost of the cloud account." }, ...s.O }; s.type = "theory";
        if (s.opt.unnamed === "hold") { s.sel = id; s.newId = id; s.err = id; } else { s.sel = "t1"; s.toast = { text: "Kept as Untitled theory", undo: () => {} }; } },
      "draft-edit": () => { const t = s.O.t11; t.name = "Local models absorb most routine agent work"; if (s.opt.draftEdit === "accept") { t.draft = false; t.c = 0; t.solid = true; } else { t.edited = true; s.focusCls = ""; } },
      "modal": () => { s.modal = s.sel; },
    }[name];
    at?.(); render(host); void nv;
  };

  /* ── Init and events ──────────────────────────────── */
  let uid = 0, active = null;
  const init = host => {
    const o = JSON.parse(host.dataset.mk || "{}");
    const s = host._s = { uid: ++uid, O: window.MkSeed(), type: o.type || "theme", sel: o.sel || "coi", opt: { ...OPT, ...(o.opt || {}) }, fresh: { signal: true },
      comp: { text: "", atts: [], rec: null, busy: false }, toast: null, pop: null, modal: null, err: null, newId: null, cardFor: null };
    if (host.dataset.crop) host.classList.add("mk-crop");
    render(host); ro.observe(host);
    if (o.scene) document.fonts.ready.then(() => scene(host, o.scene));
    host.addEventListener("pointerdown", () => { active = host; });
    host.addEventListener("focusin", () => { active = host; });
    host.addEventListener("pointerenter", e => { if (e.target.closest?.(".mk-toast")) s.hovering = true; }, true);
    host.addEventListener("pointerleave", e => { if (e.target.closest?.(".mk-toast")) s.hovering = false; }, true);

    host.addEventListener("click", e => {
      const s = host._s, el = e.target.closest("button, [data-modal-close]"); if (!el || !host.contains(el)) { if (s.pop && !e.target.closest(".mk-pop")) { s.pop = null; render(host); } return; }
      const d = el.dataset;
      if (el.getAttribute("aria-disabled") === "true") return;
      if (s.pop && !el.closest(".mk-pop") && !("evAdd" in d)) s.pop = null;
      if (s.focusCls) s.focusCls = "";
      if (d.go) { if (!leave(host)) return; s.type = d.go; s.err = null; const first = all(s, d.go)[0]; s.sel = first?.id; s.cardFor = null; render(host); }
      else if (d.sel) go(host, d.sel);
      else if (d.goTo) go(host, d.goTo);
      else if ("new" in d) newObject(host, s.type);
      else if (d.discardNew) { const o = s.O[d.discardNew]; o.gone = true; s.newId = null; s.err = null; s.sel = all(s, o.kind)[0]?.id; say(host, `${TYPES[o.kind].one[0].toUpperCase()}${TYPES[o.kind].one.slice(1)} discarded`, () => { o.gone = false; s.sel = o.id; s.newId = o.id; render(host, `[data-title="${o.id}"]`); }); }
      else if (d.addTheory) { s.cardFor = d.addTheory; s.cardText = ""; render(host, `[data-card="${d.addTheory}"]`); }
      else if (d.evAdd) { if (s.pop) { s.pop = null; render(host); return; } s.pop = { st: d.evAdd === "any" ? "+" : d.evAdd, any: d.evAdd === "any", q: "", i: 0 }; render(host, "[data-pq]"); }
      else if (d.stance) { s.pop.st = d.stance; render(host, "[data-pq]"); }
      else if (d.opt) addEvidence(host, d.opt, s.pop.st);
      else if (d.sugYes) { const t = s.O[s.sel], e = t.ev.find(x => x[0] === d.sugYes); e.length = 2; s.just = `${t.id}:${d.sugYes}`; render(host); }
      else if (d.sugNo) { const t = s.O[s.sel], e = t.ev.find(x => x[0] === d.sugNo); t.ev = t.ev.filter(x => x !== e); say(host, "Suggestion dismissed", () => { t.ev.push(e); render(host); }); }
      else if (d.draftYes) accept(host, s.O[d.draftYes]);
      else if (d.draftNo) { const o = s.O[d.draftNo]; o.gone = true; s.sel = all(s, o.kind)[0]?.id; say(host, "Draft discarded", () => { o.gone = false; s.sel = o.id; render(host); }); }
      else if (d.del) { s.modal = d.del; render(host, ".mk-modal .nv-btn.secondary"); }
      else if ("modalClose" in d) { const id = s.modal; s.modal = null; render(host, `[data-del="${id}"]`); }
      else if (d.delYes) { const o = s.O[d.delYes]; o.gone = true; s.modal = null; s.sel = all(s, "dump")[0]?.id; render(host); }   // confirmed, so no toast after (10 States rule 7)
      else if ("undo" in d) undo(host);
      else if ("send" in d) send(host);
      else if ("attach" in d) { s.comp.atts.push({ id: `a${++nid}`, kind: "image", title: "Screenshot 09.41.png" }); render(host, "[data-comp]"); }
      else if (d.attRm) { s.comp.atts = s.comp.atts.filter(a => a.id !== d.attRm); render(host, "[data-comp]"); }
      else if ("recStart" in d) recStart(host);
      else if ("recStop" in d) recStop(host, true);
      else if ("recNo" in d) recStop(host, false);
    });
    host.addEventListener("dblclick", e => { const r = e.target.closest("[data-sel]"); if (r) { const t = host.querySelector(`[data-title="${r.dataset.sel}"]`); t?.focus(); t && caretEnd(t); } });
    host.addEventListener("focusin", e => { const t = e.target.closest("[data-title]"); if (t) t.dataset.orig = s.O[t.dataset.title]?.name ?? ""; });
    host.addEventListener("focusout", e => {
      const t = e.target.closest("[data-title]"); if (t && t.isConnected) { commitTitle(host, t); delete t.dataset.orig; }
      const c = e.target.closest("[data-card]"); if (c && !c.dataset.done && c.isConnected && !(e.relatedTarget && c.contains(e.relatedTarget))) cardDone(host, c, false);
    });
    host.addEventListener("input", e => {
      const s = host._s, t = e.target;
      if (t.matches("[data-title]")) { const o = s.O[t.dataset.title]; o.name = t.textContent.replace(/\s+/g, " "); syncRow(host, o); const m = host.querySelector(`[data-msg="${o.id}"]`);
        if (s.err === o.id && o.name.trim()) { s.err = null; t.removeAttribute("aria-invalid"); }
        if (m && s.err !== o.id) m.innerHTML = dupLine(s, o); }
      else if (t.matches("[data-note]")) s.O[t.dataset.note].note = t.textContent;
      else if (t.matches("[data-card]")) s.cardText = t.textContent;
      else if (t.matches("[data-comp]")) {
        const m = t.value.match(/(^|\s)(https?:\/\/(\S+))\s$/);
        if (m) { s.comp.atts.push({ id: `a${++nid}`, kind: "link", title: m[3].replace(/\/.*$/, "") }); s.comp.text = t.value.slice(0, m.index + m[1].length); render(host, "[data-comp]"); return; }
        s.comp.text = t.value; host.querySelector("[data-send]").setAttribute("aria-disabled", String(!(t.value.trim() || s.comp.atts.length)));
      }
      else if (t.matches("[data-pq]")) { s.pop.q = t.value; s.pop.i = 0; render(host, "[data-pq]"); }
    });
    host.addEventListener("keydown", e => {
      const s = host._s, t = e.target;
      if (t.matches("[data-title]")) {
        if (e.key === "Enter") { e.preventDefault(); t.blur(); }
        else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); commitTitle(host, t, "revert"); }
      } else if (t.matches("[data-card]")) {
        if (e.key === "Enter") { e.preventDefault(); cardDone(host, t, true, e.metaKey || e.ctrlKey); }
        else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); t.textContent = ""; cardDone(host, t, false); }
      } else if (t.matches("[data-comp]")) {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(host); }
        else if (e.key === "Escape") { e.stopPropagation(); t.blur(); }
      } else if (t.matches("[data-pq]")) {
        const n = s.pop.opts.length;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); s.pop.i = (s.pop.i + (e.key === "ArrowDown" ? 1 : -1) + n) % n; render(host, "[data-pq]"); host.querySelector(".mk-opt[aria-selected='true']")?.scrollIntoView({ block: "nearest" }); }
        else if (e.key === "Enter") { e.preventDefault(); const id = s.pop.opts[s.pop.i]; if (id) addEvidence(host, id, s.pop.st); }
        else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); const st = s.pop.any ? "any" : s.pop.st; s.pop = null; render(host, `[data-ev-add="${st}"]`); }
      } else if (e.key === "F2" && t.matches("[data-sel]")) { e.preventDefault(); const x = host.querySelector(`[data-title="${t.dataset.sel}"]`); x?.focus(); x && caretEnd(x); }
    });
  };
  const cardDone = (host, el, keep, open) => {
    const s = host._s, text = el.textContent.replace(/\s+/g, " ").trim(), th = s.cardFor; if (!th || el.dataset.done) return; el.dataset.done = "1";
    s.cardFor = null; s.cardText = "";
    if (!text) { render(host, `[data-add-theory="${th}"]`); return; }
    const id = `n${++nid}`; s.O[id] = { id, kind: "theory", name: text, themes: [th], ev: [], by: new Date().getFullYear() + 2, c: 0 };
    if (open) { go(host, id); return; }
    if (keep) { s.cardFor = th; render(host, `[data-card="${th}"]`); } else render(host);   // Return keeps going: another empty card, ready for the next claim
  };

  // Window-wide keys act on the window you last touched: ⌘J composer, ⌘⇧J voice, N new, F2 rename, ⌘Z undo, Esc closes the top layer.
  document.addEventListener("keydown", e => {
    const host = active || document.querySelector(".mk-host[data-live]"); if (!host?._s) return;
    const s = host._s, mod = e.metaKey || e.ctrlKey, typing = e.target.closest?.("input, textarea, [contenteditable]");
    if (mod && e.key.toLowerCase() === "j") { e.preventDefault(); if (e.shiftKey) { if (!s.comp.rec) recStart(host); } else host.querySelector("[data-comp]")?.focus(); return; }
    if (mod && e.key.toLowerCase() === "z" && !typing && s.toast?.undo) { e.preventDefault(); undo(host); return; }
    if (e.key === "Escape") {
      if (s.comp.rec) { e.preventDefault(); recStop(host, false); return; }
      if (s.modal) { e.preventDefault(); const id = s.modal; s.modal = null; render(host, `[data-del="${id}"]`); return; }
      if (s.pop) { e.preventDefault(); const st = s.pop.any ? "any" : s.pop.st; s.pop = null; render(host, `[data-ev-add="${st}"]`); return; }
    }
    if (!typing && !mod && !e.altKey && e.key.toLowerCase() === "n" && MAKE.includes(s.type) && host.contains(document.activeElement)) { e.preventDefault(); newObject(host, s.type); }
  });
  // Modal focus stays inside the dialog
  document.addEventListener("keydown", e => {
    if (e.key !== "Tab") return; const m = e.target.closest?.(".mk-modal"); if (!m) return;
    const f = [...m.querySelectorAll("button")], i = f.indexOf(document.activeElement);
    if (e.shiftKey && i === 0) { e.preventDefault(); f.at(-1).focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  });

  window.AberMake = { init, set: (host, opt) => { host._s.opt = { ...host._s.opt, ...opt }; render(host); } };
  const start = () => document.querySelectorAll("[data-mk]").forEach(init);
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", start); else start();
})();
