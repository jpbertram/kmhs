(function(){'use strict';
 var scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.008,120),renderer=new THREE.WebGLRenderer({antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 scene.background=new THREE.Color(0x293c47);document.body.appendChild(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Supplied interior geometry inspection');
 scene.add(new THREE.HemisphereLight(0xdcecf5,0x444637,.9));var sun=new THREE.DirectionalLight(0xffedd9,1.2);sun.position.set(-5,9,8);scene.add(sun);
 var fill=new THREE.DirectionalLight(0xc4d5ee,.65);fill.position.set(5,3,-7);scene.add(fill);
 // Eyes share each modeled cushion/stool's fore-aft position, rather than
 // floating forward of it. Heights and look angles remain explicit estimates.
 var poses={pilot:[[-.5,.58,3.6],[0,-.38,1]],copilot:[[.5,.58,3.6],[0,-.38,1]],nav:[[.1,.12,5.2],[-.55,-.4,0]],bomb:[[0,-.38,5.45],[0,-.4,1]],nose:[[0,.25,6.35],[0,-.08,1]],radio:[[-.25,.24,1.55],[-.45,-.25,-.65]],ttop:[[0,.92,-3.15],[0,0,1]],ball:[[0,-1.43,-5.3],[0,-.78,-.62]],waistL:[[-.43,-.03,-6.9],[-1,-.15,0]],waistR:[[.43,-.03,-6.1],[1,-.15,0]],tail:[[0,-.02,-10.4],[0,-.08,-1]]};
 var target=new THREE.Vector3(0,0,3.6),radius=3.5,theta=.8,phi=1.1,mode='orbit',drag=false,lastX=0,lastY=0,scheduled=false,loaded=false;
 function draw(){scheduled=false;if(mode==='crew'){var pose=poses[document.getElementById('station').value];camera.position.fromArray(pose[0]);camera.lookAt(camera.position.clone().add(new THREE.Vector3().fromArray(pose[1])));}else{camera.position.copy(target).add(new THREE.Vector3(radius*Math.cos(theta)*Math.sin(phi),radius*Math.cos(phi),radius*Math.sin(theta)*Math.sin(phi)));camera.lookAt(target);}renderer.render(scene,camera);}
 function invalidate(){if(!scheduled){scheduled=true;requestAnimationFrame(draw);}}
 function stationChanged(){var key=document.getElementById('station').value;target.fromArray(poses[key][0]);radius=key==='ttop'||key==='ball'||key==='tail'?2.1:2.7;document.getElementById('status').textContent=(loaded?'Supplied interior loaded. ':'Loading. ')+(mode==='crew'?'Estimated eye at ':'Inspecting source geometry around ')+key+'.';invalidate();}
 document.getElementById('station').onchange=stationChanged;
 document.getElementById('crew').onclick=function(){mode='crew';stationChanged();};document.getElementById('orbit').onclick=function(){mode='orbit';stationChanged();};
 renderer.domElement.onpointerdown=function(e){mode='orbit';drag=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);};
 renderer.domElement.onpointermove=function(e){if(!drag)return;theta+=(e.clientX-lastX)*.007;phi=Math.max(.05,Math.min(Math.PI-.05,phi+(e.clientY-lastY)*.007));lastX=e.clientX;lastY=e.clientY;invalidate();};
 renderer.domElement.onpointerup=renderer.domElement.onpointercancel=function(){drag=false;};
 renderer.domElement.addEventListener('wheel',function(e){e.preventDefault();mode='orbit';radius=Math.max(.6,Math.min(25,radius*Math.exp(e.deltaY*.001)));invalidate();},{passive:false});
 window.addEventListener('resize',function(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);invalidate();});
 new THREE.GLTFLoader().load('b24j.glb',function(gltf){
  var source=gltf.scene,interior=source.getObjectByName('interior');if(!interior){document.getElementById('failure').textContent='No named interior branch was found; no substitute is rendered.';return;}
  source.updateMatrixWorld(true);var root=new THREE.Group();root.name='unaltered-source-interior';var count=0;
  interior.traverse(function(o){if(!o.isMesh)return;var geometry=o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);var mesh=new THREE.Mesh(geometry,o.material);mesh.name=o.name;root.add(mesh);count++;});
  scene.add(root);loaded=true;stationChanged();document.getElementById('status').textContent+= ' '+count+' original meshes. Closed source turret/armor parts are deliberately visible in this inspection.';
 },function(e){if(e.lengthComputable)document.getElementById('status').textContent='Loading supplied model: '+Math.round(100*e.loaded/e.total)+'%';},function(error){document.getElementById('failure').textContent='The supplied model failed to load. No placeholder has been inserted.';console.error(error);});
 invalidate();
})();
