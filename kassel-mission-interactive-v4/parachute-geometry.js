/* Shared display geometry. Equipment variant, canopy dimensions, cloth
 * deformation and clothing remain reconstruction estimates, not certification. */
(function(global){'use strict';
 function build(T){
  if(!global.KasselHistoricalGeometry)throw Error('Airman geometry is required; no placeholder figure is substituted');
  var root=new T.Group(),rig=new T.Group();rig.name='parachute-canopy-rig';root.add(rig);
  var vent=.075;
  var canopy=new T.Mesh(new T.SphereGeometry(2.4,64,24,0,Math.PI*2,vent,Math.PI*.52-vent),new T.MeshStandardMaterial({color:0xe8e4da,roughness:.93,side:T.DoubleSide,transparent:true,opacity:.96}));canopy.name='canopy';rig.add(canopy);
  var lines=[],seams=[];
  for(var k=0;k<24;k++){
   var angle=k*Math.PI/12;lines.push(new T.Vector3(Math.cos(angle)*2.395,-.15,Math.sin(angle)*2.395),new T.Vector3(Math.cos(angle)*.13,-3.68,Math.sin(angle)*.10));
   var previous;
   for(var j=0;j<=20;j++){var a=vent+j/20*(Math.PI*.52-vent),p=new T.Vector3(Math.cos(angle)*Math.sin(a)*2.405,Math.cos(a)*2.405,Math.sin(angle)*Math.sin(a)*2.405);if(previous)seams.push(previous,p);previous=p;}
  }
  rig.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(seams),new T.LineBasicMaterial({color:0xbcb9ac,transparent:true,opacity:.4})));
  rig.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(lines),new T.LineBasicMaterial({color:0xb9b4a6,transparent:true,opacity:.8})));
  var man=global.KasselHistoricalGeometry.airman(T);man.name='parachuting-airman';man.scale.setScalar(.75);man.position.y=-4.4;root.add(man);root.updateMatrixWorld(true);
  root.userData.feetY=new T.Box3().setFromObject(man).min.y;
  return root;
 }
 var api={build:build};if(typeof module!=='undefined'&&module.exports)module.exports=api;global.KasselParachuteGeometry=api;
})(typeof window!=='undefined'?window:globalThis);
