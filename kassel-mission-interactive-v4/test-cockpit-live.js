'use strict';
// Live flight deck: the controls lift out of the real merged (quantized)
// model and every dial the extractor found gets a live face. Not a render check.
const assert=require('node:assert'),fs=require('node:fs'),vm=require('node:vm');
const T=require('../tmp/three-r128.js');
global.THREE=T;global.self=global;global.window=global;
const ctx2d=()=>new Proxy({},{get:(o,k)=>/create(Radial|Linear)Gradient/.test(k)?()=>({addColorStop(){}}):()=>{},set:()=>true});
global.document={createElementNS(){return {addEventListener(e,cb){if(e==='load')this._l=cb;},removeEventListener(){},set src(v){setTimeout(()=>this._l&&this._l(),0);}};},createElement(){return {width:0,height:0,getContext:ctx2d};}};
const src=fs.readFileSync(__dirname+'/km3d-v3.js','utf8'),end=src.indexOf('} )();',src.indexOf('THREE.GLTFLoader = GLTFLoader'));
vm.runInThisContext(src.slice(0,end+6));
require('./cockpit-gauges.js');const L=require('./cockpit-live.js');
const buf=fs.readFileSync(__dirname+'/crew-sections/b24-flightdeck.glb');
const MeshoptDecoder=require('./meshopt-decoder.js');
MeshoptDecoder.ready.then(()=>new THREE.GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),'',gltf=>{
 const scene=gltf.scene;let before=0;scene.traverse(o=>{if(o.isMesh)before+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;});
 L.prepare(T,scene);
 const ids=['yoke_L','yoke_R','pedal_L_L','pedal_L_R','pedal_R_L','pedal_R_R','throttle_1','throttle_2','throttle_3','throttle_4'];
 let moved=0,after=0;
 for(const id of ids){const o=scene.getObjectByName('ctl:'+id);assert.ok(o,'control '+id);let n=0;o.traverse(m=>{if(m.isMesh)n+=m.geometry.attributes.position.count/3;});assert.ok(n>100,id+' has geometry');moved+=n;}
 scene.traverse(o=>{if(o.isMesh&&!/^ctl:/.test(o.parent.name))after+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;});
 assert.strictEqual(after+moved,before,'every triangle kept exactly once');
 const yoke=new T.Box3().setFromObject(scene.getObjectByName('ctl:yoke_L')).getSize(new T.Vector3());
 assert.ok(yoke.x>0.3&&yoke.x<0.42,'pilot wheel about 0.36 m across');
 const holder=new T.Group();holder.name='B24-flightdeck';holder.add(scene);const tpl=holder;const inst=tpl.clone(true);/* the sim attaches clones */const cabin=new T.Group();cabin.add(inst);const live=inst.children[0];
 const eng=i=>({rpm:i===2?0:2550,map:i===2?12:40,oilT:70,oilP:80,cht:205,dead:i===2,throttle:i===2?0:.95});
 const s={altFt:23000,ias:175,heading:95,bank:.3,pitch:0,vsi:0,turnRate:2,slip:0,clockHr:11,clockMin:3,engines:[0,1,2,3].map(eng),hyd:1000,oat:-30,carb:18,suction:4,amps:60,fuel:.4,aileron:.5,elevator:.2,rudder:.3};
 assert.ok(L.apply(T,cabin,s));
 const faces=live.getObjectByName('live-gauges');const LIVE=['AIR SPEED','ALTITUDE','GYRO HORIZON','TURN','DIRECTIONAL GYRO','RATE OF CLIMB','CLOCK'];
 assert.strictEqual(faces.children.length,global.KasselCockpitGauges.filter(g=>LIVE.includes(g.label)).length,'flight instruments are live, the rest keep the checked faces');
 for(const l of ['AIR SPEED','ALTITUDE','GYRO HORIZON','TURN'])assert.ok(global.KasselCockpitGauges.some(g=>g.label===l),l+' found on the panel');
 const t3=live.getObjectByName('ctl:throttle_3'),t1=live.getObjectByName('ctl:throttle_1'),y=live.getObjectByName('ctl:yoke_L');
 assert.ok(Math.abs(y.quaternion.w)<0.999,'pilot wheel turned');
 assert.ok(!t3.quaternion.equals(t1.quaternion),'dead No. 3 throttle sits apart from No. 1');
 assert.strictEqual(L.reading('TACHOMETER',1,s)[0],0,'dead No. 3 tach reads zero');
 console.log(`PASS live cockpit: controls=${ids.length} triangles moved=${moved} dials=${faces.children.length}; values are representative, rendering not covered`);
},e=>{console.error(e);process.exit(1);}));
