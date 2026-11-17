(function(root){
 'use strict';
 function raw(attr,index,component){
  return attr.isInterleavedBufferAttribute?attr.data.array[index*attr.data.stride+attr.offset+component]:attr.array[index*attr.itemSize+component];
 }
 function split(T,geo,materials){
  if(!Array.isArray(materials))return [{geometry:geo,material:materials}];
  var result=[];
  geo.groups.forEach(function(group){
   var mat=materials[group.materialIndex];if(!mat)return;
   var begin=Math.max(group.start,geo.drawRange.start),end=Math.min(group.start+group.count,geo.drawRange.start+geo.drawRange.count,geo.index?geo.index.count:geo.attributes.position.count);
   if(end<=begin)return;
   var out=new T.BufferGeometry();
   Object.keys(geo.attributes).forEach(function(name){
    var attr=geo.attributes[name],source=attr.isInterleavedBufferAttribute?attr.data.array:attr.array;
    var values=new source.constructor((end-begin)*attr.itemSize);
    for(var i=begin;i<end;i++){var vertex=geo.index?geo.index.getX(i):i;for(var c=0;c<attr.itemSize;c++)values[(i-begin)*attr.itemSize+c]=raw(attr,vertex,c);}
    out.setAttribute(name,new T.BufferAttribute(values,attr.itemSize,attr.normalized));
   });
   result.push({geometry:out,material:mat});
  });return result;
 }
 function extraAttributes(T,list,out){
  var names=new Set();list.forEach(function(g){Object.keys(g.attributes).forEach(function(n){if(!['position','normal','uv'].includes(n))names.add(n);});});
  names.forEach(function(name){
   var exemplar=list.find(function(g){return g.attributes[name];}).attributes[name],size=exemplar.itemSize;
   var total=list.reduce(function(n,g){return n+g.attributes.position.count;},0),values=new Float32Array(total*size),offset=0;
   list.forEach(function(g){
    var attr=g.attributes[name];if(attr&&attr.itemSize!==size)throw new Error('Incompatible vertex attribute: '+name);
    for(var i=0;i<g.attributes.position.count;i++)for(var c=0;c<size;c++){
     var v=attr?raw(attr,i,c):(name==='color'?1:name==='tangent'&&(c===0||c===3)?1:0);
     if(attr&&attr.normalized){
      var array=attr.isInterleavedBufferAttribute?attr.data.array:attr.array;
      if(array instanceof Uint8Array)v/=255;else if(array instanceof Uint16Array)v/=65535;else if(array instanceof Uint32Array)v/=4294967295;
      else if(array instanceof Int8Array)v=Math.max(v/127,-1);else if(array instanceof Int16Array)v=Math.max(v/32767,-1);else if(array instanceof Int32Array)v=Math.max(v/2147483647,-1);
     }
     values[(offset+i)*size+c]=v;
    }offset+=g.attributes.position.count;
   });out.setAttribute(name,new T.BufferAttribute(values,size));
  });return out;
 }
 root.KasselAircraftMaterialGeometry={split:split,extraAttributes:extraAttributes};
 if(typeof module!=='undefined')module.exports=root.KasselAircraftMaterialGeometry;
})(typeof window!=='undefined'?window:globalThis);
