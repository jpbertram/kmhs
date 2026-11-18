'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/km3d-v3.js','utf8');
const start=source.indexOf('V2.loadImagery=function');
const code=source.slice(start,source.indexOf('/* DEM-derived normal map',start));
function setup(key){
 const ctx={V2:{},window:{KMSimulatorConfig:{esriApiKey:key}},encodeURIComponent,requests:[],
  fetchTileRect(zoom,url,tileCallback,atlasLayer){
   assert.equal(zoom,7);
   assert.equal(atlasLayer,undefined,'Esri imagery must come from the service');
   ctx.requests.push(url(zoom,65,42));
   return Promise.resolve({canvas:{width:256,height:256}});
  },document:{createElement:()=>({getContext:()=>({drawImage(){}})})}};
 vm.runInNewContext(code,ctx);return ctx;
}
(async()=>{
 const noKey=setup('');
 assert.equal(await noKey.V2.loadImagery(),null);
 assert.equal(noKey.requests.length,0);
 const dev=setup('example+key');
 await dev.V2.loadImagery();
 assert.deepEqual(dev.requests,['https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/7/42/65?token=example%2Bkey']);
 assert(dev.V2.texReady);
 console.log('PASS public imagery: no network without a key, documented Esri route with a key, no local imagery atlas');
})().catch(err=>{console.error(err);process.exitCode=1;});
