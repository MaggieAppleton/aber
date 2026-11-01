import { ask } from "./dialogs";
import { field, json, mutate, rowFor, world, type Row } from "../data/live";
import { Icon } from "../ui/atoms";

export function mergeCandidates(survivorId:string,rows:Row[]) {
  return rows.filter(row=>row.id!==survivorId&&!field(row,"discardedAt")&&!field(row,"deletedByDumpId")&&!field(row,"mergedIntoId"));
}
function SourceReview({signal,label}:{signal:Row;label:string}) {
  const origins=json<Row[]>(signal.origins,[]);
  return <section className="ab-merge-source"><h3 className="ap-label">{label}</h3><p>{signal.gist}</p><div className="pn-chips">{json<Row[]>(signal.sources,[]).map((source,index)=>source.url?<a key={source.id??index} className="pn-chip" href={source.url} target="_blank" rel="noreferrer"><Icon name="link" size={12}/>{source.title??source.url}</a>:<span key={index} className="ap-muted">{source.author??"Own observation"}</span>)}</div>{origins.map((origin,index)=>{const dump=rowFor("dump",origin.dumpId??origin.dump_id);return <p className="ap-muted" key={index}><Icon name="dump" size={12}/> {dump?.first??dump?.text?.split("\n")[0]??origin.text}</p>;})}</section>;
}
export async function mergeSignal(survivorId:string) {
  const survivor=rowFor("signal",survivorId);if(!survivor)return;
  const candidates=mergeCandidates(survivorId,world.signals);
  const absorbedId=await ask({title:"Merge signal",description:`Keep “${survivor.gist}”. Choose the same observation to merge into it.`,choices:candidates.map(signal=>({id:signal.id,label:signal.gist,kind:"signal",detail:json<Row[]>(signal.sources,[]).map(source=>source.title??source.url??source.author??"Own observation").join(", ")}))});
  const absorbed=absorbedId?rowFor("signal",absorbedId):undefined;if(!absorbed)return;
  const reason=await ask({title:"Merge these signals?",description:"Sources, origins and evidence are kept on the first signal. You can undo this merge.",content:<div className="ab-merge-review"><SourceReview signal={survivor} label="Keep this signal"/><SourceReview signal={absorbed} label="Merge into it"/></div>,field:"Reason",value:"Same observation",submit:"Merge signals"});
  if(!reason)return;
  try{await mutate("mergeNearDuplicateSignals",{survivorId,absorbedId,reasoning:reason});}catch{}
}
