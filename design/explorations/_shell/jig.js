// Shared jig behaviour: choose an option where you see it, add a note to that question, copy all choices,
// and a fixed dock that always shows Copy choices, how many choices are still open, and how much was revised.
//
// Markup (in-context): the element that holds a question's examples carries the decision;
// each visual option inside it carries the value it chooses.
//   <section class="jig-section" data-decision="id" data-question="..." [data-default="B docked pane"] [data-decided="B docked pane"]>
//     <div class="jig-compare">
//       <div class="jig-option" data-option="B docked pane"><div class="jig-label"><b>B</b> Docked pane</div> …stage… </div>
//     </div>
//   </section>
// - A "Choose" toggle sits at the end of each option's .jig-label (or [data-option-head] if given); the question
//   is shown at the top of the group and the note field at the bottom.
// - Options may also live elsewhere and join a decision with data-for="<id>".
// - data-default is the recommendation: it's labelled "Recommended", and stages may follow it, but it isn't a pick.
// - data-decided marks a settled question: its option shows "Decided", it has no Choose buttons, and it isn't counted.
// - Elements with data-revised count in the dock's "revised" number.
// Runs after every deferred script (DOMContentLoaded on document, before window listeners), so page scripts can set data-decided or data-revised first.
// Fires "jig:change" on document; window.Jig = { pick(id), counts() }.
(() => {
  const init = () => {
    const page = document.body.dataset.jig || location.pathname;
    const key = id => `jig:${page}:${id}`;
    const load = id => { try { return JSON.parse(localStorage.getItem(key(id))) || {}; } catch { return {}; } };
    const save = (id, v) => { try { localStorage.setItem(key(id), JSON.stringify(v)); } catch {} };
    const groups = [...document.querySelectorAll("[data-decision]")];
    const live = new Map();
    const tag = (text, cls) => { const s = document.createElement("span"); s.className = `jig-tag ${cls}`; s.textContent = text; return s; };

    for (const group of groups) {
      const id = group.dataset.decision, question = group.dataset.question || "Choose";
      const decided = group.dataset.decided;
      const state = load(id); live.set(group, state);
      group.classList.add("jig-question");
      if (decided) group.classList.add("is-decided");
      const remote = [...document.querySelectorAll(`[data-option][data-for="${id}"]`)];
      const options = remote.length ? remote : [...group.querySelectorAll("[data-option]")].filter(o => o.closest("[data-decision]") === group && !o.dataset.for);
      if (!options.length && !decided) console.warn(`jig: decision "${id}" has no visual [data-option] inside it`);

      const q = document.createElement("p"); q.className = "jig-question-q"; q.id = `jq-${id}`; q.textContent = question;
      group.prepend(q);

      const labelOf = o => o.querySelector(":scope > [data-option-head]") || o.querySelector(":scope > .jig-label");
      if (decided) {
        for (const o of options) if (o.dataset.option === decided) {
          o.classList.add("is-chosen");
          const l = labelOf(o); (l || o).append(tag("Decided", "is-decided"));
        }
        continue;
      }

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
        b.onclick = () => {
          state.choice = state.choice === value ? null : value; save(id, state); paint();
          document.dispatchEvent(new CustomEvent("jig:change", { detail: { id, choice: state.choice } }));
        };
        const head = o.querySelector(":scope > [data-option-head]");
        const label = o.querySelector(":scope > .jig-label");
        if (value === group.dataset.default) (head || label || o).append(tag("Recommended", "is-rec"));
        if (head) head.append(b); else if (label) label.append(b); else o.prepend(b);
        buttons.push({ b, o, value });
      }
      paint();

      const noteWrap = document.createElement("label"); noteWrap.className = "jig-question-note";
      const noteText = document.createElement("span"); noteText.textContent = "Note (optional)";
      const note = document.createElement("textarea"); note.placeholder = "Combine, tweak or reject"; note.rows = 2;
      note.value = state.note || ""; note.setAttribute("aria-describedby", q.id);
      note.oninput = () => { state.note = note.value; save(id, state); };
      noteWrap.append(noteText, note);
      const lastHost = options.length ? (options.at(-1).closest(".jig-compare") || options.at(-1)) : null;
      if (!remote.length && lastHost && group.contains(lastHost) && lastHost !== group) lastHost.after(noteWrap); else group.append(noteWrap);
    }

    const pick = id => {
      const g = groups.find(x => x.dataset.decision === id); if (!g) return undefined;
      if (g.dataset.decided) return g.dataset.decided;
      const c = live.get(g).choice; return c === undefined ? g.dataset.default : c;
    };
    const counts = () => {
      const open = groups.filter(g => !g.dataset.decided);
      return { total: open.length, open: open.filter(g => !live.get(g).choice).length, revised: document.querySelectorAll("[data-revised]").length };
    };
    window.Jig = { pick, counts };
    window.JigPick = pick;

    // The dock: fixed bottom-left on every jig, clear of Agentation (bottom-right) and Dial Kit (top-right)
    const dock = document.createElement("div"); dock.className = "jig-dock"; dock.setAttribute("role", "region"); dock.setAttribute("aria-label", "Choices");
    const copy = document.createElement("button"); copy.type = "button"; copy.className = "jig-dock-copy"; copy.textContent = "Copy choices";
    const status = document.createElement("span"); status.className = "jig-dock-status"; status.setAttribute("aria-live", "polite");
    const rev = document.createElement("span"); rev.className = "jig-dock-rev";
    const paintDock = () => {
      const c = counts();
      status.textContent = c.total ? `${c.open} of ${c.total} open` : "All decided";
      status.classList.toggle("is-open", c.open > 0);
      rev.textContent = c.revised ? `${c.revised} revised` : ""; rev.hidden = !c.revised;
    };
    copy.onclick = async () => {
      const lines = [`# ${document.title}`, ""];
      for (const g of groups) {
        const s = live.get(g), d = g.dataset.decided;
        lines.push(`- ${g.dataset.decision} — ${g.dataset.question}: ${d ? `decided, ${d}` : s.choice || "(no choice)"}${s.note ? `; note: ${s.note}` : ""}`);
      }
      const text = lines.join("\n");
      let msg; try { await navigator.clipboard.writeText(text); msg = "Copied"; } catch { console.log(text); msg = "Logged to console"; }
      copy.textContent = msg; setTimeout(() => copy.textContent = "Copy choices", 1600);
    };
    dock.append(copy, status, rev); document.body.append(dock);
    paintDock();
    document.addEventListener("jig:change", paintDock);
    document.addEventListener("jig:refresh", paintDock);
  };
  if (document.readyState === "complete") init(); else document.addEventListener("DOMContentLoaded", init);
})();
