// Grammar 09: making things in the type-first default view, built from 06's decided object components (_shared/objects.css).
// Capture is the app's real model: the "Dump or ask" pill at the bottom right grows into a docked chat column (B2, decided 31 Oct).
// Every message is a dump; the agent's reply shows what it filed and drafted, as 06 rows, chips and cards that peek and open.
// Also live: create a theme or theory in place, add a signal as evidence, rename, accept or discard a draft, delete a dump.
// Usage: <div class="mk-host" data-mk='{"type":"theme","sel":"coi","chat":1,"scene":"picker"}'></div>
// The window renders at 1280 × 760 and zooms to fit its host; data-crop="right" shows its right edge at full size.
(() => {
  const TYPES = {
    theme: { name: "Themes", one: "theme", icon: "binoculars" }, theory: { name: "Theories", one: "theory", icon: "target" },
    prototype: { name: "Prototypes", one: "prototype", icon: "pencil-ruler" }, signal: { name: "Signals", one: "signal", icon: "pulse" },
    dump: { name: "Dumps", one: "dump", icon: "tray-arrow-down" }, briefing: { name: "Briefing", icon: "newspaper" },
  };
  const RAIL = ["theme", "theory", "prototype", "signal", "dump"];
  const MAKE = ["theme", "theory", "prototype"];
  const DAYS = ["Today", "Yesterday", "Monday 2 Nov", "Sunday 1 Nov"];
  const OPT = { log: "rail" };   // ⌘⇧L goes to Dumps in the rail (decided 5 Nov); the pill's separate Dumps sheet is dropped
  const PH = { theme: "Name this theme", theory: "State the claim", prototype: "Name this prototype", signal: "Say what you saw" };
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const cap = t => t[0].toUpperCase() + t.slice(1);

  /* ── Atoms (06) ────────────────────────────────────── */
  const g = (t, draft) => `<span class="g${draft ? " draft" : ""}" data-type="${t}"><i class="ph ph-${TYPES[t].icon}" aria-hidden="true"></i></span>`;
  const ic = (n, fill) => `<i class="ph${fill ? "-fill" : ""} ph-${n}" aria-hidden="true"></i>`;
  const ib = (icon, label, attr = "", key = "", cls = "") => `<button type="button" class="nv-ib${cls ? ` ${cls}` : ""}" aria-label="${label}" data-tip="${label}"${key ? ` data-key="${key}"` : ""} ${attr}>${ic(icon)}</button>`;
  const nameOf = o => o.name || `Untitled ${TYPES[o.kind].one}`;
  const chip = (o, attr = "") => `<button type="button" class="ctl-chip ob-chip"${o.draft ? " data-draft" : ""} data-peek="${o.id}" ${attr}>${g(o.kind, o.draft)}<span class="t">${esc(nameOf(o))}</span></button>`;
  const meter = n => `<span class="ob-meter" role="img" aria-label="${n ? `Confidence ${n} of 5` : "No confidence yet"}"><i style="width:${(n || 0) * 20}%"></i></span>`;
  const cnt = (icon, n, label) => `<span class="ob-cnt" role="img" aria-label="${n} ${label}"><i class="ph ph-${icon}" aria-hidden="true"></i>${n}</span>`;
  const setter = n => `<span class="ctl-conf ob-setter" role="slider" tabindex="0" aria-label="Confidence" aria-valuemin="0" aria-valuemax="5" aria-valuenow="${n}">${[1, 2, 3, 4, 5].map(i => `<i${i <= n ? " data-on" : ""}></i>`).join("")}</span>`;

  /* ── Relations ─────────────────────────────────────── */
  const all = (s, k) => Object.values(s.O).filter(o => o.kind === k && !o.gone);
  const theoriesOf = (s, th) => all(s, "theory").filter(t => t.themes.includes(th.id));
  const signalsOf = (s, th) => all(s, "signal").filter(x => x.themes.includes(th.id));
  const evFor = (s, sig) => all(s, "theory").flatMap(t => t.ev.filter(e => e[0] === sig.id && !e[2]).map(e => [t, e[1]]));
  const kindOf = d => d.len ? "Voice" : /^\S+\.\S+\//.test(d.text) ? "Link" : "Text";

  /* ── Previews (06 rows and cards) ──────────────────── */
  // act: "sel" in the list (selects); "peek" everywhere else (06: a click grows the peek; Open goes to the full view)
  const keyOf = (s, o) => o.kind === "theme" ? (o.draft ? "" : `<span class="kv"><span class="ob-n">${theoriesOf(s, o).length || ""}</span></span>`)
    : o.kind === "signal" ? `<span class="kv"><span class="ob-src">${esc(o.src)}</span><span class="when">${DAYS[o.day]}</span></span>`
    : o.kind === "dump" ? `<span class="kv"><span>${kindOf(o)}</span><span class="ob-mono">${o.time}</span><span class="when">${DAYS[o.day]}</span></span>`
    : o.kind === "prototype" && o.draft ? "" : o.kind === "prototype" ? `<span class="kv"><span>${o.status}</span></span>` : "";
  const orow = (s, o, { cur, act = "peek", cls = "", attr = "", rm = "" } = {}) => {
    const label = o.kind === "theme" || o.kind === "prototype", k = keyOf(s, o);
    const rk = o.kind === "theory" ? `<span class="ob-rk">${meter(o.draft ? 0 : o.c)}</span>` : "";
    return `<div class="ob-row${label ? " one label" : ""}${rk ? " has-rk" : ""}${!k && !rk ? " solo" : ""}${o.draft ? " draft" : ""}${(o.unseen || o.fresh) ? " unseen" : ""}${cls ? ` ${cls}` : ""}"${o.id === cur ? ' aria-current="true"' : ""} data-id="${o.id}" ${attr}>${g(o.kind, o.draft)}<button type="button" class="nm${o.name ? "" : " untitled"}" ${act === "sel" ? `data-sel="${o.id}"` : `data-peek="${o.id}"`}>${esc(nameOf(o))}</button>${rk}${k}${rm ? `<span class="rm">${ib("minus", rm, `data-rm="${o.id}"`, "", "sm")}</span>` : ""}</div>`;
  };
  const card = (s, t) => `<div class="ob-card has-rk${t.draft ? " draft" : ""}" data-id="${t.id}">${g("theory", t.draft)}<button type="button" class="nm" data-peek="${t.id}">${esc(nameOf(t))}</button><span class="ob-rk">${meter(t.draft ? 0 : t.c)}</span></div>`;

  /* ── Rail and list ─────────────────────────────────── */
  const rail = s => `<aside class="nv-rail">
      <div class="nv-brand"><span>Aber</span>${ib("magnifying-glass", "Find", "", "⌘K")}</div>
      <nav class="nv-types" aria-label="Types"><button type="button" class="nv-type" data-home aria-current="${s.type === "briefing"}"><span class="gw">${g("briefing")}</span><span class="nm">Briefing</span></button>${RAIL.map(t => `<button type="button" class="nv-type" data-go="${t}" aria-current="${s.type === t}"><span class="gw">${g(t)}</span><span class="nm">${TYPES[t].name}</span>${t === "dump" && all(s, "dump").some(d => d.processing) ? `<span class="nv-n mk-spin" role="img" aria-label="Working">${ic("circle-notch")}</span>` : `<span class="nv-n">${all(s, t).length}</span>`}</button>`).join("")}</nav>
      <div class="nv-switch" role="group" aria-label="Views">${[["rows", "Default", "⌘1"], ["columns", "Columns", "⌘2"], ["map-trifold", "Atlas", "⌘3"], ["chart-scatter", "Timeline", "⌘4"]].map(([i, l, k], n) =>
        `<button type="button" aria-pressed="${n === 0}" aria-label="${l}" data-tip="${l}" data-key="${k}">${ic(i, n === 0)}</button>`).join("")}</div>
    </aside>`;
  const list = s => {
    const t = s.type, cur = s.sel, xs = all(s, t);
    const group = (label, rows) => rows.length ? `<div class="ob-group">${label ? `<div class="ob-glabel"><span>${label}</span></div>` : ""}${rows.map(o => orow(s, o, { cur, act: "sel" })).join("")}</div>` : "";
    let body = "";
    if (t === "theme") body = group("", xs.filter(o => !o.draft)) + group("Drafts", xs.filter(o => o.draft));
    else if (t === "theory") body = group("Held", xs.filter(o => !o.draft)) + group("Drafts", xs.filter(o => o.draft));
    else if (t === "prototype") body = ["Building", "Idea", "Built"].map(k => group(k, xs.filter(o => o.status === k && !o.draft))).join("") + group("Drafts", xs.filter(o => o.draft));
    else body = DAYS.map((d, i) => group(d, xs.filter(o => o.day === i))).join("");
    return `<section class="nv-list ob-list" aria-label="${TYPES[t].name}">
        <div class="nv-lhead"><span class="h">${TYPES[t].name}</span><span class="nv-meta">${xs.length}</span>${MAKE.includes(t) ? ib("plus", `New ${TYPES[t].one}`, "data-new", "N") : ""}</div>
        <div class="nv-scroll ob-scroll">${body}</div></section>`;
  };

  /* ── Full view (06, with the main-area inset from 08) ─ */
  // Notes about the object as a whole sit in the eyebrow, the top bar's left: where a draft came from, a name that already exists.
  // Its right holds the object's verbs (drafts: Discard | Keep). One line; an empty top bar takes no height.
  const eyebrow = (s, o) => {
    const notes = [];
    if (o.draft && o.from) notes.push(`<span class="mk-eb">Draft from</span>${chip(s.O[o.from])}`);
    if (o.kind === "theme" && o.name.trim()) {
      const twin = all(s, "theme").find(x => x !== o && x.name.toLowerCase() === o.name.trim().toLowerCase());
      if (twin) notes.push(`<span class="mk-eb">Already a theme</span>${chip(twin)}`);
    }
    return notes.length ? `<div class="mk-eyebrow" data-eyebrow="${o.id}" aria-live="polite">${notes.join('<span class="mk-ebgap"></span>')}</div>` : `<div class="mk-eyebrow" data-eyebrow="${o.id}" aria-live="polite"></div>`;
  };
  const verbs = o => o.draft ? `<span class="ob-decide"><button type="button" class="nv-btn secondary" data-draft-no="${o.id}">Discard</button><button type="button" class="nv-btn primary" data-draft-yes="${o.id}">Keep</button></span>`
    : o.kind === "dump" ? `<span class="ob-tools">${ib("trash", "Delete dump", `data-del="${o.id}"`)}</span>` : "";
  const sec = (label, n, body, add = "") => `<section class="ob-sec"><div class="ob-sh"><span>${label}</span>${n ? `<span class="ob-n">${n}</span>` : ""}${add}</div>${body}</section>`;
  const slot = (label, attr) => `<button type="button" class="ob-slot" ${attr}>${ic("plus")}<span>${label}</span></button>`;
  const evItem = (s, t, e) => {
    const x = s.O[e[0]], just = s.just === `${t.id}:${x.id}`;
    // A proposal block (06 rule 9): label, reason, the object row, the verbs (05 rule 6)
    if (e[2] === "suggested") return `<div class="ob-block sug mk-sug"><div class="ob-blabel">${e[1] === "-" ? "Suggested counter-evidence" : "Suggested support"}</div><p class="ob-reason">${esc(e[3] || (e[1] === "-" ? "The agent read this as counter-evidence." : "The agent read this as support."))}</p>${orow(s, x)}<div class="ob-decide"><button type="button" class="nv-btn secondary" data-sug-no="${x.id}">Dismiss</button><button type="button" class="nv-btn primary" data-sug-yes="${x.id}">Add evidence</button></div></div>`;
    return orow(s, x, { cls: just ? "mk-just" : "", rm: `Remove ${x.name} from this theory` });
  };
  const evSec = (s, t, st, label) => {
    const items = t.ev.filter(e => e[1] === st).sort((x, y) => !!y[2] - !!x[2]);   // a suggestion sits first in the group it would join (06)
    const n = items.filter(e => !e[2]).length;
    return sec(label, n, `<div class="ob-rows">${items.map(e => evItem(s, t, e)).join("")}</div>`,
      `<span class="mk-shadd">${ib("plus", st === "+" ? "Add support" : "Add undermining", `data-ev-add="${st}"`, "", "sm")}</span>`);
  };
  const newCard = (s, th) => s.cardFor === th.id ? `<div class="ob-card has-rk mk-newcard">${g("theory")}<div class="nm mk-cardname ctl-edit${s.focusCls === "card" ? " is-focus" : ""}" contenteditable="plaintext-only" role="textbox" aria-label="Claim" data-card="${th.id}" data-placeholder="State the claim" spellcheck="false">${esc(s.cardText || "")}</div><span class="ob-rk">${meter(0)}</span></div>` : "";
  const prose = (s, o, ph, cls = "") => `<p class="ob-prose ctl-edit mk-prose${cls}${s.focusCls === "note" ? " is-focus" : ""}" contenteditable="plaintext-only" role="textbox" aria-multiline="true" aria-label="Note" data-note="${o.id}" data-placeholder="${ph}">${esc(o.note || "")}</p>`;

  const full = (s, o) => {
    let meta = "", body = "", rels = [];
    if (o.kind === "theme") {
      const ts = theoriesOf(s, o), sg = signalsOf(s, o);
      meta = `<span class="ob-cnts">${cnt("target", ts.length, "theories")}${cnt("pulse", sg.length, "signals")}</span>`;
      rels.push(sec("Theories", ts.length, `${ts.length || s.cardFor === o.id ? `<div class="ob-cards">${ts.map(t => card(s, t)).join("")}${newCard(s, o)}</div>` : ""}${s.cardFor === o.id ? "" : slot("Add theory", `data-add-theory="${o.id}"`)}`));
      rels.push(sec("Signals", sg.length, sg.length ? `<div class="ob-rows">${sg.map(x => orow(s, x)).join("")}</div>` : `<p class="ob-empty mk-empty">No signals yet</p>`));
    } else if (o.kind === "theory") {
      meta = `${o.draft ? `<span>Draft</span>` : setter(o.c || 0)}<span class="ob-cnts">${cnt("arrow-up", o.ev.filter(e => e[1] === "+" && !e[2]).length, "supporting")}${cnt("arrow-down", o.ev.filter(e => e[1] === "-" && !e[2]).length, "undermining")}</span><span>By ${o.by}</span>`;
      body = prose(s, o, "Add a note");
      rels.push(evSec(s, o, "+", "Supports"), evSec(s, o, "-", "Undermines"));
      rels.push(sec("Themes", 0, `<div class="ob-chips">${o.themes.map(id => chip(s.O[id])).join("")}</div>`));
    } else if (o.kind === "prototype") {
      meta = o.draft ? `<span>Draft</span>` : `<span>${o.status}</span>`;
      body = prose(s, o, "What it is and what you learned");
      rels.push(sec("Tests", o.tests.length, `<div class="ob-rows">${o.tests.map(id => orow(s, s.O[id])).join("")}</div>`));
    } else if (o.kind === "signal") {
      const ev = evFor(s, o), from = all(s, "dump").filter(d => d.made.includes(o.id));
      meta = `<span class="ob-src">${esc(o.src)}</span><span>${DAYS[o.day]}</span>`;
      body = prose(s, o, "Add a note");
      const rows = st => ev.filter(([, x]) => x === st).map(([t]) => orow(s, t)).join("");
      rels.push(sec("Supports", ev.filter(([, x]) => x === "+").length, `<div class="ob-rows">${rows("+")}${slot("Add theory", "")}</div>`));
      if (ev.some(([, x]) => x === "-")) rels.push(sec("Undermines", 0, `<div class="ob-rows">${rows("-")}</div>`));
      rels.push(sec("Themes", 0, `<div class="ob-chips">${o.themes.map(id => chip(s.O[id])).join("")}</div>`));
      rels.push(sec("Came from", 0, `<div class="ob-rows">${from.map(d => orow(s, d)).join("")}</div>`));
    } else if (o.kind === "dump") {
      meta = `<span>${kindOf(o)}${o.len ? `, ${o.len}` : ""}</span><span>${DAYS[o.day]}</span><span class="ob-mono">${o.time}</span><span>${esc(o.via)}</span>`;
      body = `<p class="ob-prose well">${esc(o.text)}</p>${o.reply ? `<div class="ob-reply"><div class="ob-label">Reply</div><p class="ob-prose">${esc(o.reply)}</p></div>` : ""}`;
      const made = o.made.map(id => s.O[id]).filter(x => x && !x.gone);
      const sg = made.filter(x => x.kind === "signal"), dr = made.filter(x => x.kind !== "signal");
      if (sg.length) rels.push(sec("Signals", sg.length, `<div class="ob-rows">${sg.map(x => orow(s, x)).join("")}</div>`));
      if (dr.length) rels.push(sec("Drafts", dr.length, `<div class="ob-rows">${dr.map(x => orow(s, x)).join("")}</div>`));
      if (!made.length) rels.push(sec("Signals", 0, `<p class="ob-empty mk-empty">${o.processing ? "Working on it" : "Nothing yet"}</p>`));
    }
    const editable = o.kind !== "dump";
    const title = `<h3 class="ob-title${editable ? " ctl-edit" : ""}${s.focusCls === "title" ? " is-focus" : ""}" ${editable ? `contenteditable="plaintext-only" role="textbox" aria-label="${o.kind === "theory" ? "Claim" : "Name"}" data-title="${o.id}" data-placeholder="${PH[o.kind]}" spellcheck="false"` : ""}>${esc(o.name)}</h3>`;
    return `<article class="ob-full mk-full${o.draft ? " draft" : ""}${o.solid ? " mk-solidify" : ""}" data-id="${o.id}">
      <div class="ob-top">${eyebrow(s, o)}${verbs(o)}</div>
      <header class="ob-hang ob-head">${g(o.kind, o.draft)}<div class="ob-col">${title}<div class="ob-meta lg">${meta}</div></div></header>
      <div class="ob-body">${body}${rels.length ? `<hr class="ob-div"><div class="ob-rels">${rels.join("")}</div>` : ""}</div></article>`;
  };

  /* ── Peek (06 rung 2): tethered, grows from its preview; Open goes to the full view ── */
  const peekHTML = (s, o) => {
    const p = o.kind === "dump" ? o.text : o.note;
    const key = o.kind === "theory" ? meter(o.draft ? 0 : o.c) : o.kind === "theme" ? `<span class="ob-cnts">${cnt("target", theoriesOf(s, o).length, "theories")}</span>` : "";
    const meta = o.kind === "signal" ? `<span class="ob-src">${esc(o.src)}</span><span>${DAYS[o.day]}</span>` : o.kind === "dump" ? `<span>${kindOf(o)}</span><span class="ob-mono">${o.time}</span>` : o.draft ? "<span>Draft</span>" : "";
    return `<div class="ob-peek live${meta ? " has-meta" : ""}" role="dialog" aria-label="${esc(nameOf(o))}">
      <div class="ob-hang">${g(o.kind, o.draft)}<div class="ob-col">${key ? `<div class="ob-pk-title"><div class="ob-pk-name${o.draft ? " draft" : ""}">${esc(nameOf(o))}</div><span class="ob-pk-key">${key}</span></div>` : `<div class="ob-pk-name${o.draft ? " draft" : ""}">${esc(nameOf(o))}</div>`}${meta ? `<div class="ob-meta">${meta}</div>` : ""}</div></div>
      ${p ? `<hr class="ob-div"><div class="ob-pk-body"><p class="ob-prose clamp">${esc(p)}</p></div>` : ""}
      <div class="ob-pk-foot"><button type="button" class="nv-btn secondary" data-open="${o.id}">Open${ic("arrow-right")}</button></div></div>`;
  };

  /* ── Capture: the pill and the chat column, shaped like the live app (127.0.0.1:5174), restyled to the grammar ── */
  const mmss = sec => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
  const ATT = { link: "link", image: "image", voice: "waveform" };
  // The take (live: a recording dot, the wave, the time, Stop). Improved: Discard is a trash button (DI-009: never X, never an unlabelled dot).
  const take = (c, where) => `<div class="mk-take" data-take="${where}">
      ${ib("trash", "Discard take", "data-rec-no", "Esc")}
      <span class="mk-wave" aria-hidden="true">${Array.from({ length: where === "pill" ? 34 : 46 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</span>
      <span class="mk-time" data-time>${mmss(c.rec.sec || 0)}</span>
      <button type="button" class="ctl-icon primary" aria-label="Stop and dump" data-tip="Stop and dump" data-key="⏎" data-rec-stop>${ic("stop", true)}</button></div>`;
  // Closed (live): a 40-high pill, bottom right, 12 from both edges: the dump glyph and "Dump or ask" (⌘J), then the microphone.
  const pill = s => s.chat ? "" : `<div class="mk-pill${s.comp.rec ? " rec" : ""}" role="group" aria-label="Dump or ask">${s.comp.rec ? take(s.comp, "pill")
    : `<button type="button" class="mk-pill-open" data-chat-open aria-label="Dump or ask" data-tip="Dump or ask" data-key="⌘J">${ic("tray-arrow-down")}<span>Dump or ask</span></button>${ib("microphone", "Voice dump", "data-rec-start", "⌘⇧J")}`}</div>`;
  const att = (a, rm) => `<span class="mk-att">${ic(ATT[a.kind])}<span class="t">${esc(a.title)}</span>${rm ? `<button type="button" class="rm" aria-label="Remove ${esc(a.title)}" data-att-rm="${a.id}">${ic("minus")}</button>` : ""}</span>`;
  const msg = (s, m, i) => {
    if (m.day != null) return `<div class="mk-day">${DAYS[m.day]}</div>`;
    if (m.who === "me") {
      // Live: a sunk bubble on the right, the time under it. A voice dump is a playable bubble with its transcript under it.
      const voice = m.voice ? `<div class="mk-bubble mk-voice">${ib("play", "Play voice note", "", "", "sm")}<span class="mk-wave still" aria-hidden="true">${Array.from({ length: 24 }, (_, k) => `<i style="--i:${k}"></i>`).join("")}</span><span class="mk-time">${m.voice}</span></div>${m.text ? `<p class="mk-transcript">${esc(m.text)}</p>` : ""}` : "";
      return `<div class="mk-me" data-dump="${m.dump}">${voice || `<div class="mk-bubble">${m.text ? `<p>${esc(m.text)}</p>` : ""}${m.atts?.length ? `<div class="mk-batts">${m.atts.map(a => att(a)).join("")}</div>` : ""}</div>`}
        <div class="mk-when"><span class="ob-mono">${m.time}</span>${ib("trash", "Delete dump", `data-del="${m.dump}"`, "", "sm mk-del")}</div></div>`;
    }
    if (m.working) return `<div class="mk-agent mk-working" role="status"><span class="mk-spin">${ic("circle-notch")}</span><span>Reading</span></div>`;
    return `<div class="mk-agent">${m.parts.map((p, j) => {
      if (p.say) return `<p class="mk-say">${esc(p.say)}</p>`;
      // Live: a theme token with a count that unfolds the gists filed there. Restyled: the 06 theme chip and a bare count; unfolds to signal rows.
      if (p.filed) { const key = `${i}:${j}`, open = s.unfold.has(key), sigs = p.signals.map(id => s.O[id]).filter(x => x && !x.gone);
        return `<div class="mk-filed"><button type="button" class="ctl-chip ob-chip mk-token" data-unfold="${key}" aria-expanded="${open}">${g("theme")}<span class="t">${esc(s.O[p.filed].name)}</span><span class="ob-n">${sigs.length}</span>${ic(open ? "caret-up" : "caret-down")}</button>
          ${open ? `<div class="ob-rows">${sigs.map(x => orow(s, x)).join("")}</div>` : ""}</div>`; }
      if (p.theory) { const t = s.O[p.theory]; const ev = st => t.ev.filter(e => e[1] === st && !e[2]).map(e => s.O[e[0]]);
        return `<div class="mk-split">${orow(s, t)}<div class="mk-split-cols">${[["Supports", "+"], ["Undermines", "-"]].map(([l, st]) => `<div><div class="ob-label">${l}<span class="ob-n">${ev(st).length}</span></div><div class="ob-rows">${ev(st).map(x => orow(s, x)).join("")}</div></div>`).join("")}</div></div>`; }
      // Live: a dashed draft card with Rephrase, Discard and Accept under it (Discard | Keep here, 05 rule 6). Restyled: the 06 draft row; Rephrase opens it with the claim editable.
      if (p.draft) { const o = s.O[p.draft]; if (!o || o.gone) return `<p class="mk-say mk-gone">Draft discarded</p>`;
        return `<div class="mk-draft">${orow(s, o)}${o.draft ? `<div class="ob-decide">${ib("pencil-simple", "Rephrase", `data-rephrase="${o.id}"`, "", "sm")}<button type="button" class="nv-btn secondary" data-draft-no="${o.id}">Discard</button><button type="button" class="nv-btn primary" data-draft-yes="${o.id}">Keep</button></div>` : ""}</div>`; }
      return "";
    }).join("")}</div>`;
  };
  // Live: what the agent sees floats above the composer (a pill per region, minus to stop sharing) with the crosshair beside it.
  const ctxRow = s => `<div class="mk-ctx">${s.comp.ctx.map(id => s.O[id] && !s.O[id].gone ? `<span class="ctl-chip ob-chip mk-ctxchip">${g(s.O[id].kind, s.O[id].draft)}<span class="t">${esc(nameOf(s.O[id]))}</span><button type="button" class="rm" aria-label="Stop sharing ${esc(nameOf(s.O[id]))}" data-ctx-rm="${id}">${ic("minus")}</button></span>` : "").join("")}
        ${ib("crosshair", s.picking ? "Stop picking" : "Add something on screen", `aria-pressed="${!!s.picking}" data-pick-ctx`, s.picking ? "Esc" : "", "sm")}</div>`;
  // Live: a hairline, then field, attach, microphone, send. Send turns into a question mark when the text asks.
  const composer = s => {
    const c = s.comp, ready = c.text.trim() || c.atts.length, ask = c.text.includes("?");
    if (c.rec) return `<div class="mk-comp">${take(c, "chat")}</div>`;
    return `<form class="mk-comp${c.atts.length ? " has-atts" : ""}" aria-label="Dump or ask" onsubmit="return false">
        ${c.atts.length ? `<div class="mk-atts">${c.atts.map(a => att(a, true)).join("")}</div>` : ""}
        <textarea rows="1" placeholder="Dump anything, or ask" aria-label="Dump or ask" data-comp${s.focusCls === "comp" ? ' class="is-focus"' : ""}>${esc(c.text)}</textarea>
        <button type="button" class="ctl-icon" aria-label="Attach" data-tip="Attach" data-attach>${ic("paperclip")}</button>
        <button type="button" class="ctl-icon" aria-label="Voice dump" data-tip="Voice dump" data-key="⌘⇧J" data-rec-start>${ic("microphone")}</button>
        <button type="button" class="ctl-icon primary" aria-label="${ask ? "Ask" : "Dump"}" data-tip="${ask ? "Ask" : "Dump"}" data-key="⏎" data-send aria-disabled="${!ready}">${ic(ask ? "question" : "paper-plane-right")}</button></form>`;
  };
  // Open (live): the pill grows into a 360 column, 12 in from the top, right and bottom, radius 14, pushing the view.
  // No header: a grab handle at the top centre closes it (Esc). Clicking away doesn't close it.
  const chat = s => s.chat ? `<aside class="mk-chat" aria-label="Dump or ask">
      <button type="button" class="mk-grab" aria-label="Close" data-tip="Close" data-key="Esc" data-chat-close><i aria-hidden="true"></i></button>
      <div class="mk-thread" data-thread>${s.thread.map((m, i) => msg(s, m, i)).join("")}</div>
      ${ctxRow(s)}${composer(s)}</aside>` : "";
  /* ── Transient layers: one at a time (picker, peek, modal, toast) ── */
  const toast = s => s.toast ? `<div class="mk-toast" role="status"><span class="t">${esc(s.toast.text)}</span>${s.toast.undo ? `<button type="button" class="mk-undo" data-undo>Undo<kbd>⌘Z</kbd></button>` : ""}</div>` : "";
  const modal = s => {
    if (!s.modal) return "";
    const d = s.O[s.modal];
    return `<div class="mk-scrim" data-modal-close></div><div class="mk-modal" role="dialog" aria-modal="true" aria-labelledby="mk-mt-${s.uid}" aria-describedby="mk-md-${s.uid}">
        <div class="mk-mhead"><h2 id="mk-mt-${s.uid}">Delete this dump?</h2>${ib("x", "Close", "data-modal-close", "Esc")}</div>
        <p id="mk-md-${s.uid}">“${esc(d.name)}” goes to the bin for 30 days, with the ${d.made.length} things made only from it.</p>
        <div class="mk-mfoot"><button type="button" class="nv-btn secondary" data-modal-close>Cancel</button><button type="button" class="nv-btn primary" data-del-yes="${d.id}">Delete dump</button></div></div>`;
  };
  const picker = s => {
    if (!s.pop) return "";
    const t = s.O[s.sel], q = s.pop.q.toLowerCase(), linked = new Set(t.ev.map(e => e[0]));
    const pool = all(s, "signal").filter(x => !linked.has(x.id) && x.name.toLowerCase().includes(q));
    const near = pool.filter(x => x.themes.some(id => t.themes.includes(id))), rest = pool.filter(x => !near.includes(x));
    s.pop.opts = [...near, ...rest].map(x => x.id);
    const opt = x => `<div class="ob-row mk-opt" role="option" id="mk-o-${s.uid}-${x.id}" data-opt="${x.id}" aria-selected="${s.pop.opts[s.pop.i] === x.id}">${g("signal")}<span class="nm">${esc(x.name)}</span><span class="kv"><span class="ob-src">${esc(x.src)}</span></span></div>`;
    const grp = (label, xs) => xs.length ? `<div class="mk-ogroup" role="group" aria-label="${label}"><div class="ob-glabel"><span>${label}</span></div>${xs.map(opt).join("")}</div>` : "";
    return `<div class="mk-pop" role="dialog" aria-label="${s.pop.st === "-" ? "Add undermining" : "Add support"}">
        <label class="ctl-field mk-find">${ic("magnifying-glass")}<input data-pq type="search" placeholder="Find a signal" value="${esc(s.pop.q)}" aria-label="Find a signal" role="combobox" aria-expanded="true" aria-controls="mk-olist-${s.uid}" aria-activedescendant="${s.pop.opts[s.pop.i] ? `mk-o-${s.uid}-${s.pop.opts[s.pop.i]}` : ""}" autocomplete="off"></label>
        <div class="mk-olist" id="mk-olist-${s.uid}" role="listbox">${grp(t.themes.length ? `In ${esc(s.O[t.themes[0]].name)}` : "Signals", near)}${grp("Other signals", rest)}${pool.length ? "" : `<p class="ob-empty">No signals match</p>`}</div></div>`;
  };

  // Briefing (08, decided) is the first rail item, with no second sidebar. Here it is caught up: 08 holds the full design.
  const briefing = () => `<article class="ob-full ob-digest"><header class="ob-hang ob-head">${g("briefing")}<div class="ob-col"><h3 class="ob-title">Since yesterday</h3></div></header>
      <div class="ob-body"><p class="ob-empty mk-empty">Nothing new since 18:40</p></div></article>`;

  /* ── Frame ─────────────────────────────────────────── */
  const frame = s => {
    const home = s.type === "briefing", o = home ? null : s.O[s.sel];
    return `<div class="nv mk ob-win" data-v="A"${s.picking ? " data-picking" : ""} style="grid-template-columns:var(--nv-rail-w)${home ? "" : " 280px"} minmax(0,1fr)${s.chat ? " calc(var(--chat-w) + var(--inset-float))" : ""}">${rail(s)}${home ? "" : list(s)}
      <main class="nv-main"><div class="nv-scroller">${home ? briefing() : o && !o.gone ? full(s, o) : `<p class="ob-empty mk-nothing">Nothing selected</p>`}</div></main>
      ${chat(s)}${pill(s)}${picker(s)}${toast(s)}${modal(s)}</div>`;
  };

  /* ── Render and placement ─────────────────────────── */
  const local = (base, el) => { const br = base.getBoundingClientRect(), k = br.width / base.offsetWidth || 1, r = el.getBoundingClientRect();
    return { x: (r.left - br.left) / k, y: (r.top - br.top) / k, w: r.width / k, h: r.height / k }; };
  const fit = host => { const el = host.firstElementChild; if (!el || host.dataset.crop) return; el.style.zoom = Math.min(1, host.clientWidth / 1280); };
  const ro = new ResizeObserver(es => es.forEach(e => fit(e.target)));
  const place = host => {
    const s = host._s, nv = host.querySelector(".nv");
    // The toast sits just above whatever the composer is: the pill when closed, the column's composer when open (10 States rule 6)
    const t = nv.querySelector(".mk-toast"), anchor = nv.querySelector(".mk-chat .mk-comp, .mk-pill");
    if (t && anchor) { const a = local(nv, anchor); t.style.bottom = `${nv.offsetHeight - a.y + 8}px`; t.style.right = `${nv.offsetWidth - (a.x + a.w) + (s.chat ? 12 : 0)}px`; }
    const pop = nv.querySelector(".mk-pop");
    if (pop) {
      const trig = nv.querySelector(`[data-ev-add="${s.pop.st}"]`); if (!trig) return;
      const r = local(nv, trig), main = local(nv, nv.querySelector(".nv-main")), ol = pop.querySelector(".mk-olist");
      ol.style.maxHeight = `${Math.max(120, Math.min(300, nv.offsetHeight - (r.y + r.h + 4) - (pop.offsetHeight - ol.offsetHeight) - 12))}px`;
      const left = Math.max(main.x + 12, Math.min(main.x + main.w - pop.offsetWidth - 12, r.x + r.w - pop.offsetWidth + 6));
      Object.assign(pop.style, { left: `${left}px`, top: `${r.y + r.h + 4}px`, transformOrigin: `${r.x + r.w / 2 - left}px 0` });
      trig.setAttribute("aria-expanded", "true");
    }
    const th = nv.querySelector("[data-thread]"); if (th && s.scrollThread !== false) th.scrollTop = th.scrollHeight;
  };
  const render = (host, focus) => {
    const s = host._s;
    const keep = [...host.querySelectorAll(".nv-scroll, .nv-scroller")].map(el => el.scrollTop);
    host.innerHTML = frame(s); fit(host); window.AberRail?.apply(host, { chat: !!s.chat });   // the rail collapses while the chat is open (proposed 5 Nov)
    host.querySelectorAll(".nv-scroll, .nv-scroller").forEach((el, i) => el.scrollTop = keep[i] || 0);
    place(host);
    if (focus) { const el = host.querySelector(focus); if (el) { el.focus({ preventScroll: !host.dataset.live }); caretEnd(el); } }
  };
  const caretEnd = el => {
    if (el.isContentEditable) { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }
    else if (el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length);
  };

  /* ── Toasts: only when something leaves the screen (10 States rule 8) ── */
  const say = (host, text, undo) => {
    const s = host._s; clearTimeout(s.toastT);
    s.toast = { text, undo }; s.pop = null;
    const inComp = document.activeElement?.matches?.("[data-comp]") && host.contains(document.activeElement);
    render(host, inComp ? "[data-comp]" : null);
    s.toastT = setTimeout(() => hideToast(host), 5000);
  };
  const hideToast = host => { const s = host._s; if (s.hovering) { s.toastT = setTimeout(() => hideToast(host), 1500); return; } s.toast = null; host.querySelector(".mk-toast")?.remove(); };
  const undo = host => { const s = host._s; if (!s.toast?.undo) return false; const fn = s.toast.undo; clearTimeout(s.toastT); s.toast = null; fn(); return true; };

  /* ── Peeks ─────────────────────────────────────────── */
  const closePeek = host => { host.querySelectorAll(".ob-peek.live").forEach(p => p.remove()); host.querySelectorAll("[data-peek][aria-expanded]").forEach(a => a.removeAttribute("aria-expanded")); host._s.peek = null; };
  const showPeek = (host, id, anchor, pinned) => {
    const s = host._s, o = s.O[id], nv = host.querySelector(".nv"); if (!o || o.gone) return;
    closePeek(host); s.peek = { id, pinned };
    nv.insertAdjacentHTML("beforeend", peekHTML(s, o));
    const el = nv.lastElementChild, row = anchor.closest(".ob-row, .ob-card, .ob-chip") || anchor, r = local(nv, row);
    const left = Math.max(12, Math.min(nv.offsetWidth - el.offsetWidth - 12, r.x - 8));
    let top = r.y + r.h + 6; if (top + el.offsetHeight > nv.offsetHeight - 12) { top = r.y - el.offsetHeight - 6; el.classList.add("up"); }
    Object.assign(el.style, { left: `${left}px`, top: `${Math.max(12, top)}px` });
    anchor.setAttribute("aria-expanded", "true");
  };

  /* ── Making ────────────────────────────────────────── */
  let nid = 0;
  // Leaving a new object: empty goes; unnamed with content stays as "Untitled", with Undo (decided 4 Nov)
  const leave = host => {
    const s = host._s, o = s.O[s.newId];
    if (!o || o.gone) { s.newId = null; return; }
    s.newId = null;
    if (o.name.trim()) return;
    if (!(o.note || "").trim()) { o.gone = true; return; }
    queueMicrotask(() => say(host, `Kept as Untitled ${TYPES[o.kind].one}`, () => { s.type = o.kind; s.sel = o.id; s.newId = o.id; render(host, `[data-title="${o.id}"]`); }));
  };
  const go = (host, id) => { const s = host._s, o = s.O[id]; if (!o || o.gone) return; closePeek(host); if (id !== s.sel) leave(host); s.pop = null; s.type = o.kind; s.sel = id; s.cardFor = null; render(host); host.querySelector(".nv-scroller").scrollTop = 0; };
  const newObject = (host, kind) => {
    const s = host._s; leave(host);
    const id = `n${++nid}`;
    s.O = { [id]: { id, kind, name: "", themes: [], ev: [], by: new Date().getFullYear() + 2, status: "Idea", tests: [] }, ...s.O };
    s.type = kind; s.sel = id; s.newId = id; s.pop = null;
    render(host, `[data-title="${id}"]`);
  };
  const syncNames = (host, o) => host.querySelectorAll(`[data-id="${o.id}"] > .nm, [data-sel="${o.id}"]`).forEach(n => { n.textContent = nameOf(o); n.classList.toggle("untitled", !o.name.trim()); });
  const commitTitle = (host, el, how) => {
    const s = host._s, o = s.O[el.dataset.title]; if (!o) return;
    const text = el.textContent.replace(/\s+/g, " ").trim(), orig = el.dataset.orig ?? o.name;
    if (how === "revert") { o.name = orig; el.textContent = orig; syncNames(host, o); el.blur(); return; }
    if (!text && orig) { o.name = orig; el.textContent = orig; syncNames(host, o); return; }   // a blank rename keeps the old name
    o.name = text; el.textContent = text;
    if (o.draft && text !== orig) accept(host, o);   // editing a draft's wording accepts it (decided 4 Nov)
  };
  const accept = (host, o) => { o.draft = false; o.solid = true; if (o.kind === "theory") o.c = 0; render(host); setTimeout(() => { o.solid = false; }, 400); };
  const addEvidence = (host, sid, st) => {
    const s = host._s, t = s.O[s.sel];
    t.ev.push([sid, st]); s.just = `${t.id}:${sid}`; s.pop = null;
    render(host, `[data-ev-add="${st}"]`);   // the row appears where it will stay; no toast
    setTimeout(() => { if (s.just === `${t.id}:${sid}`) s.just = null; }, 1600);
  };
  const cardDone = (host, el, keep, open) => {
    const s = host._s, text = el.textContent.replace(/\s+/g, " ").trim(), th = s.cardFor; if (!th || el.dataset.done) return; el.dataset.done = "1";
    s.cardFor = null; s.cardText = "";
    if (!text) { render(host, `[data-add-theory="${th}"]`); return; }
    const id = `n${++nid}`; s.O[id] = { id, kind: "theory", name: text, themes: [th], ev: [], by: new Date().getFullYear() + 2, c: 0 };
    if (open) { go(host, id); return; }
    if (keep) { s.cardFor = th; render(host, `[data-card="${th}"]`); } else render(host);
  };

  /* ── Capture: every message is a dump; the agent replies with what it filed and drafted ── */
  const now = () => new Date().toTimeString().slice(0, 5);
  const openChat = (host, focus = true) => { const s = host._s; s.chat = true; if (!s.comp.ctx.length && s.sel && !s.comp.ctxSet) s.comp.ctx = [s.sel]; render(host, focus ? "[data-comp]" : null); };
  const send = host => {
    const s = host._s, c = s.comp; if (!c.text.trim() && !c.atts.length) return;
    const text = c.text.trim(), atts = c.atts, voice = atts.find(a => a.kind === "voice"), link = atts.find(a => a.kind === "link");
    const d = { id: `d${++nid}x`, kind: "dump", name: text.split("\n")[0].slice(0, 60) || (voice ? `Voice note, ${voice.len}` : link?.title) || "Dump", day: 0, time: now(),
      via: "Dump or ask", made: [], text: text || atts.map(a => a.title).join(", "), len: voice?.len, processing: true };
    s.O = { [d.id]: d, ...s.O };
    const me = { who: "me", dump: d.id, text, atts, ctx: [...c.ctx], time: d.time }, work = { who: "agent", working: true };
    const at = s.thread.length;
    s.thread.push(...(s.thread.some(m => m.day === 0) ? [] : [{ day: 0 }]), me, work);
    c.text = ""; c.atts = [];
    // While it works, the Dumps rail entry shows the Working spinner in place of its count (10 States, decided)
    render(host, s.chat && host.dataset.live ? "[data-comp]" : null);
    setTimeout(() => {
      if (d.gone) return;
      d.processing = false;
      const theme = (c.ctx.map(id => s.O[id]).find(x => x?.kind === "theme") || s.O[(c.ctx.map(id => s.O[id]).find(x => x?.themes?.length) || {}).themes?.[0]] || s.O.coi);
      let parts;
      if (text.includes("?")) {
        const hits = all(s, "signal").filter(x => x.themes.includes(theme.id)).slice(0, 2).map(x => x.id);
        const held = theoriesOf(s, theme).find(t => !t.draft);
        parts = [{ say: `Two of your signals in ${theme.name} touch this.` }, held ? { theory: held.id } : { rows: hits }];
        d.reply = parts[0].say;
      } else {
        const sg = { id: `s${++nid}x`, kind: "signal", name: (text || (voice ? "Voice note about pricing" : link?.title) || "A new signal").split(/[.?!\n]/)[0].slice(0, 80), src: link?.title || "My own observation", day: 0, themes: [theme.id], unseen: true };
        s.O[sg.id] = sg; d.made.push(sg.id);
        parts = [{ filed: theme.id, signals: [sg.id] }];
        if (/\btheory\b|\bwill\b/i.test(text)) {
          const t = { id: `t${++nid}x`, kind: "theory", name: "Inference becomes a utility line item nobody budgets for", themes: [theme.id], draft: true, from: d.id, by: 2029, ev: [[sg.id, "+"]] };
          s.O[t.id] = t; d.made.push(t.id); parts.push({ say: "This reads like a claim, so I drafted a theory from it." }, { draft: t.id });
        }
      }
      const i = s.thread.indexOf(work); if (i >= 0) s.thread[i] = { who: "agent", parts };
      // A finished dump reports once (10 States, decided): in the thread when the column is open; otherwise a toast with Undo
      if (!s.chat) {
        const ns = d.made.filter(id => s.O[id].kind === "signal").length, nd = d.made.length - ns;
        const what = d.made.length ? `Made ${ns} signal${ns === 1 ? "" : "s"}${nd ? ` and ${nd} draft${nd === 1 ? "" : "s"}` : ""}` : "Answered in Dump or ask";
        say(host, what, () => { d.gone = true; d.made.forEach(id => { s.O[id].gone = true; }); s.thread.splice(at); render(host); });
      } else render(host, document.activeElement?.matches?.("[data-comp]") && host.contains(document.activeElement) ? "[data-comp]" : null);
    }, 1200);
  };
  const recStart = host => {
    const s = host._s; s.comp.rec = { t0: Date.now(), sec: 0 }; render(host);
    clearInterval(s.recT);
    s.recT = setInterval(() => { const r = s.comp.rec; if (!r) return clearInterval(s.recT); r.sec = (Date.now() - r.t0) / 1000; const el = host.querySelector("[data-time]"); if (el) el.textContent = mmss(r.sec); }, 250);
    host.querySelector("[data-rec-stop]")?.focus({ preventScroll: true });
  };
  const recStop = (host, keep) => {
    const s = host._s, r = s.comp.rec; if (!r) return; clearInterval(s.recT);
    const len = mmss(Math.max(1, r.sec)); s.comp.rec = null;
    const voice = { id: `a${++nid}`, kind: "voice", title: `Voice note ${len}`, len };
    if (!keep) { say(host, "Take discarded", () => { s.comp.atts.push(voice); if (!s.chat) openChat(host); else render(host, "[data-comp]"); }); return; }
    s.comp.atts.push(voice); send(host);
  };

  /* ── Tooltips: name, then key; after 500ms ─────────── */
  let tipT;
  const showTip = btn => {
    const nv = btn.closest(".nv"); if (!nv) return; nv.querySelector(".nv-tip")?.remove();
    const t = document.createElement("div"); t.className = "nv-tip"; t.setAttribute("role", "tooltip");
    t.innerHTML = `<span>${btn.dataset.tip}</span>${btn.dataset.key ? `<kbd>${btn.dataset.key}</kbd>` : ""}`; nv.append(t);
    const r = local(nv, btn), tw = t.offsetWidth, th = t.offsetHeight;
    let top = r.y + r.h + 4; if (btn.closest(".nv-switch, .mk-pill, .mk-chat-foot")) top = r.y - th - 4;
    Object.assign(t.style, { left: `${Math.max(4, Math.min(nv.offsetWidth - tw - 4, r.x + r.w / 2 - tw / 2))}px`, top: `${top}px` });
  };
  document.addEventListener("pointerover", e => { const b = e.target.closest(".mk [data-tip]"); if (!b) return; clearTimeout(tipT); tipT = setTimeout(() => b.isConnected && showTip(b), 500); });
  document.addEventListener("pointerout", e => { const b = e.target.closest(".mk [data-tip]"); if (!b) return; clearTimeout(tipT); b.closest(".nv")?.querySelector(".nv-tip")?.remove(); });

  /* ── Seed thread: two earlier exchanges (chat is dumps) ── */
  const seedThread = () => [
    { day: 2 },
    { who: "me", dump: "d5", text: "Is anyone pricing agents per outcome?", time: "21:05", ctx: ["ps"] },
    { who: "agent", parts: [{ say: "Not yet in your signals, but it sits next to a theory you hold. I drafted a theory and a prototype from it." }, { theory: "t8" }, { draft: "t12" }, { draft: "p8" }] },
    { day: 1 },
    { who: "me", dump: "d3", voice: "2:14", text: "The demo was great but they kept saying memory is off for now because of the privacy stuff. Also everyone in the room complained about reviewing agent PRs.", time: "18:20" },
    { who: "agent", parts: [{ say: "Filed 3 observations and drafted a theme." }, { filed: "coi", signals: ["s5"] }, { filed: "rev", signals: ["s7"] }, { filed: "mem", signals: ["s8"] }, { draft: "voice" }] },
    { day: 0 },
    { who: "me", dump: "d1", text: "Prices keep falling at the small end. Routine stuff just stops costing anything I'd notice. Maybe local models eat it entirely", atts: [{ kind: "link", title: "x.com" }, { kind: "link", title: "news.ycombinator.com" }], time: "09:12", ctx: ["coi"] },
    { who: "agent", parts: [{ filed: "coi", signals: ["s1", "s2"] }, { filed: "mem", signals: ["s3"] }, { say: "The ramble reads like a claim, so I drafted a theory." }, { draft: "t11" }] },
  ];

  /* ── Scenes: a window set to one step of a flow ───── */
  const D9 = s => { s.O.d9 = { id: "d9", kind: "dump", name: "Batch inference prices fall below a cent per thousand calls", day: 0, time: "10:02", via: "Dump or ask", made: ["s15"], text: "Batch inference prices fall below a cent per thousand calls. Routine work will stop being a line item" }; };
  const scene = (host, name) => {
    const s = host._s;
    const at = {
      "chat-typing": () => { s.chat = true; s.comp.ctx = ["coi"]; s.comp.text = "Cloud provider bundles a million free tokens with every account. Is this the same trend?"; s.comp.atts = [{ id: "a1", kind: "link", title: "theinformation.com" }]; s.focusCls = "comp"; },
      "chat-rec": () => { s.chat = true; s.comp.ctx = ["coi"]; s.comp.rec = { t0: Date.now() - 7000, sec: 7 }; },
      "pill-rec": () => { s.comp.rec = { t0: Date.now() - 4000, sec: 4 }; },
      "chat-working": () => { D9(s); s.chat = true; s.comp.ctx = ["coi"]; s.thread.push({ who: "me", dump: "d9", text: "Batch inference prices fall below a cent per thousand calls. Routine work will stop being a line item", time: "10:02", ctx: ["coi"] }, { who: "agent", working: true }); },
      "chat-reply": () => { D9(s); s.O.d9.made.push("t20"); s.chat = true; s.comp.ctx = ["coi"]; s.comp.text = ""; const h = s.thread; h.push({ who: "me", dump: "d9", text: "Batch inference prices fall below a cent per thousand calls. Routine work will stop being a line item", time: "10:02", ctx: ["coi"] });
        s.O.t20 = { id: "t20", kind: "theory", name: "Inference becomes a utility line item nobody budgets for", themes: ["coi"], draft: true, from: "d9", by: 2029, ev: [["s15", "+"]] };
        h.push({ who: "agent", parts: [{ filed: "coi", signals: ["s15"] }, { say: "This reads like a claim, so I drafted a theory from it." }, { draft: "t20" }] }); },
      "chat-pick": () => { s.chat = true; s.comp.ctx = ["coi"]; s.picking = true; },
      "toast": () => { s.toast = { text: "Made 1 signal", undo: () => {} }; },
      "chat-top": () => { s.chat = true; s.comp.ctx = ["coi"]; s.scrollThread = false; },
      "chat-filed": () => { s.chat = true; s.comp.ctx = ["coi"]; s.unfold.add("8:0"); },
      "log": () => { s.type = "dump"; s.sel = all(s, "dump")[0]?.id; },
      "new-theme": () => { const id = "n0"; s.O = { [id]: { id, kind: "theme", name: "Robots in the home", themes: [], ev: [] }, ...s.O }; s.type = "theme"; s.sel = id; s.newId = id; s.focusCls = "title"; },
      "dup-theme": () => { const id = "n0"; s.O = { [id]: { id, kind: "theme", name: "Agent memory", themes: [], ev: [] }, ...s.O }; s.type = "theme"; s.sel = id; s.newId = id; },
      "new-card": () => { s.cardFor = s.sel; s.cardText = "Inference becomes a utility line item"; s.focusCls = "card"; },
      "rename": () => { s.focusCls = "title"; },
      "picker": () => { s.pop = { st: "+", q: "", i: 0 }; },
      "linked": () => { const t = s.O[s.sel]; t.ev.push(["s14", "+"]); s.just = `${t.id}:s14`; },
      "untitled": () => { const id = "n0"; s.O = { [id]: { id, kind: "theory", name: "", themes: ["coi"], ev: [], by: 2028, note: "Inference stops being a line item anyone budgets for." }, ...s.O }; s.type = "theory"; s.sel = "t1"; s.toast = { text: "Kept as Untitled theory", undo: () => {} }; },
      "modal": () => { s.modal = s.sel; },
    }[name];
    at?.(); render(host);
    if (name === "chat-pick") host.querySelector(".nv-main .ob-card")?.classList.add("is-hover");
  };

  /* ── Init and events ──────────────────────────────── */
  let uid = 0, active = null;
  const init = host => {
    const o = JSON.parse(host.dataset.mk || "{}");
    const s = host._s = { uid: ++uid, O: window.MkSeed(), type: o.type || "theme", sel: o.sel || "coi", opt: { ...OPT, ...(o.opt || {}) }, chat: !!o.chat, thread: seedThread(),
      comp: { text: "", atts: [], rec: null, ctx: o.chat ? [o.sel || "coi"] : [] }, toast: null, pop: null, modal: null, peek: null, newId: null, cardFor: null, picking: false, unfold: new Set() };
    if (host.dataset.crop) host.classList.add("mk-crop");
    render(host); ro.observe(host);
    if (o.scene) document.fonts.ready.then(() => scene(host, o.scene));
    host.addEventListener("pointerdown", () => { active = host; });
    host.addEventListener("focusin", () => { active = host; });
    host.addEventListener("pointerenter", e => { if (e.target.closest?.(".mk-toast")) s.hovering = true; }, true);
    host.addEventListener("pointerleave", e => { if (e.target.closest?.(".mk-toast")) s.hovering = false; }, true);

    // Hover peeks: 500ms on any preview outside the list (06)
    let hoverT, leaveT;
    host.addEventListener("pointerover", e => {
      const s = host._s; if (e.target.closest(".ob-peek")) { clearTimeout(leaveT); return; }
      const a = e.target.closest("[data-peek]"); if (!a || s.picking || s.peek?.pinned) return;
      clearTimeout(leaveT); clearTimeout(hoverT);
      hoverT = setTimeout(() => { if (a.isConnected && !host._s.peek?.pinned) showPeek(host, a.dataset.peek, a, false); }, 500);
    });
    host.addEventListener("pointerout", e => {
      const s = host._s; clearTimeout(hoverT); if (!s.peek || s.peek.pinned) return;
      const to = e.relatedTarget; if (to && (to.closest?.(".ob-peek") || to.closest?.("[aria-expanded='true']"))) return;
      leaveT = setTimeout(() => { if (host._s.peek && !host._s.peek.pinned) closePeek(host); }, 250);
    });

    host.addEventListener("click", e => {
      const s = host._s;
      // Picking context from the screen: the next object you click joins what the agent sees
      if (s.picking && e.target.closest(".nv-main, .nv-list")) {
        const hit = e.target.closest("[data-id], [data-sel], [data-peek]");
        const id = hit && (hit.dataset.id || hit.dataset.sel || hit.dataset.peek);
        e.preventDefault(); e.stopPropagation();
        if (id && !s.comp.ctx.includes(id)) s.comp.ctx.push(id);
        s.picking = false; render(host, "[data-comp]"); return;
      }
      const el = e.target.closest("button, [data-modal-close], [data-opt]");
      const inPeek = e.target.closest(".ob-peek");
      if (s.peek && !inPeek && !(el && "peek" in el.dataset)) closePeek(host);
      if (!el || !host.contains(el)) { if (s.pop && !e.target.closest(".mk-pop")) { s.pop = null; render(host); } return; }
      const d = el.dataset;
      if (el.getAttribute("aria-disabled") === "true") return;
      if (s.pop && !el.closest(".mk-pop") && !("evAdd" in d)) s.pop = null;
      if (s.focusCls) s.focusCls = "";
      if (d.peek) { if (s.peek?.id === d.peek && s.peek.pinned) { closePeek(host); return; } showPeek(host, d.peek, el, true); return; }
      if (d.open) { go(host, d.open); return; }
      if ("home" in d) { leave(host); s.type = "briefing"; s.sel = null; s.cardFor = null; render(host); }
      else if (d.go) { leave(host); s.type = d.go; s.sel = all(s, d.go)[0]?.id; s.cardFor = null; render(host); }
      else if (d.sel) go(host, d.sel);
      else if ("new" in d) newObject(host, s.type);
      else if (d.addTheory) { s.cardFor = d.addTheory; s.cardText = ""; render(host, `[data-card="${d.addTheory}"]`); }
      else if (d.evAdd) { if (s.pop) { s.pop = null; render(host); return; } s.pop = { st: d.evAdd, q: "", i: 0 }; render(host, "[data-pq]"); }
      else if (d.opt) addEvidence(host, d.opt, s.pop.st);
      else if (d.rm) { const t = s.O[s.sel], e2 = t.ev.find(x => x[0] === d.rm); t.ev = t.ev.filter(x => x !== e2); say(host, "Evidence removed", () => { t.ev.push(e2); render(host); }); }
      else if (d.sugYes) { const t = s.O[s.sel], e2 = t.ev.find(x => x[0] === d.sugYes); e2.length = 2; s.just = `${t.id}:${d.sugYes}`; render(host); }
      else if (d.sugNo) { const t = s.O[s.sel], e2 = t.ev.find(x => x[0] === d.sugNo); t.ev = t.ev.filter(x => x !== e2); say(host, "Suggestion dismissed", () => { t.ev.push(e2); render(host); }); }
      else if (d.draftYes) accept(host, s.O[d.draftYes]);
      else if (d.draftNo) { const o = s.O[d.draftNo], was = s.sel; o.gone = true; if (s.sel === o.id) s.sel = all(s, o.kind)[0]?.id; say(host, "Draft discarded", () => { o.gone = false; s.sel = was; render(host); }); }
      else if (d.del) { s.modal = d.del; render(host, ".mk-modal .nv-btn.secondary"); }
      else if ("modalClose" in d) { const id = s.modal; s.modal = null; render(host, `[data-del="${id}"]`); }
      else if (d.delYes) { const o = s.O[d.delYes]; o.gone = true; o.made.forEach(id => { if (s.O[id]) s.O[id].gone = true; }); s.thread = s.thread.filter((m, i, a) => m.dump !== o.id && !(a[i - 1]?.dump === o.id && m.who === "agent"));
        s.modal = null; if (s.sel === o.id || s.O[s.sel]?.gone) s.sel = all(s, s.type)[0]?.id; render(host); }   // confirmed, so no toast after (10 States rule 7)
      else if ("undo" in d) undo(host);
      else if ("chatOpen" in d) { openChat(host); }
      else if (d.unfold) { s.unfold.has(d.unfold) ? s.unfold.delete(d.unfold) : s.unfold.add(d.unfold); s.scrollThread = false; render(host); s.scrollThread = true; }
      else if (d.rephrase) { go(host, d.rephrase); const t = host.querySelector(`[data-title="${d.rephrase}"]`); t?.focus(); t && caretEnd(t); }
      else if ("chatClose" in d) { s.chat = false; s.picking = false; render(host, "[data-chat-open]"); }
      else if ("send" in d) send(host);
      else if ("attach" in d) { s.comp.atts.push({ id: `a${++nid}`, kind: "image", title: "Screenshot 09.41.png" }); render(host, "[data-comp]"); }
      else if (d.attRm) { s.comp.atts = s.comp.atts.filter(a => a.id !== d.attRm); render(host, "[data-comp]"); }
      else if (d.ctxRm) { s.comp.ctx = s.comp.ctx.filter(id => id !== d.ctxRm); s.comp.ctxSet = true; render(host, "[data-comp]"); }
      else if ("pickCtx" in d) { s.picking = !s.picking; render(host); }
      else if ("recStart" in d) recStart(host);
      else if ("recStop" in d) recStop(host, true);
      else if ("recNo" in d) recStop(host, false);
    }, true);
    host.addEventListener("dblclick", e => { const r = e.target.closest(".ob-row [data-sel]"); if (r) { const t = host.querySelector(`[data-title="${r.dataset.sel}"]`); t?.focus(); t && caretEnd(t); } });
    host.addEventListener("focusin", e => { const t = e.target.closest("[data-title]"); if (t) t.dataset.orig = host._s.O[t.dataset.title]?.name ?? ""; });
    host.addEventListener("focusout", e => {
      const t = e.target.closest("[data-title]"); if (t && t.isConnected) { commitTitle(host, t); delete t.dataset.orig; }
      const c = e.target.closest("[data-card]"); if (c && !c.dataset.done && c.isConnected && !(e.relatedTarget && c.contains(e.relatedTarget))) cardDone(host, c, false);
    });
    host.addEventListener("input", e => {
      const s = host._s, t = e.target;
      if (t.matches("[data-title]")) { const o = s.O[t.dataset.title]; o.name = t.textContent.replace(/\s+/g, " "); syncNames(host, o);
        const eb = host.querySelector(`[data-eyebrow="${o.id}"]`); if (eb) eb.outerHTML = eyebrow(s, o); }
      else if (t.matches("[data-note]")) s.O[t.dataset.note].note = t.textContent;
      else if (t.matches("[data-card]")) s.cardText = t.textContent;
      else if (t.matches("[data-comp]")) {
        const m = t.value.match(/(^|\s)(https?:\/\/(\S+))\s$/);
        if (m) { s.comp.atts.push({ id: `a${++nid}`, kind: "link", title: m[3].replace(/\/.*$/, "") }); s.comp.text = t.value.slice(0, m.index + m[1].length); render(host, "[data-comp]"); return; }
        const was = s.comp.text.includes("?"); s.comp.text = t.value;
        const b = host.querySelector("[data-send]"); b.setAttribute("aria-disabled", String(!(t.value.trim() || s.comp.atts.length)));
        if (was !== t.value.includes("?")) { const ask = t.value.includes("?"); b.setAttribute("aria-label", ask ? "Ask" : "Dump"); b.dataset.tip = ask ? "Ask" : "Dump"; b.innerHTML = ic(ask ? "question" : "paper-plane-right"); }
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
      } else if (t.matches("[data-pq]")) {
        const n = s.pop.opts.length;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); s.pop.i = (s.pop.i + (e.key === "ArrowDown" ? 1 : -1) + n) % n; render(host, "[data-pq]"); host.querySelector(".mk-opt[aria-selected='true']")?.scrollIntoView({ block: "nearest" }); }
        else if (e.key === "Enter") { e.preventDefault(); const id = s.pop.opts[s.pop.i]; if (id) addEvidence(host, id, s.pop.st); }
      } else if (e.key === "F2" && t.matches("[data-sel]")) { e.preventDefault(); const x = host.querySelector(`[data-title="${t.dataset.sel}"]`); x?.focus(); x && caretEnd(x); }
    });
  };

  // Window keys act on the window you last touched. Esc is one stack: picking, the take, a transient layer, then the column.
  document.addEventListener("keydown", e => {
    const host = active || document.querySelector(".mk-host[data-live]"); if (!host?._s) return;
    const s = host._s, mod = e.metaKey || e.ctrlKey, typing = e.target.closest?.("input, textarea, [contenteditable]");
    if (mod && e.key.toLowerCase() === "j") { e.preventDefault(); if (e.shiftKey) { if (!s.comp.rec) recStart(host); } else if (s.chat && host.contains(document.activeElement) && document.activeElement.matches("[data-comp]")) { s.chat = false; render(host, "[data-chat-open]"); } else openChat(host); return; }
    if (mod && e.key.toLowerCase() === "z" && !typing && s.toast?.undo) { e.preventDefault(); undo(host); return; }
    if (mod && e.shiftKey && e.key.toLowerCase() === "l") { e.preventDefault(); s.chat = false; s.type = "dump"; s.sel = all(s, "dump")[0]?.id; render(host); return; }   // Dumps in the rail (decided 5 Nov)
    if (e.key === "Escape") {
      if (e.target.closest?.("[data-title], [data-card]")) return;
      e.preventDefault();
      if (s.picking) { s.picking = false; render(host, "[data-pick-ctx]"); return; }
      if (s.comp.rec) { recStop(host, false); return; }
      if (s.modal) { const id = s.modal; s.modal = null; render(host, `[data-del="${id}"]`); return; }
      if (s.pop) { const st = s.pop.st; s.pop = null; render(host, `[data-ev-add="${st}"]`); return; }
      if (s.peek) { closePeek(host); return; }
      if (s.chat) { s.chat = false; render(host, "[data-chat-open]"); return; }
    }
    if (!typing && !mod && !e.altKey && e.key.toLowerCase() === "n" && MAKE.includes(s.type) && host.contains(document.activeElement)) { e.preventDefault(); newObject(host, s.type); }
  });
  document.addEventListener("keydown", e => {   // modal focus stays inside the dialog
    if (e.key !== "Tab") return; const m = e.target.closest?.(".mk-modal"); if (!m) return;
    const f = [...m.querySelectorAll("button")], i = f.indexOf(document.activeElement);
    if (e.shiftKey && i === 0) { e.preventDefault(); f.at(-1).focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  });

  window.AberMake = { init, set: (host, opt) => { host._s.opt = { ...host._s.opt, ...opt }; render(host); } };
  const start = () => document.querySelectorAll("[data-mk]").forEach(init);
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", start); else start();
})();
