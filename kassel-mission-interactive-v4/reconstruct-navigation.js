// Research calculation, NOT a certified mission path or aerodynamic solver.
// Spherical direct geodesic; altitude, wind changes and fix error excluded.
'use strict';
function destination(lon,lat,bearing,distanceMetres){
 const rad=Math.PI/180,R=6371008.8,a=lat*rad,b=lon*rad,t=bearing*rad,d=distanceMetres/R;
 const p=Math.asin(Math.sin(a)*Math.cos(d)+Math.cos(a)*Math.sin(d)*Math.cos(t));
 const l=b+Math.atan2(Math.sin(t)*Math.sin(d)*Math.cos(a),Math.cos(d)-Math.sin(a)*Math.sin(p));
 return {lon:((l/rad+540)%360)-180,lat:p/rad};
}
function reverseProject(fix,trackDegrees,speedKnots,minutes){
 if(![fix.lon,fix.lat,trackDegrees,speedKnots,minutes].every(Number.isFinite)||Math.abs(fix.lat)>90||speedKnots<0||minutes<0)throw Error('Invalid navigation input');
 return destination(fix.lon,fix.lat,(trackDegrees+180)%360,speedKnots*1852*minutes/60);
}
if(require.main===module){
 const fix={lon:9+17/60,lat:50+46/60};
 const inferred=reverseProject(fix,245,145,13);
 console.log(JSON.stringify({
  status:'INFERRED, NOT AN OBSERVED ATTACK FIX; NOT RUNTIME GEOMETRY',
  source:'Whitefield replot page 6 and KM Flight Log001.pdf 1016 row',
  transcription:{sourceClock:'1016',latitude:'50-46',longitude:'09-17',review:'Corrected from initial 08-17 reading after full-resolution inspection; subsequent 1020 longitude 09-01 and 1023 longitude 08-50 corroborate westward progression. Fix remains a navigational estimate.'},
  fix,estimatedReturnTrackDegrees:245,estimatedGroundspeedKnots:145,reverseMinutes:13,
  distanceNauticalMiles:145*13/60,inferredAttackPosition:inferred,
  uncertainty:'No numerical confidence bounds supplied by source; spherical approximation excludes fix error and changing track/speed. Do not use crash sites to tune this result.'
 },null,2));
}
module.exports={destination,reverseProject};
