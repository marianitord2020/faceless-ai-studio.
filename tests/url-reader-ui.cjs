const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const original='Esta es una frase del relato original, con puntuación y acentos.\n'.repeat(120);let calls=0;
 await page.route('**/w/api.php?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({query:{search:[{pageid:1,title:'Relato de prueba',snippet:'Un texto publicado de prueba.'}]}})}));
 await page.route('**/read-url',async route=>{
  calls++;const input=route.request().postDataJSON();assert.equal(route.request().headers()['x-app-token'],'fixture-private-app-code');
  if(input.url.includes('slow'))await new Promise(resolve=>setTimeout(resolve,900));
  if(input.url.includes('blocked'))return route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({error:'La página no permite leer el relato.'})});
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({title:'El relato original',author:'Autor original',language:'es',text:original,characters:original.length,sourceURL:input.url})});
 });
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.facelessStudioReady);
 await page.evaluate(()=>{route('discover');window.facelessShowStudioMenu?.();});
 await page.locator('#studioSource').selectOption('local');
 await page.locator('#studioWrittenUrl').fill('https://example.org/story');
 await page.locator('#studioUrlAccess').waitFor({state:'visible'});
 assert.equal(calls,0,'Do not make unauthenticated requests or erase text.');
 await page.locator('#studioUrlPass').fill('fixture-private-app-code');
 await page.waitForFunction(()=>document.getElementById('studioWrittenTitle').value==='El relato original');
 assert.equal(await page.locator('#studioWrittenText').inputValue(),original);assert.equal(await page.locator('#studioUrlPass').inputValue(),'');assert.equal(await page.locator('#studioPass').inputValue(),'fixture-private-app-code');assert.ok(original.length>5000);assert.match(await page.locator('#studioUrlStatus').textContent(),/5.000/);
 assert.equal(await page.locator('#studioWrittenText').getAttribute('maxlength'),'100000');assert.equal(await page.locator('#studioCopyWritten').count(),1);
 const pending=page.waitForRequest('**/read-url');await page.locator('#studioWrittenUrl').fill('https://example.org/slow');await pending;
 await page.locator('#studioWrittenText').fill('Mi edición manual no debe borrarse.');await page.waitForTimeout(1100);assert.equal(await page.locator('#studioWrittenText').inputValue(),'Mi edición manual no debe borrarse.');
 await page.locator('#studioWrittenUrl').fill('https://example.org/blocked');await page.waitForFunction(()=>document.getElementById('studioUrlStatus').textContent.includes('no permite'));assert.equal(await page.locator('#studioWrittenText').inputValue(),'Mi edición manual no debe borrarse.');
 for(const width of [320,390,768]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 assert.ok(calls>=3);assert.deepEqual(errors,[]);console.log('PASS: visible access-code recovery, shared in-session code, URL auto-load, full text above 5000 chars, title/author fill, copy control, edit-race preservation, visible errors and mobile layout');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
