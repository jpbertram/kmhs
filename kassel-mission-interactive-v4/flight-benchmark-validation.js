'use strict';
/* Empirical comparison infrastructure. No aircraft model or acceptance
   tolerances are invented here. Never promoted to whole-aircraft validation. */
const units={ftM:.3048,mphMS:.44704,lbKg:.45359237,hpW:745.6998715822702,inHgPa:3386.389};
function validate(dataset,model,protocol){
 if(!dataset||!dataset.printedPage5LevelFlight)throw new TypeError('Source benchmark dataset required');
 if(!model||typeof model.predictLevelFlight!=='function')throw new TypeError('Predictive aircraft model required');
 if(model.aircraft!==dataset.source.aircraft)throw new Error('Aircraft variant/identity mismatch');
 for(const [key,value] of Object.entries(dataset.configuration))if(key!=='warning'&&model.configuration?.[key]!==value)throw new Error('Configuration mismatch: '+key);
 const rows=dataset.printedPage5LevelFlight.rows;
 const train=protocol?.calibrationRows,test=protocol?.withheldRows,tolerance=protocol?.tolerance;
 if(!Array.isArray(train)||!Array.isArray(test)||!test.length||!tolerance||!protocol.toleranceBasis)throw new TypeError('Explicit partition, tolerances and tolerance basis required');
 const indices=train.concat(test);
 if(new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=rows.length))throw new Error('Disjoint valid calibration/withheld rows required');
 if(![tolerance.speedAbsMS,tolerance.powerPerEngineAbsW].every(v=>Number.isFinite(v)&&v>0))throw new TypeError('Positive finite measurement tolerances required');
 const results=test.map(index=>{
  const [altitudeFt,rpm,manifoldInHg,hp,tasMph,weightLb]=rows[index];
  // Do not hand the model its expected speed or expected power.
  const condition={altitudeM:altitudeFt*units.ftM,rpm,manifoldPressurePa:manifoldInHg*units.inHgPa,massKg:weightLb*units.lbKg,configuration:{...model.configuration}};
  const prediction=model.predictLevelFlight(condition);
  if(!prediction||![prediction.trueAirspeedMS,prediction.powerPerEngineW].every(v=>Number.isFinite(v)&&v>0))throw new Error('Finite positive independent predictions required');
  const observed={trueAirspeedMS:tasMph*units.mphMS,powerPerEngineW:hp*units.hpW};
  const residual={speedMS:prediction.trueAirspeedMS-observed.trueAirspeedMS,powerPerEngineW:prediction.powerPerEngineW-observed.powerPerEngineW};
  return {row:index,condition,observed,prediction,residual,withinDeclaredTolerance:Math.abs(residual.speedMS)<=tolerance.speedAbsMS&&Math.abs(residual.powerPerEngineW)<=tolerance.powerPerEngineAbsW};
 });
 return {scope:'B-24G source-configuration steady level-flight points only',aircraft:model.aircraft,modelVersion:model.version||'UNSPECIFIED',source:dataset.source,protocol,results,
  speedRMSEMS:Math.sqrt(results.reduce((s,r)=>s+r.residual.speedMS**2,0)/results.length),
  allWithinDeclaredTolerance:results.every(r=>r.withinDeclaredTolerance),
  certification:'NONE: does not validate B-24J, dynamics, damage, parachutes, interiors or complete mission reconstruction'};
}
module.exports={validate,units};
