'use strict';
// Recorded battle damage: every roster ship has a profile, every event is
// renderable and sourced, and the state only accumulates as the battle runs.
const assert=require('node:assert'),fs=require('node:fs');
require('./aircraft-damage-data.js');const D=require('./aircraft-damage.js');
const src=fs.readFileSync(__dirname+'/km3d-v3.js','utf8'),seg=src.slice(src.indexOf('V2.ROSTER=['));
const roster=[...seg.slice(0,seg.indexOf('];')).matchAll(/p:'([^']+)'[^{}]*?fate:'(\w)'(?:,ft:(\d+))?/g)].map(m=>({p:m[1],fate:m[2],ft:m[3]?+m[3]:null}));
assert.strictEqual(roster.length,35);
const kinds=new Set(['engine_fire','engine_dead','engine_feathered','engine_windmilling','prop_runaway','wing_fire','wing_hole','wing_fuel_leak','fuselage_holes','fuselage_fire','flightdeck_fire','bombbay_fire','waist_fire','cockpit_glass','nose_glass','turret_damage','tail_damage','fin_rudder_damage','control_cables','oxygen_out','hydraulics_out','interphone_out','radio_out','explosion','structural_breakup']);
let documented=0,total=0;
for(const r of roster){
 const prof=global.KasselAircraftDamageData.profiles[r.p];assert.ok(prof,'profile for '+r.p);
 assert.strictEqual(D.fit(r.p).ballTurret,false,r.p+' flew without a ball turret');
 for(const e of prof.events){
  total++;assert.ok(kinds.has(e.kind),r.p+' kind '+e.kind);
  assert.ok(/^(documented|documented-engine-inferred|inferred)$/.test(e.evidence),r.p+' evidence');
  if(e.evidence!=='inferred'){documented++;assert.ok(e.quote&&e.quote.length>4,r.p+' documented event needs its quote');}
  else assert.ok(e.inference||e.quote,r.p+' inferred event needs a reason');
  if(e.engine!=null)assert.ok(e.engine>=1&&e.engine<=4,r.p+' engine number');
 }
 const ev=D.schedule(r.p,r.fate,r.ft);let last=-1;
 for(let cue=0;cue<=420;cue+=5){const s=D.stateAt(ev,cue);assert.ok(s.count>=last||ev.some(e=>e.until!==undefined),r.p+' damage never disappears');last=s.count;}
 for(const e of ev){assert.ok(Number.isFinite(e.at)&&e.timing==='inferred');if(r.fate==='r'&&r.ft!=null&&e.phase!=='after_attack')assert.ok(e.at<=r.ft,r.p+' damage before its loss');}
}
assert.ok(D.fit('Chilton').h2xDome,'PFF lead carries the H2X dome');
assert.ok(D.stateAt(D.schedule('Krivik','b',190),400).engines[2].missing,'Krivik No. 3 prop shot off');
console.log(`PASS recorded battle damage: ships=35 events=${total} documented=${documented} inferred=${total-documented}; timing inferred, visuals not covered`);
