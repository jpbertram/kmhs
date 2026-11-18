'use strict';
const assert=require('node:assert/strict');
const THREE=require('../tmp/three-r128.js');
const {attach}=require('./crew-exterior.js');
const plane=new THREE.Group();
const shared=new THREE.MeshStandardMaterial();
const mesh=new THREE.Mesh(new THREE.BoxGeometry(6,2,10),shared);
plane.add(mesh);
const view=attach(THREE,plane);
assert.notEqual(mesh.material,shared);
assert.equal(shared.clippingPlanes,null);
assert(mesh.material.clipIntersection);
const planes=mesh.material.clippingPlanes;
function hidden(x,y,z){
 const point=plane.localToWorld(new THREE.Vector3(x,y,z));
 return planes.every(clip=>clip.distanceToPoint(point)<0);
}
for(const pose of [[0,0,0],[12,-5,28]]){
 plane.position.fromArray(pose);plane.rotation.set(.23,.7,-.4);
 plane.scale.set(.1,.13,.16);view.update();
 assert(hidden(0,0,0));
 assert(!hidden(0,0,4));
 assert(!hidden(0,0,-4));
}
view.dispose();assert.equal(mesh.material,shared);
console.log('PASS crew exterior: fuselage mask follows aircraft pose, retains both wings, and restores shared materials');
