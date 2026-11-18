/* How recorded battle damage LOOKS on the formation B-24 (km3d-v3.js decides
 * what and when from aircraft-damage.js; this file decides the look).
 *
 * The skin is not decorated with flat discs. Each damaged ship gets its own
 * copy of the skin materials with a shader patch that:
 *   - cuts the skin away inside every hole, along a ragged noise edge, so you
 *     look into the airframe;
 *   - shades the now-visible inside of the far skin as the dim zinc-chromate
 *     interior with frames, stringers and ribs;
 *   - strips paint to bare aluminium in a chipped band round each hole and
 *     brightens the torn edge;
 *   - scatters flak: fields of many small ragged holes whose density falls
 *     off from the burst;
 *   - lays soot downwind of fires, blistering paint, and oil streaks trailing
 *     aft from a hit engine over the nacelle and wing;
 *   - strips the doped fabric off a shot-up rudder, leaving the ribs.
 * Real geometry adds what a shader can't: torn metal petals bent out of (or
 * into) the skin round the larger holes, and broken stringers and frame
 * segments behind the big tears.
 *
 * Patterns follow wartime damage photographs: flak leaves clusters of small
 * ragged punctures with bright torn edges and chipped paint; 20 mm cannon
 * shells peel skin back in petals and blow larger tears; oil from a hit
 * engine streaks straight aft in the slipstream; fires leave soot trailing
 * aft; B-24 rudders and elevators are fabric over metal ribs.
 *
 * Plane-local frame (as in km3d-v3.js): nose +X, up +Y, right +Z; ~0.62 m
 * per unit. Pure apart from the THREE object passed in.
 */
