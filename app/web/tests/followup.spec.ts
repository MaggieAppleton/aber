import { expect,test,type APIRequestContext } from '@playwright/test';
import { waveFixture } from './wave-fixture';
const snapshot=async(request:APIRequestContext)=>(await request.get('/api/world')).json();
async function tool(request:APIRequestContext,name:string,input:object){const response=await request.post(`/api/tools/${name}`,{data:input});expect(response.ok(),await response.text()).toBeTruthy();return response.json();}
async function settled(request:APIRequestContext,id:string){await expect.poll(async()=>(await(await request.get(`/api/dumps/${id}`)).json()).status,{timeout:30000}).toBe('done');return(await request.get(`/api/dumps/${id}`)).json();}
const errors=new WeakMap<object,string[]>();
test.beforeEach(async({page})=>{const messages:string[]=[];errors.set(page,messages);page.on('pageerror',error=>messages.push(error.message));});
test.afterEach(async({page})=>expect(errors.get(page)).toEqual([]));

test('card drop keeps its identity, reports completed results, holds the toast, and persistently undoes outside text',async({page,request})=>{
 await page.goto('/?view=current');
 const before=await snapshot(request),theory=before.theories.find((row:any)=>row.id==='t1');
 const captured=page.waitForResponse(response=>response.url().endsWith('/api/dumps')&&response.request().method()==='POST');
 await page.locator('.cur-card[data-pick="t1"] .ap-card').dragTo(page.locator('[data-target="pill"]').first());
 const response=await captured,body=response.request().postDataJSON(),{id}=await response.json();
 expect(body.text).toBe(theory.claim);expect(body.context).toContainEqual({kind:'theory',id:theory.id,label:theory.claim});
 const dump=await settled(request,id),after=await snapshot(request);
 const signalCount=dump.produced.filter((id:string)=>after.signals.some((signal:any)=>signal.id===id&&signal.created_at>=dump.captured_at)).length;
 const toast=page.locator('.ps-toast');await expect(toast).toContainText(`${signalCount} ${signalCount===1?'signal':'signals'}`);
 await toast.hover();await page.waitForTimeout(5500);await expect(toast).toBeVisible();await page.mouse.move(0,0);await expect(toast).toHaveCount(0,{timeout:7000});
 await page.keyboard.press('Meta+j');const input=page.getByRole('textbox',{name:'Dump or ask'});await input.fill('This text has its own undo');await input.press('Meta+z');
 expect((await(await request.get(`/api/dumps/${id}`)).json()).deleted_at).toBeNull();
 await page.keyboard.press('Escape');await page.keyboard.press('Meta+z');
 await expect.poll(async()=>(await(await request.get(`/api/dumps/${id}`)).json()).deleted_at).not.toBeNull();
 await page.reload();expect((await(await request.get(`/api/dumps/${id}`)).json()).deleted_at).not.toBeNull();
});

test('closing the column reports its actual completed captures and Undo bins those dumps',async({page,request})=>{
 await page.goto('/');await page.getByRole('button',{name:'Dump or ask (⌘J)',exact:true}).click();
 const captured=page.waitForResponse(response=>response.url().endsWith('/api/dumps')&&response.request().method()==='POST');
 const input=page.getByRole('textbox',{name:'Dump or ask'});await input.fill('A regression observation: agents draft code while the human reviews its intent.');await input.press('Enter');
 const {id}=await(await captured).json(),dump=await settled(request,id),after=await snapshot(request);
 await expect(page.locator('.ps-think')).toHaveCount(0);await expect(page.locator('.ps-toast')).toHaveCount(0);
 await page.keyboard.press('Escape');const signals=dump.produced.filter((id:string)=>after.signals.some((row:any)=>row.id===id&&row.created_at>=dump.captured_at)).length;
 await expect(page.locator('.ps-toast')).toContainText(`${signals} ${signals===1?'signal':'signals'}`);
 await page.locator('.ps-toast').getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(async()=>(await(await request.get(`/api/dumps/${id}`)).json()).deleted_at).not.toBeNull();
});

