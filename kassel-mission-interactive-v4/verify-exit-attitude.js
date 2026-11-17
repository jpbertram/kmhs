'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const T=require(path.resolve(process.argv[2]||'../tmp/three-r128.js'));
const attitude=require('./flight-attitude.js');
const src=fs.readFileSync(path.join(__dirname,'km3d-v3.js'),'utf8');
const begin=src.indexOf('var prog=travelled/lim;'),end=src.indexOf('if(KM._playing',begin);
assert(begin>=0&&end>begin);
const code=src.slice(begin,end);
for(const heading of [0,.8,2.4,4.7])for(const progress of [.01,.2,.6,.99]){
 const v={startPos:new T.Vector3(3,100,5),exitDir:new T.Vector3(Math.cos(heading),0,Math.sin(heading))};
 function sample(distance){const p=new T.Group();vm.runInNewContext(code,{THREE:T,KasselFlightAttitude:attitude,p,v,travelled:distance,lim:500,siteY:2});return p;}
 const d=progress*500,p=sample(d),a=sample(d-.001),b=sample(d+.001);
 const tangent=b.position.clone().sub(a.position).normalize();
 const nose=new T.Vector3(1,0,0).applyQuaternion(p.quaternion);
 assert(nose.dot(tangent)>1-1e-10,'Departing aircraft nose follows actual descending path');
 assert(nose.y<0,'Descent pitches nose below horizon');
}
console.log('PASS: actual departure runtime nose aligns with finite-difference path tangent across headings and descent phases. Not aerodynamic or landing validation.');
