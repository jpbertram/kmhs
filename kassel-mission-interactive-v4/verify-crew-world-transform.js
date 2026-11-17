'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const T=require(path.resolve(process.argv[2]||'../tmp/three-r128.js'));
const src=fs.readFileSync(path.join(__dirname,'km3d-v3.js'),'utf8');
const begin=src.indexOf('var off=new THREE.Vector3(crewDef.offset.x'),end=src.indexOf('var d0=',begin);
assert(begin>=0&&end>begin);const code=src.slice(begin,end);
for(const scale of [[.6,.6,.6],[.5,.8,1.2]]){
 const parent=new T.Group(),plane=new T.Group(),camera=new T.PerspectiveCamera();
 parent.position.set(10,20,30);parent.rotation.set(.2,.6,.1);parent.add(plane);
 plane.position.set(3,4,5);plane.rotation.set(.4,1.2,.3);plane.scale.fromArray(scale);
 const crewDef={offset:{x:8,y:2,z:-1}},context={THREE:T,plane,camera,crewDef};
 vm.runInNewContext(code,context);
 const expected=new T.Vector3(8,2,-1).applyMatrix4(plane.matrixWorld);
 assert(camera.position.distanceTo(expected)<1e-10,'Crew eyepoint respects full aircraft world transform');
 const rotation=plane.getWorldQuaternion(new T.Quaternion());
 assert(Math.abs(rotation.dot(context.crewWorldRotation))>1-1e-10);
}
console.log('PASS: actual crew camera placement respects uniform/nonuniform scale and parent translation/rotation. Tests coordinate transforms, not historical station accuracy.');
