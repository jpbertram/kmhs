'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=fs.realpathSync(__dirname),host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||8765);
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.cjs':'application/javascript','.json':'application/json','.css':'text/css','.glb':'model/gltf-binary','.obj':'text/plain','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.pdf':'application/pdf'};
http.createServer((req,res)=>{
 try{
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/'){res.writeHead(302,{Location:'/kassel-mission-interactive-v4/index.html'});res.end();return;}
  if(pathname.endsWith('/'))pathname+='index.html';
  const file=fs.realpathSync(path.resolve(root,'.'+pathname));
  if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile()){res.writeHead(403);res.end();return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,host,()=>console.log(`Kassel private development preview: http://${host}:${port}`));
