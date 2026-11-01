import { expect, test } from 'vitest';
import { audioPeaks } from './audio-waveform';
test('waveform preserves silent and loud sections from actual stereo samples',()=>{
 const left=new Float32Array([0,0,.1,-.2,.3,-.6,0,0]);
 const right=new Float32Array([0,0,.1,-.1,.8,-.4,0,0]);
 expect(audioPeaks([left,right],4)).toEqual([0,expect.closeTo(.2),expect.closeTo(.8),0]);
});
test('empty audio stays silent rather than inventing illustrative peaks',()=>{
 expect(audioPeaks([new Float32Array(0)],6)).toEqual([0,0,0,0,0,0]);
});
