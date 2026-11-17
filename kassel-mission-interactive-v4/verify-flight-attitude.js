const assert=require('node:assert/strict');
const attitude=require('./flight-attitude.js');
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10);
let cases=0;
for(let i=0;i<10000;i++){
 const v=[Math.sin(i*.71),Math.cos(i*.23),Math.sin(i*.39)];
 const b=attitude.basis(v,i*.17),unit=v.map(x=>x/Math.hypot(...v));
 near(dot(b.forward,unit),1);near(dot(b.up,b.right),0);near(dot(b.forward,b.up),0);near(dot(b.forward,b.right),0);
 [b.forward,b.up,b.right].forEach(a=>near(dot(a,a),1));cases++;
}
for(const v of [[0,1,0],[0,-1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]])near(dot(attitude.basis(v).forward,v),1);
assert.throws(()=>attitude.basis([0,0,0]),/Nonzero/);
console.log(`PASS: ${cases} tangent/bank orientations plus cardinal and vertical cases. Nose follows path tangent, not tail-first. Render geometry only, not aerodynamic validation.`);
