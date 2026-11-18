// Parses every crew-compartment GLB with the bundled three r128 GLTFLoader
// (the loader the mission page uses) and checks each station's placement in
// the mission's aircraft frame. Images are stubbed: this proves geometry,
// extensions, eye points and clearances, NOT on-screen appearance in a browser.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const T=require(path.resolve(__dirname,process.argv[2]||'../tmp/three-r128.js'));

const listeners=new WeakMap();
global.self=global;global.window=global;
global.document={createElementNS:()=>{const img={width:4,height:4,addEventListener:(t,f)=>{const l=listeners.get(img)||{};l[t]=f;listeners.set(img,l);},removeEventListener:()=>{}};
 Object.defineProperty(img,'src',{set(){setTimeout(()=>{const l=listeners.get(img)||{};l.load&&l.load.call(img,{});},0);}});return img;},
 createElement:()=>({getContext:()=>null})};
global.URL.createObjectURL=()=>'blob:stub';global.URL.revokeObjectURL=()=>{};
global.THREE=T;vm.runInThisContext(fs.readFileSync(path.join(__dirname,'vendor','GLTFLoader-r128.js'),'utf8'),{filename:'GLTFLoader-r128.js'});
const sandbox={console};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'crew-compartments.js'),'utf8'),sandbox);
const cc=sandbox.KasselCrewCompartments;
const supported=['KHR_mesh_quantization','KHR_lights_punctual','KHR_texture_transform','KHR_materials_unlit'];

