import type { HomeDef } from "../homes";
import { CurrentHome } from "./current";
import { ColumnsHome } from "./columns";
import { DocumentHome } from "./document";
import { BriefingHome } from "./briefing";
import { AtlasHome } from "./atlas";
import { DeckHome } from "./deck";

export const HOMES: HomeDef[] = [
  { key: "current", name: "Current: theme sections", view: CurrentHome,
    idea: "The space-and-motion boards. A docked index of themes, one page of theme sections holding theory cards, and a floating pill to dump or ask.",
    nav: "Navigation: sidebar index, then zoom in from World to Theme to Theory",
    where: { Dumps: "Behind the pill, in a log that rises from it", Signals: "Counts on theme headings; listed inside a theme", Themes: "The sidebar and the page sections", Theories: "Cards in their theme section; drafts dashed at the end", Prototypes: "A link pinned to the bottom of the sidebar" },
    good: "Familiar and calm. Shows open themes next to filled ones.", bad: "Hides what changed. A theory in two themes appears twice. Doesn't scale past about 30 themes." },
  { key: "columns", name: "Columns", view: ColumnsHome,
    idea: "Five columns from raw to refined. Select anything and its whole lineage, from the dump it came from to what you built on it, rises to the top of every column.",
    nav: "Navigation: select to trace; no pages, nothing to zoom into",
    where: { Dumps: "First column, newest first", Signals: "Second column, new ones dotted", Themes: "Third column; an open theme shows a ring", Theories: "Fourth column, as cards", Prototypes: "Last column, with a status glyph" },
    good: "Provenance at a glance. Every object type is equal and always visible.", bad: "Dense; the flows (dumps, signals) take the most room. No place to write or think about one theory." },

  { key: "document", name: "Living document", view: DocumentHome,
    idea: "One long, written document of what you currently think, in sections by theme. Hover a paragraph and its evidence slides into the margin. Agent drafts are dashed passages you accept or discard in place.",
    nav: "Navigation: scroll and read; a tick outline on the left expands into theme names on approach",
    where: { Dumps: "Behind the pill only", Signals: "Margin notes beside the theory they bear on, as ticks at rest", Themes: "Section headings; an open theme is a heading with a ring", Theories: "Paragraphs: the claim in bold, then your prose", Prototypes: "A glyph at the end of a paragraph that grows into its name" },
    good: "Makes you write. Reads as an argument, not a database. Quietest of all.", bad: "Poor at what changed and at scale. Theories in two themes need a home." },

  { key: "briefing", name: "Daily briefing", view: BriefingHome,
    idea: "Opens on what changed since you last looked. Each change arrives as the component that suits it: a challenge brings a confidence control, a revision shows a strikethrough, new signals stack by theme and unfold. Clear the queue with J, K, A and X.",
    nav: "Navigation: a queue you work through; everything else is a quiet glanceable rail",
    where: { Dumps: "A flow line at the top (dumps to signals) that unfolds into today's dumps", Signals: "Stacked by theme as a single item; tap to unfold", Themes: "Only as the label on a stack of new signals", Theories: "Inside challenges, revisions and drafts; all held ones in the rail with confidence", Prototypes: "In the rail, with a status glyph" },
    good: "Built for the morning review and for the authority rule: everything agents did is here to accept or discard.", bad: "Not a place to think. Stocks are second-class; you need another view to explore." },

  { key: "atlas", name: "Atlas", view: AtlasHome,
    idea: "A map laid out by the system. Themes are territories sized by their signals and overlapping where they share theories. Theories are landmarks sized by confidence. Signals are the ground, blue where new. Click a territory to zoom in and read its claims; click a landmark to see its card.",
    nav: "Navigation: semantic zoom; Esc steps back out",
    where: { Dumps: "Behind the pill only", Signals: "Dots on the ground; blue when new", Themes: "Territories; an open theme is an empty outline", Theories: "Landmarks; a theory in two themes sits in their overlap", Prototypes: "On the theory card when a landmark is opened" },
    good: "Shows the shape of your attention at a glance: where it's dense, where it's new, where themes meet.", bad: "Positions carry no precise meaning. Reading needs a zoom. The hairball risk returns past 50 themes." },

  { key: "deck", name: "Deck", view: DeckHome,
    idea: "One theory fills the stage, large enough to think about. The previous and next wait at the edges; arrows or a swipe move through them. Evidence sits in two stacks, for and against, that fan out on approach. Prototypes hang above the claim.",
    nav: "Navigation: linear, left and right (or swipe); a dot strip to jump",
    where: { Dumps: "Behind the pill only", Signals: "Stacked under the theory, fanning open on hover", Themes: "A quiet label above the claim", Theories: "One at a time, centre stage; drafts are dashed cards in the same deck", Prototypes: "Tabs above the claim" },
    good: "Focus. Each theory gets full attention, the way a reflective review should. Feels native on a phone.", bad: "No overview. Hard to compare or see relationships. Order is arbitrary." },
];
