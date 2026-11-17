/* Metre-based formation path kinematics. This is not an aerodynamic
   force model and does not certify historical formation spacing. */
(function(root,factory){var api=factory();if(typeof module==='object')module.exports=api;else root.KasselFormationKinematics=api;})(typeof window==='object'?window:globalThis,function(){'use strict';
 function finite(v){return Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);}
 function position(path,s,slot){
  var p=path(s+slot.alongM),a=path(s+slot.alongM-.1),b=path(s+slot.alongM+.1);
  if(!finite(p)||!finite(a)||!finite(b))throw Error('Path must supply finite metre coordinates');
  var dx=b[0]-a[0],dz=b[2]-a[2],n=Math.hypot(dx,dz);
  if(n<1e-9)throw Error('Horizontal path tangent is undefined');
  return {point:[p[0]-dz/n*slot.lateralM,p[1]+slot.verticalM,p[2]+dx/n*slot.lateralM],forward:[dx/n,0,dz/n]};
 }
 function sample(path,arcM,leadSpeedMps,slot){
  if(typeof path!=='function'||!Number.isFinite(arcM)||!(leadSpeedMps>0)||!Number.isFinite(leadSpeedMps)||!slot||![slot.alongM,slot.lateralM,slot.verticalM].every(Number.isFinite))throw Error('Explicit metre-based path, spacing and positive speed required');
  var h=5,a=position(path,arcM-h,slot),b=position(path,arcM,slot),c=position(path,arcM+h,slot);
  var derivative=c.point.map(function(v,i){return (v-a.point[i])/(2*h);});
  var forwardRate=derivative.reduce(function(s,v,i){return s+v*b.forward[i];},0);
  if(forwardRate<=0)throw RangeError('Formation slot exceeds inside turn radius: no forward-flight solution');
  var velocity=derivative.map(function(v){return v*leadSpeedMps;});
  var dx1=b.point[0]-a.point[0],dz1=b.point[2]-a.point[2],dx2=c.point[0]-b.point[0],dz2=c.point[2]-b.point[2];
  var den=Math.hypot(dx1,dz1)*Math.hypot(dx2,dz2)*Math.hypot(dx1+dx2,dz1+dz2);
  var curvature=den>1e-12?2*(dx1*dz2-dz1*dx2)/den:0;
  var horizontalSpeed=Math.hypot(velocity[0],velocity[2]);
  return {positionM:b.point,velocityMps:velocity,speedMps:Math.hypot.apply(Math,velocity),forwardRate:forwardRate,
   coordinatedBankRad:Math.atan(horizontalSpeed*horizontalSpeed*curvature/9.80665)};
 }
 return {sample:sample,status:'SI kinematics only; renderer integration and aircraft aerodynamic validation remain required'};
});
