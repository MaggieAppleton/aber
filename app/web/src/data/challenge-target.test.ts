import { afterEach, expect, test } from 'vitest';
import { currentChallenge } from './challenge-target';
import { world } from './live';
const original={theories:world.theories,suggestions:world.suggestions};
afterEach(()=>{world.theories=original.theories;world.suggestions=original.suggestions;});
test('the same signal targets its current tripwire suggestion after an older decision',()=>{
 world.theories=[{id:'theory',tripwireVersion:2}];
 world.suggestions=[
  {id:'old',kind:'challenge',targetId:'theory',status:'accepted',payload:{signal_id:'signal',tripwire_version:1}},
  {id:'new',kind:'challenge',targetId:'theory',status:'pending',payload:{signal_id:'signal',tripwire_version:2}},
 ];
 expect(currentChallenge('theory','signal','new')?.id).toBe('new');
 expect(currentChallenge('theory','signal','old')?.id).toBe('new');
 expect(currentChallenge('theory','signal')?.id).toBe('new');
});
test('an explicit current hit retains the right accepted decision for undo',()=>{
 world.theories=[{id:'theory',tripwire_version:3}];
 world.suggestions=[
  {id:'accepted',kind:'challenge',target_id:'theory',status:'accepted',payload:{signal_id:'signal',tripwire_version:3}},
  {id:'pending',kind:'challenge',target_id:'theory',status:'pending',payload:{signal_id:'signal',tripwire_version:3}},
 ];
 expect(currentChallenge('theory','signal','accepted')?.id).toBe('accepted');
});
