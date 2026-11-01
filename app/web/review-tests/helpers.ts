import { expect,type APIRequestContext,type Page } from "@playwright/test";
export async function snapshot(request:APIRequestContext){
  const world=await(await request.get("/api/world")).json();let cursor=world.signalPage?.nextCursor;
  while(cursor){const page=await(await request.get(`/api/signals?cursor=${encodeURIComponent(cursor)}`)).json();world.signals.push(...page.signals);cursor=page.signalPage?.nextCursor;}
  return world;
}
export const object=async(request:APIRequestContext,kind:string,id:string)=>(await request.get(`/api/objects/${kind}/${id}`)).json();
export async function tool(request:APIRequestContext,name:string,input:object){const response=await request.post(`/api/tools/${name}`,{data:input});expect(response.ok(),await response.text()).toBeTruthy();return response.json();}
export async function find(page:Page,query:string,label:string){
  await expect(page.getByRole("button",{name:"Dump or ask (⌘J)",exact:true})).toBeVisible();
  await page.keyboard.press("Meta+k");const dialog=page.getByRole("dialog",{name:"Find",exact:true});
  await dialog.getByRole("textbox",{name:"Find",exact:true}).fill(query);
  await dialog.getByRole("button",{name:new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}`)}).click();
}
export async function openColumn(page:Page){await page.getByRole("button",{name:"Dump or ask (⌘J)",exact:true}).click();}
