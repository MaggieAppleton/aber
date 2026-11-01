import { expect,test } from "@playwright/test";
import { find,object,snapshot } from "./helpers";

test("typed Find discovers bodies, retired history, all nouns and signals beyond the first page",async({page,request})=>{
  await page.goto("/");await expect(page.getByRole("button",{name:"Find (⌘K)",exact:true})).toBeVisible();
  const reads:string[]=[];page.on("request",r=>{if(r.url().endsWith("/api/tools/search"))reads.push(r.postDataJSON().text);});
  await find(page,"quartznebula","Review searchable active claim");await expect(page.getByRole("textbox",{name:"Body",exact:true})).toContainText("quartznebula");
  await find(page,"archived claim","Review archived claim with history");await expect(page.locator(".as-pane .ab-retired")).toHaveText("Retired, superseded");
  await page.reload();await expect(page.locator(".as-pane .ab-retired")).toHaveText("Retired, superseded");
  await find(page,"archived theme","Review archived theme");await expect(page.locator(".as-pane .ab-retired")).toHaveText("Retired, abandoned");
  await find(page,"prototype with retired","Review prototype with retired tests");await expect(page.getByRole("textbox",{name:"Prototype name",exact:true})).toHaveText("Review prototype with retired tests");
  const first=await(await request.get("/api/world")).json();expect(first.signalPage.nextCursor).toBeTruthy();expect(first.signals.some((s:any)=>s.id==="review-page-older")).toBe(false);
  await find(page,"lanternviolet","Pagination lanternviolet observation");await expect(page).toHaveURL(/view=columns/);
  await expect(page.locator('.cd-col[data-kind="signal"] .cd-item[data-id="review-page-older"] .pn-detail-inner')).toContainText("Pagination lanternviolet");
  await find(page,"cobaltraven","Review transcript source");await expect(page.locator('.cd-col[data-kind="dump"] .cd-detail-inner')).toContainText("A spoken cobaltraven observation.");
  expect(reads).toEqual(expect.arrayContaining(["quartznebula","archived claim","archived theme","lanternviolet","cobaltraven"]));
});

test("prototype Tests disclose each retirement reason and retain navigation and history",async({page,request})=>{
  const world=await snapshot(request),prototype=world.prototypes.find((p:any)=>p.name==="Review prototype with retired tests");
  for(const reason of ["disproven","superseded","abandoned"]){
    await page.goto(`/?open=prototype:${prototype.id}`);
    const chip=page.locator(".pn-rival[data-retired]").filter({hasText:`Review retired dependency ${reason}`});
    await expect(chip).toContainText(`Retired, ${reason}`);await chip.click();
    await expect(page.getByRole("textbox",{name:"Claim",exact:true})).toHaveText(`Review retired dependency ${reason}`);
    await expect(page.locator(".as-pane .ab-retired")).toHaveText(`Retired, ${reason}`);
    await page.reload();await expect(page.locator(".as-pane .ab-retired")).toHaveText(`Retired, ${reason}`);
    const theory=world.theories.find((t:any)=>t.claim===`Review retired dependency ${reason}`);
    expect((await object(request,"theory",theory.id)).stances.length).toBeGreaterThan(0);
  }
});

test("the compact tripwire count retains its independent expanded hit region",async({page})=>{
  await page.goto("/?open=theory:t3");const count=page.getByRole("button",{name:"1 signal matches",exact:true});
  await expect(count).toBeVisible();
  const target=await count.evaluate(node=>{const pseudo=getComputedStyle(node,'::after');return{width:parseFloat(pseudo.width),height:parseFloat(pseudo.height)};});
  expect(target.width).toBeGreaterThanOrEqual(40);expect(target.height).toBeGreaterThanOrEqual(40);
  const wasVisible=await page.locator('.tw-hits').isVisible();await count.click();
  if(wasVisible)await expect(page.locator('.tw-hits')).toBeHidden();else await expect(page.locator('.tw-hits')).toBeVisible();
});
test("an accepted tripwire hit retains its historical lowered value after confidence changes",async({page,request})=>{
  const world=await snapshot(request),theory=world.theories.find((row:any)=>row.claim==="Review historical challenge decision");
  expect(theory.confidence).toBe(5);await page.goto(`/?open=theory:${theory.id}`);
  await page.getByRole("button",{name:"1 accepted",exact:true}).click();await expect(page.locator(".tw-hit")).toContainText("Accepted, lowered to 3");await expect(page.locator(".tw-hit")).not.toContainText("lowered to 5");
  await page.reload();await page.getByRole("button",{name:"1 accepted",exact:true}).click();await expect(page.locator(".tw-hit")).toContainText("Accepted, lowered to 3");
});
test("phone evidence review unfolds the real signal in its existing full-width pane",async({page,request})=>{
  const world=await snapshot(request),suggestion=world.suggestions.find((s:any)=>s.reasoning==="Review evidence reasoning"),signal=world.signals.find((s:any)=>s.id===suggestion.payload.signal_id);
  await page.setViewportSize({width:390,height:844});await page.goto("/?view=briefing");
  const card=page.locator(`[data-bid="${suggestion.id}"]`);await expect(card.locator('.ab-proposal')).toHaveCount(0);await card.hover();await card.getByRole('button',{name:'Review suggestion',exact:true}).click();
  await expect(card.locator('.ab-proposal')).toBeVisible();
  await page.locator(`[data-suggestion-id="${suggestion.id}"] .pn-link`).click();
  await expect(page.locator(".as-pane .pn-sig[data-open] .pn-detail-inner")).toContainText(signal.gist);
  await expect(page.getByRole("textbox",{name:"Claim",exact:true})).toHaveText("Review evidence proposal target");
  const bounds=await page.locator(".as-pane").boundingBox();expect(bounds?.width).toBe(390);
  await expect.poll(async()=>(await object(request,"signal",signal.id)).seen_at).not.toBeNull();
  await page.screenshot({path:"test-results/web-review/evidence-phone.png",animations:"disabled"});
});
