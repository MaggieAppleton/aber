/* The default view, type-first (RULES Navigation, decided 4 Nov): a type rail (Briefing first), a list of the chosen type's items,
   and the selected item's full view filling the main area. Related objects inside a full view are previews; a click or a 500ms
   hover opens a peek tethered to them, Open moves the rail and list to that object, Back returns. No docked pane here. */
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { DUMPS, PROTOTYPES, SIGNALS, THEMES, THEORIES, theoriesIn, theory, type Signal } from "./data";
import { Icon, IconButton, Meter, ProtoGlyph, Tile, type TileKind } from "./atoms";
import { Claim, Editable, FullHead, ObjectPane, ProtoName, ProtoStatus, RelRow, Section, ThemeName, TheoryConf, type ObjKind } from "./panes";
import { BriefingView } from "./briefing-app";
import { useEdit, flushEdit } from "./edits";
import { act, field, json, markRead, rowFor, useWorld, world } from "../data/live";
import { ask, createObject, findObjects } from "../app/dialogs";
import { mergeSignal } from "../app/signal-merge";
import { tripFor } from "./trips";
import "./type-first.css";

export type TFType = "briefing" | "theme" | "theory" | "prototype" | "signal" | "dump";
export type ItemKind = Exclude<TFType, "briefing">;
export type TFRoute = { type: TFType; sel: Partial<Record<ItemKind, string>> };
type BackStep = { route: TFRoute; scroll: number; label: string };

const TYPES: { id: TFType; name: string; one?: string }[] = [
  { id: "briefing", name: "Briefing" },
  { id: "theme", name: "Themes", one: "theme" },
  { id: "theory", name: "Theories", one: "theory" },
  { id: "prototype", name: "Prototypes", one: "prototype" },
  { id: "signal", name: "Signals" },
  { id: "dump", name: "Dumps" },
];
const ITEM_KINDS: ItemKind[] = ["theme", "theory", "prototype", "signal", "dump"];
const isItemKind = (k: string | null): k is ItemKind => !!k && (ITEM_KINDS as string[]).includes(k);
const PANE_KINDS: string[] = ["theme", "theory", "prototype"];
const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/* ── Route: ?view=default&type=theory&item=<id>, so a reload lands on the same object ── */
export function routeFromUrl(): TFRoute {
  const p = new URLSearchParams(location.search);
  const type = p.get("type"), item = p.get("item");
  // Old links (?open=kind:id from the Sections view) land on that object.
  const open = p.get("open"), colon = open?.indexOf(":") ?? -1;
  if (!type && open && colon > 0 && isItemKind(open.slice(0, colon))) { const k = open.slice(0, colon) as ItemKind; return { type: k, sel: { [k]: open.slice(colon + 1) } }; }
  if (isItemKind(type)) return { type, sel: item ? { [type]: item } : {} };
  return { type: "briefing", sel: {} };
}
export function writeRoute(params: URLSearchParams, r: TFRoute) {
  params.set("type", r.type);
  const id = r.type !== "briefing" ? r.sel[r.type] : undefined;
  if (id) params.set("item", id); else params.delete("item");
}
const nameOf = (kind: ItemKind, id: string): string => {
  if (kind === "theory") return theory(id).claim || rowFor("theory", id)?.claim || "Theory";
  if (kind === "signal") return SIGNALS.find(s => s.id === id)?.gist ?? "Signal";
  if (kind === "dump") return DUMPS.find(d => d.id === id)?.first ?? "Dump";
  return rowFor(kind, id)?.name ?? "";
};
const markSeen = (kind: ItemKind, id: string) => {
  if (kind === "signal") { if (field(rowFor("signal", id) ?? {}, "seenAt") == null) markRead("signal", id); return; }
  if (kind === "dump") return;
  const row = rowFor(kind, id);
  if (row && field(row, "seenAt") === null) act("markSeen", { kind, id });
};

/** Route state and history for the default view. The shell owns it so `aber:open` and the URL can reach it. */
export function useTypeFirst() {
  const [route, setRoute] = useState<TFRoute>(routeFromUrl);
  const [back, setBack] = useState<BackStep[]>([]);
  const restore = useRef<number | null>(null);
  const live = useRef(route); live.current = route;
  const scroller = () => document.querySelector<HTMLElement>(".tf-main .tf-scroll, .tf-main .br-scroll");
  const here = (): BackStep => {
    const r = live.current, id = r.type !== "briefing" ? r.sel[r.type] : undefined;
    return { route: r, scroll: scroller()?.scrollTop ?? 0, label: r.type === "briefing" || !id ? "Since you last looked" : nameOf(r.type, id) };
  };
  /** Choose a type in the rail, or an item in the list: a new place, so history starts again. */
  const select = (type: TFType, id?: string) => {
    setBack([]); restore.current = null;
    setRoute(r => ({ type, sel: id && type !== "briefing" ? { ...r.sel, [type]: id } : r.sel }));
    if (id && type !== "briefing") markSeen(type, id);
  };
  /** Open: the rail and list move to the object; Back returns here. */
  const open = (kind: ItemKind, id: string) => {
    const r = live.current;
    if (r.type === kind && r.sel[kind] === id) return;
    setBack(b => [...b, here()]); restore.current = null;
    setRoute({ type: kind, sel: { ...r.sel, [kind]: id } });
    markSeen(kind, id);
  };
  const goBack = () => {
    setBack(b => {
      const step = b.at(-1); if (!step) return b;
      restore.current = step.scroll; setRoute(step.route);
      return b.slice(0, -1);
    });
  };
  /** Browser Back/Forward: the shell calls this from its own popstate handler, so view and route change together. */
  const fromUrl = () => { setRoute(routeFromUrl()); setBack([]); };
  return { route, back, select, open, goBack, restore, fromUrl };
}
export type TypeFirstApi = ReturnType<typeof useTypeFirst>;

