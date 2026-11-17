(function(root){'use strict';
 const cache=new WeakMap();
 function fit(T,plane,spanM,metresPerSceneUnit){
  if(!plane.children.length)return null;
  const first=plane.children[0],old=cache.get(plane);
  if(!old||old.first!==first||old.count!==plane.children.length){
   const model=plane.clone();model.position.set(0,0,0);model.quaternion.identity();model.scale.set(1,1,1);model.updateMatrixWorld(true);
   const box=new T.Box3().setFromObject(model),nativeSpan=box.max.z-box.min.z;
   if(!(nativeSpan>0)||!Number.isFinite(nativeSpan))throw Error('Finite aircraft mesh bounds required');
   cache.set(plane,{first,count:plane.children.length,scale:spanM/nativeSpan/metresPerSceneUnit,nativeBounds:box.clone(),spanM});
  }
  plane.userData.mapGeometryScale=cache.get(plane).scale;
  plane.scale.setScalar(plane.userData.mapGeometryScale);
  return cache.get(plane);
 }
 function orientedBounds(T,plane){
  const fit=cache.get(plane);if(!fit)throw Error('Aircraft must be fitted before checking bounds');
  const centre=fit.nativeBounds.getCenter(new T.Vector3()).multiply(plane.scale).applyQuaternion(plane.quaternion).add(plane.position);
  const half=fit.nativeBounds.getSize(new T.Vector3()).multiply(plane.scale).multiplyScalar(.5);
  return {centre,half:[half.x,half.y,half.z],axes:[new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1)].map(a=>a.applyQuaternion(plane.quaternion))};
 }
 function intersects(a,b){
  const delta=b.centre.clone().sub(a.centre),axes=a.axes.concat(b.axes);
  for(const x of a.axes)for(const y of b.axes)axes.push(x.clone().cross(y));
  for(const axis of axes){if(axis.lengthSq()<1e-16)continue;axis.normalize();
   const extent=o=>o.axes.reduce((s,x,i)=>s+o.half[i]*Math.abs(x.dot(axis)),0);
   if(Math.abs(delta.dot(axis))>extent(a)+extent(b)+1e-10)return false;
  }
  return true;
 }
 function supportDepth(plane){const fit=cache.get(plane);return fit?Math.max(0,-fit.nativeBounds.min.y*plane.scale.y):0;}
 const api={fit,orientedBounds,intersects,supportDepth};root.KasselAircraftMapScale=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
