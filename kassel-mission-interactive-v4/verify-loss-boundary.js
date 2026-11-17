'use strict';
const assert=require('node:assert/strict'),loss=require('./loss-trajectory');
for(const duration of [20,80,160]){
 const start={x:10,y:100,z:20},velocity={x:1.4,y:-.03,z:-.7};
 const v={startPos:start,ctrl:loss.momentumControl(start,velocity,duration),sitePos:{x:150,y:2,z:-30},fwd:{x:1,y:0,z:0},profile:{motion:'glide'},style:2,seed:1};
 const p=loss.sample(v,1e-8).position;
 for(const axis of ['x','y','z'])assert(Math.abs((p[axis]-start[axis])/(1e-8*duration)-velocity[axis])<1e-5,'Entry velocity preserved in each axis');
}
for(const style of [0,1,2,3]){
 const v={startPos:{x:0,y:100,z:0},ctrl:{x:45,y:93,z:0},sitePos:{x:150,y:2,z:0},fwd:{x:1,y:0,z:0},escapeAcross:{x:0,y:0,z:1},escapeAmt:15,escapeAlong:2,profile:{motion:'glide'},style,seed:1};
 assert.deepEqual(loss.sample(v,0).position,v.startPos);
 assert.equal(loss.sample(v,0).bank,0,'No instantaneous roll command at loss');
 const at=loss.sample(v,1).position;
 assert(Math.hypot(at.x-150,at.y-2,at.z)<1e-10);
 for(const eps of [1e-4,1e-6,1e-8]){
  const p=loss.sample(v,eps).position;
  assert(Math.abs(p.x/eps-90)<.1,'Forward derivative tends to Bezier launch momentum');
  assert(Math.abs(p.z/eps)<.1,'No singular lateral launch velocity');
 }
}
for(const motion of ['controlled_then_spin','wingless_roll']){
 const event=motion==='controlled_then_spin'?.76:.26;
 const v={startPos:{x:0,y:100,z:0},ctrl:{x:45,y:93,z:0},sitePos:{x:150,y:2,z:0},fwd:{x:1,y:0,z:0},profile:{motion,spinStart:.76,event:.26},style:motion==='controlled_then_spin'?2:3,seed:1};
 const a=loss.sample(v,event-1e-8),b=loss.sample(v,event+1e-8);
 assert(Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y,a.position.z-b.position.z)<1e-4,'No teleport at damage transition');
 assert(Math.abs(a.bank-b.bank)<1e-4,'No roll-angle snap at damage transition');
}
console.log('PASS: all four legacy styles start forward with bounded lateral velocity and end at their assigned site. This is path continuity, not aerodynamic or historical validation.');
