(function(){'use strict';
const D=KasselTurnParameters,P=Object.fromEntries(Object.entries(D.values).map(([k,v])=>[k,v.value])),T=THREE;
const run=KasselCoordinatedTurn.create({seed:1234567}),scene=new T.Scene();scene.background=new T.Color(0x8096a1);
const camera=new T.PerspectiveCamera(P.cameraFovDeg,innerWidth/innerHeight,P.cameraNearM,P.cameraFarM),renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=P.exposure;document.body.appendChild(renderer.domElement);
scene.add(new T.HemisphereLight(0xddeaff,0x4b5340,P.hemisphereIntensity));const sun=new T.DirectionalLight(0xffefd7,P.sunIntensity);sun.position.set(1,2,1);scene.add(sun);
const drab=new T.MeshStandardMaterial({color:0x555d39,roughness:.62,metalness:.25}),glass=new T.MeshStandardMaterial({color:0x29434d,roughness:.22,metalness:.4}),dark=new T.MeshStandardMaterial({color:0x202322,roughness:.7});
const parts=[];
function part(geo,mat,offset,rotation,propeller){const mesh=new T.InstancedMesh(geo,mat,D.roster.length);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;scene.add(mesh);parts.push({mesh,offset:new T.Vector3(...offset),rotation:rotation||new T.Quaternion(),propeller:!!propeller});}
// Approximate recognizable high-wing, four-nacelle, twin-tail silhouette.
// Every physical mesh envelope uses labeled values from turn-parameters.
const hull=new T.SphereGeometry(1,20,12);hull.scale(P.lengthM/2,P.fuselageRadiusM,P.fuselageRadiusM);part(hull,drab,[0,0,0]);
part(new T.BoxGeometry(P.wingChordM,P.wingThicknessM,P.wingspanM),drab,[0,P.wingHeightM,0]);
part(new T.BoxGeometry(P.tailChordM,P.wingThicknessM,P.tailSpanM),drab,[P.lengthM*P.tailForeFraction,P.wingHeightM,0]);
for(const side of [-1,1])part(new T.BoxGeometry(P.finChordM,P.finHeightM,P.finThicknessM),drab,[P.lengthM*P.tailForeFraction,P.wingHeightM+P.finHeightM/2,side*P.tailSpanM/2]);
const axis=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),Math.PI/2);
for(const fraction of [P.engineInnerSpanFraction,P.engineOuterSpanFraction])for(const sign of [-1,1]){
 const z=sign*fraction*P.wingspanM;
 part(new T.CylinderGeometry(P.engineRadiusM,P.engineRadiusM,P.engineLengthM,12),drab,[P.engineForeM,P.wingHeightM,z],axis);
 for(let blade=0;blade<3;blade++)part(new T.BoxGeometry(P.propellerBladeThicknessM,P.propellerRadiusM*2,P.propellerBladeWidthM),dark,[P.engineForeM+P.engineLengthM/2,P.wingHeightM,z],new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),blade*Math.PI*2/3),true);
}
part(new T.BoxGeometry(P.cockpitLengthM,P.cockpitHeightM,P.cockpitWidthM),glass,[P.lengthM*P.cockpitForeFraction,P.wingHeightM,0]);
const interior=new T.Group();scene.add(interior);
const floor=new T.Mesh(new T.BoxGeometry(P.cockpitLengthM,P.interiorFloorThicknessM,P.cockpitWidthM),drab);floor.position.y=-P.cockpitHeightM;interior.add(floor);
const panel=new T.Mesh(new T.PlaneGeometry(P.cockpitWidthM,P.interiorPanelHeightM),dark);panel.rotation.y=-Math.PI/2;panel.position.set(P.interiorPanelAheadM,-P.interiorPanelBelowM,0);interior.add(panel);
const enclosure=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(P.cockpitLengthM,P.cockpitHeightM*2,P.cockpitWidthM)),new T.LineBasicMaterial({color:0x707962}));interior.add(enclosure);
const ground=new T.Mesh(new T.PlaneGeometry(P.terrainExtentM,P.terrainExtentM),new T.MeshStandardMaterial({color:0x657153,roughness:1}));ground.rotation.x=-Math.PI/2;scene.add(ground);
const grid=new T.GridHelper(P.terrainExtentM,P.terrainExtentM/P.gridSpacingM,0x627e5c,0x6f8063);scene.add(grid);
const routePoints=[];for(let t=0;t<run.durationS;t+=P.routeSampleStepS)routePoints.push(new T.Vector3(...run.sample(t).leaderM));routePoints.push(new T.Vector3(...run.sample(run.durationS).leaderM));
const routeLine=new T.Line(new T.BufferGeometry().setFromPoints(routePoints),new T.LineBasicMaterial({color:0xd3b775}));scene.add(routeLine);
const planeSelect=document.getElementById('plane'),view=document.getElementById('view'),slider=document.getElementById('timeline'),metrics=document.getElementById('metrics');
D.roster.forEach((r,i)=>{const option=document.createElement('option');option.value=i;option.textContent=r.name+' · '+r.box;planeSelect.add(option);});
function row(key,value,label,source){const tr=document.createElement('tr');for(const text of [key,value,label,source]){const td=document.createElement('td');td.textContent=text;tr.appendChild(td);}document.getElementById('rows').appendChild(tr);}
Object.entries(D.values).forEach(([k,p])=>row(k,p.value+' '+p.unit,p.label,p.source));D.roster.forEach(r=>row(r.name+' slot XYZ',r.offsetM.join(', ')+' m',r.label,r.source));
document.getElementById('parameters').onclick=()=>document.getElementById('data').style.display='block';document.getElementById('close').onclick=()=>document.getElementById('data').style.display='none';
let time=0,playing=true,last=performance.now(),frameCount=0,intervals=[],lastState=null;
document.getElementById('play').onclick=function(){playing=!playing;this.textContent=playing?'Pause':'Play';};document.getElementById('restart').onclick=()=>{time=0;playing=true;document.getElementById('play').textContent='Pause';};slider.oninput=()=>{time=Number(slider.value)*run.durationS;};
const transform=new T.Object3D(),base=new T.Object3D(),world=new T.Vector3(),q=new T.Quaternion(),spin=new T.Quaternion();
function render(){const now=performance.now(),dt=Math.min(.1,(now-last)/1000);if(frameCount>0){intervals.push(now-last);if(intervals.length>120)intervals.shift();}last=now;if(playing)time=Math.min(run.durationS,time+dt);if(time>=run.durationS)playing=false;
 const state=run.sample(time);lastState=state;
 // Origin rebasing retains metre dimensions and avoids large GPU coordinates.
 state.aircraft.forEach((a,i)=>{base.position.fromArray(a.positionM).sub(new T.Vector3(...state.leaderM));KasselFlightAttitude.apply(T,base,new T.Vector3(...a.velocityMps),a.bankRad);
  for(const part of parts){transform.position.copy(part.offset).applyQuaternion(base.quaternion).add(base.position);q.copy(part.rotation);if(part.propeller){spin.setFromAxisAngle(new T.Vector3(1,0,0),time*P.propellerRateRadS);q.premultiply(spin);}transform.quaternion.copy(base.quaternion).multiply(q);transform.scale.setScalar(view.value==='cockpit'&&i===Number(planeSelect.value)?0:1);transform.updateMatrix();part.mesh.setMatrixAt(i,transform.matrix);}
 });parts.forEach(p=>p.mesh.instanceMatrix.needsUpdate=true);
 const chosen=state.aircraft[Number(planeSelect.value)],position=new T.Vector3(...chosen.positionM).sub(new T.Vector3(...state.leaderM)),forward=new T.Vector3(...chosen.velocityMps).normalize();
 camera.up.set(0,1,0);interior.visible=view.value==='cockpit';
 if(view.value==='box'){camera.position.set(P.boxCameraXM,P.boxCameraYM,P.boxCameraZM);camera.lookAt(P.boxLookXM,0,P.boxLookZM);}
 else if(view.value==='chase'){camera.position.copy(position).addScaledVector(forward,-P.cameraFollowDistanceM);camera.position.y+=P.cameraFollowHeightM;camera.lookAt(position);}
 else{KasselFlightAttitude.apply(T,interior,new T.Vector3(...chosen.velocityMps),chosen.bankRad);interior.position.copy(position).add(new T.Vector3(P.lengthM*P.cockpitForeFraction,P.cockpitHeightM,0).applyQuaternion(interior.quaternion));camera.position.copy(interior.position);camera.up.set(0,1,0).applyQuaternion(interior.quaternion);camera.lookAt(camera.position.clone().addScaledVector(forward,P.cameraFollowDistanceM));}
 ground.position.y=-state.leaderM[1];grid.position.set(-state.leaderM[0],-state.leaderM[1],-state.leaderM[2]);routeLine.position.fromArray(state.leaderM).multiplyScalar(-1);renderer.render(scene,camera);frameCount++;slider.value=time/run.durationS;
 if(frameCount%15===0)metrics.textContent=chosen.name+' · '+chosen.speedMps.toFixed(1)+' m/s · bank '+(chosen.bankRad*180/Math.PI).toFixed(1)+'° · '+(1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length)).toFixed(1)+' fps';
 requestAnimationFrame(render);
}
renderer.domElement.addEventListener('click',event=>{const ray=new T.Raycaster(),pointer=new T.Vector2(event.clientX/innerWidth*2-1,-event.clientY/innerHeight*2+1);ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects(parts.map(p=>p.mesh));if(hits.length)planeSelect.value=hits[0].instanceId;});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
window.KasselTurnBenchmark={get frames(){return frameCount;},get intervals(){return intervals.slice();},get state(){return lastState;},get timeS(){return time;},get aircraftCount(){return D.roster.length;},get drawCalls(){return renderer.info.render.calls;},get triangles(){return renderer.info.render.triangles;},seek(t){time=t;},get durationS(){return run.durationS;}};
// Precompile the placeholder's materials before interaction. Otherwise
// first cockpit entry compiles a new line/plane program mid-flight.
interior.visible=true;renderer.compile(scene,camera);interior.visible=false;
render();
})();
