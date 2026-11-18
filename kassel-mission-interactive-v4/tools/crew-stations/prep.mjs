import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,weld,quantize} from '@gltf-transform/functions';
const [,,input,output]=process.argv;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=await io.read(input);
const root=doc.getRoot();
// three r128 ignores KHR_materials_emissive_strength: bake it into the factor.
for(const m of root.listMaterials()){
  const ext=m.getExtension('KHR_materials_emissive_strength');
  if(ext){const s=ext.getEmissiveStrength();m.setEmissiveFactor(m.getEmissiveFactor().map(v=>Math.min(1,v*s)));m.setExtension('KHR_materials_emissive_strength',null);}
}
// The mission scene supplies its own daylight; drop the stand-alone page's cabin lamps.
for(const n of root.listNodes()){if(n.getExtension('KHR_lights_punctual'))n.dispose();}
for(const e of root.listExtensionsUsed())if(e.extensionName!=='KHR_mesh_quantization')e.dispose();
await doc.transform(dedup(),weld(),prune(),quantize({quantizePosition:14,quantizeNormal:10,quantizeTexcoord:12}));
await io.write(output,doc);
const cams=root.listNodes().filter(n=>n.getCamera()).map(n=>({name:n.getName(),t:n.getTranslation(),r:n.getRotation()}));
console.log(JSON.stringify(cams));
console.log('extensions',root.listExtensionsUsed().map(e=>e.extensionName));
