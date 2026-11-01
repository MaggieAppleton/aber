import { expect,test } from "@playwright/test";
import { object,tool } from "./helpers";

test("a horizontal Timeline drag changes horizon without appending confidence",async({page,request})=>{
  const theory=await tool(request,"writeTheory",{claim:"Review horizontal-only drag",confidence:1,horizon:2030});
  await page.goto("/?view=timeline");const item=page.locator(`.t2a-item[data-tid="${theory.id}"]`);await expect(item).toBeVisible();
  const before=await object(request,"theory",theory.id),years=await page.locator(".t2a-year").evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().x)),step=years[1]-years[0],box=(await item.boundingBox())!;
  await page.mouse.move(box.x+5,box.y+5);await page.mouse.down();await page.mouse.move(box.x+5+step,box.y+5,{steps:8});await page.mouse.up();
  await expect.poll(async()=>(await object(request,"theory",theory.id)).horizon).toBe(2031);
  const saved=await object(request,"theory",theory.id);expect(saved.confidence).toBe(1);expect(saved.stances).toHaveLength(before.stances.length);
  await page.reload();expect((await object(request,"theory",theory.id)).horizon).toBe(2031);expect((await object(request,"theory",theory.id)).stances).toHaveLength(before.stances.length);
});
