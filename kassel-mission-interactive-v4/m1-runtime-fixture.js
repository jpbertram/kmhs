'use strict';
// Actual placement/initialization code in a numerical scene; only effects and
// terrain are stubbed. Not a browser, equipment, or terrain-contact check.
const fs=require('node:fs'),vm=require('node:vm'),T=require('../tmp/three-r128.js');
module.exports=function(){
 const src=fs.readFileSync(__dirname+'/km3d-v3.js','utf8');
 const ctx={V2:{},Math,THREE:T,RETURN_START:.92,BATTLE_START:.84,BATTLE_FRAC:.08,BATTLE_SPAN:420,ELEV_SCALE:(115/7010)*1.55,
  KMMissionTimeline:require('./mission-timeline'),KasselFormationKinematics:require('./formation-kinematics'),
  KasselFighterTargeting:require('./fighter-targeting'),fireTracer(){},
  KasselFlightAttitude:require('./flight-attitude'),KasselLossTrajectory:require('./loss-trajectory'),KasselForwardEndpointRoute:require('./forward-endpoint-route'),KasselAircraftMapScale:require('./aircraft-map-scale'),
  killFlash(){},spawnDevastation(){},spawnChute(){},emitPool(){},addColumn(){}};
 vm.createContext(ctx);
 for(const name of ['V2.routeGeo','V2.returnGeo','V2.routeEventGeo','V2.ROSTER','V2.CRASH_SITES']){
  const tail=src.slice(src.indexOf(name+'=[')),end=/^\]\s*;?/m.exec(tail);vm.runInContext(tail.slice(0,end.index+end[0].length),ctx);
 }
 const gs=src.indexOf('var GEO=(function()');vm.runInContext(src.slice(gs,src.indexOf('V2.GEO=GEO;',gs)),ctx);
 const rs=src.indexOf('var REL_OFFS=');vm.runInContext(src.slice(rs,src.indexOf('KM._buildFormation=',rs)),ctx);
 vm.runInContext(src.slice(src.indexOf('var FATE_TYPE='),src.indexOf('\n',src.indexOf('var FATE_TYPE='))),ctx);
 ctx.V2.LOSS_PROFILES=vm.runInContext('('+src.match(/V2\.LOSS_PROFILES=([\s\S]*?);\n/)[1]+')',ctx);
 const pts=ctx.V2.routeGeo.concat(ctx.V2.returnGeo.slice(1)).map(g=>new T.Vector3(ctx.GEO.lonToX(g[0]),g[2],ctx.GEO.latToZ(g[1])));
 ctx.KM={_full:new T.CatmullRomCurve3(pts,false,'centripetal'),_anchor:{pos:new T.Vector3(),dir:new T.Vector3(1,0,0)},_ps:.09,_playing:false,_holdT:0};
 ctx.KM._curve=ctx.KM._full;
 const arc=src.indexOf('function fullArc(mt){');vm.runInContext(src.slice(arc,src.indexOf('\nvar hash=',arc)),ctx);
 vm.runInContext(src.slice(src.indexOf('var hash=function'),src.indexOf('/* timeline phases')),ctx);
 const anchor=src.indexOf('function updateAnchor(');vm.runInContext(src.slice(anchor,src.indexOf('/* ---------- per-plane battle state',anchor)),ctx);
 const init=src.indexOf('function initPlaneBattle(');vm.runInContext(src.slice(init,src.indexOf('/* burning-wreck smoke columns */',init)),ctx);
 const place=src.indexOf('function placePlane(');vm.runInContext(src.slice(place,src.indexOf('/* ---------- fighters',place)),ctx);
 const fighters=src.indexOf('function waveTime(');vm.runInContext(src.slice(fighters,src.indexOf('/* ═══════════ CAMERA',fighters)),ctx);
 ctx.KM._fighterWaves=[{type:'fw190',count:14,t:40},{type:'bf109',count:8,t:70},{type:'fw190',count:12,t:150},{type:'bf109',count:6,t:215}].map(w=>({...w,models:Array.from({length:w.count},()=>new T.Object3D())}));
 ctx.KM._escorts=Array.from({length:8},()=>new T.Object3D());
 ctx.V2.bailoutCrewFor=()=>[];ctx.V2.revealCrash=()=>{};
 ctx.V2.crashSiteFor=(scene,pilot)=>{const s=ctx.V2.CRASH_SITES.find(s=>s.n===pilot);return s?{pos:new T.Vector3(ctx.GEO.lonToX(s.lon),1.5,ctx.GEO.latToZ(s.lat))}:null;};
 const planes=ctx.V2.ROSTER.map((r,i)=>{const q=ctx.SQ_BOX[r.sq],o=ctx.REL_OFFS[r.rel],p=new T.Object3D();
  p.userData={id:i+1,basePhase:i,offset:{x:q[0]+o[0],y:q[1]+o[1],z:q[2]+o[2]},planeData:{...r,pilot:r.p,behavior:ctx.FATE_TYPE[r.fate],fateTime:r.ft}};return p;});
 ctx.KM._fp=planes.slice(1);ctx.KM._b24=planes[0];const scene=new T.Scene();
 const mx=111195*Math.cos(51.4*Math.PI/180)*(ctx.GEO.xToLon(1)-ctx.GEO.xToLon(0)),mz=111195*(ctx.GEO.zToLat(0)-ctx.GEO.zToLat(1));
 function reset(){for(const p of planes)ctx.initPlaneBattle(p,scene);}
 function frame(seconds){ctx.KM._playbackSeconds=seconds;ctx.KM._missionT=ctx.KMMissionTimeline.routeAt(seconds);
  ctx.KM._holdT=seconds>=300?3:0;ctx.updateAnchor(ctx.KM._missionT,0,.05);
  for(const p of planes)ctx.placePlane(p,0,seconds,scene,0);
  ctx.updateFighters(ctx.KMMissionTimeline.battleCueAtPlayback(seconds),0,seconds,scene);
  ctx.updateEscorts(ctx.KMMissionTimeline.battleCueAtPlayback(seconds),ctx.KM._missionT,0,seconds);
  return planes;
 }
 reset();return {ctx,T,planes,frame,reset,metric:p=>new T.Vector3(p.x*mx,p.y*7010/115,p.z*mz)};
};
