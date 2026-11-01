export function searchChoice(row: Record<string,any>) {
  const retired=row.status==="retired";
  const reason=row.retireReason??row.retire_reason;
  return {id:`${row.kind}:${row.id}`,kind:row.kind,label:row.claim??row.name??row.gist??row.first??row.text?.split("\n")[0]??"Voice note",detail:retired?`Retired${reason?`, ${reason}`:""}`:row.status==="draft"||row.draft?"Draft":undefined};
}
