/* Read-only source audit. Output is evidence, not certification of the asset.
 * Usage: node audit-supplied-interior.js /absolute/path/to/three-r128.js
 * AABB extents use every position vertex through the source scene hierarchy;
 * accessor min/max alone would overestimate rotated parts. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const T=require(path.resolve(process.argv[2]||'../tmp/three-r128.js'));
const input=path.join(__dirname,'b24j.glb'),buffer=fs.readFileSync(input);
if(buffer.readUInt32LE(0)!==0x46546c67||buffer.readUInt32LE(4)!==2)throw Error('Expected GLB 2.0');
let json,bin;
for(let p=12;p<buffer.length;){const length=buffer.readUInt32LE(p),type=buffer.readUInt32LE(p+4),chunk=buffer.subarray(p+8,p+8+length);if(type===0x4e4f534a)json=JSON.parse(chunk.toString());if(type===0x004e4942)bin=chunk;p+=8+length;}
if(!json||!bin)throw Error('GLB chunks missing');
const world=[],ancestry=[],parts=[],allBounds=new T.Box3();
function visit(id,parent,names){
 const node=json.nodes[id],local=new T.Matrix4();
 if(node.matrix)local.fromArray(node.matrix);
 else local.compose(new T.Vector3().fromArray(node.translation||[0,0,0]),new T.Quaternion().fromArray(node.rotation||[0,0,0,1]),new T.Vector3().fromArray(node.scale||[1,1,1]));
 const matrix=parent.clone().multiply(local),chain=names.concat(node.name||`node-${id}`);world[id]=matrix;ancestry[id]=chain;
 if(node.mesh!==undefined){
  if(node.skin!==undefined)throw Error('Skinned source requires evaluated bind pose, not static audit');
  const bounds=new T.Box3(),materials=new Set();let count=0;
  for(const primitive of json.meshes[node.mesh].primitives){
   const acc=json.accessors[primitive.attributes.POSITION],view=json.bufferViews[acc.bufferView];
   if(acc.componentType!==5126||acc.type!=='VEC3'||acc.sparse)throw Error('Unsupported position accessor; cannot claim audited bounds');
   const stride=view.byteStride||12,start=(view.byteOffset||0)+(acc.byteOffset||0);
   for(let v=0;v<acc.count;v++){const offset=start+v*stride,p=new T.Vector3(bin.readFloatLE(offset),bin.readFloatLE(offset+4),bin.readFloatLE(offset+8)).applyMatrix4(matrix);if(![p.x,p.y,p.z].every(Number.isFinite))throw Error('Nonfinite position');bounds.expandByPoint(p);}
   count+=acc.count;materials.add(primitive.material);
  }
  allBounds.union(bounds);
  if(chain.includes('interior'))parts.push({node:id,name:node.name,parent:chain.at(-2),vertices:count,materials:Array.from(materials).map(m=>({index:m,name:json.materials[m]?.name||null})),min:bounds.min.toArray(),max:bounds.max.toArray(),center:bounds.getCenter(new T.Vector3()).toArray()});
 }
 for(const child of node.children||[])visit(child,matrix,chain);
}
for(const root of json.scenes[json.scene||0].nodes)visit(root,new T.Matrix4(),[]);
if(!parts.length)throw Error('No supplied interior branch found');
const report={status:'Source-geometry audit only; neither factory-exact certification nor camera-clearance validation',source:'b24j.glb',sha256:crypto.createHash('sha256').update(buffer).digest('hex'),nativeNoseAxis:'+Z per supplied model landmarks; not inferred from longest axis',fullAirframeBounds:{min:allBounds.min.toArray(),max:allBounds.max.toArray()},interiorMeshCount:parts.length,interiorVertexCount:parts.reduce((s,p)=>s+p.vertices,0),parts};
const output=path.join(__dirname,'reference','supplied-interior-geometry-audit.json');
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(`Audited ${parts.length} interior meshes; source unchanged. Report: ${output}`);
for(const p of parts.filter(p=>/instrument-panel|pilot-seat-cushion|navigator-table|radio-table|ball-turret|tail-gunner-seat/.test(p.name)))console.log(`${p.name}: native center [${p.center.map(n=>n.toFixed(3)).join(', ')}], materials ${p.materials.map(m=>m.name).join(', ')}`);
