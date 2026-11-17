'use strict';
const {spawnSync}=require('node:child_process'),path=require('node:path');
const cwd=path.join(__dirname,'kassel-mission-interactive-v4');
const tests=['test-forward-endpoint-route.js','test-m1-clock.js','test-m1-boundaries.js','test-m1-return-ground.js','test-m1-mission.js','test-m1-transitions.js','test-m1-clearance.js','test-m1-fighters.js'];
let failures=0;
for(const test of tests){
 const result=spawnSync(process.execPath,[path.join(cwd,test)],{cwd,stdio:'inherit'});
 if(result.error||result.status!==0){failures++;console.error('FAIL runner '+test+': '+(result.error||result.status));}
}
console.log(`${failures?'FAIL':'PASS'} packaged M1 numeric suite: tests=${tests.length} failures=${failures}; printed exclusions still apply; M1 remains incomplete`);
process.exitCode=failures?1:0;
