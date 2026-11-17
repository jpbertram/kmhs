'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const T=require(path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--'))||'../tmp/three-r128.js'));
const src=fs.readFileSync(path.join(__dirname,'km3d-v3.js'),'utf8');
const ctx={V2:{},Math,RETURN_START:.92,THREE:T,KasselFormationKinematics:require('./formation-kinematics.js')};vm.createContext(ctx);
ctx.landingEnvelope=mt=>{const u=Math.max(0,Math.min(1,(mt-.975)/.025));return u*u*(3-2*u);};
for(const name of ['V2.routeGeo','V2.returnGeo','V2.routeEventGeo','V2.ROSTER']){
 const tail=src.slice(src.indexOf(name+'=[')),end=/^\]\s*;?/m.exec(tail);
 vm.runInContext(tail.slice(0,end.index+end[0].length),ctx);
}
const gs=src.indexOf('var GEO=(function()');vm.runInContext(src.slice(gs,src.indexOf('V2.GEO=GEO;',gs)),ctx);
const rs=src.indexOf('var REL_OFFS=');vm.runInContext(src.slice(rs,src.indexOf('KM._buildFormation=',rs)),ctx);
const pts=ctx.V2.routeGeo.concat(ctx.V2.returnGeo.slice(1)).map(g=>new T.Vector3(ctx.GEO.lonToX(g[0]),g[2],ctx.GEO.latToZ(g[1])));
const curve=new T.CatmullRomCurve3(pts,false,'centripetal');ctx.KM={_full:curve};
const arc=src.indexOf('function fullArc(mt){');vm.runInContext(src.slice(arc,src.indexOf('\nvar hash=',arc)),ctx);
const start=src.indexOf('  function formPos(out,atMission){'),end=src.indexOf('\n  var beh=v.beh',start);
const offsets=ctx.V2.ROSTER.map(r=>{const q=ctx.SQ_BOX[r.sq],o=ctx.REL_OFFS[r.rel]||[0,0,0];return {r,off:{x:q[0]+o[0],y:q[1]+o[1],z:q[2]+o[2]}};});
Object.assign(ctx,{ret:0,spread:1,straggle:0,jit:1,ph:0,elapsed:0,_cx:offsets.reduce((s,o)=>s+o.off.x,0)/offsets.length,hash:()=>0,across:new T.Vector3(0,0,1),a:{pos:new T.Vector3(0,123,0)}});
vm.runInContext(src.slice(start,end),ctx);
const failures=[];
for(const entry of offsets){ctx.off=entry.off;ctx.p={userData:{planeData:entry.r}};let minimum=Infinity,worst=0;
 for(let mt=.56;mt<.84;mt+=.0002){const a=new T.Vector3(),b=new T.Vector3();ctx.formPos(a,mt-.00001);ctx.formPos(b,mt+.00001);
  const heading=ctx.p.userData._lh,nose=new T.Vector3(-Math.sin(heading),0,-Math.cos(heading)),v=b.sub(a);v.y=0;
  const dot=v.normalize().dot(nose);if(dot<minimum){minimum=dot;worst=mt;}
 }
 if(minimum<0)failures.push({pilot:entry.r.p,minimumForwardDot:Number(minimum.toFixed(4)),missionCue:Number(worst.toFixed(4)),lateralOffset:entry.off.z*.28});
}
console.log(JSON.stringify({scope:'Actual formation position sampler versus assigned nose heading; negative dot proves backward ground motion',aircraft:offsets.length,backwardAircraft:failures.length,failures:process.argv.includes('--summary')?undefined:failures},null,2));
if(failures.length)process.exitCode=1;
