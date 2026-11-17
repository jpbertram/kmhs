const assert=require('node:assert/strict'),geo=require('./physical-geodesy.js');
const p=(latitudeDeg,longitudeDeg,ellipsoidHeightM)=>({latitudeDeg,longitudeDeg,ellipsoidHeightM});
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
assert(distance(geo.ecef(p(0,0,0)),[6378137,0,0])<1e-8);
assert(distance(geo.ecef(p(0,90,0)),[0,6378137,0])<1e-8);
assert(distance(geo.ecef(p(90,0,0)),[0,0,6356752.314245179])<1e-7);
let cases=0;
for(const lat of [-90,-89.999,-60,-10,0,51.31,52.454,80,89.999,90])for(const lon of [-179,-90,0,9.49,179])for(const h of [-400,0,7010.4,23000]){
 const a=p(lat,lon,h),e=geo.ecef(a),round=geo.geographic(e);assert(distance(geo.ecef(round),e)<.00001,'ECEF round trip must be within 0.01 mm');assert(Math.abs(round.ellipsoidHeightM-h)<.00001);cases++;
}
const origin=p(51.31,9.49,0),frame=geo.frame(origin),axes=frame.axesECEF;
const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
for(let i=0;i<3;i++)for(let j=0;j<3;j++)assert(Math.abs(dot(axes[i],axes[j])-(i===j?1:0))<1e-12);
assert(distance(cross(axes[0],axes[1]),axes[2])<1e-12,'East × Up must be South');
assert(distance(frame.toLocal(origin),[0,0,0])<1e-8);
assert(distance(frame.toLocal(p(51.31,9.49,100)),[0,100,0])<1e-8);
assert(frame.toLocal(p(51.32,9.49,0))[2]<0,'North is negative scene Z');
assert(frame.toLocal(p(51.31,9.50,0))[0]>0,'East is positive scene X');
for(const point of [p(52.454,1.159,0),p(51.1,9.95,7000),p(51.31,9.49,-20)])assert(distance(geo.ecef(frame.fromLocal(frame.toLocal(point))),geo.ecef(point))<.00001);
assert.deepEqual(geo.renderVector([100,200,300],10),[10,20,30]);
assert.equal(geo.orthometricToEllipsoid(7000,45),7045);assert.throws(()=>geo.orthometricToEllipsoid(7000));
assert.throws(()=>geo.ecef(p(91,0,0)));assert.throws(()=>geo.renderVector([1,2,3],0));
console.log(`PASS: ${cases} WGS 84 cases, equator/poles, 0.01-mm round trips, right-handed metric frame, mission-area points, uniform rendering scale and explicit height-datum gate. Not aerodynamic validation.`);