/* ── The view ── */
export function TypeFirst({ tf, width, onLog }: { tf: TypeFirstApi; width: number; onLog: () => void }) {
  useWorld();
  const narrow = width < 720;
  const { route } = tf;
  const type = route.type;
  const [q, setQ] = useState(""), [themeFilter, setThemeFilter] = useState("");
  const [pushed, setPushed] = useState(() => type !== "briefing" && !!route.sel[type as ItemKind]);
  const items = type === "briefing" ? [] : listItems(type, q, themeFilter);
  // Desktop: a type with nothing chosen shows its first item.
  const chosen = type === "briefing" ? undefined : route.sel[type];
  const exists = (k: ItemKind, id?: string) => !!id && (k === "theory" ? !!rowFor("theory", id) : k === "signal" ? SIGNALS.some(s => s.id === id) : k === "dump" ? DUMPS.some(d => d.id === id) : !!rowFor(k, id));
  const selected = type !== "briefing" && exists(type, chosen) ? chosen : undefined;
  useEffect(() => {
    if (narrow || type === "briefing" || selected) return;
    const first = items.flatMap(g => g.rows)[0];
    if (first) tf.select(type, first.id);
  }, [type, selected, narrow, items.length]);
  useEffect(() => { setQ(""); setThemeFilter(""); }, [type]);
  // Opening something from elsewhere (Back, a peek's Open) shows it even on a narrow screen.
  useEffect(() => { if (tf.back.length) setPushed(true); }, [tf.back.length]);

  const main = useRef<HTMLDivElement>(null);
  const peek = usePeek(main, narrow, tf.open);
  const itemKey = `${type}:${selected ?? ""}`;
  useLayoutEffect(() => {
    peek.close();
    const s = main.current?.querySelector<HTMLElement>(".tf-scroll, .br-scroll");
    if (s) { s.scrollTop = tf.restore.current ?? 0; tf.restore.current = null; }
  }, [itemKey]);

  // A: accept the open draft, while focus isn't in text and nothing sits over the view.
  const liveSel = useRef({ type, selected }); liveSel.current = { type, selected };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "a" || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.defaultPrevented || typing(e.target)) return;
      if (document.querySelector(".ab-dialog") || (e.target instanceof Element && e.target.closest(".ps-surface"))) return;
      const { type: t, selected: id } = liveSel.current;
      if (!id || !PANE_KINDS.includes(t)) return;
      const row = rowFor(t as ObjKind, id);
      if (!row || !(row.status === "draft" || row.draft)) return;
      e.preventDefault();
      void flushEdit(t as ObjKind, id).catch(() => {}).then(() => act("acceptDraft", { kind: t, id }));
    };
    addEventListener("keydown", key); return () => removeEventListener("keydown", key);
  }, []);

  const backBtn = tf.back.length > 0 || (narrow && pushed && type !== "briefing")
    ? <button type="button" className="tf-back" onClick={() => tf.back.length ? tf.goBack() : setPushed(false)}>
        <Icon name="arrowLeft" size={14} /><span>{tf.back.at(-1)?.label ?? TYPES.find(t => t.id === type)!.name}</span>
      </button>
    : undefined;

  const showList = type !== "briefing" && (!narrow || !pushed);
  const showMain = !narrow || type === "briefing" || pushed;
  return (
    <div className="ap tf" data-narrow={narrow ? "" : undefined} data-type={type}>
      {!narrow && <TypeRail route={route} onSelect={t => tf.select(t)} />}
      {showList && <ItemList type={type as ItemKind} groups={items} current={selected} q={q} setQ={setQ} themeFilter={themeFilter} setThemeFilter={setThemeFilter}
        onSelect={id => { tf.select(type, id); setPushed(true); }} />}
      {showMain && <main className="tf-main" ref={main} data-region="main" onClickCapture={peek.onClickCapture} onPointerOver={peek.onPointerOver} onPointerOut={peek.onPointerOut}>
        {type === "briefing"
          ? <BriefingView host={{ onOpen: (k, id) => tf.open(k, id), onLog }} phone={narrow} />
          : <div className="tf-scroll ap-scroll">
              {selected ? <FullView key={itemKey} kind={type} id={selected} back={backBtn} onOpen={peek.show} onGo={tf.open} />
                : null}
              {peek.state && !narrow && <PeekCard {...peek.state} at={peek.at} cardRef={peek.ref} onPeek={peek.next} onGo={(k, id) => { peek.close(); tf.open(k, id); }} onEnter={peek.hold} />}
            </div>}
        {peek.state && narrow && <PeekCard {...peek.state} sheet cardRef={peek.ref} onPeek={peek.next} onGo={(k, id) => { peek.close(); tf.open(k, id); }} onEnter={peek.hold} />}
      </main>}
      {narrow && <TabBar route={route} onSelect={t => { tf.select(t); setPushed(false); }} />}
    </div>
  );
}

