(function(root){
 'use strict';
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 function vector(v){if(!Array.isArray(v)||v.length!==3||!v.every(Number.isFinite))throw new TypeError('Finite three-component SI vector required');}
 function loads(input){
  const {velocityBodyMS:v,angularVelocityBodyRadS:w,densityKgM3:rho,areaM2:S,spanM:b,chordM:c,referenceFromCGM:r,coefficients}=input;
  [v,w,r].forEach(vector);
  if(!Number.isFinite(rho)||rho<0||![S,b,c].every(x=>Number.isFinite(x)&&x>0)||typeof coefficients!=='function')throw new TypeError('Density, measured reference geometry and coefficient function required');
  const speed=Math.hypot(...v),q=.5*rho*speed*speed;
  if(speed<1e-9)return {forceBodyN:[0,0,0],momentBodyNm:[0,0,0],dynamicPressurePa:q,speedMS:speed};
  const alpha=Math.atan2(-v[1],v[0]),beta=Math.asin(Math.max(-1,Math.min(1,v[2]/speed)));
  const direction=v.map(x=>x/speed),lift=[Math.sin(alpha),Math.cos(alpha),0],side=cross(direction,lift);
  const context={speedMS:speed,alphaRad:alpha,betaRad:beta,dynamicPressurePa:q,
   rollRateX:w[0]*b/(2*speed),yawRateY:w[1]*b/(2*speed),pitchRateZ:w[2]*c/(2*speed)};
  const k=coefficients(context);
  const keys=['CL','CD','CY','CrollX','CyawY','CpitchZ'];
  if(!k||!keys.every(key=>Number.isFinite(k[key]))||k.CD<0)throw new TypeError('Complete finite aerodynamic coefficients and nonnegative drag required');
  const force=direction.map((x,i)=>q*S*(-k.CD*x+k.CL*lift[i]+k.CY*side[i]));
  const shift=cross(r,force),moment=[q*S*b*k.CrollX,q*S*b*k.CyawY,q*S*c*k.CpitchZ].map((x,i)=>x+shift[i]);
  return {forceBodyN:force,momentBodyNm:moment,dynamicPressurePa:q,speedMS:speed,alphaRad:alpha,betaRad:beta,aerodynamicPowerW:dot(force,v)};
 }
 function forceCallback(physics,geometry,environment,coefficients,otherLoads){
  if(!physics||typeof physics.rotate!=='function'||![environment,coefficients,otherLoads].every(f=>typeof f==='function'))throw new TypeError('Rotation, environment, coefficients and explicit propulsion/other-load callback required');
  return function(t,state){
   const env=environment(t,state);vector(env.windWorldMS);
   const airWorld=state.velocityMS.map((v,i)=>v-env.windWorldMS[i]),q=state.orientationXYZW;
   const velocityBodyMS=physics.rotate([-q[0],-q[1],-q[2],q[3]],airWorld);
   const aerodynamic=loads({...geometry,velocityBodyMS,angularVelocityBodyRadS:state.angularVelocityRadS,densityKgM3:env.densityKgM3,coefficients:c=>coefficients(c,t,state,env)});
   const other=otherLoads(t,state,env);vector(other.forceBodyN);vector(other.momentBodyNm);
   return {forceBodyN:aerodynamic.forceBodyN.map((v,i)=>v+other.forceBodyN[i]),momentBodyNm:aerodynamic.momentBodyNm.map((v,i)=>v+other.momentBodyNm[i])};
  };
 }
 const api={loads,forceCallback,axes:'Right-handed +X forward, +Y up, +Z right. Moments use positive right-hand rotations about named BODY axes; do not insert conventional yaw/pitch coefficients without conversion.',status:'Force transform infrastructure only; no aircraft coefficients supplied or validated'};
 root.KasselAerodynamicLoads=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
