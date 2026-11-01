import { SIGNALS, THEORIES, type Signal, type Stance } from "../data";

/**
 * How signals show on the map.
 * - scatter: one dot per signal, scattered in its territory (the old look; positions mean nothing).
 * - none: no marks; each territory names its signal count and how many are new.
 * - halo: each evidence link is a tick around the theory it bears on; unlinked signals sit under the territory name.
 * - zoom: clean at rest like none; the halo fades in past REVEAL_Z and gists label the ticks past GIST_Z.
 */
export type SignalEncoding = "scatter" | "none" | "halo" | "zoom";
export const REVEAL_Z = 1.6;
export const GIST_Z = 2.5;

export const isFresh = (s: Signal) => s.day === "Today";

/** One mark per evidence link (a signal bearing on two theories marks both), or per unlinked signal. */
export type Tick = {
  key: string; sig: Signal; theme: string; theory?: string; stance?: Stance; suggested: boolean; fresh: boolean;
  /** Direction from the landmark (degrees, 0 = right, clockwise) and which ring it sits on. */
  a: number; ring: number;
};

/** Natural pixels, counter-scaled with the landmark: gap from its edge, tick length, ring spacing, angle between ticks. */
export const TK = { gap: 3.5, len: 8, ringGap: 10, step: 26, perRing: 4 };
/** Supports gather above-right of the landmark, undermines below-left. */
const CENTRE: Record<Stance, number> = { supports: -45, undermines: 135 };

export const tickInner = (pinR: number, ring: number) => pinR + TK.gap + ring * TK.ringGap;
export const tickOuter = (pinR: number, ring: number) => tickInner(pinR, ring) + TK.len;

function arc(sigs: { s: Signal; suggested: boolean }[], stance: Stance, theory: string, theme: string): Tick[] {
  return sigs.map(({ s, suggested }, i) => {
    const ring = Math.floor(i / TK.perRing), inRing = Math.min(TK.perRing, sigs.length - ring * TK.perRing), j = i % TK.perRing;
    return { key: `${theory}:${s.id}`, sig: s, theme, theory, stance, suggested, fresh: isFresh(s), ring, a: CENTRE[stance] + (j - (inRing - 1) / 2) * TK.step };
  });
}

/** Evidence ticks around one theory, newest first along each arc. */
export const TICKS: Record<string, Tick[]> = Object.fromEntries(THEORIES.map(t => {
  const by = (st: Stance) => SIGNALS.flatMap(s => s.evidence.filter(e => e.theory === t.id && e.stance === st).map(e => ({ s, suggested: !!e.suggested })));
  return [t.id, [...arc(by("supports"), "supports", t.id, t.themes[0]), ...arc(by("undermines"), "undermines", t.id, t.themes[0])]];
}));

/** Signals bearing on no theory, filed under their first theme. */
export const LOOSE: Record<string, Tick[]> = {};
for (const s of SIGNALS) if (!s.evidence.length) (LOOSE[s.themes[0]] ??= []).push({ key: `loose:${s.id}`, sig: s, theme: s.themes[0], suggested: false, fresh: isFresh(s), a: 90, ring: 0 });
/** Loose ticks: vertical strokes in a row under the territory name, in screen pixels. */
export const LOOSE_STEP = 7, LOOSE_DY = 21;

/** What a theme's pane lists: its signals, and how many arrived today. */
export function counts(themeId: string) {
  const ss = SIGNALS.filter(s => s.themes.includes(themeId));
  return { n: ss.length, fresh: ss.filter(isFresh).length };
}

/** How far a theory's evidence reaches from its centre (natural px), so its label clears the ticks. */
export function haloR(theoryId: string, pinR: number) {
  const ts = TICKS[theoryId];
  return ts.length ? tickOuter(pinR, Math.max(...ts.map(t => t.ring))) + 1 : pinR;
}

export const rad = (deg: number) => (deg * Math.PI) / 180;