/* ── Rail: Aber, then Briefing and the types refined → raw; the view switcher floats at its foot (the shell's) ── */
function counts(): Record<ItemKind, number> {
  return { theme: THEMES.filter(t => rowFor("theme", t.id)?.status !== "draft").length, theory: THEORIES.filter(t => !t.draft).length, prototype: PROTOTYPES.length, signal: SIGNALS.length, dump: DUMPS.length };
}
function TypeRail({ route, onSelect }: { route: TFRoute; onSelect: (t: TFType) => void }) {
  const n = counts();
  const working = world.dumps.some(d => ["processing", "received", "transcribing"].includes(d.status));
  const failed = world.dumps.some(d => d.status === "failed" && !field(d, "deletedAt"));
  return <aside className="tf-rail" aria-label="Types">
    <div className="tf-brand"><span>Aber</span><IconButton icon="search" label="Find (⌘K)" onClick={() => void findObjects()} /></div>
    <nav className="tf-types">
      {TYPES.map(t => <button key={t.id} type="button" className="tf-type" aria-current={route.type === t.id ? "page" : undefined} onClick={() => onSelect(t.id)}>
        <span className="tf-tw"><Tile kind={t.id as TileKind} />{t.id === "dump" && failed && <i className="tf-fail" role="img" aria-label="A dump failed" />}</span>
        <span className="tf-tn">{t.name}</span>
        {t.id !== "briefing" && (t.id === "dump" && working ? <span className="tf-n tf-working" role="status" aria-label="Processing"><Icon name="working" size={14} /></span> : <span className="tf-n ap-num">{n[t.id as ItemKind]}</span>)}
      </button>)}
    </nav>
  </aside>;
}
function TabBar({ route, onSelect }: { route: TFRoute; onSelect: (t: TFType) => void }) {
  return <nav className="tf-tabs" aria-label="Types">
    {TYPES.map(t => <button key={t.id} type="button" className="tf-tab" aria-current={route.type === t.id ? "page" : undefined} aria-label={t.name} onClick={() => onSelect(t.id)}>
      <Tile kind={t.id as TileKind} /><span>{t.name}</span>
    </button>)}
  </nav>;
}

/* ── The second sidebar: the chosen type's items, as 06 rows ── */
type ListRowData = { id: string; kind: ItemKind; draft?: boolean };
type Group = { label: string; rows: ListRowData[]; fold?: boolean };
const STATUS_GROUPS: [string, string][] = [["building", "Building"], ["idea", "Ideas"], ["built", "Built"], ["shelved", "Shelved"]];
const at = (row: any) => { const t = Date.parse(field(row, "capturedAt") ?? field(row, "createdAt") ?? ""); return Number.isNaN(t) ? -Infinity : t; };
const byDay = <T extends { id: string; day: string }>(xs: T[], kind: ItemKind): Group[] => {
  const sorted = [...xs].sort((a, b) => at(b) - at(a));
  return [...new Set(sorted.map(x => x.day || "Earlier"))].map(day => ({ label: day, rows: sorted.filter(x => (x.day || "Earlier") === day).map(x => ({ id: x.id, kind })) }));
};
function listItems(type: ItemKind, q: string, themeId: string): Group[] {
  const needle = q.trim().toLowerCase();
  const hit = (text: string) => !needle || text.toLowerCase().includes(needle);
  if (type === "theme") {
    const isDraft = (id: string) => rowFor("theme", id)?.status === "draft";
    return [{ label: "", rows: THEMES.filter(t => !isDraft(t.id)).map(t => ({ id: t.id, kind: "theme" })) },
      { label: "Drafts", rows: THEMES.filter(t => isDraft(t.id)).map(t => ({ id: t.id, kind: "theme", draft: true })) }];
  }
  if (type === "theory") {
    const inTheme = (themes: string[]) => !themeId || themes.includes(themeId);
    const ts = THEORIES.filter(t => hit(t.claim) && inTheme(t.themes));
    const retired = world.theories.filter(t => t.status === "retired" && !field(t, "mergedIntoId") && hit(t.claim ?? "") && inTheme(json<any[]>(t.themes ?? t.themeIds, []).map(x => typeof x === "string" ? x : x.themeId ?? x.id)));
    return [{ label: "Held", rows: ts.filter(t => !t.draft).map(t => ({ id: t.id, kind: "theory" })) },
      { label: "Drafts", rows: ts.filter(t => t.draft).map(t => ({ id: t.id, kind: "theory", draft: true })) },
      { label: "Retired", fold: true, rows: retired.map(t => ({ id: t.id, kind: "theory" })) }];
  }
  if (type === "prototype") {
    const draft = (id: string) => !!rowFor("prototype", id)?.draft;
    return [...STATUS_GROUPS.map(([k, label]) => ({ label, rows: PROTOTYPES.filter(p => p.status === k && !draft(p.id)).map(p => ({ id: p.id, kind: "prototype" as const })) })),
      { label: "Drafts", rows: PROTOTYPES.filter(p => draft(p.id)).map(p => ({ id: p.id, kind: "prototype" as const, draft: true })) }];
  }
  if (type === "signal") return byDay(SIGNALS.filter(s => hit(`${s.gist} ${s.source}`) && (!themeId || s.themes.includes(themeId))), "signal");
  return byDay(DUMPS.filter(d => hit(`${d.first} ${rowFor("dump", d.id)?.text ?? ""}`)), "dump");
}

