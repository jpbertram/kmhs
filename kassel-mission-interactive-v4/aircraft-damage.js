/* Per-aircraft battle damage for the 27 September 1944 formation.
 *
 * What a ship shows comes from KasselAircraftDamageData (aircraft-damage-data.js),
 * built from the Society crew accounts in reference/society-crew-cms-snapshot.json.
 * Each event there is marked documented (the account states it) or inferred
 * (deduced, with the reason). The accounts give no clock times, so WHEN each
 * hit appears is always an inference, keyed to the roster's loss/departure cue.
 *
 * This file is pure: no THREE, no DOM. km3d-v3.js turns state into visuals.
 */
(function(root){
 'use strict';
 var ATTACK_START=48,ATTACK_END=215,AFTER=235;
 var ENGINE_KINDS={engine_fire:1,engine_dead:1,engine_feathered:1,engine_windmilling:1,prop_runaway:1};
 var FIRE_ZONE={wing_fire:1,fuselage_fire:1,flightdeck_fire:1,bombbay_fire:1,waist_fire:1};
 function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
 function data(){return root.KasselAircraftDamageData||{profiles:{}};}
 function profile(pilot){var p=data().profiles[pilot];return p||{fit:{ballTurret:true,h2xDome:false,evidence:'default'},events:[]};}

 /* Cue at which each recorded event becomes visible. ft is the roster's
    loss (r) or departure (p, b) cue; returning ships (g) have none. */
 function schedule(pilot,fate,ft){
  var prof=profile(pilot),out=[],lossCue=Number.isFinite(ft)?ft:null;
  prof.events.forEach(function(ev,i){
   var h=hash(pilot+':'+i),t;
   if(ev.phase==='fatal')t=lossCue!==null?(fate==='r'?lossCue:lossCue-4):ATTACK_START+40+h%120;
   else if(ev.phase==='before_fatal')t=lossCue!==null?lossCue-10-(i%3)*3:ATTACK_START+30+h%100;
   else if(ev.phase==='after_attack')t=Math.max(AFTER,(lossCue||0)+15);
   else t=lossCue!==null?Math.max(ATTACK_START,lossCue-14-(h%10)):ATTACK_START+12+h%(ATTACK_END-ATTACK_START-30);
   out.push(Object.assign({},ev,{at:t,timing:'inferred',seed:h}));
  });
  /* Fires the account says were put out burn only briefly. */
  out.forEach(function(ev){
   if((FIRE_ZONE[ev.kind]||ev.kind==='engine_fire')&&/put out|extinguish|smother|jettison|blew the flames out|transient/i.test((ev.quote||'')+' '+(ev.caveat||'')))ev.until=ev.at+12;
  });
  /* An engine that is later feathered or dead stops burning shortly after. */
  out.forEach(function(ev){
   if(ev.kind!=='engine_fire'||!ev.engine)return;
   var stop=out.filter(function(o){return o.engine===ev.engine&&o.at>ev.at&&(o.kind==='engine_feathered'||o.kind==='engine_dead')&&/out|smother|extinguish/i.test(o.quote||'');})[0];
   if(stop)ev.until=stop.at;
  });
  return out.sort(function(a,b){return a.at-b.at;});
 }

 function emptyState(){
  return {engines:[0,1,2,3].map(function(){return {fire:false,dead:false,feathered:false,windmill:false,runaway:false,missing:false,documented:false};}),
   fires:{},holes:[],glass:{},damaged:{},explosion:false,breakup:false,count:0};
 }
 /* Everything visible at battle cue `cue`. Holes and fires accumulate. */
 function stateAt(events,cue){
  var s=emptyState();
  events.forEach(function(ev){
   if(!(cue>=ev.at))return;
   if(ev.until!==undefined&&cue>=ev.until&&ev.kind==='engine_fire')return;
   s.count++;
   var age=cue-ev.at;
   if(ENGINE_KINDS[ev.kind]&&ev.engine>=1&&ev.engine<=4){
    var e=s.engines[ev.engine-1];
    if(ev.kind==='engine_fire')e.fire=true;
    if(ev.kind==='engine_dead'){e.dead=true;if(!e.feathered)e.windmill=true;}
    if(ev.kind==='engine_feathered'){e.dead=true;e.feathered=true;e.windmill=false;}
    if(ev.kind==='engine_windmilling'){e.dead=true;e.windmill=!e.feathered;}
    if(ev.kind==='prop_runaway')e.runaway=true;
    if(ev.propMissing){e.missing=true;e.dead=true;e.windmill=false;}
    e.documented=e.documented||/^documented/.test(ev.evidence);
    e.age=Math.min(e.age===undefined?age:e.age,age);
   }
   if(FIRE_ZONE[ev.kind]){
    var zone=ev.zone||({flightdeck_fire:'flightdeck',bombbay_fire:'bombbay',waist_fire:'waist'})[ev.kind]||'bombbay';
    if(ev.kind==='wing_fire'&&!ev.zone){s.fires.left_wing=ev;s.fires.right_wing=ev;}
    else s.fires[zone]=ev;
   }
   if(ev.kind==='engine_fire'&&!ev.engine)s.fires[ev.zone||'left_wing']=ev;
   if(/holes?$|_hole$|turret_damage|tail_damage|fin_rudder_damage|wing_fuel_leak/.test(ev.kind)||ev.kind==='explosion'&&ev.phase!=='fatal'){
    s.holes.push({zone:ev.zone||(/fin|tail/.test(ev.kind)?'fin':ev.kind==='wing_hole'?'right_wing':'waist'),
     big:/huge|three-foot|two feet|large|big|gaping|apart|tore away|shot away|carried away|blew the tail|fall through/i.test(ev.quote||''),
     many:/250|300|riddled|whizzing|raked/i.test((ev.quote||'')+(ev.caveat||'')),engine:ev.engine||null,kind:ev.kind,seed:ev.seed,evidence:ev.evidence});
   }
   if(ev.kind==='cockpit_glass')s.glass.flightdeck=ev;
   if(ev.kind==='nose_glass')s.glass.nose=ev;
   if(ev.kind==='turret_damage')s.glass[ev.zone||'tail']=ev;
   if(ev.kind==='fuselage_fire'||ev.kind==='waist_fire')s.damaged[ev.zone||'waist']=true;
   if(ev.kind==='explosion')s.explosion=true;
   if(ev.kind==='structural_breakup')s.breakup=true;
  });
  return s;
 }
 /* Zones a crew station sees from the inside. */
 var STATION_ZONES={pilot:['flightdeck'],copilot:['flightdeck'],radio:['flightdeck','bombbay'],ttop:['flightdeck','bombbay'],
  nav:['nose'],bomb:['nose'],nose:['nose'],ball:['waist'],waistL:['waist'],waistR:['waist'],tail:['tail','waist']};
 function fit(pilot){var f=profile(pilot).fit||{};return {ballTurret:f.ballTurret!==false,h2xDome:!!f.h2xDome,evidence:f.evidence||'default',quote:f.quote||''};}
 var api={schedule:schedule,stateAt:stateAt,fit:fit,profile:profile,STATION_ZONES:STATION_ZONES,hash:hash,ATTACK_START:ATTACK_START,ATTACK_END:ATTACK_END};
 root.KasselAircraftDamage=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
