'use strict';
// Exercise the actual mission's placement function, not the turn demonstration.
const fs=require('node:fs'),vm=require('node:vm'),T=require('../tmp/three-r128.js');
const src=fs.readFileSync(__dirname+'/km3d-v3.js','utf8');
const ctx={V2:{},Math,RETURN_START:.92,THREE:T,ELEV_SCALE:(115/7010)*1.55,KasselAircraftMapScale:require('./aircraft-map-scale'),KasselFormationKinematics:require('./formation-kinematics.js')};vm.createContext(ctx);
for(const name of ['V2.routeGeo','V2.returnGeo','V2.routeEventGeo','V2.ROSTER']){
 const tail=src.slice(src.indexOf(name+'=[')),end=/^\]\s*;?/m.exec(tail);vm.runInContext(tail.slice(0,end.index+end[0].length),ctx);
}
const gs=src.indexOf('var GEO=(function()');vm.runInContext(src.slice(gs,src.indexOf('V2.GEO=GEO;',gs)),ctx);
const rs=src.indexOf('var REL_OFFS=');vm.runInContext(src.slice(rs,src.indexOf('KM._buildFormation=',rs)),ctx);
const points=ctx.V2.routeGeo.concat(ctx.V2.returnGeo.slice(1)).map(g=>new T.Vector3(ctx.GEO.lonToX(g[0]),g[2],ctx.GEO.latToZ(g[1])));
ctx.KM={_full:new T.CatmullRomCurve3(points,false,'centripetal')};
const arc=src.indexOf('function fullArc(mt){');vm.runInContext(src.slice(arc,src.indexOf('\nvar hash=',arc)),ctx);
const begin=src.indexOf('  function formPos(out,atMission){');vm.runInContext(src.slice(begin,src.indexOf('\n  var beh=v.beh',begin)),ctx);
const offsets=ctx.V2.ROSTER.map(r=>{const q=ctx.SQ_BOX[r.sq],o=ctx.REL_OFFS[r.rel];return {r,off:{x:q[0]+o[0],y:q[1]+o[1],z:q[2]+o[2]}};});
Object.assign(ctx,{ret:0,spread:1,straggle:0,jit:1,ph:0,elapsed:0,_cx:offsets.reduce((s,e)=>s+e.off.x,0)/35,hash:()=>0,across:new T.Vector3(0,0,1),a:{pos:new T.Vector3(0,123,0)},GEO:ctx.GEO});
ctx.landingEnvelope=mt=>{const u=Math.max(0,Math.min(1,(mt-.975)/.025));return u*u*(3-2*u);};
let backwards=0,headingJumps=0,minDot=1,samples=0;
for(let seed=1;seed<=20;seed++)for(const entry of offsets){
 ctx.off=entry.off;ctx.p={userData:{planeData:entry.r}};let lastHeading;
 // Seeds change sample phase, not historical facts or casualty outcomes.
 for(let i=1;i<2000;i++){
  const mt=(i+(seed/21)*.25)/2001,h=.000001,a=new T.Vector3(),b=new T.Vector3();
  ctx.formPos(a,mt-h);ctx.formPos(b,mt+h);
  const heading=ctx.p.userData._lh,delta=b.sub(a);delta.y=0;
  const dot=delta.normalize().dot(new T.Vector3(-Math.sin(heading),0,-Math.cos(heading)));minDot=Math.min(minDot,dot);
  if(dot<0)backwards++;
  if(lastHeading!==undefined&&Math.abs(Math.atan2(Math.sin(heading-lastHeading),Math.cos(heading-lastHeading)))>.15)headingJumps++;
  lastHeading=heading;samples++;
 }
}
const mx=111195*Math.cos(51.4*Math.PI/180)*(ctx.GEO.xToLon(1)-ctx.GEO.xToLon(0)),mz=111195*(ctx.GEO.zToLat(0)-ctx.GEO.zToLat(1));
let minimumSeparationM=Infinity;
for(let seed=1;seed<=20;seed++)for(let i=1;i<200;i++){
 const mt=(i+seed/21*.25)/201,positions=offsets.map(entry=>{
  ctx.off=entry.off;ctx.p={userData:{planeData:entry.r}};const q=new T.Vector3();ctx.formPos(q,mt);return [q.x*mx,q.y*7010/115,q.z*mz];
 });
 for(let a=0;a<35;a++)for(let b=a+1;b<35;b++)minimumSeparationM=Math.min(minimumSeparationM,Math.hypot(...positions[a].map((v,k)=>v-positions[b][k])));
}
const separationFailed=minimumSeparationM<110*.3048*.5;
console.log(`${backwards||headingJumps||separationFailed?'FAIL':'PASS'} M1 formation-only: runs=20 aircraft=35 samples=${samples} backwards=${backwards} headingJumps=${headingJumps} minimumForwardDot=${minDot.toFixed(6)} minimumSeparationM=${minimumSeparationM.toFixed(3)}; loss/departure gates NOT covered`);
if(backwards||headingJumps||separationFailed)process.exitCode=1;
