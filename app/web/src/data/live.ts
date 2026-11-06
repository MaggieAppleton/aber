import { useSyncExternalStore } from "react";
import { callTool, request } from "./api";

export type Row = Record<string, any>;
export type World = { themes: Row[]; theories: Row[]; signals: Row[]; dumps: Row[]; prototypes: Row[]; suggestions: Row[]; merges: Row[]; [key: string]: any };
export let world: World = { themes: [], theories: [], signals: [], dumps: [], prototypes: [], suggestions: [], merges: [] };
let revision = 0;
let error = "";
let loading = true;
let loaded = false;
let connected = false;
const listeners = new Set<() => void>();
const updates = new Set<() => void>();
let refreshPending: Promise<void> | undefined;
let refreshAgain = false;
let stream: EventSource | undefined;
let debounce: ReturnType<typeof setTimeout> | undefined;
let writeVersion = 0;
let dataVersion = 0;

export const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const onWorld = (listener: () => void) => { updates.add(listener); return () => { updates.delete(listener); }; };
export function emit() { revision++; listeners.forEach(listener => listener()); }
export function reportError(value: unknown) { error = value instanceof Error ? value.message : String(value); emit(); }
export const clearError = () => { error = ""; emit(); };
export function useWorld() { useSyncExternalStore(subscribe, () => revision); return { world, loading, loaded, error, connected, revision }; }

export async function refresh() {
  if (refreshPending) { refreshAgain = true; return refreshPending; }
  refreshPending = (async () => {
    try {
      do {
        refreshAgain = false;
        const requestedAt = writeVersion;
        try {
          const value = await request("/api/world");
          const data = value.world ?? value;
          const signals: Row[] = Array.isArray(data.signals) ? [...data.signals] : [];
          let page = data.signalPage;
          const cursors = new Set<string>();
          while (page?.nextCursor) {
            if (cursors.has(page.nextCursor)) throw new Error("Signal pages did not advance. Try again.");
            cursors.add(page.nextCursor);
            const next = await request(`/api/signals?cursor=${encodeURIComponent(page.nextCursor)}&limit=${page.limit}`);
            signals.push(...next.signals);
            page = next.signalPage;
          }
          if (requestedAt !== writeVersion) { refreshAgain = true; continue; }
          world = { ...world, ...data, signals }; dataVersion++;
          for (const key of ["themes", "theories", "dumps", "prototypes", "suggestions", "merges"]) world[key] = Array.isArray(data[key]) ? data[key] : [];
          loading = false;
          loaded = true;
          updates.forEach(listener => listener());
          emit();
        } catch (cause) { loading = false; reportError(cause); }
      } while (refreshAgain);
    } finally { refreshPending = undefined; }
  })();
  return refreshPending;
}

async function performMutation<T>(name: string, input: Record<string, unknown>, receive?: (output: T) => void): Promise<T> {
  try { const output = await callTool<T>(name, input); writeVersion++; receive?.(output); await refresh(); return output; }
  catch (cause) { reportError(cause); throw cause; }
}
export const mutate = <T = any>(name: string,input:Record<string,unknown>) => performMutation<T>(name,input);
export function mutateObject(kind:string,id:string,name:string,input:Record<string,unknown>) {
  return performMutation<Row>(name,input,row=>{
    if(row.id!==id)throw new Error('The saved object did not match the edited object');
    receiveObject(kind,id,row);
  });
}
export function act(name: string, input: Record<string, unknown>) { void mutate(name, input).catch(() => {}); }

export async function connect() {
  await refresh();
  stream = new EventSource("/api/events/stream");
  const changed = (event?: Event) => {
    if (event && "data" in event && typeof event.data === "string") {
      try { if (JSON.parse(event.data).type === "heartbeat") return; } catch {}
    }
    clearTimeout(debounce); debounce = setTimeout(() => void refresh(), 70);
  };
  stream.onopen = () => { connected = true; emit(); };
  stream.onerror = () => { connected = false; emit(); };
  stream.onmessage = changed;
  for (const event of ["world", "event", "change", "object", "dump", "update"]) stream.addEventListener(event, changed);
  window.addEventListener("focus", changed);
  return () => { stream?.close(); window.removeEventListener("focus", changed); };
}

export const field = (row: Row, camel: string, snake: string = camel.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)) => row[camel] ?? row[snake];
export function json<T>(value: unknown, fallback: T): T { if (typeof value !== "string") return value as T ?? fallback; try { return JSON.parse(value); } catch { return fallback; } }
export const pendingSuggestions = () => world.suggestions.filter(row => row.status === "pending");
export function rowFor(kind: string, id: string) { return (world[`${kind === "theory" ? "theorie" : kind}s`] as Row[] | undefined)?.find(row => row.id === id); }
export const labelFor = (kind: string, id: string) => { const row = rowFor(kind, id); return row?.claim ?? row?.name ?? row?.gist ?? row?.text ?? ""; };

function receiveObject(kind:string,id:string,row:Row) {
    const key=kind==="theory"?"theories":`${kind}s`;
    const previous=(world[key]??[]) as Row[];
    world={...world,[key]:previous.some(item=>item.id===id)?previous.map(item=>item.id===id?{...item,...row}:item):[...previous,row]};
    dataVersion++;updates.forEach(listener=>listener());emit();
}
export async function loadObject(kind:string,id:string) {
  const requestedAt=dataVersion;
  try {
    const row=await request(`/api/objects/${kind}/${encodeURIComponent(id)}`);
    if(requestedAt!==dataVersion)return;
    receiveObject(kind,id,row);
  } catch(cause) {reportError(cause);}
}

const markingSeen=new Set<string>();
export function markRead(kind:string,id:string) {
  const key=`${kind}:${id}`;
  if(markingSeen.has(key)||field(rowFor(kind,id)??{},"seenAt")!=null)return;
  markingSeen.add(key);
  void mutate("markSeen",{kind,id}).catch(()=>{}).finally(()=>markingSeen.delete(key));
}
