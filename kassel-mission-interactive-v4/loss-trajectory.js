(function(root){
 'use strict';
 /* Existing documentary loss paths, in legacy scene units. This unifies
    positions and tangents; it is not an aerodynamic force model. */
 function sample(v,u){
  u=Math.max(0,Math.min(1,u));
  var s=v.sitePos||{x:v.startPos.x,y:2,z:v.startPos.z};
  // Linear Bezier parameter preserves a finite forward launch derivative.
  // u^1.1 previously suppressed that momentum at the exact loss boundary.
  var e=u,a=(1-e)*(1-e),b=2*(1-e)*e,c=e*e;
  var motion=v.profile.motion||'',spin=(v.style===0?2.2:v.style===1?1:v.style===3?1.6:.12)*Math.PI*u*2;
  if(motion==='flat_spin')spin=5.5*Math.PI*u*2;
  var eventStart=v.profile.event||0,eventProgress=Math.max(0,u-eventStart);
  // Integrate a rising roll phase from the event instead of replacing
  // it with an unrelated absolute angle at wing separation.
  if(motion==='wingless_roll')spin+=7.5*Math.PI*eventProgress*eventProgress/(Math.max(.01,1-eventStart))*2;
  var spinStart=v.profile.spinStart==null?.76:v.profile.spinStart;
  var delayedSpin=motion==='controlled_then_spin'&&u>=spinStart;
  var transition=Math.max(0,Math.min(1,(u-spinStart)/.04));
  var spinBlend=delayedSpin?transition*transition*(3-2*transition):0;
  if(delayedSpin)spin=4.2*Math.PI*(u-spinStart)/(1-spinStart)*2;
  var envelope=Math.pow(Math.sin(u*Math.PI),2);
  var rad=envelope*(v.style===0?9:v.style===3?4:0);
  if(delayedSpin)rad=Math.pow(Math.sin(Math.min(1,(u-spinStart)*4)*Math.PI),2)*4.5*envelope;
  // The former sin(pi*u)^.42 offset had an unbounded launch/impact
  // derivative, visibly whipping aircraft sideways out of formation.
  var hump=u===0||u===1?0:envelope;
  var escape=v.escapeAcross||{x:-v.fwd.z,y:0,z:v.fwd.x};
  var amount=v.escapeAmt||12,along=v.escapeAlong||0;
  var p={x:v.startPos.x*a+v.ctrl.x*b+s.x*c+Math.cos(spin)*rad+escape.x*amount*hump+v.fwd.x*along*hump,
   y:v.startPos.y*a+v.ctrl.y*b+s.y*c,
   z:v.startPos.z*a+v.ctrl.z*b+s.z*c+Math.sin(spin)*rad+escape.z*amount*hump+v.fwd.z*along*hump};
  if(v.style===2)p.y+=Math.sin(u*7+v.seed)*.22*envelope*(1-spinBlend);
  var launch=Math.min(1,u/.08),launchBlend=launch*launch*(3-2*launch);
  var bank=v.style===2?(.06+Math.sin(u*8+v.seed)*.035)*launchBlend:v.style===3?u*u*9:spin*.5;
  if(delayedSpin)bank=bank*(1-spinBlend)+spin*.52*spinBlend;
  if(motion==='wingless_roll'){
   var rollRamp=Math.min(1,eventProgress/.04),rollBlend=rollRamp*rollRamp*(3-2*rollRamp);
   bank=bank*(1-rollBlend)+u*u*24*rollBlend;
  }
  if(v.forwardRoute){
    var forward=root.KasselForwardEndpointRoute.sample(v.forwardRoute,u);
    p=forward.position;
    if(v.style===2&&motion!=='controlled_then_spin')bank=forward.bank;
    else bank+=(v.forwardRoute.initialBank||0)*Math.max(0,1-u*v.forwardRoute.length/200);
  }
  return {position:p,bank:bank};
 }
 function pose(v,u){
  var out=sample(v,u),lo=Math.max(0,u-.00001),hi=Math.min(1,u+.00001);
  var a=sample(v,lo).position,b=sample(v,hi).position;
  out.tangent={x:(b.x-a.x)/(hi-lo),y:(b.y-a.y)/(hi-lo),z:(b.z-a.z)/(hi-lo)};
  return out;
 }
 function momentumControl(start,velocity,duration){
  if(!Number.isFinite(duration)||duration<=0)throw Error('Positive loss duration required');
  return {x:start.x+velocity.x*duration/2,y:start.y+velocity.y*duration/2,z:start.z+velocity.z*duration/2};
 }
 root.KasselLossTrajectory={sample:sample,pose:pose,momentumControl:momentumControl};
 if(typeof module!=='undefined')module.exports=root.KasselLossTrajectory;
})(typeof window!=='undefined'?window:globalThis);
