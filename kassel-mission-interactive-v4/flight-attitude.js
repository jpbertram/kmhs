/* Render attitude only, not aerodynamic forces. All normalized assets nose +X.
 * Heading/pitch follow the instantaneous path tangent, including seek/pause.
 */
(function(root){'use strict';
 function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
 function unit(v){var n=Math.hypot.apply(Math,v);if(!(n>1e-10))throw new Error('Nonzero flight tangent required');return v.map(function(x){return x/n;});}
 function basis(velocity,bank){var x=unit(velocity),ref=Math.abs(x[1])>.995?[0,0,1]:[0,1,0],z=unit(cross(x,ref)),y=cross(z,x),c=Math.cos(bank||0),s=Math.sin(bank||0);
  return {forward:x,up:y.map(function(v,i){return v*c+z[i]*s;}),right:z.map(function(v,i){return v*c-y[i]*s;})};
 }
 function apply(T,mesh,velocity,bank){var b=basis([velocity.x,velocity.y,velocity.z],bank),matrix=new T.Matrix4();matrix.makeBasis(new T.Vector3().fromArray(b.forward),new T.Vector3().fromArray(b.up),new T.Vector3().fromArray(b.right));mesh.quaternion.setFromRotationMatrix(matrix);}
 function coordinatedBank(a,b,c,speedMps){
  if(![a.lon,a.lat,b.lon,b.lat,c.lon,c.lat,speedMps].every(Number.isFinite)||speedMps<0)throw Error('Finite geographic points and nonnegative speed required');
  var scale=111195,cos=Math.cos(b.lat*Math.PI/180);
  var x1=(b.lon-a.lon)*scale*cos,y1=(b.lat-a.lat)*scale;
  var x2=(c.lon-b.lon)*scale*cos,y2=(c.lat-b.lat)*scale;
  var cross=x1*y2-y1*x2,den=Math.hypot(x1,y1)*Math.hypot(x2,y2)*Math.hypot(x1+x2,y1+y2);
  var curvature=den>1e-10?-2*cross/den:0;
  return Math.atan(speedMps*speedMps*curvature/9.80665)||0;
 }
 var api={basis:basis,apply:apply,coordinatedBank:coordinatedBank};root.KasselFlightAttitude=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
