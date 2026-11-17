'use strict';
const fs=require('node:fs'),vm=require('node:vm'),make=require('./m1-runtime-fixture');
const runtime=make(),{ctx,T}=runtime,src=fs.readFileSync(__dirname+'/km3d-v3.js','utf8');
ctx.KasselAircraftMaterialGeometry=require('./aircraft-material-geometry');
const helpers=src.indexOf('function xformGeo('),builder=src.indexOf('KM._buildB24=function(){',helpers);
vm.runInContext(src.slice(helpers,builder),ctx);
for(const key of ['airframeMat','glassMat','darkMat','blurMat'])ctx.V2[key]=()=>new T.MeshBasicMaterial();
vm.runInContext(src.slice(builder,src.indexOf('/* Crew positions',builder)),ctx);
const template=ctx.KM._buildB24();
for(const p of runtime.planes)p.add(template.clone());
let overlaps=0,groundMisses=0,first;
for(let seed=1;seed<=20;seed++){
 runtime.reset();
 for(let s=seed/21*.1;s<300;s+=.5){
  const boxes=runtime.frame(s).filter(p=>p.visible).map(p=>({p,b:ctx.KasselAircraftMapScale.orientedBounds(T,p)}));
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
   const a=boxes[i],b=boxes[j];
   if(ctx.KasselAircraftMapScale.intersects(a.b,b.b)){overlaps++;first=first||{seconds:s,a:a.p.userData.planeData.pilot,b:b.p.userData.planeData.pilot};}
  }
 }
 runtime.frame(300);
 for(const p of runtime.planes)if(p.userData.v2.beh==='stay'){
  const b=new T.Box3().setFromObject(p);if(Math.abs(b.min.y-.6)>1e-6)groundMisses++;
 }
}
console.log(`${overlaps||groundMisses?'FAIL':'PASS'} M1 rendered bounds: runs=20 timeline=0..300 model=actual-procedural-B24 overlaps=${overlaps} groundMisses=${groundMisses} first=${JSON.stringify(first||null)}; imported models/fighters/DEM not covered`);
if(overlaps||groundMisses)process.exitCode=1;
