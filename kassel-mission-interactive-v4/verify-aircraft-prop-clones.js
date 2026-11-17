'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const T=require(path.resolve(process.argv[2]||'../tmp/three-r128.js')),src=fs.readFileSync(path.join(__dirname,'km3d-v3.js'),'utf8');
const holder=new T.Group();for(let i=0;i<4;i++){const pivot=new T.Group();pivot.userData={glbProp:true,spinAxis:'z'};holder.add(pivot);}
const context={THREE:T,V2:{templates:{b24lo:holder},_pendingPlanes:[]}};vm.createContext(context);
for(const [start,end] of [['V2.makeAircraft=function','\nKM._buildB24=function'],['V2.spinGlbProps=function','\n/* ═══════════════════ BATTLE ENGINE']]){
 const a=src.indexOf(start),b=src.indexOf(end,a);assert(a>=0&&b>a);vm.runInContext(src.slice(a,b),context);
}
const planes=Array.from({length:35},()=>context.V2.makeAircraft('b24lo',()=>{throw Error('Unexpected fallback');}));
for(const plane of planes)assert.notEqual(plane.children[0].children[0],holder.children[0]);
context.V2.spinGlbProps(planes[0],.5);
assert.equal(holder.children[0].rotation.z,0,'Template must not spin with clone');
assert(Math.abs(planes[1].children[0].children[0].rotation.z)===0,'Neighbor propeller must remain independent');
assert.equal(planes[0].children[0].children[0].rotation.z,.5);
for(const plane of planes)context.V2.spinGlbProps(plane,.3);
for(let i=0;i<planes.length;i++)for(const prop of planes[i].children[0].children)assert(Math.abs(prop.rotation.z-(i===0?.8:.3))<1e-12);
console.log('PASS: actual aircraft clone/spin functions independently animate four shafts on each of 35 clones without mutating template or neighbors. Synthetic template; not imported-mesh visual verification.');
