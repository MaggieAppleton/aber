export type ProposedField={key:"claim"|"name"|"body"|"bodyInsert"|"note";label:string;value:string;multiline?:boolean};
export function suggestionFields(kind:string,payload:Record<string,any>,targetKind?:string):ProposedField[] {
  const fields:ProposedField[]=[];
  const add=(key:ProposedField["key"],label:string,value:unknown,multiline=false)=>{if(typeof value==="string")fields.push({key,label,value,multiline});};
  if(kind==="revision"){
    if(targetKind==="theme")add("name","Proposed name",payload.name??payload.claim);
    else {add("claim","Proposed claim",payload.claim);add("name","Proposed name",payload.name);}
    add("body","Replacement body",payload.body,true);
    add("bodyInsert","Add to body",payload.bodyInsert??payload.body_insert,true);
  }
  if(kind==="evidence")add("note","Evidence note",payload.note??"",true);
  return fields;
}
