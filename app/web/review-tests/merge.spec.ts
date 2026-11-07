import { expect,test } from "@playwright/test";
import { find,object,snapshot,tool } from "./helpers";

test("manual signal merge reviews the survivor and sources, preserves links, undoes, and reports conflicts",async({page,request})=>{
  const world=await snapshot(request),a=world.signals.find((s:any)=>s.gist==="Review manual merge observation A"),b=world.signals.find((s:any)=>s.gist==="Review manual merge observation B");
  await page.goto("/");await expect(page.getByRole("button",{name:"Find (⌘K)",exact:true})).toBeVisible();
  const merge=async()=>{
    await find(page,"manual merge observation A",a.gist);const detail=page.getByRole("main");
    await detail.getByRole("button",{name:"Merge signal",exact:true}).click();
    const picker=page.getByRole("dialog",{name:"Merge signal",exact:true});await picker.getByRole("textbox",{name:"Find",exact:true}).fill("manual merge observation B");await picker.locator(".ab-option").filter({hasText:b.gist}).click();
    const confirm=page.getByRole("dialog",{name:"Merge these signals?",exact:true});await expect(confirm.locator(".ab-merge-source").first()).toContainText(a.gist);await expect(confirm.locator(".ab-merge-source").last()).toContainText(b.gist);
    await expect(confirm.getByRole("link",{name:"First independent source",exact:true})).toHaveAttribute("href","https://example.org/review-a");await expect(confirm.getByRole("link",{name:"Second independent source",exact:true})).toHaveAttribute("href","https://example.org/review-b");
    await confirm.getByLabel("Reason",{exact:true}).fill("Two independent reports of the same observation");await confirm.getByRole("button",{name:"Merge signals",exact:true}).click();
    await expect.poll(async()=>(await object(request,"signal",b.id)).merged_into_id).toBe(a.id);return detail;
  };
  await merge();const merged=await object(request,"signal",a.id);expect(merged.sources).toHaveLength(2);expect(merged.origins).toHaveLength(2);expect(merged.evidence).toHaveLength(2);
  await page.reload();await find(page,"manual merge observation A",a.gist);await page.getByRole("main").getByRole("button",{name:"Undo merge",exact:true}).click();
  await expect.poll(async()=>(await object(request,"signal",b.id)).merged_into_id).toBeNull();expect((await object(request,"signal",a.id)).sources).toHaveLength(1);expect((await object(request,"signal",b.id)).origins).toHaveLength(1);
  await page.reload();await merge();await tool(request,"discardSignal",{id:a.id});
  await page.goto("/?view=briefing");const current=await snapshot(request),record=current.merges.find((m:any)=>m.survivor_id===a.id&&!m.undone_at);
  await page.locator(`[data-bid="${record.id}"]`).getByRole("button",{name:"Undo merge",exact:true}).click();await expect(page.getByRole("alert")).toContainText(/discarded/i);
  expect((await object(request,"signal",b.id)).merged_into_id).toBe(a.id);expect((await object(request,"signal",a.id)).discarded_at).not.toBeNull();
});