function ItemList({ type, groups, current, q, setQ, themeFilter, setThemeFilter, onSelect }: {
  type: ItemKind; groups: Group[]; current?: string; q: string; setQ: (q: string) => void; themeFilter: string; setThemeFilter: (id: string) => void; onSelect: (id: string) => void;
}) {
  const t = TYPES.find(x => x.id === type)!;
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { scroll.current?.querySelector<HTMLElement>("[aria-current='true']")?.scrollIntoView({ block: "nearest" }); }, [current, type]);
  const searchable = type === "theory" || type === "signal" || type === "dump";
  const filterable = type === "theory" || type === "signal";
  const total = type === "theme" || type === "theory" ? groups.filter(g => g.label !== "Drafts" && !g.fold).reduce((n, g) => n + g.rows.length, 0) : groups.reduce((n, g) => n + g.rows.length, 0);
  const visible = groups.filter(g => g.rows.length);
  return <section className="tf-list" aria-label={t.name}>
    <div className="tf-lhead"><span className="tf-lname">{t.name}</span><span className="tf-n ap-num">{total}</span>
      {t.one && <IconButton icon="plus" label={`New ${t.one}`} onClick={() => void createObject(type as any)} />}</div>
    {searchable && <div className="tf-tools">
      <label className="tf-search"><Icon name="search" size={14} /><input type="search" value={q} placeholder={`Find a ${type}`} aria-label={`Find a ${type}`}
        onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Escape" && q) { e.preventDefault(); e.stopPropagation(); setQ(""); } }} /></label>
      {filterable && <label className="tf-filter" data-on={themeFilter ? "" : undefined}><Icon name="funnel" size={14} />
        <select value={themeFilter} onChange={e => setThemeFilter(e.target.value)} aria-label="Filter by theme">
          <option value="">All themes</option>{THEMES.filter(x => rowFor("theme", x.id)?.status !== "draft").map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select></label>}
    </div>}
    <div className="tf-scrollist ap-scroll" ref={scroll}>
      {visible.map(g => {
        const shut = g.fold && !folded[g.label];
        return <div className="tf-group" key={g.label || "all"}>
          {g.label && (g.fold
            ? <button type="button" className="tf-glabel tf-fold" aria-expanded={!shut} onClick={() => setFolded(f => ({ ...f, [g.label]: !f[g.label] }))}><span className="tf-caret" data-shut={shut ? "" : undefined}><Icon name="down" size={12} /></span><span>{g.label}</span><span className="tf-n ap-num">{g.rows.length}</span></button>
            : <div className="tf-glabel"><span>{g.label}</span><span className="tf-n ap-num">{g.rows.length}</span></div>)}
          {!shut && g.rows.map(r => <ListRow key={r.id} row={r} current={current === r.id} onClick={() => onSelect(r.id)} />)}
        </div>;
      })}
      {!visible.length && <p className="tf-empty">{q || themeFilter ? <>Nothing matches{q ? ` "${q}"` : ""}{themeFilter ? ` in ${THEMES.find(x => x.id === themeFilter)?.name}` : ""} <button type="button" className="ab-btn quiet sm" onClick={() => { setQ(""); setThemeFilter(""); }}>Clear filters</button></> : `No ${t.name.toLowerCase()} yet`}</p>}
    </div>
  </section>;
}

