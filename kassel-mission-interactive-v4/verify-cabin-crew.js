const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const T = require('../tmp/three-r128.js');
const drawing = new Proxy({}, {get: () => () => {}, set: () => true});
const context = {window: {}, document: {createElement: () => ({getContext: () => drawing})}};
for (const file of ['historical-geometry', 'airman-anatomy', 'ball-turret', 'interior-rebuild']) {
  vm.runInNewContext(fs.readFileSync(__dirname + '/' + file + '.js', 'utf8'), context);
}
const stations=require('./crew-navigation.js').stations;
for(const station of stations){
  const built=context.window.KasselInterior.build(T,station,stations);
  built.group.traverse(part=>assert(!part.userData.crewStation,'Interior contains a crew figure: '+station));
  assert(built.seats[station]);
}
console.log('PASS all 11 station cameras have unoccupied interiors');
for (const [station, cushion] of Object.entries({pilot:-.09,copilot:-.09,nav:-.82,bomb:-.99,radio:-.50})) {
  const {seats,group} = context.window.KasselInterior.build(T, station, []);
  const actual = (seats[station].offset.y-cushion)*group.userData.eyeCalibration.metresPerModelUnit;
  assert(Math.abs(actual-30.9*.0254)<1e-9, station+' seated eye height');
}
console.log('PASS five upright seated stations: 30.9 inches above cushion');
const resolver=require('./crew-stations.js');
for(const [assigned,other] of [['Left Waist Gunner','waistR'],['Right Waist Gunner','waistL']]){
  const member={r:'Waist Gunner'};
  assert.equal(resolver.resolve([{r:assigned},member],other).member,member);
}
for (const key of ['waistL','waistR']) {
  const {group,seats} = context.window.KasselInterior.build(T,key,[]);
  const seat=seats[key], eye=new T.Vector3().copy(seat.offset);
  assert(Math.abs(eye.z)<1,'Standing observer needs inboard clearance to see the window surround');
  group.updateMatrixWorld(true);
  const ray=new T.Raycaster(eye,new T.Vector3().copy(seat.look).normalize(),0,3);
  assert(!ray.intersectObjects(group.children,true).some(hit=>!hit.object.material.transparent),'Opaque geometry obstructs the window');
}
for (const [station,asset] of [['pilot','flight-deck-coaming'],['nav','archival-flight-record'],['radio','radio-receiver-face']]){
  const {group}=context.window.KasselInterior.build(T,station,[]);
  assert(group.getObjectByName(asset), station+' missing '+asset);
}
const desk=context.window.KasselInterior.build(T,'nav',[]).group.getObjectByName('wooden-worktop');
assert(desk && desk.material.map,'Navigator worktop needs a finished surface');
for(const key of ['pilot','copilot','nav']){
  const {group,seats}=context.window.KasselInterior.build(T,key);
  group.updateMatrixWorld(true);
  const eye=new T.Vector3().copy(seats[key].offset);
  const ray=new T.Raycaster(eye,new T.Vector3().copy(seats[key].look).normalize(),0,8);
  assert(!ray.intersectObjects(group.children,true).some(hit=>hit.object.material && !hit.object.material.transparent),key+' opening is blocked');
}
for (const key of stations) {
  const {group,seats}=context.window.KasselInterior.build(T,key);
  group.updateMatrixWorld(true);
  const camera=new T.PerspectiveCamera(65,16/10,.01,50);
  camera.position.copy(seats[key].offset);
  camera.lookAt(camera.position.clone().add(seats[key].look));
  camera.updateMatrixWorld(true);
  let open=0;
  for (let y=-2;y<=2;y++) for(let x=-3;x<=3;x++){
    const ray=new T.Raycaster();
    ray.setFromCamera(new T.Vector2(x/3*.85,y/2*.85),camera);
    if(!ray.intersectObject(group,true).some(hit=>hit.object.material&&!hit.object.material.transparent))open++;
  }
  assert(open>0,key+' has no sampled view of the exterior');
}
console.log('PASS all 11 station views admit exterior sightlines');
// A clear sightline must cross a pane. Empty space used to pass the visibility test.
for(const key of stations){
  const {group,seats}=context.window.KasselInterior.build(T,key);
  group.updateMatrixWorld(true);
  const eye=new T.Vector3().copy(seats[key].offset);
  for(let i=0;i<144;i++){
    const y=1-2*(i+.5)/144,r=Math.sqrt(1-y*y),a=i*2.39996323;
    const ray=new T.Raycaster(eye,new T.Vector3(r*Math.cos(a),y,r*Math.sin(a)),.001,12);
    const hits=ray.intersectObject(group,true);
    const enclosed=hits.some(hit=>{
      if(key!=='ball')return hit.object.material.userData.cabinBoundary;
      const turret=group.getObjectByName('Sperry-A13-reference-reconstruction');
      const radius=turret.userData.diameterIn*.0254*.5/group.userData.eyeCalibration.metresPerModelUnit;
      return Math.abs(turret.worldToLocal(hit.point.clone()).length()-radius)<.002;
    });
    assert(enclosed,key+' leaks sky at sample '+i);
  }
}
console.log('PASS cabin enclosure: 144 directions from each of 11 eyepoints intersect modeled surfaces');
// Check each window and the metal immediately fore and aft of it.
// Filter on the enclosure itself so seats and fittings cannot mask gaps.
for(const [station,samples] of [
  ['radio',[[2.45,false],[2.55,true],[4.35,true],[4.45,false]]],
  ['waistL',[[-7.95,false],[-7.85,true],[-4.85,true],[-4.75,false]]]
]){
  const {group}=context.window.KasselInterior.build(T,station);
  group.updateMatrixWorld(true);
  for(const [x,glass] of samples) for(const side of [-1,1]){
    const ray=new T.Raycaster(new T.Vector3(x,.75,0),new T.Vector3(0,0,side));
    const hit=ray.intersectObject(group,true).find(hit=>hit.object.material.userData.cabinBoundary);
    assert(hit,station+' missing sidewall');
    assert.equal(hit.object.material.transparent,glass,station+' incorrect opening at '+x);
  }
}
console.log('PASS radio and waist glazing meets opaque skin at both ends on both sides');
const waist=context.window.KasselInterior.build(T,'waistL');
assert(waist.group.getObjectByName('bulkhead-stiffeners'),'Missing formed bulkhead channels');
assert(context.window.KasselInterior.build(T,'pilot').group.getObjectByName('rolled-glare-shield'));
assert(context.window.KasselInterior.build(T,'nav').group.children.some(o=>o.material?.userData.cabinFinish==='enamel'),'Missing painted metal finish');
{
  const {group}=context.window.KasselInterior.build(T,'nav');
  group.updateMatrixWorld(true);
  for(const side of [-1,1])for(const [x,y,glass] of [[9.65,.55,false],[10.6,.55,true],[11.75,.55,false],[10.6,1.03,false]]){
    const ray=new T.Raycaster(new T.Vector3(x,y,0),new T.Vector3(0,0,side));
    const hit=ray.intersectObject(group,true).find(hit=>hit.object.material.userData.cabinBoundary);
    assert(hit,'Navigator nose shell missing');
    assert.equal(hit.object.material.transparent,glass,'Navigator glazing boundary at '+x+', '+y);
  }
  console.log('PASS navigator glazing has opaque forward and aft surrounds and overhead skin');
}
