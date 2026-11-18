(function(root){'use strict';
 const cache=new WeakMap();
 function fit(T,plane,spanM,metresPerSceneUnit){
  const children=plane.children.filter(child=>!child.userData.rebuiltInterior&&!child.userData.inspectionInterior);
  if(!children.length)return null;
  const first=children[0],old=cache.get(plane);
  if(!old||old.first!==first||old.count!==children.length){
   const model=plane.clone(false);
   children.forEach(child=>model.add(child.clone()));
   model.position.set(0,0,0);model.quaternion.identity();model.scale.set(1,1,1);model.updateMatrixWorld(true);
   const box=new T.Box3().setFromObject(model),nativeSpan=box.max.z-box.min.z;
   if(!(nativeSpan>0)||!Number.isFinite(nativeSpan))throw Error('Finite aircraft mesh bounds required');
   cache.set(plane,{first,count:children.length,scale:spanM/nativeSpan/metresPerSceneUnit,nativeBounds:box.clone(),spanM});
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
 function clearTerrain(T,plane,groundAt){
  if(!groundAt||!cache.has(plane))return;
  const bounds=orientedBounds(T,plane);
  const extent=axis=>bounds.half.reduce((sum,half,i)=>sum+half*Math.abs(bounds.axes[i][axis]),0);
  const {x,y,z}=bounds.centre;
  const halfX=extent('x'),halfZ=extent('z');
  let floor=groundAt(x,z)??-Infinity;
  for(const dx of [-halfX,halfX])for(const dz of [-halfZ,halfZ]){
   const ground=groundAt(x+dx,z+dz);
   if(ground!==undefined)floor=Math.max(floor,ground);
  }
  const gap=y-extent('y')-floor;
  const blend=.005;
  if(gap<=-blend)plane.position.y-=gap;
  else if(gap<blend)plane.position.y+=(gap-blend)**2/(4*blend);
 }
 const api={fit,orientedBounds,intersects,supportDepth,clearTerrain};root.KasselAircraftMapScale=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
