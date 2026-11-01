import { afterEach,expect,test } from 'vitest';
import { world } from '../data/live';
import { producedParts } from './capture-results';
const original={signals:world.signals,theories:world.theories,themes:world.themes,prototypes:world.prototypes};
afterEach(()=>Object.assign(world,original));
test('capture counts deduplicate produced records and do not call a repeated old signal new',()=>{
 world.signals=[{id:'old',created_at:'2026-01-01T00:00:00Z'},{id:'new',created_at:'2026-11-01T00:00:01Z'}];
 world.theories=[{id:'draft',status:'held'}];world.themes=[];world.prototypes=[];
 const dump={captured_at:'2026-11-01T00:00:00Z',produced:['old','new','draft'],drafts:[{id:'draft',kind:'theory'}]};
 expect(producedParts([dump,dump])).toEqual([{icon:'signal',n:1,one:'signal',many:'signals'},{icon:'theory',n:1,one:'draft',many:'drafts'}]);
});
