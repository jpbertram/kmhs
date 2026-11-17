// Read-only diagnosis of current route-centre loss placement. Formation
// offsets and terrain are excluded; this is not a reconstructed flight path.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const T=require(path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--'))||'../tmp/three-r128.js'));
const src=fs.readFileSync(path.join(__dirname,'km3d-v3.js'),'utf8'),ctx={V2:{},Math};vm.createContext(ctx);
function assignment(name){const start=src.indexOf(name+'=[');if(start<0)throw Error(name);const tail=src.slice(start),match=/^\]\s*;?/m.exec(tail);if(!match)throw Error('Unclosed '+name);vm.runInContext(tail.slice(0,match.index+match[0].length),ctx);}
for(const name of ['V2.routeGeo','V2.returnGeo','V2.routeEventGeo','V2.ROSTER','V2.CRASH_SITES'])assignment(name);
const geoStart=src.indexOf('var GEO=(function()'),geoEnd=src.indexOf('V2.GEO=GEO;',geoStart);vm.runInContext(src.slice(geoStart,geoEnd),ctx);
const points=ctx.V2.routeGeo.map(g=>new T.Vector3(ctx.GEO.lonToX(g[0]),g[2],ctx.GEO.latToZ(g[1])));
const tail=ctx.V2.returnGeo.slice(1).map(g=>new T.Vector3(ctx.GEO.lonToX(g[0]),g[2],ctx.GEO.latToZ(g[1])));
const full=new T.CatmullRomCurve3(points.concat(tail),false,'centripetal');
ctx.KM={_full:full,_curve:new T.CatmullRomCurve3(points,false,'centripetal')};ctx.RETURN_START=.92;
const arcStart=src.indexOf('function fullArc(mt){'),arcEnd=src.indexOf('\nvar hash=',arcStart);
vm.runInContext(src.slice(arcStart,arcEnd),ctx);
let junction=0,best=Infinity;
for(let s=0;s<=1;s+=.002){const p=full.getPointAt(s),last=points[points.length-1],d=(p.x-last.x)**2+(p.z-last.z)**2;if(d<best){best=d;junction=s;}}
let behind=0;const rows=[];
for(const ship of ctx.V2.ROSTER.filter(r=>r.fate==='r')){
 const site=ctx.V2.CRASH_SITES.find(s=>s.n===ship.p);if(!site)throw Error('Missing site '+ship.p);
 const mt=.84+ship.ft/420*.08,arc=ctx.fullArc(mt)/full.getLength();
 const start=full.getPointAt(arc),forward=full.getTangentAt(arc);forward.y=0;forward.normalize();
 const target=new T.Vector3(ctx.GEO.lonToX(site.lon),start.y,ctx.GEO.latToZ(site.lat));
 const displacement=target.clone().sub(start),projection=displacement.dot(forward);
 if(projection<0)behind++;
 rows.push({pilot:ship.p,lossCue:ship.ft,routeCentreLon:+ctx.GEO.xToLon(start.x).toFixed(3),routeCentreLat:+ctx.GEO.zToLat(start.z).toFixed(3),siteLon:site.lon,siteLat:site.lat,siteBehindAssignedHeading:projection<0,forwardProjectionSceneUnits:+projection.toFixed(2)});
}
const contradictions=[];
// A broad region check, deliberately not an exact reconstructed attack fix.
// The contemporary report says south of Göttingen; participant/local accounts
// place the rally attack near Eisenach. The existing 50.5 N leg satisfies neither.
const local=rows.filter(r=>r.siteLon>=9.5&&r.siteLon<=10.5&&r.siteLat>=50.7&&r.siteLat<=51.3);
for(const row of local){
 if(row.routeCentreLat<50.7)contradictions.push({pilot:row.pilot,reason:'Assigned local battle origin south of the source-supported regional envelope',latitude:row.routeCentreLat});
}
const report={scope:'Current route centre at assigned loss cue; not per-aircraft formation offsets or historical validation',historicalValidation:'NOT ESTABLISHED',behind,total:rows.length,contradictions,rows};
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--check')&&contradictions.length){
 console.error('FAIL: regional battle-route contradictions remain. Passing this gate would not validate exact tracks, aircraft-specific descent dynamics or bailout histories.');
 process.exitCode=1;
}
