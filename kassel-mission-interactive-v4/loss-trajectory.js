(function(root){
 'use strict';
 /* Existing documentary loss paths, in legacy scene units. This unifies
    positions and tangents; it is not an aerodynamic force model. */
 /* A stricken B-24 did not tip straight over. The accounts describe the
    hit, fire taking hold and the ship sliding back and out of the box
    before it fell off on a wing into its dive or spin. ONSET is the share
    of the fall spent in that first stage: altitude barely changes, ground
    speed drops below the formation's, and rolls and spins wait for it to
    end. Shares are ESTIMATED from the order of events in the accounts,
    not timed. Ships flown to a controlled bailout hold height longest. */
 var ONSET={burning_glide:.16,wing_fire:.14,controlled_bailout:.24,controlled_then_spin:.12,
  flat_spin:.12,tumble:.08,breakup:.13,explosion:.12,rammed:.13,rammed_tail:.12,
  wing_explosion:.1,wingless_roll:.12,belly_landing:0};
 function onsetOf(v){
  var motion=(v.profile&&v.profile.motion)||'',on=v.profile&&v.profile.onset!=null?v.profile.onset:(ONSET[motion]!=null?ONSET[motion]:.12);
  // a documented break-up or explosion comes after the ship has started to fall away
  if(v.profile&&v.profile.event!=null)on=Math.min(on,v.profile.event*.75);
  return Math.max(0,Math.min(.4,on));
 }
 // horizontal progress: about 80% of cruise speed while falling back, then
 // picking up speed in the dive; normalised so the crash site is unchanged
 // Ground speed starts at the formation's (no jump at the hit), eases to
 // 80% while the ship falls back, then rises in the dive to whatever keeps
 // the arrival time unchanged. Tabulated per onset share.
 var smoothU=function(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 function shape(x,on,fast){
  var slow=.8,r=Math.min(.15,1-on);
  if(x<=on)return 1+(slow-1)*smoothU(x/Math.max(.001,on*.5));
  return slow+(fast-slow)*smoothU((x-on)/Math.max(.001,r));
 }
 var _fast={};
 function fastFor(on){
  if(_fast[on])return _fast[on];
  function integral(F){var n=2000,sum=0;for(var i=0;i<n;i++)sum+=shape((i+.5)/n,on,F)/n;return sum;}
  var A=integral(0),B=integral(1)-A;return _fast[on]=(1-A)/B;
 }
 function speedAt(x,on){return shape(x,on,fastFor(on));}
 function groundProgress(u,on,v){
  if(on<=0)return u;
  var n=400,tab=v&&v._groundTable&&v._groundTable.on===on?v._groundTable.f:null;
  if(!tab){
   tab=new Float64Array(n+1);
   for(var i=1;i<=n;i++){var x0=(i-1)/n,x1=i/n;tab[i]=tab[i-1]+(speedAt(x0,on)+4*speedAt((x0+x1)/2,on)+speedAt(x1,on))/(6*n);}
   for(var k=1;k<=n;k++)tab[k]/=tab[n];
   if(v)v._groundTable={on:on,f:tab};
  }
  var pos=u*n,i0=Math.min(n-1,Math.floor(pos)),t=pos-i0;
  // Hermite on the tabulated integral keeps speed continuous between cells
  var m0=speedAt(i0/n,on)/n,m1=speedAt((i0+1)/n,on)/n;
  var h00=2*t*t*t-3*t*t+1,h10=t*t*t-2*t*t+t,h01=-2*t*t*t+3*t*t,h11=t*t*t-t*t;
  return h00*tab[i0]+h10*m0+h01*tab[i0+1]+h11*m1;
 }
 // altitude progress: about 3% of the height lost in the onset
 // Altitude progress: same rate as before at the hit, easing to about 10%
 // of the route's descent parameter by the end of the onset (roughly 3%
 // of the height), then the steeper remainder; same value at u=1.
 function altitudeProgress(u,on){
  if(on<=0)return u;
  var K=.9/(1-on);
  if(u>=on)return .1+K*(u-on);
  var t=u/on,h10=t*t*t-2*t*t+t,h01=-2*t*t*t+3*t*t,h11=t*t*t-t*t;
  return h10*on+h01*.1+h11*on*K;
 }
 function sample(v,u){
  u=Math.max(0,Math.min(1,u));
  var on=onsetOf(v),uo=on>0?Math.max(0,(u-on)/(1-on)):u;
  var s=v.sitePos||{x:v.startPos.x,y:2,z:v.startPos.z};
  // Linear Bezier parameter preserves a finite forward launch derivative.
  // u^1.1 previously suppressed that momentum at the exact loss boundary.
  var e=u,a=(1-e)*(1-e),b=2*(1-e)*e,c=e*e;
  var motion=v.profile.motion||'',spin=(v.style===0?2.2:v.style===1?1:v.style===3?1.6:.12)*Math.PI*uo*uo*2;
  if(motion==='flat_spin')spin=5.5*Math.PI*uo*uo*2;
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
    var forward=root.KasselForwardEndpointRoute.sample(v.forwardRoute,groundProgress(u,on,v),altitudeProgress(u,on));
    p=forward.position;
    if(v.style===2&&motion!=='controlled_then_spin')bank=forward.bank;
    else bank+=(v.forwardRoute.initialBank||0)*Math.max(0,1-u*v.forwardRoute.length/200);
    // falling off on a wing as the onset ends (toward the escape side)
    if(on>0&&motion!=='belly_landing'&&motion!=='controlled_bailout'){
     var off=Math.max(0,Math.min(1,(u-on*.7)/(on*.6+.02))),side=v.escapeAcross&&v.fwd?
      Math.sign(v.escapeAcross.x*-v.fwd.z+v.escapeAcross.z*v.fwd.x)||1:1;
     bank+=side*(v.style===2?.38:.55)*off*off*(3-2*off);
    }
  }
  return {position:p,bank:bank};
 }
 /* Drawn heights are about six times ground distances; the nose follows
    the path flattened by up to 2.5, phased in over the onset so it
    matches the formation's attitude at the moment of the hit. */
 function attitudeTangent(v,u,t){
  var on=Math.max(.04,onsetOf(v)),w=smoothU(u/on),k=1+1.5*w;
  return {x:t.x,y:t.y/k,z:t.z};
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
 root.KasselLossTrajectory={sample:sample,pose:pose,momentumControl:momentumControl,onsetOf:onsetOf,attitudeTangent:attitudeTangent};
 if(typeof module!=='undefined')module.exports=root.KasselLossTrajectory;
})(typeof window!=='undefined'?window:globalThis);
