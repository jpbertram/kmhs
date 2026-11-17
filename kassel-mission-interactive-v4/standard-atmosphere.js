(function(root){
 'use strict';
 // US Standard Atmosphere 1976, lower troposphere only. Not historical weather.
 const constants=Object.freeze({earthRadiusM:6356766,g0MS2:9.80665,T0K:288.15,p0Pa:101325,RStar:8314.32,molarMassKgKmol:28.9644,gamma:1.4,lapseKM:-.0065});
 const R=constants.RStar/constants.molarMassKgKmol;
 function check(h){if(!Number.isFinite(h)||h<0||h>11000)throw new RangeError('Geopotential height must be within 0–11000 metres');}
 function atGeopotentialM(h){
  check(h);
  const temperatureK=constants.T0K+constants.lapseKM*h;
  const pressurePa=constants.p0Pa*Math.pow(temperatureK/constants.T0K,-constants.g0MS2/(R*constants.lapseKM));
  return {geopotentialHeightM:h,temperatureK,pressurePa,densityKgM3:pressurePa/(R*temperatureK),speedOfSoundMS:Math.sqrt(constants.gamma*R*temperatureK)};
 }
 function atGeometricMSLM(z){
  if(!Number.isFinite(z)||z<0)throw new RangeError('Finite nonnegative geometric mean-sea-level height required');
  const r=constants.earthRadiusM,h=r*z/(r+z),state=atGeopotentialM(h);
  return {...state,geometricMSLHeightM:z,gravityMS2:constants.g0MS2*Math.pow(r/(r+z),2)};
 }
 const api={constants,specificGasConstantJkgK:R,atGeopotentialM,atGeometricMSLM,status:'Idealized 1976 standard troposphere, not reconstructed mission weather. MSL height is not WGS84 ellipsoid height. Not connected to legacy mission animation.'};
 root.KasselStandardAtmosphere=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
