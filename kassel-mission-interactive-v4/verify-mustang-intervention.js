const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const T=require(path.resolve(process.argv[2]||'../tmp/three-r128.js'));
const code=fs.readFileSync(path.join(__dirname,'km3d-v3.js'),'utf8');
const fighter=new T.Group(),mustang=new T.Group();fighter.userData.alive=true;
const shots=[];
const context={THREE:T,V2:{_frame:0},RETURN_START:.92,KM:{_anchor:{pos:new T.Vector3(0,115,0),dir:new T.Vector3(1,0,0)},_escorts:[mustang],_fighterWaves:[{models:[fighter]}],_playing:true},KasselFlightAttitude:require('./flight-attitude.js'),KasselFighterTargeting:require('./fighter-targeting.js'),fireTracer:(from,to,speed,german)=>shots.push({from:from.clone(),to:to.clone(),speed,german})};
vm.createContext(context);vm.runInContext(code.slice(code.indexOf('function updateEscorts('),code.indexOf('/* ═══════════ CAMERA',code.indexOf('function updateEscorts('))),context);
context.updateEscorts(299,.89,.016,0);assert.equal(mustang.visible,false);assert.equal(shots.length,0);
fighter.visible=false;context.updateEscorts(301,.90,.016,0);assert.equal(mustang.visible,true);assert.equal(shots.length,0);
const nose=new T.Vector3(1,0,0).applyQuaternion(mustang.quaternion);
fighter.position.copy(mustang.position).addScaledVector(nose,20);fighter.visible=true;
context.updateEscorts(301,.90,.016,0);assert.equal(shots.length,1);assert.equal(shots[0].german,false);
fighter.position.copy(mustang.position).addScaledVector(nose,-20);context.updateEscorts(301,.90,.016,0);assert.equal(shots.length,1,'No rearward fire');
fighter.position.copy(mustang.position).addScaledVector(nose,20);context.KM._playing=false;context.updateEscorts(301,.90,.016,0);assert.equal(shots.length,1,'Pause does not emit new fire');
context.KM._playing=true;context.updateEscorts(380,.91,.016,0);assert.equal(shots.length,1,'Return-cover phase does not keep firing');
for(const boundary of [348,370]){
 context.updateEscorts(boundary-.001,.91,.016,0);const before=mustang.position.clone();
 context.updateEscorts(boundary+.001,.91,.016,0);const after=mustang.position.clone();
 assert(after.distanceTo(before)<.01,'No stopped-pass or phase-boundary teleport');
 assert(after.x>before.x,'Intercept must keep moving forward');
}
context.updateEscorts(400,.95,.016,0);const late=mustang.position.clone();
context.updateEscorts(401,.95,.016,0);assert(mustang.position.x>late.x,'No frozen escort slot after intervention');
context.updateEscorts(330,.9,.016,0);const replay=mustang.position.clone();
context.updateEscorts(400,.95,.016,0);context.updateEscorts(330,.9,.016,0);
assert(mustang.position.distanceTo(replay)<1e-10,'Seek must reconstruct the same pass');
console.log('PASS: actual Mustang arrival gate, forward visible-German-only targeting, paused-fire gate, continuous moving pass at 348/370, late egress and deterministic seek. Not historical timing or aerodynamic validation.');
