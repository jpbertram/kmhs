'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const T=require(path.resolve(process.argv[2]||'../tmp/three-r128.js'));
const src=fs.readFileSync(path.join(__dirname,'km3d-v3.js'),'utf8');
const start=src.indexOf('  function formPos(out,atMission){'),end=src.indexOf('\n  var beh=v.beh',start);
assert(start>=0&&end>start);
const code=src.slice(start,end);
for(const mission of [.85,.90,.94]){
 const origins=[];
 for(const ret of [0,.5,1]){
  const curve=new T.LineCurve3(new T.Vector3(0,100,0),new T.Vector3(1000,90,0));curve.__len=curve.getLength();
  const ctx={THREE:T,Math,RETURN_START:.92,ret,spread:1+ret*.55,straggle:ret*.7,jit:1,ph:2,elapsed:99,off:{x:12,y:4,z:7},_cx:2,p:{userData:{planeData:{rel:2}}},hash:()=>70,across:new T.Vector3(0,0,1),a:{pos:new T.Vector3(0,100,0)},KM:{_full:curve},fullArc:mt=>mt*curve.__len};
  Object.assign(ctx,{V2:{},GEO:{xToLon:x=>x/100,zToLat:z=>-z/100},KasselFormationKinematics:require('./formation-kinematics.js')});
  ctx.landingEnvelope=mt=>{const u=Math.max(0,Math.min(1,(mt-.975)/.025));return u*u*(3-2*u);};
  vm.createContext(ctx);vm.runInContext(code+';var result=new THREE.Vector3();formPos(result,'+mission+');',ctx);
  origins.push(ctx.result.toArray());
 }
 for(const origin of origins)assert.deepEqual(origin,origins[0],'Historical placement independent of present return spacing');
}
console.log('PASS: actual formation sampler reconstructs battle/return positions independently of present-day return spread and straggle. Numerical determinism only.');
assert(src.includes('p.position.copy(_tgt);p.userData._fpInit=true;'),'Active formation position must not interpolate from previous frame');
