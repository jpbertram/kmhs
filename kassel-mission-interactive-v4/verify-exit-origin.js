'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const T=require(path.resolve(process.argv[2]||'../tmp/three-r128.js'));
const src=fs.readFileSync(path.join(__dirname,'km3d-v3.js'),'utf8');
const section=src.slice(src.indexOf('}else{ /* exits */'));
const begin=section.indexOf('var exitMission='),end=section.indexOf('var tgt=',begin);
assert(begin>=0&&end>begin,'Exit initialization must be available');
const code=section.slice(begin,end);
for(const ft of [0,50,120,300]){
 const origins=[];
 for(const current of [.86,.91,.96,1]){
  const ctx={THREE:T,v:{},ft,BATTLE_START:.84,BATTLE_SPAN:420,BATTLE_FRAC:.08,formPos(out,at){out.set((at===undefined?current:at)*100,100,0);}};
  vm.runInNewContext(code,ctx);origins.push(ctx.v.startPos.toArray());
 }
 for(const origin of origins)assert.deepEqual(origin,origins[0],'Seeking must not change departure origin');
}
console.log('PASS: actual exit initialization uses the fixed departure cue across forward seeks. Does not certify departure geography or landing dynamics.');
