/* Which opening each crewman bailed out through, and in what order.
 *
 * Default: the AAF Flight Control Command poster "How to Bail Out of the
 * B-24" (Safety Education Division with the AAF School of Applied Tactics):
 *   nose-wheel door        navigator 1, bombardier 2
 *   forward end, bomb bay  flight engineer 1, radio operator 2, co-pilot 3,
 *                          pilot 4 (last to leave the plane)
 *   aft end, bomb bay      ball turret gunner 1, right waist gunner 2
 *                          (alternate: main entrance hatch)
 *   main entrance hatch    tail gunner 1, left waist gunner 2
 * The poster predates nose turrets; on the H and J the nose turret gunner is
 * sent out the nose-wheel door with the navigator and bombardier (inferred).
 *
 * Where a crew account in reference/society-crew-cms-snapshot.json names the
 * opening a man used, the account wins (DOCUMENTED below, quoted).
 *
 * Exits are given in the formation model's plane-local frame (nose +X, up
 * +Y, right +Z), as fractions along the bomb bay etc.; km3d-v3.js finds the
 * skin there. Pure: no THREE, no DOM.
 */
(function(root){
 'use strict';
 var EXITS={
  nose_wheel:{label:'nose-wheel door',x:8.8,side:'belly'},
  bomb_bay_fwd:{label:'forward end of the bomb bay',x:4.1,side:'belly'},
  bomb_bay_aft:{label:'aft end of the bomb bay',x:.5,side:'belly'},
  main_hatch:{label:'main entrance hatch',x:-11.1,side:'belly'},
  waist_window:{label:'waist window',x:-6.5,side:'waist'},
  top_hatch:{label:'top escape hatch',x:4.6,side:'top'},
  thrown_clear:{label:'thrown clear as the ship broke up',x:0,side:'centre'}
 };
 /* the openings that have to be shown open on the model when used */
 var OPENS={nose_wheel:'nose_wheel_doors',bomb_bay_fwd:'bomb_bay_doors',bomb_bay_aft:'bomb_bay_doors',main_hatch:'main_hatch',top_hatch:'top_hatch'};
 function posterExit(role,waistIndex,hasBall){
  var r=String(role||'');
  if(/nose (turret )?gunner/i.test(r))return {exit:'nose_wheel',order:3,evidence:'inferred',note:'The poster has no nose turret; the nose gunner leaves with the navigator and bombardier.'};
  if(/navigator/i.test(r))return {exit:'nose_wheel',order:1,evidence:'poster'};
  if(/bombardier|togglier/i.test(r))return {exit:'nose_wheel',order:2,evidence:'poster'};
  if(/engineer|top turret/i.test(r))return {exit:'bomb_bay_fwd',order:1,evidence:'poster'};
  if(/radio/i.test(r))return {exit:'bomb_bay_fwd',order:2,evidence:'poster'};
  if(/co-?pilot/i.test(r))return {exit:'bomb_bay_fwd',order:3,evidence:'poster'};
  if(/^(pilot|command pilot)$/i.test(r))return {exit:'bomb_bay_fwd',order:4,evidence:'poster'};
  if(/commander|observer|photographer/i.test(r))return {exit:'bomb_bay_fwd',order:3,evidence:'inferred',note:'Rode on the flight deck; leaves with the flight-deck crew.'};
  if(/ball turret/i.test(r))return {exit:'bomb_bay_aft',order:1,evidence:'poster'};
  if(/tail/i.test(r))return {exit:'main_hatch',order:1,evidence:'poster'};
  if(/waist|rail|spare/i.test(r)){
   /* first waist gunner listed takes the right waist, the second the left */
   if(waistIndex===0)return {exit:'bomb_bay_aft',order:hasBall?2:1,evidence:/waist/i.test(r)?'poster':'inferred',note:'Right waist gunner.'};
   return {exit:'main_hatch',order:2+Math.max(0,waistIndex-1),evidence:/waist/i.test(r)?'poster':'inferred',note:'Left waist gunner.'};
  }
  return {exit:'main_hatch',order:3,evidence:'inferred'};
 }
 /* Crew accounts that name the opening. Key: pilot (crew), then a pattern
    for the man's name. */
 var DOCUMENTED={
  Johnson:[{n:/Dowling/,exit:'nose_wheel',quote:'Dowling clipped on his chest chute and rolled out the nose-wheel opening'}],
  Fromm:[{n:/Rackis/,exit:'bomb_bay_fwd',quote:'Radio operator Joseph Rackis and copilot Edward Globis dropped through the bomb bay one behind the other'},
   {n:/Globis/,exit:'bomb_bay_fwd',quote:'Radio operator Joseph Rackis and copilot Edward Globis dropped through the bomb bay one behind the other'}],
  Warman:[{n:/Raymond W\. Ray/,exit:'main_hatch',quote:'landed 15 feet into the aircraft between the waist gunners … opened the escape hatch and rolled out'}],
  Potts:[{n:/Kathol/,exit:'thrown_clear',quote:'Scott was boosting Gerry up when the wing tanks exploded and the ship disintegrated'},
   {n:/Roger L\. Scott/,exit:'thrown_clear',quote:'Scott was boosting Gerry up when the wing tanks exploded and the ship disintegrated'}],
  Miner:[{n:/Miner/,exit:'nose_wheel',quote:'the bomb-bay doors jammed, so he pulled himself out the nose-wheel opening as the plane fell into a spin'}],
  Jones:[{n:/Meier/,exit:'waist_window',quote:'Meier bailed from the waist window'}],
  Donald:[{n:/Weinstein/,exit:'nose_wheel',quote:'out of the nose turret and out the nose wheel hatch'}],
  Golden:[{n:/Stewart/,exit:'main_hatch',quote:'dropped him out through the camera hatch'}],
  Pearson:[{n:/Ralph H\. Pearson/,exit:'bomb_bay_fwd',quote:'Pearson clawed back through the fire to the bomb bay … waved engineer Robert Johnson out ahead of him, and jumped'},
   {n:/Robert D\. Johnson/,exit:'bomb_bay_fwd',quote:'waved engineer Robert Johnson out ahead of him'}],
  Hansen:[{n:/Woodley/,exit:'nose_wheel',quote:'He crawled to the nose-wheel hatch'},
   {n:/Howell/,exit:'main_hatch',quote:'waist gunner S. E. Howell, shot in the chest, was pushed out the rear hatch'}],
  Baynham:[{n:/Boldt/,exit:'bomb_bay_fwd',quote:'I hit the auxiliary bomb door lever. The left two doors opened all the way … and out I went'}]
 };
 /* Crews whose account says the bomb bay could not be used: the men the
    poster sends there go out the nearest other opening instead. */
 var NO_BOMB_BAY={
  Miner:'the bomb-bay doors jammed, so he pulled himself out the nose-wheel opening',
  Potts:'With the bomb bay aflame and its doors jammed, the only way out was up through the top hatch.'
 };
 /* members: the ship's bailout list (crew-list entries {n,r,o}).
    Returns one plan per member, in the same order. */
 function plan(pilot,members,crew){
  var hasBall=(crew||members).some(function(m){return /ball turret/i.test(m.r||'');});
  var waistSeen=0,waistOf=new Map();
  (crew||members).forEach(function(m){if(/waist|rail|spare/i.test(m.r||''))waistOf.set(m.n,waistSeen++);});
  var docs=DOCUMENTED[pilot]||[];
  return members.map(function(m){
   var d=docs.filter(function(q){return q.n.test(m.n||'');})[0];
   var p=posterExit(m.r,waistOf.has(m.n)?waistOf.get(m.n):0,hasBall);
   if(d)return {name:m.n,role:m.r,exit:d.exit,order:p.order,evidence:'documented',quote:d.quote,poster:p.exit};
   if(NO_BOMB_BAY[pilot]&&/^bomb_bay/.test(p.exit)){
    var fwd=p.exit==='bomb_bay_fwd';
    return {name:m.n,role:m.r,exit:fwd?(pilot==='Potts'?'top_hatch':'nose_wheel'):'main_hatch',order:p.order+(fwd?2:0),evidence:'documented-constraint',
     quote:NO_BOMB_BAY[pilot],note:'Bomb bay unusable on this ship; next exit the poster allows.',poster:p.exit};
   }
   return {name:m.n,role:m.r,exit:p.exit,order:p.order,evidence:p.evidence,note:p.note||'',poster:p.exit};
  });
 }
 var api={EXITS:EXITS,OPENS:OPENS,DOCUMENTED:DOCUMENTED,NO_BOMB_BAY:NO_BOMB_BAY,posterExit:posterExit,plan:plan};
 root.KasselBailoutExits=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