/** A list row: the 06 preview. Themes and prototypes are one line; theories, signals and dumps wrap to two. */
function ListRow({ row, current, onClick }: { row: ListRowData; current: boolean; onClick: () => void }) {
  const { kind, id, draft } = row;
  let one = false, name: ReactNode, rk: ReactNode, kv: ReactNode, unseen = false;
  if (kind === "theme") { one = true; name = <ThemeName id={id} />; rk = <span className="tf-n ap-num">{theoriesIn(id).length || null}</span>; unseen = (THEMES.find(t => t.id === id)?.fresh ?? 0) > 0; }
  else if (kind === "theory") { name = <span>{rowFor("theory", id)?.status === "retired" ? rowFor("theory", id)?.claim : <Claim id={id} />}</span>; rk = draft || rowFor("theory", id)?.status === "retired" ? undefined : <TheoryConf id={id} />; }
  else if (kind === "prototype") { one = true; name = <ProtoName id={id} />; rk = draft ? undefined : <ProtoStatus id={id} />; }
  else if (kind === "signal") { const s = SIGNALS.find(x => x.id === id)!; name = s.gist; kv = <span>{s.source}</span>; unseen = field(rowFor("signal", id) ?? {}, "seenAt") == null; }
  else { const d = DUMPS.find(x => x.id === id)!; const raw = rowFor("dump", id); name = d.first; kv = <><span>{raw?.status === "failed" ? "Couldn't read this dump" : d.kind === "voice" ? "Voice" : d.kind === "link" ? "Link" : "Text"}</span><span className="ap-num">{d.time}</span></>; }
  return <button type="button" className={`ab-obj tf-row${one ? " ab-one" : ""}`} aria-current={current ? "true" : undefined} data-draft={draft ? "" : undefined} onClick={onClick}
    data-pick={id} data-kind={kind === "dump" ? undefined : kind} data-label={typeof name === "string" ? name : undefined}>
    <Tile kind={kind} draft={draft} /><span className="ab-nm" data-unseen={unseen ? "" : undefined}>{name}</span>{rk != null && <span className="ab-rk">{rk}</span>}{kv && <span className="ab-kv">{kv}</span>}
  </button>;
}

/* ── Full views: themes, theories and prototypes share the docked pane's; signals and dumps have their own here ── */
function FullView({ kind, id, back, onOpen, onGo }: { kind: ItemKind; id: string; back?: ReactNode; onOpen: (k: ItemKind, id: string) => void; onGo: (k: ItemKind, id: string) => void }) {
  if (kind === "signal") return <SignalFull id={id} back={back} onOpen={onOpen} onGo={onGo} />;
  if (kind === "dump") return <DumpFull id={id} back={back} onOpen={onOpen} />;
  if (kind === "theory" && rowFor("theory", id)?.status === "retired" && !THEORIES.some(t => t.id === id)) return <RetiredTheory id={id} back={back} />;
  return <ObjectPane kind={kind} id={id} nav={{ onOpen, back }} />;
}
function RetiredTheory({ id, back }: { id: string; back?: ReactNode }) {
  const row = rowFor("theory", id);
  return <div className="pn-doc ab-full"><div className="ab-top">{back}</div>
    <FullHead kind="theory" title={<h1 className="pn-title">{row?.claim}</h1>} keyLine={<span>Retired{row?.retireReason ?? row?.retire_reason ? `: ${row?.retireReason ?? row?.retire_reason}` : ""}</span>} />
    {row?.body && <p className="tf-prose">{row.body}</p>}
  </div>;
}

function SignalFull({ id, back, onOpen, onGo }: { id: string; back?: ReactNode; onOpen: (k: ItemKind, id: string) => void; onGo: (k: ItemKind, id: string) => void }) {
  const s = SIGNALS.find(x => x.id === id);
  const [edit, set] = useEdit("signal", id);
  if (!s) return null;
  const raw = rowFor("signal", id);
  const originIds = [...new Set([...json<any[]>(raw?.origins ?? raw?.dumps, []).map(o => typeof o === "string" ? o : field(o, "dumpId")), s.dump].filter(Boolean))];
  const origins = DUMPS.filter(d => originIds.includes(d.id));
  const sources = json<any[]>(raw?.sources, []).filter(x => x.url);
  const stance = (st: "supports" | "undermines") => s.evidence.filter(e => e.stance === st);
  const fileIn = async () => { const themeId = await ask({ title: "File signal", choices: world.themes.map(t => ({ id: t.id, label: t.name, kind: "theme" })) }); if (themeId) act("fileSignal", { signalId: id, themeId }); };
  const unfile = async () => { const themeId = await ask({ title: "Unfile signal", choices: s.themes.map(t => ({ id: t, label: world.themes.find(x => x.id === t)?.name ?? "", kind: "theme" })) }); if (themeId) act("unfileSignal", { signalId: id, themeId }); };
  return <div className="pn-doc ab-full">
    <div className="ab-top">{back}<span className="ab-tools">
      <IconButton icon="merge" label="Merge signal" onClick={() => void mergeSignal(id)} />
      <IconButton icon="trash" label="Discard signal" onClick={() => act("discardSignal", { id })} />
    </span></div>
    <FullHead kind="signal" title={<Editable as="h1" className="pn-title" value={edit.gist} onChange={gist => set({ gist })} singleLine aria-label="Signal gist" />}
      keyLine={<><span>{s.source}</span><span className="ap-num">{s.day}</span></>} />
    <Editable className="pn-body" value={edit.note} onChange={note => set({ note })} placeholder="Add a note" aria-label="Note" />
    <hr className="ab-div" />
    {(["supports", "undermines"] as const).map(st => <Section key={st} label={st === "supports" ? "Supports" : "Undermines"} n={stance(st).length}>
      <div className="ab-rows">{stance(st).map(e => <span key={e.theory} className="tf-rel-host" data-suggested={e.suggested ? "" : undefined}>
        <RelRow kind="theory" id={e.theory} draft={theory(e.theory).draft} name={<Claim id={e.theory} />} rk={<TheoryConf id={e.theory} />} onClick={() => onOpen("theory", e.theory)} />
        <span className="tf-rm"><IconButton icon="minus" label="Remove evidence" onClick={() => act("unlinkEvidence", { signalId: id, theoryId: e.theory })} /></span>
      </span>)}</div>
    </Section>)}
    <Section label="Themes" n={s.themes.length} add={<span className="tf-adds"><IconButton icon="minus" label="Unfile from a theme" onClick={() => void unfile()} /><IconButton icon="plus" label="File in a theme" onClick={() => void fileIn()} /></span>}>
      <div className="pn-chips">{s.themes.map(t => <button key={t} type="button" className="pn-chip" data-peek={`theme:${t}`} onClick={() => onOpen("theme", t)}><Tile kind="theme" size="chip" /><span className="pn-chip-name"><ThemeName id={t} /></span></button>)}</div>
    </Section>
    {sources.length > 0 && <Section label="Sources"><div className="pn-chips">{sources.map((x, i) => <a key={x.id ?? i} className="pn-chip" href={x.url} target="_blank" rel="noreferrer"><Icon name="link" size={14} />{x.title ?? x.url}</a>)}</div></Section>}
    {origins.length > 0 && <Section label="Came from"><div className="ab-rows">{origins.map(d => <RelRow key={d.id} kind="dump" id={d.id} name={d.first} kv={<span className="ap-num">{d.day} {d.time}</span>} onClick={() => onGo("dump", d.id)} />)}</div></Section>}
    {world.merges.filter(m => field(m, "survivorId") === id && !field(m, "undoneAt")).map(m => <button key={m.id} type="button" className="ab-btn secondary" onClick={() => act("undoMerge", { id: m.id })}>Undo merge</button>)}
  </div>;
}