(function(root){
 'use strict';
 var TYPE={hole:0,field:1,soot:2,streak:3,fabric:4,panel:5};

 function rand(seed){var s=seed>>>0;return function(){s=(Math.imul(s^(s>>>15),2246822507)+0x9e3779b9)>>>0;s^=s>>>13;return (s>>>0)/4294967296;};}
 function hash(str){var h=2166136261;for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
 function v(x,y,z){return {x:x,y:y,z:z};}
 function add(a,b,k){k=k===undefined?1:k;return v(a.x+b.x*k,a.y+b.y*k,a.z+b.z*k);}
 function len(a){return Math.sqrt(a.x*a.x+a.y*a.y+a.z*a.z);}
 function norm(a){var l=len(a)||1;return v(a.x/l,a.y/l,a.z/l);}
 function cross(a,b){return v(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);}
 function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
 /* tangent frame on the skin: tx runs fore-aft where it can */
 function frame(n){
  n=norm(n);var ax=Math.abs(n.x)>.85?v(0,1,0):v(1,0,0);
  var tx=norm(add(ax,n,-dot(ax,n)));return {n:n,tx:tx,ty:cross(n,tx)};
 }

 /* ---------- layout: recorded state -> features on the skin ---------- */
 /* surf: dmgSurface() samples {zone:[{p,n}], props:[Vector3 x4]}.
    events: the ship's scheduled events; cue: battle cue now.
    Returns {entries:[{type,c,r,b:[y,z,w]}], petals:[], bars:[]} */
 function layout(surf,st,events,cue,pilot){
  var out={entries:[],petals:[],bars:[]};
  if(!surf||!st)return out;
  var E=out.entries;
  function entry(prio,type,c,r,y,z,w,n){E.push({prio:prio,type:type,c:v(c.x,c.y,c.z),r:r,b:[y||0,z||0,w||0],n:n?v(n.x,n.y,n.z):null});}
  function pick(zone,rnd,filter){var pts=(surf[zone]||[]).filter(filter||function(){return true;});if(!pts.length)pts=surf.waist||[];return pts[(rnd()*pts.length)|0];}
  function puncture(s,r,rnd,exit,prio,soot){
   entry(prio,TYPE.hole,s.p,r,soot||0,rnd()*97,1+rnd()*.35,s.n);
   if(r>=.055)out.petals.push({p:s.p,n:s.n,r:r,out:exit,seed:(rnd()*1e9)|0});
  }
  /* engines: soot from any fire that has burned, oil from any hit engine */
  var burned=[false,false,false,false],hit=[false,false,false,false];
  (events||[]).forEach(function(ev){
   if(!(cue>=ev.at)||!(ev.engine>=1&&ev.engine<=4))return;
   if(ev.kind==='engine_fire')burned[ev.engine-1]=true;
   if(/engine_|prop_/.test(ev.kind))hit[ev.engine-1]=true;
  });
  st.engines.forEach(function(e,i){
   var pr=surf.props[i];if(!pr)return;
   var r0=rand(hash(pilot+'eng'+i));
   if(burned[i]||e.fire){
    /* nacelle top and the wing behind it, blackened and blistered */
    entry(9,TYPE.soot,v(pr.x-4.4,pr.y+.55,pr.z),1.15,.95,r0()*50,3.4);
    entry(8,TYPE.soot,v(pr.x-6.4,pr.y+.25,pr.z+(r0()-.5)*.6),1.35,.8,r0()*50,2.6);
   }
   if(hit[i]||e.dead||e.windmill||e.feathered){
    /* oil thrown back over the nacelle and the wing top in the slipstream */
    entry(7,TYPE.streak,v(pr.x-3.2,pr.y+.5,pr.z),.42,5.6,r0()*50,.95);
    entry(6,TYPE.streak,v(pr.x-4.2,pr.y+.1,pr.z+.25*(r0()<.5?-1:1)),.55,4.2,r0()*50,.7);
    out.petals.length<60&&false;
   }
  });
  /* compartment and wing fires: soot trails aft of the burn */
  Object.keys(st.fires).forEach(function(zone){
   var r1=rand(hash(pilot+'fire'+zone));
   if(zone==='left_wing'||zone==='right_wing'){
    var a=surf.props[zone==='left_wing'?0:2],b=surf.props[zone==='left_wing'?1:3];if(!a||!b)return;
    for(var k=0;k<2;k++){var t=.25+k*.5;entry(8,TYPE.soot,v((a.x+(b.x-a.x)*t)-5.6,a.y+.2,a.z+(b.z-a.z)*t),1.6,.9,r1()*50,2.4);}
    return;
   }
   var s=pick(zone,r1,function(q){return q.n.y<.4;});
   if(s)entry(8,TYPE.soot,s.p,1.25,.9,r1()*50,3.0);
   var s2=pick(zone,r1,function(q){return q.n.y<.4;});
   if(s2)entry(6,TYPE.soot,s2.p,.9,.75,r1()*50,2.6);
  });
  /* holes */
  st.holes.forEach(function(h,hi){
   var rnd=rand((h.seed>>>0)^0x2c1b3c6d);
   var zone=h.zone;
   if(h.kind==='fin_rudder_damage'||h.kind==='tail_damage'){
    /* fabric rudder stripped back to its ribs; the fin itself holed */
    var fin=(surf.fin||[]).filter(function(q){return Math.abs(q.p.z)>3.5;}).sort(function(p,q){return p.p.x-q.p.x;});
    if(fin.length){
     var side=rnd()<.5?-1:1,aft=fin.filter(function(q){return q.p.z*side>0;});if(!aft.length)aft=fin;
     var s0=aft[Math.min(aft.length-1,(rnd()*Math.min(4,aft.length))|0)];
     var hinge=fin[0].p.x+(fin[fin.length-1].p.x-fin[0].p.x)*.42;
     entry(10,TYPE.fabric,v(s0.p.x,s0.p.y,s0.p.z),h.big?2.1:1.25,hinge,rnd()*97,.36);
     for(var f=0;f<3;f++){var sf=fin[(rnd()*fin.length)|0];puncture(sf,.05+rnd()*.07,rnd,rnd()<.5,4,.2);}
    }
    return;
   }
   var pts=surf[zone]||surf.waist||[];if(!pts.length)return;
   if(h.engine&&surf.props[h.engine-1]){
    var ez=surf.props[h.engine-1].z;
    pts=pts.slice().sort(function(a,b){return Math.abs(Math.abs(a.p.z-ez)-1.7)-Math.abs(Math.abs(b.p.z-ez)-1.7);}).slice(0,Math.max(4,pts.length>>2));
   }
   var c=pts[(rnd()*pts.length)|0];
   if(h.big){
    var fr=frame(c.n),R=.42+rnd()*.3;
    if(rnd()<.35){
     /* a panel torn off between frames: straight riveted edges */
     entry(10,TYPE.panel,c.p,R,Math.abs(c.n.y)>.6?1:(Math.abs(c.n.z)>.6?2:0),rnd()*97,1.3+rnd()*.6,c.n);
    }else{
     entry(10,TYPE.hole,c.p,R,.35,rnd()*97,1.25+rnd()*.6,c.n);
     out.petals.push({p:c.p,n:c.n,r:R,out:rnd()<.6,seed:(rnd()*1e9)|0,big:true});
    }
    out.bars.push({p:c.p,n:c.n,r:R,seed:(rnd()*1e9)|0});
    entry(5,TYPE.field,add(c.p,fr.tx,(rnd()-.5)*R),R*2.4,7.5,rnd()*97,.3,c.n);
   }
   if(h.many){
    /* a flak burst's spray: several dense fields over the zone */
    for(var m=0;m<3;m++){var sm=pts[(rnd()*pts.length)|0];entry(5,TYPE.field,sm.p,1.1+rnd()*.8,8.5+rnd()*3,rnd()*97,.27,sm.n);}
    for(var m2=0;m2<4;m2++){var sp=pts[(rnd()*pts.length)|0];puncture(sp,.05+rnd()*.07,rnd,rnd()<.5,4,.15);}
   }else if(!h.big){
    /* one hit: a small fragment field and a couple of shell punctures */
    entry(4,TYPE.field,c.p,.75+rnd()*.45,8+rnd()*3,rnd()*97,.25,c.n);
    puncture(c,.07+rnd()*.07,rnd,rnd()<.55,4,.3);
    var c2=pts[(rnd()*pts.length)|0];puncture(c2,.04+rnd()*.05,rnd,rnd()<.5,3,.1);
    /* a fighter's burst stitched along the skin */
    if(h.kind!=='wing_hole'||rnd()<.5){
     var fr2=frame(c2.n),dir=add(fr2.tx,fr2.ty,(rnd()-.5)*1.2),dl=norm(dir),start=add(c2.p,dl,-.9);
     for(var b=0;b<5;b++){var q=add(start,dl,.36*b+rnd()*.08);entry(2,TYPE.hole,q,.022+rnd()*.012,0,rnd()*97,1,c2.n);}
    }
   }
  });
  /* fuel leaking from holed wing tanks: lighter stain streaking aft */
  (events||[]).forEach(function(ev){
   if(ev.kind!=='wing_fuel_leak'||!(cue>=ev.at))return;
   var rf=rand(hash(pilot+'fuel'+ev.at)),wz=ev.zone==='left_wing'?0:2,a=surf.props[wz],b=surf.props[wz+1];if(!a||!b)return;
   var t=rf();entry(5,TYPE.streak,v((a.x+(b.x-a.x)*t)-5.2,a.y+.15,a.z+(b.z-a.z)*t),.5,4.5,rf()*50,.38);
  });
  E.sort(function(a,b){return b.prio-a.prio;});
  return out;
 }

 /* ---------- shader patch ---------- */
 var GLSL_COMMON=[
  'uniform vec4 kmA[KM_N];uniform vec4 kmB[KM_N];uniform float kmCount;',
  'varying vec3 vKmP;varying vec3 vKmN;',
  'float kmH(vec3 p){p=fract(p*0.3183099+vec3(.71,.113,.419));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
  'float kmNoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);',
  ' return mix(mix(mix(kmH(i),kmH(i+vec3(1.,0.,0.)),f.x),mix(kmH(i+vec3(0.,1.,0.)),kmH(i+vec3(1.,1.,0.)),f.x),f.y),',
  '  mix(mix(kmH(i+vec3(0.,0.,1.)),kmH(i+vec3(1.,0.,1.)),f.x),mix(kmH(i+vec3(0.,1.,1.)),kmH(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}',
  'float kmFbm(vec3 x){return kmNoise(x)*.55+kmNoise(x*2.13+3.1)*.3+kmNoise(x*4.37+7.7)*.15;}'
 ].join('\n');
 var GLSL_EVAL=[
  'float kmCut=0.,kmBare=0.,kmSoot=0.,kmOil=0.,kmEdge=0.;',
  '{vec3 P=vKmP;float px=max(length(fwidth(P)),1e-4);',
  ' for(int i=0;i<KM_N;i++){',
  '  if(float(i)>=kmCount)break;',
  '  vec4 A=kmA[i];vec4 B=kmB[i];vec3 d=P-A.xyz;float r=A.w;int ty=int(B.x+.5);',
  '  if(ty==0){', /* ragged puncture */
  '   d.x/=B.w;float q=length(d)/r;if(q>2.6)continue;',
  '   float n=kmFbm(P*(3.2/r)+B.z),n2=kmNoise(P*(11.0/r)+B.z*1.7);',
  '   float qe=q+(n-.5)*.8+(n2-.5)*.22;',
  '   float vis=smoothstep(px*.9,px*4.,r);',
  '   if(r>px*1.1){if(qe<1.0)kmCut=1.;}else kmSoot=max(kmSoot,.8*(1.-smoothstep(.5,1.6,q)));',
  '   float eb=min(.07,.012/r),bb=min(.25,(.012+.05*r)/r);',
  '   kmEdge=max(kmEdge,(1.-smoothstep(1.0,1.+eb,qe))*vis);',
  '   kmBare=max(kmBare,(1.-smoothstep(1.+bb*.5,1.+bb,qe+(kmNoise(P*(2.5/(bb*r))+B.z)-.5)*bb*1.6))*vis*.65);',
  '   kmSoot=max(kmSoot,(1.-smoothstep(1.0,2.5,qe))*B.y);',
  '  }else if(ty==1){', /* flak field: many small ragged holes */
  '   float q=length(d)/r;if(q>1.0)continue;',
  '   float den=B.y;vec3 cp=P*den+B.z;vec3 ci=floor(cp);vec3 cf=cp-ci;',
  '   float prob=(1.-q*q)*.8;',
  '   if(kmH(ci+.37)<prob){',
  '    vec3 fp=vec3(kmH(ci+1.3),kmH(ci+2.7),kmH(ci+5.1))*.4+.3;',
  '    float sz=kmH(ci+9.2);sz=sz*sz*sz;',
  '    float hr=B.w*(.18+.82*sz);',
  '    vec3 dv=cf-fp;vec3 ax=normalize(vec3(kmH(ci+3.3),kmH(ci+6.6),kmH(ci+8.8))-.5);',
  '    float el=1.+2.2*kmH(ci+7.1);dv+=ax*dot(dv,ax)*(1./el-1.);',
  '    float qd=length(dv)/hr+(kmNoise(cp*(2.4/hr))-.5)*.8;',
  '    float hs=hr/den,vis=smoothstep(px*.8,px*4.,hs);',
  '    if(hs>px*.9){if(qd<1.0)kmCut=1.;}else kmSoot=max(kmSoot,.6*(1.-smoothstep(.4,1.5,qd)));',
  '    kmEdge=max(kmEdge,(1.-smoothstep(1.0,1.08,qd))*vis*.8);',
  '    kmBare=max(kmBare,(1.-smoothstep(1.15,1.3,qd+(kmNoise(cp*(2.2/hr))-.5)*.9))*vis*.55);',
  '   }',
  '   kmSoot=max(kmSoot,.18*(1.-q)*kmNoise(P*3.+B.z));',
  '  }else if(ty==2){', /* soot and blistered paint, trailing aft */
  '   d.x=d.x<0.?d.x/B.w:d.x*1.8;float q=length(d)/r;if(q>1.7)continue;',
  '   float s=(1.-smoothstep(.15,1.35,q+(kmFbm(P*2.6+B.z)-.5)*.75))*B.y;',
  '   kmSoot=max(kmSoot,s);',
  '   kmOil=max(kmOil,s*.25);',
  '  }else if(ty==3){', /* oil or fuel streaks straight aft */
  '   float t=(A.x-P.x)/B.y;if(t<0.||t>1.||vKmN.y<-.35)continue;',
  '   float lat=abs(P.z-A.z)/(r*(1.+t*.7));if(lat>1.)continue;',
  '   float sn=kmNoise(vec3(P.z*34.,P.x*.8,B.z))*.7+kmNoise(vec3(P.z*90.,P.x*2.,B.z))*.3;',
  '   float o=smoothstep(.3,.62,sn)*(1.-lat*lat)*pow(1.-t,.45)*B.w;',
  '   o=max(o,(1.-lat)*(1.-t*.8)*.5*B.w);',
  '   kmOil=max(kmOil,o);',
  '  }else if(ty==4){', /* doped fabric shredded off the rudder ribs */
  '   float q=length(d)/r;if(q>1.15||P.x>B.y)continue;',
  '   float rib=step(abs(fract(P.y/B.w)-.5),.07)+step(abs(P.x-B.y),.05);',
  '   float tat=kmFbm(P*vec3(1.2,5.5,1.2)+B.z);',
  '   float keep=max(step(q+(tat-.5)*1.2,.3),step(.68,kmNoise(P*vec3(.9,3.4,.9)+B.z*1.3)));',
  '   if(rib<.5&&keep<.5&&tat>.33)kmCut=1.;',
  '   kmSoot=max(kmSoot,.35*(1.-q)+.3*rib*(1.-keep));',
  '  }else{', /* panel torn off: straight edges along frames, rivet line */
  '   vec2 uv=B.y<.5?d.yz:(B.y<1.5?d.xz:d.xy);float dep=B.y<.5?d.x:(B.y<1.5?d.y:d.z);if(abs(dep)>r*.8)continue;uv.x/=B.w;',
  '   float e=max(abs(uv.x),abs(uv.y))/r;if(e>1.4)continue;',
  '   float jag=(kmNoise(P*(2.2/r)+B.z)-.5)*.5+(kmNoise(P*(9./r)+B.z*1.3)-.5)*.16;',
  '   if(e+jag<1.0)kmCut=1.;',
  '   kmBare=max(kmBare,(1.-smoothstep(1.0,1.12,e+jag*.6))*.7);',
  '   kmEdge=max(kmEdge,(1.-smoothstep(1.,1.03,e+jag))*.45);',
  '  }',
  ' }',
  '}',
  'if(kmCut>.5)discard;'
 ].join('\n');

 function patchSkin(T,material,N,toPlane){
  var m=material.clone();
  m.extensions=Object.assign({},m.extensions||{},{derivatives:true});
  var A=[],B=[];for(var i=0;i<N;i++){A.push(new T.Vector4(0,0,0,1));B.push(new T.Vector4(0,0,0,1));}
  var U={kmA:{value:A},kmB:{value:B},kmCount:{value:0},kmM:{value:toPlane?toPlane.clone():new T.Matrix4()}};
  m.userData.kmDamage=U;
  m.onBeforeCompile=function(sh){
   Object.assign(sh.uniforms,U);
   sh.vertexShader='uniform mat4 kmM;varying vec3 vKmP;varying vec3 vKmN;\n'+sh.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\nvKmP=(kmM*vec4(transformed,1.0)).xyz;vKmN=normalize(mat3(kmM)*objectNormal);');
   sh.fragmentShader='#define KM_N '+N+'\n'+GLSL_COMMON+'\n'+sh.fragmentShader
    .replace('#include <map_fragment>','#include <map_fragment>\n'+GLSL_EVAL+
     '\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.22,.222,.215),kmBare);'+
     '\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.42,.43,.43),kmEdge*.8);'+
     '\ndiffuseColor.rgb*=1.-kmSoot*.9;'+
     '\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.016,.012,.008),kmOil*.93);')
    .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.55,max(kmBare,kmEdge)*.8);roughnessFactor=mix(roughnessFactor,.97,kmSoot);roughnessFactor=mix(roughnessFactor,.62,kmOil);')
    .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,.3,max(kmBare,kmEdge));metalnessFactor*=1.-max(kmSoot,kmOil);');
  };
  m.customProgramCacheKey=function(){return 'km-damage-'+N;};
  m.needsUpdate=true;
  return m;
 }
 function setEntries(material,entries){
  var U=material.userData.kmDamage;if(!U)return 0;
  var N=U.kmA.value.length,n=Math.min(N,entries.length);
  for(var i=0;i<n;i++){var e=entries[i];U.kmA.value[i].set(e.c.x,e.c.y,e.c.z,e.r);U.kmB.value[i].set(e.type,e.b[0],e.b[1],e.b[2]||1);}
  U.kmCount.value=n;return n;
 }

 /* ---------- real geometry: petals and exposed structure ---------- */
 function petalGeometry(T,list){
  var pos=[],col=[],idx=[];
  var paint=[.055,.06,.034],metal=[.13,.13,.127],dark=[.04,.04,.035];
  list.forEach(function(pt){
   var rnd=rand(pt.seed),F=frame(pt.n),r=pt.r,sgn=pt.out?1:-1;
   var count=pt.big?12+((rnd()*6)|0):4+((rnd()*3)|0),a0=rnd()*6.283;
   for(var k=0;k<count;k++){
    if(rnd()<.18)continue; /* some petals tore off entirely */
    var a=a0+k/count*6.283,w=(6.283/count)*(.75+rnd()*.3);
    var L=r*(pt.big?.12+rnd()*.22:.25+rnd()*.3),bend=(.35+rnd()*.9)*sgn;
    var base0=Math.cos(a-w/2),base1=Math.sin(a-w/2),base2=Math.cos(a+w/2),base3=Math.sin(a+w/2);
    var rr=r*(1.02+rnd()*.12);
    function P(u,vv,h){return add(add(add(pt.p,F.tx,u),F.ty,vv),F.n,h);}
    var b0=P(base0*rr,base1*rr,0),b1=P(base2*rr,base3*rr,0);
    /* the petal leaves the rim inward (toward the hole centre), curling out of the skin */
    var cm=Math.cos(a),sm=Math.sin(a),curl=rnd()*.5;
    var midR=rr-L*.5*Math.cos(bend*.5),midH=L*.5*Math.sin(bend*.5);
    var tipR=rr-L*Math.cos(bend)*.75,tipH=L*Math.sin(bend)*(1+curl*.3);
    var m0=P((midR)*Math.cos(a-w*.3),(midR)*Math.sin(a-w*.3),midH),m1=P((midR)*Math.cos(a+w*.3),(midR)*Math.sin(a+w*.3),midH);
    var tip=P(tipR*cm+(rnd()-.5)*w*r*.4,tipR*sm+(rnd()-.5)*w*r*.4,tipH);
    var o=pos.length/3,face=rnd()<.9?paint:dark;
    [b0,b1,m0,m1,tip].forEach(function(q,qi){
     pos.push(q.x,q.y,q.z);
     var c=qi<2?face:(qi<4?face:metal);
     var sh=.75+rnd()*.35;col.push(c[0]*sh,c[1]*sh,c[2]*sh);
    });
    idx.push(o,o+1,o+3, o,o+3,o+2, o+2,o+3,o+4);
   }
  });
  if(!pos.length)return null;
  var g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));
  g.setIndex(idx);g.computeVertexNormals();return g;
 }
 /* broken stringers and a frame segment just inside a big tear */
 function barGeometry(T,list){
  var parts=[];
  list.forEach(function(bt){
   var rnd=rand(bt.seed),F=frame(bt.n),r=bt.r;
   function bar(center,along,across,l,w,dpt,tilt){
    var g=new T.BoxGeometry(l,w,dpt);
    var m=new T.Matrix4().makeBasis(new T.Vector3(along.x,along.y,along.z),new T.Vector3(across.x,across.y,across.z),new T.Vector3(F.n.x,F.n.y,F.n.z));
    if(tilt)m.multiply(new T.Matrix4().makeRotationY(tilt));
    m.setPosition(center.x,center.y,center.z);g.applyMatrix4(m);parts.push(g);
   }
   var depth=-.1-.05*r;
   /* stringers run fore-aft; one is broken and bent */
   for(var s=0;s<3;s++){
    var off=(s-1)*.38*r+(rnd()-.5)*.1*r,broken=rnd()<.45;
    var l=broken?r*(.6+rnd()*.4):r*1.8;
    var c=add(add(add(bt.p,F.ty,off),F.n,depth),F.tx,broken?(rnd()<.5?-1:1)*r*.8:0);
    bar(c,F.tx,F.ty,l,.028,.05,broken?(rnd()-.5)*.9:0);
   }
   /* one frame across the hoop, set deeper */
   var fx=(rnd()-.5)*r*.8;
   bar(add(add(bt.p,F.tx,fx),F.n,depth-.06),F.ty,F.tx,r*1.7,.05,.1,0);
  });
  if(!parts.length)return null;
  var pos=[],nor=[];
  parts.forEach(function(g){var ng=g.toNonIndexed();pos.push.apply(pos,ng.attributes.position.array);nor.push.apply(nor,ng.attributes.normal.array);});
  var out=new T.BufferGeometry();out.setAttribute('position',new T.Float32BufferAttribute(pos,3));out.setAttribute('normal',new T.Float32BufferAttribute(nor,3));
  return out;
 }

 /* ---------- the inside of the airframe behind each opening ----------
    A copy of the skin round each hole, set a few centimetres inward along
    that hole's normal and drawn as the dim primed interior with frames and
    stringers. It only shows through the cuts. tris: plane-local triangle
    soup of the skin (9 floats a triangle). */
 function linerGeometry(T,tris,entries){
  if(!tris||!tris.length)return null;
  var pos=[],nT=tris.length/9;
  entries.forEach(function(e){
   if(e.type!==TYPE.hole&&e.type!==TYPE.field&&e.type!==TYPE.panel)return;
   if(e.type===TYPE.hole&&e.r<.035)return;
   var R=e.type===TYPE.field?e.r*1.05:e.r*(e.type===TYPE.panel?(e.b[2]||1)*1.6:2.1);
   var n=e.n||v(0,0,0);if(!len(n))return;
   var depth=Math.min(.16,.05+e.r*.12);
   for(var t=0;t<nT;t++){
    var o=t*9,cx=(tris[o]+tris[o+3]+tris[o+6])/3,cy=(tris[o+1]+tris[o+4]+tris[o+7])/3,cz=(tris[o+2]+tris[o+5]+tris[o+8])/3;
    var dx=cx-e.c.x,dy=cy-e.c.y,dz=cz-e.c.z;if(dx*dx+dy*dy+dz*dz>R*R)continue;
    /* face normal must agree with the hole's side of the skin */
    var ax=tris[o+3]-tris[o],ay=tris[o+4]-tris[o+1],az=tris[o+5]-tris[o+2],bx=tris[o+6]-tris[o],by=tris[o+7]-tris[o+1],bz=tris[o+8]-tris[o+2];
    var fx=ay*bz-az*by,fy=az*bx-ax*bz,fz=ax*by-ay*bx,fl=Math.sqrt(fx*fx+fy*fy+fz*fz)||1;
    if(Math.abs((fx*n.x+fy*n.y+fz*n.z)/fl)<.45)continue;
    for(var k=0;k<9;k+=3)pos.push(tris[o+k]-n.x*depth,tris[o+k+1]-n.y*depth,tris[o+k+2]-n.z*depth);
   }
  });
  if(!pos.length)return null;
  var g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));return g;
 }
 function linerMaterial(T){
  var m=new T.MeshBasicMaterial({color:0x1d2216,side:T.DoubleSide});
  m.onBeforeCompile=function(sh){
   sh.vertexShader='varying vec3 vKmP;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvKmP=transformed;');
   sh.fragmentShader='varying vec3 vKmP;\n'+GLSL_COMMON.split('\n').slice(2).join('\n')+'\n'+sh.fragmentShader.replace('#include <map_fragment>',
    '#include <map_fragment>\nvec3 Q=vKmP;'+
    'float fr=smoothstep(.43,.475,abs(fract(Q.x*1.4)-.5));'+
    'float sg=smoothstep(.44,.48,abs(fract(Q.y*3.1)-.5))*.55;'+
    'float rb=smoothstep(.44,.48,abs(fract(Q.z*1.25)-.5))*.5;'+
    'float lit=.6+.55*kmNoise(Q*1.7);'+
    'diffuseColor.rgb*=lit*(.5+.45*max(fr,max(sg,rb)));');
  };
  m.customProgramCacheKey=function(){return 'km-damage-liner';};
  return m;
 }

 /* ---------- crew view: a ragged hole mask (JS port of the shader noise) ---------- */
 function fract(x){return x-Math.floor(x);}
 function h3(x,y,z){x=fract(x*.3183099+.71)*17;y=fract(y*.3183099+.113)*17;z=fract(z*.3183099+.419)*17;return fract(x*y*z*(x+y+z));}
 function noise3(x,y,z){
  var ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;
  fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);fz=fz*fz*(3-2*fz);
  function L(a,b,t){return a+(b-a)*t;}
  return L(L(L(h3(ix,iy,iz),h3(ix+1,iy,iz),fx),L(h3(ix,iy+1,iz),h3(ix+1,iy+1,iz),fx),fy),
   L(L(h3(ix,iy,iz+1),h3(ix+1,iy,iz+1),fx),L(h3(ix,iy+1,iz+1),h3(ix+1,iy+1,iz+1),fx),fy),fz);
 }
 function fbm3(x,y,z){return noise3(x,y,z)*.55+noise3(x*2.13+3.1,y*2.13+3.1,z*2.13+3.1)*.3+noise3(x*4.37+7.7,y*4.37+7.7,z*4.37+7.7)*.15;}
 /* 2x2 atlas, 128 px a cell: daylight inside a torn, bare-metal rim */
 function holeMask(T){
  var S=256,C=128,d=new Uint8Array(S*S*4);
  for(var cell=0;cell<4;cell++){
   var ox=(cell%2)*C,oy=((cell/2)|0)*C,seed=cell*13.7+2;
   for(var y=0;y<C;y++)for(var x=0;x<C;x++){
    var u=(x+.5)/C*2-1,w=(y+.5)/C*2-1,q=Math.sqrt(u*u+w*w)/.55;
    var qe=q+(fbm3(u*3.2+seed,w*3.2,seed)-.5)*.8+(noise3(u*11+seed,w*11,seed*1.7)-.5)*.22;
    var i=((oy+y)*S+ox+x)*4,r=0,g=0,b=0,a=0;
    if(qe<1){var sky=1-.25*q;r=255*sky;g=248*sky;b=232*sky;a=255;}
    else if(qe<1.14){r=g=b=150+60*noise3(u*30,w*30,seed);a=255;}
    else if(qe+(noise3(u*16+seed,w*16,seed)-.5)*.95<1.6){r=118;g=120;b=118;a=200;}
    d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=a;
   }
  }
  var t=new T.DataTexture(d,S,S,T.RGBAFormat);t.needsUpdate=true;t.magFilter=T.LinearFilter;t.minFilter=T.LinearFilter;t.generateMipmaps=false;
  if(T.sRGBEncoding)t.encoding=T.sRGBEncoding;
  return t;
 }
 function holeQuads(T){
  return [0,1,2,3].map(function(cell){
   var g=new T.PlaneGeometry(2,2),uv=g.attributes.uv,ox=(cell%2)*.5,oy=((cell/2)|0)*.5;
   for(var i=0;i<uv.count;i++)uv.setXY(i,ox+uv.getX(i)*.5,oy+uv.getY(i)*.5);
   return g;
  });
 }

 var api={TYPE:TYPE,layout:layout,linerGeometry:linerGeometry,linerMaterial:linerMaterial,patchSkin:patchSkin,setEntries:setEntries,petalGeometry:petalGeometry,barGeometry:barGeometry,
  holeMask:holeMask,holeQuads:holeQuads,frame:frame,noise3:noise3,fbm3:fbm3,hash:hash};
 root.KasselDamageVisuals=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
