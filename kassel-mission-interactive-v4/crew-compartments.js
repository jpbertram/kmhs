/* B-24 crew stations: the six sections JP approved on the cockpit page
 * (b24-cockpit.html, Nov 18 2026), loaded whole so every station sits in the
 * complete aircraft:
 *
 *  crew-sections/b24-flightdeck.glb  cockpit, flight deck, radio, top turret
 *  crew-sections/b24-nose.glb        navigator, bombardier with Norden, nose turret
 *  crew-sections/b24-bombbay.glb     bomb bay, catwalk and bombs
 *  crew-sections/b24-waist.glb       waist guns and waist section
 *  crew-sections/b24-tail.glb        aft fuselage and tail turret
 *  crew-sections/b24-exterior.glb    wings, nacelles, tailplane and outer skin
 *
 * crew-sections/manifest.json lists them and carries the station eye points
 * read from the cockpit page. Updated sections drop in by rerunning
 * tools/crew-stations/port-sections.mjs, which converts them for three r128
 * (Draco decoded; meshopt geometry read with meshopt-decoder.js; opaque
 * textures as JPEG). No ball turret: the 445th's ships flew without them.
 *
 * Loading: the section holding the chosen station loads first and is shown
 * as soon as it arrives; the others stream in behind it, with a progress bar.
 *
 * Frame: metres, +Y up, nose toward -Z, origin on the flight-deck floor at
 * the pilot's station (pilot eye x -0.48, y 1.18). Mission frame (as in
 * interior-rebuild.js): aircraft model units, +X nose, +Y up, +Z right,
 * 20.47 m / 33 units; the pilot's eye is anchored at x 7.55, y 1.12.
 * These are reconstructions, not factory drawings. */
