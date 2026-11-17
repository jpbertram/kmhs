const assert=require('node:assert/strict'),aero=require('./aerodynamic-loads.js'),physics=require('./flight-dynamics-core.js');
const near=(x,y)=>assert(Math.abs(x-y)<1e-8,`${x} != ${y}`);
const coefficients=()=>({CL:1,CD:.1,CY:0,CrollX:0,CyawY:0,CpitchZ:0});
const base={velocityBodyMS:[100,0,0],angularVelocityBodyRadS:[0,0,0],densityKgM3:1,areaM2:10,spanM:5,chordM:2,referenceFromCGM:[0,0,0],coefficients};
const level=aero.loads(base);near(level.dynamicPressurePa,5000);near(level.forceBodyN[0],-5000);near(level.forceBodyN[1],50000);near(level.forceBodyN[2],0);
for(let i=0;i<1000;i++){
 const v=[50+Math.sin(i)*20,Math.cos(i*.23)*10,Math.sin(i*.31)*15];
 const result=aero.loads({...base,velocityBodyMS:v});
 near(result.aerodynamicPowerW,-.1*result.dynamicPressurePa*10*Math.hypot(...v));
}
const shifted=aero.loads({...base,referenceFromCGM:[1,0,0]});near(shifted.momentBodyNm[2],50000);
const yaw=aero.loads({...base,coefficients:()=>({...coefficients(),CyawY:.2})});near(yaw.momentBodyNm[1],50000);
const zero=aero.loads({...base,velocityBodyMS:[0,0,0]});assert.deepEqual(zero.forceBodyN,[0,0,0]);
const body={massKg:2,inertiaKgM2:[[2,0,0],[0,3,0],[0,0,4]]};
const initial={positionM:[0,500,0],velocityMS:[10,0,0],orientationXYZW:[0,0,0,1],angularVelocityRadS:[0,0,0]};
const result=physics.integrate(initial,1,body,(t,s)=>aero.loads({...base,velocityBodyMS:s.velocityMS,areaM2:.01,coefficients:()=>({...coefficients(),CL:0})}),{gravityMS2:[0,0,0]});
assert(result.velocityMS[0]<10,'Aerodynamic drag must decelerate the rigid-body solver');
assert.throws(()=>aero.loads({...base,coefficients:()=>({CL:1})}),/Complete/);
assert.throws(()=>aero.loads({...base,densityKgM3:NaN}));
const geometry={areaM2:10,spanM:5,chordM:2,referenceFromCGM:[0,0,0]};
const callback=aero.forceCallback(physics,geometry,()=>({windWorldMS:[5,0,0],densityKgM3:1}),()=>({...coefficients(),CL:0}),()=>({forceBodyN:[0,0,0],momentBodyNm:[0,0,0]}));
const windLoad=callback(0,initial);near(windLoad.forceBodyN[0],-12.5);
const yawed={...initial,orientationXYZW:[0,Math.sin(Math.PI/4),0,Math.cos(Math.PI/4)],velocityMS:[0,0,-10]};
const still=aero.forceCallback(physics,geometry,()=>({windWorldMS:[0,0,0],densityKgM3:1}),()=>({...coefficients(),CL:0}),()=>({forceBodyN:[0,0,0],momentBodyNm:[0,0,0]}));
const yawedLoad=still(0,yawed);near(yawedLoad.forceBodyN[0],-50);near(yawedLoad.forceBodyN[2],0);
assert.throws(()=>aero.forceCallback(physics,geometry,()=>({}),coefficients,null),/explicit/);
console.log('PASS: SI dynamic pressure/load magnitudes, 1,000 drag-power transforms, reference-to-CG moments, zero speed, invalid coefficient gates and rigid-body drag integration. Synthetic coefficients only; no empirical aircraft validation.');
