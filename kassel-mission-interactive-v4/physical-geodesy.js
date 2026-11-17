/* WGS 84 geographic/ECEF and local East-Up-South coordinates in METRES.
 * NGA defining ellipsoid constants:
 * https://earth-info.nga.mil/index.php?dir=wgs84&action=wgs84
 * This is coordinate geometry, not aircraft or terrain-data validation.
 * Ellipsoidal height is deliberately distinct from MSL/pressure altitude. */
(function(root,factory){var api=factory();if(typeof module==='object')module.exports=api;else root.KasselPhysicalGeodesy=api;})(typeof window==='object'?window:globalThis,function(){'use strict';
 const a=6378137,f=1/298.257223563,b=a*(1-f),e2=f*(2-f),rad=Math.PI/180;
 const dot=(x,y)=>x.reduce((s,v,i)=>s+v*y[i],0);
 function finiteVector(v){if(!Array.isArray(v)||v.length!==3||v.some(n=>!Number.isFinite(n)))throw Error('Finite three-component vector required');}
 function checkGeo(p){if(!p||![p.latitudeDeg,p.longitudeDeg,p.ellipsoidHeightM].every(Number.isFinite)||Math.abs(p.latitudeDeg)>90||Math.abs(p.longitudeDeg)>180||p.ellipsoidHeightM<=-b)throw Error('Valid latitude, longitude and explicit ellipsoidal height required');}
 function ecef(p){checkGeo(p);const lat=p.latitudeDeg*rad,lon=p.longitudeDeg*rad,s=Math.sin(lat),c=Math.cos(lat),N=a/Math.sqrt(1-e2*s*s),h=p.ellipsoidHeightM;return [(N+h)*c*Math.cos(lon),(N+h)*c*Math.sin(lon),(N*(1-e2)+h)*s];}
 function geographic(v){finiteVector(v);const [x,y,z]=v,p=Math.hypot(x,y);if(Math.hypot(p,z)<1)throw Error('Geographic coordinates undefined near Earth centre');
  const lon=Math.atan2(y,x);if(p<1e-7)return {latitudeDeg:z<0?-90:90,longitudeDeg:lon/rad,ellipsoidHeightM:Math.abs(z)-b};
  let lat=Math.atan2(z,p*(1-e2));for(let i=0;i<25;i++){const s=Math.sin(lat),N=a/Math.sqrt(1-e2*s*s),next=Math.atan2(z+e2*N*s,p);if(Math.abs(next-lat)<1e-14){lat=next;break;}lat=next;}
  const s=Math.sin(lat),c=Math.cos(lat),N=a/Math.sqrt(1-e2*s*s),h=p*c+z*s-N*(1-e2*s*s);return {latitudeDeg:lat/rad,longitudeDeg:lon/rad,ellipsoidHeightM:h};
 }
 function frame(origin){checkGeo(origin);const center=ecef(origin),lat=origin.latitudeDeg*rad,lon=origin.longitudeDeg*rad,s=Math.sin(lat),c=Math.cos(lat),sl=Math.sin(lon),cl=Math.cos(lon);
  const axes=[[-sl,cl,0],[c*cl,c*sl,s],[s*cl,s*sl,-c]];
  function vectorToLocal(v){finiteVector(v);return axes.map(axis=>dot(axis,v));}
  function vectorToECEF(v){finiteVector(v);return [0,1,2].map(i=>axes.reduce((sum,axis,j)=>sum+axis[i]*v[j],0));}
  return {origin:{...origin},axesECEF:axes.map(v=>v.slice()),toLocal:p=>vectorToLocal(ecef(p).map((v,i)=>v-center[i])),
   fromLocal:v=>geographic(vectorToECEF(v).map((n,i)=>n+center[i])),vectorToLocal,vectorToECEF};
 }
 function orthometricToEllipsoid(mslM,geoidUndulationM){if(![mslM,geoidUndulationM].every(Number.isFinite))throw Error('MSL height and measured/modelled geoid undulation are both required');return mslM+geoidUndulationM;}
 function renderVector(metres,metresPerSceneUnit){finiteVector(metres);if(!(metresPerSceneUnit>0&&Number.isFinite(metresPerSceneUnit)))throw Error('One positive uniform scene-unit scale required');return metres.map(v=>v/metresPerSceneUnit);}
 return {ecef,geographic,frame,orthometricToEllipsoid,renderVector,constants:{semiMajorAxisM:a,inverseFlattening:1/f,semiMinorAxisM:b},status:'Coordinate mathematics only; not connected to the legacy exaggerated renderer yet'};
});
