/* Reference-led B-24 crew compartments (models in place of the procedural rooms).
 *
 *  b24-flight-deck.glb       pilot / co-pilot flight deck JP reviewed in VR
 *                            (Nov 18 2026), trimmed where the aft deck joins it
 *  b24-aft-deck.glb          radio operator (right side, behind the co-pilot,
 *                            table against the right wall) and top-turret bay
 *  b24-nose-compartment.glb  navigator, bombardier with Norden, nose turret
 *  b24-waist.glb             left and right waist gunners
 *
 * Built by tools/crew-stations (see README there) from JP's reference renders
 * and NMUSAF photographs. They are reconstructions, NOT factory drawings:
 * gauge layouts, placards and dimensions are estimates.
 *
 * All four share one source frame: metres, +Y up, nose toward -Z, origin on
 * the flight-deck floor centre at the pilot's eye station (pilot eye at
 * x -0.48, y 1.18). Mission frame (as in interior-rebuild.js): aircraft model
 * units, +X nose, +Y up, +Z right, 20.47 m / 33 units; the pilot's eye is
 * anchored at the old procedural pilot eye (x 7.55, y 1.12).
 *
 * The files are prepared for three r128: emissive strength baked, cabin
 * lamps removed, geometry quantized with KHR_mesh_quantization (read by the
 * bundled GLTFLoader without a decoder), textures as JPEG/PNG. */
(function(global){
 'use strict';
 var V='?v=20261118-r7';
 var PARTS={flightdeck:'b24-flight-deck.glb',aftdeck:'b24-aft-deck.glb',nose:'b24-nose-compartment.glb',waist:'b24-waist.glb'};
 var M_PER_UNIT=20.47/33;
 var PILOT_EYE_M=[-0.48,1.18,0],PILOT_EYE_UNITS=[7.55,1.12];
 // eye positions and look directions in the GLB frame (the GLBs carry matching camera nodes)
 var STATIONS={
  pilot:{parts:['flightdeck','aftdeck'],eye:[-0.48,1.18,0],look:[0,-0.1593,-0.9872]},
  copilot:{parts:['flightdeck','aftdeck'],eye:[0.48,1.18,0],look:[0,-0.1593,-0.9872]},
  radio:{parts:['flightdeck','aftdeck'],eye:[0.2,1.2,1.38],look:[0.921,-0.3868,-0.0461]},
  nav:{parts:['nose'],eye:[0.14,0.42,-1.86],look:[0.4963,-0.4467,-0.7444]},
  bomb:{parts:['nose'],eye:[0,0.12,-2.72],look:[0,-0.6,-0.8]},
  nose:{parts:['nose'],eye:[0,0.74,-4.2],look:[0,-0.0599,-0.9982]},
  waistL:{parts:['waist'],eye:[-0.1,1.031,8.2],look:[-0.9929,-0.1191,0]},
  waistR:{parts:['waist'],eye:[0.1,1.031,8.2],look:[0.9929,-0.1191,0]}
 };
 var FLOOR_M={waistL:-0.62,waistR:-0.62};
 function toUnits(p){
  return [-p[2]/M_PER_UNIT+PILOT_EYE_UNITS[0],
   p[1]/M_PER_UNIT+PILOT_EYE_UNITS[1]-PILOT_EYE_M[1]/M_PER_UNIT,
   p[0]/M_PER_UNIT];
 }
 function dirUnits(d){var v=[-d[2],d[1],d[0]],l=Math.hypot(v[0],v[1],v[2]);return v.map(function(c){return c/l;});}
 var cache={},failed={};
 function status(text){
  if(typeof document==='undefined'||!document.getElementById)return;
  var wrap=document.getElementById('terrain-wrap');if(!wrap)return;
  var el=document.getElementById('km-compartment-load');
  if(!el){el=document.createElement('div');el.id='km-compartment-load';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
   el.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:35;padding:12px 18px;background:rgba(8,12,15,.92);color:#e8e5dc;border:1px solid #b69b48;font:12px Montserrat,sans-serif;pointer-events:none';
   wrap.appendChild(el);}
  el.textContent=text||'';el.style.display=text?'block':'none';
 }
 function load(T,part){
  if(cache[part])return cache[part];
  cache[part]=new Promise(function(resolve,reject){
   new T.GLTFLoader().load(PARTS[part]+V,function(gltf){
    var holder=new T.Group();holder.name='B24-'+part;
    holder.add(gltf.scene);
    holder.rotation.y=-Math.PI/2;
    holder.scale.setScalar(1/M_PER_UNIT);
    var o=toUnits([0,0,0]);holder.position.set(o[0],o[1],o[2]);
    holder.userData.sharedCompartment=true;
    resolve(holder);
   },undefined,function(err){failed[part]=true;delete cache[part];reject(err);});
  });
  return cache[part];
 }
 global.KasselCrewCompartments={
  parts:function(station){return STATIONS[station]?STATIONS[station].parts.map(function(p){return PARTS[p];}):[];},
  covers:function(station){return !!STATIONS[station]&&STATIONS[station].parts.every(function(p){return !failed[p];});},
  available:function(T){return !!(T&&T.GLTFLoader);},
  metresPerModelUnit:M_PER_UNIT,stations:STATIONS,floorMetres:FLOOR_M,toUnits:toUnits,dirUnits:dirUnits,
  seats:function(){var out={};Object.keys(STATIONS).forEach(function(k){out[k]={pos:toUnits(STATIONS[k].eye),look:dirUnits(STATIONS[k].look)};});return out;},
  /* Adds shared clones of the station's compartments to parent once loaded.
     Geometry and materials stay shared with the cached templates, so callers
     must not dispose them (V2.disposeCabin skips sharedCompartment). */
  attach:function(T,parent,station,onFail){
   var parts=STATIONS[station].parts;status('Loading B-24 crew station…');
   Promise.all(parts.map(function(p){return load(T,p);})).then(function(tpls){
    status('');tpls.forEach(function(tpl){var c=tpl.clone(true);c.userData.sharedCompartment=true;parent.add(c);});
   }).catch(function(err){status('');if(typeof console!=='undefined')console.warn('KM: crew compartment model unavailable, using procedural room',err);if(onFail)onFail(err);});
  }
 };
})(typeof window!=='undefined'?window:globalThis);
