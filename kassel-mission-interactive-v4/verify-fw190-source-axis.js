const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const T=require(path.resolve(process.argv[2]||'../tmp/three-r128.js'));
const file=path.resolve(process.argv[3]||'tmp/fw190-source.glb'),b=fs.readFileSync(file);
assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);
assert.equal(b.readUInt32LE(16),0x4e4f534a);
const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
const world=new Map();
function walk(index,parent){
 const n=j.nodes[index],local=new T.Matrix4();
 if(n.matrix)local.fromArray(n.matrix);
 else local.compose(new T.Vector3().fromArray(n.translation||[0,0,0]),new T.Quaternion().fromArray(n.rotation||[0,0,0,1]),new T.Vector3().fromArray(n.scale||[1,1,1]));
 const m=parent.clone().multiply(local);world.set(index,m);
 (n.children||[]).forEach(child=>walk(child,m));
}
(j.scenes[j.scene||0].nodes||[]).forEach(i=>walk(i,new T.Matrix4()));
function center(name){
 const i=j.nodes.findIndex(n=>n.name===name);assert(i>=0,'Expected source landmark '+name);
 const n=j.nodes[i],bounds=new T.Box3();
 for(const p of j.meshes[n.mesh].primitives){
  const a=j.accessors[p.attributes.POSITION];assert(a.min&&a.max,'Position bounds required');
  bounds.union(new T.Box3(new T.Vector3().fromArray(a.min),new T.Vector3().fromArray(a.max)));
 }
 return bounds.getCenter(new T.Vector3()).applyMatrix4(world.get(i));
}
const nose=center('Cylinder18-FACES'),tail=center('Line02-FACES');
assert(nose.z>tail.z,'Source landmarks must still identify native +Z nose');
const source=fs.readFileSync(path.join(__dirname,'km3d-v3.js'),'utf8'),ctx={V2:{},Math};
vm.createContext(ctx);const start=source.indexOf('V2.MODEL_CFG=');
vm.runInContext(source.slice(start,source.indexOf('V2.DETAIL_URL=',start)),ctx);
const cfg=ctx.V2.MODEL_CFG.fw190,rotation=new T.Euler(0,cfg.forceRotY,cfg.pitch,'XYZ');
// Runtime Group.rotation uses XYZ Euler order, including its pitch offset.
const forward=nose.clone().sub(tail).normalize().applyEuler(rotation);
assert(forward.x>.95,'Actual source nose must face simulation +X, not tail-first');
console.log('PASS: downloaded FW190 GLB hierarchy, actual prop/tail mesh bounds and current configured rotation map the source nose to +X. Not visual or aerodynamic certification.');
