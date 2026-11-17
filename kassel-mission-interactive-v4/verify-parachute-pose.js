const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const pose=require('./parachute-pose.js').pose,T=require(path.resolve(process.argv[2]||'../tmp/three-r128.js'));
const context={window:{},THREE:T};vm.createContext(context);for(const f of ['airman-anatomy.js','historical-geometry.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'parachute-geometry.js'),'utf8'),context);
context.KasselParachuteGeometry=context.window.KasselParachuteGeometry;
context.KasselParachuteContact=require('./parachute-contact.js');
const man=context.window.KasselHistoricalGeometry.airman(T);let meshes=0;
man.traverse(o=>{if(!o.isMesh)return;meshes++;for(const v of o.geometry.attributes.position.array)assert(Number.isFinite(v));});
assert(meshes<=5,'Airman must remain material-batched, not dozens of draw calls');
const before=new T.Box3().setFromObject(man).getSize(new T.Vector3());
for(let age=0;age<150;age+=.1){for(const landed of [0,.25,1,2.5,20]){const p=pose(age,landed,-5.26);assert.equal(p.bodyScale,1);assert(p.rigScaleY>=.12-1e-10&&p.rigScaleY<=1);assert(Number.isFinite(p.rigOffsetY));if(!landed)assert(Math.abs(p.rigOffsetY-3.68*p.rigScaleY+3.68)<1e-10,'Riser anchor remains fixed during opening');}}
const after=new T.Box3().setFromObject(man).getSize(new T.Vector3());assert(before.distanceTo(after)<1e-12);
const runtime=fs.readFileSync(path.join(__dirname,'km3d-v3.js'),'utf8');new vm.Script(runtime);
assert(runtime.includes("rig:g.getObjectByName('parachute-canopy-rig')"));assert(runtime.includes('ground:gy-.2*feetY'));
assert(!runtime.includes('ch.sp.scale.y=0.2*Math.max'));assert(!runtime.includes('ch.sp.scale.y=Math.max(0.15'));
assert.throws(()=>pose(-1,0,-5));assert.throws(()=>pose(1,NaN,-5));
assert.equal(pose(.4,0,-5,.65).rigVisible,false,'Delayed canopy remains packed');
assert.equal(pose(.65,0,-5,.65).rigVisible,true);
assert.equal(pose(1.45,0,-5,.65).rigScaleY,1);
assert.equal(pose(.4,0,-5,.65).rigVisible,false,'Rewind restores packed canopy');
assert.throws(()=>pose(1,0,-5,-1));
// Execute the actual mission template/spawn/update functions, not a duplicate
// implementation. Flat measured terrain here isolates the contact invariant.
Object.assign(context,{V2:{_chutes:[],demReady:true,elevAt:()=>50},KM:{_battleT:0,_missionT:.85},ELEV_SCALE:.35,RETURN_START:.92,KMMissionTimeline:require('./mission-timeline.js'),KasselParachutePose:{pose},hash:()=>100});
const section=runtime.slice(runtime.indexOf('function chuteTemplate(){'),runtime.indexOf('function clearChutes(){'));
vm.runInContext(section,context);
const scene=new T.Scene();context.spawnChute(scene,new T.Vector3(0,100,0),{n:'Test airman'},{pilot:'Test aircraft'},0,0);
const chute=context.V2._chutes[0],airman=chute.sp.getObjectByName('parachuting-airman');
const attackPlayback=context.KMMissionTimeline.playbackAtBattleCue(0);
for(const age of [0,.4,1,30,120,1,120]){
 context.KM._missionT=context.KMMissionTimeline.routeAt(attackPlayback+age);context.updateChutes(0,age);
 assert.deepEqual(chute.sp.scale.toArray(),[.2,.2,.2],'Whole person must not be compressed during deployment or landing');
 assert.deepEqual(airman.scale.toArray(),[.75,.75,.75]);
 if(age===120){chute.sp.updateMatrixWorld(true);const foot=new T.Box3().setFromObject(airman).min.y;assert(Math.abs(foot-(50*.35+.03))<1e-6,`Feet must contact sampled terrain, got ${foot}`);assert(new T.Box3().setFromObject(chute.rig).min.y>=foot-1e-6,'Collapsed rig must not pass below the ground');}
 if(age===1){assert(Math.abs(chute.rig.scale.y-1)<1e-9,'Rewinding must undo a collapsed canopy');assert.equal(chute.rig.position.x,0,'Rewind must undo settled-cloth offset');}
}
let drawObjects=0;chute.sp.traverse(o=>{if(o.isMesh||o.isLine)drawObjects++;});assert(drawObjects<=8,'Detailed figure, canopy and rig must remain batched');
// Actual mission path must sample terrain beneath its drift, not launch.
context.V2.elevAt=(x,z)=>50+z*4;
delete chute.contact;
context.KM._missionT=context.KMMissionTimeline.routeAt(285);context.updateChutes(0,120);
const landedPosition=chute.sp.position.clone();
const expectedGround=(50+landedPosition.z*4)*.35+.03;
chute.sp.updateMatrixWorld(true);
assert(Math.abs(new T.Box3().setFromObject(airman).min.y-expectedGround)<1e-6);
assert(expectedGround>50*.35+.03,'Landing terrain differs from spawn terrain');
context.KM._missionT=context.KMMissionTimeline.routeAt(295);context.updateChutes(0,130);
assert(chute.sp.position.distanceTo(landedPosition)<1e-9,'Actual mission touchdown must stop drifting');
context.KM._missionT=context.KMMissionTimeline.routeAt(attackPlayback+1);context.updateChutes(0,1);
assert(chute.sp.position.y>landedPosition.y,'Rewind must restore airborne trajectory');
context.KM._missionT=context.KMMissionTimeline.routeAt(285);context.updateChutes(0,120);
assert(chute.sp.position.distanceTo(landedPosition)<1e-9,'Replay must recover identical touchdown');
console.log(`PASS: ${meshes} airman mesh batches; finite geometry; independent canopy opening/collapse; constant body dimensions; terrain contact includes foot offset. Visual geometry tests, not aerodynamic validation.`);
