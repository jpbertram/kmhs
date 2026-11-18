(function(root){
 'use strict';
 // Clip the central fuselage from the selected aircraft's materials
 // only. Retain the aircraft's own wing and nacelle geometry in view.
 function attach(T,plane){
  const width=2.15;
  const clips=[new T.Plane(),new T.Plane()];
  const meshes=[];
  plane.traverse(mesh=>{
   if(!mesh.isMesh||!mesh.material)return;
   const original=mesh.material;
   function clipped(material){
    const clone=material.clone();
    clone.clippingPlanes=clips;clone.clipIntersection=true;
    return clone;
   }
   const replacement=Array.isArray(original)?original.map(clipped):clipped(original);
   meshes.push({mesh,original,replacement});
   mesh.material=replacement;
  });
  const normalMatrix=new T.Matrix3();
  const update=()=>{
   plane.updateWorldMatrix(true,false);
   normalMatrix.getNormalMatrix(plane.matrixWorld);
   clips[0].setComponents(0,0,1,-width).applyMatrix4(plane.matrixWorld,normalMatrix);
   clips[1].setComponents(0,0,-1,-width).applyMatrix4(plane.matrixWorld,normalMatrix);
  };
  update();
  return {update,dispose(){
   for(const entry of meshes){
    entry.mesh.material=entry.original;
    for(const material of [].concat(entry.replacement))material.dispose();
   }
  }};
 }
 const api={attach};root.KMCrewExterior=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
