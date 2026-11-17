'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const T=require(path.resolve(process.argv[2]||'../tmp/three-r128.js')),src=fs.readFileSync(path.join(__dirname,'km3d-v3.js'),'utf8'),ctx={V2:{},Math,RETURN_START:.92};vm.createContext(ctx);
for(const name of ['V2.routeGeo','V2.returnGeo','V2.routeEventGeo']){
 const tail=src.slice(src.indexOf(name+'=[')),end=/^\]\s*;?/m.exec(tail);
 vm.runInContext(tail.slice(0,end.index+end[0].length),ctx);
}
const gs=src.indexOf('var GEO=(function()');vm.runInContext(src.slice(gs,src.indexOf('V2.GEO=GEO;',gs)),ctx);
const pts=ctx.V2.routeGeo.concat(ctx.V2.returnGeo.slice(1)).map(g=>new T.Vector3(ctx.GEO.lonToX(g[0]),g[2],ctx.GEO.latToZ(g[1])));
const curve=new T.CatmullRomCurve3(pts,false,'centripetal');ctx.KM={_full:curve};
const begin=src.indexOf('function fullArc(mt){');vm.runInContext(src.slice(begin,src.indexOf('\nvar hash=',begin)),ctx);
for(const e of ctx.V2.routeEventGeo){const p=curve.getPointAt(ctx.fullArc(e[0])/curve.getLength());assert(Math.hypot(p.x-ctx.GEO.lonToX(e[1]),p.z-ctx.GEO.latToZ(e[2]))<.05,'Event cue reaches its geographic anchor');}
let prior=-1;
for(let i=0;i<=10000;i++){const arc=ctx.fullArc(i/10000);assert(Number.isFinite(arc)&&arc>=prior-1e-8,'Monotone forward route');prior=arc;}
console.log('PASS: actual route cue mapping reaches geographic anchors and remains monotone over 10,001 samples. Source estimates and connecting track are not exact historical fixes or aerodynamic validation.');
const timeline=require('./mission-timeline');
function speed(s){return (ctx.fullArc(timeline.routeAt(s+.01))-ctx.fullArc(timeline.routeAt(s-.01)))/.02;}
const onset=timeline.secondsAt(.84),end=timeline.secondsAt(.92);
const priorSpeed=speed(onset-1),speeds=[];
for(let s=onset;s<end;s+=.1)speeds.push(speed(s));
console.log(JSON.stringify({scope:'Composed timeline + runtime route, scene units per playback second',onset,end,priorSpeed,battleMinimum:Math.min(...speeds),battleMaximum:Math.max(...speeds)}));
assert(Math.min(...speeds)>priorSpeed*.25,'Battle motion must not collapse toward a hover relative to onset');
function metricPoint(mt){const p=curve.getPointAt(ctx.fullArc(mt)/curve.getLength()),lat=ctx.GEO.zToLat(p.z),lon=ctx.GEO.xToLon(p.x);return {x:lon*111195*Math.cos(51.4*Math.PI/180),z:lat*111195};}
let minimumRadius=Infinity;
for(let mt=.66;mt<.835;mt+=.0005){
 const a=metricPoint(mt-.0001),b=metricPoint(mt),c=metricPoint(mt+.0001);
 const ab=Math.hypot(a.x-b.x,a.z-b.z),bc=Math.hypot(b.x-c.x,b.z-c.z),ca=Math.hypot(c.x-a.x,c.z-a.z);
 const cross=Math.abs((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x));
 if(cross>1e-8)minimumRadius=Math.min(minimumRadius,ab*bc*ca/(2*cross));
}
console.log(JSON.stringify({scope:'Approximate horizontal geographic curvature, local metric projection',minimumRallyRadiusMetres:minimumRadius}));
assert(minimumRadius>2000,'Authored rally turn must not contain a sub-2-km corner');
