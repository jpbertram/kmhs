/* Reference-led B-24J interior reconstruction. All geometry shares the
 * exterior's +X nose frame. Material scans supply surface detail.
 * Dimensions are reconstruction estimates, not factory-certified drawings. */
(function(global){
 'use strict';
 var finishMaps={};
 function finish(T,material,kind){
  material.userData.cabinFinish=kind;
  if(!global.Image)return material;
  if(!finishMaps[kind]){
   var loader=new T.TextureLoader();
   finishMaps[kind]=['tone','roughness','normal'].map(function(channel){
    var texture=loader.load('textures/cabin-'+kind+'-'+channel+'.jpg');
    if(channel==='tone')texture.encoding=T.sRGBEncoding;
    texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=4;
    texture.userData={sharedCabinFinish:true};return texture;
   });
  }
  var maps=finishMaps[kind];material.map=maps[0];material.roughnessMap=maps[1];material.normalMap=maps[2];
  material.normalScale.setScalar(kind==='cloth'?.38:.18);
  return material;
 }
 global.KasselInterior={build:function(T,station){
  var root=new T.Group();root.name='B24J-reference-led-interior';root.userData.rebuiltInterior=true;
  var mats={paint:new T.MeshStandardMaterial({color:0x46513b,roughness:.82,metalness:.18,side:T.DoubleSide}),
   rib:new T.MeshStandardMaterial({color:0x293321,roughness:.9,metalness:.10}),
   black:new T.MeshStandardMaterial({color:0x171b1b,roughness:.72,metalness:.2}),
   metal:new T.MeshStandardMaterial({color:0x7e8178,roughness:.42,metalness:.65}),
   canvas:new T.MeshStandardMaterial({color:0x6a6248,roughness:1}),
   glass:new T.MeshPhysicalMaterial({color:0xc4d5d7,transparent:true,opacity:.075,roughness:.08,metalness:.0,depthWrite:false,side:T.DoubleSide})};
  ['paint','black','rib'].forEach(function(key){finish(T,mats[key],'enamel');});
  finish(T,mats.canvas,'cloth');
  function mesh(geo,mat,pos){var m=new T.Mesh(geo,mats[mat]||mat);if(pos)m.position.set.apply(m.position,pos);root.add(m);return m;}
  function box(pos,size,mat){return mesh(new T.BoxGeometry(size[0],size[1],size[2]),mat,pos);}
  function rod(a,b,r,mat){var av=new T.Vector3().fromArray(a),bv=new T.Vector3().fromArray(b),d=bv.clone().sub(av);var m=mesh(new T.CylinderGeometry(r,r,d.length(),10),mat,av.clone().add(bv).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;}
  var skin=mats.paint.clone();
  skin.userData.cabinBoundary=true;
  mats.glass.userData.cabinBoundary=true;
  function pane(points,glass,boundary){
   var g=new T.BufferGeometry(),v=[],uv=[];
   var origin=new T.Vector3().fromArray(points[0]);
   var along=new T.Vector3().fromArray(points[1]).sub(origin).normalize();
   var across=new T.Vector3().fromArray(points[points.length-1]).sub(origin);
   across.addScaledVector(along,-across.dot(along)).normalize();
   for(var i=1;i<points.length-1;i++){
    [points[0],points[i],points[i+1]].forEach(function(p){
     v.push.apply(v,p);var local=new T.Vector3().fromArray(p).sub(origin);
     uv.push(local.dot(along),local.dot(across));
    });
   }
   g.setAttribute('position',new T.Float32BufferAttribute(v,3));
   g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();
   mesh(g,glass?'glass':boundary?skin:'paint');
   for(var j=0;j<points.length;j++)rod(points[j],points[(j+1)%points.length],.028,'rib');
  }
  function label(text,w,h){var c=document.createElement('canvas');c.width=512;c.height=128;var g=c.getContext('2d');g.fillStyle='#171b1b';g.fillRect(0,0,512,128);g.fillStyle='#ddd8b8';g.font='30px sans-serif';g.textAlign='center';g.fillText(text,256,78);var tx=new T.CanvasTexture(c);tx.encoding=T.sRGBEncoding;return new T.MeshBasicMaterial({map:tx,side:T.DoubleSide});}
  function gauge(x,y,z,r,name,value){var rim=mesh(new T.CylinderGeometry(r,r,.020,40),'rib',[x,y,z]);rim.rotation.z=Math.PI/2;
   var cv=document.createElement('canvas');cv.width=cv.height=256;var ctx=cv.getContext('2d');ctx.fillStyle='#0c1110';ctx.fillRect(0,0,256,256);ctx.strokeStyle='#dedcc7';ctx.fillStyle='#dedcc7';ctx.lineWidth=3;
   var max={AIRSPEED:400,ALTITUDE:10,CLIMB:20,GYRO:360,TURN:4,COMPASS:360,RPM:40,BOOST:60,OIL:100}[name]||100;
   for(var i=0;i<40;i++){var a=i/40*Math.PI*1.65+.68;ctx.beginPath();ctx.moveTo(128+Math.sin(a)*100,128-Math.cos(a)*100);ctx.lineTo(128+Math.sin(a)*(i%5?90:80),128-Math.cos(a)*(i%5?90:80));ctx.stroke();if(i%5===0){ctx.font='15px sans-serif';ctx.textAlign='center';ctx.fillText(String(Math.round(i/40*max)),128+Math.sin(a)*68,133-Math.cos(a)*68);}}
   if(name==='GYRO'){
    ctx.save();ctx.beginPath();ctx.arc(128,128,81,0,Math.PI*2);ctx.clip();
    ctx.fillStyle='#627779';ctx.fillRect(42,42,172,87);
    ctx.fillStyle='#745744';ctx.fillRect(42,129,172,87);
    ctx.fillStyle='#ebe7ce';ctx.fillRect(44,127,168,3);
    for(var pitch=-2;pitch<=2;pitch++)ctx.fillRect(116,128+pitch*15,24,2);
    ctx.fillStyle='#f0ae50';ctx.fillRect(82,136,33,4);ctx.fillRect(141,136,33,4);
    ctx.restore();
   }else{
    ctx.textAlign='center';ctx.fillStyle='#ebe8d4';ctx.font='bold 16px sans-serif';ctx.fillText(name,128,88);
    ctx.font='13px sans-serif';ctx.fillText(({ALTITUDE:'FEET',CLIMB:'FT / MIN',AIRSPEED:'MPH',OIL:'PRESS',BOOST:'IN. HG'})[name]||'',128,165);
    var angle=value*Math.PI*1.65+.68;
    ctx.save();ctx.translate(128,128);ctx.rotate(-angle);ctx.fillStyle='#f6edd3';
    ctx.beginPath();ctx.moveTo(-4,19);ctx.lineTo(-3,-47);ctx.lineTo(0,-80);ctx.lineTo(3,-47);ctx.lineTo(4,19);ctx.fill();ctx.restore();
    ctx.beginPath();ctx.arc(128,128,7,0,Math.PI*2);ctx.fill();
   }
   var tx=new T.CanvasTexture(cv);tx.encoding=T.sRGBEncoding;var face=mesh(new T.CircleGeometry(r*.91,40),new T.MeshStandardMaterial({map:tx,roughness:.75}),[x-.012,y,z]);face.rotation.y=-Math.PI/2;
   for(var s=0;s<4;s++){var an=s*Math.PI/2+Math.PI/4;var screw=mesh(new T.SphereGeometry(.012,6,4),'metal',[x-.015,y+Math.sin(an)*r*.95,z+Math.cos(an)*r*.95]);}
  }
  function seat(x,y,z){box([x,y,z],[.62,.12,.70],'canvas');var back=box([x-.30,y+.42,z],[.12,.80,.72],'canvas');back.rotation.z=-.10;[-.26,.26].forEach(function(d){rod([x-.2,y-.1,z+d],[x-.2,y-.6,z+d],.028,'metal');rod([x+.2,y-.1,z+d],[x+.2,y-.6,z+d],.028,'metal');});box([x-.37,y+.48,z-.18],[.035,.67,.09],'canvas');box([x-.37,y+.48,z+.18],[.035,.67,.09],'canvas');}
  // The eight vertices of each section are shared by the wall, roof,
  // belly and glazing. Never cut an entire longitudinal strip for a window.
  function shell(x0,x1,rx,ry,windowStart,windowEnd,sill,header,frontGlass,forwardSideGlass=true){
   var sections=[x0,windowStart,windowEnd,x1];
   function section(x){
    var nose=frontGlass&&x===x1;
    var width=nose?rx*.77:rx;
    var upperX=nose&&station.match(/^(pilot|copilot)$/)?x-.50:x;
    return [[x,-ry*.85,-width*.69],[x,-ry*.85,width*.69],
     [x,sill,width],[upperX,header,width*.79],[upperX,ry,width*.54],
     [upperX,ry,-width*.54],[upperX,header,-width*.79],[x,sill,-width]];
   }
   var rings=sections.map(section);
   for(var bay=0;bay<rings.length-1;bay++){
    var ahead=rings[bay+1],aft=rings[bay];
    for(var side=0;side<8;side++){
     var next=(side+1)%8;
     var glazing=(side===2||side===6)&&(bay===1||frontGlass&&forwardSideGlass&&bay===2);
     pane([aft[side],ahead[side],ahead[next],aft[next]],glazing,true);
    }
   }
   function closeEnd(r,glazed){
    pane([r[0],r[1],r[2],r[7]],false,true);
    pane([r[7],r[2],r[3],r[6]],glazed,true);
    pane([r[6],r[3],r[4],r[5]],false,true);
    if(glazed){
     var low=new T.Vector3().fromArray(r[7]).lerp(new T.Vector3().fromArray(r[2]),.5);
     var high=new T.Vector3().fromArray(r[6]).lerp(new T.Vector3().fromArray(r[3]),.5);
     rod(low.toArray(),high.toArray(),.028,'rib');
    }
   }
   // Folded sheet channels on opaque end panels. Scene-unit dimensions
   // and spacing are visual estimates. Keep window openings clear.
   var folds=[],fasteners=[];
   function stiffen(x,inward){
    for(var col=-2;col<=2;col++){
     var z=col*rx*.26,base=-ry*.63,top=ry*(.90-.045*Math.abs(col));
     var profile=[[-.084,.008],[-.052,.008],[-.035,.071],[.035,.071],[.052,.008],[.084,.008]];
     for(var j=0;j<profile.length-1;j++){
      var left=profile[j],right=profile[j+1];
      var a=[x+inward*left[1],base,z+left[0]],b=[a[0],top,a[2]];
      var c=[x+inward*right[1],top,z+right[0]],d=[c[0],base,c[2]];
      folds.push.apply(folds,a.concat(b,c,a,c,d));
     }
     for(var y=base+.12;y<top-.04;y+=.23){
      [-.068,.068].forEach(function(dz){fasteners.push([x+inward*.012,y,z+dz]);});
     }
    }
   }
   stiffen(x0,1);if(!frontGlass)stiffen(x1,-1);
   var folded=new T.BufferGeometry();folded.setAttribute('position',new T.Float32BufferAttribute(folds,3));
   folded.computeVertexNormals();
   var channelMat=new T.MeshStandardMaterial({color:0x58604c,metalness:.27,roughness:.72,side:T.DoubleSide});
   mesh(folded,finish(T,channelMat,'enamel')).name='bulkhead-stiffeners';
   fasteners.forEach(function(pos){
    var rivet=mesh(new T.SphereGeometry(.012,8,4),'rib',pos);rivet.scale.x=.45;
   });
   closeEnd(rings[0],false);closeEnd(rings[3],!!frontGlass);
   box([(x0+x1)/2,-ry*.65,0],[x1-x0,.06,rx*1.60],'paint');
   for(var x=x0+.18;x<x1;x+=.35){for(var z=-rx*.7;z<=rx*.7;z+=rx*.7)mesh(new T.SphereGeometry(.012,5,3),'metal',[x,-ry*.65+.04,z]);}
  }
  function oxygen(x,y,z){var m=mesh(new T.CylinderGeometry(.15,.15,.75,20),'paint',[x,y,z]);mesh(new T.SphereGeometry(.15,16,8),'paint',[x,y+.375,z]);rod([x,y+.5,z],[x+.2,y+.6,z],.022,'metal');var curve=new T.CatmullRomCurve3([new T.Vector3(x+.2,y+.6,z),new T.Vector3(x+.5,y+.2,z),new T.Vector3(x+.3,y-.2,z)]);mesh(new T.TubeGeometry(curve,20,.026,8,false),'black');}
  function gun(x,y,z,dir){var body=box([x,y,z],[.55,.18,.16],'black');var end=[x+dir[0]*1.4,y+dir[1]*1.4,z+dir[2]*1.4];rod([x,y,z],end,.043,'metal');for(var i=0;i<12;i++){var t=i/12;mesh(new T.SphereGeometry(.013,5,3),'black',[x+dir[0]*(.45+t*.85),y+dir[1]*(.45+t*.85)+.037,z+dir[2]*(.45+t*.85)]);}rod([x-.1,y-.1,z],[x-.1,y-.45,z],.05,'black');}
  var seats={pilot:[7.55,1.12,-.63],copilot:[7.55,1.12,.63],nav:[9.6,.34,.65],bomb:[11,.17,0],nose:[12.2,.10,0],radio:[3.3,.7,-.21],ttop:[4.9,2.15,0],ball:[-2,-2.2,0],waistL:[-6,.45,-.80],waistR:[-6,.45,.80],tail:[-15.9,.1,0]};
  /* Standing eyes must be measured above the walkable floor, not the
     fuselage origin. NASA CR-114271 printed p.1-5 gives shirtsleeve
     standing eye-height design bounds 61.1–68.9 in (AF flying personnel
     1950 basis). 65 in is a nominal midpoint, NOT a crewman's stature.
     20.47/33 is the existing nominal airframe-length normalization;
     factory station/floor dimensions remain reconstruction estimates. */
  var metresPerModelUnit=20.47/33,waistFloorTop=-2.1*.65+.03;
  // Seat centers drive both the furniture and the camera. Heights in
  // this table refer to the midpoint of the .12-unit cushion.
  var chairs={pilot:[7.35,-.15,-.63],copilot:[7.35,-.15,.63],
   nav:[9.15,-.88,.6],bomb:[10.8,-1.05,0],radio:[3.3,-.56,-.21]};
  var seatedEyeM=30.9*.0254;
  Object.keys(chairs).forEach(function(key){
   var chair=chairs[key];
   seats[key]=[chair[0],chair[1]+.06+seatedEyeM/metresPerModelUnit,chair[2]];
  });
  function orientedChair(position,heading){
   var center=new T.Vector3().fromArray(position);
   var first=root.children.length;
   seat.apply(null,position);
   var turn=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),heading);
   root.children.slice(first).forEach(function(piece){
    piece.position.sub(center).applyQuaternion(turn).add(center);
    piece.quaternion.premultiply(turn);
   });
  }
  function chairAt(key){
   orientedChair(chairs[key],key==='radio'?Math.PI/2:key==='nav'?-Math.atan2(.2,.8):0);
  }
  var standingEyeM=65*.0254;
  seats.waistL[1]=seats.waistR[1]=waistFloorTop+standingEyeM/metresPerModelUnit;
  root.userData.eyeCalibration={station:station,metresPerModelUnit:metresPerModelUnit,
   standingEyeM:standingEyeM,standingRangeM:[61.1*.0254,68.9*.0254],waistFloorTop:waistFloorTop,
   source:'NASA CR-114271, printed 1-5; 1950 flying-personnel basis; not individual 1944 crew measurements',
   geometryStatus:'Estimated airframe/floor normalization, not factory schematic exact'};
  var looks={pilot:[1,.09,0],copilot:[1,.09,0],nav:[.86,.055,.55],bomb:[1,-.12,0],nose:[1,0,0],radio:[.06,-.34,-1],ttop:[1,0,0],ball:[.5,-.7,0],waistL:[0,-.03,-1],waistR:[0,-.03,1],tail:[-1,0,0]};
  if(station==='pilot'||station==='copilot'){
   shell(5.9,9.2,1.68,1.92,6.3,8.05,.72,1.72,true);
   // Fig. 10, AN 01-5EC-1: continuous fascia beneath the windshield,
   // distinct flight and engine groups, and a projecting center pedestal.
   var deckFinish=new T.MeshStandardMaterial({color:0x353833,roughness:.95});
   var cap=box([9.08,.76,0],[.62,.095,2.98],deckFinish);
   cap.name='flight-deck-coaming';
   // Form the glare shield as a continuous bent sheet. The rolled lip
   // returns under the fascia; the sloping upper face meets the windscreen.
   var shieldProfile=[[8.82,.697],[8.78,.704],[8.752,.727],[8.75,.762],
    [8.765,.791],[8.795,.81],[8.84,.819],[8.96,.846],[9.09,.953],[9.20,1.13]];
   var verts=[],indices=[],tones=[];
   shieldProfile.forEach(function(row,i){
    for(var j=0;j<=24;j++){
     var lateral=j/12-1;
     verts.push(row[0],row[1]-.022*lateral*lateral,lateral*(1.49-.25*i/(shieldProfile.length-1)));
     var daylight=(.46+.45*i/(shieldProfile.length-1))*(1-.19*Math.pow(Math.abs(lateral),3));
     tones.push(daylight*.95,daylight,daylight*1.02);
     if(i&&j){var n=i*25+j;indices.push(n-26,n-25,n,n-26,n,n-1);}
    }
   });
   var shield=new T.BufferGeometry();shield.setIndex(indices);
   shield.setAttribute('position',new T.Float32BufferAttribute(verts,3));
   shield.setAttribute('color',new T.Float32BufferAttribute(tones,3));shield.computeVertexNormals();
   mesh(shield,new T.MeshStandardMaterial({color:0x45494a,roughness:.76,metalness:.04,
    side:T.DoubleSide,vertexColors:true})).name='rolled-glare-shield';
   [-1,1].forEach(function(side){
    // The wiper rests against the lower edge of each front light.
    rod([9.17,1.16,side*.12],[9.08,1.27,side*.58],.012,'black');
    rod([9.09,1.25,side*.37],[9.08,1.28,side*.90],.016,'black');
   });
   box([8.96,-.14,0],[.20,1.75,3.02],'paint');
   [-1,1].forEach(function(side){
    pane([[7.05,-.9,side*1.28],[8.97,-.9,side*1.28],[8.97,.76,side*1.49],[7.05,.48,side*1.68]],false);
    rod([7.05,.49,side*1.67],[8.96,.77,side*1.49],.046,'paint');
    // Screw-fastened removable instrument panels.
    box([8.82,.41,side*.79],[.075,.62,1.32],'black');
    for(var z of [-.60,.60])for(var y of [.14,.68])
     mesh(new T.SphereGeometry(.013,8,6),'metal',[8.773,y,side*.79+z]);
   });
   ['AIRSPEED','GYRO','ALTITUDE','TURN','COMPASS','CLIMB'].forEach(function(n,i){
    gauge(8.76,.54-Math.floor(i/3)*.24,-1.21+(i%3)*.31,.112,n,.38+i*.043);
   });
   ['RPM','BOOST','OIL'].forEach(function(n,row){
    for(var col=0;col<4;col++)gauge(8.76,.56-row*.187,.29+col*.29,.080,n,.48+col*.008);
   });
   box([8.77,.01,-.78],[.10,.19,1.22],'black');
   for(var i=0;i<8;i++){
    var sz=-1.29+i*.146;
    rod([8.71,0,sz],[8.65,.043,sz],.014,'metal');
   }
   box([8.28,-.02,0],[.70,.72,.52],'black');
   box([8.15,-.2,0],[1,.75,.46],'paint');
   // Individual lever slots and blade handles emerge from the quadrant.
   // Separating the gates also gives the viewer a scale cue below the dials.
   var handleFinishes=[0x282a28,0x713e35,0x445060].map(function(color){
    return new T.MeshStandardMaterial({color:color,roughness:.43,metalness:.08});
   });
   var gateFinish=new T.MeshStandardMaterial({color:0x696960,roughness:.56,metalness:.46});
   var slotFinish=new T.MeshStandardMaterial({color:0x141512,roughness:.95});
   for(var row=0;row<3;row++){
    var x=8.08+row*.19;
    box([x,.352,0],[.174,.024,.49],gateFinish);
    for(var i=0;i<4;i++){
     var z=(i-1.5)*.106;
     box([x,.368,z],[.132,.008,.030],slotFinish);
     var lever=box([x-.016,.427,z],[.026,.13,.014],gateFinish);lever.rotation.z=.31;
     var handle=mesh(new T.SphereGeometry(1,24,16),handleFinishes[row],[x-.038,.493,z]);
     handle.scale.set(.040,.028,.037);
    }
   }
   var grip=new T.MeshPhysicalMaterial({color:0x383630,roughness:.48,clearcoat:.32,clearcoatRoughness:.37});
   var casting=new T.MeshStandardMaterial({color:0x646660,roughness:.48,metalness:.38});
   [-.63,.63].forEach(function(z){chairAt(z<0?'pilot':'copilot');rod([8,-1.05,z],[8,.1,z],.038,'metal');rod([8,.1,z],[8.04,.46,z],.055,'black');
    var wheel=mesh(new T.TorusGeometry(.26,.031,18,80),grip,[8.04,.46,z]);wheel.rotation.y=Math.PI/2;
    for(var sp=0;sp<3;sp++){
     var ang=-Math.PI/2+sp*Math.PI*2/3,sy=Math.sin(ang),sz=Math.cos(ang);
     var inner=new T.Vector3(8.10,.46+sy*.045,z+sz*.045),outer=new T.Vector3(8.04,.46+sy*.25,z+sz*.25);
     var stem=mesh(new T.CylinderGeometry(.016,.035,inner.distanceTo(outer),12),casting,inner.clone().lerp(outer,.5).toArray());
     stem.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),outer.sub(inner).normalize());
    }
    var hub=mesh(new T.SphereGeometry(1,28,16),grip,[8.067,.46,z]);hub.scale.set(.052,.067,.067);
    [-.26,.26].forEach(function(d){box([8.48,-.87,z+d/2],[.24,.04,.19],'metal');});});
   // Overhead auxiliary cluster visible above the windscreen centre.
   box([8.38,1.63,0],[.16,.44,.42],'black');gauge(8.29,1.65,0,.11,'COMPASS',.4);
   oxygen(6.3,-.2,-1.35);oxygen(6.3,-.2,1.35);
  }else if(station==='nav'||station==='bomb'||station==='nose'){
   shell(9,13.2,1.45,1.55,9.85,11.35,.30,.83,true,false);
   // Sheet-metal lining runs up to the lower window rail. The worktop
   // sits on a drawer cabinet and brackets attached to that lining.
   [-1,1].forEach(function(side){
    pane([[9,-1.0,side*1.12],[12.3,-1.0,side*1.12],[12.3,.30,side*1.39],[9,.30,side*1.39]],false);
    rod([9,.32,side*1.39],[12.3,.32,side*1.39],.046,'paint');
    for(var x=9.2;x<12.3;x+=.49){
     rod([x,-.94,side*1.11],[x,.28,side*1.38],.024,'rib');
     for(var y=-.77;y<.30;y+=.22)mesh(new T.SphereGeometry(.012,8,6),'metal',[x,y,side*(1.10+(y+.94)*.22)]);
    }
   });
   var board=document.createElement('canvas');board.width=768;board.height=512;
   var grain=board.getContext('2d');grain.fillStyle='#94724f';grain.fillRect(0,0,768,512);
   for(var fibre=0;fibre<720;fibre++){
    var y=(fibre*193)%512, x=(fibre*347)%810-40;
    var length=18+(fibre*71)%360;
    grain.strokeStyle=fibre%4?'rgba(61,41,24,.17)':'rgba(222,188,140,.29)';
    grain.lineWidth=.55+(fibre%4)*.22;
    grain.beginPath();grain.moveTo(x,y);
    grain.bezierCurveTo(x+length*.3,y+3*Math.sin(y*.03),x+length*.68,y-2,x+length,y+1);
    grain.stroke();
   }
   var veneer=new T.CanvasTexture(board);veneer.encoding=T.sRGBEncoding;veneer.anisotropy=4;
   var timber=new T.MeshStandardMaterial({map:veneer,roughness:.78});
   box([9.98,-.52,.77],[1.54,.07,.95],timber).name='wooden-worktop';
   chairAt('nav');
   box([10.50,-.78,.78],[.42,.48,.76],'paint');
   for(var drawer=0;drawer<2;drawer++){
    box([10.28,-.65-drawer*.21,.78],[.028,.185,.71],'rib');
    rod([10.248,-.65-drawer*.21,.65],[10.248,-.65-drawer*.21,.91],.014,'metal');
   }
   var record=new T.MeshStandardMaterial({color:0xf4efdc,roughness:.98});
   if(typeof global.Image==='function'&&global.KMSimulatorConfig?.showFlightRecord){
    record.map=new T.TextureLoader().load('textures/flight-record.jpg');
    record.map.encoding=T.sRGBEncoding;record.map.anisotropy=4;
   }
   var sheet=new T.PlaneGeometry(.515,.79,18,24);
   var vertices=sheet.attributes.position;
   for(var v=0;v<vertices.count;v++){
    var across=vertices.getX(v)/.515+.5,along=vertices.getY(v)/.79+.5;
    vertices.setZ(v,.022*Math.pow(across*along,5)+.004*Math.pow(1-along,6));
   }
   sheet.computeVertexNormals();
   var paper=mesh(sheet,record,[9.96,-.482,.72]);
   paper.name='archival-flight-record';paper.rotation.order='YXZ';
   paper.rotation.y=-Math.PI/2+.08;paper.rotation.x=-Math.PI/2;
   var pencilStart=new T.Vector3(9.66,-.475,.39),pencilEnd=new T.Vector3(10.02,-.475,.35);
   var axis=pencilEnd.clone().sub(pencilStart).normalize();
   var lacquer=new T.MeshStandardMaterial({color:0x8a6032,roughness:.72});
   rod(pencilStart.toArray(),pencilEnd.toArray(),.009,lacquer);
   var point=mesh(new T.ConeGeometry(.009,.036,6),new T.MeshStandardMaterial({color:0xc8a97b,roughness:1}),
    pencilEnd.clone().addScaledVector(axis,.018).toArray());
   point.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis);
   rod(pencilEnd.clone().addScaledVector(axis,.030).toArray(),pencilEnd.clone().addScaledVector(axis,.039).toArray(),.002,'black');
   // Flexible-neck bench light and rolled charts at the outboard edge.
   box([10.48,-.45,1.09],[.13,.06,.13],'black');
   rod([10.48,-.42,1.09],[10.48,-.14,1.09],.018,'metal');
   rod([10.48,-.14,1.09],[10.37,-.09,.99],.020,'metal');
   var shade=mesh(new T.ConeGeometry(.094,.125,24,1,true),'paint',[10.36,-.145,.98]);
   shade.rotation.z=-.32;
   for(var roll=0;roll<2;roll++){
    var end=.99+roll*.085;
    // Spiral cross-section leaves a hollow end and a visible outer lip.
    var strips=[],indices=[],steps=96,startX=9.36+roll*.067;
    for(var edge=0;edge<=steps;edge++){
     var u=edge/steps,angle=u*Math.PI*5+.4,radius=.016+.025*u;
     var height=-.443+Math.sin(angle)*radius, lateral=end+Math.cos(angle)*radius;
     strips.push(startX,height,lateral,10.21-roll*.035,height,lateral);
     if(edge){var idx=edge*2;indices.push(idx-2,idx-1,idx,idx,idx-1,idx+1);}
    }
    var rolled=new T.BufferGeometry();
    rolled.setAttribute('position',new T.Float32BufferAttribute(strips,3));rolled.setIndex(indices);rolled.computeVertexNormals();
    mesh(rolled,new T.MeshStandardMaterial({color:roll?0xb6aa83:0xd5c9a8,roughness:.96,side:T.DoubleSide}));
    rod([9.71,-.443,end],[9.735,-.443,end],.0415,'canvas');
   }
   box([11.7,-1.05,0],[.40,.16,.40],'black');rod([11.7,-1,0],[11.7,-.38,0],.065,'metal');box([11.7,-.45,0],[.32,.24,.30],'black');rod([11.7,-.3,0],[11.5,-.20,0],.065,'black');
   chairAt('bomb');oxygen(9.35,-.5,-1.13);gun(12.4,.05,-.25,[1,0,0]);gun(12.4,.05,.25,[1,0,0]);
  }else if(station==='radio'){
   shell(1.8,5.3,1.75,1.8,2.5,4.4,.45,1.30,false);
   box([3.4,-.15,-1.06],[1.8,.08,.90],'paint');chairAt('radio');
   box([3.43,-.055,-1.33],[1.61,.12,.41],'rib');
   var panel=document.createElement('canvas');panel.width=768;panel.height=256;
   var display=panel.getContext('2d');
   display.fillStyle='#252826';display.fillRect(0,0,768,256);
   display.fillStyle='#111817';display.fillRect(35,57,295,82);
   display.fillRect(406,64,122,62);
   display.fillStyle='#c3bda0';display.font='24px sans-serif';
   display.fillText('RECEIVER',48,38);display.fillText('TUNING',413,38);
   display.fillText('BAND',76,203);display.fillText('GAIN',320,203);display.fillText('OUTPUT',576,203);
   for(var tick=0;tick<21;tick++)display.fillRect(53+tick*12,86,1,tick%5===0?25:13);
   display.fillStyle='#e3b46e';display.fillRect(183,73,2,54);
   var panelTex=new T.CanvasTexture(panel);panelTex.encoding=T.sRGBEncoding;
   box([3.18,.20,-1.40],[1.07,.43,.30],'black');
   box([3.18,.20,-1.244],[1.03,.39,.014],new T.MeshStandardMaterial({map:panelTex,roughness:.7})).name='radio-receiver-face';
   box([3.98,.135,-1.39],[.44,.30,.31],'black');
   box([3.98,.252,-1.232],[.34,.038,.014],'metal');
   [[2.82,.09,.048],[3.16,.09,.065],[3.52,.09,.048],[3.94,.14,.058],[4.10,.07,.028]].forEach(function(k){
    var knob=mesh(new T.CylinderGeometry(k[2],k[2],.035,22),'black',[k[0],k[1],-1.22]);knob.rotation.x=Math.PI/2;
    box([k[0],k[1]+k[2]*.58,-1.198],[.009,.018,.005],'metal');
   });
   for(var vent=0;vent<6;vent++)box([3.98,.104-vent*.025,-1.231],[.26,.008,.008],'rib');
   box([3.76,-.085,-.91],[.27,.04,.17],'black');
   rod([3.69,-.057,-.91],[3.84,-.04,-.91],.013,'metal');
   box([3.83,-.032,-.91],[.045,.018,.047],'black');
   oxygen(4.9,-.1,1.35);
  }else if(station==='waistL'||station==='waistR'){
   shell(-8.8,-3.5,1.90,2.1,-7.9,-4.8,-.35,1.60,false);
   [-1,1].forEach(function(s){gun(-6,.28,s*1.40,[0,0,s]);rod([-6,-1.3,s*1.3],[-6,.1,s*1.3],.048,'metal');box([-6.7,-.7,s*1.5],[.45,.48,.30],'paint');});
   oxygen(-8,-.45,1.4);box([-5,-1.31,0],[.9,.06,1.35],'canvas');
  }else if(station==='ball'&&global.KasselBallTurret){
   var turret=global.KasselBallTurret.build(T),center=[-2,-2.2,0];turret.group.position.set.apply(turret.group.position,center);root.add(turret.group);
   seats.ball=center.map(function(v,i){return v+turret.eye[i];});looks.ball=turret.look;
   root.userData.ballTurretDiameterIn=turret.dimensions.diameterIn;
  }else{
   var pos=seats[station]||seats.tail;var x=pos[0],y=pos[1],r=station==='ball'?.85:station==='ttop'?1.12:.95;
   var header=y+(station==='ttop'?.47:.65);
   for(var j=0;j<12;j++){var a=j/12*Math.PI*2,b=(j+1)/12*Math.PI*2;pane([[x+Math.cos(a)*r,y-.65,Math.sin(a)*r],[x+Math.cos(b)*r,y-.65,Math.sin(b)*r],[x+Math.cos(b)*r*.75,header,Math.sin(b)*r*.75],[x+Math.cos(a)*r*.75,header,Math.sin(a)*r*.75]],true,true);}
   var capTop=[],capBottom=[];
   for(var k=0;k<12;k++){
    var theta=k*Math.PI/6;
    capTop.push([x+Math.cos(theta)*r*.75,header,Math.sin(theta)*r*.75]);
    capBottom.push([x+Math.cos(theta)*r,y-.65,Math.sin(theta)*r]);
   }
   if(station==='ttop'){
    var domeGlass=mats.glass.clone();
    domeGlass.opacity=.22;
    domeGlass.color.setHex(0xb2c5c8);
    var crown=[x,y+1.10,0];
    for(var segment=0;segment<capTop.length;segment++){
     var start=capTop[segment],end=capTop[(segment+1)%capTop.length];
     var paneStart=root.children.length;
     pane([start,end,crown],true,true);
     root.children[paneStart].material=domeGlass;
    }
    seats.ttop=[x-.30,y-.105,0];looks.ttop=[1,.06,0];
   }else pane(capTop,false,true);
   pane(capBottom,false,true);
   var dir=station==='tail'?-1:1;[-.27,.27].forEach(function(z){gun(x+dir*.5,y-.25,z,[dir,0,0]);});orientedChair([x-dir*.2,y-.75,0],dir<0?Math.PI:0);rod([x+dir*.4,y-.5,0],[x+dir*.4,y-.18,0],.025,'metal');
  }
  // Mission sunlight and sky illumination follow the aircraft through the turn.
  // Batch static structure by material; keep lights and individually authored
  // instrument faces. This reduces frame/stringer draw calls by an order of magnitude.
  var linearMaterials=new Set();root.children.forEach(function(o){if(o.isMesh){var m=o.material;if(m&&m.color&&!linearMaterials.has(m)){linearMaterials.add(m);m.color.convertSRGBToLinear();}}});
  // Project the scans in cabin units. Adjacent panels retain the same
  // grain scale even when their mesh dimensions differ by several metres.
  root.children.forEach(function(o){
   if(!o.isMesh||!o.material.userData.cabinFinish)return;
   o.updateMatrix();var g=o.geometry;
   if(g.index){o.geometry=g.toNonIndexed();g.dispose();g=o.geometry;}
   var pos=g.attributes.position,uv=[],v=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),n=new T.Vector3();
   var scale=o.material.userData.cabinFinish==='cloth'?2.2:.58;
   for(var i=0;i<pos.count;i+=3){
    a.fromBufferAttribute(pos,i);b.fromBufferAttribute(pos,i+1);v.fromBufferAttribute(pos,i+2);
    a.applyMatrix4(o.matrix);b.applyMatrix4(o.matrix);v.applyMatrix4(o.matrix);
    n.crossVectors(b.sub(a),v.sub(a));
    var x=Math.abs(n.x),y=Math.abs(n.y),z=Math.abs(n.z);
    for(var k=0;k<3;k++){v.fromBufferAttribute(pos,i+k).applyMatrix4(o.matrix);
     uv.push((x>y&&x>z?v.z:v.x)*scale,(y>x&&y>z?v.z:v.y)*scale);}
   }
   g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  });
  var batches=new Map();root.updateMatrixWorld(true);root.children.slice().forEach(function(o){if(!o.isMesh)return;var list=batches.get(o.material)||[];list.push(o);batches.set(o.material,list);});
  batches.forEach(function(objects,material){if(objects.length<2)return;var positions=[],normals=[],uvs=[];
   objects.forEach(function(o){var geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrix);var p=geo.attributes.position,n=geo.attributes.normal,u=geo.attributes.uv;for(var i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n?n.getX(i):0,n?n.getY(i):1,n?n.getZ(i):0);uvs.push(u?u.getX(i):0,u?u.getY(i):0);}geo.dispose();o.geometry.dispose();root.remove(o);});
   var merged=new T.BufferGeometry();merged.setAttribute('position',new T.Float32BufferAttribute(positions,3));merged.setAttribute('normal',new T.Float32BufferAttribute(normals,3));merged.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));merged.computeBoundingSphere();root.add(new T.Mesh(merged,material));
  });
  var defs={};Object.keys(seats).forEach(function(k){var p=seats[k],l=looks[k];defs[k]={offset:{x:p[0],y:p[1],z:p[2]},look:{x:l[0],y:l[1],z:l[2]}};});
  return {group:root,seats:defs};
 }};
 /* Reference-led compartment models (crew-compartments.js) replace the
    procedural rooms for the flight deck, radio, nose and waist stations.
    The procedural room is still built, hidden, and shown again if a model
    cannot load, so the station never opens onto an empty fuselage. */
 var proceduralBuild=global.KasselInterior.build;
 global.KasselInterior.build=function(T,station){
  var built=proceduralBuild(T,station),cc=global.KasselCrewCompartments;
  if(!(cc&&cc.available(T)&&cc.covers(station)))return built;
  var root=built.group,defs=built.seats,cs=cc.seats(),parts=cc.parts(station).join('|'),previous={};
  var procedural=root.children.filter(function(o){return !o.isLight&&o.visible;});
  procedural.forEach(function(o){o.visible=false;});
  // Every station that shares these compartments takes the model's eye point.
  Object.keys(cs).forEach(function(k){
   if(!defs[k]||!cc.covers(k)||cc.parts(k).join('|')!==parts)return;
   previous[k]={offset:defs[k].offset,look:defs[k].look};
   var p=cs[k].pos,l=cs[k].look;defs[k].offset={x:p[0],y:p[1],z:p[2]};defs[k].look={x:l[0],y:l[1],z:l[2]};
  });
  root.userData.crewCompartments=cc.parts(station);
  var cal=root.userData.eyeCalibration;
  if(cal&&cc.floorMetres[station]!=null){cal.waistFloorTop=cc.toUnits([0,cc.floorMetres[station],0])[1];
   cal.geometryStatus='Waist compartment model floor (crew-compartments.js); estimated, not factory schematic exact';}
  cc.attach(T,root,station,function(){
   procedural.forEach(function(o){o.visible=true;});
   Object.keys(previous).forEach(function(k){defs[k].offset=previous[k].offset;defs[k].look=previous[k].look;});
   delete root.userData.crewCompartments;
  });
  return built;
 };
})(window);
