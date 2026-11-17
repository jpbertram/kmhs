'use strict';
const make=require('./m1-runtime-fixture'),r=make();let hovering=0,jumps=0,maxGroundErrorM=0,checks=0;
// Actual fallback-terrain branch. DEM-backed geographic ground verification
// remains a separate required check, not replaced by this flat-ground test.
for(let seed=1;seed<=20;seed++){
 r.reset();r.frame(299.999999);const before=new Map(r.planes.map(p=>[p,p.position.clone()]));r.frame(300);
 for(const p of r.planes){if(p.userData.v2.beh!=='stay')continue;
  const errorM=Math.abs(p.position.y-.6)*7010/115;maxGroundErrorM=Math.max(maxGroundErrorM,errorM);
  if(errorM>1)hovering++;if(p.position.distanceTo(before.get(p))>1e-3)jumps++;checks++;
 }
}
console.log(`${hovering||jumps?'FAIL':'PASS'} M1 return fallback-ground: runs=20 checks=${checks} hovering=${hovering} landingJumps=${jumps} maximumGroundErrorM=${maxGroundErrorM.toFixed(3)}; mesh support and DEM terrain not covered`);
if(hovering||jumps)process.exitCode=1;