test('prototype media uploads without a dump or processing side effect',async({page,request})=>{
 const before=await snapshot(request);let captures=0;page.on('request',r=>{if(r.url().endsWith('/api/dumps')&&r.method()==='POST')captures++;});
 await page.goto('/?open=prototype:p1');
 await page.getByLabel('Attach prototype media').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4ZkAAAAASUVORK5CYII=','base64')});
 await expect(page.locator('.as-pane img.pn-media')).toBeVisible();expect(captures).toBe(0);expect((await snapshot(request)).dumps).toHaveLength(before.dumps.length);
 await page.reload();await expect(page.locator('.as-pane img.pn-media')).toBeVisible();
});

test('a recording waveform follows decoded samples and supports keyboard seeking',async({page,request})=>{
 const response=await request.post('/api/dumps',{multipart:{from:'column',file:{name:'amplitude-pattern.wav',mimeType:'audio/wav',buffer:waveFixture()}}});expect(response.ok()).toBeTruthy();const{id}=await response.json();await settled(request,id);
 await page.goto('/');await page.getByRole('button',{name:'Dump or ask (⌘J)',exact:true}).click();
 const note=page.locator('.ps-thread .ab-recorded-note').last();await expect(note.locator('.ps-voice')).toHaveAttribute('aria-busy','false');await expect(note.locator('.ab-wave-error')).toHaveCount(0);
 const heights=await note.locator('.ps-note-wave i').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().height));expect(Math.max(...heights)-Math.min(...heights)).toBeGreaterThan(6);expect(heights[0]).toBeCloseTo(3,2);
 const slider=note.getByRole('slider',{name:'Recording position'});await slider.focus();await slider.press('End');await expect(slider).toHaveAttribute('aria-valuenow','100');
});

test('opening a signal in Columns marks it seen once and removes its other new marks',async({page,request})=>{
 const before=await snapshot(request),signal=before.signals.find((row:any)=>row.seen_at===null);expect(signal).toBeTruthy();let seen=0;
 page.on('request',r=>{if(r.url().endsWith('/api/tools/markSeen')&&r.postDataJSON().id===signal.id)seen++;});
 await page.goto('/?view=columns');await page.getByRole('button',{name:'Show Signals',exact:true}).click();const row=page.locator('.cd-col[data-kind="signal"] .cd-item-btn').filter({hasText:signal.gist});await row.click();
 await expect.poll(async()=>(await(await request.get(`/api/objects/signal/${signal.id}`)).json()).seen_at).not.toBeNull();await row.click();await row.click();expect(seen).toBe(1);
});

test('pane A/X acts on its own draft and preserves text editing',async({page,request})=>{
 const before=await snapshot(request),drafts=before.theories.filter((row:any)=>row.status==='draft');expect(drafts.length).toBeGreaterThanOrEqual(2);
 await page.goto(`/?open=theory:${drafts[0].id}`);const claim=page.getByRole('textbox',{name:'Claim',exact:true});await claim.click();await claim.press('a');expect((await(await request.get(`/api/objects/theory/${drafts[0].id}`)).json()).status).toBe('draft');
 await page.getByRole('separator').focus();await page.keyboard.press('a');await expect.poll(async()=>(await(await request.get(`/api/objects/theory/${drafts[0].id}`)).json()).status).toBe('held');await page.keyboard.press('x');expect((await(await request.get(`/api/objects/theory/${drafts[0].id}`)).json()).status).toBe('held');
 await page.goto(`/?open=theory:${drafts[1].id}`);await page.getByRole('separator').focus();await page.keyboard.press('x');await expect.poll(async()=>(await snapshot(request)).theories.some((row:any)=>row.id===drafts[1].id)).toBe(false);
});

