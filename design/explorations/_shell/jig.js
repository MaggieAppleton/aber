// Shared jig behaviour: Choose controls with notes, persisted locally, and one Copy choices action.
// Markup: <div class="jig-decision" data-decision="id" data-question="..." data-options="Current|A|B|C"></div>
(() => {
  const page = document.body.dataset.jig || location.pathname;
  const key = id => `jig:${page}:${id}`;
  const load = id => { try { return JSON.parse(localStorage.getItem(key(id))) || {}; } catch { return {}; } };
  const save = (id, v) => { try { localStorage.setItem(key(id), JSON.stringify(v)); } catch {} };
  const decisions = [...document.querySelectorAll(".jig-decision[data-decision]")];
  for (const el of decisions) {
    const id = el.dataset.decision, state = load(id);
    if (state.choice === undefined && el.dataset.default) state.choice = el.dataset.default;
    const q = document.createElement("div"); q.className = "jig-decision-q"; q.textContent = el.dataset.question || "Choose";
    const row = document.createElement("div"); row.className = "jig-choices"; row.setAttribute("role", "group"); row.setAttribute("aria-label", q.textContent);
    for (const option of (el.dataset.options || "").split("|")) {
      const b = document.createElement("button"); b.type = "button"; b.textContent = option;
      b.setAttribute("aria-pressed", String(state.choice === option));
      b.onclick = () => { state.choice = state.choice === option ? undefined : option; save(id, state);
        row.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x.textContent === state.choice))); };
      row.append(b);
    }
    const note = document.createElement("textarea"); note.placeholder = "Note (optional): combine, tweak or reject"; note.value = state.note || "";
    note.setAttribute("aria-label", `Note for ${q.textContent}`);
    note.oninput = () => { state.note = note.value; save(id, state); };
    el.append(q, row, note);
  }
  if (!decisions.length) return;
  const dock = document.createElement("div"); dock.className = "jig-dock";
  const copy = document.createElement("button"); copy.type = "button"; copy.textContent = "Copy choices";
  const out = document.createElement("output"); out.setAttribute("aria-live", "polite");
  copy.onclick = async () => {
    const lines = [`# ${document.title}`, ""];
    for (const el of decisions) { const s = load(el.dataset.decision);
      lines.push(`- ${el.dataset.decision} — ${el.dataset.question}: ${s.choice || "(no choice)"}${s.note ? ` — note: ${s.note}` : ""}`); }
    const text = lines.join("\n");
    try { await navigator.clipboard.writeText(text); out.textContent = "Copied"; } catch { console.log(text); out.textContent = "Logged to console"; }
    setTimeout(() => out.textContent = "", 1800);
  };
  dock.append(copy, out); document.body.append(dock);
})();
