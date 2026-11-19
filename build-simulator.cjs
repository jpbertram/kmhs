'use strict';
const fs=require('node:fs');
const path=require('node:path');
const project=path.join(__dirname,'kassel-mission-interactive-v4');
const output=process.argv[2]&&path.resolve(process.argv[2]);
if(!output)throw Error('Provide a new output directory for the simulator release');
const html=fs.readFileSync(path.join(project,'mission-reconstruction.html'),'utf8');
const scripts=[...html.matchAll(/<script\s+src="([^"?]+)(?:\?[^"]*)?"/g)]
  .map(match=>match[1]).filter(src=>!/^https?:/.test(src));
if(!scripts.includes('../tmp/three-r128.js'))throw Error('Expected bundled Three.js runtime');
fs.mkdirSync(output);
fs.mkdirSync(path.join(output,'vendor'));
fs.copyFileSync(path.join(__dirname,'tmp/three-r128.js'),path.join(output,'vendor/three-r128.js'));
fs.copyFileSync(path.join(project,'vendor/THREE-LICENSE.txt'),path.join(output,'vendor/THREE-LICENSE.txt'));
for(const name of scripts){
  if(name==='../tmp/three-r128.js')continue;
  if(!/^[\w-]+\.js$/.test(name))throw Error('Unrecognized simulator script '+name);
  fs.copyFileSync(path.join(project,name),path.join(output,name));
}
// Every asset in this list is intentionally distributed with the public build.
const textures=[
  'elevation-7-60-38.png',
  'cabin-enamel-tone.jpg','cabin-enamel-roughness.jpg','cabin-enamel-normal.jpg',
  'cabin-cloth-tone.jpg','cabin-cloth-roughness.jpg','cabin-cloth-normal.jpg'
];
// Crew-compartment models loaded by crew-compartments.js from the page's folder.
// The six approved crew-station sections, listed in their own manifest.
const sections=JSON.parse(fs.readFileSync(path.join(project,'crew-sections','manifest.json'),'utf8'));
fs.mkdirSync(path.join(output,'crew-sections'));
fs.copyFileSync(path.join(project,'crew-sections','manifest.json'),path.join(output,'crew-sections','manifest.json'));
for(const s of sections.sections){if(!/^[\w-]+\.glb$/.test(s.file))throw Error('Unrecognized crew section '+s.file);fs.copyFileSync(path.join(project,'crew-sections',s.file),path.join(output,'crew-sections',s.file));}
fs.copyFileSync(path.join(project,'vendor','MESHOPTIMIZER-LICENSE.md'),path.join(output,'vendor','MESHOPTIMIZER-LICENSE.md'));
// Bundled CC-BY aircraft model (credit shown in the sim and in aircraft/CREDITS.md).
fs.mkdirSync(path.join(output,'aircraft'));
for(const name of ['km-p51-361st.glb','CREDITS.md'])fs.copyFileSync(path.join(project,'aircraft',name),path.join(output,'aircraft',name));
fs.mkdirSync(path.join(output,'textures'));
for(const name of textures)fs.copyFileSync(path.join(project,'textures',name),path.join(output,'textures',name));
const config={esriApiKey:process.env.KM_ESRI_BROWSER_KEY?.trim()||''};
fs.writeFileSync(path.join(output,'simulator-config.js'),'window.KMSimulatorConfig = '+JSON.stringify(config)+';\n');
fs.writeFileSync(path.join(output,'index.html'),html.replace('../tmp/three-r128.js','vendor/three-r128.js'));
console.log('Built simulator runtime in '+output);
