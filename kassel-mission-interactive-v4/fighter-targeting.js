(function(root){
 'use strict';
 // Rendering guard for fixed forward guns, not validated ballistics.
 function select(position,nose,targets,minRange,maxRange,halfAngleRad){
  var norm=Math.hypot(nose.x,nose.y,nose.z);if(!(norm>0))return null;
  var threshold=Math.cos(halfAngleRad),best=null,bestDot=-1,bestRange=Infinity;
  targets.forEach(function(target){
   if(!target.visible||target.userData.alive===false)return;
   var dx=target.position.x-position.x,dy=target.position.y-position.y,dz=target.position.z-position.z;
   var range=Math.hypot(dx,dy,dz);if(range<minRange||range>maxRange)return;
   var cosine=(dx*nose.x+dy*nose.y+dz*nose.z)/(range*norm);
   if(cosine<threshold)return;
   if(cosine>bestDot||(cosine===bestDot&&range<bestRange)){best=target;bestDot=cosine;bestRange=range;}
  });return best;
 }
 root.KasselFighterTargeting={select:select};
 if(typeof module!=='undefined')module.exports=root.KasselFighterTargeting;
})(typeof window!=='undefined'?window:globalThis);
