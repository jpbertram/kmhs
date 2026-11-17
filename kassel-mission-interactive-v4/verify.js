'use strict';
const {spawnSync}=require('node:child_process'),path=require('node:path');
for(const args of [['test-coordinated-turn.js','--write-results'],['test-turn-browser.js']]){
 const result=spawnSync(process.execPath,args.map((a,i)=>i? a:path.join(__dirname,a)),{cwd:__dirname,stdio:'inherit'});
 if(result.status!==0){process.exitCode=1;break;}
}
