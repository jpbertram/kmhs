const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const T=require(path.resolve(process.argv[2]||'../tmp/three-r128.js'));
// Canvas drawing is stubbed; geometry, batching and cameras use real Three.
const ctx=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const context={window:{},document:{createElement:()=>({width:0,height:0,getContext:()=>ctx})}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'interior-rebuild.js'),'utf8'),context);
for(const station of ['waistL','waistR']){
 const built=context.window.KasselInterior.build(T,station),cal=built.group.userData.eyeCalibration;
 const eye=built.seats[station].offset;
 const actualM=(eye.y-cal.waistFloorTop)*cal.metresPerModelUnit;
 assert(Math.abs(actualM-1.651)<1e-9);
 assert(actualM>=cal.standingRangeM[0]&&actualM<=cal.standingRangeM[1]);
 assert(eye.y<2.1,'Eyepoint must fit within estimated cabin ceiling');
 assert(eye.y>.45,'Standing viewpoint must not remain at old crouched height');
 built.group.traverse(o=>{if(o.isMesh)for(const value of o.geometry.attributes.position.array)assert(Number.isFinite(value));});
}
console.log('PASS: both waist-station eye heights are 1.651 m above modeled floor, within declared reference range, below ceiling, with finite batched geometry. Not exact crew stature or factory geometry certification.');
