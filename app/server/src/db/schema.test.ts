import { expect, it } from 'vitest';
import { createDatabase, migrate } from './index.js';
import { seed } from '../seed.js';
import { getWorld } from '../tools/queries.js';
it('migrates STRICT tables, retains FK integrity, and seeds the actual jig world once',()=>{
 const db=createDatabase();try{migrate(db);migrate(db);seed(db);seed(db);
 const tables=db.prepare("SELECT name,strict FROM pragma_table_list WHERE schema='main' AND name NOT LIKE 'sqlite_%'").all() as any[];
 expect(tables.every(t=>t.strict===1)).toBe(true);expect(tables.length).toBeGreaterThanOrEqual(30);
 for(const [table,count] of Object.entries({themes:7,theories:10,signals:13,dumps:5,prototypes:4}))expect((db.prepare(`SELECT COUNT(*) n FROM ${table}`).get() as any).n).toBe(count);
 expect(db.pragma('foreign_key_check')).toEqual([]);expect(db.pragma('integrity_check')).toEqual([{integrity_check:'ok'}]);
 const world=getWorld(db);
 expect(world.themes.map((t:any)=>t.id)).toEqual(['cost','memory','review','personal','funding','interfaces','identity']);
 expect(world.theories.map((t:any)=>t.id)).toEqual(['t1','t2','t3','t4','t5','t6','t7','d1','d2','d3']);
 expect(world.signals.map((t:any)=>t.id)).toEqual(['s1','s2','s4','s5','s7','s12','s3','s6','s8','s13','s9','s10','s11']);expect(world.theories.find((t:any)=>t.id==='t3')).toMatchObject({confidence:4,tripwireState:'tripped'});
 expect(world.theories.find((t:any)=>t.id==='t4')).toMatchObject({tripwireState:'resolved'});
 }finally{db.close();}
});
