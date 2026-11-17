'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
async function main(){
 const project=path.resolve(__dirname,'..'),allowed=new Set(['index.html','coordinated-turn.html','turn-renderer.js','turn-parameters.js','coordinated-turn.js','flight-attitude.js']);
 const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file;
  if(name==='/three.js')file=path.join(project,'tmp/three-r128.js');else if(allowed.has(path.basename(name)))file=path.join(__dirname,path.basename(name));
  if(!file){res.writeHead(404);return res.end();}let body=fs.readFileSync(file);if(file.endsWith('.html'))body=Buffer.from(body.toString().replace('../tmp/three-r128.js','/three.js'));
  res.setHeader('Content-Type',file.endsWith('.html')?'text/html':'application/javascript');res.end(body);
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{browser=await chromium.launch({...(process.env.CHROME_EXECUTABLE_PATH?{executablePath:process.env.CHROME_EXECUTABLE_PATH}:{}),headless:true});const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));await page.goto('http://127.0.0.1:'+server.address().port+'/coordinated-turn.html');await page.waitForFunction(()=>window.KasselTurnBenchmark&&KasselTurnBenchmark.frames>120);
  await page.click('#play');const pausedTime=await page.evaluate(()=>KasselTurnBenchmark.timeS);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>KasselTurnBenchmark.timeS),pausedTime,'Pause freezes simulation time');
  await page.click('#parameters');assert.equal(await page.locator('#rows tr').count(),Object.keys(require('./turn-parameters.js').values).length+35,'Every parameter and slot appears in the data table');await page.click('#close');await page.click('#restart');
  const report=await page.evaluate(async()=>{const b=KasselTurnBenchmark,windows=[],start=performance.now();let windowStart=start,count=0,maximumFrameMs=0,prior=start;
   await new Promise(resolve=>{function tick(now){maximumFrameMs=Math.max(maximumFrameMs,now-prior);prior=now;count++;const elapsed=now-start;b.seek(Math.min(1,elapsed/20000)*b.durationS);document.getElementById('view').value=elapsed<7000?'box':elapsed<14000?'chase':'cockpit';
    if(now-windowStart>=1000){windows.push(count*1000/(now-windowStart));count=0;windowStart=now;}
    if(elapsed>=20000)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);});
   return {aircraft:b.aircraftCount,drawCalls:b.drawCalls,triangles:b.triangles,views:['box','chase','cockpit'],windowFps:windows,minimumWindowFps:Math.min(...windows),maximumFrameMs,viewport:'1280x720',durationSeconds:20,warmupFrames:120,renderer:'Chrome headless WebGL; local host',userAgent:navigator.userAgent};
  });report.errors=errors;report.minimumInstantaneousFps=1000/report.maximumFrameMs;
  report.pass=report.aircraft===35&&report.minimumWindowFps>=30&&report.minimumInstantaneousFps>=30&&errors.length===0;
  await page.selectOption('#view','chase');await page.evaluate(()=>KasselTurnBenchmark.seek(KasselTurnBenchmark.durationS/2));await page.waitForTimeout(100);await page.screenshot({path:path.join(__dirname,'turn-browser-preview.png')});fs.writeFileSync(path.join(__dirname,'turn-browser-results.json'),JSON.stringify(report,null,2));
  console.log((report.pass?'PASS':'FAIL')+' browser FPS '+JSON.stringify(report));assert(report.pass,'Full-formation browser acceptance failed');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
