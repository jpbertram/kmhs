'use strict';
const assert=require('node:assert/strict'),route=require('./forward-endpoint-route');
let cases=0;
for(let i=0;i<360;i++){
 const a=i*Math.PI/180,s={x:0,y:100,z:0},v={x:1,y:0,z:0},goal={x:5000*Math.cos(a),y:2,z:5000*Math.sin(a)};
 const r=route.build(s,v,goal,{x:1,y:1,z:1},2500),start=route.sample(r,0),end=route.sample(r,1);
 assert(Math.hypot(start.position.x,start.position.z)<1e-8);assert(start.tangent.x>0.999999);
 assert(Math.hypot(end.position.x-goal.x,end.position.z-goal.z)<1e-7);
 for(let j=1;j<1000;j++){const u=j/1000,h=1e-6,b=route.sample(r,u),lo=route.sample(r,u-h),hi=route.sample(r,u+h);
  const dx=hi.position.x-lo.position.x,dz=hi.position.z-lo.position.z;assert(dx*b.tangent.x+dz*b.tangent.z>0);cases++;
 }
}
console.log(`PASS forward endpoint geometry: ${cases} samples, 360 endpoint bearings, exact endpoints, forward launch and tangent-aligned motion; ESTIMATED routes, not aerodynamics`);
const ridgeRoute=route.build({x:0,y:120,z:0},{x:1,y:0,z:0},{x:5000,y:5,z:0},{x:1,y:1,z:1},2500);
ridgeRoute.terrainHeight=x=>5+130*Math.max(0,1-((x-3300)/650)**2)**2;
const overRidge=route.sample(ridgeRoute,.66);
assert(overRidge.position.y>=ridgeRoute.terrainHeight(overRidge.position.x));
assert.equal(route.sample(ridgeRoute,1).position.y,5);
console.log('PASS endpoint path altitude clears a ridge and preserves terminal elevation');
