'use strict';
const make=require('./m1-runtime-fixture'),r=make(),{T,metric}=r;
let jumps=0,pending=0,groundMisses=0,checks=0;const failures=[];
for(let seed=1;seed<=20;seed++){
 r.reset();r.frame(240);
 for(const p of r.planes){const v=p.userData.v2;if(v.ft==null||v.beh==='stay')continue;
  const seconds=r.ctx.KMMissionTimeline.playbackAtBattleCue(v.ft),h=1e-6;
  r.frame(seconds-h);const a=metric(p.position),q=p.quaternion.clone();r.frame(seconds+h);
  const distance=a.distanceTo(metric(p.position)),angle=q.angleTo(p.quaternion);
  if(distance>1||angle>.001){jumps++;if(failures.length<8)failures.push({pilot:v.pilot,distanceM:distance,angle});}
  const endCue=v.ft+(v.beh==='fall'?v.dur:v.exitDuration),end=r.ctx.KMMissionTimeline.playbackAtBattleCue(endCue);
  if(end>(r.ctx.KM._playbackEndSeconds||300))pending++;
  r.frame(end-1e-6);const arrival=p.position.clone();r.frame(end+1e-6);
  if(v.sitePos&&Math.hypot(arrival.x-v.sitePos.x,arrival.z-v.sitePos.z)>1e-3){groundMisses++;if(failures.length<8)failures.push({pilot:v.pilot,reason:'endpoint mismatch'});}
  checks++;
 }
}
console.log(`${jumps||pending||groundMisses?'FAIL':'PASS'} M1 exact boundary gates: runs=20 checks=${checks} poseJumps=${jumps} endpointsBeyondPlayback=${pending} endpointMisses=${groundMisses} playbackEndSeconds=${r.ctx.KM._playbackEndSeconds.toFixed(3)} failures=${JSON.stringify(failures)}; animation scheduler/ground terrain not covered`);
if(jumps||pending||groundMisses)process.exitCode=1;
