const assert=require('node:assert/strict'),a=require('./standard-atmosphere.js');
const near=(x,y,t=1e-9)=>assert(Math.abs(x-y)<=t,`${x} != ${y}`);
const sea=a.atGeopotentialM(0);near(sea.pressurePa,101325);near(sea.temperatureK,288.15);
near(sea.densityKgM3,101325/(a.specificGasConstantJkgK*288.15));
near(a.atGeopotentialM(11000).temperatureK,216.65);
for(let h=10;h<11000;h+=37){
 const s=a.atGeopotentialM(h),plus=a.atGeopotentialM(h+.01),minus=a.atGeopotentialM(h-.01);
 near((plus.pressurePa-minus.pressurePa)/.02,-a.constants.g0MS2*s.densityKgM3,1e-6);
 assert(s.pressurePa<sea.pressurePa&&s.densityKgM3>0);
 const z=a.constants.earthRadiusM*h/(a.constants.earthRadiusM-h);
 near(a.atGeometricMSLM(z).geopotentialHeightM,h,1e-8);
}
for(const h of [-1,11001,NaN,Infinity])assert.throws(()=>a.atGeopotentialM(h),RangeError);
assert.throws(()=>a.atGeometricMSLM(12000),RangeError);
console.log('PASS: standard sea-level constants, tropospheric lapse rate, hydrostatic derivative, geometric/geopotential round trips and domain rejection. Numerical checks, not aircraft or historical weather validation.');
