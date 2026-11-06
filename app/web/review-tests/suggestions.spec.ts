import { expect,test } from "@playwright/test";
import { object,snapshot } from "./helpers";

for(const key of ["claim","body","insert","name"])test(`review and rephrase the full ${key} proposal before accepting`,async({page,request})=>{
  const world=await snapshot(request),suggestion=world.suggestions.find((s:any)=>s.reasoning===`Review ${key} reasoning`),kind=suggestion.target_kind,id=suggestion.target_id;
  await page.goto(`/?open=${kind}:${id}`);
  const review=page.locator(`[data-suggestion-id="${suggestion.id}"]`);
  await expect(review).toBeVisible();
  const proposed={claim:"Proposed claim claim",body:"A complete proposed replacement",insert:"A proposed body addition.",name:"Proposed theme name"}[key]!;
  await expect(review).toContainText(proposed);
  await page.goto("/?view=briefing");
  const card=page.locator(`[data-bid="${suggestion.id}"]`);await expect(card.locator('.ab-proposal')).toHaveCount(0);await card.hover();await card.getByRole('button',{name:'Review suggestion',exact:true}).click();
  await expect(review).toBeVisible();
  await expect(review).toContainText(proposed);
  if(key!=="body"){
    await page.goto(`/?open=${kind}:${id}`);
  }
  await review.getByRole("button",{name:"Rephrase and accept",exact:true}).click();
  const label={claim:"Proposed claim",body:"Replacement body",insert:"Add to body",name:"Proposed name"}[key]!;
  const changed=`Person's reviewed ${key} wording`;await review.getByRole("textbox",{name:label,exact:true}).fill(changed);
  const sent=page.waitForRequest(r=>r.url().endsWith("/api/tools/decideSuggestion"));
  await review.getByRole("button",{name:"Accept wording",exact:true}).click();
  const field=key==="insert"?"bodyInsert":key;expect((await sent).postDataJSON()).toMatchObject({id:suggestion.id,decision:"accepted",[field]:changed});
  const savedField=key==="insert"?"body":key;
  await expect.poll(async()=>(await object(request,kind,id))[savedField]).toContain(changed);
  const saved=await object(request,kind,id);expect(saved.updated_by).toBe("person:maggie");
  if(kind==="theory"){expect(saved.versions.length).toBeGreaterThanOrEqual(2);expect(saved.authorship).toBe("rephrased");}
  if(key==="insert")expect(saved.body).toContain("Original reviewed body");
  await page.reload();expect((await object(request,kind,id))[savedField]).toContain(changed);await expect(review).toHaveCount(0);
});

test("evidence review shows its stance and source and accepts the person's note",async({page,request})=>{
  const world=await snapshot(request),suggestion=world.suggestions.find((s:any)=>s.reasoning==="Review evidence reasoning");
  await page.goto(`/?open=theory:${suggestion.target_id}`);const review=page.locator(`[data-suggestion-id="${suggestion.id}"]`);
  await expect(page.getByRole("region",{name:"Undermines",exact:true}).locator(`[data-suggestion-id="${suggestion.id}"]`)).toBeVisible();
  await expect(review).toContainText("Review proposed evidence observation");await expect(review.getByRole("link",{name:"Evidence source",exact:true})).toHaveAttribute("href","https://example.org/review-evidence");
  await review.getByRole("button",{name:"Rephrase and accept",exact:true}).click();await review.getByRole("textbox",{name:"Evidence note",exact:true}).fill("My evidence note");await review.getByRole("button",{name:"Accept wording",exact:true}).click();
  await expect.poll(async()=>(await object(request,"theory",suggestion.target_id)).evidence.some((e:any)=>e.note==="My evidence note"&&e.stance==="undermines")).toBe(true);
  await page.reload();expect((await object(request,"suggestion",suggestion.id)).status).toBe("accepted");
});

for(const kind of ["theme","theory"])test(`merge proposal names both ${kind} identities and persists its decision`,async({page,request})=>{
  const world=await snapshot(request),suggestion=world.suggestions.find((s:any)=>s.reasoning===`Review ${kind} merge reasoning`);
  const otherId=suggestion.payload.other_id;await page.goto(`/?open=${kind}:${suggestion.target_id}`);
  const review=page.locator(`[data-suggestion-id="${suggestion.id}"]`);await expect(review).toContainText(`Review merge ${kind} keep`);await expect(review).toContainText(`Review merge ${kind} absorbed`);
  await review.getByRole("button",{name:"Accept",exact:true}).click();await expect.poll(async()=>(await object(request,kind,otherId)).merged_into_id).toBe(suggestion.target_id);
  await page.reload();expect((await object(request,"suggestion",suggestion.id)).status).toBe("accepted");expect((await object(request,kind,otherId)).status).toBe("retired");
});

test("discarding a revision keeps the original claim",async({page,request})=>{
  const world=await snapshot(request),suggestion=world.suggestions.find((s:any)=>s.reasoning==="Review discard reasoning");
  await page.goto(`/?open=theory:${suggestion.target_id}`);const review=page.locator(`[data-suggestion-id="${suggestion.id}"]`);
  await expect(review).toBeVisible();await expect(review).toContainText("Proposed discard claim");
  await review.getByRole("button",{name:"Dismiss",exact:true}).click();await expect.poll(async()=>(await object(request,"suggestion",suggestion.id)).status).toBe("discarded");
  await page.reload();expect((await object(request,"theory",suggestion.target_id)).claim).toBe("Review discard revision target");await expect(review).toHaveCount(0);
});
