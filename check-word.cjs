const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('http://word.test/**',route=>{
      const name=new URL(route.request().url()).pathname.slice(1);
      if(!['word.html','word.css','word.js'].includes(name))return route.abort();
      return route.fulfill({path:path.join(__dirname,'src',name),contentType:name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'text/javascript'});
    });
    let navigations=0;page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++});
    await page.goto('http://word.test/word.html');
    const editor=page.locator('#documentPage');
    await editor.fill('Halo Bengkel Coding Indonesia');
    const selectAll=()=>page.evaluate(()=>{const range=document.createRange();range.selectNodeContents(document.querySelector('#documentPage'));const selection=getSelection();selection.removeAllRanges();selection.addRange(range)});
    for(const command of ['bold','italic','underline']){await selectAll();await page.locator('[data-command="'+command+'"]').click();}
    assert(await editor.locator('b,strong').count());assert(await editor.locator('i,em').count());assert(await editor.locator('u').count());
    await selectAll();await page.locator('#fontFamily').selectOption('Arial');
    assert((await editor.innerHTML()).includes('Arial'));
    assert.equal(await page.locator('#wordCount').innerText(),'4 kata');
    await page.locator('[data-tab="layout"]').click();await page.locator('#orientation').selectOption('landscape');await page.locator('#margins').selectOption('narrow');
    assert(await editor.evaluate(el=>el.classList.contains('landscape')&&el.classList.contains('narrow')));
    await page.locator('#zoom').fill('125');assert.equal(await page.locator('#zoomValue').innerText(),'125%');
    await page.locator('[data-tab="insert"]').click();await page.locator('#insertTable').click();assert.equal(await editor.locator('td').count(),6);
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('bengkelcoding-word-document')));
    assert(stored.html.includes('<table>'));assert.equal(stored.orientation,'landscape');
    const cleaned=await page.evaluate(()=>cleanDocument('<p onclick="alert(1)" style="background-image:url(https://invalid.test);color:red">A<script>alert(1)</script><img src=x onerror="alert(1)"><b>B</b></p>'));
    assert(!/script|onclick|onerror|background-image|<img/.test(cleaned));assert(cleaned.includes('<b>B</b>'));
    await page.locator('[data-tab="file"]').click();
    const downloaded=page.waitForEvent('download');await page.locator('#saveFile').click();assert.equal((await downloaded).suggestedFilename(),'Dokumen-1.html');
    await page.locator('[data-tab="home"]').click();await editor.fill('Dokumen baru');await selectAll();await page.locator('[data-command="bold"]').click();await page.locator('[data-command="undo"]').click();
    assert.equal(await editor.locator('b,strong').count(),0,'Undo removes bold formatting');
    assert.equal(navigations,1,'All Word tests run in one session without reload');assert.deepEqual(errors,[]);
    await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('.titlebar').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
    await page.locator('[data-tab=home]').click();
    await page.setViewportSize({width:700,height:400});
    const compact=await page.evaluate(()=>({header:document.querySelector('.ribbon').getBoundingClientRect().bottom,workspace:document.querySelector('.workspace').clientHeight,ribbonOverflow:document.querySelector('.ribbon').scrollWidth>document.querySelector('.ribbon').clientWidth}));
    assert(compact.header<=130,'Compact navbar fits the monitor');assert(compact.workspace>=240,'Document retains at least 60% of the monitor height');
    const navbar=await page.locator('.word-nav').boundingBox();assert.equal(navbar.width,300);assert.equal(navbar.height,100);
    if(process.env.WORD_SCREENSHOT)await page.screenshot({path:process.env.WORD_SCREENSHOT.replace('.png','-monitor.png')});
    if(process.env.WORD_SCREENSHOT){await page.screenshot({path:process.env.WORD_SCREENSHOT.replace('.png','-mobile.png')});await page.setViewportSize({width:1280,height:900});await page.screenshot({path:process.env.WORD_SCREENSHOT});}
    console.log('Word session: formatting, layout, table, autosave, safe content, download, undo and mobile checked without reload.');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
