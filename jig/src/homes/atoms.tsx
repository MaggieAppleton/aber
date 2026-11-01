import type { ReactNode } from "react";
import type { Theory, Dump } from "./data";
import { prototypesFor } from "./data";

import {
  MagnifyingGlass, Plus, Minus, Microphone, Cube, TrayArrowDown, Check, X, CaretRight, CaretLeft, CaretDown, Broadcast, Link,
  Waveform, TextAlignLeft, Sun, Lightbulb, MapTrifold, Table, Stack, Clock, ArrowUp, ArrowDown, SidebarSimple, Signpost,
  ArrowsLeftRight, Paperclip, Stop, Play, Pause, ArrowCounterClockwise, ArrowClockwise, Monitor, Image,
  PencilSimple, Globe, Question, PushPin, QuestionMark, Crosshair, Rows, Columns, ChartScatter, type Icon as PhosphorIcon, type IconWeight,
} from "@phosphor-icons/react";

/** Every glyph in the jigs. One icon per object type: dump, signal, theme, theory, prototype. */
const ICONS = {
  // object types
  dump: TrayArrowDown,
  signal: Broadcast,
  theme: Stack,
  theory: Lightbulb,
  prototype: Cube,
  // dump kinds
  wave: Waveform,
  text: TextAlignLeft,
  link: Link,
  // actions and things
  search: MagnifyingGlass,
  plus: Plus,
  minus: Minus,
  mic: Microphone,
  check: Check,
  x: X,
  chevron: CaretRight,
  chevronLeft: CaretLeft,
  down: CaretDown,
  sun: Sun,
  map: MapTrifold,
  table: Table,
  clock: Clock,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  sidebar: SidebarSimple,
  turn: Signpost,
  swap: ArrowsLeftRight,
  paperclip: Paperclip,
  send: ArrowUp,
  stop: Stop,
  play: Play,
  pause: Pause,
  undo: ArrowCounterClockwise,
  replay: ArrowClockwise,
  screen: Monitor,
  image: Image,
  edit: PencilSimple,
  globe: Globe,
  ask: Question,
  pin: PushPin,
  questionMark: QuestionMark,
  crosshair: Crosshair,
  // surfaces
  sections: Rows,
  columns: Columns,
  timeline: ChartScatter,
} satisfies Record<string, PhosphorIcon>;
export type IconName = keyof typeof ICONS;
export type { IconWeight };

/** fill = active or selected, nothing else. */
export const Icon = ({ name, size = 16, weight = "regular" }: { name: IconName; size?: number; weight?: IconWeight }) => {
  const C = ICONS[name];
  return <C size={size} weight={weight} aria-hidden />;
};

export const IconButton = ({ icon, label, onClick, pressed }: { icon: IconName; label: string; onClick?: () => void; pressed?: boolean }) => (
  <button className="ap-iconbtn" aria-label={label} title={label} onClick={onClick} aria-pressed={pressed}><Icon name={icon} weight={pressed ? "fill" : "regular"} /></button>
);

/** Confidence, mine only: five steps. A draft has none. */
export const Conf = ({ n }: { n: number | null }) => (
  <span className="ap-conf" aria-label={n ? `Confidence ${n} of 5` : "No confidence yet"}>
    {[1, 2, 3, 4, 5].map(i => <i key={i} data-on={n && i <= n ? "" : undefined} />)}
  </span>
);

/** Evidence balance: supports above the line, undermines below. */
export const Balance = ({ s, u }: { s: number; u: number }) => (
  <span className="ap-balance" aria-label={`${s} support, ${u} undermine`}>
    <span className="ap-num">+{s}</span><span className="ap-num ap-neg">−{u}</span>
  </span>
);

export const Kbd = ({ children }: { children: ReactNode }) => <kbd className="ap-kbd">{children}</kbd>;

export const DumpIcon = ({ d }: { d: Dump }) => <Icon name={d.kind === "voice" ? "wave" : d.kind === "link" ? "link" : "text"} size={14} />;

export function TheoryCard({ t, onEnter, onLeave, dim, hot, onClick, compact }: {
  t: Theory; onEnter?: () => void; onLeave?: () => void; dim?: boolean; hot?: boolean; onClick?: () => void; compact?: boolean;
}) {
  const protos = prototypesFor(t.id);
  return (
    <div className="ap-card" data-draft={t.draft ? "" : undefined} data-dim={dim ? "" : undefined} data-hot={hot ? "" : undefined}
      onPointerEnter={onEnter} onPointerLeave={onLeave} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="ap-card-claim">{t.claim}</div>
      {!compact && (
        <div className="ap-card-meta">
          {!t.draft && <Conf n={t.confidence} />}
          <Balance s={t.supports} u={t.undermines} />
          {protos.length > 0 && <span className="ap-muted ap-inline"><Icon name="prototype" size={12} />{protos.length}</span>}
          {t.pending > 0 && <span className="ap-ghost-badge">{t.pending}</span>}
          {t.challenge && <Mark kind="challenge" />}
        </div>
      )}
    </div>
  );
}

/** The floating dump-or-ask pill, bottom centre of the content area. */
export const Pill = ({ sees }: { sees: string }) => (
  <div className="ap-pill-wrap">
    <button className="ap-pill"><Icon name="dump" />Dump or ask<span className="ap-muted">sees {sees}</span><Kbd>⌘J</Kbd></button>
    <button className="ap-mic" aria-label="Voice dump" title="Voice dump"><Icon name="mic" /></button>
  </div>
);

/** Status glyphs instead of words. One meaning each, everywhere. */
export type MarkKind = "fresh" | "open" | "challenge";
export const Mark = ({ kind, n }: { kind: MarkKind | "pending"; n?: number }) => {
  const label = { fresh: "New since you last looked", open: "No theory yet", challenge: "Challenged", pending: `${n} suggestions` }[kind];
  if (kind === "pending") return <span className="ap-ghost-badge" title={label} aria-label={label}>{n}</span>;
  return <span className="ap-mark" data-kind={kind} title={label} aria-label={label} />;
};

export const STATUS_COLOUR: Record<string, string> = { idea: "#c9c9c9", building: "#2f6fed", built: "#1f7a4d", shelved: "transparent" };
export const ProtoGlyph = ({ status, selected }: { status: string; selected?: boolean }) => (
  <span className="ap-proto" data-status={status} title={status} aria-label={status}><Icon name="prototype" size={14} weight={selected ? "fill" : "regular"} /></span>
);
