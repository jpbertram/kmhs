'use strict';
const make=require('./m1-runtime-fixture'),r=make(),{T}=r;
let backwards=0,stops=0,samples=0,earlyEscorts=0;const failures=[];
const fighters=r.ctx.KM._fighterWaves.flatMap(w=>w.models).concat(r.ctx.KM._escorts);
for(let seed=1;seed<=20;seed++){
 r.reset();const prior=new Map();
 for(let sec=205+seed/21*.01;sec<310;sec+=.05){r.frame(sec);
  for(const f of fighters){const old=prior.get(f);
   if(r.ctx.KM._escorts.includes(f)&&f.visible&&r.ctx.KMMissionTimeline.battleAt(r.ctx.KM._missionT)<300)earlyEscorts++;
   if(old&&old.visible&&f.visible){const delta=f.position.clone().sub(old.position),nose=new T.Vector3(1,0,0).applyQuaternion(f.quaternion);
    if(delta.lengthSq()<1e-14){stops++;if(failures.length<4)failures.push({seconds:sec,reason:'visible fighter stopped'});}
    else if(delta.normalize().dot(nose)<0){backwards++;if(failures.length<4)failures.push({seconds:sec,reason:'tail-first world movement'});}samples++;
   }
   prior.set(f,{position:f.position.clone(),visible:f.visible});
  }
 }
}
console.log(`${backwards||stops||earlyEscorts?'FAIL':'PASS'} M1 moving-anchor fighters: runs=20 samples=${samples} backwards=${backwards} visibleStops=${stops} earlyEscorts=${earlyEscorts} failures=${JSON.stringify(failures)}; bounds/forces not covered`);
if(backwards||stops||earlyEscorts)process.exitCode=1;
r.frame(304);
if(r.ctx.KM._escorts.some(escort=>escort.visible)){
 console.error('FAIL post-return escort state: an escort remains tethered to the landed formation');
 process.exitCode=1;
}else console.log('PASS post-return escort state: completed passes are no longer tethered to the formation');
