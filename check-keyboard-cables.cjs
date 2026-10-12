const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://cdn.jsdelivr.net/npm/three@0.163.0/**',route=>{
   const relative=new URL(route.request().url()).pathname.split('/three@0.163.0/')[1];
   return route.fulfill({path:path.join(process.env.THREE_MODULE_PATH,relative),contentType:'text/javascript',headers:{'access-control-allow-origin':'*'}});
 });
 await page.route('http://127.0.0.1:8080/',async route=>{
   const response=await route.fetch();let html=await response.text();
   const hook=`window.__desktopPoint=(x,y)=>{
     const bounds=new THREE.Box3().setFromObject(windowsScreen),size=bounds.getSize(new THREE.Vector3()),rect=canvas.getBoundingClientRect();
     const point=new THREE.Vector3(bounds.min.x+size.x*x/1024,bounds.max.y-size.y*y/576,bounds.max.z).project(camera);
     return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2};
   };window.__startDebug=(x,y)=>{pointerPosition({clientX:x,clientY:y});const hit=raycaster.intersectObject(windowsScreen,false)[0];return {bootStage,startOpen,monitorView,uv:hit?.uv?.toArray(),target:document.elementFromPoint(x,y)?.id}};window.__monitorTest=async()=>{
     await start();if(!running||!deskBounds)throw new Error('Workspace failed to load');
     for(const spec of presets[selected].parts){const root=await loadModel(spec);pc.add(root)}
     step=presets[selected].parts.length;movePCBesideDesk();
     for(const spec of peripherals.filter(spec=>['monitor','mouse'].includes(spec.key))){
       const root=await loadModel(spec);placePeripheral(root,spec);desktopDevices[spec.key]=root;
       if(spec.key==='monitor'){monitor=root;createWindowsScreen(root)}
     }
     step=parts().findIndex(spec=>spec.key==='keyboard');await spawnPart();
     const center=new THREE.Box3().setFromObject(activePart).getCenter(new THREE.Vector3()),target=center.clone().add(activePart.userData.target.clone().sub(activePart.position)),rect=canvas.getBoundingClientRect();
     const toPointer=point=>{const projected=point.project(camera);return {x:rect.left+(projected.x+1)*rect.width/2,y:rect.top+(1-projected.y)*rect.height/2}};
     window.__cableRoutes=()=>({deskBack:deskBounds.min.z,monitorBack:new THREE.Box3().setFromObject(monitor.getObjectByName('Cube001_Material005_0')).min.z,points:connections.map(connection=>connection.curve.points.map(point=>point.toArray()))});
     window.__rearCableView=()=>{guide(null);const bounds=new THREE.Box3().setFromObject(layer),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());controls.target.copy(center);camera.position.set(center.x-size.x*.3,deskBounds.max.y+caseHeight*.65,bounds.min.z-Math.max(size.x,size.y)*1.25);camera.lookAt(center);controls.update()};
     window.__cableFlow=()=>connections.map(connection=>({offset:connection.flowTexture.offset.x,pulse:connection.pulse.position.toArray(),radius:caseHeight*.009}));
     window.__cableStatus=()=>({count:connections.length,step,active:!!activePart});
     return {before:connections.length,start:toPointer(center),target:toPointer(target)};
   };`;
   const i=html.lastIndexOf('</script>');html=html.slice(0,i)+hook+html.slice(i);
   await route.fulfill({response,body:html});
 });
 await page.goto('http://127.0.0.1:8080/');await page.waitForFunction(()=>typeof window.__monitorTest==='function');
 const state=await page.evaluate(()=>window.__monitorTest());assert.equal(state.before,0,'No cables before keyboard installation');console.log('Keyboard drag points:',JSON.stringify(state));
 await page.mouse.move(state.start.x,state.start.y);await page.mouse.down();await page.mouse.move(state.target.x,state.target.y,{steps:20});await page.mouse.up();
 await page.waitForFunction(()=>window.__cableStatus().count===3,{},{timeout:10000});
 const status=await page.evaluate(()=>window.__cableStatus());assert.equal(status.step,11);assert.equal(status.active,false);assert.deepEqual(errors,[]);
 const flowBefore=await page.evaluate(()=>window.__cableFlow());await page.evaluate(async()=>{const start=performance.now();while(performance.now()-start<160)await new Promise(requestAnimationFrame)});
 const flowAfter=await page.evaluate(()=>window.__cableFlow());assert(flowAfter[0].offset<flowBefore[0].offset,'Light bands flow from PC toward devices');assert.notDeepEqual(flowAfter[0].pulse,flowBefore[0].pulse);
 const screenshot=path.join(process.env.TEMP,'akbar-desktop-preview/keyboard-cables.png');await page.screenshot({path:screenshot});
 const routes=await page.evaluate(()=>window.__cableRoutes());for(const points of routes.points){assert(points[1][2]<routes.deskBack);assert(points[2][2]<routes.deskBack);}assert(Math.abs(routes.points[0][4][2]-routes.monitorBack)<1e-6);
 await page.evaluate(async()=>{window.__rearCableView();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))});await page.screenshot({path:screenshot.replace('.png','-rear.png')});
 console.log('Actual keyboard pointer drag created 3 cables before flashdrive installation. Screenshot:',screenshot);
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