function DumpFull({ id, back, onOpen }: { id: string; back?: ReactNode; onOpen: (k: ItemKind, id: string) => void }) {
  const d = DUMPS.find(x => x.id === id), raw = rowFor("dump", id);
  if (!d || !raw) return null;
  const attachments = json<any[]>(raw.attachments, []);
  const transcripts = json<any[]>(raw.transcripts, []);
  const made = d.produced.map(sid => SIGNALS.find(s => s.id === sid)).filter(Boolean) as Signal[];
  const via = field(raw, "capturedFrom") ?? raw.from;
  return <div className="pn-doc ab-full">
    {back && <div className="ab-top">{back}</div>}
    <FullHead kind="dump" title={<h1 className="pn-title tf-static">{d.first}</h1>}
      keyLine={<><span>{d.kind === "voice" ? "Voice" : d.kind === "link" ? "Link" : "Text"}</span><span className="ap-num">{d.day} {d.time}</span>{via && <span>via {via}</span>}</>} />
    {raw.status === "failed" && <p className="tf-prose">Couldn't read this dump. {field(raw, "error") ?? ""}</p>}
    {["processing", "received", "transcribing"].includes(raw.status) && <p className="tf-prose tf-muted">Processing</p>}
    {(raw.text || transcripts.length > 0) && <div className="tf-well">{raw.text && <p>{raw.text}</p>}{transcripts.map((t, i) => <p key={i}>{t.text}</p>)}</div>}
    {attachments.length > 0 && <div className="pn-chips">{attachments.map((a, i) => { const url = a.url ?? `/media/${a.mediaId ?? a.media_id}`; return a.kind === "audio" ? <audio key={i} controls src={url} /> : a.kind === "image" ? <img key={i} className="pn-media" src={url} alt={a.title ?? "Dump attachment"} /> : <a key={i} className="pn-chip" href={url} target="_blank" rel="noreferrer"><Icon name="link" size={14} />{a.title ?? a.url ?? "Attachment"}</a>; })}</div>}
    {made.length > 0 && <><hr className="ab-div" />
      <Section label="Signals" n={made.length}><div className="ab-rows">{made.map(s => <RelRow key={s.id} kind="signal" id={s.id} name={s.gist} kv={<span>{s.source}</span>} onClick={() => onOpen("signal", s.id)} />)}</div></Section></>}
  </div>;
}

/* ── Peek: one at a time, tethered to the preview it came from; a sheet on a narrow screen ── */
type PeekState = { kind: ItemKind; id: string; anchor: HTMLElement; pinned: boolean };
function usePeek(main: RefObject<HTMLDivElement | null>, narrow: boolean, go: (k: ItemKind, id: string) => void) {
  const [state, setState] = useState<PeekState | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; up: boolean; ox: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef<HTMLElement | null>(null);
  const hoverT = useRef<number>(undefined), leaveT = useRef<number>(undefined);
  const live = useRef(state); live.current = state;
  const close = () => { clearTimeout(hoverT.current); clearTimeout(leaveT.current); setState(null); setPos(null); };
  const show = (kind: ItemKind, id: string, anchor?: HTMLElement | null, pinned = true) => {
    const inPeek = anchor?.closest(".tf-peek");
    const cur = live.current;
    if (inPeek && cur) { setState({ ...cur, kind, id, pinned: true }); return; }   // a click inside a peek peeks the next object in place
    const a = anchor?.closest<HTMLElement>(".ab-rel, .pn-tile, .pn-chip, .pn-link, [data-peek]") ?? anchor;
    if (!a || !main.current?.contains(a)) return false;
    if (cur && cur.pinned && cur.id === id && cur.anchor === a && pinned) { close(); return true; }
    setState({ kind, id, anchor: a, pinned });
    return true;
  };
  // Position below the preview (above when there's no room), with the peek's tile over the preview's tile.
  useLayoutEffect(() => {
    if (!state || narrow) return;
    const el = ref.current, scroller = el?.offsetParent as HTMLElement | null;
    if (!el || !scroller || !state.anchor.isConnected) return;
    const sr = scroller.getBoundingClientRect(), ar = state.anchor.getBoundingClientRect();
    const x = ar.left - sr.left, y = ar.top - sr.top + scroller.scrollTop;
    const W = scroller.clientWidth, H = el.offsetHeight;
    const left = Math.max(8, Math.min(W - el.offsetWidth - 8, x - 8));
    let top = y + ar.height + 4, up = false;
    if (top + H > scroller.scrollTop + scroller.clientHeight - 8 && y - H - 4 > scroller.scrollTop + 8) { top = y - H - 4; up = true; }
    setPos({ left, top, up, ox: Math.max(12, x - left + 12) });
  }, [state?.id, state?.anchor, narrow]);
  useEffect(() => {
    if (!state) return;
    state.anchor.setAttribute("aria-expanded", "true");
    const a = state.anchor;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); e.stopPropagation(); close(); a.focus({ preventScroll: true }); } };
    const down = (e: PointerEvent) => { const t = e.target as Element; if (!t.closest(".tf-peek") && !t.closest("[data-peek]")) close(); };
    document.addEventListener("keydown", esc, true); document.addEventListener("pointerdown", down, true);
    return () => { a.removeAttribute("aria-expanded"); document.removeEventListener("keydown", esc, true); document.removeEventListener("pointerdown", down, true); };
  }, [state]);
  const peekable = (t: EventTarget | null) => t instanceof Element ? t.closest<HTMLElement>("[data-peek]") : null;
  return {
    state, ref, at: pos, close,
    show: (kind: ItemKind, id: string) => { if (!show(kind, id, last.current)) go(kind, id); },
    next: (kind: ItemKind, id: string) => setState(s => s ? { ...s, kind, id, pinned: true } : s),
    hold: () => clearTimeout(leaveT.current),
    onClickCapture: (e: ReactMouseEvent) => { last.current = e.target instanceof Element ? e.target as HTMLElement : null; },
    onPointerOver: (e: ReactPointerEvent) => {
      if (e.pointerType !== "mouse" || narrow) return;
      if ((e.target as Element).closest(".tf-peek")) { clearTimeout(leaveT.current); return; }
      const a = peekable(e.target); if (!a) return;
      clearTimeout(leaveT.current); clearTimeout(hoverT.current);
      if (live.current?.pinned) return;
      const [kind, id] = a.dataset.peek!.split(":") as [ItemKind, string];
      hoverT.current = window.setTimeout(() => { if (a.isConnected && !live.current?.pinned) show(kind, id, a, false); }, 500);
    },
    onPointerOut: (e: ReactPointerEvent) => {
      clearTimeout(hoverT.current);
      const p = live.current; if (!p || p.pinned) return;
      const to = e.relatedTarget as Element | null;
      if (to?.closest?.(".tf-peek") || (to && p.anchor.contains(to))) return;
      leaveT.current = window.setTimeout(() => { if (live.current && !live.current.pinned) close(); }, 250);
    },
  };
}

