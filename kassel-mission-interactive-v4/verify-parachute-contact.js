const assert=require('node:assert/strict');
const contact=require('./parachute-contact.js');
const launch={x:0,y:100,z:0},speed=2.5,feet=-1.05;
for(const terrain of [()=>10,(x,z)=>10+z*2,(x,z)=>20+Math.sin(z*.2)*8]){
  const hit=contact.solve(launch,speed,.7,feet,terrain);
  assert(hit.time>0);
  assert(Math.abs(hit.position.y+feet-terrain(hit.position.x,hit.position.z))<1e-8);
  const previous=contact.trajectory(launch,speed,.7,hit.time-.001);
  assert(previous.y+feet>terrain(previous.x,previous.z));
  for(const age of [hit.time+1,hit.time+10,200]){
    const p=age>=hit.time?hit.position:contact.trajectory(launch,speed,.7,age);
    assert.deepEqual(p,hit.position,'Touchdown cannot continue drifting');
  }
  const repeat=contact.solve(launch,speed,.7,feet,terrain);
  assert.deepEqual(repeat,hit,'Rewinding/replaying must reproduce contact');
}
const flat=contact.solve(launch,speed,0,feet,()=>10);
const rising=contact.solve(launch,speed,0,feet,(x,z)=>10+z*2);
assert(rising.time<flat.time,'Rising ground must intercept descent earlier');
assert(rising.position.y>flat.position.y);
assert.throws(()=>contact.solve(launch,0,0,feet,()=>10));
assert.throws(()=>contact.solve(launch,speed,0,feet,()=>NaN));
const momentum={x:8,z:-3},epsilon=1e-6;
assert.deepEqual(contact.trajectory(launch,speed,0,0,momentum),launch,'Momentum must not teleport the launch');
const carried=contact.trajectory(launch,speed,0,epsilon,momentum),base=contact.trajectory(launch,speed,0,epsilon);
assert(Math.abs((carried.x-base.x)/epsilon-momentum.x)<1e-5);
assert(Math.abs((carried.z-base.z)/epsilon-momentum.z)<1e-5);
const carriedHit=contact.solve(launch,speed,0,feet,(x,z)=>10+x*.1,momentum);
assert(Math.abs(carriedHit.position.y+feet-(10+carriedHit.position.x*.1))<1e-8);
assert.deepEqual(carriedHit,contact.solve(launch,speed,0,feet,(x,z)=>10+x*.1,momentum));
console.log('PASS: flat/rising/undulating terrain contact, foot offset, fixed touchdown and deterministic replay. Illustrative scene trajectory, not aerodynamic validation.');
