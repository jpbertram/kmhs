'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const T=require(path.resolve(process.argv[2]||'../tmp/three-r128.js')),attitude=require('./flight-attitude');
const src=fs.readFileSync(path.join(__dirname,'km3d-v3.js'),'utf8');
const start=src.indexOf('function updateAnchor('),end=src.indexOf('\n/* ---------- per-plane battle state',start),code=src.slice(start,end);
for(const mt of [.66,.74,.84,.9,.96]){
 const values=[];
 for(const prior of [0,.6,1])for(const dt of [0,1/60,.2]){
  const F=new T.CatmullRomCurve3([new T.Vector3(0,100,0),new T.Vector3(100,100,-10),new T.Vector3(200,90,100)]);
  const ctx={THREE:T,Math,isFinite,RETURN_START:.92,ELEV_SCALE:1,KasselFlightAttitude:attitude,GEO:{xToLon:x=>x/100,zToLat:z=>51-z/100},V2:{},fullArc:t=>t*F.getLength(),KM:{_curve:F,_full:F,_anchor:{_mt:prior,pos:new T.Vector3(),dir:new T.Vector3(1,0,0),heading:0,roll:0}}};
  vm.createContext(ctx);vm.runInContext(code+';updateAnchor('+mt+',0,'+dt+');',ctx);
  values.push({position:ctx.KM._anchor.pos.toArray(),direction:ctx.KM._anchor.dir.toArray()});
 }
 for(const value of values)assert.deepEqual(value,values[0],'Route position and heading independent of prior frames and update dt');
}
console.log('PASS: actual anchor position/direction reconstruct identically after seeks and across frame steps, including pause. Camera/roll settling and aerodynamic dynamics excluded.');
