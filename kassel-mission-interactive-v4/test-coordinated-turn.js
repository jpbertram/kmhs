'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const checks={forward:true,heading:true,separation:true,slots:true,labels:true,velocityConsistency:true,bodyFrame:true};
if(process.argv.includes('--legacy')){
 const audit=require('node:child_process').spawnSync(process.execPath,[path.join(__dirname,'audit-formation-forward-motion.js'),path.resolve(__dirname,'../tmp/three-r128.js'),'--summary'],{encoding:'utf8'});
 process.stdout.write(audit.stdout);
 console.log('FAIL forward: legacy runtime reverses aircraft.');
 console.log('FAIL heading/separation/slots/labels: legacy build has no metre-based acceptance contract.');
 console.log('FAIL browser FPS: no completed benchmark recorded.');process.exit(1);
}
const model=require('./coordinated-turn.js'),D=require('./turn-parameters.js');
let minimumForward=Infinity,minimumSpeed=Infinity,maximumSpeed=0,minimumSeparation=Infinity,maxHeadingRate=0,maxBank=0,maxError=0;
const logs=[];let positiveWrapRuns=0,negativeWrapRuns=0;
for(let seed=1;seed<=20;seed++){
 const run=model.create({seed:(0x9e3779b9*seed)>>>0,turnRateRadS:D.values.nominalTurnRateRadS.value*(seed===20?3:.5+seed/20),direction:seed%2?1:-1});
 let previous=run.sample(0);
 const initialHeading=previous.headingRad,finalHeading=run.sample(run.durationS).headingRad;
 if(initialHeading<Math.PI&&finalHeading>Math.PI)positiveWrapRuns++;
 if(initialHeading>-Math.PI&&finalHeading<-Math.PI)negativeWrapRuns++;
 for(let t=0;t<=run.durationS;t+=D.values.testStepS.value){
  const state=run.sample(t);
  state.aircraft.forEach((p,i)=>{
   const h=state.headingRad,beta=state.leaderBankRad,dx=p.positionM[0]-state.leaderM[0],dy=p.positionM[1]-state.leaderM[1],dz=p.positionM[2]-state.leaderM[2];
   const x=Math.cos(h)*dx+Math.sin(h)*dz,z=-Math.sin(h)*dx+Math.cos(h)*dz;
   const body=[x,Math.cos(beta)*dy+Math.sin(beta)*z,-Math.sin(beta)*dy+Math.cos(beta)*z];
   checks.bodyFrame&&=Math.hypot(...body.map((v,k)=>v-D.roster[i].offsetM[k]))<1e-7;
   const forward=p.velocityMps[0]*Math.cos(p.headingRad)+p.velocityMps[2]*Math.sin(p.headingRad);
   minimumForward=Math.min(minimumForward,forward);minimumSpeed=Math.min(minimumSpeed,p.speedMps);maximumSpeed=Math.max(maximumSpeed,p.speedMps);maxBank=Math.max(maxBank,Math.abs(p.bankRad));
   checks.forward&&=forward>=0&&p.speedMps>=D.values.stallSpeedMps.value&&p.speedMps<=D.values.maximumSpeedMps.value;
   if(t>0){const rate=Math.abs(p.headingRad-previous.aircraft[i].headingRad)/D.values.testStepS.value;maxHeadingRate=Math.max(maxHeadingRate,rate);checks.heading&&=rate<=D.values.maximumTurnRateRadS.value+1e-8;}
   for(let j=0;j<i;j++){const q=state.aircraft[j],distance=Math.hypot(...p.positionM.map((x,k)=>x-q.positionM[k]));minimumSeparation=Math.min(minimumSeparation,distance);checks.separation&&=distance>D.values.wingspanM.value*.5;}
  });
  if(Math.abs(t/5-Math.round(t/5))<1e-8){
   logs.push({seed:run.seed,t,aircraft:state.aircraft});
   if(t>.001&&t<run.durationS-.001){const lo=run.sample(t-.0001),hi=run.sample(t+.0001);
    state.aircraft.forEach((p,i)=>{const measured=hi.aircraft[i].positionM.map((x,k)=>(x-lo.aircraft[i].positionM[k])/.0002);
     checks.velocityConsistency&&=Math.hypot(...measured.map((v,k)=>v-p.velocityMps[k]))<.02;
    });
   }
  }
  previous=state;
 }
 const final=run.sample(run.durationS);
 final.aircraft.forEach((p,i)=>{const dx=p.positionM[0]-final.leaderM[0],dz=p.positionM[2]-final.leaderM[2],h=final.headingRad;
  const reconstructed=[Math.cos(h)*dx+Math.sin(h)*dz,p.positionM[1]-final.leaderM[1],-Math.sin(h)*dx+Math.cos(h)*dz];
  const error=Math.hypot(...reconstructed.map((x,k)=>x-D.roster[i].offsetM[k]));
  maxError=Math.max(maxError,error);checks.slots&&=error<=D.values.slotToleranceM.value;
 });
}
for(const p of Object.values(D.values))checks.labels&&=['MEASURED','PUBLISHED','ESTIMATED'].includes(p.label)&&!!p.source&&!!p.unit&&Number.isFinite(p.value);
for(const slot of D.roster)checks.labels&&=slot.label==='ESTIMATED'&&!!slot.source&&slot.offsetM.every(Number.isFinite);
const readme=fs.readFileSync(path.join(__dirname,'README.md'),'utf8');
for(const [key,p]of Object.entries(D.values))if(p.label==='ESTIMATED')checks.labels&&=readme.includes(key);
checks.heading&&=maxBank<=D.values.maximumBankRad.value+1e-8;
checks.heading&&=positiveWrapRuns>0&&negativeWrapRuns>0;
for(const [key,pass]of Object.entries(checks))console.log(`${pass?'PASS':'FAIL'} ${key}`);
console.log(JSON.stringify({runs:20,aircraft:D.roster.length,positiveWrapRuns,negativeWrapRuns,minimumForwardMps:minimumForward,minimumSpeedMps:minimumSpeed,maximumSpeedMps:maximumSpeed,minimumSeparationM:minimumSeparation,maxHeadingRateRadS:maxHeadingRate,maxBankRad:maxBank,maxSlotErrorM:maxError}));
if(process.argv.includes('--write-results')){fs.writeFileSync(path.join(__dirname,'turn-test-logs.json'),JSON.stringify(logs,null,2));fs.writeFileSync(path.join(__dirname,'turn-test-results.json'),JSON.stringify({runs:20,aircraft:D.roster.length,positiveWrapRuns,negativeWrapRuns,checks,minimumForward,minimumSpeed,maximumSpeed,minimumSeparation,maxHeadingRate,maxBank,maxError},null,2));}
if(Object.values(checks).some(v=>!v))process.exitCode=1;
