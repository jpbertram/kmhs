(function(root){'use strict';
 // ESTIMATED geometric reconstruction: forward circular arc followed by
 // its tangent to the endpoint. Not a documented maneuver or force model.
 const tau=2*Math.PI,mod=a=>(a%tau+tau)%tau;
 function build(start,velocity,target,scale,radiusM){
  const sx=start.x*scale.x,sz=start.z*scale.z,tx=target.x*scale.x,tz=target.z*scale.z;
  const heading=Math.atan2(velocity.z*scale.z,velocity.x*scale.x),candidates=[];
  for(const sign of [-1,1]){
   const cx=sx-sign*Math.sin(heading)*radiusM,cz=sz+sign*Math.cos(heading)*radiusM;
   const dx=tx-cx,dz=tz-cz,d=Math.hypot(dx,dz);if(d<radiusM)continue;
   const phi=Math.atan2(dz,dx),eta0=heading-sign*Math.PI/2;
   for(const side of [-1,1]){
    const eta=phi+side*Math.acos(Math.min(1,radiusM/d)),px=cx+radiusM*Math.cos(eta),pz=cz+radiusM*Math.sin(eta);
    const fx=-sign*Math.sin(eta),fz=sign*Math.cos(eta);
    if((tx-px)*fx+(tz-pz)*fz<-1e-6)continue;
    const arc=mod(sign*(eta-eta0))*radiusM,line=Math.hypot(tx-px,tz-pz);
    candidates.push({cx,cz,sign,eta0,eta,px,pz,fx,fz,arc,line,length:arc+line});
   }
  }
  if(!candidates.length)throw Error('No forward tangent endpoint route');
  candidates.sort((a,b)=>a.length-b.length);const route=candidates[0];
  return {...route,start:{...start},target:{...target},scale:{...scale},radiusM,
   initialAltitudeDerivative:velocity.y/Math.max(1e-9,Math.hypot(velocity.x*scale.x,velocity.z*scale.z)),initialBank:0,
   classification:'ESTIMATED',reason:'Bounded-curvature forward geometric approach; endpoint preserved, path not documentary evidence'};
 }
 function samplePosition(route,u){
  u=Math.max(0,Math.min(1,u));const s=u*route.length,arc=s<route.arc;
  const eta=route.eta0+route.sign*Math.min(s,route.arc)/route.radiusM;
  const x=arc?route.cx+route.radiusM*Math.cos(eta):route.px+route.fx*(s-route.arc);
  const z=arc?route.cz+route.radiusM*Math.sin(eta):route.pz+route.fz*(s-route.arc);
  const fx=arc?-route.sign*Math.sin(eta):route.fx,fz=arc?route.sign*Math.cos(eta):route.fz;
  const e=u*u*(3-2*u),dy=route.target.y-route.start.y;
  const dy0=route.initialAltitudeDerivative*route.length;
  let y=route.start.y+dy*e+dy0*(u*u*u-2*u*u+u);
  if(route.terrainHeight){
   const ground=route.terrainHeight(x/route.scale.x,z/route.scale.z);
   if(ground!==undefined){
    // Blend across the ground constraint smoothly. Fade the blend at
    // the endpoint so it meets the chosen elevation without extra lift.
    const band=Math.min(.25,(1-u)*route.length*.001);
    const gap=y-ground;
    if(gap<=-band)y=ground;
    else if(gap<band)y=ground+(gap+band)**2/(4*band);
   }
  }
  // Smooth visual roll at launch and arc/straight handoff; geometric yaw
  // remains tangent-continuous. Roll timing is estimated, not validated.
  const ramp=Math.min(1,s/200,Math.max(0,(route.arc-s)/200));
  return {position:{x:x/route.scale.x,y,z:z/route.scale.z},
   tangent:{x:fx/route.scale.x,y:(6*u*(1-u)*dy+dy0*(3*u*u-4*u+1))/route.length,z:fz/route.scale.z},
   bank:(arc?route.sign*Math.atan(105**2/(9.80665*route.radiusM))*ramp:0)+route.initialBank*Math.max(0,1-s/200)};
 }
 function sample(route,u){
  const result=samplePosition(route,u);
  if(route.terrainHeight){
   const left=Math.max(0,u-.00001),right=Math.min(1,u+.00001);
   if(right>left){
    const rise=samplePosition(route,right).position.y-samplePosition(route,left).position.y;
    result.tangent.y=rise/((right-left)*route.length);
   }
  }
  return result;
 }
 const api={build,sample};root.KasselForwardEndpointRoute=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
