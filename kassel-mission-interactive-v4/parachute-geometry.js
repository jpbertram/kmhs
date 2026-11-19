/* Shared display geometry. Equipment variant, canopy dimensions, cloth
 * deformation and clothing remain reconstruction estimates, not certification.
 *
 * Canopy: a 24-ft flat circular canopy of 28 gores (AN6513 / A-3 family)
 * does not fly as a hemisphere. Inflated it is a flattened dome about two
 * thirds of its flat diameter across, each gore bellied out between its
 * radial seams, the hem scalloped up between the suspension lines and
 * tucked slightly in, with an open apex vent. The 28 lines gather to four
 * risers at the harness. Proportions are ESTIMATED from photographs of
 * inflated canopies of the period, not a pattern drawing. */
(function(global){'use strict';
 var GORES=28;
 function build(T){
  if(!global.KasselHistoricalGeometry)throw Error('Airman geometry is required; no placeholder figure is substituted');
  var root=new T.Group(),rig=new T.Group();rig.name='parachute-canopy-rig';root.add(rig);
  var sub=6,rings=22,a=1.95,b=1.2,thV=.15,thS=1.80;
  // the skirt sits about .35 below the old hemisphere's rim; the riser
  // anchor (-3.68) is unchanged so the opening articulation still pivots
  // at the harness
  var lift=.15;
  function surface(gore,f,j){
   var th=thV+(thS-thV)*j/rings,phi=(gore+f)/GORES*Math.PI*2;
   var belly=1+.055*Math.sin(Math.PI*f)*Math.sin(Math.min(th,Math.PI/2));
   var rad=a*Math.sin(th)*belly,y=b*Math.cos(th)+lift;
   // scalloped hem: the cloth rises between the lines at the skirt
   var hem=Math.pow(j/rings,8);y+=.17*Math.sin(Math.PI*f)*hem;rad-=.06*Math.sin(Math.PI*f)*hem;
   return [Math.cos(phi)*rad,y,Math.sin(phi)*rad];
  }
  var pos=[],col=[],idx=[],cols=GORES*sub;
  var light=new T.Color(0xf1ede2),shade=new T.Color(0xd8d2c2),hemTone=new T.Color(0xcac3b1);
  for(var j=0;j<=rings;j++){
   for(var c=0;c<cols;c++){
    var gore=Math.floor(c/sub),f=(c%sub)/sub,p=surface(gore,f,j);
    pos.push(p[0],p[1],p[2]);
    var tone=(gore&1?shade:light).clone().lerp(hemTone,Math.pow(j/rings,3)*.6);
    col.push(tone.r,tone.g,tone.b);
    if(j){var a0=(j-1)*cols+c,a1=(j-1)*cols+(c+1)%cols,b0=j*cols+c,b1=j*cols+(c+1)%cols;idx.push(a0,b0,a1,a1,b0,b1);}
   }
  }
  var geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.setIndex(idx);geo.computeVertexNormals();
  var canopy=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.92,side:T.DoubleSide,transparent:true,opacity:.97}));
  canopy.name='canopy';rig.add(canopy);
  // radial seams, the vent band and the reinforced hem
  var seams=[],hemLine=[],vent=[];
  for(var g2=0;g2<GORES;g2++){
   var prev=null;
   for(var j2=0;j2<=rings;j2++){var q=surface(g2,0,j2),v=new T.Vector3(q[0]*1.004,q[1]+.004,q[2]*1.004);if(prev)seams.push(prev,v);prev=v;}
   for(var k=0;k<sub;k++){
    var h0=surface(g2,k/sub,rings),h1=surface(k+1<sub?g2:g2+1,(k+1)%sub/sub,rings);
    hemLine.push(new T.Vector3(h0[0],h0[1],h0[2]),new T.Vector3(h1[0],h1[1],h1[2]));
    var v0=surface(g2,k/sub,0),v1=surface(k+1<sub?g2:g2+1,(k+1)%sub/sub,0);
    vent.push(new T.Vector3(v0[0],v0[1]+.003,v0[2]),new T.Vector3(v1[0],v1[1]+.003,v1[2]));
   }
  }
  var seamMat=new T.LineBasicMaterial({color:0xa9a291,transparent:true,opacity:.55});
  rig.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(seams),seamMat));
  rig.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(hemLine.concat(vent)),new T.LineBasicMaterial({color:0x9a937f})));
  // suspension lines: seven to each of four riser tops; risers to the harness
  var lines=[],anchor=-3.68,riserTop=anchor+.55;
  var tops=[[-.11,riserTop,.07],[.11,riserTop,.07],[.11,riserTop,-.07],[-.11,riserTop,-.07]];
  for(var g3=0;g3<GORES;g3++){
   var s0=surface(g3,0,rings),ang=Math.atan2(s0[2],s0[0]),quad=ang<0?ang+Math.PI*2:ang;
   var t=tops[Math.floor(quad/(Math.PI/2))%4];
   // quadrant order matches the riser corners: +x+z, -x+z, -x-z, +x-z
   var corner=Math.floor(quad/(Math.PI/2))%4,tx=[.11,-.11,-.11,.11][corner],tz=[.07,.07,-.07,-.07][corner];
   lines.push(new T.Vector3(s0[0],s0[1]-.005,s0[2]),new T.Vector3(tx,t[1],tz));
  }
  rig.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(lines),new T.LineBasicMaterial({color:0xc4bea9,transparent:true,opacity:.85})));
  var webbing=new T.MeshStandardMaterial({color:0xa69a74,roughness:1});
  [[.11,.07],[-.11,.07],[-.11,-.07],[.11,-.07]].forEach(function(r){
   var from=new T.Vector3(r[0],riserTop,r[1]),to=new T.Vector3(r[0]*.95,anchor-.02,r[1]*.4),d=to.clone().sub(from);
   var strap=new T.Mesh(new T.BoxGeometry(.022,d.length(),.008),webbing);
   strap.position.copy(from).add(to).multiplyScalar(.5);
   strap.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());rig.add(strap);
  });
  var man=global.KasselHistoricalGeometry.airman(T);man.name='parachuting-airman';man.scale.setScalar(.75);man.position.y=-4.4;root.add(man);root.updateMatrixWorld(true);
  root.userData.feetY=new T.Box3().setFromObject(man).min.y;
  return root;
 }
 var api={build:build,gores:GORES};if(typeof module!=='undefined'&&module.exports)module.exports=api;global.KasselParachuteGeometry=api;
})(typeof window!=='undefined'?window:globalThis);
