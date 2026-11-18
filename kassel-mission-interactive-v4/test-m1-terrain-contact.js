'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const T=require('../tmp/three-r128.js');
const src=fs.readFileSync(__dirname+'/km3d-v3.js','utf8');
const start=src.indexOf('function terrainSurfaceHeight(');
assert(start>=0,'Mesh surface sampler is missing');
const ctx={};vm.runInNewContext(src.slice(start,src.indexOf('V2.buildTerrainMesh=function',start)),ctx);
const geo=new T.PlaneGeometry(8,6,4,3);geo.rotateX(-Math.PI/2);
for(let i=0;i<geo.attributes.position.count;i++)geo.attributes.position.setY(i,Math.cos(i*1.73)*4);
const mesh=new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide}));
for(let i=0;i<128;i++){
 const x=Math.sin(i*37)*3.999,z=Math.sin(i*53)*2.999;
 const [hit]=new T.Raycaster(new T.Vector3(x,30,z),new T.Vector3(0,-1,0)).intersectObject(mesh);
 assert(Math.abs(hit.point.y-ctx.terrainSurfaceHeight(geo,x,z))<1e-6);
}
assert.equal(ctx.terrainSurfaceHeight(geo,5,0),undefined);
console.log('PASS rendered terrain contact sampler: 128 triangle ray intersections match the height query');
