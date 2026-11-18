/* Sperry A-13 reconstruction from AN 11-45G-1, Section II p.2,
 * Figures 2, 3 and 13. Measured envelope: 44-inch ball diameter.
 * Component shapes/window outlines/eyepoint are visual estimates, not CAD.
 * B-24 scene length 33 corresponds to nominal 20.47 m exterior length.
 */
(function(root){'use strict';
 const dimensions={diameterIn:44,openingIn:46.75,retractionIn:28,sceneUnitsPerMeter:33/20.47};
 function build(T){
  var g=new T.Group(),r=dimensions.diameterIn*.0254*.5*dimensions.sceneUnitsPerMeter;
  g.name='Sperry-A13-reference-reconstruction';g.userData.source='AN 11-45G-1, Section II p.2; Figures 2,3,13';g.userData.diameterIn=44;
  var paint=new T.MeshStandardMaterial({color:0x46513b,roughness:.8,metalness:.25,side:T.DoubleSide}),metal=new T.MeshStandardMaterial({color:0x767970,roughness:.42,metalness:.7,side:T.DoubleSide}),black=new T.MeshStandardMaterial({color:0x141918,roughness:.8}),pad=new T.MeshStandardMaterial({color:0x494534,roughness:1}),glass=new T.MeshPhysicalMaterial({color:0xabc3c7,transparent:true,opacity:.06,depthWrite:false,roughness:.07,side:T.DoubleSide});
  [paint,metal,black,pad,glass].forEach(function(m){m.color.convertSRGBToLinear();});
  function mesh(geo,mat,pos){var o=new T.Mesh(geo,mat);if(pos)o.position.set.apply(o.position,pos);g.add(o);return o;}
  function rod(a,b,rad,mat){var av=new T.Vector3().fromArray(a),bv=new T.Vector3().fromArray(b),d=bv.clone().sub(av),o=mesh(new T.CylinderGeometry(rad,rad,d.length(),28),mat,av.clone().add(bv).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
  // Spherical panels with circular forward sighting aperture and side Plexiglas.
  // Longitudes are measured about +X (the direction of the guns).
  function point(lat,lon){return [r*Math.cos(lat)*Math.cos(lon),r*Math.sin(lat),r*Math.cos(lat)*Math.sin(lon)];}
  var arrays={paint:[],glass:[]},latN=80,lonN=160,capAngle=Math.acos(.925);
  function polar(theta,phi){return [r*Math.cos(theta),r*Math.sin(theta)*Math.cos(phi),r*Math.sin(theta)*Math.sin(phi)];}
  function sphereBand(start,end,steps,isFront){for(var a=0;a<steps;a++)for(var b=0;b<lonN;b++){
   var t0=start+a*(end-start)/steps,t1=start+(a+1)*(end-start)/steps,p0=b*Math.PI*2/lonN,p1=(b+1)*Math.PI*2/lonN,mid=polar((t0+t1)/2,(p0+p1)/2),lat=Math.asin(mid[1]/r),lon=Math.atan2(mid[2],mid[0]);
   var side=Math.abs(lon)>.69&&Math.abs(lon)<1.46&&lat>-.78&&lat<.29,out=arrays[isFront||side?'glass':'paint'],v0=polar(t0,p0),v1=polar(t1,p0),v2=polar(t1,p1),v3=polar(t0,p1);
   out.push.apply(out,v0.concat(v2,v1,v0,v3,v2));
  }}
  sphereBand(0,capAngle,16,true);sphereBand(capAngle,Math.PI,latN,false);
  Object.keys(arrays).forEach(function(k){var geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(arrays[k],3));geo.setAttribute('normal',new T.Float32BufferAttribute(arrays[k].map(function(v){return v/r;}),3));mesh(geo,k==='paint'?paint:glass);});
  var sightRadius=r*Math.sqrt(1-.925*.925),rim=mesh(new T.TorusGeometry(sightRadius,.027,12,80),metal,[r*.925,0,0]);rim.rotation.y=Math.PI/2;
  for(var n=0;n<16;n++){var t=n/16*Math.PI*2;mesh(new T.SphereGeometry(.012,8,6),black,[r*.932,Math.sin(t)*(sightRadius+.039),Math.cos(t)*(sightRadius+.039)]);}
  [-1,1].forEach(function(s){
   // Curved window frames follow the sphere rather than a polygonal cone.
   [.69,1.46].forEach(function(lon){for(var j=0;j<18;j++)rod(point(-.78+j*1.07/18,s*lon),point(-.78+(j+1)*1.07/18,s*lon),.015,metal);});
   [-.78,.29].forEach(function(lat){for(var j=0;j<16;j++)rod(point(lat,s*(.69+j*.77/16)),point(lat,s*(.69+(j+1)*.77/16)),.015,metal);});
   // Separate receiver, trunnion, recoil housing, barrel jacket and muzzle.
   var z=s*r*.68;mesh(new T.BoxGeometry(.69,.16,.15),black,[.13,-.02,z]);
   rod([.43,-.02,z],[1.78,-.02,z],.036,metal);rod([1.78,-.02,z],[1.92,-.02,z],.019,black);
   for(var k=0;k<13;k++){var x=.64+k*.079;[-1,1].forEach(function(side){var hole=mesh(new T.CircleGeometry(.012,10),black,[x,-.02,z+side*.0365]);if(side<0)hole.rotation.y=Math.PI;});}
   rod([-.30,-.21,z],[.51,-.21,z],.025,metal);rod([.43,-.21,z],[.43,-.03,z],.025,metal);
   var bell=mesh(new T.CylinderGeometry(.18,.18,.065,40),paint,[0,0,s*(r+.019)]);bell.rotation.x=Math.PI/2;
   var hub=mesh(new T.CylinderGeometry(.063,.063,.09,24),metal,[0,0,s*(r+.05)]);hub.rotation.x=Math.PI/2;
   // Hand grips flank the computing sight; no other crewman inside the station.
   rod([.18,.12,s*.23],[.18,.28,s*.23],.035,black);rod([.18,.11,s*.23],[.06,.08,s*.15],.018,metal);
   rod([.06,.08,s*.15],[.06,-.19,s*.15],.024,metal);
   rod([.06,-.19,s*.15],[.06,-.21,z],.032,metal);
   for(var ringN=0;ringN<9;ringN++){var gripRing=mesh(new T.TorusGeometry(.035,.0025,6,32),black,[.18,.135+ringN*.015,s*.23]);gripRing.rotation.x=Math.PI/2;}
   var handle=mesh(new T.TorusGeometry(.087,.012,8,32),metal,[-.13,.26,s*.64]);handle.rotation.y=Math.PI/2;
   rod([-.13,.26,s*.72],[-.13,.27,s*(r-.027)],.018,metal);
   // Ammunition feed chute, visually shaped from exploded-view component layout.
   var path=new T.CatmullRomCurve3([new T.Vector3(-.25,.46,s*.38),new T.Vector3(-.23,.22,s*.58),new T.Vector3(-.20,.04,z)]);mesh(new T.TubeGeometry(path,24,.026,8,false),metal);
  });
  var seat=mesh(new T.SphereGeometry(1,32,20),pad,[-.43,-.25,0]);seat.scale.set(.24,.08,.36);
  var back=mesh(new T.SphereGeometry(1,32,20),paint,[-.60,-.03,0]);back.scale.set(.065,.36,.35);
  // Computing sight body and padded binocular eyepiece (placement estimated).
  var sightBody=mesh(new T.SphereGeometry(1,40,28),black,[.31,.25,0]);sightBody.scale.set(.115,.125,.10);
  rod([.34,.18,0],[.44,-.17,0],.041,metal);
  rod([.44,-.17,-r*.68],[.44,-.17,r*.68],.025,metal);
  var sightDial=mesh(new T.CylinderGeometry(.047,.047,.018,32),metal,[.31,.21,.103]);sightDial.rotation.x=Math.PI/2;
  var sightKnob=mesh(new T.CylinderGeometry(.019,.019,.030,24),black,[.31,.21,.12]);sightKnob.rotation.x=Math.PI/2;
  [-.045,.045].forEach(function(z){rod([.14,.29,z],[.31,.29,z],.027,black);var cup=mesh(new T.TorusGeometry(.029,.009,12,36),pad,[.14,.29,z]);cup.rotation.y=Math.PI/2;});
  // Rear access door seams, hinges and latch; not a generic passenger seat.
  for(var j=0;j<28;j++){var t=j/28*Math.PI*2,u=(j+1)/28*Math.PI*2;rod([-r*.81,Math.sin(t)*r*.55,Math.cos(t)*r*.55],[-r*.81,Math.sin(u)*r*.55,Math.cos(u)*r*.55],.012,metal);}
  rod([-r*.82,.22,-.1],[-r*.82,.22,.1],.021,metal);
  // Turret set to a modest downward aiming angle. Both eyepoint and sightline
  // rotate with it; this is not an independently floating camera.
  // Five material batches instead of hundreds of component draw calls.
  g.updateMatrixWorld(true);var batches=new Map();g.children.slice().forEach(function(o){if(!o.isMesh)return;var list=batches.get(o.material)||[];list.push(o);batches.set(o.material,list);});
  batches.forEach(function(objects,material){var positions=[],normals=[];objects.forEach(function(o){var geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrix);var p=geo.attributes.position,n=geo.attributes.normal;for(var i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));}geo.dispose();o.geometry.dispose();g.remove(o);});var geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.computeBoundingSphere();mesh(geo,material);});
  var elevation=-.60,c=Math.cos(elevation),s=Math.sin(elevation),eye=[-.36,.13,0];
  g.rotation.z=elevation;
  return {group:g,radiusScene:r,eye:[eye[0]*c-eye[1]*s,eye[0]*s+eye[1]*c,0],look:[c,s,0],dimensions:dimensions};
 }
 var api={build:build,dimensions:dimensions};root.KasselBallTurret=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
