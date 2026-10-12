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
     for(const spec of peripherals){
       const root=await loadModel(spec);
       if(spec.key==='monitor'){monitor=root;createWindowsScreen(root)}
       if(spec.usb)placeFlashdrive(root);else placePeripheral(root,spec);
       if(spec.desktop)desktopDevices[spec.key]=root;
       if(spec.key==='keyboard'){showConnections();if(connections.length!==3)throw new Error('Three cables must appear after keyboard placement');}
     }
     step=parts().length;flashInserted=true;bootStage='desktop';windowsProgress=100;guide(null);update();drawWindowsScreen();focusMonitor();openDesktopApp('calculator');hint('Desktop siap. Kalkulator terbuka.');
     return {monitor:monitor.name,screen:windowsScreen.name,cables:connections.length,webgl:!gl.isContextLost()};
   };`;
   const i=html.lastIndexOf('</script>');html=html.slice(0,i)+hook+html.slice(i);
   await route.fulfill({response,body:html});
 });
 await page.goto('http://127.0.0.1:8080/');await page.waitForFunction(()=>typeof window.__monitorTest==='function');
 const state=await page.evaluate(()=>window.__monitorTest());assert(state.webgl);assert.equal(state.cables,3);console.log('Real 3D scene loaded:',JSON.stringify(state));
 const calculator=page.frameLocator('#calculatorApp');await calculator.locator('[data-action="digit"][data-value="2"]').click();await calculator.locator('[data-action="operator"][data-value="+"]').click();await calculator.locator('[data-action="digit"][data-value="3"]').click();await calculator.locator('[data-action="equals"]').click();assert.equal(await calculator.locator('#result').innerText(),'5');
 await page.waitForFunction(()=>document.querySelector('#calculatorApp').getBoundingClientRect().width>0);
 const frame=await page.locator('#calculatorApp').boundingBox();assert(frame.width<=280.01&&frame.height<=340.01);
 const screenshot=process.env.MONITOR_SCREENSHOT||path.join(process.env.TEMP,'akbar-desktop-preview/monitor-3d.png');await page.screenshot({path:screenshot});
 console.log('Calculator position:',JSON.stringify(frame));console.log('Screenshot:',screenshot);assert.deepEqual(errors,[]);
 await page.locator('#inspect').click();await page.locator('#calculatorApp').waitFor({state:'hidden'});await page.screenshot({path:screenshot.replace('.png','-cables.png')});await page.locator('#inspect').click();await page.locator('#calculatorApp').waitFor({state:'visible'});
 await page.locator('#closeApp').click();
 const startPoint=await page.evaluate(()=>window.__desktopPoint(50,550));
 await page.mouse.click(startPoint.x,startPoint.y);await page.locator('#startMenu').waitFor({state:'visible'});
 await page.locator('#startSearch').fill('kalkulator');assert.equal(await page.locator('[data-start-app]:visible').count(),1);
 await page.locator('[data-start-app="calculator"]').click();await page.locator('#startMenu').waitFor({state:'hidden'});await page.locator('#calculatorApp').waitFor({state:'visible'});
 await page.mouse.click(startPoint.x,startPoint.y);await page.locator('#startMenu').waitFor({state:'visible'});
 await page.locator('#startSearch').fill('aplikasi tidak ada');assert(await page.locator('#startEmpty').isVisible());
 await page.keyboard.press('Escape');await page.locator('#startMenu').waitFor({state:'hidden'});
 await page.keyboard.press('Control+Escape');await page.locator('#startMenu').waitFor({state:'visible'});
 await page.locator('[data-start-app="word"]').click();await page.locator('#wordApp').waitFor({state:'visible'});
 await page.mouse.click(startPoint.x,startPoint.y);await page.locator('#startMenu').waitFor({state:'visible'});
 await page.frameLocator('#wordApp').locator('#documentPage').click({position:{x:550,y:100}});await page.locator('#startMenu').waitFor({state:'hidden'});
 await page.mouse.click(startPoint.x,startPoint.y);await page.locator('#startMenu').waitFor({state:'visible'});
 await page.locator('#startPower').click();await page.locator('[data-power="shutdown"]').click();await page.locator('#install').waitFor({state:'visible'});assert(await page.locator('#wordApp').isHidden());
 await page.locator('#install').click();await page.locator('#desktopControls').waitFor({state:'visible'});assert(await page.locator('#install').isHidden());
 await page.locator('#desktopStart').click();await page.locator('#startPower').click();await page.locator('[data-power="restart"]').click();await page.locator('#desktopControls').waitFor({state:'visible'});
 await page.mouse.click(startPoint.x,startPoint.y);await page.locator('#startMenu').waitFor({state:'visible'});
 await page.screenshot({path:screenshot.replace('.png','-start.png')});assert.deepEqual(errors,[]);
 console.log('Actual 3D Start: taskbar hit, search, app launch, Escape, Ctrl+Escape, shutdown and restart OK.');
 console.log('Actual 3D monitor: rendering, compact calculator, button calculation and inspection toggling OK.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
