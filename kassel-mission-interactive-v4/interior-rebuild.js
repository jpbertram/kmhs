/* Reference-led B-24J interior reconstruction. All geometry shares the
 * exterior's +X nose frame. Photographs are NOT used as surface textures.
 * Dimensions are reconstruction estimates, not factory-certified drawings. */
(function(global){
 'use strict';
 global.KasselInterior={build:function(T,station){
  var root=new T.Group();root.name='B24J-reference-led-interior';root.userData.rebuiltInterior=true;
  var mats={paint:new T.MeshStandardMaterial({color:0x46513b,roughness:.82,metalness:.18,side:T.DoubleSide}),
   rib:new T.MeshStandardMaterial({color:0x293321,roughness:.9,metalness:.10}),
   black:new T.MeshStandardMaterial({color:0x171b1b,roughness:.72,metalness:.2}),
   metal:new T.MeshStandardMaterial({color:0x7e8178,roughness:.42,metalness:.65}),
   canvas:new T.MeshStandardMaterial({color:0x6a6248,roughness:1}),
   glass:new T.MeshPhysicalMaterial({color:0xc4d5d7,transparent:true,opacity:.075,roughness:.08,metalness:.0,depthWrite:false,side:T.DoubleSide})};
  // Subtle authored wear, not borrowed photographic skins.
  var wear=document.createElement('canvas');wear.width=wear.height=256;var wc=wear.getContext('2d');wc.fillStyle='#888';wc.fillRect(0,0,256,256);
  for(var wi=0;wi<850;wi++){var wx=(wi*73)%256,wy=(wi*137)%256;wc.fillStyle=wi%3?'#828282':'#989898';wc.fillRect(wx,wy,1+(wi%4),1);}
  var wt=new T.CanvasTexture(wear);wt.wrapS=wt.wrapT=T.RepeatWrapping;wt.repeat.set(3,3);mats.paint.bumpMap=wt;mats.paint.bumpScale=.006;mats.black.bumpMap=wt;mats.black.bumpScale=.002;
  function mesh(geo,mat,pos){var m=new T.Mesh(geo,mats[mat]||mat);if(pos)m.position.set.apply(m.position,pos);root.add(m);return m;}
  function box(pos,size,mat){return mesh(new T.BoxGeometry(size[0],size[1],size[2]),mat,pos);}
  function rod(a,b,r,mat){var av=new T.Vector3().fromArray(a),bv=new T.Vector3().fromArray(b),d=bv.clone().sub(av);var m=mesh(new T.CylinderGeometry(r,r,d.length(),10),mat,av.clone().add(bv).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;}
  function pane(points,glass){var g=new T.BufferGeometry(),v=[];for(var i=1;i<points.length-1;i++)v.push.apply(v,points[0].concat(points[i],points[i+1]));g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.computeVertexNormals();mesh(g,glass?'glass':'paint');for(var j=0;j<points.length;j++)rod(points[j],points[(j+1)%points.length],.028,'rib');}
  function label(text,w,h){var c=document.createElement('canvas');c.width=512;c.height=128;var g=c.getContext('2d');g.fillStyle='#171b1b';g.fillRect(0,0,512,128);g.fillStyle='#ddd8b8';g.font='30px sans-serif';g.textAlign='center';g.fillText(text,256,78);var tx=new T.CanvasTexture(c);tx.encoding=T.sRGBEncoding;return new T.MeshBasicMaterial({map:tx,side:T.DoubleSide});}
  function gauge(x,y,z,r,name,value){var rim=mesh(new T.CylinderGeometry(r,r,.065,40),'metal',[x,y,z]);rim.rotation.z=Math.PI/2;
   var cv=document.createElement('canvas');cv.width=cv.height=256;var ctx=cv.getContext('2d');ctx.fillStyle='#0c1110';ctx.fillRect(0,0,256,256);ctx.strokeStyle='#dedcc7';ctx.fillStyle='#dedcc7';ctx.lineWidth=3;
   var max={AIRSPEED:400,ALTITUDE:10,CLIMB:20,GYRO:360,TURN:4,COMPASS:360,RPM:40,BOOST:60,OIL:100}[name]||100;
   for(var i=0;i<40;i++){var a=i/40*Math.PI*1.65+.68;ctx.beginPath();ctx.moveTo(128+Math.sin(a)*100,128-Math.cos(a)*100);ctx.lineTo(128+Math.sin(a)*(i%5?90:80),128-Math.cos(a)*(i%5?90:80));ctx.stroke();if(i%5===0){ctx.font='15px sans-serif';ctx.textAlign='center';ctx.fillText(String(Math.round(i/40*max)),128+Math.sin(a)*68,133-Math.cos(a)*68);}}
   ctx.font='bold 17px sans-serif';ctx.textAlign='center';ctx.fillText(name,128,164);var a=value*Math.PI*1.65+.68;ctx.strokeStyle='#f4f1df';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(128,128);ctx.lineTo(128+Math.sin(a)*78,128-Math.cos(a)*78);ctx.stroke();ctx.beginPath();ctx.arc(128,128,7,0,Math.PI*2);ctx.fill();var tx=new T.CanvasTexture(cv);tx.encoding=T.sRGBEncoding;var face=mesh(new T.CircleGeometry(r*.91,40),new T.MeshBasicMaterial({map:tx}),[x-.037,y,z]);face.rotation.y=-Math.PI/2;
   for(var s=0;s<4;s++){var an=s*Math.PI/2+Math.PI/4;var screw=mesh(new T.SphereGeometry(.012,6,4),'metal',[x-.044,y+Math.sin(an)*r*.95,z+Math.cos(an)*r*.95]);}
  }
  function seat(x,y,z){box([x,y,z],[.62,.12,.70],'canvas');var back=box([x-.30,y+.42,z],[.12,.80,.72],'canvas');back.rotation.z=-.10;[-.26,.26].forEach(function(d){rod([x-.2,y-.1,z+d],[x-.2,y-.6,z+d],.028,'metal');rod([x+.2,y-.1,z+d],[x+.2,y-.6,z+d],.028,'metal');});box([x-.37,y+.48,z-.18],[.035,.67,.09],'canvas');box([x-.37,y+.48,z+.18],[.035,.67,.09],'canvas');}
  function shell(x0,x1,rx,ry,cut){
   for(var x=x0;x<=x1+.01;x+=.65){var points=[];for(var j=0;j<=48;j++){var a=j/48*Math.PI*2;points.push([x,Math.sin(a)*ry,Math.cos(a)*rx]);}for(var j=0;j<48;j++)rod(points[j],points[j+1],.025,'rib');}
   for(var j=0;j<24;j++){var a=j/24*Math.PI*2;var y=Math.sin(a)*ry,z=Math.cos(a)*rx;rod([x0,y,z],[x1,y,z],.018,'rib');if(cut&&cut(y,z))continue;var an=(j+1)/24*Math.PI*2;pane([[x0,y,z],[x1,y,z],[x1,Math.sin(an)*ry,Math.cos(an)*rx],[x0,Math.sin(an)*ry,Math.cos(an)*rx]],false);}
   box([(x0+x1)/2,-ry*.65,0],[x1-x0,.06,rx*1.60],'paint');
   for(var x=x0+.18;x<x1;x+=.35){for(var z=-rx*.7;z<=rx*.7;z+=rx*.7)mesh(new T.SphereGeometry(.012,5,3),'metal',[x,-ry*.65+.04,z]);}
  }
  function oxygen(x,y,z){var m=mesh(new T.CylinderGeometry(.15,.15,.75,20),'paint',[x,y,z]);mesh(new T.SphereGeometry(.15,16,8),'paint',[x,y+.375,z]);rod([x,y+.5,z],[x+.2,y+.6,z],.022,'metal');var curve=new T.CatmullRomCurve3([new T.Vector3(x+.2,y+.6,z),new T.Vector3(x+.5,y+.2,z),new T.Vector3(x+.3,y-.2,z)]);mesh(new T.TubeGeometry(curve,20,.026,8,false),'black');}
  function gun(x,y,z,dir){var body=box([x,y,z],[.55,.18,.16],'black');var end=[x+dir[0]*1.4,y+dir[1]*1.4,z+dir[2]*1.4];rod([x,y,z],end,.043,'metal');for(var i=0;i<12;i++){var t=i/12;mesh(new T.SphereGeometry(.013,5,3),'black',[x+dir[0]*(.45+t*.85),y+dir[1]*(.45+t*.85)+.037,z+dir[2]*(.45+t*.85)]);}rod([x-.1,y-.1,z],[x-.1,y-.45,z],.05,'black');}
  var seats={pilot:[7.55,1.12,-.63],copilot:[7.55,1.12,.63],nav:[9.6,.34,.65],bomb:[11,.17,0],nose:[12.2,.10,0],radio:[3.3,.7,-.45],ttop:[4.9,2.15,0],ball:[-2,-2.2,0],waistL:[-6,.45,-1.35],waistR:[-6,.45,1.35],tail:[-15.9,.1,0]};
  /* Standing eyes must be measured above the walkable floor, not the
     fuselage origin. NASA CR-114271 printed p.1-5 gives shirtsleeve
     standing eye-height design bounds 61.1–68.9 in (AF flying personnel
     1950 basis). 65 in is a nominal midpoint, NOT a crewman's stature.
     20.47/33 is the existing nominal airframe-length normalization;
     factory station/floor dimensions remain reconstruction estimates. */
  var metresPerModelUnit=20.47/33,waistFloorTop=-2.1*.65+.03;
  var standingEyeM=65*.0254;
  seats.waistL[1]=seats.waistR[1]=waistFloorTop+standingEyeM/metresPerModelUnit;
  root.userData.eyeCalibration={station:station,metresPerModelUnit:metresPerModelUnit,
   standingEyeM:standingEyeM,standingRangeM:[61.1*.0254,68.9*.0254],waistFloorTop:waistFloorTop,
   source:'NASA CR-114271, printed 1-5; 1950 flying-personnel basis; not individual 1944 crew measurements',
   geometryStatus:'Estimated airframe/floor normalization, not factory schematic exact'};
  var looks={pilot:[1,-.32,0],copilot:[1,-.32,0],nav:[.4,-.25,1],bomb:[1,-.4,0],nose:[1,0,0],radio:[0,-.65,-1],ttop:[1,0,0],ball:[.5,-.7,0],waistL:[0,-.03,-1],waistR:[0,-.03,1],tail:[-1,0,0]};
  /* Procedural flight deck: kept only as the fallback when the refined
     flight-deck model (flight-deck-cockpit.js) cannot load. */
  function proceduralFlightDeck(){
   shell(5.9,8.75,1.75,1.8,function(y){return y>.40;});
   // Individual transparencies, not a photo of a cockpit wrapped on a tube.
   pane([[8.75,.42,-1.45],[9.2,1.13,-1.24],[8.55,1.92,-1.12],[8.05,.48,-1.68]],true);
   pane([[8.75,.42,1.45],[9.2,1.13,1.24],[8.55,1.92,1.12],[8.05,.48,1.68]],true);
   pane([[9.2,1.13,-1.24],[9.2,1.13,0],[8.55,1.92,0],[8.55,1.92,-1.12]],true);
   pane([[9.2,1.13,0],[9.2,1.13,1.24],[8.55,1.92,1.12],[8.55,1.92,0]],true);
   [-1,1].forEach(function(s){pane([[6.3,.42,s*1.68],[8.05,.48,s*1.68],[8.55,1.92,s*1.12],[6.3,1.55,s*1.32]],true);});
   pane([[6.3,1.55,-1.32],[8.55,1.92,-1.12],[8.55,1.92,1.12],[6.3,1.55,1.32]],true);
   box([8.95,.30,0],[.16,.88,2.95],'black');
   [-1,1].forEach(function(side){['AIRSPEED','ALTITUDE','CLIMB','GYRO','TURN','COMPASS'].forEach(function(n,i){gauge(8.86,.60-Math.floor(i/3)*.28,side*.92+(i%3-1)*.245,.102,n,.38+i*.045);});});
   for(var i=0;i<4;i++){gauge(8.86,.60,-.34+i*.225,.080,'RPM',.55);gauge(8.86,.34,-.34+i*.225,.080,'BOOST',.45);gauge(8.86,.08,-.34+i*.225,.080,'OIL',.48);}
   for(var i=0;i<16;i++){var sz=-1.30+i*.17;rod([8.85,-.06,sz],[8.80,-.025,sz],.014,'metal');}
   box([8.15,-.2,0],[1,.75,.46],'paint');
   for(var row=0;row<3;row++)for(var i=0;i<4;i++){var z=(i-1.5)*.095,x=8.1+row*.18;rod([x,0,z],[x-.14,.43,z],.013,'metal');mesh(new T.SphereGeometry(.043,16,10),new T.MeshStandardMaterial({color:[0x242727,0x822e24,0x39475b][row],roughness:.6}),[x-.14,.43,z]);}
   [-.63,.63].forEach(function(z){seat(7.35,-.15,z);rod([8,-1.05,z],[8,.1,z],.038,'metal');rod([8,.1,z],[7.82,.20,z],.035,'black');
    var wheel=mesh(new T.TorusGeometry(.28,.024,12,48),'black',[7.82,.20,z]);wheel.rotation.y=Math.PI/2;
    for(var sp=0;sp<3;sp++){var ang=sp*Math.PI*2/3;rod([7.82,.2,z],[7.82,.2+Math.sin(ang)*.25,z+Math.cos(ang)*.25],.018,'metal');}
    var hub=mesh(new T.CylinderGeometry(.075,.075,.06,24),'black',[7.82,.2,z]);hub.rotation.z=Math.PI/2;
    [-.26,.26].forEach(function(d){box([8.48,-.87,z+d/2],[.24,.04,.19],'metal');});});
   // Overhead auxiliary cluster visible above the windscreen centre.
   box([8.38,1.63,0],[.16,.44,.42],'black');gauge(8.29,1.65,0,.11,'COMPASS',.4);
   oxygen(6.3,-.2,-1.35);oxygen(6.3,-.2,1.35);
  }
  var defs=null,linearMaterials=new Set();
  function proceduralStation(){
  if(station==='pilot'||station==='copilot'){
   proceduralFlightDeck();
  }else if(station==='nav'||station==='bomb'||station==='nose'){
   shell(9,12.3,1.45,1.55,function(y){return y>-.9;});
   for(var j=0;j<8;j++){var a=j/8*Math.PI*2,b=(j+1)/8*Math.PI*2;pane([[12.3,Math.sin(a)*1.55,Math.cos(a)*1.45],[13.2,Math.sin(a)*.8,Math.cos(a)*.75],[13.2,Math.sin(b)*.8,Math.cos(b)*.75],[12.3,Math.sin(b)*1.55,Math.cos(b)*1.45]],true);}
   [-1,1].forEach(function(s){pane([[9,-.8,s*1.44],[12.3,-.8,s*1.44],[12.3,1.1,s*.95],[9,1.1,s*.95]],true);});
   box([9.9,-.52,.8],[1.15,.06,.66],'canvas');seat(9.15,-.88,.6);
   var chart=box([9.95,-.478,.8],[.68,.007,.45],new T.MeshStandardMaterial({color:0xc8b990,roughness:1}));
   for(var i=0;i<6;i++)rod([9.68+i*.10,-.47,.6],[9.68+i*.10,-.47,1.0],.002,'black');
   box([11.7,-1.05,0],[.40,.16,.40],'black');rod([11.7,-1,0],[11.7,-.38,0],.065,'metal');box([11.7,-.45,0],[.32,.24,.30],'black');rod([11.7,-.3,0],[11.5,-.20,0],.065,'black');
   seat(10.8,-1.05,0);oxygen(9.35,-.5,-1.13);gun(12.4,.05,-.25,[1,0,0]);gun(12.4,.05,.25,[1,0,0]);
  }else if(station==='radio'){
   shell(1.8,5.3,1.75,1.8,function(y,z){return y>.65&&Math.abs(z)>1.2;});
   [-1,1].forEach(function(s){pane([[2.5,.45,s*1.65],[4.4,.45,s*1.65],[4.4,1.3,s*1.18],[2.5,1.3,s*1.18]],true);});
   box([3.4,-.15,-1.06],[1.8,.08,.90],'paint');seat(3.3,-.56,-.4);
   for(var i=0;i<3;i++){box([2.8+i*.52,.28,-1.37],[.47,.58,.30],'black');for(var j=0;j<3;j++){var knob=mesh(new T.CylinderGeometry(.042,.042,.04,18),'metal',[2.8+i*.52,.17+j*.12,-1.19]);knob.rotation.x=Math.PI/2;}
    box([2.8+i*.52,.42,-1.205],[.24,.12,.009],new T.MeshStandardMaterial({color:0xc4b687,roughness:.6}));}
   for(var i=0;i<4;i++)rod([2.75+i*.2,.02,-1.2],[2.75+i*.2,-.95,-1.2],.014,'black');oxygen(4.9,-.1,1.35);
  }else if(station==='waistL'||station==='waistR'){
   shell(-8.8,-3.5,1.9,2.1,function(y,z){return y>-.3&&y<1.3&&Math.abs(z)>1.25;});
   [-1,1].forEach(function(s){pane([[-7.9,-.35,s*1.86],[-4.8,-.35,s*1.86],[-4.8,1.32,s*1.46],[-7.9,1.32,s*1.46]],true);gun(-6,.28,s*1.40,[0,0,s]);rod([-6,-1.3,s*1.3],[-6,.1,s*1.3],.048,'metal');box([-6.7,-.7,s*1.5],[.45,.48,.30],'paint');});
   oxygen(-8,-.45,1.4);box([-5,-1.31,0],[.9,.06,1.35],'canvas');
  }else if(station==='ball'&&global.KasselBallTurret){
   var turret=global.KasselBallTurret.build(T),center=[-2,-2.2,0];turret.group.position.set.apply(turret.group.position,center);root.add(turret.group);
   seats.ball=center.map(function(v,i){return v+turret.eye[i];});looks.ball=turret.look;
   root.userData.ballTurretDiameterIn=turret.dimensions.diameterIn;
  }else{
   var pos=seats[station]||seats.tail;var x=pos[0],y=pos[1],r=station==='ball'?.85:station==='ttop'?1.12:.95;
   for(var j=0;j<12;j++){var a=j/12*Math.PI*2,b=(j+1)/12*Math.PI*2;pane([[x+Math.cos(a)*r,y-.65,Math.sin(a)*r],[x+Math.cos(b)*r,y-.65,Math.sin(b)*r],[x+Math.cos(b)*r*.75,y+.65,Math.sin(b)*r*.75],[x+Math.cos(a)*r*.75,y+.65,Math.sin(a)*r*.75]],true);}
   var dir=station==='tail'?-1:1;[-.27,.27].forEach(function(z){gun(x+dir*.5,y-.25,z,[dir,0,0]);});seat(x-dir*.2,y-.75,0);rod([x+dir*.4,y-.5,0],[x+dir*.4,y-.18,0],.025,'metal');
  }
  }
  /* Reference-led compartment models (crew-compartments.js) replace the
     procedural rooms for the flight deck, radio, nose and waist stations.
     The procedural rooms stay as the fallback if a model cannot load. */
  var cc=global.KasselCrewCompartments;
  if(cc&&cc.available(T)&&cc.covers(station)){
   var previous={},cs=cc.seats();
   Object.keys(cs).forEach(function(k){previous[k]={p:seats[k],l:looks[k]};seats[k]=cs[k].pos;looks[k]=cs[k].look;});
   root.userData.crewCompartments=cc.parts(station);
   if(cc.floorMetres[station]!=null){var cal=root.userData.eyeCalibration;cal.waistFloorTop=cc.toUnits([0,cc.floorMetres[station],0])[1];
    cal.geometryStatus='Waist compartment model floor (crew-compartments.js); estimated, not factory schematic exact';}
   cc.attach(T,root,station,function(){
    var n0=root.children.length;proceduralStation();
    root.children.slice(n0).forEach(function(o){var m=o.material;if(o.isMesh&&m&&m.color&&!linearMaterials.has(m)){linearMaterials.add(m);m.color.convertSRGBToLinear();}});
    if(defs)Object.keys(previous).forEach(function(k){var p=previous[k].p,l=previous[k].l;defs[k]={offset:{x:p[0],y:p[1],z:p[2]},look:{x:l[0],y:l[1],z:l[2]}};});
   });
  }else proceduralStation();
  // The scene already supplies daylight; cabin fills must not bleach paint.
  var light=new T.PointLight(0xffe9c9,.12,.65);light.position.set.apply(light.position,seats[station]||seats.pilot);root.add(light);
  // Batch static structure by material; keep lights and individually authored
  // instrument faces. This reduces frame/stringer draw calls by an order of magnitude.
  root.children.forEach(function(o){if(o.isMesh){var m=o.material;if(m&&m.color&&!linearMaterials.has(m)){linearMaterials.add(m);m.color.convertSRGBToLinear();}}});
  var batches=new Map();root.updateMatrixWorld(true);root.children.slice().forEach(function(o){if(!o.isMesh)return;var list=batches.get(o.material)||[];list.push(o);batches.set(o.material,list);});
  batches.forEach(function(objects,material){if(objects.length<2)return;var positions=[],normals=[],uvs=[];
   objects.forEach(function(o){var geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrix);var p=geo.attributes.position,n=geo.attributes.normal,u=geo.attributes.uv;for(var i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n?n.getX(i):0,n?n.getY(i):1,n?n.getZ(i):0);uvs.push(u?u.getX(i):0,u?u.getY(i):0);}geo.dispose();o.geometry.dispose();root.remove(o);});
   var merged=new T.BufferGeometry();merged.setAttribute('position',new T.Float32BufferAttribute(positions,3));merged.setAttribute('normal',new T.Float32BufferAttribute(normals,3));merged.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));merged.computeBoundingSphere();root.add(new T.Mesh(merged,material));
  });
  defs={};Object.keys(seats).forEach(function(k){var p=seats[k],l=looks[k];defs[k]={offset:{x:p[0],y:p[1],z:p[2]},look:{x:l[0],y:l[1],z:l[2]}};});
  return {group:root,seats:defs};
 }};
})(window);
