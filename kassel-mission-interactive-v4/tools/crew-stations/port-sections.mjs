// Brings the approved crew-station sections (built in b24-cockpit.html and
// exported as Draco-compressed GLBs with a manifest) into the mission page:
// decodes Draco, bakes emissive strength for three r128, drops the stand-alone
// page's cabin lamps, keeps KHR_texture_transform, quantizes and meshopt-compresses geometry, and
// writes crew-sections/<same file names> plus crew-sections/manifest.json with
// the station eye points read from the page's STATIONS table.
// Drop in updated sections by rerunning:
//   node tools/crew-stations/port-sections.mjs <sections dir> <b24-cockpit.html>
// then node tools/cockpit-live/extract-gauges.mjs crew-sections/b24-flightdeck.glb > cockpit-gauges.js
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const [,,srcDir,htmlPath]=process.argv;
if(!srcDir)throw Error('usage: port-sections.mjs <sections dir> [b24-cockpit.html]');
const here=path.dirname(new URL(import.meta.url).pathname),out=path.resolve(here,'../../crew-sections');
const {NodeIO}=require('@gltf-transform/core');const {ALL_EXTENSIONS}=require('@gltf-transform/extensions');
const {dedup,prune,weld,quantize,reorder,meshopt}=require('@gltf-transform/functions');
const {MeshoptEncoder}=require('meshoptimizer');await MeshoptEncoder.ready;
const draco3d=require('draco3dgltf');const sharp=require('sharp');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule(),'meshopt.encoder':MeshoptEncoder});
const manifest=JSON.parse(fs.readFileSync(path.join(srcDir,'manifest.json'),'utf8'));
fs.mkdirSync(out,{recursive:true});
const keepExt=new Set(['KHR_mesh_quantization','KHR_texture_transform','EXT_meshopt_compression']);
const sections=[];
for(const s of manifest.sections){
 const doc=await io.read(path.join(srcDir,s.file)),root=doc.getRoot();
 for(const m of root.listMaterials()){const ext=m.getExtension('KHR_materials_emissive_strength');
  if(ext){const k=ext.getEmissiveStrength();m.setEmissiveFactor(m.getEmissiveFactor().map(v=>Math.min(1,v*k)));m.setExtension('KHR_materials_emissive_strength',null);}}
 for(const n of root.listNodes())if(n.getExtension('KHR_lights_punctual'))n.dispose();
 for(const e of root.listExtensionsUsed())if(!keepExt.has(e.extensionName))e.dispose();
 /* meshopt: three r128's GLTFLoader decodes EXT_meshopt_compression with the bundled vendor/meshopt_decoder.js */
 await doc.transform(dedup(),weld(),prune(),reorder({encoder:MeshoptEncoder}),quantize({quantizePosition:14,quantizeNormal:10,quantizeTexcoord:12}));
 if(/flightdeck/.test(s.file))await io.write(path.join(process.env.PLAIN_DIR||here,'flightdeck-plain.glb'),doc);
 /* opaque PNG textures (paint, grime, normal and roughness maps) as JPEG: a
    quarter of the download; textures with real transparency stay PNG */
 for(const t of root.listTextures()){
  if(t.getMimeType()!=='image/png')continue;
  const img=Buffer.from(t.getImage()),st=await sharp(img).stats();
  if(!st.isOpaque)continue;
  const normal=/normal/i.test(t.getName()||'')||root.listMaterials().some(m=>m.getNormalTexture()===t);
  t.setImage(new Uint8Array(await sharp(img).jpeg({quality:normal?92:84,mozjpeg:true}).toBuffer())).setMimeType('image/jpeg');
  if(t.getURI())t.setURI(t.getURI().replace(/\.png$/,'.jpg'));
 }
 await doc.transform(meshopt({encoder:MeshoptEncoder,level:'high'}));
 const file=path.join(out,s.file);await io.write(file,doc);
 const key=s.file.replace(/^b24-|\.glb$/g,'');
 sections.push({key,file:s.file,contents:s.contents,bytes:fs.statSync(file).size});
 console.log(s.file,(fs.statSync(file).size/1e6).toFixed(1)+'MB',root.listExtensionsUsed().map(e=>e.extensionName).join(','));
}
// station eye points from the approved page (its ids mapped to the mission's)
let stations=null;
if(htmlPath){
 const html=fs.readFileSync(htmlPath,'utf8'),m=html.match(/const STATIONS = (\[[\s\S]*?\n\]);/);
 if(!m)throw Error('STATIONS table not found in '+htmlPath);
 const list=vm.runInNewContext(m[1],{L:(x,y,z)=>{const l=Math.hypot(x,y,z);return [x/l,y/l,z/l];}});
 const ids={waistl:'waistL',waistr:'waistR'};stations={};
 for(const st of list)if(st.eye)stations[ids[st.id]||st.id]={eye:st.eye,look:st.look.map(v=>+v.toFixed(4))};
}
const prev=fs.existsSync(path.join(out,'manifest.json'))?JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8')):{};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({origin:manifest.origin,source:'b24-cockpit.html crew sections (approved by JP 2026-11-18), converted by tools/crew-stations/port-sections.mjs',
 sections,stations:stations||prev.stations||null},null,1)+'\n');
console.log('wrote',path.relative(process.cwd(),out));
