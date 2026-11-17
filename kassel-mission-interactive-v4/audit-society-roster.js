/* Read-only reconciliation. CMS drafts are evidence leads, not certification. */
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=__dirname;
const crews=JSON.parse(fs.readFileSync(path.join(root,'reference/society-crew-cms-snapshot.json'),'utf8')).items;
const participants=JSON.parse(fs.readFileSync(path.join(root,'reference/society-participant-cms-snapshot.json'),'utf8')).items;
const runtime=fs.readFileSync(path.join(root,'km3d-v3.js'),'utf8');
const roster=vm.runInNewContext('('+runtime.match(/V2\.CREW_LISTS=([\s\S]*?);\n/)[1]+')');
const byId=new Map(participants.map(p=>[p.id,p]));
const differences=[];
for(const crew of crews){
  const f=crew.fieldData;
  const local=Object.values(roster).find(rows=>rows.some(p=>p.s===f.slug&&/pilot/i.test(p.r)))||roster[f.name.replace(/ Crew$/,'')];
  if(!local){differences.push({crew:f.name,issue:'No local crew match'});continue;}
  const localSlugs=new Set(local.map(p=>p.s));
  for(const id of f.participants||[]){
    const person=byId.get(id);
    if(!person){differences.push({crew:f.name,issue:'CMS reference unresolved',id});continue;}
    const p=person.fieldData;
    if(!localSlugs.has(p.slug))differences.push({crew:f.name,name:p.name,slug:p.slug,issue:'Missing from local crew roster',inMission:p['in-mission'],draft:person.isDraft});
    if(p.crew!==crew.id)differences.push({crew:f.name,name:p.name,issue:'CMS reciprocal crew link mismatch',participantCrew:p.crew});
  }
}
console.log(JSON.stringify({cmsCrews:crews.length,cmsParticipants:participants.length,localCrews:Object.keys(roster).length,localParticipants:Object.values(roster).reduce((n,r)=>n+r.length,0),differences},null,2));
