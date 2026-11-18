'use strict';
// How damage looks (aircraft-damage-visuals.js): the layout turns each ship's
// recorded state into skin features deterministically, fits the shader's
// feature budget, puts nothing where no damage is recorded, and the shader
// patch and geometry builders produce valid output.
const assert=require('node:assert');
require('./aircraft-damage-data.js');const D=require('./aircraft-damage.js');const VX=require('./aircraft-damage-visuals.js');
const T=require('../tmp/three-r128.js');
// a synthetic skin: fuselage, wing and fin samples in the plane-local frame
function pts(x0,x1,y,z,n){const out=[];for(let i=0;i<12;i++)out.push({p:{x:x0+(x1-x0)*i/11,y,z},n});return out;}
const side={x:0,y:0,z:-1},up={x:0,y:1,z:0};
const surf={props:[{x:6,y:0,z:-12.3},{x:6.4,y:-.2,z:-5.3},{x:6.4,y:-.2,z:5.3},{x:6,y:0,z:12.3}],
 nose:pts(10.8,13.4,0,-1,side),flightdeck:pts(5.6,9.6,0,-1.6,side),bombbay:pts(-.4,4.8,-.5,-1.7,side),waist:pts(-9.2,-2.4,0,-1.7,side),tail:pts(-17,-10.4,0,-1.2,side),
 fin:pts(-17.6,-16.2,2,-6.4,side),left_wing:pts(-1.5,3.5,.5,-8,up),right_wing:pts(-1.5,3.5,.5,8,up)};
const prof=global.KasselAircraftDamageData.profiles;
let featured=0;
for(const pilot of Object.keys(prof)){
 const ev=D.schedule(pilot,'b',150),st=D.stateAt(ev,400);
 const a=VX.layout(surf,st,ev,400,pilot),b=VX.layout(surf,st,ev,400,pilot);
 assert.deepStrictEqual(a,b,pilot+' layout is deterministic');
 for(const e of a.entries){
  assert.ok(e.type>=0&&e.type<=5,pilot+' feature type');
  assert.ok(isFinite(e.c.x)&&isFinite(e.c.y)&&isFinite(e.c.z)&&e.r>0,pilot+' feature placed');
 }
 for(let i=1;i<a.entries.length;i++)assert.ok(a.entries[i-1].prio>=a.entries[i].prio,pilot+' most important features first');
 if(a.entries.length)featured++;
 // nothing shows before the battle
 const early=D.stateAt(ev,0);assert.strictEqual(VX.layout(surf,early,ev,0,pilot).entries.length,0,pilot+' clean before the battle');
}
assert.ok(featured>25,'most recorded ships show damage');
// shader patch keeps the original material and carries its own uniforms
const base=new T.MeshStandardMaterial({color:0x445533});
const m=VX.patchSkin(T,base,24,new T.Matrix4());
assert.notStrictEqual(m,base);assert.strictEqual(m.userData.kmDamage.kmA.value.length,24);
const sh={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
m.onBeforeCompile(sh);
assert.ok(/kmCut/.test(sh.fragmentShader)&&/discard/.test(sh.fragmentShader),'holes cut the skin');
assert.ok(/vKmP=/.test(sh.vertexShader),'plane-local position passed to the fragment shader');
const n=VX.setEntries(m,[{type:0,c:{x:1,y:2,z:3},r:.1,b:[0,1,1]}]);assert.strictEqual(n,1);assert.strictEqual(m.userData.kmDamage.kmCount.value,1);
// petals, structure and liner geometry
const pg=VX.petalGeometry(T,[{p:{x:0,y:0,z:0},n:up,r:.4,out:true,seed:7,big:true}]);assert.ok(pg&&pg.attributes.position.count>0&&pg.attributes.color);
const bg=VX.barGeometry(T,[{p:{x:0,y:0,z:0},n:up,r:.4,seed:3}]);assert.ok(bg&&bg.attributes.position.count>0);
const tris=new Float32Array([-1,0,-1, 1,0,-1, 0,0,1]);
const lg=VX.linerGeometry(T,tris,[{type:0,c:{x:0,y:0,z:0},r:.4,b:[0,0,1],n:up}]);
assert.ok(lg&&Math.abs(lg.attributes.position.getY(0)+.098)<.01,'liner sits just inside the skin');
const mask=VX.holeMask(T);assert.strictEqual(mask.image.width,256);
console.log('aircraft damage visuals: '+featured+' ships laid out; shader, petals, structure and liner OK');
