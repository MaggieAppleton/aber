import { useState, type ReactNode } from "react";
import {
  TrayArrowDown,
  // signal
  Broadcast, Pulse, Eye, Binoculars, CellTower, Rss, WifiHigh, Lightning, Sparkle, Quotes, Footprints, Drop, Asterisk, DotOutline,
  // theme
  Stack, Hash, Tag, CirclesThree, CirclesThreePlus, SquaresFour, Shapes, Planet, Mountains, Compass, MapTrifold, Hexagon, Graph, Bookmark,
  // theory
  Lightbulb, Flask, Scales, Target, Path, Strategy, TrendUp, ChartLineUp, Hourglass, SealQuestion, ArrowsSplit, Lighthouse, Flag, Crosshair,
  // prototype
  Cube, Wrench, Hammer, Toolbox, PencilRuler, Blueprint, Code, CodeBlock, AppWindow, Rocket, Robot, Package, PuzzlePiece, TestTube,
  // chrome
  CaretDown, ArrowUp, X, Warning,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

export const GLYPHS = {
  TrayArrowDown,
  Broadcast, Pulse, Eye, Binoculars, CellTower, Rss, WifiHigh, Lightning, Sparkle, Quotes, Footprints, Drop, Asterisk, DotOutline,
  Stack, Hash, Tag, CirclesThree, CirclesThreePlus, SquaresFour, Shapes, Planet, Mountains, Compass, MapTrifold, Hexagon, Graph, Bookmark,
  Lightbulb, Flask, Scales, Target, Path, Strategy, TrendUp, ChartLineUp, Hourglass, SealQuestion, ArrowsSplit, Lighthouse, Flag, Crosshair,
  Cube, Wrench, Hammer, Toolbox, PencilRuler, Blueprint, Code, CodeBlock, AppWindow, Rocket, Robot, Package, PuzzlePiece, TestTube,
} satisfies Record<string, PhosphorIcon>;
export type Glyph = keyof typeof GLYPHS;

export const G = ({ n, size = 16, fill }: { n: Glyph; size?: number; fill?: boolean }) => {
  const C = GLYPHS[n];
  return <C size={size} weight={fill ? "fill" : "regular"} aria-hidden />;
};

export type Concept = "signal" | "theme" | "theory" | "prototype";
export const CONCEPTS: Concept[] = ["signal", "theme", "theory", "prototype"];
export const CURRENT: Record<Concept, Glyph> = { signal: "Broadcast", theme: "Stack", theory: "Lightbulb", prototype: "Cube" };
export type Set = Record<Concept, Glyph>;

type Candidate = { n: Glyph; note: string };
export const META: Record<Concept, { title: string; gist: string; candidates: Candidate[] }> = {
  signal: {
    title: "Signal",
    gist: "One observation about the world: a link, a post, something I noticed. What I've seen.",
    candidates: [
      { n: "Broadcast", note: "Something transmitting. Reads as live or streaming more than as a thing I saw." },
      { n: "Pulse", note: "A blip in the noise. Strong signal meaning; also health and activity." },
      { n: "Eye", note: "I saw this. Most literal; also the common show/hide toggle." },
      { n: "Binoculars", note: "Scanning the horizon on purpose. Busy at 12px." },
      { n: "CellTower", note: "Reception from elsewhere. Standing in for Antenna, which Phosphor lacks." },
      { n: "Rss", note: "Feeds and subscriptions. Too tied to links; my own observations don't fit." },
      { n: "WifiHigh", note: "Reception strength. Reads as connectivity status." },
      { n: "Lightning", note: "A jolt, news that lands. Loud; suggests speed or power." },
      { n: "Sparkle", note: "Something caught the light. Now widely means AI." },
      { n: "Quotes", note: "Something someone said. Fits posts, less so data or my own noticing." },
      { n: "Footprints", note: "A trace left in the world. Evidence, quiet and organic." },
      { n: "Drop", note: "One drop, a single unit that adds up. Abstract; also water or colour." },
      { n: "Asterisk", note: "A small marked point, a footnote. Very quiet; easy to miss." },
      { n: "DotOutline", note: "One point of data. Purest unit; may read as a status mark." },
    ],
  },
  theme: {
    title: "Theme",
    gist: "An area of attention that gathers signals and theories. Flat. What I'm paying attention to.",
    candidates: [
      { n: "Stack", note: "Layers piled up. Implies hierarchy and order, which themes don't have." },
      { n: "Hash", note: "A topic or channel. Flat and familiar; can look like a number sign next to counts." },
      { n: "Tag", note: "A label I put on things. Reads as metadata more than an area." },
      { n: "CirclesThree", note: "Several things clustered together. Gathering without hierarchy." },
      { n: "CirclesThreePlus", note: "A cluster that keeps growing. Busier; the plus reads as an add action." },
      { n: "SquaresFour", note: "A grid of things. Reads as apps or a dashboard." },
      { n: "Shapes", note: "Mixed kinds of thing together. Playful; a little generic." },
      { n: "Planet", note: "A world of its own with things in orbit. Evocative; big for a flat tag." },
      { n: "Mountains", note: "Terrain to explore. Echoes the Atlas, but reads as a photo or landscape." },
      { n: "Compass", note: "Direction of attention. More about heading than gathering." },
      { n: "MapTrifold", note: "A territory I'm mapping. Already the Atlas surface icon." },
      { n: "Hexagon", note: "A cell, a tile in a field. Clean and neutral; meaning is thin." },
      { n: "Graph", note: "Connected nodes. Implies a network, not an area." },
      { n: "Bookmark", note: "Something I'm keeping an eye on. Reads as saved item." },
    ],
  },
  theory: {
    title: "Theory",
    gist: "A falsifiable claim about the future, held with a confidence. What I claim; could be wrong.",
    candidates: [
      { n: "Lightbulb", note: "An idea. Says nothing about claiming, testing or being wrong." },
      { n: "Flask", note: "A hypothesis under test. Falsifiable by nature." },
      { n: "Scales", note: "Weighing evidence for and against. Fits supports and undermines; also legal." },
      { n: "Target", note: "Aiming at an outcome. A bet that can miss." },
      { n: "Crosshair", note: "Pinning down a specific prediction. Already used for focus in the app." },
      { n: "Path", note: "A route from now to then. Abstract; reads as navigation." },
      { n: "Strategy", note: "A play drawn out. Reads as planning, not believing." },
      { n: "TrendUp", note: "Where things are heading. Implies the claim is always growth." },
      { n: "ChartLineUp", note: "A forecast. Data-ish; same upward bias." },
      { n: "Hourglass", note: "A claim waiting on time. Reads as loading or pending." },
      { n: "SealQuestion", note: "A claim with a question in it. Close to open-question, which is a theme." },
      { n: "ArrowsSplit", note: "A fork in possible futures. Reads as merge or branch." },
      { n: "Lighthouse", note: "Seeing ahead into fog. Standing in for Telescope, which Phosphor lacks." },
      { n: "Flag", note: "A stake planted, a position taken. Also report or bookmark." },
    ],
  },
  prototype: {
    title: "Prototype",
    gist: "Something I build to embody a theory: code, a demo, a recording. Idea, building, built, shelved.",
    candidates: [
      { n: "Cube", note: "A 3D object. Generic; reads as a package or model." },
      { n: "Wrench", note: "Making it work. Also settings and repair." },
      { n: "Hammer", note: "Building with my hands. Direct; slightly blunt." },
      { n: "Toolbox", note: "Tools for building. Reads as a kit, not the made thing." },
      { n: "PencilRuler", note: "Designing and making. Craft and drafting." },
      { n: "Blueprint", note: "A plan for a build. Pairs with a map family; reads as not-yet-built." },
      { n: "Code", note: "Code. Too narrow when the prototype is a recording or a demo." },
      { n: "CodeBlock", note: "A file of code. Same narrowness, heavier glyph." },
      { n: "AppWindow", note: "A running app or demo. Screen-shaped; narrow for physical builds." },
      { n: "Rocket", note: "Shipping something. Loud and launch-y." },
      { n: "Robot", note: "A built machine. Reads as AI or agent." },
      { n: "Package", note: "A shipped artefact. Close to the current cube." },
      { n: "PuzzlePiece", note: "A piece that fits the theory. Reads as plugin or integration." },
      { n: "TestTube", note: "An experiment. Pairs with Flask if theory is lab-themed; can blur with it." },
    ],
  },
};

export const SETS: { k: string; name: string; note: string; set: Set }[] = [
  { k: "lab", name: "Lab", note: "Notice, gather, hypothesise, build. Flask carries 'could be wrong' without words.", set: { signal: "Pulse", theme: "CirclesThree", theory: "Flask", prototype: "Wrench" } },
  { k: "map", name: "Map", note: "Traces in a territory, a stake planted, a plan drawn. Echoes the Atlas surface.", set: { signal: "Footprints", theme: "MapTrifold", theory: "Flag", prototype: "Blueprint" } },
  { k: "lookout", name: "Lookout", note: "Seeing, the area I watch, a guess about what's ahead, something I make.", set: { signal: "Eye", theme: "Hash", theory: "Lighthouse", prototype: "Hammer" } },
];

/* ── In-context preview at real sizes ── */

export function Preview({ set, hot }: { set: Set; hot?: Concept | null }) {
  const dup = CONCEPTS.flatMap((a, i) => CONCEPTS.slice(i + 1).filter(b => set[a] === set[b]).map(b => `${META[a].title} and ${META[b].title}`));
  return (
    <div className="ix-ctx">
      <div className="ix-legend">
        <span className="ix-leg"><G n="TrayArrowDown" size={14} />Dump</span>
        {CONCEPTS.map(c => (
          <span key={c} className="ix-leg" data-hot={hot === c ? "" : undefined}><G n={set[c]} size={14} />{META[c].title}</span>
        ))}
      </div>
      {dup.length > 0 && <div className="ix-dup"><Warning size={14} aria-hidden />{dup.join(", ")} share a glyph</div>}

      <div className="ix-ctx-grid">
        <Rail set={set} />
        <div className="ix-ctx-main">
          <PaneHead set={set} />
          <Pill set={set} />
          <Filter set={set} />
        </div>
      </div>
    </div>
  );
}

function Rail({ set }: { set: Set }) {
  const rows: [Glyph, string, number, boolean?][] = [
    ["TrayArrowDown", "Dumps", 12],
    [set.signal, "Signals", 48],
    [set.theme, "Themes", 9],
    [set.theory, "Theories", 14, true],
    [set.prototype, "Prototypes", 3],
  ];
  return (
    <div className="ix-rail" aria-label="Columns rail">
      {rows.map(([n, label, count, on]) => (
        <span key={label} className="ix-rail-item" data-on={on ? "" : undefined} title={label} aria-label={`${label} ${count}`}>
          <G n={n} size={16} fill={on} />
          <span className="ix-num">{count}</span>
        </span>
      ))}
    </div>
  );
}

const Chip = ({ n, children, ghost }: { n: Glyph; children: ReactNode; ghost?: boolean }) => (
  <span className="ix-chip" data-ghost={ghost ? "" : undefined}><G n={n} size={14} />{children}</span>
);

function PaneHead({ set }: { set: Set }) {
  return (
    <div className="ix-pane">
      <div className="ix-pane-chips">
        <Chip n={set.theme}>Grid storage</Chip>
        <Chip n={set.theme}>Cheap batteries</Chip>
      </div>
      <div className="ix-pane-title">Sodium-ion undercuts LFP for grid storage by 2028</div>
      <div className="ix-pane-row">
        <Chip n={set.theory}>Lithium prices stay flat</Chip>
        <Chip n={set.prototype}>Cost curve model</Chip>
      </div>
      <div className="ix-ev">
        <div className="ix-ev-row"><G n={set.signal} size={14} /><span>CATL ships first sodium-ion grid pack</span><span className="ix-pos ix-num">+</span><span className="ix-muted ix-num">3d</span></div>
        <div className="ix-ev-row"><G n={set.signal} size={14} /><span>Lithium carbonate down 40% this year</span><span className="ix-neg ix-num">−</span><span className="ix-muted ix-num">2w</span></div>
        <div className="ix-ev-row" data-ghost=""><G n={set.signal} size={14} /><span>Natron pauses Michigan plant</span><span className="ix-muted">Suggested</span></div>
      </div>
    </div>
  );
}

function Pill({ set }: { set: Set }) {
  return (
    <div className="ix-pill">
      <span className="ix-pill-ctx"><G n={set.theory} size={14} /><span>Sodium-ion undercuts LFP</span><X size={12} aria-hidden /></span>
      <span className="ix-pill-input">Dump or ask</span>
      <span className="ix-pill-send" aria-hidden><ArrowUp size={14} weight="bold" /></span>
    </div>
  );
}

function Filter({ set }: { set: Set }) {
  return (
    <div className="ix-filter-row">
      <span className="ix-filter"><G n={set.theme} size={16} />All themes<CaretDown size={12} aria-hidden /></span>
      <span className="ix-filter" data-on=""><G n={set.theme} size={16} fill />Grid storage<CaretDown size={12} aria-hidden /></span>
      <span className="ix-filter-icons">
        <span className="ix-iconbtn" title="Signals" aria-label="Signals"><G n={set.signal} size={16} /></span>
        <span className="ix-iconbtn" title="Theories" aria-label="Theories" data-on=""><G n={set.theory} size={16} fill /></span>
        <span className="ix-iconbtn" title="Prototypes" aria-label="Prototypes"><G n={set.prototype} size={16} /></span>
      </span>
    </div>
  );
}

/* ── Candidate card ── */

export function CandidateCard({ c, cand, picked, onPick, onHover }: {
  c: Concept; cand: Candidate; picked: boolean; onPick: () => void; onHover: (on: boolean) => void;
}) {
  const current = CURRENT[c] === cand.n;
  const [on, setOn] = useState(false);
  const hover = (v: boolean) => { setOn(v); onHover(v); };
  return (
    <div className="ix-card" data-picked={picked ? "" : undefined} data-on={on ? "" : undefined}
      onPointerEnter={() => hover(true)} onPointerLeave={() => hover(false)}
      onFocus={() => hover(true)} onBlur={() => hover(false)}>
      <div className="ix-glyphs">
        <G n={cand.n} size={16} /><G n={cand.n} size={20} />
        <span className="ix-glyphs-gap" />
        <G n={cand.n} size={16} fill /><G n={cand.n} size={20} fill />
      </div>
      <div className="ix-card-name">
        <strong>{cand.n}</strong>
        {current && <span className="ix-current">Current</span>}
      </div>
      <p>{cand.note}</p>
      <button className="jig-choose" aria-pressed={picked} onClick={onPick}>{picked ? "Picked" : "Pick"}</button>
    </div>
  );
}
