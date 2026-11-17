'use strict';
const make=require('./m1-runtime-fixture');
const runtime=make(),{T,metric}=runtime;
const stats={runs:20,samples:0,backwards:0,poseJumps:0,largePoseSteps:0,radiusViolations:0,minimumRadiusM:Infinity};
const worst={};
// 105 m/s, 30 degree bank are explicit ESTIMATED limits for controlled
// flight only; no certification of broken/wingless aircraft is implied.
const minimumControlledRadius=105**2/(9.80665*Math.tan(Math.PI/6));
for(let seed=1;seed<=20;seed++){
 runtime.reset();const previous=new Map();
 for(let sec=205+seed/21*.01;sec<300;sec+=.05){
  for(const p of runtime.frame(sec)){
   const id=p.userData.planeData.pilot,v=p.userData.v2,position=metric(p.position),nose=new T.Vector3(1,0,0).applyQuaternion(p.quaternion),old=previous.get(id);
   if(p.visible&&old&&old.visible){
    const delta=p.position.clone().sub(old.scene),distance=position.distanceTo(old.position),angle=p.quaternion.angleTo(old.quaternion);
    if(delta.length()>1e-7&&delta.clone().normalize().dot(nose)<-.01){stats.backwards++;worst.backward=id;}
    if(angle>.15){
     // A rapid finite roll is not a discontinuity. Re-sample the actual
     // placement on an infinitesimal interval before calling it a jump.
     stats.largePoseSteps++;runtime.frame(sec-1e-6);const q0=p.quaternion.clone(),p0=p.position.clone();runtime.frame(sec+1e-6);
     const infinitesimalAngle=q0.angleTo(p.quaternion),infinitesimalDistance=metric(p0).distanceTo(metric(p.position));runtime.frame(sec);
     if(infinitesimalAngle>1e-3||infinitesimalDistance>1){stats.poseJumps++;worst.jump={id,seconds:sec,angle:infinitesimalAngle,distanceM:infinitesimalDistance};}
    }
    if(old.prior){const a=old.position.clone().sub(old.prior),b=position.clone().sub(old.position);a.y=0;b.y=0;
     const cross=Math.abs(a.x*b.z-a.z*b.x),radius=cross>1e-8?a.length()*b.length()*a.clone().add(b).length()/(2*cross):Infinity;
     const motion=v.profile.motion,controlled=v.beh!=='fall'||(/glide|bailout|landing|wing_fire/.test(motion)&&motion!=='controlled_then_spin');
     if(controlled&&radius<minimumControlledRadius*.95){stats.radiusViolations++;worst.radius=id;}
     if(controlled)stats.minimumRadiusM=Math.min(stats.minimumRadiusM,radius);
    }
    if(!Number.isFinite(distance))throw Error('Nonfinite runtime pose');stats.samples++;
   }
   previous.set(id,{visible:p.visible,scene:p.position.clone(),position,quaternion:p.quaternion.clone(),prior:old&&old.position});
  }
 }
}
const pass=!stats.backwards&&!stats.poseJumps&&!stats.radiusViolations;
console.log(`${pass?'PASS':'FAIL'} M1 actual placement transitions ${JSON.stringify({...stats,minimumControlledRadiusM:minimumControlledRadius,worst})}; terrain/effects/browser excluded`);
if(!pass)process.exitCode=1;
