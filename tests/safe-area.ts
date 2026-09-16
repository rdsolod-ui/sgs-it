import {chromium,webkit,type Page} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const url=process.env.SAFE_AREA_URL||'http://127.0.0.1:5188/sgs-it/';
const engine=process.env.SAFE_AREA_ENGINE||'chromium';
const browser=engine==='webkit'?await webkit.launch():await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--enable-unsafe-swiftshader']});
const checks:string[]=[],errors:string[]=[];
const scenarios=[
 {name:'island-portrait',width:390,height:844,top:59,right:0,bottom:34,left:0},
 {name:'island-landscape',width:844,height:390,top:0,right:59,bottom:21,left:59},
 {name:'notch-portrait',width:375,height:812,top:44,right:0,bottom:34,left:0},
 {name:'small-phone',width:320,height:568,top:0,right:0,bottom:0,left:0},
 {name:'android',width:360,height:740,top:0,right:0,bottom:24,left:0},
 {name:'tablet',width:768,height:1024,top:24,right:0,bottom:20,left:0},
];
await mkdir('docs/research/safe-area',{recursive:true});
async function within(page:Page,selector:string,s:typeof scenarios[number]){
 for(const box of await page.locator(selector).evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return {name:e.className,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};}))){
  assert.ok(box.x>=s.left-.5&&box.right<=s.width-s.right+.5&&box.y>=s.top-.5&&box.bottom<=s.height-s.bottom+.5,`${s.name} ${selector}: ${JSON.stringify(box)}`);
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No document horizontal overflow');
}
try{
 for(const theme of ['light','dark'])for(const s of scenarios){
  const context=await browser.newContext({viewport:{width:s.width,height:s.height},reducedMotion:'reduce',colorScheme:theme as 'light'|'dark'});
  await context.addInitScript(({theme})=>localStorage.setItem('sgs-theme',theme),{theme});
  // Deterministic local UI fixtures. No visitor text or contacts reach a live API.
  await context.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   const data=path.endsWith('/config')?{mode:'demo',canCollect:false,limits:{input:700},documents:{cookies:'Только необходимые cookie.',privacy:'Проверка размещения документа.'}}:path.endsWith('/session')?{messages:[]}:path.endsWith('/chat')?{text:'CRM, продажи и операции в общей картине. '.repeat(20),demo:'overview'}:{};
   await route.fulfill({json:data});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.addStyleTag({content:`:root{--safe-top:${s.top}px;--safe-right:${s.right}px;--safe-bottom:${s.bottom}px;--safe-left:${s.left}px}`});
  await page.locator('.intro-sequence[open]').waitFor();
  await within(page,'.intro-header,.intro-footer,.intro-enter',s);
  assert.ok(await page.locator('.intro-sequence').evaluate(e=>e.scrollHeight<=e.clientHeight+1),`${s.name}: story fits`);
  assert.equal(await page.locator('.intro-sequence').evaluate(e=>getComputedStyle(e).backgroundColor),theme==='dark'?'rgb(17, 23, 30)':'rgb(236, 236, 232)');
  if(s.name.startsWith('island'))await page.screenshot({path:`docs/research/safe-area/${engine}-${theme}-${s.name}-intro.png`});
  await page.getByRole('button',{name:'Пропустить вступление',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.activeElement?.tagName==='TEXTAREA'),false,'No automatic keyboard after intro');
  await within(page,'.site-header,.composer,.site-footer,.cookie-note',s);
  const noOverlap=await page.evaluate(()=>{const a=document.querySelector('.composer')!.getBoundingClientRect(),b=document.querySelector('.cookie-note')!.getBoundingClientRect();return b.top>=a.bottom;});assert.ok(noOverlap,'Cookie notice does not cover composer');
  assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'),theme==='dark'?'#11171e':'#ecece8');
  if(s.width<=700)assert.ok(await page.locator('.composer textarea').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16),'No iOS focus zoom');
  if(s.name==='island-portrait'){
   await page.locator('.core-canvas[data-loaded=true]').waitFor({timeout:45000});
   await page.screenshot({path:`docs/research/safe-area/${engine}-${theme}-home.png`});
  }
  await page.getByRole('button',{name:'Принять только необходимые cookie'}).click();
  await page.getByRole('button',{name:'Возможности parkops',exact:true}).click();
  await within(page,'.modal,.modal-header',s);
  await page.getByRole('button',{name:'Закрыть',exact:true}).click();
  await page.getByRole('textbox',{name:'Сообщение Синку'}).fill('Покажи возможности parkops');
  await page.getByRole('button',{name:'Отправить сообщение',exact:true}).click();
  await page.locator('.message.assistant').waitFor();
  await within(page,'.site-header,.composer,.site-footer,.chat-history',s);
  await page.getByRole('button',{name:theme==='light'?'Включить тёмную тему':'Включить светлую тему'}).click();
  assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'),theme==='light'?'#11171e':'#ecece8');
  assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),theme==='light'?'rgb(17, 23, 30)':'rgb(236, 236, 232)');
  checks.push(`${engine}: ${theme} ${s.name}: intro, chat, cookie, modal, theme`);
  if(s.name==='island-portrait'){
   await page.setViewportSize({width:844,height:390});
   await page.addStyleTag({content:':root{--safe-top:0px;--safe-left:59px;--safe-right:59px;--safe-bottom:21px}'});
   await page.waitForFunction(()=>document.documentElement.dataset.compactViewport==='true');
   await within(page,'.site-header,.composer,.site-footer,.chat-history',scenarios[1]);
  }
  await context.close();
 }
 // Emulate the VisualViewport API geometry, including Safari panning a focused
 // field. This tests our integration; it is not a physical keyboard/device test.
 for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await context.addInitScript(theme=>{
   localStorage.setItem('sgs-theme',theme);localStorage.setItem('sgs-cookies','essential-only');
   const viewport=new EventTarget();Object.assign(viewport,{height:844,offsetTop:0,scale:1});
   Object.defineProperty(window,'visualViewport',{value:viewport,configurable:true});
  },theme);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.addStyleTag({content:':root{--safe-top:59px;--safe-bottom:34px}'});
  await page.getByRole('button',{name:'Пропустить вступление',exact:true}).click();
  await page.locator('.composer textarea').focus();
  const viewport=async(height:number,offsetTop:number,scale=1)=>page.evaluate(({height,offsetTop,scale})=>{Object.assign(window.visualViewport!,{height,offsetTop,scale});window.visualViewport!.dispatchEvent(new Event('resize'));window.visualViewport!.dispatchEvent(new Event('scroll'));},{height,offsetTop,scale});
  await viewport(390,40);
  await page.waitForFunction(()=>document.documentElement.dataset.keyboard==='true');
  await within(page,'.site-header,.composer',{...scenarios[0],height:430,top:99,bottom:0});
  assert.equal(await page.locator('.site-footer').isVisible(),false);
  await page.screenshot({path:`docs/research/safe-area/${engine}-${theme}-keyboard.png`});
  await page.getByRole('button',{name:'Возможности parkops',exact:true}).click();
  await within(page,'.modal,.modal-header',{...scenarios[0],height:430,top:99,bottom:34});
  await page.getByRole('button',{name:'Закрыть',exact:true}).click();
  await viewport(844,0);await page.waitForFunction(()=>document.documentElement.style.getPropertyValue('--app-height')==='844px');
  await within(page,'.site-header,.composer,.site-footer',scenarios[0]);
  await viewport(422,50,2);await page.waitForTimeout(100);
  assert.equal(await page.locator('html').evaluate(e=>e.style.getPropertyValue('--app-height')),'844px','Pinch zoom does not collapse the layout');
  checks.push(`${engine}: ${theme} visual viewport keyboard, pan, dismissal, pinch zoom`);
  await context.close();
 }
 for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width:390,height:844},colorScheme:theme as 'light'|'dark'});
  await context.addInitScript(theme=>localStorage.setItem('sgs-theme',theme),theme);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('offline.html',url).href,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'),theme==='dark'?'#11171e':'#ecece8');
  assert.match(await page.locator('meta[name=viewport]').getAttribute('content')||'',/viewport-fit=cover/);
  await within(page,'main',{...scenarios[0],top:0,bottom:0});
  checks.push(`${engine}: ${theme} offline theme and layout`);
  await context.close();
 }
 assert.deepEqual(errors,[]);
 await writeFile(`docs/research/safe-area/${engine}-results.json`,JSON.stringify({url,checks,errors,coverage:'Synthetic safe-area and keyboard geometry; physical iOS/Android and standalone mode not tested'},null,2));
 console.log(JSON.stringify({passed:checks.length,engine,checks}));
}finally{await browser.close();}
