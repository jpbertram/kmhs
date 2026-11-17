'use strict';
const assert=require('node:assert/strict'),formation=require('./formation-kinematics.js');
const slot={alongM:-300,lateralM:1000,verticalM:30.48};
const straight=s=>[s,7010,0],line=formation.sample(straight,1000,105,slot);
assert.deepEqual(line.positionM,[700,7040.48,1000]);
assert(Math.abs(line.speedMps-105)<1e-7);assert.equal(line.coordinatedBankRad,0);
const R=7500,circle=s=>[R*Math.sin(s/R),7010,R*(1-Math.cos(s/R))];
for(const d of [-1500,-1000,0,1000,1500])for(const s of [0,1000,5000,10000]){
 const state=formation.sample(circle,s,105,{...slot,lateralM:d});
 const expectedSpeed=105*(1-d/R),expectedBank=Math.atan(expectedSpeed**2/((R-d)*9.80665));
 assert(Math.abs(state.speedMps-expectedSpeed)<1e-5,'Inner/outer slots require their own speed');
 assert(Math.abs(state.coordinatedBankRad-expectedBank)<1e-5,'Each slot banks for its own radius and speed');
 assert(state.forwardRate>0);
 assert.deepEqual(state,formation.sample(circle,s,105,{...slot,lateralM:d}),'Seek/replay has no frame history');
}
assert.throws(()=>formation.sample(circle,1000,105,{...slot,lateralM:9000}),RangeError,'Impossible inside slot must not fly backward');
assert.throws(()=>formation.sample(circle,1000,105,{alongM:0,lateralM:NaN,verticalM:0}));
console.log('PASS: metre-based straight/circular formation paths match independent analytic speed and bank cases; impossible inside slots rejected. Kinematics, not aircraft aerodynamic validation; not yet runtime-integrated.');
