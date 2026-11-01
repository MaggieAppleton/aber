import { useDecisions, type Decisions } from "./store";
import "./decide.css";

type Opt = { k: string; label: string; note: string; rec?: string };
type D = {
  slug: string;
  title: string;
  context: string;
  options: Opt[];
  link?: string;
  /** A pick already made in another jig that answers this decision. */
  from?: { key: string; where: string; map: Record<string, string> };
};
type Section = { name: string; items: D[] };

const SECTIONS: Section[] = [
  { name: "Design", items: [
    { slug: "main-view", title: "Main view", context: "The view Aber opens on.", link: "/app", options: [
      { k: "columns", label: "Columns", note: "Contains everything Theme sections shows and adds lineage.", rec: "moderate" },
      { k: "sections", label: "Theme sections", note: "Familiar and calm, but lineage needs another view." },
      { k: "both", label: "Ship both as views", note: "Two layouts to build and keep in step." },
    ] },
    { slug: "columns-fold", title: "Columns folding", context: "How columns you are not reading collapse.", link: "/columns#rails", options: [
      { k: "rails", label: "Rails", note: "Folded columns keep their names as narrow rails.", rec: "moderate" },
      { k: "dots", label: "Dots", note: "Smaller, but names only on hover." },
    ] },
    { slug: "atlas-structure", title: "Atlas for v1", context: "Which map structure ships first. The Paper treatment is decided.", link: "/atlas#treatment-circles",
      from: { key: "atlas-treatment", where: "/atlas", map: { "circles:paper": "circles", "terrain:paper": "terrain" } }, options: [
      { k: "circles", label: "Circles", note: "Simpler layout and hit areas; terrain can follow later.", rec: "moderate" },
      { k: "terrain", label: "Terrain", note: "Richer overlaps, harder layout and labelling." },
      { k: "both", label: "Both as a toggle", note: "Two renderers to maintain from day one." },
    ] },
    { slug: "atlas-signals", title: "Signals on the map", context: "Whether and when evidence ticks appear around theories.", link: "/atlas#signals",
      from: { key: "atlas-signals", where: "/atlas", map: { none: "none", halo: "halo", zoom: "zoom" } }, options: [
      { k: "halo-zoom", label: "Halos + reveal on zoom", note: "Faint halos at rest, gists appear as you zoom in.", rec: "moderate" },
      { k: "none", label: "None, counts only", note: "Cleanest; says nothing about which theory a signal bears on." },
      { k: "halo", label: "Halos always", note: "Weight of evidence at a glance; busier at rest." },
      { k: "zoom", label: "Reveal on zoom only", note: "Clean overview; evidence hidden until you zoom." },
    ] },
    { slug: "river", title: "River timeline", context: "Field is the timeline. Does River survive as well?", link: "/timeline#chain-r-outline",
      from: { key: "timeline-chain-river", where: "/timeline", map: { "chain-r-outline": "keep" } }, options: [
      { k: "drop", label: "Drop for v1", note: "One timeline to build and learn.", rec: "moderate" },
      { k: "keep", label: "Keep River outline", note: "A second timeline lens for reading chains as an outline." },
    ] },
    { slug: "spark", title: "Confidence sparkline", context: "How a theory's confidence history is drawn in the pane.", link: "/details",
      from: { key: "confidence-history", where: "/details", map: { A: "A", B: "B", C: "C", D: "D", E: "E" } }, options: [
      { k: "A", label: "A. Steps", note: "Hard steps, each run coloured by its move.", rec: "low" },
      { k: "B", label: "B. Steps + fill", note: "Steps over a soft fill in the current level's tone." },
      { k: "C", label: "C. Angled + dots", note: "Straight lines with a dot at every change." },
      { k: "D", label: "D. Ink + midline", note: "One ink line around a dotted Even baseline." },
      { k: "E", label: "E. Shaded by height", note: "Stroke shades amber to green by level." },
    ] },
    { slug: "theme-icon", title: "Theme icon", context: "The glyph for a theme everywhere it appears.", link: "/icons#icon-theme",
      from: { key: "icon-theme", where: "/icons", map: { Compass: "compass", Binoculars: "binoculars" } }, options: [
      { k: "compass", label: "Compass", note: "The current pick; reads as orientation.", rec: "current pick" },
      { k: "binoculars", label: "Binoculars", note: "Reads as watching an area for change." },
    ] },
    { slug: "pill-send-attach", title: "Pill send/ask and attachments", context: "The pill's remaining open pieces.", link: "/pill#revisions", options: [
      { k: "keep", label: "Keep current defaults", note: "Build what the pill jig shows now.", rec: "moderate" },
      { k: "revisit", label: "Revisit on /pill", note: "Settle send/ask and attachments before the spec." },
    ] },
    { slug: "briefing", title: "Morning review in v1", context: "How you catch up on what changed while you were away.", link: "/homes", options: [
      { k: "lens", label: "Briefing as an inbox lens", note: "Drafts, challenges, suggestions and new signals since you last looked.", rec: "moderate–high" },
      { k: "marks", label: "Marks in the main views only", note: "No new surface; catching up means scanning." },
      { k: "defer", label: "Defer", note: "Ship without a review surface." },
    ] },
    { slug: "dump-log", title: "Dump log in v1", context: "Seeing what you dumped and what became of it.", link: "/pill", options: [
      { k: "minimal", label: "Minimal list from the pill", note: "Rises from the pill with processing status and bin.", rec: "moderate" },
      { k: "defer", label: "Defer", note: "Dumps are only visible through what they produced." },
    ] },
    { slug: "deck-document", title: "Deck and Document", context: "The two presenting and writing homes.", link: "/homes", options: [
      { k: "defer", label: "Defer to after v1", note: "Keeps v1 on capture and thinking.", rec: "high" },
      { k: "document", label: "Include Document", note: "A writing lens over themes and theories." },
      { k: "deck", label: "Include Deck", note: "A presenting lens; most work for least daily use." },
    ] },
    { slug: "phone", title: "Phone in v1", context: "What Aber does on a phone.", link: "/pill#phone", options: [
      { k: "shortcut", label: "Shortcut capture + minimal inbox", note: "Capture via Apple Shortcut, plus a responsive inbox and pane.", rec: "moderate" },
      { k: "capture", label: "Capture only", note: "The Shortcut and nothing to read on the phone." },
      { k: "full", label: "Full responsive app", note: "Every view on a small screen; much more work." },
    ] },
    { slug: "half-vs-compact", title: "Half versus compact pane", context: "With the dump column open, half and compact are nearly the same width.", link: "/app", options: [
      { k: "half", label: "Half wins", note: "The pane keeps its 50/50 stop; compact is skipped.", rec: "moderate" },
      { k: "compact", label: "Compact wins", note: "The half stop is skipped while the column is open." },
    ] },
  ] },
  { name: "Grammar", items: [
    { slug: "chat-as-dump", title: "Each chat message is a Dump", context: "What gets stored when you talk to Aber.", link: "/decisions#chat",
      from: { key: "chat", where: "/decisions", map: { "all-dumps": "yes", "dumps-only": "material" } }, options: [
      { k: "yes", label: "Yes", note: "One way in, full provenance; the log holds questions too.", rec: "moderate" },
      { k: "material", label: "Only material", note: "Questions are discarded; a cleaner log, some thinking lost." },
    ] },
    { slug: "draft-expiry", title: "Drafts", context: "What happens to drafts you leave alone.", link: "/decisions#drafts",
      from: { key: "drafts", where: "/decisions", map: { "stack-by-age": "stack", "expire-30": "expire", fade: "fade" } }, options: [
      { k: "stack", label: "No expiry, older ones stack", note: "Nothing vanishes without you.", rec: "moderate" },
      { k: "expire", label: "Expire after 30 days", note: "Tidy, but good ones can be lost." },
      { k: "fade", label: "Fade with age", note: "Competes with the translucent look of unaccepted material." },
    ] },
    { slug: "near-dup", title: "Near-duplicate signals", context: "The same observation from two sources.",
      from: { key: "near-dup", where: "/decisions", map: { suggest: "suggest", auto: "auto" } }, options: [
      { k: "suggest", label: "Suggest a merge", note: "Follows the authority rule; signals are already yours.", rec: "high" },
      { k: "auto", label: "Merge automatically", note: "Less triage; the agent's judgement applied to your material." },
    ] },
    { slug: "sources", title: "Sources per signal", context: "One observation can be reported in several places.",
      from: { key: "sources", where: "/decisions", map: { many: "several", one: "one" } }, options: [
      { k: "several", label: "Several", note: "Merging near-duplicates needs this.", rec: "high" },
      { k: "one", label: "One", note: "Simpler, but a merge has to drop a source." },
    ] },
    { slug: "tombstones", title: "Discarded signals", context: "Whether a discard leaves a hidden record.",
      from: { key: "tombstones", where: "/decisions", map: { yes: "keep", no: "remove" } }, options: [
      { k: "keep", label: "Keep tombstones", note: "A repeat dump can't bring them back.", rec: "high" },
      { k: "remove", label: "Remove completely", note: "Cleaner data; discarded signals can return." },
    ] },
    { slug: "retire-reasons", title: "Retire reasons", context: "Disproven, superseded and abandoned.",
      from: { key: "retire", where: "/decisions", map: { complete: "complete", add: "add" } }, options: [
      { k: "complete", label: "Complete", note: "Covers being wrong, being replaced and losing interest.", rec: "moderate" },
      { k: "add", label: "Add more", note: "Name them in the note." },
    ] },
    { slug: "pin", title: "Pin verb", context: "Pin was proposed to scale the World page.", options: [
      { k: "drop", label: "Drop it", note: "Columns and Atlas replace the at-scale World page.", rec: "moderate" },
      { k: "keep", label: "Keep for themes", note: "One more verb to learn and build." },
    ] },
  ] },
  { name: "Build", items: [
    { slug: "stack", title: "Front-end", context: "What the app itself is written in.", options: [
      { k: "react", label: "React + Vite + TS", note: "Lift the jig components as they are.", rec: "moderate" },
      { k: "svelte", label: "SvelteKit + TS", note: "Learn Svelte; every component is rewritten." },
    ] },
    { slug: "server", title: "Server", context: "Already agreed; confirm or object.", options: [
      { k: "hono", label: "Hono + SQLite", note: "TypeScript behind a typed tool layer, Litestream backups.", rec: "high" },
      { k: "other", label: "Other", note: "Say what in the note." },
    ] },
    { slug: "agents", title: "Agents", context: "How processing and the thinking jobs run.", options: [
      { k: "api", label: "Claude API with tool use", note: "Sonnet for processing, Opus for red-team and extrapolation, jobs on a queue.", rec: "moderate" },
      { k: "sdk", label: "Claude Agent SDK runtime", note: "More built in, more runtime to host." },
      { k: "other", label: "Other", note: "Say what in the note." },
    ] },
    { slug: "transcription", title: "Voice transcription", context: "Where voice dumps become text.", options: [
      { k: "server", label: "Server-side Whisper-class", note: "One path for every device.", rec: "low" },
      { k: "device", label: "On-device via the Shortcut", note: "Free and private; quality varies by phone." },
      { k: "other", label: "Other", note: "Say what in the note." },
    ] },
    { slug: "hosting", title: "Hosting", context: "Whether Aber is a personal tool or a work one.",
      from: { key: "hosting", where: "/decisions", map: { own: "own", coolify: "coolify" } }, options: [
      { k: "own", label: "Own small server on Tailscale", note: "Personal and portable, about $14 a month.", rec: "low" },
      { k: "coolify", label: "Team Coolify server", note: "Free and run by someone else; ties Aber to work." },
    ] },
    { slug: "media", title: "Media storage", context: "Images and video live outside SQLite.",
      from: { key: "media", where: "/decisions", map: { disk: "disk", b2: "b2" } }, options: [
      { k: "disk", label: "Server disk + B2 backup", note: "Simple to serve; needs its own backup job.", rec: "moderate" },
      { k: "b2", label: "Straight to B2", note: "Durable from the start; latency and signed URLs." },
    ] },
    { slug: "v1-scope", title: "v1 scope", context: "Capture, process, browse, theories with tripwire and confidence, briefing.", options: [
      { k: "core", label: "As stated", note: "Columns, Atlas, Timeline, pane, pill, dump log. Agents process dumps, link evidence, watch tripwires; cluster, red-team, extrapolate, diagnosticity and de-duplicate later.", rec: "moderate" },
      { k: "smaller", label: "Smaller", note: "Capture, Columns, pane and processing only." },
      { k: "larger", label: "Larger", note: "Include every agent job." },
    ] },
  ] },
];

