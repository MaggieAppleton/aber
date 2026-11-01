export type DraftKind="theme"|"theory"|"prototype";
type Collections={themes:Record<string,any>[];theories:Record<string,any>[];prototypes:Record<string,any>[]};
export function draftKind(data:Record<string,any>,rows:Collections):DraftKind|undefined {
  if(["theme","theory","prototype"].includes(data.kind))return data.kind;
  if(rows.theories.some(row=>row.id===data.id))return "theory";
  if(rows.themes.some(row=>row.id===data.id))return "theme";
  if(rows.prototypes.some(row=>row.id===data.id))return "prototype";
  if(typeof data.claim==="string")return "theory";
  if(typeof data.name==="string")return ["idea","building","built","shelved"].includes(data.status)?"prototype":"theme";
}
