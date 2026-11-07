import { expect,test } from "@playwright/test";
import { object,openColumn,snapshot } from "./helpers";

for(const action of ["accept","rephrase","discard"])test(`persist ${action} for chat drafts of every kind`,async({page,request})=>{
  const world=await snapshot(request);await page.goto("/");await openColumn(page);
  for(const kind of ["theme","theory","prototype"]){
    const collection=kind==="theory"?"theories":`${kind}s`,title=`Review ${action} draft ${kind}`;
    const row=world[collection].find((r:any)=>(r.claim??r.name)===title),card=page.locator(`.ps-thread [data-chat-id="${row.id}"]`);
    await expect(card).toContainText(title);await card.locator(".ap-card").click();await expect(page.getByRole("main").locator(".pn-title")).toHaveText(title);
    await page.getByRole("main").getByRole("button",{name:"Since you last looked",exact:true}).click();
    if(action==="rephrase"){
      await card.getByRole("button",{name:"Rephrase and accept",exact:true}).click();const dialog=page.getByRole("dialog",{name:`Rephrase draft ${kind}`,exact:true});
      await dialog.getByLabel(kind==="theory"?"Claim":"Name",{exact:true}).fill(`Person rephrased ${kind}`);await dialog.getByRole("button",{name:"Accept wording",exact:true}).click();
      await expect.poll(async()=>(await object(request,kind,row.id))[kind==="theory"?"claim":"name"]).toBe(`Person rephrased ${kind}`);
    }else{
      await card.getByRole("button",{name:action==="accept"?"Accept":"Discard",exact:true}).click();
      if(action==="discard")await expect.poll(async()=>(await object(request,kind,row.id)).discarded_at).not.toBeNull();
      else await expect.poll(async()=>{const saved=await object(request,kind,row.id);return kind==="prototype"?Number(saved.draft):saved.status;}).toBe(kind==="prototype"?0:kind==="theory"?"held":"mine");
    }
    await expect(card.getByRole("button",{name:"Accept",exact:true})).toHaveCount(0);
    await page.reload();await openColumn(page);
    await expect(card).toContainText(action==="discard"?"Draft discarded":action==="rephrase"?`Person rephrased ${kind}`:title);
  }
});

test("an accepted unrated draft stays Not set until the person explicitly chooses level one",async({page,request})=>{
  const world=await snapshot(request),theory=world.theories.find((t:any)=>t.claim==="Review accept draft theory");
  expect((await object(request,"theory",theory.id)).confidence).toBeNull();
  await page.goto(`/?open=theory:${theory.id}`);const slider=page.getByRole("slider",{name:"Confidence",exact:true});
  await expect(slider).toHaveAttribute("aria-valuetext","Not set");await expect(page.locator(".pn-conf-marks i[data-on]")).toHaveCount(0);
  await page.reload();await expect(slider).toHaveAttribute("aria-valuetext","Not set");expect((await object(request,"theory",theory.id)).stances).toHaveLength(0);
  await page.locator(".pn-conf-control").click({position:{x:10,y:20}});await expect(slider).toHaveAttribute("aria-valuetext","1 of 5");
  await expect.poll(async()=>(await object(request,"theory",theory.id)).confidence).toBe(1);await page.reload();await expect(slider).toHaveAttribute("aria-valuetext","1 of 5");
  expect((await object(request,"theory",theory.id)).stances).toHaveLength(1);
});

test("a persisted showTheory reply keeps its later-retired object",async({page})=>{
  await page.goto("/");await openColumn(page);const card=page.locator('.ps-thread [data-chat-kind="theory"]').filter({hasText:"Review archived claim with history"});
  await expect(card).toContainText("Retired, superseded");await card.locator(".ap-card").click();await expect(page.getByRole("main")).toContainText(/Retired[:,] superseded/);
  await page.reload();await openColumn(page);await expect(card).toContainText("Retired, superseded");
});
