const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync(__dirname+'/km3d-v3.js','utf8');
const context={V2:{dem:{zoom:7,y0:40,canvas:{width:3,height:3},data:new Uint8ClampedArray(36)}},Math};
const result={data:new Uint8ClampedArray(36)};
context.document={createElement:()=>({getContext:()=>({createImageData:()=>result,putImageData(){}})})};
for(let i=0;i<9;i++){context.V2.dem.data[i*4]=128;context.V2.dem.data[i*4+1]=(i%3)*50;}
vm.runInNewContext(code.slice(code.indexOf('function tile2lat'),code.indexOf('function lon2tile'))+code.slice(code.indexOf('V2.buildNormalMap=function'),code.indexOf('/* ───────────────────── ATMOSPHERE')),context);
context.V2.buildNormalMap();
assert(result.data[16]>112 && result.data[16]<128,'50 metres of rise per DEM pixel should give a shallow west-facing normal');
console.log('PASS terrain normal uses geographic sample spacing');
