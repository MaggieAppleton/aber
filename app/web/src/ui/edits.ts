import { useSyncExternalStore } from "react";
import { PROTOTYPES, theme, theory, type Prototype } from "./data";
import type { Stance } from "./histories";
import type { Decision } from "./tripwire";
import { tripFor } from "./trips";
import { mutateObject, emit, onWorld, rowFor, subscribe } from "../data/live";
import { EditQueue, type EditOperation, type EditPatch } from "../data/edit-queue";
export type Edits = {
  theory: { claim: string; body: string; tripwire: string; confidence: number | null; horizon: number; decisions: Record<string,Decision>; log: Stance[] };
  theme: { name: string };
  prototype: { name: string; body: string; status: Prototype["status"] };
  signal: { gist: string; note: string };
};
export type EditKind = keyof Edits;
const records = new Map<string, any>();
const queue = new EditQueue({ operations: operationsFor, changed: key => { records.delete(key); emit(); } });
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
  if (!records.has(key)) records.set(key,{...seed(kind,id),...queue.overlay(key)});
  return records.get(key);
}
function operationsFor(key:string,patch:EditPatch,commands:Record<string,string>):EditOperation[] {
  const colon=key.indexOf(":"),kind=key.slice(0,colon),id=key.slice(colon+1);
  const operation=(name:string,input:EditPatch,fields=Object.keys(input)):EditOperation=>({fields,save:()=>mutateObject(kind,id,name,{id,...input})});
  if(kind==="theme")return [operation("renameTheme",patch)];
  if(kind==="signal")return [operation("editSignal",patch)];
  if(kind==="prototype"){
    const {status,...text}=patch;
    return [...(Object.keys(text).length?[operation("editPrototype",text)]:[]),...(status!==undefined?[operation("setPrototypeStatus",{status})]:[])];
  }
  const {confidence,horizon,tripwire,decisions,log,...text}=patch;
  return [
    ...(Object.keys(text).length?[operation("editTheory",text)]:[]),
    ...(confidence!==undefined?[operation("setConfidence",{confidence,commandId:commands.confidence},["confidence"])]:[]),
    ...(horizon!==undefined?[operation("setHorizon",{horizon})]:[]),
    ...(tripwire!==undefined?[operation("setTripwire",{tripwire})]:[]),
  ];
}
export const flushEdit=(kind?:string,id?:string)=>queue.flush(kind?`${kind}:${id}`:undefined);
export const failedEditsCount=()=>queue.failedCount();
export const retryFailedEdits=()=>queue.retryFailed();
export function changedEditFields<T extends object>(previous:T,patch:Partial<T>):Partial<T> {
  return Object.fromEntries(Object.entries(patch).filter(([field,value])=>previous[field as keyof T]!==value)) as Partial<T>;
}
export function setEdit<K extends EditKind>(kind: K,id: string,patch: Partial<Edits[K]>) {
  const key = `${kind}:${id}`,prev = getEdit(kind,id);
  patch=changedEditFields(prev,patch);if(!Object.keys(patch).length)return;
  queue.set(key,patch);
}
export function useEdit<K extends EditKind>(kind: K,id: string) {
  const value = useSyncExternalStore(subscribe,()=>getEdit(kind,id));
  return [value,(patch: Partial<Edits[K]>)=>setEdit(kind,id,patch)] as const;
}
