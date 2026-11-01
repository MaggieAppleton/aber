import { field, json, world, type Row } from "./live";

export function currentChallenge(theoryId: string, signalId: string, suggestionId?: string): Row | undefined {
  const theory = world.theories.find(row => row.id === theoryId);
  const version = field(theory ?? {}, "tripwireVersion") ?? 0;
  const matches = world.suggestions.filter(suggestion => {
    const payload = json<Row>(suggestion.payload ?? suggestion.payloadJson ?? suggestion.payload_json, {});
    return suggestion.kind === "challenge" && field(suggestion, "targetId") === theoryId &&
      (payload.signalId ?? payload.signal_id) === signalId &&
      (payload.tripwireVersion ?? payload.tripwire_version ?? 0) === version;
  });
  return matches.find(row => row.id === suggestionId) ?? matches.sort((a, b) =>
    Number(b.status === "pending") - Number(a.status === "pending") ||
    (field(b, "createdAt") ?? b.id).localeCompare(field(a, "createdAt") ?? a.id))[0];
}

export function currentSuggestion(suggestion:Row): boolean {
  if(suggestion.kind!=="challenge")return true;
  const theory=world.theories.find(row=>row.id===field(suggestion,"targetId"));
  if(!theory)return false;
  const payload=json<Row>(suggestion.payload??suggestion.payloadJson??suggestion.payload_json,{});
  return (payload.tripwireVersion??payload.tripwire_version??0)===(field(theory,"tripwireVersion")??0);
}
