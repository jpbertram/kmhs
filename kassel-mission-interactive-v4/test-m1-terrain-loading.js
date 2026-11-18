'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/km3d-v3.js','utf8');
const start=source.indexOf('  V2.loadDEM().then(function(){displace()');
const end=source.indexOf('  return mesh;',start);
assert(start>=0 && end>start);
async function run(elevationOK,imageryOK){
  const calls=[];
  const load=ok=>ok?Promise.resolve():Promise.reject(new Error('Injected tile error'));
  vm.runInNewContext(source.slice(start,end),{
    V2:{loadDEM:()=>load(elevationOK),loadImagery:()=>imageryOK?Promise.resolve({}):load(false)},
    displace:()=>calls.push('elevation'),texture:()=>calls.push('imagery'),
    fallback:()=>calls.push('fallback'),console:{warn(){}}
  });
  await new Promise(resolve=>setImmediate(resolve));
  return calls;
}
(async()=>{
  assert.deepEqual(await run(true,false),['elevation']);
  assert.deepEqual(await run(false,true),['fallback']);
  assert.deepEqual(await run(true,true),['elevation','imagery']);
  console.log('PASS terrain loading: failed imagery retains DEM geometry and failed DEM uses fallback');
})().catch(error=>{console.error(error);process.exitCode=1;});
