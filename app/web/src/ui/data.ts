import { currentSuggestion } from "../data/challenge-target";
// One shared example world, so the paradigms differ only in structure.
export type Theme = { id: string; name: string; signals: number; fresh: number };
export type Theory = {
  id: string; claim: string; themes: string[]; confidence: number | null; supports: number; undermines: number;
  draft?: boolean; horizon: number; follows: string[]; rivals: string[]; pending: number; challenge?: boolean;
  history: number[]; body: string;
};
export type Stance = "supports" | "undermines";
export type Signal = { id: string; gist: string; source: string; themes: string[]; evidence: { theory: string; stance: Stance; suggested?: boolean }[]; day: string; dump: string };
export type Dump = { id: string; day: string; time: string; kind: "voice" | "link" | "text"; first: string; produced: string[] };
export type Prototype = { id: string; name: string; status: "idea" | "building" | "built" | "shelved"; theories: string[] };


import { field, json, onWorld, world, type Row } from "../data/live";
export let THEMES: Theme[] = [];
export let THEORIES: Theory[] = [];
export let SIGNALS: Signal[] = [];
export let DUMPS: Dump[] = [];
export let PROTOTYPES: Prototype[] = [];
export let held: Theory[] = [];
export let drafts: Theory[] = [];
const ids = (value: any, key = "id"): string[] => json<any[]>(value, []).map(x => typeof x === "string" ? x : x[key] ?? x.id).filter(Boolean);
const day = (at: string) => {
  if (!at) return "";
  const date = new Date(at), today = new Date();
  const days = Math.floor((new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime() - new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime()) / 864e5);
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : date.toLocaleDateString("en-GB", {weekday:"short",day:"numeric",month:"short"});
};
function relations(name: string) { return (world[name] ?? []) as Row[]; }
function hydrate() {
  const suggestions = world.suggestions.filter(x => x.status === "pending"&&currentSuggestion(x));
  SIGNALS = world.signals.filter(s => !field(s,"discardedAt") && !field(s,"mergedIntoId")).map(s => {
    const origins = ids(s.origins ?? s.dumps ?? s.originIds ?? s.dumpIds, "dumpId");
    const sources = json<Row[]>(s.sources, []);
    const evidence = json<Row[]>(s.evidence, relations("evidence").filter(e => field(e,"signalId") === s.id)).map(e => ({ theory: e.theory ?? field(e,"theoryId"), stance: e.stance, suggested: !!e.suggested }));
    for (const suggestion of suggestions) {
      const payload = json<Row>(suggestion.payload ?? suggestion.payloadJson ?? suggestion.payload_json, {});
      if (suggestion.kind === "evidence" && (payload.signalId ?? payload.signal_id) === s.id && !evidence.some(e=>e.theory===field(suggestion,"targetId")&&e.suggested)) evidence.push({ theory: field(suggestion,"targetId"), stance: payload.stance, suggested: true });
    }
    let source = s.source ?? sources[0]?.title ?? sources[0]?.url ?? "My observation";
    try { source = new URL(source).hostname.replace(/^www\./,""); } catch {}
    const themes = ids(s.themes ?? s.themeIds, "themeId");
    return { ...s, gist: s.gist ?? "", source, themes, evidence, day: s.day ?? day(field(s,"createdAt")), dump: s.dump ?? origins[0] ?? "" } as Signal;
  });
  THEMES = world.themes.filter(t => t.status !== "retired" && !field(t,"mergedIntoId")).map(t => {
    const signals = SIGNALS.filter(s => s.themes.includes(t.id));
    return { ...t, name: t.name ?? "", signals: t.signals ?? signals.length, fresh: t.fresh ?? signals.filter(s => !field(s,"seenAt")).length } as Theme;
  });
  THEORIES = world.theories.filter(t => t.status !== "retired" && t.status !== "discarded" && !field(t,"mergedIntoId")).map(t => {
    const ev = SIGNALS.flatMap(s => s.evidence.filter(e => e.theory === t.id));
    const stances = json<Row[]>(t.stances ?? t.stanceLog ?? t.log, []);
    return { ...t, claim: t.claim ?? "", body: t.body ?? "", themes: ids(t.themes ?? t.themeIds,"themeId"), confidence: t.confidence ?? stances.at(-1)?.confidence ?? null,
      draft: t.draft ?? t.status === "draft", horizon: t.horizon ?? new Date().getFullYear()+2,
      follows: ids(t.follows ?? t.followsFrom, "fromId"), rivals: ids(t.rivals, "theoryId"),
      supports: t.supports ?? ev.filter(e => e.stance === "supports").length, undermines: t.undermines ?? ev.filter(e => e.stance === "undermines").length,
      pending: suggestions.filter(s => field(s,"targetId") === t.id).length,
      history: json<number[]>(t.history, stances.map(s => s.confidence)), challenge: suggestions.some(s => s.kind === "challenge" && field(s,"targetId") === t.id) } as Theory;
  });
  DUMPS = world.dumps.filter(d => !field(d,"deletedAt")).map(d => {
    const attachments = json<Row[]>(d.attachments, []);
    const at = field(d,"capturedAt") ?? field(d,"createdAt");
    const produced = ids(d.produced ?? d.signalIds);
    if (!produced.length) produced.push(...SIGNALS.filter(s => s.dump === d.id).map(s => s.id));
    return { ...d, first: d.first ?? d.text?.split("\n")[0] ?? "Voice note", kind: d.kind ?? (attachments.some(a => a.kind === "audio") ? "voice" : attachments.some(a => a.kind === "link") ? "link" : "text"), produced, day: d.day ?? day(at), time: d.time ?? (at ? new Date(at).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}) : "") } as Dump;
  });
  PROTOTYPES = world.prototypes.filter(p => p.status !== "discarded").map(p => ({ ...p, name: p.name ?? "", status: p.status ?? "idea", theories: ids(p.theories ?? p.theoryIds,"theoryId") } as Prototype));
  held = THEORIES.filter(t => !t.draft); drafts = THEORIES.filter(t => t.draft);
}
onWorld(hydrate);
hydrate();
export const theme = (id: string): Theme => THEMES.find(t => t.id === id) ?? (world.themes.find(t=>t.id===id) as Theme|undefined) ?? { id, name: "", signals: 0, fresh: 0 };
export const theory = (id: string): Theory => THEORIES.find(t => t.id === id) ?? (world.theories.find(t=>t.id===id) as Theory|undefined) ?? {id,claim:"",themes:[],confidence:null,supports:0,undermines:0,horizon:new Date().getFullYear()+2,follows:[],rivals:[],pending:0,history:[],body:""};
export const signal = (id: string) => SIGNALS.find(s => s.id === id) ?? { id,gist:"",source:"",themes:[],evidence:[],day:"",dump:"" };
export const theoriesIn = (themeId: string) => THEORIES.filter(t => t.themes.includes(themeId)).sort((a,b)=>Number(!!a.draft)-Number(!!b.draft));
export const signalsFor = (theoryId: string) => SIGNALS.filter(s => s.evidence.some(e => e.theory === theoryId));
export const prototypesFor = (theoryId: string) => PROTOTYPES.filter(p => p.theories.includes(theoryId));
