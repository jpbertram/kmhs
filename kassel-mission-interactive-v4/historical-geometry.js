/* Replacement silhouettes, not certified aircraft drawings or likenesses.
 * Bf 109 G-family proxy: +X nose, 14.5 length, 16.1 span in B-24 scene units.
 * Airmen: neutral human proportions, clothed and harnessed; no fictional faces.
 */
(function(global){'use strict';
 function linearize(root){var seen=new Set();root.traverse(function(o){var m=o.material;if(m&&m.color&&!seen.has(m)){seen.add(m);m.color.convertSRGBToLinear();}});return root;}
 function batchStatic(T,root){
  var groups=new Map();root.updateMatrixWorld(true);
  root.children.slice().forEach(function(o){if(!o.isMesh||Array.isArray(o.material))return;var list=groups.get(o.material)||[];list.push(o);groups.set(o.material,list);});
  groups.forEach(function(objects,material){if(objects.length<2)return;var positions=[],normals=[];
   objects.forEach(function(o){var geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrix);var p=geo.attributes.position,n=geo.attributes.normal;
    for(var i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));}geo.dispose();o.geometry.dispose();root.remove(o);});
   var merged=new T.BufferGeometry();merged.setAttribute('position',new T.Float32BufferAttribute(positions,3));merged.setAttribute('normal',new T.Float32BufferAttribute(normals,3));var mesh=new T.Mesh(merged,material);mesh.name='airman-material-batch';root.add(mesh);
  });return root;
 }
 function loft(T,rings,axis,material,segments){
  var p=[],ix=[],n=segments||32;
  rings.forEach(function(r,ri){for(var j=0;j<n;j++){var a=j/n*Math.PI*2,one=Math.cos(a)*r[1],two=Math.sin(a)*r[2];if(axis==='x')p.push(r[0],two+(r[3]||0),one);else p.push(one,r[0],two+(r[3]||0));
   if(ri){var a0=(ri-1)*n+j,a1=(ri-1)*n+(j+1)%n,b0=ri*n+j,b1=ri*n+(j+1)%n;ix.push(a0,b0,a1,a1,b0,b1);}}});
  var geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setIndex(ix);geo.computeVertexNormals();return new T.Mesh(geo,material);
 }
 global.KasselHistoricalGeometry={
  fighter:function(T){
   var g=new T.Group();g.name='Bf-109-G-family-reconstruction';g.userData.geometryProvenance='G-family dimensional proxy; not subtype-certified';
   var paint=new T.MeshStandardMaterial({color:0x515950,roughness:.86,metalness:.12}),dark=new T.MeshStandardMaterial({color:0x282d2c,roughness:.8}),light=new T.MeshStandardMaterial({color:0x879495,roughness:.8}),glass=new T.MeshPhysicalMaterial({color:0xc0d4d8,opacity:.18,transparent:true,depthWrite:false,side:T.DoubleSide,roughness:.09});
   function add(geo,mat,pos){var m=new T.Mesh(geo,mat);if(pos)m.position.set.apply(m.position,pos);g.add(m);return m;}
   function rod(a,b,r,mat){var av=new T.Vector3().fromArray(a),bv=new T.Vector3().fromArray(b),d=bv.clone().sub(av);var m=add(new T.CylinderGeometry(r,r,d.length(),12),mat,av.clone().add(bv).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;}
   var body=loft(T,[[-7.2,.012,.025],[-6.8,.13,.19],[-5.8,.22,.30],[-4.6,.32,.43],[-3,.43,.55],[-1.6,.52,.61],[0,.61,.64],[1.5,.61,.60],[2.5,.59,.58],[4,.53,.55],[5.7,.44,.46],[6.2,.36,.38]],'x',paint,48);g.add(body);
   // Elliptical cross-sections, swept/tapered wing planform, rounded tips.
   function wing(points,y,thickness,mat){var shape=new T.Shape();points.forEach(function(p,i){if(i)shape.lineTo(p[0],p[1]);else shape.moveTo(p[0],p[1]);});shape.closePath();var geo=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:2,steps:1});geo.rotateX(Math.PI/2);return add(geo,mat,[0,y,0]);}
   wing([[2.1,-.5],[.85,-6.9],[.43,-7.85],[.05,-8.05],[-.68,-8.0],[-1.0,-7.65],[-1.25,-.5],[-1.25,.5],[-1,7.65],[-.68,8.0],[.05,8.05],[.43,7.85],[.85,6.9],[2.1,.5]],-.16,.11,paint);
   wing([[-4.95,-.15],[-5.8,-2.45],[-6.25,-2.65],[-6.8,-2.52],[-7.0,-.15],[-7,.15],[-6.8,2.52],[-6.25,2.65],[-5.8,2.45],[-4.95,.15]],.06,.07,paint);
   var finShape=new T.Shape();finShape.moveTo(-7.1,.05);finShape.lineTo(-6.7,1.65);finShape.quadraticCurveTo(-6.55,2.02,-6.15,1.90);finShape.lineTo(-5.5,.88);finShape.lineTo(-5.1,.14);finShape.closePath();var finGeo=new T.ExtrudeGeometry(finShape,{depth:.095,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2});add(finGeo,paint,[0,0,-.047]);
   // Framed canopy: separate panes replace the old hemispherical bubble.
   function pane(points){var v=[];for(var i=1;i<points.length-1;i++)v.push.apply(v,points[0].concat(points[i],points[i+1]));var geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v,3));geo.computeVertexNormals();add(geo,glass);for(var j=0;j<points.length;j++)rod(points[j],points[(j+1)%points.length],.024,dark);}
   [-1,1].forEach(function(s){pane([[.92,.52,s*.43],[.40,1.12,s*.35],[-1.35,1.16,s*.35],[-1.8,.57,s*.46]]);pane([[.92,.52,s*.43],[.4,1.12,s*.35],[.4,1.12,0],[1.08,.61,0]]);});
   pane([[.4,1.12,-.35],[.4,1.12,.35],[-1.35,1.16,.35],[-1.35,1.16,-.35]]);pane([[-1.35,1.16,-.35],[-1.35,1.16,.35],[-1.8,.57,.46],[-1.8,.57,-.46]]);
   [-1,1].forEach(function(s){var bump=add(new T.SphereGeometry(1,24,16),paint,[3.28,.43,s*.47]);bump.scale.set(.61,.24,.20);
    for(var ex=0;ex<6;ex++)add(new T.BoxGeometry(.14,.095,.16),dark,[3.65-ex*.27,-.06,s*.56]);
    add(new T.BoxGeometry(1.10,.28,.82),light,[-.55,-.37,s*1.67]);add(new T.BoxGeometry(.03,.15,.69),dark,[-1.12,-.36,s*1.67]);
   });
   add(new T.BoxGeometry(.74,.26,.47),light,[4.05,-.58,0]);
   var spinner=add(new T.ConeGeometry(.38,1.05,40),paint,[6.72,0,0]);spinner.rotation.z=-Math.PI/2;
   var prop=new T.Group();prop.position.set(6.30,0,0);prop.userData={glbProp:true,spinAxis:'x'};prop.name='Bf109-rotating-prop';
   for(var b=0;b<3;b++){var blade=new T.Mesh(new T.BoxGeometry(.045,1.62,.18),dark);blade.position.y=.95;var pivot=new T.Group();pivot.rotation.x=b*Math.PI*2/3;pivot.add(blade);prop.add(pivot);}g.add(prop);
   var disc=add(new T.CircleGeometry(1.82,48),new T.MeshBasicMaterial({color:0xb6bcc0,transparent:true,opacity:.11,depthWrite:false,side:T.DoubleSide}),[6.32,0,0]);disc.rotation.y=Math.PI/2;
   rod([-1.85,.75,0],[-1.85,1.72,0],.015,dark);rod([-1.85,1.72,0],[-6.2,.85,0],.005,dark);
   return linearize(g);
  },
  airman:function(T){
   var g=new T.Group();g.name='clothed-airman-in-parachute-harness';
   var cloth=new T.MeshStandardMaterial({color:0x554a35,roughness:1}),leather=new T.MeshStandardMaterial({color:0x32271d,roughness:.88}),webbing=new T.MeshStandardMaterial({color:0x9e9270,roughness:1}),skin=new T.MeshStandardMaterial({color:0x92755b,roughness:1}),steel=new T.MeshStandardMaterial({color:0x62675f,roughness:.5,metalness:.55});
   // Typical 8th AF heavy-bomber crew dress: brown sheepskin or leather
   // jacket with a light fleece collar, olive trousers and the yellow B-3/B-4
   // "Mae West" life preserver over the chest. Generic issue, not a portrait.
   var jacket=new T.MeshStandardMaterial({color:0x7a5233,roughness:.95}),fleece=new T.MeshStandardMaterial({color:0xd8c7a0,roughness:1}),trousers=new T.MeshStandardMaterial({color:0x6b6747,roughness:1}),maeWest=new T.MeshStandardMaterial({color:0xe3be3a,roughness:.8});
   function add(geo,mat,pos,scale){var m=new T.Mesh(geo,mat);if(pos)m.position.set.apply(m.position,pos);if(scale)m.scale.set.apply(m.scale,scale);g.add(m);return m;}
   var torso=loft(T,[[-.35,.16,.11],[-.23,.16,.115],[0,.19,.135],[.22,.215,.135],[.32,.235,.12],[.38,.15,.095],[.40,.08,.07]],'y',jacket,32);g.add(torso);
   // Mae West: two inflated lobes over the chest, collar band behind the neck
   g.add(loft(T,[[.02,.15,.05,.10],[.12,.2,.075,.11],[.25,.215,.08,.105],[.34,.17,.06,.085]],'y',maeWest,32));
   g.add(loft(T,[[.33,.17,.12,.0],[.37,.16,.115,.0],[.40,.12,.1,-.01]],'y',maeWest,32));
   // A shaped standing collar gives the garment a neckline rather than
   // leaving a bare cylinder projecting from an unbroken torso tube.
   g.add(loft(T,[[.335,.135,.092],[.39,.102,.079],[.435,.079,.068]],'y',fleece,32));
   // Shaped head, neck and leather flying helmet; no giant spherical head.
   add(new T.CylinderGeometry(.055,.062,.12,20),skin,[0,.44,0]);
   if(global.KasselHumanHead){var h=global.KasselHumanHead,hg=new T.BufferGeometry();hg.setAttribute('position',new T.Float32BufferAttribute(h.positions,3));hg.setIndex(h.indices);hg.computeVertexNormals();add(hg,skin,[0,.572,.010],[.21,.29,.205]);}
   else add(new T.SphereGeometry(1,24,20),skin,[0,.565,.009],[.104,.143,.097]);
   add(new T.SphereGeometry(1,24,16,0,Math.PI*2,0,Math.PI*.49),leather,[0,.60,0],[.110,.122,.103]);
   if(!global.KasselHumanHead)add(new T.SphereGeometry(1,12,8),skin,[0,.55,.101],[.025,.038,.037]);
   [-1,1].forEach(function(s){add(new T.SphereGeometry(1,16,10),leather,[s*.108,.565,0],[.019,.043,.038]);});
   function limb(points,radii,mat){var curve=new T.CatmullRomCurve3(points.map(function(p){return new T.Vector3().fromArray(p);})),p=[],ix=[],rings=28,sides=20;
    for(var i=0;i<=rings;i++){var u=i/rings,c=curve.getPoint(u),t=curve.getTangent(u).normalize(),ref=Math.abs(t.z)<.9?new T.Vector3(0,0,1):new T.Vector3(1,0,0),n=new T.Vector3().crossVectors(t,ref).normalize(),b=new T.Vector3().crossVectors(t,n),ru=u*2,j=Math.min(1,Math.floor(ru)),f=ru-j,r=radii[j]*(1-f)+radii[j+1]*f;
     for(var k=0;k<sides;k++){var ang=k/sides*Math.PI*2,v=c.clone().addScaledVector(n,Math.cos(ang)*r).addScaledVector(b,Math.sin(ang)*r*.88);p.push(v.x,v.y,v.z);if(i){var a=(i-1)*sides+k,d=(i-1)*sides+(k+1)%sides,e=i*sides+k,h=i*sides+(k+1)%sides;ix.push(a,e,d,d,e,h);}}}
    var geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setIndex(ix);geo.computeVertexNormals();return add(geo,mat||cloth);
   }
   function strap(a,b,width){var av=new T.Vector3().fromArray(a),bv=new T.Vector3().fromArray(b),d=bv.clone().sub(av);var m=add(new T.BoxGeometry(width,d.length(),.012),webbing,av.clone().add(bv).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());}
   // Generic leather glove gripping a riser. Distinct palm, four curled
   // fingers, thumb and cuff replace the featureless spherical mittens.
   // This is a pose reconstruction, not a claimed crew-specific glove issue.
   function glove(side){
    var x=side*.18,y=.735,z=.02;
    var palm=loft(T,[[y-.045,.017,.015,z],[y-.023,.033,.019,z],[y+.022,.032,.019,z],[y+.045,.022,.013,z]],'y',leather,24);palm.position.x=x;g.add(palm);
    for(var f=0;f<4;f++){
     var fy=y+.033-f*.017,reach=.036-(f===3?.009:0),points=[[x+side*.015,fy,z+.014],[x+side*reach,fy,z+.011],[x+side*(reach+.005),fy,z-.011],[x+side*.017,fy,z-.026]];
     var curve=new T.CatmullRomCurve3(points.map(function(p){return new T.Vector3().fromArray(p);}));add(new T.TubeGeometry(curve,16,.0088,10,false),leather);
     add(new T.SphereGeometry(.009,12,8),leather,points[3]);
    }
    var thumbCurve=new T.CatmullRomCurve3([[x-side*.014,y-.022,z+.01],[x-side*.034,y-.004,z+.021],[x-side*.012,y+.02,z+.03]].map(function(p){return new T.Vector3().fromArray(p);}));add(new T.TubeGeometry(thumbCurve,18,.010,12,false),leather);
    var cuff=add(new T.CylinderGeometry(.031,.026,.025,24),leather,[x,y-.046,z]);cuff.rotation.z=side*.35;
   }
   [-1,1].forEach(function(s){
    limb([[s*.12,-.27,0],[s*.17,-.64,.11],[s*.13,-1.03,.03]],[.095,.067,.049],trousers);
    var boot=loft(T,[[-1.152,.051,.090,.04],[-1.139,.058,.113,.058],[-1.102,.060,.112,.053],[-1.080,.055,.080,.024],[-1.000,.056,.062,.005],[-.945,.055,.059,.005]],'y',leather,32);boot.position.x=s*.14;g.add(boot);
    limb([[s*.20,.27,0],[s*.31,.47,.025],[s*.18,.735,.018]],[.082,.048,.035],jacket);
    glove(s);
    strap([s*.12,.37,.13],[s*.09,-.29,.12],.042);strap([s*.12,.37,-.13],[s*.09,-.28,-.12],.042);
    strap([s*.09,-.28,.12],[s*.18,-.44,.08],.043);strap([s*.18,-.44,.08],[s*.09,-.30,-.12],.043);
    strap([s*.12,.37,0],[s*.17,.96,0],.03);
    add(new T.BoxGeometry(.059,.069,.019),steel,[s*.12,.30,.148]);
   });
   strap([-.17,-.13,.13],[.17,-.13,.13],.04);
   add(new T.BoxGeometry(.075,.075,.023),steel,[0,-.13,.148]);
   g.add(loft(T,[[-.125,.012,.012,.20],[-.105,.105,.061,.20],[-.07,.126,.068,.20],[.045,.126,.068,.20],[.075,.105,.061,.20],[.085,.012,.012,.20]],'y',cloth,28)); // rounded equipment pack; variant not asserted
   // Layer garment details underneath the harness. The boot sole stays
   // at the existing contact datum used by the terrain sampler.
   [-1,1].forEach(function(side){
    var x=side*.14;
    var sole=loft(T,[[-1.152,.052,.092,.044],[-1.143,.060,.115,.057],[-1.132,.059,.113,.057]],'y',leather,32);
    sole.position.x=x;g.add(sole);
    for(var row=0;row<3;row++){
     var lace=add(new T.BoxGeometry(.064,.007,.007),cloth,[x,-1.067+row*.026,.077-row*.005]);
     lace.rotation.z=side*.09;
    }
    var pocket=add(new T.BoxGeometry(.082,.079,.012),cloth,[side*.142,.120,.111]);
    pocket.rotation.y=side*.43;
    var flap=add(new T.BoxGeometry(.087,.027,.015),leather,[side*.142,.151,.116]);
    flap.rotation.y=pocket.rotation.y;
    add(new T.SphereGeometry(.006,10,8),steel,[side*.142,.145,.129]);
   });
   add(new T.BoxGeometry(.028,.43,.012),leather,[0,.14,.139]); // jacket closure
   g.userData.anatomyStatus='Generic anatomical head and posed clothed body; not a portrait or verified equipment issue';
   return batchStatic(T,linearize(g));
  }
 };
})(window);