test('all origins remain named and a saved origin opens its real dump',async({page,request})=>{
 const before=await snapshot(request),signal=before.signals.find((row:any)=>row.sources.some((source:any)=>source.url)&&row.themes.length&&row.origins.length);
 const text='The same observation saved again for origin navigation.';const response=await request.post('/api/dumps',{data:{text,urls:[signal.sources.find((source:any)=>source.url).url],from:'web'}});const{id}=await response.json();await settled(request,id);
 const current=await(await request.get(`/api/objects/signal/${signal.id}`)).json();expect(current.origins.length).toBeGreaterThanOrEqual(2);
 await page.goto(`/?open=theme:${signal.themes[0]}`);await page.locator('.pn-sig').filter({hasText:signal.gist}).getByRole('button').first().click();
 const origins=page.locator('.pn-sig[data-open] .pn-origin');await expect(origins).toHaveCount(current.origins.length);await origins.filter({hasText:text}).click();await expect(page.getByRole('dialog',{name:text,exact:true})).toContainText(text);
});

test('keeping a merge is durable while its signal remains merged',async({page,request})=>{
 const before=await snapshot(request),candidates=before.signals.filter((row:any)=>row.themes.length),survivor=candidates[0],absorbed=candidates[1];
 const merge=await tool(request,'mergeNearDuplicateSignals',{survivorId:survivor.id,absorbedId:absorbed.id,reasoning:'Two references to the same observation in this regression fixture.'});
 const id=merge.id??merge.merge?.id;expect(id).toBeTruthy();await page.goto('/?view=briefing');await page.locator(`[data-bid="${id}"]`).getByRole('button',{name:'Keep merge (A)',exact:true}).click();
 await expect.poll(async()=>(await snapshot(request)).merges.find((row:any)=>row.id===id)?.seen_at).not.toBeNull();await page.reload();await expect(page.locator(`[data-bid="${id}"]`)).toHaveCount(0);expect((await snapshot(request)).merges.find((row:any)=>row.id===id).undone_at).toBeNull();
});

test('accepting a new tripwire hit cannot decide an older hit for the same signal',async({page,request})=>{
 const before=await snapshot(request),old=before.suggestions.find((row:any)=>row.kind==='challenge'&&row.target_id==='t3'&&row.payload.signal_id==='s7');expect(old).toBeTruthy();
 if(old.status==='pending')await tool(request,'decideSuggestion',{id:old.id,decision:'accepted'});
 const resolved=(await snapshot(request)).suggestions.find((row:any)=>row.id===old.id).status;
 const theory=await tool(request,'setTripwire',{id:'t3',tripwire:'A major assistant withdraws its memory feature after privacy complaints.'});
 const version=theory.tripwire_version??theory.tripwireVersion;
 await expect.poll(async()=>(await snapshot(request)).suggestions.some((row:any)=>row.kind==='challenge'&&row.target_id==='t3'&&row.payload.signal_id==='s7'&&row.payload.tripwire_version===version&&row.status==='pending'),{timeout:30000}).toBe(true);
 const hit=(await snapshot(request)).suggestions.find((row:any)=>row.kind==='challenge'&&row.target_id==='t3'&&row.payload.signal_id==='s7'&&row.payload.tripwire_version===version);
 await page.goto('/?open=theory:t3');const decision=page.waitForRequest(r=>r.url().endsWith('/api/tools/decideSuggestion'));
 await page.locator('.tw-hit').filter({hasText:'Memory feature withdrawn after privacy complaints'}).getByRole('button',{name:'Accept',exact:true}).click();expect((await decision).postDataJSON().id).toBe(hit.id);
 await expect.poll(async()=>(await snapshot(request)).suggestions.find((row:any)=>row.id===hit.id).status).toBe('accepted');expect((await snapshot(request)).suggestions.find((row:any)=>row.id===old.id).status).toBe(resolved);
});
