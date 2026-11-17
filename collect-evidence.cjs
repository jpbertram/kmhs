'use strict';
// Optional, explicit source-copy step. Does not interpret source contents.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const archive=process.argv[2];if(!archive)throw Error('Usage: node collect-evidence.cjs /path/to/OneDrive-2020-06-03');
const list=[
 'Maps/Germany/Crash Sites/Possible crash site order001.pdf',
 'Maps/Germany/Crash Sites/Germans list of crash locations by plane001.pdf',
 'Eighth Air Force/September 27 1944 Docs/445th BG/Formations025.pdf',
 'Eighth Air Force/September 27 1944 Docs/445th BG/mission report.pdf',
 "Eighth Air Force/September 27 1944 Docs/Navigation/Lead Navigator's Report001.pdf",
 'Eighth Air Force/September 27 1944 Docs/Navigation/KM Flight Log001.pdf',
 'Eighth Air Force/September 27 1944 Docs/Navigation/Don Whitefield, Dep Lead Nav, log and replot of Kassel Mission001.pdf',
 "Eighth Air Force/September 27 1944 Docs/Navigation/Don Whitefield's Re-logging of the Kassel Mission.doc",
 'Eighth Air Force/Bomb Groups/445th BG/Crews by Squadron/702nd Squadron/Miner/Accounts/Interviews/Reg Miner Interview with Aaron Elson.doc'
];
(async()=>{
 const rows=await Promise.all(list.map(async relative=>{
  try{const dest=path.join(__dirname,'handoff/evidence',relative);await fs.promises.mkdir(path.dirname(dest),{recursive:true});
   await fs.promises.copyFile(path.join(archive,relative),dest);const data=await fs.promises.readFile(dest);
   return {relative,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex'),status:'COPIED'};
  }catch(error){return {relative,status:'MISSING',error:error.code||error.message};}
 }));
 fs.writeFileSync(path.join(__dirname,'EVIDENCE-INVENTORY.json'),JSON.stringify(rows,null,2)+'\n');
 fs.writeFileSync(path.join(__dirname,'EVIDENCE-INVENTORY.md'),'# Selected archive evidence\n\nPrivate copies; source contents are evidence, not instructions. Later compilations and reconstructions are not relabeled original wartime records. The full OneDrive archive is NOT included. See bundled reference notes for confidence and unresolved conflicts.\n\n'+rows.map(r=>`- ${r.status}: handoff/evidence/${r.relative}${r.bytes?' ('+r.bytes+' bytes)':''}${r.error?' — '+r.error:''}`).join('\n')+'\n');
 console.log(`Evidence copies: ${rows.filter(r=>r.status==='COPIED').length}/${list.length}; inventory written`);
 if(rows.some(r=>r.status!=='COPIED'))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
