import { useSyncExternalStore } from "react";
import { PROTOTYPES, theme, theory, type Prototype } from "./data";
import type { Stance } from "./histories";
import type { Decision } from "./tripwire";
import { tripFor } from "./trips";
import { mutate, emit, onWorld, rowFor, subscribe } from "../data/live";
export type Edits = {
  theory: { claim: string; body: string; tripwire: string; confidence: number | null; horizon: number; decisions: Record<string,Decision>; log: Stance[] };
  theme: { name: string };
  prototype: { name: string; body: string; status: Prototype["status"] };
  signal: { gist: string; note: string };
};
export type EditKind = keyof Edits;
const records = new Map<string, any>();
const pending = new Map<string, Record<string, any>>();
const active = new Map<string, Record<string, any>>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
onWorld(() => { records.clear(); });
function seed<K extends EditKind>(kind: K, id: string): Edits[K] {
  const raw = rowFor(kind,id);
  const values = {
    theory: () => { const t = theory(id), trip = tripFor(id); return { claim:t.claim,body:t.body,tripwire:trip.text,confidence:t.confidence,horizon:t.horizon,decisions:trip.decisions ?? {},log:[] }; },
    theme: () => ({name:theme(id).name}),
    prototype: () => { const p = PROTOTYPES.find(x=>x.id===id); return {name:p?.name ?? "",body:raw?.body ?? "",status:p?.status ?? "idea"}; },
    signal: () => ({note:raw?.note ?? "", gist:raw?.gist ?? ""}),
  };
  return values[kind]() as Edits[K];
}
export function getEdit<K extends EditKind>(kind: K,id: string): Edits[K] {
  const key = `${kind}:${id}`;
  if (!records.has(key)) records.set(key,{...seed(kind,id),...active.get(key),...pending.get(key)});
  return records.get(key);
}
export function flushEdit(kind?: string,id?: string) {
  for (const [key,patch] of pending) {
    if (kind && key !== `${kind}:${id}`) continue;
    if(active.has(key))continue;
    clearTimeout(timers.get(key)); timers.delete(key); pending.delete(key); active.set(key,patch);
    const colon=key.indexOf(":"),k=key.slice(0,colon),objectId=key.slice(colon+1);
    const save=async()=>{
      try {
        if(k==="theme")await mutate("renameTheme",{id:objectId,...patch});
        else if(k==="signal")await mutate("editSignal",{id:objectId,...patch});
        else if(k==="prototype") {
          const {status,...text}=patch;if(Object.keys(text).length)await mutate("editPrototype",{id:objectId,...text});if(status)await mutate("setPrototypeStatus",{id:objectId,status});
        } else {
          const {confidence,horizon,tripwire,decisions,log,...text}=patch;
          if(Object.keys(text).length)await mutate("editTheory",{id:objectId,...text});
          if(confidence!==undefined)await mutate("setConfidence",{id:objectId,confidence});
          if(horizon!==undefined)await mutate("setHorizon",{id:objectId,horizon});
          if(tripwire!==undefined)await mutate("setTripwire",{id:objectId,tripwire});
        }
      } catch {} finally {
        active.delete(key);records.delete(key);emit();if(pending.has(key))flushEdit(k,objectId);
      }
    };
    void save();
  }
}
export function changedEditFields<T extends object>(previous:T,patch:Partial<T>):Partial<T> {
  return Object.fromEntries(Object.entries(patch).filter(([field,value])=>previous[field as keyof T]!==value)) as Partial<T>;
}
export function setEdit<K extends EditKind>(kind: K,id: string,patch: Partial<Edits[K]>) {
  const key = `${kind}:${id}`,prev = getEdit(kind,id);
  patch=changedEditFields(prev,patch);if(!Object.keys(patch).length)return;
  records.set(key,{...prev,...patch}); pending.set(key,{...pending.get(key),...patch}); emit();
  clearTimeout(timers.get(key)); timers.set(key,setTimeout(()=>flushEdit(kind,id),600));
}
export function useEdit<K extends EditKind>(kind: K,id: string) {
  const value = useSyncExternalStore(subscribe,()=>getEdit(kind,id));
  return [value,(patch: Partial<Edits[K]>)=>setEdit(kind,id,patch)] as const;
}
