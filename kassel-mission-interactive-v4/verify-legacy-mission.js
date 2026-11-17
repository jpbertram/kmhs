const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const timeline=require('./mission-timeline.js');
const stations=require('./crew-stations.js');
for(const [seconds,route] of timeline.marks){
  assert(Math.abs(timeline.routeAt(seconds)-route)<1e-8);
  assert(Math.abs(timeline.secondsAt(route)-seconds)<1e-6);
}
let previous=-1;
for(let seconds=0;seconds<300;seconds+=0.01){
  const route=timeline.routeAt(seconds);
  assert(route>=previous);
  assert(Math.abs(timeline.secondsAt(route)-seconds)<1e-5);
  previous=route;
}
for(const [seconds] of timeline.marks.slice(1,-1)){
  const epsilon=0.001;
  const before=(timeline.routeAt(seconds)-timeline.routeAt(seconds-epsilon))/epsilon;
  const after=(timeline.routeAt(seconds+epsilon)-timeline.routeAt(seconds))/epsilon;
  assert(Math.abs(before-after)<0.00001,'Route velocity discontinuity');
}
for(const [route,clock] of [[0,'08:00'],[0.56,'10:30'],[0.84,'11:00'],[0.92,'11:06'],[1,'12:30']]){
  assert.equal(timeline.clockAt(route),clock);
}
const runtime=fs.readFileSync(path.join(__dirname,'km3d-v3.js'),'utf8');
assert(Math.abs(timeline.missionSecondsAt(.92)-timeline.missionSecondsAt(.84)-360)<1e-7,'Documentary attack is six minutes');
for(let cue=0;cue<=420;cue+=1){
  const birth=timeline.playbackAtBattleCue(cue);
  assert(Math.abs(timeline.battleAt(timeline.routeAt(birth))-cue)<1e-6);
  for(const age of [0,.1,1,10,30])if(birth+age<=300){
    assert(Math.abs(timeline.ageSinceBattleCue(timeline.routeAt(birth+age),cue)-age)<1e-6,'Bailout age uses playback time, independent of route speed');
  }
}
assert(Math.abs(timeline.playbackAtBattleCue(420)-240)<1e-6);
assert(Math.abs(timeline.playbackAtBattleCue(476)-250)<1e-6);
new vm.Script(runtime);
const roster=vm.runInNewContext('('+runtime.match(/V2\.CREW_LISTS=([\s\S]*?);\n/)[1]+')');
assert.equal(Object.keys(roster).length,35);
assert.equal(Object.values(roster).reduce((sum,list)=>sum+list.length,0),336);
const bailoutContext={V2:{CREW_LISTS:roster}};
vm.runInNewContext(runtime.slice(runtime.indexOf('V2.GROUND_DEATH_BAILOUTS='),runtime.indexOf('/* ---------- anchor')),bailoutContext);
const minerBailouts=bailoutContext.V2.bailoutCrewFor('Miner');
assert(minerBailouts.some(m=>m.s==='chima'),'Chima bailed out despite his KIA outcome');
assert(minerBailouts.some(m=>m.s==='gilfoil'),'Gilfoil was assisted out despite his KIA outcome');
assert.equal(minerBailouts.at(-1).s,'miner','Miner remains the last depicted bailout');
for(const list of Object.values(roster)){
  assert.equal(stations.resolve(list,'pilot').member.r,'Pilot');
  for(const station of ['waistL','waistR']){
    const resolved=stations.resolve(list,station);
    if(resolved.member)assert(/waist/i.test(resolved.member.r));
  }
}
assert.equal(stations.resolve(roster.Chilton,'waistL').member.n,'Merle R. Briggs');
assert.equal(stations.resolve(roster.Chilton,'waistR').member.n,'Robert E. Shay');
assert(stations.resolve(roster.Chilton,'waistL').uncertain);
assert.equal(stations.resolve(roster.Smith,'pilot').member.n,'Donald H. Smith');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace(/(<script\b[^>]*\bsrc="[^"?]+)\?[^"\s]*(")/g,'$1$2');
assert(html.indexOf('<script src="loss-trajectory.js"></script>')>=0);
assert(html.indexOf('<script src="loss-trajectory.js"></script>')<html.indexOf('<script src="km3d-v3.js"></script>'));
assert(html.indexOf('<script src="crew-loss-focus.js"></script>')>=0);
assert(html.indexOf('<script src="crew-loss-focus.js"></script>')<html.indexOf('<script src="km3d-v3.js"></script>'));
assert(html.indexOf('<script src="loss-smoke.js"></script>')>=0);
assert(html.indexOf('<script src="loss-smoke.js"></script>')<html.indexOf('<script src="km3d-v3.js"></script>'));
assert(html.indexOf('<script src="propeller-assembly.js"></script>')>=0);
assert(html.indexOf('<script src="propeller-assembly.js"></script>')<html.indexOf('<script src="km3d-v3.js"></script>'));
assert(html.indexOf('<script src="aircraft-material-geometry.js"></script>')>=0);
assert(html.indexOf('<script src="aircraft-material-geometry.js"></script>')<html.indexOf('<script src="km3d-v3.js"></script>'));
assert(html.indexOf('<script src="fighter-targeting.js"></script>')>=0);
assert(html.indexOf('<script src="fighter-targeting.js"></script>')<html.indexOf('<script src="km3d-v3.js"></script>'));
assert(runtime.includes('KasselCrewLossFocus.select(pl,c,V2.CREW_LISTS||{}'));
assert(html.indexOf('<script src="parachute-contact.js"></script>')>=0);
assert(html.indexOf('<script src="parachute-contact.js"></script>')<html.indexOf('<script src="km3d-v3.js"></script>'),'Contact solver must load before runtime');
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))new vm.Script(match[1]);
for(const asset of ['b24j.glb','b24j-interior-olive.obj','mission-timeline.js','crew-stations.js','interior-rebuild.js','historical-geometry.js','ball-turret.js','flight-attitude.js'])assert(fs.existsSync(path.join(__dirname,asset)));
new vm.Script(fs.readFileSync(path.join(__dirname,'historical-geometry.js'),'utf8'));
assert(html.includes('<script src="historical-geometry.js"></script>'));
assert(runtime.includes('KasselHistoricalGeometry.fighter(THREE)'),'Old lathed 109 fallback must not be active');
const interior=fs.readFileSync(path.join(__dirname,'interior-rebuild.js'),'utf8');new vm.Script(interior);
assert(html.includes('<script src="interior-rebuild.js"></script>'));
assert(html.indexOf('<script src="ball-turret.js"></script>')<html.indexOf('<script src="interior-rebuild.js"></script>'));
assert(html.indexOf('<script src="flight-attitude.js"></script>')<html.indexOf('<script src="km3d-v3.js"></script>'));
assert(runtime.includes('KasselFlightAttitude.apply(THREE,f,vel,0)'));
assert(runtime.includes('KasselFlightAttitude.apply(THREE,e,vel,0)'));
assert(!/photoWall|loadTexture|\.jpg|\.png/.test(interior),'No reference photos as interior skins');
const fwConfig=runtime.match(/fw190:\{len:13\.5[\s\S]*?\}/)[0];
assert(fwConfig.includes('forceRotY:Math.PI/2'),'Fw 190 native +Z prop nose must map to +X');
assert(runtime.includes('c._crewLossHandoff=true'),'Crew identity survives loss-camera handoff');
console.log('PASS: five-minute timing, 30,000 route/seek samples, continuous phase velocity, mission clock, 35 aircraft, 336 crew records, 70 waist-role mappings, scripts and supplied assets.');
console.log('SCOPE: numerical/software checks only. Counts do not establish historical formation or crew accuracy. This does not validate the battle geography, aerodynamic model, individual loss histories or museum-grade visuals.');
// A passing lead-route test does not establish forward motion for the
// offset aircraft. Keep the known inside-turn regression in the main gate.
const formationAudit=require('node:child_process').spawnSync(process.execPath,
  [path.join(__dirname,'audit-formation-forward-motion.js'),path.resolve(__dirname,'../tmp/three-r128.js'),'--summary'],{encoding:'utf8'});
process.stdout.write(formationAudit.stdout||'');process.stderr.write(formationAudit.stderr||'');
if(formationAudit.status!==0){console.error('FAIL: formation forward-motion gate. Build is not ready for release.');process.exitCode=1;}
