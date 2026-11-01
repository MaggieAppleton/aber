import type { Decision, Hit } from "./tripwire";
import { field, json, world } from "../data/live";
export type Trip = { text: string; hits: Hit[]; date?: string; decisions?: Record<string, Decision> };
export function tripFor(id: string): Trip {
  const theory = world.theories.find(t => t.id === id);
  const decisions: Record<string, Decision> = {};
  if(theory?.tripwireHits) return {text:theory.tripwire??"",hits:theory.tripwireHits,decisions:theory.tripwireDecisions??Object.fromEntries(theory.tripwireHits.filter((hit:any)=>hit.decision).map((hit:any)=>[hit.id,hit.decision]))};
  const hits = world.suggestions.filter(s => {const payload=json<any>(s.payload??s.payload_json,{});return s.kind === "challenge" && field(s,"targetId") === id && (payload.tripwireVersion??payload.tripwire_version??0)===(field(theory??{},"tripwireVersion")??0);}).map(s => {
    const payload = json<any>(s.payload ?? s.payloadJson ?? s.payload_json, {});
    const signalId = payload.signalId ?? payload.signal_id;
    const signal = world.signals.find(x => x.id === signalId);
    if (s.status === "accepted") decisions[signalId] = "accepted";
    if (s.status === "discarded") decisions[signalId] = "dismissed";
    return { id: signalId, suggestionId:s.id, gist: signal?.gist ?? payload.gist ?? "", why: payload.why ?? s.reasoning ?? "", source: signal?.source ?? signal?.sources?.[0]?.url ?? "", day: "",loweredTo:json<any>(s.decisionDetails??s.decision_json,{}).loweredTo };
  });
  return { text: theory?.tripwire ?? "", hits, decisions };
}