function PeekCard({ kind, id, at, sheet, cardRef, onPeek, onGo, onEnter }: {
  kind: ItemKind; id: string; at?: { left: number; top: number; up: boolean; ox: number } | null; sheet?: boolean; cardRef: RefObject<HTMLDivElement | null>;
  onPeek: (k: ItemKind, id: string) => void; onGo: (k: ItemKind, id: string) => void; onEnter: () => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => { const l = list.current; setOverflows(!!l && l.scrollHeight > l.clientHeight + 1); }, [kind, id]);
  const p = peekParts(kind, id);
  const rowsClick = (e: ReactMouseEvent) => { const a = (e.target as Element).closest<HTMLElement>("[data-peek]"); if (!a) return; e.preventDefault(); e.stopPropagation(); const [k, x] = a.dataset.peek!.split(":") as [ItemKind, string]; onPeek(k, x); };
  return <div ref={cardRef} className="tf-peek" data-sheet={sheet ? "" : undefined} data-up={at?.up ? "" : undefined} role="dialog" aria-label={p.name} onPointerEnter={onEnter}
    key={`${kind}:${id}`} style={sheet ? undefined : { left: at?.left ?? 0, top: at?.top ?? 0, visibility: at ? undefined : "hidden", transformOrigin: `${at?.ox ?? 12}px ${at?.up ? "100%" : "0"}` }}>
    <div className="tf-pk-head ab-obj"><Tile kind={kind} draft={p.draft} /><span className="ab-nm tf-pk-name" data-draft={p.draft ? "" : undefined}>{p.name}</span>{p.rk && <span className="ab-rk">{p.rk}</span>}{p.kv && <span className="ab-kv tf-pk-kv">{p.kv}</span>}</div>
    {(p.body || p.trip || p.rel) && <hr className="tf-pk-div" />}
    {(p.body || p.trip) && <div className="tf-pk-body">{p.body && <p className="tf-pk-prose">{p.body}</p>}{p.trip && <div className="tf-pk-trip"><Tile kind="tripwire" /><span>{p.trip}</span></div>}</div>}
    {p.rel && <div className="tf-pk-rel" data-overflows={overflows ? "" : undefined} onClickCapture={rowsClick}>
      <div className="tf-pk-label"><span>{p.rel.label}</span><span className="tf-n ap-num">{p.rel.n}</span></div>
      <div className="tf-pk-list" ref={list}>{p.rel.rows}<span className="tf-fade" aria-hidden /></div>
    </div>}
    <div className="tf-pk-foot"><button type="button" className="ab-btn secondary sm" onClick={() => onGo(kind, id)}>Open<Icon name="arrowRight" size={14} /></button></div>
  </div>;
}

