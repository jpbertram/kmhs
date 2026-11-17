const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const T=require(path.resolve(process.argv[2]||'../tmp/three-r128.js'));
const f=new T.Group();f.userData={lat:7.5,alt:.25,stag:.8};
const ctx={THREE:T,KM:{_anchor:{pos:new T.Vector3(0,115,0),dir:new T.Vector3(1,0,0)},_fighterWaves:[{duration:54,models:[f]}],_playing:false,_fp:[]},V2:{_frame:0},waveTime:()=>40,KasselFlightAttitude:require('./flight-attitude.js'),KasselFighterTargeting:require('./fighter-targeting.js')};
const src=fs.readFileSync(path.join(__dirname,'km3d-v3.js'),'utf8');vm.createContext(ctx);
vm.runInContext(src.slice(src.indexOf('function fighterPassCoordinate('),src.indexOf('/* ---------- American fighters',src.indexOf('function updateFighters('))),ctx);
function sample(ph,elapsed){ctx.updateFighters(40+54*ph,.016,elapsed,null);return f.position.clone();}
for(let i=1;i<999;i++){
 const ph=i/1000;if(Math.abs(ph-.7)<.002||Math.abs(ph-.88)<.002)continue;
 const before=sample(ph-1e-6,0),after=sample(ph+1e-6,200);
 const tangent=after.sub(before).normalize();sample(ph,900);
 const nose=new T.Vector3(1,0,0).applyQuaternion(f.quaternion);
 assert(nose.dot(tangent)>.999999,'Nose must follow complete perturbed path');
 const replay=sample(ph,0);assert(replay.distanceTo(sample(ph,10000))<1e-10,'Pause/seek must not change path with elapsed wall time');
}
for(const boundary of [.7,.88]){
 assert(sample(boundary-1e-7,0).distanceTo(sample(boundary+1e-7,100))<.001,'Continuous segment position');
 for(const values of [[-68,38,50,80],[0,0,12,22],[1.2,-.8,-4.8,-6.8]]){
  const left=ctx.fighterPassCoordinate(boundary-1e-8,values),right=ctx.fighterPassCoordinate(boundary+1e-8,values);
  assert(Math.abs(left.derivative-right.derivative)<.001,'Continuous segment velocity');
  for(let i=0;i<=1000;i++){
   const p=ctx.fighterPassCoordinate(i/1000,values);
   assert(Number.isFinite(p.derivative));
   assert(p.value>=Math.min(...values)-1e-9&&p.value<=Math.max(...values)+1e-9,'No coordinate overshoot');
  }
 }
}
console.log('PASS: actual German-wave function, full-path nose/tangent alignment, deterministic seek, continuous position/velocity at breaks and monotone coordinate bounds. Illustrative path, not aerodynamic validation.');
