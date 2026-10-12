const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const html = fs.readFileSync('src/index.html', 'utf8');
const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
new vm.Script(fs.readFileSync('src/word.js','utf8'));
require('./check-calculator.cjs');
new vm.Script(script.replace(/^\s*import .*;$/gm, ''));
const resizeCode=script.slice(script.indexOf('    function resize(){'),script.indexOf('    new ResizeObserver'));
const resizeContext={canvas:{width:0,height:0,parentElement:{getBoundingClientRect:()=>({width:0,height:0})}},window:{devicePixelRatio:2},renderLimit:2048,renderReady:false,monitorView:false,gl:{drawingBufferWidth:1,drawingBufferHeight:1},camera:{updateProjectionMatrix(){}},renderer:{setPixelRatio(){},setSize(w,h){assert(w>0&&h>0&&w<=2048&&h<=2048);resizeContext.canvas.width=w;resizeContext.canvas.height=h}}};
vm.createContext(resizeContext);vm.runInContext(resizeCode,resizeContext);
for(const [width,height] of [[0,0],[0,600],[800,600],[100000,100000],[390,450],[NaN,600]]){
  resizeContext.canvas.parentElement.getBoundingClientRect=()=>({width,height});
  vm.runInContext('resize()',resizeContext);
  assert.equal(resizeContext.renderReady,Number.isFinite(width)&&width>=1&&height>=1);
}
console.log('Canvas sizing: hidden, desktop, mobile, oversized and invalid dimensions OK.');
const presets=JSON.parse(script.match(/const presets=(\[.*\]);/)[1]);
assert.deepEqual(presets.map(p=>p.name),['Mudah']);
assert.deepEqual(presets.map(p=>p.parts.length),[8]);
assert.equal((html.match(/name="build"/g)||[]).length,1);
assert(!html.includes('<b>Sedang</b>')&&!html.includes('<b>Sulit</b>'));
assert(!presets[0].parts.some(p=>p.key==='gpu'),'Budget has integrated graphics');
for(const preset of presets){
  for(const spec of [preset.case,...preset.parts]){
    assert(spec.scale>0&&Number.isFinite(spec.scale));
    assert.equal(spec.rotation.length,3);
    assert((spec.target||spec.position).every(Number.isFinite));
    assert(fs.existsSync('src/assets/models/'+spec.path+'/scene.gltf'),spec.path);
  }
  const ram=preset.parts.filter(p=>p.key.startsWith('memory'));
  assert.equal(ram.length,2);assert.notDeepEqual(ram[0].target,ram[1].target);
  const cpu=preset.parts.find(p=>p.key==='cpu');
  const board=preset.parts.find(p=>p.key==='motherboard');
  assert(cpu.scale<board.scale,'CPU uses its own export scale');
}
console.log('Assembly calibration: distinct DIMM slots, per-asset scale and depth, budget without GPU OK.');
const deskPlacement=script.slice(script.indexOf('    function placeDesk('),script.indexOf('    function frameAssembly('));
class Vector3 {
  constructor(x=0,y=0,z=0){this.set(x,y,z)}
  set(x,y,z){Object.assign(this,{x,y,z});return this}
  copy(point){return this.set(point.x,point.y,point.z)}
}
class Box3 {
  constructor(min,max){Object.assign(this,{min,max})}
  setFromObject(object){
    const point=bound=>new Vector3(...['x','y','z'].map(axis=>bound[axis]*object.scale.value+object.position[axis]));
    this.min=point(object.bounds.min);this.max=point(object.bounds.max);return this;
  }
  getSize(target){return target.set(this.max.x-this.min.x,this.max.y-this.min.y,this.max.z-this.min.z)}
  getCenter(target){return target.set((this.max.x+this.min.x)/2,(this.max.y+this.min.y)/2,(this.max.z+this.min.z)/2)}
}
for(const height of [3,5,8]){
  const caseBounds=new Box3(new Vector3(-2,-1,-1),new Vector3(2,height-1,2));
  const desk={bounds:new Box3(new Vector3(-3,0,-1.5),new Vector3(3,2.72,1.5)),position:new Vector3(),scale:{value:1,multiplyScalar(value){this.value*=value}},updateMatrixWorld(){}};
  const context={THREE:{Box3,Vector3},caseBounds,caseHeight:height,desk};
  vm.runInNewContext(deskPlacement+'placeDesk(desk)',context);
  const bounds=new Box3().setFromObject(desk);
  assert(Math.abs(bounds.max.y-caseBounds.min.y)<1e-10,'Case rests on the tabletop');
  for(const axis of ['x','z'])assert(bounds.min[axis]<=caseBounds.min[axis]&&bounds.max[axis]>=caseBounds.max[axis],'Table supports the case footprint');
  assert(bounds.min.x<=caseBounds.min.x-height*.8,'Room on the left for assembly');
}
assert(fs.existsSync('src/assets/models/meja_komputer/scene.gltf'));
console.log('Desk placement: tabletop contact, case footprint and assembly space OK.');
const peripherals=vm.runInNewContext(script.match(/const peripherals=(\[[\s\S]*?\]);/)[1]);
assert.deepEqual(Array.from(peripherals,p=>p.key),['monitor','mouse','keyboard','flashdrive']);
const peripheralPlacement=script.slice(script.indexOf('    function placePeripheral('),script.indexOf('    function movePCBesideDesk('));
const deskBounds=new Box3(new Vector3(-6,-4,-3),new Vector3(6,-1,3));
for(const spec of peripherals.filter(spec=>spec.desktop)){
  assert(fs.existsSync('src/assets/models/'+spec.path+'/scene.gltf'));
  const root={bounds:new Box3(new Vector3(2,-2,-1),new Vector3(6,1,1)),position:new Vector3(),scale:{value:1,multiplyScalar(value){this.value*=value}},updateMatrixWorld(){}};
  vm.runInNewContext(peripheralPlacement+'placePeripheral(root,spec)',{THREE:{Box3,Vector3},deskBounds,root,spec});
  const bounds=new Box3().setFromObject(root);
  assert(Math.abs(bounds.min.y-deskBounds.max.y)<1e-10,'Peripheral rests on the tabletop');
  for(const axis of ['x','z'])assert(bounds.min[axis]>=deskBounds.min[axis]&&bounds.max[axis]<=deskBounds.max[axis],'Peripheral fits on the desk');
}
const caseBounds=new Box3(new Vector3(-2,-1,-1),new Vector3(2,4,2));
const pc={bounds:caseBounds,position:new Vector3(),scale:{value:1},updateMatrixWorld(){}};
const moveCode=script.slice(script.indexOf('    function movePCBesideDesk('),script.indexOf('    function frameAssembly('));
vm.runInNewContext(moveCode+'movePCBesideDesk()',{THREE:{Box3,Vector3},deskBounds,caseBounds,caseHeight:5,pc,frameAssembly(){}});
const moved=new Box3().setFromObject(pc);
assert(moved.min.x>deskBounds.max.x,'PC is beside the desk');
assert.equal(moved.min.y,deskBounds.min.y,'PC rests at the desk floor level');
const elements={};
const context={presets,peripherals,selected:0,step:8,running:true,loading:false,activePart:null,windowsProgress:null,bootStage:'off',flashInserted:true,labels:{monitor:'Monitor',mouse:'Mouse',keyboard:'Keyboard',flashdrive:'Flashdrive (USB)'},$:key=>elements[key]||(elements[key]={style:{}})};
const flowCode=script.slice(script.indexOf('    function parts(){'),script.indexOf('    const labels='))+script.slice(script.indexOf('    function update(){'),script.indexOf('    async function loadModel('));
vm.createContext(context);
for(const [step,label] of [[8,'Monitor'],[9,'Mouse'],[10,'Keyboard'],[11,'Flashdrive (USB)'],[12,'Setup PC selesai']]){
  context.step=step;vm.runInContext(flowCode+'update()',context);
  assert.equal(elements['#current'].textContent,label);
  assert.equal(elements['#total'].textContent,12);
  assert.equal(elements['#inspect'].hidden,step<12);
  assert.equal(elements['#next'].hidden,step===12);
}
console.log('Desktop setup: peripheral placement, PC relocation and all 12 steps OK.');
const focusCode=script.slice(script.indexOf('    function focusMonitor(){'),script.indexOf('    function installWindows(){'));
for(const aspect of [.6,1.6,2.4]){
  const display={bounds:new Box3(new Vector3(-3,1,-.02),new Vector3(3,4,0)),position:new Vector3(),scale:{value:1}};
  const camera={aspect,fov:42,position:new Vector3(),lookAt(){}},controls={target:new Vector3(),update(){}};
  const focusContext={THREE:{Box3,Vector3,MathUtils:{degToRad:degrees=>degrees*Math.PI/180}},monitor:{getObjectByName:name=>{assert.equal(name,'Cube001_Material004_0');return display}},windowsScreen:{},camera,controls};
  vm.runInNewContext(focusCode+'focusMonitor()',focusContext);
  assert.equal(camera.position.x,0);assert.equal(camera.position.y,2.5);assert(camera.position.z>0);
  assert.equal(controls.enabled,false);assert.equal(focusContext.monitorView,true);
  assert(2*camera.position.z*Math.tan(42*Math.PI/360)>=3,'Monitor fits vertically');
  assert(2*camera.position.z*Math.tan(42*Math.PI/360)*aspect>=6,'Monitor fits horizontally');
}
let tick,bootExpiry,draws=0,cleared=0,focuses=0;
const installElements={};
const installContext={performance:{now:()=>1000},step:11,parts:()=>Array(12),windowsProgress:null,bootStage:'off',firstBoot:'ssd',bootSaved:false,flashInserted:true,bootTimer:null,focusMonitor(){focuses++},guide(){},drawWindowsScreen(){draws++},update(){},hint(){},$:key=>installElements[key]||(installElements[key]={}),setTimeout(callback){bootExpiry=callback;return 1},clearTimeout(){},setInterval(callback){tick=callback;return 1},clearInterval(){cleared++}};
vm.createContext(installContext);
const installCode=script.slice(script.indexOf('    function powerPC(){'),script.indexOf('    async function start(){'));
vm.runInContext(installCode+'installWindows()',installContext);assert.equal(draws,0,'Cannot install before setup completes');
installContext.step=12;vm.runInContext('installWindows()',installContext);assert.equal(installContext.windowsProgress,null,'Cannot bypass BIOS');
vm.runInContext('powerPC()',installContext);assert.equal(installContext.bootStage,'post');
vm.runInContext("handleBiosKey('F10')",installContext);assert.equal(installContext.bootStage,'post');
vm.runInContext("handleBiosKey('F2');openBootMenu()",installContext);assert.equal(installContext.bootStage,'boot');
vm.runInContext("handleBiosKey('F10');confirmBiosSave(false)",installContext);assert.equal(installContext.bootStage,'boot');assert.equal(installContext.windowsProgress,null);
vm.runInContext("handleBiosKey('F10');confirmBiosSave(true)",installContext);assert.equal(installContext.bootStage,'noos');assert.equal(installContext.windowsProgress,null,'SSD cannot boot Windows installer');
vm.runInContext("powerPC();handleBiosKey('Delete');openBootMenu()",installContext);
installContext.firstBoot='usb';vm.runInContext("handleBiosKey('F10');confirmBiosSave(true)",installContext);
assert.equal(installContext.bootStage,'windows');assert.equal(installContext.windowsProgress,0);
const started=focuses;vm.runInContext('installWindows()',installContext);assert.equal(focuses,started,'No duplicate loading');
for(let i=0;i<10;i++)tick();
assert.equal(installContext.windowsProgress,100);assert.equal(cleared,1);assert.equal(installElements['#current'].textContent,'Memulai Windows');
context.step=12;context.bootStage='windows';context.windowsProgress=0;vm.runInContext('update()',context);assert.equal(elements['#install'].hidden,true);
for(const key of ['F2','Delete','Escape']){
  installContext.bootStage='off';vm.runInContext('powerPC()',installContext);
  vm.runInContext('handleBiosKey('+JSON.stringify(key)+')',installContext);bootExpiry();
  assert.equal(installContext.bootStage,'bios','Each BIOS key enters setup and cancels missed boot');
}
installContext.bootStage='off';vm.runInContext('powerPC()',installContext);bootExpiry();assert.equal(installContext.bootStage,'noos','Missing the BIOS window requires restarting');
installContext.bootStage='shutdown';vm.runInContext('powerPC()',installContext);assert.equal(installContext.bootStage,'windows-logo','Power restarts the installed desktop after shutdown');
console.log('BIOS flow: entry keys, Boot menu, SSD failure, No cancellation, USB Save and Exit OK.');
const monitorAsset=JSON.parse(fs.readFileSync('src/assets/models/monitor/scene.gltf','utf8'));
assert(monitorAsset.nodes.some(node=>node.name.replace(/[.]/g,'')==='Cube001_Material004_0'),'Screen lookup matches the name sanitized by GLTFLoader');
assert(/else if\(step===parts\(\)\.length\)\{\s*guide\(null\);focusMonitor\(\);/.test(script),'Final placement automatically focuses the monitor');
console.log('Windows stage: responsive monitor focus, installation guard and completion OK.');
const screenCode=script.slice(script.indexOf('    function createWindowsScreen('),script.indexOf('    function drawWindowsScreen('));
const screenGeometry={boundingBox:{min:{x:-2,z:3},max:{x:2,z:7}},attributes:{position:{count:4,getX:i=>[-2,2,-2,2][i],getZ:i=>[3,3,7,7][i]}},computeBoundingBox(){},setAttribute(name,value){this.attributes[name]=value}};
const display={geometry:screenGeometry,material:{map:'original asset',emissiveMap:'original asset'}};
let drawn=0;
const screenContext={THREE:{BufferAttribute:class{constructor(array,itemSize){Object.assign(this,{array,itemSize})}},CanvasTexture:class{constructor(image){this.image=image}},MeshBasicMaterial:class{constructor(options){Object.assign(this,options)}},SRGBColorSpace:'srgb',DoubleSide:2},document:{createElement:tag=>{assert.equal(tag,'canvas');return {}}},root:{getObjectByName:()=>display},drawWindowsScreen(){drawn++}};
vm.runInNewContext(screenCode+'createWindowsScreen(root)',screenContext);
assert.deepEqual(Array.from(screenGeometry.attributes.uv.array),[0,0,1,0,0,1,1,1]);
assert.equal(display.material.map.image.width,1024);assert.equal(display.material.map.image.height,576);
assert.equal(display.material.emissiveMap,undefined,'Original asset texture is replaced');
assert.equal(screenContext.windowsScreen,display);assert.equal(drawn,1,'Installation screen is drawn immediately');
assert(/if\(spec.key==='monitor'\)createWindowsScreen\(activePart\)/.test(script),'Custom screen is applied when the monitor loads');
assert(!script.includes('new THREE.PlaneGeometry'),'Installation uses the actual monitor screen');
console.log('Monitor screen: custom canvas material and full-screen UV mapping OK.');
const renderedText=[],drawContext={fillRect(){},fillText(text){renderedText.push(text)}};
const renderContext={performance:{now:()=>0},bootStage:'boot',firstBoot:'usb',windowsProgress:null,windowsScreen:{material:{map:{image:{width:1024,height:576,getContext:()=>drawContext}}}}};
const drawCode=script.slice(script.indexOf('    function drawWindowsScreen('),script.indexOf('    function focusMonitor('));
vm.runInNewContext(drawCode+'drawWindowsScreen()',renderContext);
assert(renderedText.includes('Boot Priority / Boot Order'));assert(renderedText.includes('First Boot: USB / Removable Device'));
assert(!renderedText.some(text=>text.includes('Memuat Windows')),'BIOS screen does not start Windows loading');
const usbCode=script.slice(script.indexOf('    function placeFlashdrive('),script.indexOf('    function movePCBesideDesk('));
const flashdrive={bounds:new Box3(new Vector3(-1,2,-.2),new Vector3(1,10,.2)),position:new Vector3(),scale:{value:1,multiplyScalar(value){this.value*=value}},updateMatrixWorld(){}};
vm.runInNewContext(usbCode+'placeFlashdrive(root)',{THREE:{Box3,Vector3},root:flashdrive,caseBounds,caseHeight:5});
const usbBounds=new Box3().setFromObject(flashdrive);
assert(Math.abs(usbBounds.min.y-(caseBounds.max.y-5*.025))<1e-10,'Connector is inserted slightly into the top of the PC');
assert(usbBounds.max.y>caseBounds.max.y,'Flashdrive remains visible above the PC');
assert(usbBounds.min.x>=caseBounds.min.x&&usbBounds.max.x<=caseBounds.max.x);
assert(fs.existsSync('src/assets/models/flashdrive/scene.gltf'));
installContext.bootStage='off';installContext.flashInserted=false;installContext.windowsProgress=null;
vm.runInContext('powerPC()',installContext);assert.equal(installContext.bootStage,'off','Power is blocked until flashdrive is inserted');
context.bootStage='off';context.flashInserted=false;vm.runInContext('update()',context);assert.equal(elements['#install'].hidden,true);
context.flashInserted=true;vm.runInContext('update()',context);assert.equal(elements['#install'].hidden,false);
assert(script.includes("if(installed.key==='flashdrive')flashInserted=true"));
console.log('Flashdrive: PC port placement and mandatory insertion before power OK.');
const startupCode=script.slice(script.indexOf('    function advanceStartup('),script.indexOf('    function drawWindowsScreen('));
const startupElements={},startupContext={bootStage:'windows-logo',startupAt:1000,reducedMotion:false,activeApp:null,startOpen:false,appText:{word:'',note:''},calculatorResult:'0',monitorView:false,focusMonitor(){},update(){},hint(){},drawWindowsScreen(){},$:key=>startupElements[key]||(startupElements[key]={})};
vm.createContext(startupContext);
vm.runInContext(startupCode+'advanceStartup(3399)',startupContext);assert.equal(startupContext.bootStage,'windows-logo');
vm.runInContext('advanceStartup(3400)',startupContext);assert.equal(startupContext.bootStage,'bengkel-logo');
vm.runInContext('advanceStartup(5800)',startupContext);assert.equal(startupContext.bootStage,'desktop');
for(const app of ['word','note','calculator']){vm.runInContext('openDesktopApp('+JSON.stringify(app)+')',startupContext);assert.equal(startupContext.activeApp,app);}
vm.runInContext('openDesktopApp(null)',startupContext);assert.equal(startupContext.activeApp,null);
startupContext.bootStage='windows-logo';startupContext.startupAt=0;startupContext.reducedMotion=true;
vm.runInContext('advanceStartup(600);advanceStartup(1200)',startupContext);assert.equal(startupContext.bootStage,'desktop');
assert(fs.existsSync('src/assets/images/bengkelcoding-logo.png'));
console.log('Startup sequence: Windows, Bengkel Coding, desktop, app launch, calculator and reduced motion OK.');
const positionCode=script.slice(script.indexOf('    function positionApp('),script.indexOf('    function drawWindowsScreen('));
class ProjectedPoint extends Vector3{project(){return this}}
for(const [width,height] of [[700,400],[300,180]]){
  const frames={'#wordApp':{style:{}},'#calculatorApp':{style:{}},'#startMenu':{style:{}}};
  const positionContext={camera:{},startOpen:false,activeApp:'calculator',monitorView:true,windowsScreen:{},THREE:{Vector3:ProjectedPoint,Box3:class{setFromObject(){return {min:{x:-.8,y:-.8},max:{x:.8,y:.8,z:0}}}}},canvas:{getBoundingClientRect:()=>({width,height})},$:id=>frames[id]};
  vm.runInNewContext(positionCode+'positionApp()',positionContext);
  const style=frames['#calculatorApp'].style,scale=Number(style.transform.match(/scale\((.*)\)/)[1]);
  assert.equal(style.width,'280px');assert.equal(style.height,'340px');assert(280*scale<=width*.8*.55);assert(340*scale<=height*.8*.82+1e-9);
  assert(parseFloat(style.left)>width*.1&&parseFloat(style.top)>height*.1,'Desktop is visible around the calculator');
}
console.log('Calculator window: compact dimensions, scaling and desktop margins OK.');
assert(script.includes("if(installed.key==='keyboard')showConnections()"),'Cables appear when keyboard installation succeeds');
const cableCode=script.slice(script.indexOf('    function showConnections('),script.indexOf('    function createWindowsScreen('));
vm.runInNewContext(cableCode+'showConnections()',{connections:[],desktopDevices:{}});
let checked = 0;
function check(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) check(file);
    else if (entry.name.endsWith('.gltf')) {
      const gltf = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const view of gltf.bufferViews || []) {
        assert((view.byteOffset || 0) + view.byteLength <= gltf.buffers[view.buffer].byteLength, `Buffer overflow: ${file}`);
      }
      for (const resource of [...(gltf.buffers || []), ...(gltf.images || [])]) {
        if (!resource.uri || resource.uri.startsWith('data:')) continue;
        const target = path.resolve(dir, decodeURIComponent(resource.uri));
        const bytes = fs.readFileSync(target);
        assert(!bytes.subarray(0, 80).toString().startsWith('version https://git-lfs'), target);
        if (resource.byteLength) assert.equal(bytes.length, resource.byteLength, target);
        checked++;
      }
    }
  }
}
check('src/assets/models');
console.log(`Syntax OK; ${checked} model resource references verified.`);
if (process.argv.includes('--http')) (async () => {
  for (const resource of ['case/nzxt/scene.gltf', 'case/nzxt/scene.bin', 'mobo/asus_prime_h510m/scene.bin', 'mobo/asus_prime_h510m/textures/material_baseColor.png', 'mobo/asus_prime_h510m/textures/.006_baseColor.jpeg', 'mobo/asus_prime_h510m/textures/.008_baseColor.jpeg', 'mobo/asus_prime_h510m/textures/.001_baseColor.jpeg', ]) {
    const response = await fetch('http://127.0.0.1:8080/assets/models/' + resource + '?v=restored-lfs-2');
    assert.equal(response.status, 200, resource);
    const actual = Buffer.from(await response.arrayBuffer());
    assert.deepEqual(actual, fs.readFileSync('src/assets/models/' + resource));
    console.log(`HTTP 200, bytes verified: ${resource}`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
