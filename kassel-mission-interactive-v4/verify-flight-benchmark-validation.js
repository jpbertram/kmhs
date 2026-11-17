const assert=require('node:assert/strict'),data=require('./reference/b24g-flight-benchmarks.json'),{validate,units}=require('./flight-benchmark-validation.js');
const protocol={calibrationRows:[0,1,2,3,4,5,6,7],withheldRows:[8,9,10],tolerance:{speedAbsMS:1,powerPerEngineAbsW:100},toleranceBasis:'TEST FIXTURE ONLY, not a measured uncertainty or approved acceptance criterion'};
let calls=0;
// Synthetic fixture checks plumbing only, deliberately predicts badly.
const model={aircraft:data.source.aircraft,configuration:{...data.configuration},version:'synthetic-harness-test',predictLevelFlight(condition){
 assert(!('trueAirspeedMS' in condition));assert(!('powerPerEngineW' in condition));calls++;
 assert(condition.altitudeM===23000*units.ftM);
 return {trueAirspeedMS:100,powerPerEngineW:800000};
}};
const result=validate(data,model,protocol);
assert.equal(calls,3);assert.equal(result.results.length,3);assert.equal(result.allWithinDeclaredTolerance,false);
assert(result.speedRMSEMS>0);assert(result.certification.startsWith('NONE'));
assert.throws(()=>validate(data,{...model,aircraft:'B-24J'},protocol),/mismatch/);
assert.throws(()=>validate(data,{...model,configuration:{...model.configuration,ballTurret:'extended'}},protocol),/Configuration/);
assert.throws(()=>validate(data,model,{...protocol,withheldRows:[0]}),/Disjoint/);
assert.throws(()=>validate(data,model,{...protocol,toleranceBasis:''}),/basis/);
assert.throws(()=>validate(data,{...model,predictLevelFlight:()=>({trueAirspeedMS:NaN,powerPerEngineW:1})},protocol),/predictions/);
console.log('PASS: measured-point input conversion, withheld partition, prediction errors, variant/configuration gates and expected-output isolation. Harness tests only; no aircraft model has passed empirical validation.');