/** What a peek holds per type: head, prose, the tripwire line, then the first relation that holds objects. */
function peekParts(kind: ItemKind, id: string): { name: string; draft?: boolean; rk?: ReactNode; kv?: ReactNode; body?: string; trip?: string; rel?: { label: string; n: number; rows: ReactNode } } {
  const rel = (label: string, rows: ReactNode[]) => rows.length ? { label, n: rows.length, rows: <>{rows}</> } : undefined;
  const theoryRow = (tid: string) => <RelRow key={tid} kind="theory" id={tid} draft={theory(tid).draft} name={<Claim id={tid} />} rk={theory(tid).draft ? undefined : <TheoryConf id={tid} />} onClick={() => {}} />;
  if (kind === "theme") {
    const t = THEMES.find(x => x.id === id), ts = theoriesIn(id);
    return { name: t?.name ?? rowFor("theme", id)?.name ?? "", draft: rowFor("theme", id)?.status === "draft",
      rk: <span className="ab-cnts"><span className="ab-cnt"><Icon name="theory" size={14} /><span className="ap-num">{ts.length}</span></span><span className="ab-cnt"><Icon name="signal" size={14} /><span className="ap-num">{t?.signals ?? 0}</span></span></span>,
      rel: rel("Theories", ts.map(x => theoryRow(x.id))) };
  }
  if (kind === "theory") {
    const t = theory(id), trip = tripFor(id);
    const sup = SIGNALS.filter(s => s.evidence.some(e => e.theory === id && e.stance === "supports"));
    const und = SIGNALS.filter(s => s.evidence.some(e => e.theory === id && e.stance === "undermines"));
    const sig = (s: Signal) => <RelRow key={s.id} kind="signal" id={s.id} name={s.gist} draft={s.evidence.find(e => e.theory === id)?.suggested} onClick={() => {}} />;
    const tw = rowFor("theory", id)?.tripwire ?? "";
    return { name: t.claim, draft: t.draft, rk: t.draft ? undefined : <Meter n={t.confidence} />,
      kv: <><span className="ab-cnt"><Icon name="arrowUp" size={14} /><span className="ap-num">{t.supports}</span></span><span className="ab-cnt"><Icon name="arrowDown" size={14} /><span className="ap-num">{t.undermines}</span></span><span className="ap-num">By {t.horizon}</span></>,
      body: t.body || undefined, trip: trip.hits.length ? `Tripped by ${SIGNALS.find(s => s.id === trip.hits[0].id)?.gist ?? "a signal"}` : tw || undefined,
      rel: rel("Supports", sup.map(sig)) ?? rel("Undermines", und.map(sig)) };
  }
  if (kind === "prototype") {
    const p = PROTOTYPES.find(x => x.id === id), raw = rowFor("prototype", id);
    return { name: p?.name ?? raw?.name ?? "", draft: !!raw?.draft, rk: <span className="tf-status"><ProtoGlyph status={p?.status ?? "idea"} /><span>{p?.status}</span></span>, body: raw?.body || undefined,
      rel: rel("Tests", (p?.theories ?? []).map(theoryRow)) };
  }
  if (kind === "signal") {
    const s = SIGNALS.find(x => x.id === id), raw = rowFor("signal", id);
    return { name: s?.gist ?? "", kv: <><span>{s?.source}</span><span className="ap-num">{s?.day}</span></>, body: raw?.note || undefined,
      rel: rel("Bears on", (s?.evidence ?? []).map(e => theoryRow(e.theory))) };
  }
  const d = DUMPS.find(x => x.id === id), raw = rowFor("dump", id);
  return { name: d?.first ?? "", kv: <span className="ap-num">{d?.day} {d?.time}</span>, body: raw?.text || undefined,
    rel: rel("Signals", (d?.produced ?? []).map(sid => SIGNALS.find(s => s.id === sid)).filter(Boolean).map(s => <RelRow key={s!.id} kind="signal" id={s!.id} name={s!.gist} onClick={() => {}} />)) };
}
