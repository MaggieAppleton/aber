// The one list of grammar pages: what each settles, which choices are open or decided, and what was revised.
// Read by the index (design/grammar/index.html) and by every jig page (_shared/page.js), so they can't disagree.
//
//   decisions: one per [data-decision] on the page. `pick` = decided (Maggie's pick); no `pick` = open.
//   revised:   what changed since Maggie last reviewed the page. `target` is a [data-decision] id or an element id;
//              `at` is when it changed (from git), `what` says what changed in a few words.
// When Maggie decides a choice, add its `pick` and `decided`; when you change something she has seen, add a `revised` entry.
window.GRAMMAR = {
  groups: [
    { id: "found", name: "Foundations" },
    { id: "nav", name: "Navigation" },
    { id: "obj", name: "Objects" },
    { id: "beh", name: "Behaviour" },
    { id: "scr", name: "Screens and flows" },
  ],
  pages: [
    { key: "grammar-00-colour", dir: "00-colour", num: "00", title: "Colour", icon: "palette", group: "found", decided: "2026-11-04",
      desc: "System D: linen neutrals, ink primary, bright type tiles",
      sum: "The neutrals, inks, accent and type hues every surface is painted with.",
      decisions: [{ id: "system", q: "Colour system", pick: "D linen bright types" }], revised: [] },
    { key: "grammar-01-spacing", dir: "01-spacing", num: "01", title: "Spacing", icon: "ruler", group: "found", decided: "2026-11-04",
      desc: "Regular density; five gaps and the insets they set",
      sum: "How dense Aber is, and the few rules that set every padding, gap and height.",
      decisions: [{ id: "density", q: "Density", pick: "B regular" }, { id: "list", q: "Middle column theories", pick: "A cards" }], revised: [] },
    { key: "grammar-02-type", dir: "02-type", num: "02", title: "Type", icon: "text-aa", group: "found", decided: "2026-11-04",
      desc: "Geist at 11, 12 and 13, and 24 for the title",
      sum: "The sizes, weights and inks text may use, and which role takes which.",
      decisions: [{ id: "scale", q: "Scale", pick: "B 1 Nov four" }, { id: "sechead", q: "Section header ink", pick: "A ink 2" }], revised: [] },
    { key: "grammar-03-icons", dir: "03-icons", num: "03", title: "Icons", icon: "shapes", group: "found", decided: "2026-11-04",
      desc: "Phosphor at 16 and 14; object glyphs on their tile",
      sum: "Icon sizes, slots and alignment, and where object glyphs sit on their tile.",
      decisions: [{ id: "size", q: "Icon size beside 12px text", pick: "B 16 and 14" }, { id: "tile", q: "Object glyph tiles", pick: "B everywhere" }], revised: [] },
    { key: "grammar-04-surfaces", dir: "04-surfaces", num: "04", title: "Surfaces and layers", icon: "stack", group: "found", decided: "2026-11-04",
      desc: "Seven tiers, each with its own shadow and radius",
      sum: "Which surface sits at which height, and the fill, edge, shadow, radius and z-index each height gets.",
      decisions: [{ id: "cards", q: "Cards on the base", pick: "A soft shadow" }, { id: "pop", q: "Peeks and menus", pick: "B crisp" }, { id: "float", q: "Floating controls", pick: "A shadow" }], revised: [] },
    { key: "grammar-05-controls", dir: "05-controls", num: "05", title: "Controls", icon: "toggle-left", group: "found", decided: "2026-11-04",
      desc: "Buttons, fields and menus from the foundations alone",
      sum: "Every control in Aber, assembled only from the decided foundations.",
      decisions: [{ id: "secondary", q: "Secondary button", pick: "A hairline" }, { id: "input", q: "Text fields", pick: "A filled" }, { id: "danger", q: "Delete confirmation", pick: "A ink" }], revised: [] },
    { key: "grammar-nav", dir: "nav", num: "Nav", title: "Type-first default", icon: "sidebar-simple", group: "nav", decided: "2026-11-04",
      desc: "A rail of types, a list, the item in the main area",
      sum: "The default view: a rail of types, a list of that type's items, the selected item in the main area.",
      decisions: [{ id: "peek", q: "Peek", pick: "a Tethered card" }, { id: "briefing", q: "Briefing", pick: "First rail item, default on open (revised 4 Nov)" }, { id: "order", q: "Rail order", pick: "a Refined to raw" },
        { id: "themefilter", q: "Theme filter", pick: "a Yes" }, { id: "unseen", q: "Unseen group in Signals", pick: "b No" }, { id: "switcher", q: "View switcher", pick: "a Rail foot" },
        { id: "railauto", q: "Rail collapses when the chat opens" }],
      revised: [{ target: "try", at: "2026-11-05T11:54", what: "Type rail condensed: rows 28, 2 apart, Briefing in the same list" },
        { target: "railauto", at: "2026-11-05T12:22", what: "New choice: the rail collapses to icons" }] },
    { key: "grammar-06-objects", dir: "06-objects", num: "06", title: "Objects", icon: "cube", group: "obj", decided: "2026-11-04",
      desc: "One anatomy at three rungs: preview, peek, full",
      sum: "One anatomy for every object, shown at three rungs: preview, peek and full.",
      decisions: [{ id: "align", q: "Tile and text alignment", pick: "c Smaller tile, centred" }, { id: "challenge", q: "Challenged theory on previews", pick: "c Not on previews" },
        { id: "fresh", q: "Unseen activity", pick: "b Unread weight" }, { id: "peek", q: "Peek contents", pick: "a Essentials and relations" }, { id: "full", q: "Full view attributes", pick: "a Prose first" }], revised: [{ target: "hero", at: "2026-11-05T12:37", what: "One left edge at the title in every full view; proposal blocks: label, reason, row, verb buttons" }] },
    { key: "grammar-06b-confidence", dir: "06b-confidence", num: "06b", title: "Confidence", icon: "gauge", group: "obj", decided: "2026-11-04",
      desc: "A small meter on previews, the five-segment setter in full",
      sum: "How a theory's 1 to 5 confidence shows beside its name and is set in its full view.",
      decisions: [{ id: "small", q: "Mark on previews", pick: "C Meter" }, { id: "large", q: "Setter in the full view", pick: "06's five-segment setter, with its history" },
        { id: "position", q: "Position in rows", pick: "a Right of the name" }], revised: [] },
    { key: "grammar-07-rungs", dir: "07-rungs", num: "07", title: "Moving between levels", icon: "arrows-out-simple", group: "beh", decided: "2026-11-05",
      desc: "Peeks grow from their trigger; Open carries the title",
      sum: "How you move from a preview to its peek, to the full view, and back.",
      decisions: [{ id: "open", q: "Open", pick: "a Shared tile and title" }, { id: "pos", q: "Peek position", pick: "a Beside the trigger" }, { id: "back", q: "Back lands on", pick: "a The preview" }], revised: [] },
    { key: "grammar-08-briefing", dir: "08-briefing", num: "08", title: "Briefing", icon: "newspaper", group: "scr", decided: "2026-11-05",
      desc: "What changed since you last looked, ordered by need",
      sum: "The view Aber opens on: one column of what changed since you last looked, ordered by what needs you.",
      decisions: [{ id: "group", q: "New signals grouped by", pick: "A By theme" }, { id: "settle", q: "A decided item", pick: "A Leaves, with Undo" }, { id: "seen", q: "When a signal counts as seen", pick: "B When read" },
        { id: "labels", q: "Decision button labels", pick: "B Verbs" }, { id: "sections", q: "Section breaks", pick: "A Header rule" }, { id: "change", q: "A challenge's confidence change", pick: "A Red step" }],
      revised: [
        { target: "live", at: "2026-11-05T12:17", what: "One left edge, inset 88, clearer subjects, the reason under each label, old and new wording boxes" },
        { target: "sections", at: "2026-11-05T11:54", what: "New choice" },
        { target: "change", at: "2026-11-05T12:17", what: "New choice, now three red variants of the lost step" },
      ] },
    { key: "grammar-09-making", dir: "09-making", num: "09", title: "Making things", icon: "plus-circle", group: "scr",
      desc: "Capture, making in place, linking and renaming",
      sum: "How new things get into Aber: capture through Dump or ask, then making, linking and renaming in place.",
      decisions: [{ id: "log", q: "Where ⌘⇧L takes you" }],
      revised: [{ target: "try", at: "2026-11-05T11:54", what: "Dump or ask floats over its surface, sheet shadow, aligned recording bar" }] },
    { key: "grammar-10-states", dir: "10-states", num: "10", title: "States", icon: "circle-dashed", group: "scr", decided: "2026-11-04",
      desc: "Empty, loading, work, errors, offline and toasts",
      sum: "Empty, loading, background work, errors, offline, toasts and the one confirmation.",
      decisions: [{ id: "work", q: "Agent work in progress", pick: "B On the Dumps type" }, { id: "done", q: "A finished dump", pick: "A Toast with Undo" }, { id: "offline", q: "Offline", pick: "A Beside the view switcher" }], revised: [] },
    { key: "grammar-11-views", dir: "11-views", num: "11", title: "Views", icon: "columns", group: "scr",
      desc: "Columns, Atlas and Timeline restyled, not re-laid out",
      sum: "Columns, Atlas and Timeline keep today's layout; only their values change to the decided foundations.",
      decisions: [{ id: "dim", q: "How unrelated objects recede" }, { id: "size", q: "What a territory's size means" }, { id: "labels", q: "When theory names show on the Atlas" }], revised: [] },
  ],
};

// Shared helpers: picks and last visits live in this browser's localStorage, keyed the same way jig.js keys them.
window.GRAMMAR.util = (() => {
  const get = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = iso => { const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const choice = (page, id) => get(`jig:${page.key}:${id}`)?.choice || null;
  const open = page => page.decisions.filter(d => !d.pick);
  const unpicked = page => open(page).filter(d => !choice(page, d.id));
  // A visit more than 30 minutes after the last one moves "last" to "prev"; revisions newer than "prev" are new.
  const seenKey = page => `grammar:seen:${page.key}`;
  const seen = page => get(seenKey(page)) || {};
  const visit = page => {
    const now = Date.now(), s = seen(page);
    const next = s.last && now - s.last > 30 * 60e3 ? { prev: s.last, last: now } : { prev: s.prev ?? null, last: now };
    set(seenKey(page), next); return next;
  };
  const isNew = (page, r, ref = seen(page).last) => !ref || new Date(r.at).getTime() > ref;
  const latest = page => page.revised.reduce((a, r) => (!a || r.at > a ? r.at : a), null);
  return { get, set, day, choice, open, unpicked, seen, visit, isNew, latest };
})();