const ALL = SECTIONS.flatMap(s => s.items);
const keyOf = (d: D) => `d-${d.slug}`;

/** The stored d- choice, or else a pick made in another jig. */
function resolve(d: D, decisions: Decisions): { choice?: string; inherited?: string } {
  const own = decisions[keyOf(d)]?.choice;
  if (own) return { choice: own };
  const related = d.from && decisions[d.from.key]?.choice;
  const mapped = related ? d.from!.map[related] : undefined;
  return mapped ? { choice: mapped, inherited: d.from!.where } : {};
}

export function DevelopDecideJig() {
  const { decisions, update, saved } = useDecisions();
  const done = ALL.filter(d => resolve(d, decisions).choice).length;
  let n = 0;

  return (
    <main className="dc">
      <header className="dc-header">
        <a href="/">Jigs</a>
        <h1>Decide</h1>
        <p>Everything still open before the build spec. Each has my recommendation; pick or override, add a note.</p>
      </header>

      <nav className="dc-progress" aria-label="Progress">
        <span className="dc-count">{done} of {ALL.length} decided{saved ? "" : ", saving"}</span>
        <div className="dc-chips">
          {ALL.map((d, i) => (
            <a key={d.slug} href={`#${keyOf(d)}`} title={d.title} data-done={resolve(d, decisions).choice ? "" : undefined}>{i + 1}</a>
          ))}
        </div>
      </nav>

      {SECTIONS.map(s => (
        <section key={s.name} className="dc-section">
          <h2 className="dc-section-name">{s.name}</h2>
          {s.items.map(d => {
            n += 1;
            const id = keyOf(d);
            const stored = decisions[id];
            const { choice, inherited } = resolve(d, decisions);
            return (
              <article key={id} id={id} className="dc-item" data-done={choice ? "" : undefined}>
                <div className="dc-head">
                  <h3><span className="dc-num">{n}</span>{d.title}</h3>
                  {d.link && <a className="dc-link" href={d.link}>{d.link}</a>}
                </div>
                <p className="dc-context">{d.context}</p>
                <div className="dc-options" role="radiogroup" aria-label={d.title}>
                  {d.options.map(o => {
                    const on = choice === o.k;
                    return (
                      <label key={o.k} className="dc-option" data-chosen={on ? "" : undefined}>
                        <input
                          type="radio" name={id} value={o.k} checked={on}
                          onChange={() => update(id, { choice: o.k })}
                          onClick={() => { if (on && inherited) update(id, { choice: o.k }); }}
                        />
                        <span className="dc-option-top">
                          <strong>{o.label}</strong>
                          {o.rec && <span className="dc-rec">{o.rec === "current pick" ? "Recommended" : `Recommended, ${o.rec}`}</span>}
                        </span>
                        <span className="dc-note-line">{o.note}</span>
                        {on && inherited && <span className="dc-inherited">Picked on {inherited}</span>}
                      </label>
                    );
                  })}
                </div>
                <textarea
                  className="dc-note" rows={1} placeholder="Note"
                  aria-label={`Note on ${d.title}`}
                  value={stored?.note ?? ""}
                  onChange={e => update(id, { note: e.target.value })}
                />
              </article>
            );
          })}
        </section>
      ))}
    </main>
  );
}
