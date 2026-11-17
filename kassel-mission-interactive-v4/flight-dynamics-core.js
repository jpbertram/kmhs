/* SI six-degree-of-freedom rigid-body core. Numerical verification is NOT
 * empirical B-24 aerodynamic validation. No fictional aircraft coefficients.
 * Not yet connected to the documentary timeline; the visualizer still uses
 * reconstructed paths until an aircraft model passes flight-data benchmarks.
 * Right handed body/world: +X forward, +Y up, +Z right. q=[x,y,z,w].
 */
(function(root,factory){var api=factory();if(typeof module==='object')module.exports=api;else root.KasselFlightDynamics=api;})(typeof window==='object'?window:globalThis,function(){'use strict';
 const add=(a,b)=>a.map((v,i)=>v+b[i]),scale=(a,k)=>a.map(v=>v*k),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>Math.hypot(...a);
 function unitQ(q){let n=norm(q);if(!n||!Number.isFinite(n))throw new Error('Invalid orientation');return scale(q,1/n);}
 function multiplyQ(a,b){return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];}
 function rotate(q,v){q=unitQ(q);let u=q.slice(0,3),uv=cross(u,v);return add(v,add(scale(uv,2*q[3]),scale(cross(u,uv),2)));}
 function matrixVector(a,v){return [dot(a[0],v),dot(a[1],v),dot(a[2],v)];}
 function inverse(a){let [r,s,t]=a,det=dot(r,cross(s,t));if(!(det>0))throw new Error('Positive-definite inertia required');let x=cross(s,t),y=cross(t,r),z=cross(r,s);return [[x[0],y[0],z[0]],[x[1],y[1],z[1]],[x[2],y[2],z[2]]].map(row=>scale(row,1/det));}
 function validateBody(body){if(!(body.massKg>0&&Number.isFinite(body.massKg)))throw new Error('Measured mass required');let I=body.inertiaKgM2;
  if(!Array.isArray(I)||I.length!==3||I.some(r=>r.length!==3||r.some(x=>!Number.isFinite(x))))throw new Error('Complete inertia tensor required');
  for(let j=0;j<3;j++)for(let k=0;k<3;k++)if(Math.abs(I[j][k]-I[k][j])>1e-8)throw new Error('Inertia must be symmetric');
  if(!(I[0][0]>0&&I[0][0]*I[1][1]-I[0][1]*I[1][0]>0))throw new Error('Inertia must be positive definite');inverse(I);
  /* Inertia must also correspond to a nonnegative mass distribution:
     C = (trace(I)/2)Identity - I is its second-moment matrix and must
     be positive semidefinite. Positive-definite I alone is insufficient
     (e.g. principal moments 100,1,1 violate the triangle inequalities).
     Normalize first so tolerances do not depend on tensor magnitude. */
  let magnitude=Math.max(...I.flat().map(Math.abs)),J=I.map(r=>r.map(x=>x/magnitude)),halfTrace=(J[0][0]+J[1][1]+J[2][2])/2;
  let C=J.map((r,j)=>r.map((x,k)=>(j===k?halfTrace:0)-x)),tol=1e-12;
  for(let j=0;j<3;j++)if(C[j][j]<-tol)throw new Error('Inertia cannot represent a physical mass distribution');
  for(let j=0;j<3;j++)for(let k=j+1;k<3;k++)if(C[j][j]*C[k][k]-C[j][k]*C[k][j]<-tol)throw new Error('Inertia cannot represent a physical mass distribution');
  if(dot(C[0],cross(C[1],C[2]))<-tol)throw new Error('Inertia cannot represent a physical mass distribution');
 }
 function pack(s){return s.positionM.concat(s.velocityMS,s.orientationXYZW,s.angularVelocityRadS);}
 function unpack(a){return {positionM:a.slice(0,3),velocityMS:a.slice(3,6),orientationXYZW:unitQ(a.slice(6,10)),angularVelocityRadS:a.slice(10,13)};}
 function derivative(t,a,body,invI,forces,gravity){let state=unpack(a),loads=forces(t,state),F=loads.forceBodyN,M=loads.momentBodyNm;
  if(!F||!M||F.length!==3||M.length!==3||F.concat(M).some(v=>!Number.isFinite(v)))throw new Error('Finite force and moment vectors required');
  let accel=add(scale(rotate(state.orientationXYZW,F),1/body.massKg),gravity),w=state.angularVelocityRadS;
  let wdot=matrixVector(invI,add(M,scale(cross(w,matrixVector(body.inertiaKgM2,w)),-1)));
  return state.velocityMS.concat(accel,scale(multiplyQ(a.slice(6,10),w.concat(0)),.5),wdot);
 }
 function step(state,t,dt,body,forces,options={}){validateBody(body);if(!(dt>0&&dt<=.1))throw new Error('Use fixed steps no larger than 0.1 seconds');if(typeof forces!=='function')throw new Error('Aircraft force model required; no default aerodynamic guesses');
  let gravity=options.gravityMS2||[0,-9.80665,0],a=pack(state);if(a.length!==13||a.some(v=>!Number.isFinite(v)))throw new Error('Invalid SI state');
  let invI=inverse(body.inertiaKgM2),k1=derivative(t,a,body,invI,forces,gravity),k2=derivative(t+dt/2,add(a,scale(k1,dt/2)),body,invI,forces,gravity),k3=derivative(t+dt/2,add(a,scale(k2,dt/2)),body,invI,forces,gravity),k4=derivative(t+dt,add(a,scale(k3,dt)),body,invI,forces,gravity);
  return unpack(a.map((v,i)=>v+dt/6*(k1[i]+2*k2[i]+2*k3[i]+k4[i])));
 }
 function integrate(state,duration,body,forces,options={}){let dt=options.fixedStepS||1/120;if(!(duration>=0&&Number.isFinite(duration)))throw new Error('Invalid duration');let t=0,s=state;while(t<duration-1e-12){let h=Math.min(dt,duration-t);s=step(s,t,h,body,forces,options);t+=h;}return s;}
 function kineticEnergy(state,body){let w=state.angularVelocityRadS;return .5*body.massKg*dot(state.velocityMS,state.velocityMS)+.5*dot(w,matrixVector(body.inertiaKgM2,w));}
 return {step,integrate,rotate,multiplyQ,kineticEnergy,validateBody,validationStatus:'Numerically verified rigid-body mechanics only; aircraft aerodynamic validation pending'};
});
