const base=new URL('../crew-stations/node_modules/@gltf-transform/',import.meta.url);
const {NodeIO}=await import(new URL('core/dist/index.js',base));const {ALL_EXTENSIONS}=await import(new URL('extensions/dist/index.js',base));
const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(process.argv[2]);
function xf(m,p){return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];}
const R=JSON.parse(process.argv[3]);
const counts={};
for(const node of doc.getRoot().listNodes()){const mesh=node.getMesh();if(!mesh)continue;const W=node.getWorldMatrix();
 for(const prim of mesh.listPrimitives()){const P=prim.getAttribute('POSITION'),I=prim.getIndices(),n=I?I.getCount():P.getCount();const mn=prim.getMaterial().getName();
  for(let t=0;t<n;t+=3){const c=[0,0,0];for(let k=0;k<3;k++){const p=xf(W,P.getElement(I?I.getScalar(t+k):t+k,[]));c[0]+=p[0]/3;c[1]+=p[1]/3;c[2]+=p[2]/3;}
   for(const [name,b] of Object.entries(R)){if(c[0]>=b[0]&&c[0]<=b[3]&&c[1]>=b[1]&&c[1]<=b[4]&&c[2]>=b[2]&&c[2]<=b[5]){const k=name+':'+mn;counts[k]=(counts[k]||0)+1;}}
  }}}
console.log(JSON.stringify(counts,null,0));
