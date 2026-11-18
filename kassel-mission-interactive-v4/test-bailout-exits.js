'use strict';
// Bailout exits (bailout-exits.js): every surviving crewman gets an opening
// and an order. The AAF bail-out poster is the default; a crew account that
// names the opening wins, and each plan says which of the two it rests on.
const assert=require('node:assert');
const BX=require('./bailout-exits.js');
const exits=Object.keys(BX.EXITS);
// the poster, station by station
const P=(r,w,b)=>BX.posterExit(r,w||0,b!==false);
assert.deepStrictEqual([P('Navigator').exit,P('Navigator').order],['nose_wheel',1]);
assert.deepStrictEqual([P('Bombardier').exit,P('Bombardier').order],['nose_wheel',2]);
assert.deepStrictEqual([P('Engineer / top turret').exit,P('Engineer / top turret').order],['bomb_bay_fwd',1]);
assert.deepStrictEqual([P('Radio operator').exit,P('Radio operator').order],['bomb_bay_fwd',2]);
assert.deepStrictEqual([P('Co-pilot').exit,P('Co-pilot').order],['bomb_bay_fwd',3]);
assert.deepStrictEqual([P('Pilot').exit,P('Pilot').order],['bomb_bay_fwd',4]);
assert.deepStrictEqual([P('Ball turret gunner').exit,P('Ball turret gunner').order],['bomb_bay_aft',1]);
assert.deepStrictEqual([P('Right waist gunner',0).exit,P('Waist gunner',0).order],['bomb_bay_aft',2]);
assert.deepStrictEqual([P('Waist gunner',1).exit,P('Waist gunner',1).order],['main_hatch',2]);
assert.deepStrictEqual([P('Tail gunner').exit,P('Tail gunner').order],['main_hatch',1]);
assert.strictEqual(P('Nose turret gunner').evidence,'inferred','no nose turret on the poster');
// every documented exit is a known opening and its man is on that crew
for(const [pilot,list] of Object.entries(BX.DOCUMENTED)){
 for(const d of list){assert.ok(exits.includes(d.exit),pilot+' exit known');assert.ok(d.quote&&d.quote.length>10,pilot+' quote kept');}
}
// the crew story wins over the poster
const miner=BX.plan('Miner',[{n:'Robert Miner',r:'Pilot'},{n:'A. Radio',r:'Radio operator'},{n:'B. Ball',r:'Ball turret gunner'}]);
assert.strictEqual(miner[0].exit,'nose_wheel');assert.strictEqual(miner[0].evidence,'documented');assert.strictEqual(miner[0].poster,'bomb_bay_fwd');
assert.strictEqual(miner[1].exit,'nose_wheel','bomb bay jammed: forward users take the nose wheel');
assert.strictEqual(miner[2].exit,'main_hatch','bomb bay jammed: aft users take the main hatch');
assert.strictEqual(miner[1].evidence,'documented-constraint');
const plain=BX.plan('Nobody',[{n:'C',r:'Navigator'},{n:'D',r:'Tail gunner'}]);
assert.deepStrictEqual(plain.map(p=>[p.exit,p.evidence]),[['nose_wheel','poster'],['main_hatch','poster']]);
// openings drawn on the model exist for every exit except the waist window and a breakup
for(const k of exits)if(!/waist_window|thrown_clear/.test(k))assert.ok(BX.OPENS[k],k+' has an opening to show');
console.log('bailout exits: ok');
