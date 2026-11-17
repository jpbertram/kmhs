const assert=require('node:assert/strict'),path=require('node:path'),{build,phase}=require('./propeller-assembly.js');
const T=require(path.resolve(process.argv[2]||'../tmp/three-r128.js'));
const material=new T.MeshStandardMaterial({opacity:1,transparent:false,depthWrite:true});
const origin=new T.Vector3(2,3,4),parts=[];
for(let i=0;i<3;i++){
 const angle=i*Math.PI*2/3,geo=new T.BoxGeometry(.2,2,.1);
 geo.rotateZ(angle);geo.translate(origin.x-Math.sin(angle),origin.y+Math.cos(angle),origin.z);
 parts.push({assembly:'shaft-1',name:'Propeller',anchor:origin,geo,mat:material});
}
const original=parts.map(p=>Array.from(p.geo.attributes.position.array));
const pivots=build(T,parts);assert.equal(pivots.length,1);assert.equal(pivots[0].children.length,3);
const pivot=pivots[0];assert(pivot.position.distanceTo(origin)<1e-12);pivot.updateMatrixWorld(true);
pivot.children.forEach((mesh,i)=>{
 assert.notEqual(mesh.material,material);assert.equal(mesh.material.transparent,false);assert.equal(mesh.material.opacity,1);assert.equal(mesh.material.depthWrite,true);
 const attr=mesh.geometry.attributes.position;
 for(let j=0;j<attr.count;j++){
  const restored=new T.Vector3().fromBufferAttribute(attr,j).applyMatrix4(mesh.matrixWorld);
  assert(restored.distanceTo(new T.Vector3().fromArray(original[i],j*3))<1e-6,'Assembly construction must preserve source positions');
 }
});
const vertex=new T.Vector3().fromBufferAttribute(pivot.children[0].geometry.attributes.position,0);
const radius=Math.hypot(vertex.x,vertex.y);pivot.rotation.z=Math.PI/2;pivot.updateMatrixWorld(true);
const rotated=vertex.clone().applyMatrix4(pivot.children[0].matrixWorld).sub(origin);
assert(Math.abs(Math.hypot(rotated.x,rotated.y)-radius)<1e-6,'Blade rotates about shared shaft');
assert.equal(material.transparent,false,'Shared aircraft material must not be mutated');
for(const axis of [new T.Vector3(1,0,0),new T.Vector3(1,2,3).normalize()]){
 const geometry=new T.BoxGeometry(.2,2,.1),saved=Array.from(geometry.attributes.position.array);
 const tilted=build(T,[{assembly:'tilted',name:'Propeller',anchor:new T.Vector3(),geo:geometry,mat:material,shaftDirection:axis}])[0];
 tilted.updateMatrixWorld(true);
 const attr=tilted.children[0].geometry.attributes.position;
 for(let i=0;i<attr.count;i++)assert(new T.Vector3().fromBufferAttribute(attr,i).applyMatrix4(tilted.matrixWorld).distanceTo(new T.Vector3().fromArray(saved,i*3))<1e-6,'Tilted pivot must preserve imported rest geometry');
 const before=new T.Vector3().fromBufferAttribute(attr,0).applyMatrix4(tilted.matrixWorld);
 tilted.rotation.z+=.8;tilted.updateMatrixWorld(true);
 const after=new T.Vector3().fromBufferAttribute(attr,0).applyMatrix4(tilted.matrixWorld);
 assert(Math.abs(before.dot(axis)-after.dot(axis))<1e-6,'Rotation must preserve distance along transformed shaft');
 assert(Math.abs(before.clone().cross(axis).length()-after.clone().cross(axis).length())<1e-6,'Rotation must preserve shaft radius');
}
const replayRoot=new T.Group(),imported=new T.Group(),procedural=new T.Group();
imported.userData.glbProp=true;imported.userData.spinAxis='z';imported.rotation.z=.37;
procedural.userData.isProp=true;procedural.rotation.y=-.21;
replayRoot.add(imported,procedural);
phase(replayRoot,4,21,33);
const pose=[imported.rotation.z,procedural.rotation.y];
phase(replayRoot,4,21,33);
assert.deepEqual([imported.rotation.z,procedural.rotation.y],pose,'Paused clock preserves propeller pose');
phase(replayRoot,9,21,33);phase(replayRoot,4,21,33);
assert.deepEqual([imported.rotation.z,procedural.rotation.y],pose,'Seeking backward restores exact propeller pose');
phase(replayRoot,0,21,33);
assert.equal(imported.rotation.z,.37);assert.equal(procedural.rotation.y,-.21);
console.log('PASS: shaft geometry, opaque material isolation, pause and rewind phase, and nonzero rest-angle preservation. Synthetic assembly test; imported asset pivots still need visual verification.');
