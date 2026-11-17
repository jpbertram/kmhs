'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const timeline=require('./mission-timeline.js'),smoke=require('./loss-smoke.js'),trajectory=require('./loss-trajectory.js');
const src=fs.readFileSync(__dirname+'/km3d-v3.js','utf8');
assert(!src.includes('applyBattleState(KM._s,BATTLE_SPAN+999)'),'Return seek must not force future impacts');
assert(src.includes('battleT=KMMissionTimeline.battleCueAtPlayback(KM._playbackSeconds||0)'),'Aircraft uses same cue clock as smoke');
const begin=src.indexOf('function applyBattleState(scene,battleT){'),end=src.indexOf('KM._v2ApplyBattleState=',begin);
for(const cue of [419,420,421,500,599,600,601,700]){
 const v={beh:'fall',ft:300,dur:300,pilot:'Test',sitePos:{x:20,y:2,z:30}};
 const p={userData:{v2:v}},columns=[];
 const noop=()=>{},context={KM:{_fp:[p]},V2:{revealCrash:noop,resetCrashReveals:noop},clearChutes:noop,clearColumns:()=>{columns.length=0;},clearBombs:noop,clearFlashes:noop,clearDevastation:noop,flushPool:noop,addColumn:(scene,pos,pilot)=>columns.push(pilot)};
 vm.runInNewContext(src.slice(begin,end),context);context.applyBattleState({},cue);
 assert.equal(columns.length,cue>600?1:0,'Seek does not create wreck effect before impact');
 const state={...v,startPos:{x:0,y:100,z:0},ctrl:{x:10,y:80,z:10},style:2,seed:1,profile:{motion:'burning_glide'},fwd:{x:1,y:0,z:0}};
 const seconds=timeline.playbackAtBattleCue(cue);
 const points=smoke.sample([state],seconds,timeline,trajectory,true);
 if(cue<600)assert.deepEqual(points,smoke.sample([state],seconds,timeline,trajectory,false),'Ground enabled mode adds no column before impact');
 if(cue>610)assert(points.length>0,'Ground aftermath persists beyond arrival');
}
const scene={},otherScene={},item={baseHaloOpacity:.22,halo:{material:{opacity:.55}},label:{material:{opacity:.85}}},otherItem={baseHaloOpacity:.4,halo:{material:{opacity:.55}},label:{material:{opacity:.85}}};
const markerContext={V2:{_crashGroups:[{scene,items:{Test:item}},{scene:otherScene,items:{Other:otherItem}}]}};
const resetStart=src.indexOf('V2.resetCrashReveals=function'),resetEnd=src.indexOf('V2.setCrashLabels=',resetStart);
vm.runInNewContext(src.slice(resetStart,resetEnd),markerContext);
markerContext.V2.resetCrashReveals(scene);
assert.equal(item.halo.material.opacity,.22);assert.equal(item.label.material.opacity,0);
assert.equal(otherItem.label.material.opacity,.85,'Other scene indicators must not be changed');
assert(src.slice(begin,end).includes('V2.resetCrashReveals(scene)'),'Actual seek handler resets impact markers');
console.log('PASS: premature-impact exclusion, shared return clock and crash-marker rewind reset. Does not certify historical impact times.');
