const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const loss=require('./loss-trajectory.js'),attitude=require('./flight-attitude.js');
const T=require(path.resolve(process.argv[2]||'../tmp/three-r128.js'));
const code=fs.readFileSync(path.join(__dirname,'km3d-v3.js'),'utf8');
const profiles=vm.runInNewContext('('+code.match(/V2\.LOSS_PROFILES=([\s\S]*?);\n/)[1]+')');
let cases=0;
for(const profile of Object.values(profiles)){
 const motion=profile.motion,style=motion==='controlled_then_spin'?2:/spin/.test(motion)?0:/explosion|rammed/.test(motion)?1:/glide|landing|bailout|wing_fire/.test(motion)?2:3;
 const v={profile,style,seed:123,startPos:{x:20,y:115,z:30},ctrl:{x:70,y:90,z:55},sitePos:{x:110,y:8,z:80},fwd:{x:1,y:0,z:0},escapeAcross:{x:0,y:0,z:1},escapeAmt:12,escapeAlong:1};
 for(const u of [0,1]){
   const p=loss.sample(v,u).position,target=u?v.sitePos:v.startPos;
   assert(Math.hypot(p.x-target.x,p.y-target.y,p.z-target.z)<1e-6,'Preserve formation start and crash endpoint');
 }
 for(let i=1;i<1000;i++){
  const u=i/1000,p=loss.pose(v,u),mesh=new T.Object3D();
  assert(Object.values(p.position).every(Number.isFinite));
  attitude.apply(T,mesh,p.tangent,p.bank);
  const nose=new T.Vector3(1,0,0).applyQuaternion(mesh.quaternion);
  const tangent=new T.Vector3(p.tangent.x,p.tangent.y,p.tangent.z).normalize();
  assert(nose.dot(tangent)>1-1e-10,'Aircraft nose must follow complete authored loss tangent');
  assert.deepEqual(loss.pose(v,u),p,'Pose must not depend on previous frames');cases++;
 }
}
assert(code.includes('KasselLossTrajectory.sample(v,bu).position'),'Bailout launch must share aircraft path');
assert(code.includes('KasselFlightAttitude.apply(THREE,p,lossPose.tangent,lossPose.bank)'));
console.log(`PASS: ${cases} poses across ${Object.keys(profiles).length} loss profiles, endpoint constraints, tangent-aligned quaternion and deterministic sampling. Not aerodynamic validation or proof of documentary paths.`);
