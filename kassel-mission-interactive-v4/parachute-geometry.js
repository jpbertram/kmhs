/* Shared display geometry. Equipment variant, canopy dimensions, cloth
 * deformation and clothing remain reconstruction estimates, not certification.
 *
 * Canopy: a 24-ft flat circular canopy of 28 gores (AN6513 / A-3 family)
 * does not fly as a hemisphere. Inflated it is a flattened dome about two
 * thirds of its flat diameter across, each gore bellied out between its
 * radial seams, the hem scalloped up between the suspension lines and
 * tucked slightly in, with an open apex vent and the small pilot chute
 * riding above it. The suspension lines are about as long as the canopy's
 * flat diameter and gather to four risers that come up from the harness
 * at the shoulders. Proportions are ESTIMATED from photographs of the
 * period, not a pattern drawing.
 *
 * Rig origin: the riser confluence at the harness, ANCHOR below the group
 * origin, is where the opening articulation (parachute-pose.js) pivots,
 * so the canopy streams out and up from the pack rather than swelling
 * from the man's head. */
(function(global){'use strict';
 var GORES=28,ANCHOR=-3.68;
 function build(T){
  if(!global.KasselHistoricalGeometry)throw Error('Airman geometry is required; no placeholder figure is substituted');
  var root=new T.Group(),rig=new T.Group();rig.name='parachute-canopy-rig';root.add(rig);
  var sub=6,rings=22,a=1.95,b=1.2,thV=.15,thS=1.80;
  var riserTop=ANCHOR+.6;
  // skirt about one flat diameter (4.8) of line above the riser tops
  var lift=riserTop+4.1-b*Math.cos(thS);
  function surface(gore,f,j){
   var th=thV+(thS-thV)*j/rings,phi=(gore+f)/GORES*Math.PI*2;
   var belly=1+.055*Math.sin(Math.PI*f)*Math.sin(Math.min(th,Math.PI/2));
   var rad=a*Math.sin(th)*belly,y=b*Math.cos(th)+lift;
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
  // pilot chute: a small dome on a short bridle above the vent
  var apex=b*Math.cos(thV)+lift,pcBase=pos.length/3,pr=.28,pcY=apex+.75;
  for(var pj=0;pj<=6;pj++){
   var pth=pj/6*Math.PI*.55;
   for(var pc=0;pc<16;pc++){
    var pphi=pc/16*Math.PI*2;pos.push(Math.cos(pphi)*Math.sin(pth)*pr,pcY+Math.cos(pth)*pr*.7,Math.sin(pphi)*Math.sin(pth)*pr);col.push(light.r,light.g,light.b);
    if(pj){var q0=pcBase+(pj-1)*16+pc,q1=pcBase+(pj-1)*16+(pc+1)%16,r0=pcBase+pj*16+pc,r1=pcBase+pj*16+(pc+1)%16;idx.push(q0,r0,q1,q1,r0,r1);}
   }
  }
  var geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.setIndex(idx);geo.computeVertexNormals();
  var canopy=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.92,side:T.DoubleSide,transparent:true,opacity:.97}));
  canopy.name='canopy';rig.add(canopy);
  // every line in one draw call: seams, hem, vent band, bridle, suspension lines
  var lp=[],lc=[];
  function seg(p0,p1,colour){lp.push(p0[0],p0[1],p0[2],p1[0],p1[1],p1[2]);lc.push(colour.r,colour.g,colour.b,colour.r,colour.g,colour.b);}
  var seam=new T.Color(0xb3ac9b),band=new T.Color(0x9a937f),cord=new T.Color(0xd2ccb7);
  for(var g2=0;g2<GORES;g2++){
   for(var j2=1;j2<=rings;j2++){var s0=surface(g2,0,j2-1),s1=surface(g2,0,j2);seg([s0[0]*1.004,s0[1]+.004,s0[2]*1.004],[s1[0]*1.004,s1[1]+.004,s1[2]*1.004],seam);}
   for(var k=0;k<sub;k++){
    var nextG=k+1<sub?g2:(g2+1)%GORES,nf=(k+1)%sub/sub;
    seg(surface(g2,k/sub,rings),surface(nextG,nf,rings),band);
    var v0=surface(g2,k/sub,0),v1=surface(nextG,nf,0);seg([v0[0],v0[1]+.003,v0[2]],[v1[0],v1[1]+.003,v1[2]],band);
   }
   var hemPoint=surface(g2,0,rings),quad=Math.atan2(hemPoint[2],hemPoint[0]);if(quad<0)quad+=Math.PI*2;
   var corner=Math.floor(quad/(Math.PI/2))%4;
   seg([hemPoint[0],hemPoint[1]-.005,hemPoint[2]],[[.11,-.11,-.11,.11][corner],riserTop,[.07,.07,-.07,-.07][corner]],cord);
  }
  seg([0,apex,0],[0,pcY,0],cord);
  for(var bl=0;bl<8;bl++){var ba=bl/8*Math.PI*2;seg([Math.cos(ba)*pr*.95,pcY+.05,Math.sin(ba)*pr*.95],[0,apex+.25,0],cord);}
  var lgeo=new T.BufferGeometry();lgeo.setAttribute('position',new T.Float32BufferAttribute(lp,3));lgeo.setAttribute('color',new T.Float32BufferAttribute(lc,3));
  var lines=new T.LineSegments(lgeo,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.85}));lines.name='canopy-lines';rig.add(lines);
  // four risers, one mesh: from the line confluence down to the harness
  // shoulder fittings
  var risers=[];
  [[.11,.07],[-.11,.07],[-.11,-.07],[.11,-.07]].forEach(function(r){
   var from=new T.Vector3(r[0],riserTop,r[1]),to=new T.Vector3(r[0]*.95,ANCHOR-.02,r[1]*.4),d=to.clone().sub(from);
   var g=new T.BoxGeometry(.022,d.length(),.008),m=new T.Matrix4().compose(from.clone().add(to).multiplyScalar(.5),
    new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()),new T.Vector3(1,1,1));
   g.applyMatrix4(m);risers.push(g.index?g.toNonIndexed():g);
  });
  var rp=[],rn=[];risers.forEach(function(g){var p=g.attributes.position,n=g.attributes.normal;for(var i=0;i<p.count;i++){rp.push(p.getX(i),p.getY(i),p.getZ(i));rn.push(n.getX(i),n.getY(i),n.getZ(i));}});
  var rgeo=new T.BufferGeometry();rgeo.setAttribute('position',new T.Float32BufferAttribute(rp,3));rgeo.setAttribute('normal',new T.Float32BufferAttribute(rn,3));
  var riserMesh=new T.Mesh(rgeo,new T.MeshStandardMaterial({color:0xa69a74,roughness:1}));riserMesh.name='risers';rig.add(riserMesh);
  // the man hangs from the shoulder fittings; a pivot there lets him
  // fall face-down before the canopy opens and swing upright under it
  var man=global.KasselHistoricalGeometry.airman(T);man.name='parachuting-airman';man.scale.setScalar(.75);
  var pivot=new T.Group();pivot.name='parachuting-airman-pivot';pivot.position.y=ANCHOR-.02;man.position.y=-4.4-pivot.position.y;
  pivot.add(man);root.add(pivot);root.updateMatrixWorld(true);
  root.userData.feetY=new T.Box3().setFromObject(man).min.y;
  return root;
 }
 var api={build:build,gores:GORES,anchor:ANCHOR};if(typeof module!=='undefined'&&module.exports)module.exports=api;global.KasselParachuteGeometry=api;
})(typeof window!=='undefined'?window:globalThis);
