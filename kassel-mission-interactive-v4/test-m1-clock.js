'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/km3d-v3.js','utf8');
const start=src.indexOf('      if(KM._playing){',src.indexOf('var now=performance.now();'));
const end=src.indexOf('      updateAnchor(',start),code=src.slice(start,end);
assert(start>0&&end>start,'Actual animation scheduler block required');
const ctx={KM:{_playing:true,_playbackSeconds:299.99,_playbackEndSeconds:350,_missionT:.99999,_speed:1},dt:.05,wallDelta:.05,RETURN_START:.92,KMMissionTimeline:require('./mission-timeline')};vm.createContext(ctx);
vm.runInContext(code,ctx);assert(ctx.KM._playing&&ctx.KM._playbackSeconds>300,'Remaining loss paths continue after survivors land');
for(let i=0;i<1200;i++)vm.runInContext(code,ctx);
assert(!ctx.KM._playing);assert.equal(ctx.KM._playbackSeconds,350);assert.equal(ctx.KM._missionT,1);
console.log('PASS M1 actual animation scheduler: survives 300-second home boundary, parks route at 1, stops at remaining-trajectory end; no browser verification');

for(const hz of [10,30,60]){
 ctx.KM._playing=true;ctx.KM._playbackSeconds=0;ctx.KM._playbackEndSeconds=300;
 ctx.KM._speed=1;ctx.wallDelta=1/hz;ctx.dt=Math.min(ctx.wallDelta,.05);
 for(let i=0;i<hz*60;i++)vm.runInContext(code,ctx);
 assert(Math.abs(ctx.KM._playbackSeconds-60)<1e-8,'One minute at '+hz+' Hz must advance 60 playback seconds');
}
console.log('PASS mission clock: 60 real seconds advances 60 playback seconds at 10, 30 and 60 Hz');
const timeline=ctx.KMMissionTimeline,endSeconds=2886.479;
for(const seconds of [0,219,299,300,500,endSeconds]){
 const fraction=timeline.seekFraction(seconds,endSeconds);
 assert(Math.abs(timeline.seekSeconds(fraction,endSeconds)-seconds)<1e-9);
}
assert(timeline.seekFraction(300,endSeconds)>=.8);
assert.equal(timeline.seekSeconds(1,endSeconds),endSeconds);
console.log('PASS timeline seek: documentary and extended playback round-trip');
for(const hz of [10,30,60]){
  const start=300;
  let playhead=start;
  for(let i=0;i<90*hz;i++)playhead=timeline.advancePlayback(playhead,1/hz,endSeconds);
  assert(Math.abs(playhead-endSeconds)<1e-6,'Extended presentation must finish within 90 seconds at '+hz+' Hz');
  assert.equal(timeline.advancePlayback(219,1,endSeconds),220);
}
console.log('PASS remaining paths: continuous 90-second presentation at 10, 30 and 60 Hz');
