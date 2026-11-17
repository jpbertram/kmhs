const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'km3d-v3.js'),'utf8');
const start=src.indexOf('function crewHandoffLens('),end=src.indexOf('(function(){',start),ctx={Math};
vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
for(const fov of [30,50,68,80]){
 const first=ctx.crewHandoffLens(0,fov),last=ctx.crewHandoffLens(1.5,fov);
 assert.equal(first.near,.01);assert.equal(first.fov,fov);assert.equal(last.near,1);assert.equal(last.fov,50);
 let previous=first;
 for(let i=1;i<=1500;i++){
  const lens=ctx.crewHandoffLens(i/1000,fov);
  assert(lens.near>=previous.near&&lens.near<=1);
  assert(Math.abs(lens.fov-previous.fov)<.04,'No lens discontinuity');previous=lens;
 }
 assert.equal(ctx.crewHandoffLens(10,fov).fov,50);
}
assert(src.includes('startFov=camera.fov'),'Capture the current crew lens before changing views');
assert(src.includes('c._handoffStartFov=startFov;camera.fov=startFov'),'Restore captured lens after view hook');
console.log('PASS: crew-loss lens endpoints, continuous interpolation from user-adjusted FOV, near-plane bounds and runtime capture/restore wiring. Visual pull-out remains unverified.');
