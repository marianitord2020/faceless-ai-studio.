const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgaPj/HwAEggJ/59habAAAAABJRU5ErkJggg==';
 const credit={id:'photo-fixture',provider:'openverse',title:'Playa <script>alert(1)</script>',author:'Autor de prueba',sourceURL:'https://example.org/photo',license:'CC BY 4.0',licenseURL:'https://creativecommons.org/licenses/by/4.0/'};
 await page.route('**/stock/search',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:[{...credit,thumbnail:png,selection:'signed-fixture'}],hasMore:false})}));
 await page.route('**/stock/import',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({dataURI:png,credit})}));
 await page.goto('http://127.0.0.1:4173/');await page.waitForFunction(()=>window.facelessStudioReady);
 await page.evaluate(()=>{
  const p={id:'stock-fixture',title:'Fotos de archivo',topic:'Playa',style:'Educativo',duration:10,platform:'TikTok',format:'9:16',date:new Date().toISOString(),scenes:[{time:0,duration:5,text:'Primera escena de la playa.',prompt:'A beach'},{time:5,duration:5,text:'Segunda escena del bosque.',prompt:'A forest'}]};p.narration=p.scenes.map(s=>s.text).join('\n');projects.unshift(p);persist();activeId=p.id;tab='video';route('editor');
 });
 await page.locator('#stockPhotos').evaluate(node=>{for(let p=node;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
 assert.equal(await page.locator('#stockPhotos').count(),1);
 for(const width of [320,390,768]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await page.getByLabel('Buscar fotografías',{exact:true}).fill('playa');await page.locator('#stockPhotos').getByLabel('Código privado de la aplicación',{exact:true}).fill('fixture-stock-private-code');await page.getByLabel('Escena de destino').selectOption('1');
 await page.getByRole('button',{name:'Buscar fotos',exact:true}).click();await page.waitForSelector('.stock-card');
 assert.equal(await page.locator('.stock-card b').textContent(),credit.title);assert.equal(await page.locator('.stock-card script').count(),0);
 await page.getByRole('button',{name:'Usar esta foto',exact:true}).click();await page.waitForFunction(()=>current().scenes[1].stockCredit?.author==='Autor de prueba');
 assert.equal(await page.evaluate(()=>Boolean(facelessProjectPhotos(current().id).get(1))),true);
 assert.equal(await page.evaluate(()=>Boolean(current().scenes[0].stockCredit)),false);
 await page.waitForFunction(()=>!window.facelessMediaBusy);
 await page.evaluate(()=>renderTab());
 await page.waitForFunction(()=>facelessProjectPhotos(current().id).has(1));
 assert.equal(await page.locator('.stock-credits').textContent(), 'Escena 2 · Autor de prueba · openverse · CC BY 4.0');
 const stored=await page.evaluate(()=>facelessMediaGet(current().id+':image:1'));assert.equal(stored.credit.author,credit.author);
 assert.deepEqual(errors,[]);console.log('PASS: responsive stock search, safe text rendering, scene selection, imported photo persistence and retained attribution');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
