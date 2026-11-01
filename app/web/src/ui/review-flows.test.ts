import { expect,test } from "vitest";
import { suggestionFields } from "./suggestion-fields";
import { retirementLabel } from "./object-status";
import { searchChoice } from "../app/search-results";
import { draftKind } from "../data/draft-object";
import { mergeCandidates } from "../app/signal-merge";
import { changedEditFields } from "./edits";

test("revision review preserves full bodies, insertion aliases and renamed theme wording",()=>{
  expect(suggestionFields("revision",{claim:"Claim",body:"First\n\nSecond",body_insert:"Append"})).toEqual([{key:"claim",label:"Proposed claim",value:"Claim",multiline:false},{key:"body",label:"Replacement body",value:"First\n\nSecond",multiline:true},{key:"bodyInsert",label:"Add to body",value:"Append",multiline:true}]);
  expect(suggestionFields("revision",{claim:"Legacy theme wording"},"theme")[0]).toMatchObject({key:"name",value:"Legacy theme wording"});
  expect(suggestionFields("revision",{body:""})[0].value).toBe("");
  expect(suggestionFields("evidence",{note:"Human note"})[0]).toMatchObject({key:"note",value:"Human note"});
});
test("Find and prototype dependencies name retained retirement state",()=>{
  const row={id:"kept-id",kind:"theory",claim:"A retained claim",status:"retired",retire_reason:"disproven"};
  expect(searchChoice(row)).toMatchObject({id:"theory:kept-id",label:"A retained claim",detail:"Retired, disproven"});
  expect(retirementLabel(row)).toBe("Retired, disproven");
  expect(retirementLabel({status:"held"})).toBeUndefined();
});
test("draft identity uses all real collections and can read old theory parts",()=>{
  const rows={themes:[{id:"a"}],theories:[{id:"b"}],prototypes:[{id:"c"}]};
  expect(["a","b","c"].map(id=>draftKind({id},rows))).toEqual(["theme","theory","prototype"]);
  expect(draftKind({id:"old",claim:"Retained wording"},rows)).toBe("theory");
  expect(draftKind({id:"p",name:"A build",status:"idea"},rows)).toBe("prototype");
  expect(draftKind({id:"new",kind:"theme"},rows)).toBe("theme");
});
test("manual merge offers distinct active signals only",()=>{
  expect(mergeCandidates("keep",[{id:"keep"},{id:"active"},{id:"discarded",discarded_at:"now"},{id:"merged",mergedIntoId:"keep"},{id:"binned",deleted_by_dump_id:"dump"}]).map(row=>row.id)).toEqual(["active"]);
});
test("a horizon-only edit does not queue an unchanged confidence stance",()=>{
  expect(changedEditFields({horizon:2028,confidence:3},{horizon:2029,confidence:3})).toEqual({horizon:2029});
  expect(changedEditFields({horizon:2028,confidence:3},{horizon:2028,confidence:3})).toEqual({});
});
