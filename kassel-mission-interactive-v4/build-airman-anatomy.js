// Mechanical mesh conversion, CC0 MakeHuman anatomical head, not a likeness.
const fs=require('node:fs'),path=require('node:path');
const source=process.argv[2];if(!source)throw new Error('Pass downloaded MakeHuman base.obj');
const lines=fs.readFileSync(source,'utf8').split('\n'),vertices=[],faces=[];let group='';
for(const line of lines){const a=line.trim().split(/\s+/);if(a[0]==='v')vertices.push(a.slice(1,4).map(Number));else if(a[0]==='g')group=a[1];else if(a[0]==='f'&&group==='body'){let ids=a.slice(1).map(s=>Number(s.split('/')[0])-1);if(ids.every(i=>vertices[i][1]>6.0))for(let j=1;j<ids.length-1;j++)faces.push(ids[0],ids[j],ids[j+1]);}}
const used=[...new Set(faces)],lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const i of used)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],vertices[i][k]);hi[k]=Math.max(hi[k],vertices[i][k]);}
const p=used.flatMap(i=>vertices[i].map((v,k)=>(v-(lo[k]+hi[k])/2)/(hi[k]-lo[k]))),map=new Map(used.map((id,i)=>[id,i])),indices=faces.map(i=>map.get(i));
const out='/* Derived from MakeHuman base.obj, explicitly CC0 September 2020.\n * Data Collection AB, Joel Palmius, Jonas Hauquier.\n * https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj\n * Generic anatomy only; not a historic person likeness. */\nwindow.KasselHumanHead='+JSON.stringify({positions:p,indices})+';\n';
fs.writeFileSync(path.join(__dirname,'airman-anatomy.js'),out);console.log('Derived anatomical head',used.length,'vertices',faces.length/3,'triangles');
