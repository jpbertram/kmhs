/* Live flight-deck instruments and controls for the crew view.
 *
 * Instruments: every dial in the flight-deck model is located by
 * tools/cockpit-live/extract-gauges.mjs (cockpit-gauges.js) from the gauge
 * atlas, then overdrawn here with the same face artwork as the model but with
 * needles, horizon, card and ball driven by the simulated flight.
 * Controls: the yokes, rudder pedals and throttle levers are lifted out of the
 * merged model once at load (prepare) into their own pivots and moved by apply.
 * A station model that already carries nodes named ctl:yoke_L, ctl:yoke_R,
 * ctl:pedal_L_L ... ctl:throttle_1..4 is used as is.
 *
 * Frame: crew GLB metres, +Y up, nose -Z, origin flight-deck floor at the pilot.
 * Values shown are derived from the simulator's flight path and the recorded
 * damage; they are representative readings, not a flight-data record.
 */
(function(root){
 'use strict';
 var D=Math.PI/180,FONT='Arial, Helvetica, "DejaVu Sans", sans-serif';
 var DEFS={
  'AIR SPEED':{nums:['','50','100','150','200','250','300','350'],unit:'M.P.H.',arcs:[[0.12,0.55,'#2f8f3a'],[0.55,0.8,'#c9a227']]},
  'ALTITUDE':{kind:'alt'},'GYRO HORIZON':{kind:'att'},'TURN':{kind:'turn'},'DIRECTIONAL GYRO':{kind:'compass'},
  'RATE OF CLIMB':{start:180,sweep:340,nums:['0','1','2','3','4','5','4','3','2','1'],unit:'1000 FT/MIN'},
  'MANIFOLD PRESS':{nums:['10','20','30','40','50','60','70'],unit:'IN. HG',dual:true,arcs:[[0.35,0.62,'#2f8f3a'],[0.62,0.75,'#c9a227']]},
  'TACHOMETER':{nums:['0','5','10','15','20','25','30','35','40'],unit:'R.P.M.x100',dual:true,arcs:[[0.45,0.6,'#2f8f3a']]},
  'FUEL PRESS':{nums:['0','5','10','15','20','25'],unit:'LBS',arcs:[[0.55,0.8,'#2f8f3a']]},
  'OIL TEMP':{nums:['0','20','40','60','80','100'],unit:'DEG C',arcs:[[0.4,0.75,'#2f8f3a'],[0.98,1,'#b3261e']]},
  'OIL PRESS':{nums:['0','40','80','120','160','200'],unit:'LBS',arcs:[[0.38,0.5,'#2f8f3a']]},
  'CYL. TEMP':{nums:['0','50','100','150','200','250','300'],unit:'DEG C',arcs:[[0.5,0.78,'#2f8f3a'],[0.85,0.87,'#b3261e']]},
  'CARB. AIR':{nums:['-50','0','50','100','150'],unit:'DEG C',arcs:[[0.3,0.45,'#c9a227']]},
  'CLOCK':{kind:'clock'},'SUCTION':{nums:['0','2','4','6','8','10'],unit:'IN. HG'},
  'FUEL':{nums:['E','1/4','1/2','3/4','F'],unit:'GALS'},'AMPERES':{nums:['0','50','100','150'],unit:'D.C.'},
  'FLAPS':{start:200,sweep:140,nums:['UP','1/2','DN'],unit:'POSITION'},
  'HYD. PRESS':{nums:['0','400','800','1200','1600'],unit:'LBS'},'FREE AIR':{nums:['-60','-30','0','30','60'],unit:'DEG C'}
 };
 /* the same face artwork as b24-cockpit.html, with live values in place of random needles */
 function face(g,d,label,v){
  var Rr=60,r=Rr*.86,W='#ecebdf';
  g.save();g.translate(64,64);
  g.fillStyle='#2b2b29';g.beginPath();g.arc(0,0,Rr,0,7);g.fill();
  var fg=g.createRadialGradient(-10,-12,4,0,0,Rr);fg.addColorStop(0,'#1c1c1b');fg.addColorStop(1,'#060606');g.fillStyle=fg;
  g.beginPath();g.arc(0,0,Rr*.92,0,7);g.fill();
  g.strokeStyle=W;g.fillStyle=W;g.textAlign='center';g.textBaseline='middle';
  function needle(a,len,w,col){g.save();g.rotate(a);g.fillStyle=col||W;g.beginPath();
   g.moveTo(-len*.18,-w);g.lineTo(len,-w*.35);g.lineTo(len+3,0);g.lineTo(len,w*.35);g.lineTo(-len*.18,w);g.closePath();g.fill();g.restore();}
  function text(t,y,size){g.font='bold '+(size||8)+'px '+FONT;g.fillText(t,0,y);}
  if(d.kind==='att'){
   g.save();g.beginPath();g.arc(0,0,r,0,7);g.clip();
   var pitch=Math.max(-24,Math.min(24,v.pitch/D*1.6));
   g.rotate(-v.bank);g.fillStyle='#26384a';g.fillRect(-r,-r*1.6,2*r,r*1.6+pitch);g.fillStyle='#1b1712';g.fillRect(-r,pitch,2*r,r*1.6);
   g.fillStyle=W;g.fillRect(-r,pitch-1.5,2*r,3);
   for(var i=-2;i<=2;i++)if(i)g.fillRect(-10,pitch-i*9,20,1.2);
   g.restore();g.lineWidth=2;
   [-60,-30,-20,-10,0,10,20,30,60].forEach(function(a){g.save();g.rotate((a-90)*D);g.beginPath();g.moveTo(r-(a%30?5:10),0);g.lineTo(r,0);g.stroke();g.restore();});
   g.save();g.rotate(-v.bank);g.fillStyle='#e08a2e';g.beginPath();g.moveTo(0,-r+1);g.lineTo(-4,-r+8);g.lineTo(4,-r+8);g.fill();g.restore();
   g.strokeStyle='#e08a2e';g.lineWidth=3;g.beginPath();g.moveTo(-26,0);g.lineTo(-8,0);g.lineTo(-4,5);g.lineTo(0,0);g.lineTo(4,5);g.lineTo(8,0);g.lineTo(26,0);g.stroke();
   g.fillStyle=W;text('GYRO HORIZON',r*.62,6);
  }else if(d.kind==='turn'){
   g.lineWidth=2;
   [-20,0,20].forEach(function(a){g.save();g.rotate((a-90)*D);g.fillRect(r-12,-3,12,6);g.restore();});
   /* standard-rate (3 deg/s) turn lines the needle up with a doghouse */
   needle((-90+Math.max(-32,Math.min(32,v.turnRate/3*20)))*D,r*.72,3.5);
   g.strokeStyle=W;g.lineWidth=1.5;g.beginPath();g.arc(0,-r*.9,r*1.2,70*D,110*D);g.stroke();
   g.beginPath();g.arc(0,-r*.9,r*1.48,70*D,110*D);g.stroke();
   g.fillStyle='#111';g.beginPath();g.arc(Math.max(-9,Math.min(9,v.slip*30)),r*.44,7,0,7);g.fill();g.strokeStyle=W;g.stroke();
   g.fillStyle=W;text('TURN',-r*.35,9);
  }else if(d.kind==='compass'){
   g.save();g.rotate(-v.heading*D);
   for(var c=0;c<72;c++){g.save();g.rotate(c*5*D);g.fillRect(-.7,-r,1.4,c%2?4:8);g.restore();}
   g.font='bold 13px '+FONT;['N','E','S','W'].forEach(function(t,i){g.save();g.rotate(i*90*D);g.fillText(t,0,-r+18);g.restore();});
   g.font='bold 8px '+FONT;for(var k=0;k<12;k++)if(k%3){g.save();g.rotate(k*30*D);g.fillText(String(k*3),0,-r+17);g.restore();}
   g.restore();
   g.fillStyle='#e08a2e';g.beginPath();g.moveTo(0,-r+1);g.lineTo(-4,-r-6);g.lineTo(4,-r-6);g.fill();
   g.strokeStyle='#e08a2e';g.lineWidth=2;g.beginPath();g.moveTo(0,-12);g.lineTo(0,12);g.moveTo(-12,2);g.lineTo(12,2);g.stroke();
  }else if(d.kind==='clock'||d.kind==='alt'){
   g.lineWidth=1.5;var n=d.kind==='clock'?12:10;
   for(var q=0;q<50;q++){g.save();g.rotate(q/50*Math.PI*2);g.fillRect(-.6,-r,1.2,q%5?4:9);g.restore();}
   g.font='bold 13px '+FONT;
   for(var h=0;h<n;h++){var a=h/n*Math.PI*2-Math.PI/2;g.fillText(String(d.kind==='clock'?(h||12):h),Math.cos(a)*(r-17),Math.sin(a)*(r-17));}
   text(d.kind==='clock'?'ELAPSED TIME':'ALTITUDE',r*.38,6);
   if(d.kind==='alt'){g.fillStyle='#0a0a0a';g.fillRect(r*.18,-5,20,10);g.fillStyle=W;g.font='7px '+FONT;g.fillText('29.92',r*.18+10,0);}
   var big=d.kind==='clock'?v.clockMin/60:(v.altFt%1000)/1000,small=d.kind==='clock'?(v.clockHr%12)/12+v.clockMin/720:(v.altFt%10000)/10000;
   needle(small*Math.PI*2-Math.PI/2,r*.5,3.5);needle(big*Math.PI*2-Math.PI/2,r*.8,2.2);
  }else{
   var st=(d.start===undefined?135:d.start)*D,sw=(d.sweep||270)*D;
   (d.arcs||[]).forEach(function(arc){g.strokeStyle=arc[2];g.lineWidth=5;g.beginPath();g.arc(0,0,r-3,st+sw*arc[0],st+sw*arc[1]);g.stroke();});
   g.strokeStyle=W;var nums=d.nums,segs=nums.length-1,minor=5;
   for(var m=0;m<=segs*minor;m++){g.save();g.rotate(st+sw*m/(segs*minor));g.fillRect(r-(m%minor?5:10),-.7,m%minor?5:10,m%minor?1.2:2);g.restore();}
   g.font='bold '+(nums.some(function(t){return t.length>3;})?8:10)+'px '+FONT;
   nums.forEach(function(t,i){var aa=st+sw*i/segs;g.fillText(t,Math.cos(aa)*(r-20),Math.sin(aa)*(r-20));});
   text(label,r*.4,label.length>11?6:7);text(d.unit||'',r*.58,5);
   var f=v.frac;
   if(label==='RATE OF CLIMB'){var vs=Math.max(-4.8,Math.min(4.8,v.vsi/1000));needle(st+(vs>=0?vs:vs)*sw/9,r*.82,2.6);}
   else{needle(st+sw*Math.max(0,Math.min(1,f[0])),r*.82,2.6);if(d.dual)needle(st+sw*Math.max(0,Math.min(1,f[1])),r*.82,2,'#d8c48a');}
  }
  g.fillStyle='#111';g.beginPath();g.arc(0,0,5,0,7);g.fill();g.fillStyle='#555';g.beginPath();g.arc(-1,-1,2,0,7);g.fill();
  var hl=g.createLinearGradient(-r,-r,r*.3,r*.3);hl.addColorStop(0,'rgba(255,255,255,0.14)');hl.addColorStop(.5,'rgba(255,255,255,0)');
  g.fillStyle=hl;g.beginPath();g.arc(0,0,Rr*.92,0,7);g.fill();
  g.restore();
 }
 /* Needle positions for one dial. Engine gauges read two engines (dual) or one, in panel order. */
 function reading(label,idx,s){
  function e(n){return s.engines[(n+4)%4];}
  var pair=[2*(idx%2),2*(idx%2)+1],one=e(idx);
  switch(label){
   case 'AIR SPEED':return [s.ias/350];
   case 'MANIFOLD PRESS':return pair.map(function(n){return (e(n).map-10)/60;});
   case 'TACHOMETER':return pair.map(function(n){return e(n).rpm/4000;});
   case 'FUEL PRESS':return [(one.dead?2:16)/25];
   case 'OIL TEMP':return [one.oilT/100];
   case 'OIL PRESS':return [one.oilP/200];
   case 'CYL. TEMP':return [one.cht/300];
   case 'CARB. AIR':return [(s.carb+50)/200];
   case 'SUCTION':return [s.suction/10];
   case 'FUEL':return [s.fuel];
   case 'AMPERES':return [s.amps/150];
   case 'FLAPS':return [0];
   case 'HYD. PRESS':return [s.hyd/1600];
   case 'FREE AIR':return [(s.oat+60)/120];
  }
  return [0];
 }
 var cache=new WeakMap();
 function liveGauges(T,flightdeck){
  var list=root.KasselCockpitGauges||[],made=[],count={};
  var grp=new T.Group();grp.name='live-gauges';
  list.forEach(function(gd){
   var d=DEFS[gd.label];if(!d)return;
   var k=count[gd.label]=(count[gd.label]||0);count[gd.label]++;
   var cv=document.createElement('canvas');cv.width=cv.height=128;
   var tx=new T.CanvasTexture(cv);if(T.sRGBEncoding)tx.encoding=T.sRGBEncoding;
   var mat=new T.MeshBasicMaterial({map:tx,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
   /* disc covers the model's face (the face radius is 0.94 of the cell) */
   var mesh=new T.Mesh(new T.CircleGeometry(gd.r*64/60,32),mat);
   var n=new T.Vector3().fromArray(gd.n).normalize(),up=new T.Vector3().fromArray(gd.up).normalize(),x=new T.Vector3().crossVectors(up,n).normalize();
   up.crossVectors(n,x).normalize();
   mesh.matrix.makeBasis(x,up,n).setPosition(new T.Vector3().fromArray(gd.c).addScaledVector(n,0.0012));
   mesh.matrixAutoUpdate=false;mesh.name='gauge:'+gd.label;
   /* map the 128px canvas to the disc: geometry UVs already span 0..1 */
   grp.add(mesh);made.push({def:d,label:gd.label,idx:k,cv:cv,tx:tx,last:''});
  });
  flightdeck.add(grp);
  return made;
 }
 /* ---------- controls lifted out of the merged model ---------- */
 var QP=[0,0.6,-0.64];
 var CONTROLS=[
  {id:'yoke_L',box:[-0.66,0.56,-0.675,-0.30,0.96,-0.58],skip:/metal/,pivot:[-0.48,0.76,-0.63],axis:[0,-0.06,0.998]},
  {id:'yoke_R',box:[0.30,0.56,-0.675,0.66,0.96,-0.58],skip:/metal/,pivot:[0.48,0.76,-0.63],axis:[0,-0.06,0.998]},
  {id:'pedal_L_L',box:[-0.66,0.07,-0.92,-0.48,0.43,-0.80],pivot:[-0.59,0.25,-0.86]},
  {id:'pedal_L_R',box:[-0.48,0.07,-0.92,-0.30,0.43,-0.80],pivot:[-0.37,0.25,-0.86]},
  {id:'pedal_R_L',box:[0.30,0.07,-0.92,0.48,0.43,-0.80],pivot:[0.37,0.25,-0.86]},
  {id:'pedal_R_R',box:[0.48,0.07,-0.92,0.66,0.43,-0.80],pivot:[0.59,0.25,-0.86]}
 ];
 [0,1,2,3].forEach(function(i){var x=-0.109+i*0.016;CONTROLS.push({id:'throttle_'+(i+1),box:[x-0.008,0.62,-0.70,x+0.008,0.95,-0.30],radial:0.182,pivot:QP,axis:[1,0,0]});});
 function denorm(attr){
  if(!attr.normalized)return 1;var a=attr.array;
  return a instanceof Int16Array?1/32767:a instanceof Uint16Array?1/65535:a instanceof Int8Array?1/127:a instanceof Uint8Array?1/255:1;
 }
 function prepare(T,scene){
  if(scene.getObjectByName('ctl:yoke_L')||scene.userData.controlsPrepared)return;
  scene.userData.controlsPrepared=true;
  scene.updateMatrixWorld(true);
  var inv=new T.Matrix4().copy(scene.matrixWorld).invert?new T.Matrix4().copy(scene.matrixWorld).invert():new T.Matrix4().getInverse(scene.matrixWorld);
  var meshes=[];scene.traverse(function(o){if(o.isMesh&&o.geometry&&o.geometry.attributes.position)meshes.push(o);});
  var groups={};
  CONTROLS.forEach(function(c){
   var g=new T.Group();g.name='ctl:'+c.id;g.position.fromArray(c.pivot);
   if(c.axis){g.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3().fromArray(c.axis).normalize());}
   g.updateMatrix();g.userData.inv=new T.Matrix4().copy(g.matrix);g.userData.inv=g.userData.inv.invert?g.userData.inv.invert():new T.Matrix4().getInverse(g.matrix);
   g.userData.base={p:g.position.clone(),q:g.quaternion.clone()};
   groups[c.id]=g;
  });
  meshes.forEach(function(mesh){
   var geo=mesh.geometry,pa=geo.attributes.position,na=geo.attributes.normal,ua=geo.attributes.uv,idx=geo.index;
   var rel=new T.Matrix4().multiplyMatrices(inv,mesh.matrixWorld),nm=new T.Matrix3().getNormalMatrix(rel);
   var ps=denorm(pa),ns=na?denorm(na):1,us=ua?denorm(ua):1,tri=(idx?idx.count:pa.count)/3;
   var keep=[],taken={},v=new T.Vector3(),cen=new T.Vector3();
   function vi(t,k){return idx?idx.getX(t*3+k):t*3+k;}
   function P(i,out){return out.set(pa.getX(i)*ps,pa.getY(i)*ps,pa.getZ(i)*ps).applyMatrix4(rel);}
   for(var t=0;t<tri;t++){
    cen.set(0,0,0);for(var k=0;k<3;k++)cen.add(P(vi(t,k),v));cen.multiplyScalar(1/3);
    var hit=null;
    for(var c=0;c<CONTROLS.length&&!hit;c++){var C=CONTROLS[c],b=C.box;
     if(C.skip&&C.skip.test(mesh.material&&mesh.material.name||''))continue;
     if(cen.x<b[0]||cen.x>b[3]||cen.y<b[1]||cen.y>b[4]||cen.z<b[2]||cen.z>b[5])continue;
     if(C.radial&&Math.hypot(cen.y-QP[1],cen.z-QP[2])<C.radial)continue;
     hit=C.id;}
    if(hit)(taken[hit]=taken[hit]||[]).push(t);else keep.push(t);
   }
   var ids=Object.keys(taken);if(!ids.length)return;
   ids.forEach(function(id){
    var list=taken[id],g=groups[id],pos=new Float32Array(list.length*9),nor=na?new Float32Array(list.length*9):null,uv=ua?new Float32Array(list.length*6):null,w=0;
    var gnm=new T.Matrix3().getNormalMatrix(g.userData.inv);
    list.forEach(function(t){for(var k=0;k<3;k++){var i=vi(t,k);
     P(i,v).applyMatrix4(g.userData.inv);pos[w*3]=v.x;pos[w*3+1]=v.y;pos[w*3+2]=v.z;
     if(nor){v.set(na.getX(i)*ns,na.getY(i)*ns,na.getZ(i)*ns).applyMatrix3(nm).applyMatrix3(gnm).normalize();nor[w*3]=v.x;nor[w*3+1]=v.y;nor[w*3+2]=v.z;}
     if(uv){uv[w*2]=ua.getX(i)*us;uv[w*2+1]=ua.getY(i)*us;}
     w++;}});
    var ng=new T.BufferGeometry();ng.setAttribute('position',new T.BufferAttribute(pos,3));
    if(nor)ng.setAttribute('normal',new T.BufferAttribute(nor,3));else ng.computeVertexNormals();
    if(uv)ng.setAttribute('uv',new T.BufferAttribute(uv,2));
    g.add(new T.Mesh(ng,mesh.material));
   });
   var arr=[];keep.forEach(function(t){arr.push(vi(t,0),vi(t,1),vi(t,2));});
   geo.setIndex(arr);
  });
  Object.keys(groups).forEach(function(id){var g=groups[id];if(g.children.length)scene.add(g);});
 }
 /* ---------- per-frame ---------- */
 function apply(T,cabin,s){
  var st=cache.get(cabin);
  if(!st){
   var fd=null;cabin.traverse(function(o){if(!fd&&o.name==='B24-flightdeck')fd=o;});
   if(!fd||!fd.children[0])return false;
   var scene=fd.children[0];
   st={scene:scene,ctl:{},gauges:typeof document!=='undefined'?liveGauges(T,scene):[],rr:0};
   /* clones carry userData as plain JSON, so take the rest pose from the clone itself */
   scene.traverse(function(o){if(/^ctl:/.test(o.name)){st.ctl[o.name.slice(4)]=o;o.userData.base={p:o.position.clone(),q:o.quaternion.clone()};delete o.userData.rest;}});
   cache.set(cabin,st);
  }
  /* controls */
  var c=st.ctl,q=new T.Quaternion(),ax=new T.Vector3(0,0,1),xax=new T.Vector3(1,0,0);
  ['yoke_L','yoke_R'].forEach(function(id){var y=c[id];if(!y)return;var b=y.userData.base;
   y.quaternion.copy(b.q).multiply(q.setFromAxisAngle(ax,-s.aileron*1.15));
   y.position.copy(b.p).add(new T.Vector3(0,0,s.elevator*0.045).applyQuaternion(b.q));});
  [['pedal_L_L',1],['pedal_L_R',-1],['pedal_R_L',1],['pedal_R_R',-1]]  /* right rudder: right pedal forward (-Z) */.forEach(function(pd){var o=c[pd[0]];if(!o)return;
   o.position.copy(o.userData.base.p);o.position.z+=pd[1]*s.rudder*0.05;});
  for(var i=1;i<=4;i++){var th=c['throttle_'+i];if(!th)continue;
   if(th.userData.rest===undefined){var bb=new T.Box3().setFromObject(th),cc=bb.getCenter(new T.Vector3());th.parent.worldToLocal(cc);th.userData.rest=Math.atan2(cc.y-QP[1],cc.z-QP[2]);}
   var target=(40+(s.engines[i-1].throttle||0)*60)*D;   /* closed 40 deg ... full 100 deg on the quadrant */
   th.quaternion.copy(th.userData.base.q).multiply(q.setFromAxisAngle(xax,target-th.userData.rest));}
  /* instruments: redraw a few per frame */
  var n=st.gauges.length;
  for(var r=0;r<Math.min(n,7);r++){
   var gg=st.gauges[st.rr++%n],v={bank:s.bank,pitch:s.pitch,heading:s.heading,turnRate:s.turnRate,slip:s.slip,altFt:s.altFt,vsi:s.vsi,clockHr:s.clockHr,clockMin:s.clockMin,frac:reading(gg.label,gg.idx,s)};
   var key=[v.bank.toFixed(2),v.pitch.toFixed(2),v.heading.toFixed(0),v.turnRate.toFixed(1),v.slip.toFixed(2),(v.altFt/20|0),(v.vsi/50|0),v.clockMin|0,v.frac.map(function(f){return f.toFixed(3);}).join()].join('|');
   if(key===gg.last)continue;gg.last=key;
   face(gg.cv.getContext('2d'),gg.def,gg.label,v);gg.tx.needsUpdate=true;
  }
  return true;
 }
 var api={prepare:prepare,apply:apply,face:face,reading:reading,CONTROLS:CONTROLS,DEFS:DEFS};
 root.KasselCockpitLive=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
