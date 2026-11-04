// Shared jig behaviour: choose an option where you see it, add a note to that question, copy all choices.
//
// Markup (in-context): the element that holds a question's examples carries the decision;
// each visual option inside it carries the value it chooses.
//   <section class="jig-section" data-decision="id" data-question="..." [data-default="B docked pane"]>
//     <div class="jig-compare">
//       <div class="jig-option" data-option="B docked pane"><div class="jig-label"><b>B</b> Docked pane</div> …stage… </div>
//     </div>
//   </section>
// A "Choose" toggle sits on its own row right under each option's .jig-label (inside [data-option-head] if given), the question
// is shown at the top of the group, and the note field sits at the bottom of the same group.
// Options must be visual: a value with no example to point at belongs in the note.
(() => {
  const page = document.body.dataset.jig || location.pathname;
  const key = id => `jig:${page}:${id}`;
  const load = id => { try { return JSON.parse(localStorage.getItem(key(id))) || {}; } catch { return {}; } };
  const save = (id, v) => { try { localStorage.setItem(key(id), JSON.stringify(v)); } catch {} };
  const groups = [...document.querySelectorAll("[data-decision]")];
  const live = new Map();

  for (const group of groups) {
    const id = group.dataset.decision, question = group.dataset.question || "Choose";
    const state = load(id); live.set(group, state);
    if (state.choice === undefined && group.dataset.default) state.choice = group.dataset.default;
    group.classList.add("jig-question");
    const options = [...group.querySelectorAll("[data-option]")].filter(o => o.closest("[data-decision]") === group);
    if (!options.length) console.warn(`jig: decision "${id}" has no visual [data-option] inside it`);

    const q = document.createElement("p"); q.className = "jig-question-q"; q.id = `jq-${id}`; q.textContent = question;
    const firstOptionHost = options[0]?.closest(".jig-compare") || options[0];
    if (firstOptionHost && group.contains(firstOptionHost)) firstOptionHost.before(q); else group.prepend(q);

    const buttons = [];
    const paint = () => {
      for (const { b, o, value } of buttons) {
        const on = state.choice === value;
        b.setAttribute("aria-pressed", String(on));
        b.textContent = on ? "Chosen" : "Choose";
        o.classList.toggle("is-chosen", on);
      }
    };
    for (const o of options) {
      const value = o.dataset.option;
      const b = document.createElement("button"); b.type = "button"; b.className = "jig-choose";
      b.setAttribute("aria-label", `Choose ${value} for: ${question}`);
      b.onclick = () => { state.choice = state.choice === value ? null : value; save(id, state); paint(); };
      const head = o.querySelector(":scope > [data-option-head]");
      const label = o.querySelector(":scope > .jig-label");
      if (head) head.append(b); else if (label) label.after(b); else o.prepend(b);
      buttons.push({ b, o, value });
    }
    paint();

    const noteWrap = document.createElement("label"); noteWrap.className = "jig-question-note";
    const noteText = document.createElement("span"); noteText.textContent = "Note on this question (optional)";
    const note = document.createElement("textarea"); note.placeholder = "Combine, tweak or reject";
    note.value = state.note || ""; note.setAttribute("aria-describedby", q.id);
    note.oninput = () => { state.note = note.value; save(id, state); };
    noteWrap.append(noteText, note);
    const lastHost = options.length ? (options.at(-1).closest(".jig-compare") || options.at(-1)) : null;
    if (lastHost && group.contains(lastHost) && lastHost !== group) lastHost.after(noteWrap); else group.append(noteWrap);
  }
  if (!groups.length) return;

  const dock = document.createElement("div"); dock.className = "jig-dock";
  const copy = document.createElement("button"); copy.type = "button"; copy.textContent = "Copy choices";
  const out = document.createElement("output"); out.setAttribute("aria-live", "polite");
  copy.onclick = async () => {
    const lines = [`# ${document.title}`, ""];
    for (const g of groups) { const s = live.get(g);
      lines.push(`- ${g.dataset.decision} — ${g.dataset.question}: ${s.choice || "(no choice)"}${s.note ? ` — note: ${s.note}` : ""}`); }
    const text = lines.join("\n");
    try { await navigator.clipboard.writeText(text); out.textContent = "Copied"; } catch { console.log(text); out.textContent = "Logged to console"; }
    setTimeout(() => out.textContent = "", 1800);
  };
  dock.append(copy, out); document.body.append(dock);
})();
