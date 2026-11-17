(function(root){
 'use strict';
 function build(T,parts){
  var groups=new Map();parts.forEach(function(p){var list=groups.get(p.assembly)||[];list.push(p);groups.set(p.assembly,list);});
  var out=[];
  groups.forEach(function(list){
   var anchor=list.find(function(p){return p.anchor;});
   var center=anchor?anchor.anchor.clone():new T.Vector3();
   if(!anchor){var bounds=new T.Box3();list.forEach(function(p){p.geo.computeBoundingBox();bounds.union(p.geo.boundingBox);});bounds.getCenter(center);}
   var pivot=new T.Group();pivot.position.copy(center);pivot.name='animated-propeller-'+list[0].name;
   var shaft=list[0].shaftDirection||new T.Vector3(0,0,1);
   if(![shaft.x,shaft.y,shaft.z].every(Number.isFinite)||shaft.lengthSq()<1e-12)throw new Error('Finite nonzero propeller shaft direction required');
   pivot.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),shaft.clone().normalize());
   var unorient=new T.Matrix4().makeRotationFromQuaternion(pivot.quaternion.clone().conjugate());
   pivot.userData={glbProp:true,spinAxis:'z',pivotBasis:anchor?'named source assembly origin':'aggregate geometry bounds estimate'};
   list.forEach(function(p){
    var geo=p.geo;geo.translate(-center.x,-center.y,-center.z);
    geo.applyMatrix4(unorient);
    var mat=Array.isArray(p.mat)?p.mat.map(function(m){return m.clone();}):p.mat.clone();
    (Array.isArray(mat)?mat:[mat]).forEach(function(m){if(m.map)m.map.encoding=T.sRGBEncoding;});
    pivot.add(new T.Mesh(geo,mat));
   });out.push(pivot);
  });return out;
 }
 function phase(root,seconds,proceduralRate,importedRate){
  if(![seconds,proceduralRate,importedRate].every(Number.isFinite)||seconds<0)throw Error('Finite nonnegative propeller clock required');
  root.traverse(function(o){
   var u=o.userData;if(!u||(!u.glbProp&&!u.isProp))return;
   var axis=u.glbProp?(u.spinAxis||'z'):'y',rate=u.glbProp?importedRate:proceduralRate;
   if(u.propRestAngle===undefined)u.propRestAngle=o.rotation[axis];
   o.rotation[axis]=u.propRestAngle+(seconds*rate)%(Math.PI*2);
  });
 }
 root.KasselPropellerAssembly={build:build,phase:phase};
 if(typeof module!=='undefined')module.exports=root.KasselPropellerAssembly;
})(typeof window!=='undefined'?window:globalThis);
