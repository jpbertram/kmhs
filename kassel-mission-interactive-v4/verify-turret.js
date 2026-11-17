// Usage: node verify-turret.js /absolute/path/to/three-r128.js
const assert=require('node:assert/strict'),path=require('node:path');
const T=require(path.resolve(process.argv[2]||'../tmp/three-r128.js'));
const turret=require('./ball-turret.js');
const built=turret.build(T),radius=.5*44*.0254*(33/20.47);
assert.equal(built.dimensions.diameterIn,44);assert.equal(built.dimensions.retractionIn,28);
assert(Math.abs(built.radiusScene-radius)<1e-10);
assert(Math.hypot(...built.eye)<radius,'Eyepoint must be within the measured ball');
assert(Math.abs(Math.hypot(...built.look)-1)<1e-10);
let meshes=0,vertices=0;
built.group.traverse(o=>{if(!o.isMesh)return;meshes++;const pos=o.geometry.attributes.position;vertices+=pos.count;for(const value of pos.array)assert(Number.isFinite(value));assert(o.material);});
built.group.updateMatrixWorld(true);
assert(meshes<=5,'Turret draw calls must stay material-batched');
const ray=new T.Raycaster(new T.Vector3().fromArray(built.eye),new T.Vector3().fromArray(built.look));
const hits=ray.intersectObjects(built.group.children,true).filter(h=>!h.object.material.transparent);
assert(hits.every(h=>h.distance>.035),'No opaque mesh may intersect the immediate eyepoint');
console.log(`PASS: measured 44-inch envelope, internal eye, finite geometry, clear immediate eyeline; ${meshes} meshes, ${vertices} vertices. Component outlines/eye placement remain estimated.`);
