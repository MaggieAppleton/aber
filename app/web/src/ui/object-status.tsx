import { field, type Row } from "../data/live";

export function retirementLabel(row?: Row): string | undefined {
  if(row?.status!=="retired")return;
  const reason=field(row,"retireReason");
  return `Retired${reason?`, ${reason}`:""}`;
}
export function RetirementNotice({row}:{row?:Row}) {
  const label=retirementLabel(row);
  return label?<p className="ab-retired ap-muted">{label}</p>:null;
}
