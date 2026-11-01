import type { ReactNode } from "react";
import { JigPage } from "./jig";
import "./homes/homes.css";

/*
 * The index for the build agent: every surface and interaction, where its canonical version lives, and the behaviours
 * and constants to copy. Constants are quoted from the code named in each row; the code is the source of truth.
 */

type Status = "Canonical" | "Reference for details" | "Exploration — superseded" | "Reference only";
type Row = { what: string; where: { href: string; label: string }[]; status: Status; spec: ReactNode; src: string };

const L = (href: string, label = href) => ({ href, label });

const CANON: Row[] = [
  { what: "App frame and views", where: [L("/app")], status: "Canonical", src: "homes/app-shell.tsx",
    spec: <>Five views of one world: Theme sections (opens first, ⌘1), Columns ⌘2, Atlas ⌘3, Timeline ⌘4, Briefing ⌘5. View change: cross-fade 0.22s, ease <code>[0.16, 1, 0.3, 1]</code>, incoming scale 0.985 → 1, outgoing → 1.01 (no scale with reduced motion). Whatever is open stays open. Jig frame 1360 × 820.</> },
  { what: "View switcher", where: [L("/app")], status: "Canonical", src: "homes/app-shell.tsx, app-shell.css",
    spec: <>Floating bottom-left (20px, 24px), opposite the pill. 32px round buttons in a 4px-padded pill, active marker shared via <code>layoutId</code> with spring 0.3s bounce 0.1; active icon uses fill weight. Tooltip and label: “Name (⌘n)”.</> },
  { what: "Shared object pane", where: [L("/app?view=current", "/app (open a theory)")], status: "Canonical", src: "homes/app-shell.tsx, panes.tsx",
    spec: <>One pane for theme, theory and prototype, docked right, pushing the view. Enters from the right edge, spring 0.5s bounce 0.08; content swap cross-fades 0.14s easeOut and scrolls to top. Close button and full-width toggle top-right (10px). Every view opens into it.</> },
  { what: "Pane widths and snapping", where: [L("/app")], status: "Canonical", src: "homes/app-shell.tsx (paneStops, PaneEdge)",
    spec: <>Stops: compact 480, half (available ÷ 2), wide (the view's default: available − keep; Timeline 560), full (available − strip). Min 400. Merge threshold 40px: half wins over compact when within 40 (compact drops out); half merges into wide or full when within 40. Keep beside pane: Theme sections 528, Atlas 420, Briefing 560, Columns its open column + rails. Strip at full: Theme sections 232, Atlas 180, Timeline 200, Briefing 240, Columns rails (44 each). The view folds to its strip once the pane passes halfway from wide to full. Drag 1:1; rubber band ×0.2 past either end; release aims at width + velocity × 160ms (velocity smoothed 0.4/0.6; a pointer held over 80ms has no throw). Keys in the pane: ⌘[ wider, ⌘] narrower, ⌥← ⌥→. Edge hit area 12px; hairline and 6 × 36 grip fade in 150ms after a 60ms hover delay. Chosen stop remembered per view for the session.</> },
  { what: "Esc and layering", where: [L("/app")], status: "Canonical", src: "homes/app-shell.tsx",
    spec: <>One stack of transient surfaces (dump log, pane, dump column), most recent closes first. Picking and recording are cancelled before anything closes; an unfolded signal folds before its pane closes. Dump column owns the far-right edge (372 incl. margins); the pane sits left of it and the view compresses.</> },
  { what: "Theme sections", where: [L("/app?view=current")], status: "Canonical", src: "homes/current.tsx",
    spec: <>Index rail 232 (theme, theory count or “open”), sections of theory cards in a <code>minmax(196px, 1fr)</code> grid. Theme heading opens the theme; card opens the theory. Red dot on a card while a tripwire hit is undecided. At strip width only the index shows and opens themes.</> },
  { what: "Columns", where: [L("/app?view=columns"), L("/columns#rails", "/columns#rails")], status: "Canonical", src: "homes/columns2.tsx",
    spec: <>Dumps → Signals → Themes → Theories → Prototypes. Folding: rails (d-columns-fold). Column widths 250 / 290 / 230 / 300 / 220, rail 44. Layout spring stiffness 420 damping 40; detail unfold 0.3s ease; counts swap 0.12s.</> },
  { what: "Atlas", where: [L("/app?view=atlas"), L("/atlas#signals", "/atlas#signals"), L("/atlas#treatment-circles", "#treatment-circles")], status: "Canonical", src: "homes/atlas2.tsx, atlas2-camera.ts, atlas-styles/*",
    spec: <>Structure circles, treatment Paper, signals “zoom” (d-atlas-structure, d-atlas-signals): clean at rest with counts and new dots on territory names; evidence halos fade in past 1.6× (REVEAL_Z); gists label the ticks past 2.5× (GIST_Z). Theory claims label past 1.6× (CLAIM_Z); “far” below 0.55×. Zoom ×1.5 per step, range 0.5–4. Camera fly spring 0.6s bounce 0, nudge 0.35s; pan throw inertia power 0.3, time constant 300ms; drag slop 4px. Opening an object centres its territory.</> },
  { what: "Timeline (Field 2)", where: [L("/app?view=timeline"), L("/timeline#chain-morph", "/timeline#chain-morph")], status: "Canonical", src: "homes/timeline-app.tsx, timeline2-fieldx.tsx, timeline2-chainview.tsx",
    spec: <>Year across, confidence down, drafts in a dashed bottom row. Select shows dots only, with the theory's direct causes and consequences labelled on their own dots; “+n” badges open one more level; Follow chain morphs into depth columns and back on Esc. Dwell 380ms before hover links. Item spring stiffness 420 damping 38; chain view spring 380/36, 15ms stagger. Layout: top 72, left 74, line 30, dot 10, gap 6, label max 230. Links are elbows: leave the dot vertically, arrive from the left with at least a 22px straight approach (APPROACH) before the arrowhead, jog 19. Router clearance: every vertical run keeps gap + 1 (7px) from every dot, faded ones included; blocked runs step into the gutter in 3px steps. Field min width 760 (scrolls sideways under a wide pane); 72px bottom room for chrome. No River (d-river).</> },
  { what: "Briefing", where: [L("/app?view=briefing")], status: "Canonical", src: "homes/briefing-app.tsx, briefing-app.css",
    spec: <>“Since you last looked” (d-briefing lens). One column, max 600, grouped: Challenges, Drafts (theory, theme, prototype), Suggestions (evidence, revision, theme merge), Merged (near-duplicate signals merged automatically, d-near-dup auto, with Unmerge / Merge again), New signals by theme (folded count, unfold 0.3s). Overnight line (dumps → signals, drafts) opens the dump log. Keys: J/K or ↓/↑ move, A accept or seen, X discard, U unmerge, O or Enter open in the pane. Cursor is a 1.5px ink ring; actions show on the cursor item (always on touch and phone). Settled items exit x +40, opacity 0, 0.2s ease <code>[0.4, 0, 1, 1]</code>; siblings re-flow 0.35s. A challenge decision is the theory's tripwire decision (shared with the pane); accepting a revision writes the claim. “All caught up” when empty.</> },
  { what: "Theory pane", where: [L("/app?view=current", "/app (open a theory)"), L("/details#trip-C", "/details#trip-C"), L("/details#hist-A", "#hist-A")], status: "Canonical", src: "homes/panes.tsx, tripwire.tsx, confidence-spark.tsx",
    spec: <>Theme chips, editable claim, confidence (5 steps) with sparkline A (52 × 20, hard steps; rise green, fall amber, red for an accepted challenge; hover shows the dated log), happens-by stepper, rival, body, tripwire sentence (C), Supports / Undermines, lineage and prototypes. Tripwire: a pending hit shows only under the tripwire; accepting lowers confidence one step, logs it, and makes it an ordinary undermining item; dismissed hits stay out of the evidence. Unfolds 0.3s ease; watching dot breathes 2.8s.</> },
  { what: "Dump or ask pill", where: [L("/app"), L("/pill#states", "/pill#states"), L("/pill#walk", "#walk")], status: "Canonical", src: "homes/pill-study.tsx (DumpOrAsk)",
    spec: <>Bottom-right, 20px from the edge, 24px up; height 40 (phone 44); segments: log 36, label with context chip, mic 40. Approach radius 56px. ⌘J or click grows the docked column up out of the corner (open spring 0.5s bounce 0.12; close spring 0.38s bounce 0); column 360 + 12px margins, radius 14. Context chips follow what is on screen, the open object first; crosshair to pick more. Toast rises from the pill (spring 0.45s bounce 0.2, parts stagger 70ms), hides after 5s, held while hovered. Send/ask and attachments: current defaults (d-pill-send-attach keep). Every message is a dump (d-chat-as-dump).</> },
  { what: "Dump log", where: [L("/app")], status: "Canonical", src: "homes/dump-log.tsx, dump-log.css",
    spec: <>Tier 3 (d-dump-log minimal). Opened by the history segment at the pill's left end or ⌘⇧L; closed by Esc (focus back to the segment), a second click, or a click away; ⌘J closes it and opens the column. 360 wide, up to 480 tall, 10px above the pill, right-aligned to it; grows from the segment: scale 0.6 → 1, y 12 → 0 with the pill's open spring, sinks back with its close spring. Rows by day: kind glyph, first words, time; status: Processing (1.6s sweep), done (signal and dashed draft counts), failed (red dot, reason, Retry). Delete moves to the bin (30 days, Restore). The segment carries a grey dot while something is processing, red if one failed.</> },
  { what: "Phone", where: [L("/app#phone")], status: "Canonical", src: "develop-app.tsx (PhoneApp)",
    spec: <>d-phone shortcut: capture is the Apple Shortcut; the app on a phone is the Briefing, the pane and the pill only, at 390 × 844. Tapping opens the object full-screen, sliding in from the right (spring 0.45s bounce 0.06) with a back arrow. Pill bottom-right; it opens as a near-full-width sheet; the dump log rises from it the same way.</> },
  { what: "Object icons and marks", where: [L("/app")], status: "Canonical", src: "homes/atoms.tsx (OBJECT_ICONS)",
    spec: <>Phosphor: dump TrayArrowDown, signal Pulse, theme Binoculars (d-theme-icon), theory Target, prototype PencilRuler; nudge 0 for all (Binoculars sits level at 12–16px). Fill weight means active or selected only. Marks: blue dot new, hollow ring open, red dot challenged. Dashed outline means not yet mine (drafts, suggestions, agent hits).</> },
  { what: "Tokens", where: [L("/app")], status: "Canonical", src: "homes/homes.css (.ap)",
    spec: <>Inter 13/1.4; sizes 13 (body), 12 (labels, meta), 20 (titles); weight and colour carry hierarchy. Ink #171717 / #525252 / #8a8a8a; background #fafafa, surface #fff, sunk #f4f4f4, hover #f0f0f0; positive #1f7a4d, negative #b4402f, new #2f6fed. Shadows instead of borders; ease <code>cubic-bezier(0.16, 1, 0.3, 1)</code>; press scale 0.94–0.96.</> },
  { what: "Decisions record", where: [L("/decide")], status: "Reference only", src: "design/decisions.json",
    spec: <>Every pick, by key (d-*, pill-*, tripwire, timeline-direction, icon-*, atlas-*). Build decisions (React + Vite + TS, Hono + SQLite, server transcription, Coolify, media on disk, core v1 scope) live here too; agents are undecided.</> },
];

const OTHER: Row[] = [
  { what: "Pill states, details, walkthrough", where: [L("/pill")], status: "Reference for details", src: "develop-pill.tsx", spec: <>Forced states, drag and drop, recording, revisions. Section 5 (phone pill bottom centre) is superseded by /app#phone.</> },
  { what: "Tripwire and sparkline variants", where: [L("/details")], status: "Reference for details", src: "develop-details.tsx", spec: <>Chosen: tripwire C, history A. B, D, E (tripwire) and B–E (history) are superseded.</> },
  { what: "Atlas treatments, structures, encodings", where: [L("/atlas")], status: "Exploration — superseded", src: "develop-atlas.tsx", spec: <>Terrain, Fine line, Graphite, Night, halo-always and none are not in v1. Paper circles details are the reference.</> },
  { what: "Columns folding", where: [L("/columns")], status: "Exploration — superseded", src: "develop-columns.tsx", spec: <>Dots folding not chosen; rails live in /app.</> },
  { what: "Timeline structures and chain variants", where: [L("/timeline")], status: "Exploration — superseded", src: "develop-timeline.tsx", spec: <>Lanes, River (dropped), Field 1, Field 3, River 1–3 are superseded; Field 2 is canonical in /app.</> },
  { what: "Homepages", where: [L("/homes")], status: "Exploration — superseded", src: "homes.tsx, homes/registry.ts", spec: <>Current → Theme sections; Briefing → the Briefing view; Columns and Atlas developed; Deck and Document deferred (d-deck-document).</> },
  { what: "Icons", where: [L("/icons")], status: "Exploration — superseded", src: "develop-icons.tsx", spec: <>Candidates; picks applied in OBJECT_ICONS.</> },
  { what: "Open questions", where: [L("/decisions")], status: "Exploration — superseded", src: "decisions.tsx", spec: <>Answers carried into /decide.</> },
  { what: "Objects", where: [L("/objects")], status: "Reference only", src: "objects.tsx", spec: <>Context: the object model and how many of each there are.</> },
  { what: "Space and motion boards", where: [L("/boards")], status: "Reference only", src: "boards.tsx", spec: <>The first wireframes.</> },
];

function Table({ rows }: { rows: Row[] }) {
  return (
    <table className="hm-where rf-table">
      <colgroup><col style={{ width: 180 }} /><col style={{ width: 190 }} /><col style={{ width: 170 }} /><col /></colgroup>
      <thead><tr><th>Surface</th><th>Jig</th><th>Status</th><th>Behaviour and constants to copy</th></tr></thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.what}>
            <th>{r.what}</th>
            <td className="rf-links">{r.where.map(w => <a key={w.href + w.label} href={w.href}>{w.label}</a>)}</td>
            <td><span className="rf-status" data-status={r.status}>{r.status}</span></td>
            <td>{r.spec}<span className="rf-src">{r.src}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ReferenceJig() {
  return (
    <JigPage title="Reference" status={<>The index for the build. <a href="/app">/app</a> is canonical; everything else is detail or history.</>}
      intro={<p>Every surface and interaction, where its canonical version lives, and the behaviours and constants to copy. Constants come from the source file named in each row; if they disagree, the code wins.</p>}>
      <section className="hm" id="canonical">
        <div className="hm-head"><div className="hm-head-text"><h2>Canonical</h2></div></div>
        <Table rows={CANON} />
      </section>
      <section className="hm" id="explorations">
        <div className="hm-head"><div className="hm-head-text"><h2>Explorations and reference</h2></div></div>
        <Table rows={OTHER} />
      </section>
    </JigPage>
  );
}
