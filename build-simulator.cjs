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
const compartments=['b24-flight-deck.glb','b24-aft-deck.glb','b24-nose-compartment.glb','b24-waist.glb'];
for(const name of compartments)fs.copyFileSync(path.join(project,name),path.join(output,name));
fs.mkdirSync(path.join(output,'textures'));
for(const name of textures)fs.copyFileSync(path.join(project,'textures',name),path.join(output,'textures',name));
const config={esriApiKey:process.env.KM_ESRI_BROWSER_KEY?.trim()||''};
fs.writeFileSync(path.join(output,'simulator-config.js'),'window.KMSimulatorConfig = '+JSON.stringify(config)+';\n');
fs.writeFileSync(path.join(output,'index.html'),html.replace('../tmp/three-r128.js','vendor/three-r128.js'));
console.log('Built simulator runtime in '+output);