(function(global){
 'use strict';
 var V='?v=20261118-sections',DIR='crew-sections/';
 var PARTS={flightdeck:'b24-flightdeck.glb',nose:'b24-nose.glb',bombbay:'b24-bombbay.glb',waist:'b24-waist.glb',tail:'b24-tail.glb',exterior:'b24-exterior.glb'};
 var ORDER=['flightdeck','nose','bombbay','waist','tail','exterior'];
 var SIZE={flightdeck:6.0e6,nose:4.1e6,bombbay:1.0e6,waist:2.9e6,tail:3.8e6,exterior:0.4e6};
 var M_PER_UNIT=20.47/33;
 var PILOT_EYE_M=[-0.48,1.18,0],PILOT_EYE_UNITS=[7.55,1.12];
 // eye points and look directions in the section frame, as on the cockpit page
 function st(home,eye,look){return {home:home,parts:[home].concat(ORDER.filter(function(p){return p!==home;})),eye:eye,look:look};}
 var STATIONS={
  pilot:st('flightdeck',[-0.48,1.18,0],[0,-0.1593,-0.9872]),
  copilot:st('flightdeck',[0.48,1.18,0],[0,-0.1593,-0.9872]),
  radio:st('flightdeck',[0.42,1.2,1.42],[0.921,-0.3868,-0.0461]),
  ttop:st('flightdeck',[0,2.045,1.5],[0,0,-1]),
  nav:st('nose',[0.14,0.42,-1.86],[0.4963,-0.4467,-0.7444]),
  bomb:st('nose',[0,0.1,-2.8],[0,-0.7413,-0.6712]),
  nose:st('nose',[0,0.74,-4.2],[0,-0.0599,-0.9982]),
  waistL:st('waist',[-0.1,1.031,8.95],[-0.9929,-0.1191,0]),
  waistR:st('waist',[0.1,1.031,8.95],[0.9929,-0.1191,0]),
  tail:st('tail',[0,0.86,14.64],[0,-0.02,0.9998])
 };
 var FLOOR_M={waistL:-0.62,waistR:-0.62};
 function toUnits(p){
  return [-p[2]/M_PER_UNIT+PILOT_EYE_UNITS[0],
   p[1]/M_PER_UNIT+PILOT_EYE_UNITS[1]-PILOT_EYE_M[1]/M_PER_UNIT,
   p[0]/M_PER_UNIT];
 }
 function dirUnits(d){var v=[-d[2],d[1],d[0]],l=Math.hypot(v[0],v[1],v[2]);return v.map(function(c){return c/l;});}
 var cache={},failed={},progress={};
 /* eye points from the manifest, when the page can fetch it */
 if(typeof fetch==='function'&&typeof document!=='undefined'){
  fetch(DIR+'manifest.json'+V).then(function(r){return r.ok?r.json():null;}).then(function(m){
   if(!m)return;
   (m.sections||[]).forEach(function(s){if(PARTS[s.key]&&s.bytes)SIZE[s.key]=s.bytes;});
   Object.keys(m.stations||{}).forEach(function(k){var s=m.stations[k];if(STATIONS[k]&&s.eye&&s.look){STATIONS[k].eye=s.eye;STATIONS[k].look=s.look;}});
  }).catch(function(){});
 }
 function status(text,frac){
  if(typeof document==='undefined'||!document.getElementById)return;
  var wrap=document.getElementById('terrain-wrap');if(!wrap)return;
  var el=document.getElementById('km-compartment-load');
  if(!el){el=document.createElement('div');el.id='km-compartment-load';el.setAttribute('role','progressbar');el.setAttribute('aria-live','polite');
   el.setAttribute('aria-valuemin','0');el.setAttribute('aria-valuemax','100');
   el.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:35;padding:12px 18px;min-width:240px;background:rgba(8,12,15,.92);color:#e8e5dc;border:1px solid #b69b48;font:12px Montserrat,sans-serif;pointer-events:none';
   el.innerHTML='<div class="km-cl-text"></div><div style="margin-top:8px;height:4px;background:rgba(255,255,255,.12)"><div class="km-cl-bar" style="height:100%;width:0;background:#b69b48;transition:width .2s"></div></div>';
   wrap.appendChild(el);}
  el.querySelector('.km-cl-text').textContent=text||'';
  var pct=Math.round(Math.max(0,Math.min(1,frac||0))*100);
  el.querySelector('.km-cl-bar').style.width=pct+'%';el.setAttribute('aria-valuenow',String(pct));
  el.style.display=text?'block':'none';
 }
 /* a small strip at the bottom while the rest of the aircraft streams in */
 function streaming(frac){
  if(typeof document==='undefined'||!document.getElementById)return;
  var wrap=document.getElementById('terrain-wrap');if(!wrap)return;
  var el=document.getElementById('km-compartment-stream');
  if(!el){el=document.createElement('div');el.id='km-compartment-stream';el.setAttribute('role','progressbar');
   el.style.cssText='position:absolute;left:50%;bottom:132px;transform:translateX(-50%);z-index:35;padding:6px 12px;background:rgba(8,12,15,.8);color:#e8e5dc;border:1px solid rgba(182,155,72,.6);font:11px Montserrat,sans-serif;pointer-events:none';
   wrap.appendChild(el);}
  if(frac>=1){el.style.display='none';return;}
  el.style.display='block';el.textContent='Loading the rest of the aircraft… '+Math.round(frac*100)+'%';
 }
 function loader(T){
  var l=new T.GLTFLoader();
  if(global.MeshoptDecoder&&l.setMeshoptDecoder)l.setMeshoptDecoder(global.MeshoptDecoder);
  return l;
 }
 function load(T,part){
  if(cache[part])return cache[part];
  progress[part]=0;
  cache[part]=new Promise(function(resolve,reject){
   loader(T).load(DIR+PARTS[part]+V,function(gltf){
    progress[part]=1;
    var holder=new T.Group();holder.name='B24-'+part;
    holder.add(gltf.scene);
    /* flight deck: lift the yokes, pedals and throttles into moving parts (cockpit-live.js) */
    if(part==='flightdeck'&&global.KasselCockpitLive){try{global.KasselCockpitLive.prepare(T,gltf.scene);}catch(e){if(typeof console!=='undefined')console.warn('KM: cockpit controls not separated',e);}}
    holder.rotation.y=-Math.PI/2;
    holder.scale.setScalar(1/M_PER_UNIT);
    var o=toUnits([0,0,0]);holder.position.set(o[0],o[1],o[2]);
    holder.userData.sharedCompartment=true;
    resolve(holder);
   },function(e){if(e&&e.loaded)progress[part]=Math.min(.99,e.loaded/(e.total||SIZE[part]||e.loaded));},
   function(err){failed[part]=true;delete cache[part];reject(err);});
  });
  return cache[part];
 }
 function fraction(parts){var tot=0,got=0;parts.forEach(function(p){var s=SIZE[p]||1e6;tot+=s;got+=s*(progress[p]||0);});return tot?got/tot:1;}
 global.KasselCrewCompartments={
  parts:function(station){return STATIONS[station]?STATIONS[station].parts.map(function(p){return DIR+PARTS[p];}):[];},
  covers:function(station){return !!STATIONS[station]&&!failed[STATIONS[station].home];},
  available:function(T){return !!(T&&T.GLTFLoader);},
  metresPerModelUnit:M_PER_UNIT,stations:STATIONS,floorMetres:FLOOR_M,toUnits:toUnits,dirUnits:dirUnits,sections:PARTS,
  seats:function(){var out={};Object.keys(STATIONS).forEach(function(k){out[k]={pos:toUnits(STATIONS[k].eye),look:dirUnits(STATIONS[k].look)};});return out;},
  /* begin downloading the sections in the background (lowest priority first
     gets the pilot's flight deck) so a later crew view opens at once */
  prefetch:function(T){ORDER.forEach(function(p){load(T,p).catch(function(){});});},
  /* Adds shared clones of every section to parent: the station's own section
     first, shown as soon as it arrives, then the rest of the aircraft.
     Geometry and materials stay shared with the cached templates, so callers
     must not dispose them (V2.disposeCabin skips sharedCompartment). */
  attach:function(T,parent,station,onFail){
   var def=STATIONS[station],parts=def.parts,home=def.home,timer=null,homeShown=false;
   function tick(){
    if(!homeShown)status('Loading B-24 crew station…',fraction([home]));
    else streaming(fraction(parts));
   }
   timer=setInterval(tick,200);tick();
   function add(tpl){var c=tpl.clone(true);c.userData.sharedCompartment=true;parent.add(c);}
   var homeP=load(T,home).then(function(tpl){homeShown=true;status('');add(tpl);tick();})
    .catch(function(err){clearInterval(timer);status('');streaming(1);if(typeof console!=='undefined')console.warn('KM: crew station model unavailable, using procedural room',err);if(onFail)onFail(err);throw err;});
   homeP.then(function(){
    return Promise.all(parts.filter(function(p){return p!==home;}).map(function(p){
     return load(T,p).then(function(tpl){add(tpl);}).catch(function(err){if(typeof console!=='undefined')console.warn('KM: crew section '+p+' unavailable',err);});
    }));
   }).catch(function(){}).then(function(){clearInterval(timer);streaming(1);});
  }
 };
})(typeof window!=='undefined'?window:globalThis);
