(function(root,factory){if(typeof module==='object')module.exports=factory(require('./turn-parameters.js'));else root.KasselCoordinatedTurn=factory(root.KasselTurnParameters);})(typeof window==='object'?window:globalThis,function(D){'use strict';
const P=Object.fromEntries(Object.entries(D.values).map(([k,v])=>[k,v.value]));
function create(options={}){
 const seed=options.seed||1,sign=options.direction===-1?-1:1,V=P.leadSpeedMps;
 const maxZ=Math.max(...D.roster.map(r=>Math.abs(r.offsetM[2]))),maxRadius=Math.max(...D.roster.map(r=>Math.hypot(r.offsetM[0],r.offsetM[2])));
 const requested=Math.abs(options.turnRateRadS===undefined?P.nominalTurnRateRadS:options.turnRateRadS);
 if(!Number.isFinite(requested)||requested<=0)throw Error('Finite positive turn rate required');
 // Governor acts on the leader's commanded turn, not by stopping or
 // reversing followers. Triangle bounds protect every body's slot.
 const rate=Math.min(requested,P.maximumTurnRateRadS/2,(V-P.stallSpeedMps*P.stallReserve)/maxRadius,(P.maximumSpeedMps-V)/maxRadius,P.gravityMps2*Math.tan(P.maximumBankRad)/P.maximumSpeedMps);
 const angle=P.nominalTurnAngleRad,ramp=P.rampDurationS,hold=Math.max(0,angle/rate-ramp),durationS=hold+2*ramp;
 const initialHeading=((seed*16807%2147483647)/2147483647)*Math.PI*2-Math.PI;
 function control(t){t=Math.max(0,Math.min(durationS,t));let w,wd,wdd,integral;
  if(t<ramp){w=.5*(1-Math.cos(Math.PI*t/ramp));wd=.5*Math.PI/ramp*Math.sin(Math.PI*t/ramp);wdd=.5*(Math.PI/ramp)**2*Math.cos(Math.PI*t/ramp);integral=.5*(t-ramp/Math.PI*Math.sin(Math.PI*t/ramp));}
  else if(t<ramp+hold){w=1;wd=0;wdd=0;integral=ramp/2+t-ramp;}
  else{const u=t-ramp-hold;w=.5*(1+Math.cos(Math.PI*u/ramp));wd=-.5*Math.PI/ramp*Math.sin(Math.PI*u/ramp);wdd=-.5*(Math.PI/ramp)**2*Math.cos(Math.PI*u/ramp);integral=ramp/2+hold+.5*(u+ramp/Math.PI*Math.sin(Math.PI*u/ramp));}
  return {heading:initialHeading+sign*rate*integral,omega:sign*rate*w,alpha:sign*rate*wd,jerk:sign*rate*wdd};
 }
 const dt=P.integrationStepS,positions=[[0,P.altitudeM,0]];
 for(let i=1;i<=Math.ceil(durationS/dt);i++){const theta=control((i-.5)*dt).heading,last=positions[i-1];positions.push([last[0]+Math.cos(theta)*V*dt,P.altitudeM,last[2]+Math.sin(theta)*V*dt]);}
 function sample(t){t=Math.max(0,Math.min(durationS,t));const ctl=control(t),c=Math.cos(ctl.heading),s=Math.sin(ctl.heading),index=Math.floor(t/dt),f=t/dt-index,a=positions[index],b=positions[Math.min(index+1,positions.length-1)];
  const leader=a.map((x,i)=>x+(b[i]-x)*f),w=ctl.omega,wd=ctl.alpha,k=V/P.gravityMps2,den=1+(k*w)**2;
  const leaderBank=Math.atan(k*w),bd=k*wd/den,bdd=k*ctl.jerk/den-2*k**3*w*wd**2/den**2,cb=Math.cos(leaderBank),sb=Math.sin(leaderBank);
  const aircraft=D.roster.map(r=>{
   // Positive coordinated bank lowers the +Z/right wing, matching
   // flight-attitude.js. Full body-frame slot transform, not yaw only.
   const [x,y,z]=r.offsetM,Y=cb*y-sb*z,Z=cb*z+sb*y,Zd=Y*bd,Yd=-Z*bd,Zdd=Y*bdd-Z*bd*bd;
   const u=V-w*Z,v=w*x+Zd;
   const positionM=[leader[0]+c*x-s*Z,leader[1]+Y,leader[2]+s*x+c*Z];
   const velocityMps=[c*u-s*v,Yd,s*u+c*v],ax=-w*w*x-wd*Z-2*w*Zd,az=V*w-w*w*Z+wd*x+Zdd;
   const headingRate=(u*az-v*ax)/(u*u+v*v),speedMps=Math.hypot(u,v,Yd),bankRad=Math.atan(Math.hypot(u,v)*headingRate/P.gravityMps2);
   if(u<P.stallSpeedMps||speedMps>P.maximumSpeedMps||Math.abs(Yd)>P.maximumClimbMps||Math.abs(headingRate)>P.maximumTurnRateRadS||Math.abs(bankRad)>P.maximumBankRad)throw Error('Flight-envelope invariant failed for '+r.name);
   return {name:r.name,box:r.box,positionM,velocityMps,headingRad:ctl.heading+Math.atan2(v,u),speedMps,bankRad,headingRateRadS:headingRate,slotErrorM:0};
  });return {leaderM:leader,headingRad:ctl.heading,leaderBankRad:leaderBank,aircraft};
 }
 return {sample,durationS,commandedTurnRateRadS:rate,seed};
}
return {create,status:'Visual/kinematic reconstruction, no aerodynamic validation'};
});
