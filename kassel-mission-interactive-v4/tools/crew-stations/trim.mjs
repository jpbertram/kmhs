// Trims the stand-alone flight-deck model where the aft-deck model joins it.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune} from '@gltf-transform/functions';
const [,,input,output]=process.argv;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=await io.read(input);
const inBox=(c,b)=>c[0]>=b[0]&&c[0]<=b[1]&&c[1]>=b[2]&&c[1]<=b[3]&&c[2]>=b[4]&&c[2]<=b[5];
// boxes: [xmin,xmax,ymin,ymax,zmin,zmax] in the GLB's own metres (z aft)
const RULES={
  b24_olive:[[-9,9,-9,9,0.93,99]],            // aft closure wall behind the seats
  b24_dark:[[-9,9,-9,9,0.93,99]],             // black backdrop behind that wall
  b24_ext:[[0.5,1.4,0.88,1.36,1.1,1.7],[-1.4,-0.5,0.89,1.35,1.07,1.63],[-0.62,0.62,1.5,3,1.6,2.72]] // radio + left windows, top turret
};
let removed=0;
for(const mesh of doc.getRoot().listMeshes())for(const prim of mesh.listPrimitives()){
  const name=prim.getMaterial()&&prim.getMaterial().getName();const boxes=RULES[name];if(!boxes)continue;
  const pos=prim.getAttribute('POSITION'),idx=prim.getIndices();
  const at=k=>idx?idx.getScalar(k):k;const count=idx?idx.getCount():pos.getCount();
  const keep=[];const a=[0,0,0],b=[0,0,0],c=[0,0,0];
  for(let i=0;i<count;i+=3){const i0=at(i),i1=at(i+1),i2=at(i+2);
    pos.getElement(i0,a);pos.getElement(i1,b);pos.getElement(i2,c);
    const cen=[(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3,(a[2]+b[2]+c[2])/3];
    if(boxes.some(bx=>inBox(cen,bx))){removed++;continue;}keep.push(i0,i1,i2);}
  const arr=new Uint32Array(keep);if(idx)idx.setArray(arr);else prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(arr).setBuffer(pos.getBuffer()));
}
await doc.transform(prune());
await io.write(output,doc);console.log('trimmed triangles',removed);
