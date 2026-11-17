'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=__dirname,manifest=path.join(root,'MANIFEST.sha256.json');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
 if(['node_modules','.git','.DS_Store','MANIFEST.sha256.json'].includes(e.name))return [];
 const p=path.join(dir,e.name);if(e.isSymbolicLink())throw Error('Symlink must be materialized: '+p);
 return e.isDirectory()?walk(p):[p];
});}
const files=walk(root).sort(),records={};
for(const file of files){const bytes=fs.readFileSync(file);records[path.relative(root,file).split(path.sep).join('/')]={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};}
if(process.argv.includes('--write'))fs.writeFileSync(manifest,JSON.stringify(records,null,2)+'\n');
else{
 const expected=JSON.parse(fs.readFileSync(manifest,'utf8'));
 for(const [name,record]of Object.entries(expected))if(JSON.stringify(records[name])!==JSON.stringify(record))throw Error('Changed or missing: '+name);
 if(Object.keys(expected).length!==Object.keys(records).length)throw Error('Unexpected added files; regenerate manifest only after reviewing changes');
}
for(const name of ['kassel-mission-interactive-v4/b24j.glb','kassel-mission-interactive-v4/b24j-interior-olive.obj','tmp/three-r128.js','handoff/goal-objective.md'])if(!records[name]||records[name].bytes<100)throw Error('Required asset missing/empty: '+name);
console.log(`PASS package integrity: files=${files.length} bytes=${Object.values(records).reduce((s,r)=>s+r.bytes,0)}; SHA-256 ${process.argv.includes('--write')?'written':'verified'}`);
