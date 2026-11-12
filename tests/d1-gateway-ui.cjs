const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const host='faceless-access-prueba.marianitord2020.workers.dev';
const fixture=(ideas)=>({ideas:Array.from({length:ideas},(_,i)=>({
  id:'fixture-'+i,title:'El misterio del pueblo '+i,
  synopsis:'Una historia de misterio que comienza en una casa del pueblo.',
  outline:'Inicio; secreto; pistas; revelación',
  coverPrompt:'Fotografía cinematográfica de una casa misteriosa'
}))});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addCookies([{name:'facs',value:'D1-session-cookie-simulated',domain:host,path:'/',httpOnly:true,secure:true,sameSite:'Lax'}]);
 const page=await context.newPage();
 const errors=[],calls=[];
 page.on('pageerror',error=>errors.push(error.message));
 const types={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.html':'text/html'};
 await page.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url);
  if(u.hostname!==host)return route.abort();
  if(u.pathname.startsWith('/api/')){
   const body=req.postData()||'';
   calls.push({pathname:u.pathname,headers:req.headers(),body});
   if(req.method()!=='POST')return route.fulfill({status:405,body:''});
   if(u.pathname==='/api/ideas')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixture(10))});
   if(u.pathname==='/api/script')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    title:'El misterio del pueblo',mode:'ficcion',provider:'Prueba del gateway D1',
    scenes:Array.from({length:8},(_,i)=>({text:'El pueblo descubre un misterio. Escena '+(i+1)+'.',prompt:'Casa misteriosa '+(i+1)})),
    sources:[]
   })});
   if(u.pathname==='/api/images')return route.fulfill({status:200,contentType:'application/json',body:'{"pending":true,"generationId":"fixture-image-job"}'});
   if(u.pathname==='/api/voice')return route.fulfill({status:200,contentType:'application/json',body:'{"provider":"fixture","dataURI":"data:audio/wav;base64,UklGRg=="}'});
   return route.fulfill({status:200,contentType:'application/json',body:'{}'});
  }
  const p=decodeURIComponent(u.pathname);
  if(p.includes('..'))return route.fulfill({status:400,body:'bad path'});
  const relative=p==='/'?'index.html':p.replace(/^\/+/,'');
  const file=path.resolve(process.cwd(),relative);
  if(!file.startsWith(process.cwd()+path.sep))return route.fulfill({status:403,body:'forbidden'});
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:'not found'});
  return route.fulfill({status:200,contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('https://'+host+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.facelessStudioReady,{timeout:15000});
 assert.equal(await page.evaluate(()=>window.FacelessGateway.enabled),true);
 assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('faceless-d1')),true);
 await page.locator('#home [data-final-category="Relatos"]').click();
 await page.locator('#finalTopic').fill('');
 await page.locator('#finalGenerate').click();
 await page.waitForFunction(()=>document.querySelectorAll('#studioCards .studio-card').length===10,{timeout:15000});
 assert.equal(await page.locator('#finalAccess').isVisible(),false);
 assert.equal(await page.locator('.studio-access').isVisible(),false);
 assert.equal(calls[0].pathname,'/api/ideas');
 const result=await page.evaluate(async()=>{
  const a=await window.FacelessGateway.request('/images',{
   method:'POST',headers:{'content-type':'application/json','x-app-token':'should-never-go-to-browser-gateway'},
   body:JSON.stringify({prompt:'a house at night'})
  });
  const b=await window.FacelessGateway.request('/voice',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({text:'Buenos días',voice:'Celeste'})
  });
  return [a.status,b.status];
 });
 assert.deepEqual(result,[200,200]);
 for(const item of calls){
  assert.ok(item.headers.cookie?.includes('facs='),'Access Worker cookie must accompany '+item.pathname);
  assert.equal(item.headers['x-app-token'],undefined,'Never transmit passcode to D1 gateway from browser');
 }
 const bad=await page.evaluate(async()=>{
  try{await window.FacelessGateway.request('/not-allowed',{method:'POST'})}
  catch(e){return e.message;}
 });
 assert.match(bad,/no está permitida/);
 assert.deepEqual(errors,[],'No browser JavaScript exceptions');
 console.log('PASS D1: cookies, 10 ideas with empty topic, photo and voice routed through /api, no APP_PASSCODE in browser');
 await browser.close();
})().catch(error=>{console.error(error);process.exitCode=1});