function parse(file){
 const buf=fs.readFileSync(path.join(__dirname,file));
 const json=JSON.parse(buf.slice(20,20+buf.readUInt32LE(12)).toString('utf8'));
 for(const ext of json.extensionsRequired||[])assert(supported.includes(ext),file+': r128 cannot read required extension '+ext);
 for(const ext of json.extensionsUsed||[])assert(ext!=='KHR_materials_emissive_strength',file+': emissive strength must be baked for r128');
 assert(buf.length<50e6,file+' must stay under GitHub\'s 50 MB warning size');
 return new Promise((res,rej)=>new T.GLTFLoader().parse(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.length),'',g=>res({gltf:g,bytes:buf.length}),rej));
}
// r128 raycasting reads quantized (normalized) positions raw; dequantize a copy for the probes.
function dequantize(scene){
 scene.traverse(m=>{if(!m.isMesh)return;const a=m.geometry.attributes.position;if(!a.normalized)return;
  const arr=a.isInterleavedBufferAttribute?a.data.array:a.array;
  const d=arr.constructor===Int16Array?32767:arr.constructor===Uint16Array?65535:arr.constructor===Int8Array?127:255;
  const f=new Float32Array(a.count*3);for(let i=0;i<a.count;i++){f[i*3]=Math.max(a.getX(i)/d,-1);f[i*3+1]=Math.max(a.getY(i)/d,-1);f[i*3+2]=Math.max(a.getZ(i)/d,-1);}
  m.geometry.setAttribute('position',new T.BufferAttribute(f,3));});
}
function place(scene){
 const holder=new T.Group();holder.add(scene);holder.rotation.y=-Math.PI/2;holder.scale.setScalar(1/cc.metresPerModelUnit);
 const o=cc.toUnits([0,0,0]);holder.position.set(o[0],o[1],o[2]);holder.updateMatrixWorld(true);return holder;
}
const solid=h=>h.object.material&&!h.object.material.transparent;
(async()=>{
 const files={};
 const parts={flightdeck:'b24-flight-deck.glb',aftdeck:'b24-aft-deck.glb',topturret:'b24-top-turret.glb',nose:'b24-nose-compartment.glb',waist:'b24-waist.glb',ball:'b24-ball-turret.glb',tail:'b24-tail-turret.glb'};
 const loaded={},summary=[];
 for(const [k,file] of Object.entries(parts)){
  const {gltf,bytes}=await parse(file);dequantize(gltf.scene);const holder=place(gltf.scene);
  let tris=0;gltf.scene.traverse(m=>{if(!m.isMesh)return;const g=m.geometry;tris+=(g.index?g.index.count:g.attributes.position.count)/3;
   const p=g.attributes.position;for(let i=0;i<p.count*3;i++)assert(Number.isFinite(p.array[i]),file+' finite positions');});
  const cams={};gltf.scene.traverse(o=>{if(o.isCamera){cams[o.name]=o;if(o.parent)cams[o.parent.name]=cams[o.parent.name]||o;}});
  loaded[k]={holder,cams};summary.push(`${file} ${(bytes/1e6).toFixed(1)}MB ${Math.round(tris)}tris`);
 }
 const seats=cc.seats();
 const camName={pilot:'Pilot_eye',copilot:'Co-pilot_eye',radio:'eye_radio',ttop:'eye_ttop',nav:'eye_nav',bomb:'eye_bomb',nose:'eye_nose',ball:'eye_ball',waistL:'eye_waistL',waistR:'eye_waistR',tail:'eye_tail'};
 const report=[];
 for(const [station,def] of Object.entries(cc.stations)){
  const group=new T.Group();def.parts.forEach(p=>{const k=Object.keys(parts).find(n=>parts[n]===p)||p;group.add(loaded[k].holder);});
  group.updateMatrixWorld(true);
  const cam=def.parts.map(p=>loaded[p].cams[camName[station]]).find(Boolean);
  assert(cam,station+': its GLB carries the matching eye node');
  const eye=new T.Vector3();cam.getWorldPosition(eye);
  assert(eye.distanceTo(new T.Vector3(...seats[station].pos))<2e-3,station+': seat eye equals the GLB eye node');
  const look=new T.Vector3(0,0,-1).applyQuaternion(cam.getWorldQuaternion(new T.Quaternion()));
  assert(look.distanceTo(new T.Vector3(...seats[station].look))<2e-3,station+': look direction equals the GLB eye node');
  const objs=def.parts.map(p=>loaded[p].holder);
  // something solid in view within 2.5 m along the look, and a floor/seat below the eye
  const ahead=new T.Raycaster(eye,look.clone().normalize()).intersectObjects(objs,true).filter(solid);
  const down=new T.Raycaster(eye,new T.Vector3(0,-1,0)).intersectObjects(objs,true).filter(solid);
  assert(down.length&&down[0].distance*cc.metresPerModelUnit<1.8,station+': floor or seat below the eye');
  // the eye is not buried inside geometry: nearest surface in 14 directions is at least 8 cm away
  let nearest=1e9;for(const d of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[1,1,1],[-1,1,1],[1,1,-1],[-1,1,-1],[1,-1,1],[-1,-1,1],[1,-1,-1],[-1,-1,-1]]){
   const h=new T.Raycaster(eye,new T.Vector3(...d).normalize()).intersectObjects(objs,true);if(h.length)nearest=Math.min(nearest,h[0].distance);}
  const nearestM=nearest*cc.metresPerModelUnit;
  assert(nearestM>0.08,station+': eye clear of geometry (nearest '+nearestM.toFixed(3)+' m)');
  report.push(`${station} view ${ahead.length?(ahead[0].distance*cc.metresPerModelUnit).toFixed(2)+'m':'open'} floor ${(down[0].distance*cc.metresPerModelUnit).toFixed(2)}m clear ${nearestM.toFixed(2)}m`);
 }
 // Waist: standing eye 1.651 m above the modelled floor (NASA CR-114271 nominal, as before).
 for(const w of ['waistL','waistR']){const floorU=cc.toUnits([0,cc.floorMetres[w],0])[1];
  assert(Math.abs((seats[w].pos[1]-floorU)*cc.metresPerModelUnit-1.651)<2e-3,w+' eye height');}
 console.log('PASS crew compartments: '+summary.join('; ')+' | '+report.join('; ')+'. Parsed with the r128 loader under Node with stubbed images, not a browser render.');
})().catch(e=>{console.error(e);process.exitCode=1;});
