const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/');
 await page.waitForFunction(()=>window.facelessStudioReady);
 await page.evaluate(()=>{
  const p={
   id:'hero-mobile-test',title:'El último café en París',topic:'Historia romántica',
   style:'Romance',duration:27.9,format:'9:16',platform:'TikTok',
   date:new Date().toISOString(),
   scenes:Array.from({length:5},(_,i)=>({time:i*5.58,duration:5.58,text:'Escena de prueba '+(i+1),prompt:'Interior de un café'}))
  };
  p.hook=p.scenes[0].text;p.narration=p.scenes.map(x=>x.text).join('\n');
  projects.unshift(p);activeId=p.id;tab='video';route('editor');
 });
 await page.waitForSelector('#finalHeroPanel',{state:'attached'});
 await page.waitForSelector('.fc-timeline-scene');
 await page.locator('#bocetoEditorNav [data-boceto-tab="exportar"]').click();
 const geometry=await page.evaluate(()=>{
  const frame=document.querySelector('#editor .media-frame');
  const toolbar=document.querySelector('#editor .editor-export-bar');
  const player=frame?.getBoundingClientRect(),actions=toolbar?.getBoundingClientRect();
  return {position:getComputedStyle(toolbar).position,
   playerBottom:player.bottom,actionsTop:actions.top,
   bodyScroll:document.documentElement.scrollWidth,width:innerWidth};
 });
 assert.equal(geometry.position,'static','El botón flotante no debe tapar las opciones al desplazarse');
 assert.ok(geometry.actionsTop>=geometry.playerBottom-1,'Los controles de exportación van debajo del reproductor');
 assert.ok(geometry.bodyScroll<=geometry.width+2,'No debe desbordar horizontalmente');
 await page.locator('#bocetoEditorNav [data-boceto-tab="escenas"]').click();
 await page.locator('.boceto-hero-detail > summary').click();
 assert.equal(await page.locator('#finalHeroRaw').isVisible(),false,'No mostrar video negro sin clip');
 assert.equal(await page.locator('.final-hero-settings').isVisible(),false,'Ocultar herramientas de recorte sin clip');
 await page.locator('#finalHeroFile').setInputFiles('tests/hero-mobile-fixture.webm');
 await page.waitForFunction(()=>window.facelessHeroStatus?.().loaded===true,null,{timeout:25000});
 await page.waitForFunction(()=>window.facelessHeroPoster?.().startsWith('data:image/jpeg'),null,{timeout:15000});
 assert.equal(await page.locator('.fc-timeline-scene.has-hero').count(),1,'Hero en la línea de tiempo');
 assert.equal(await page.locator('.fc-timeline-scene:first-child .fc-timeline-art img').count(),1,'Fotograma real del Hero');
 assert.equal(await page.locator('#finalHeroRaw').isVisible(),true,'El Hero se reproduce en un video real');
 // Incluso con Hero cargado, pulsar escena 1 debe abrir el editor de ESA escena.
 await page.locator('.fc-timeline-scene').first().click();
 await page.waitForFunction(()=>document.querySelector('#editor .tabs button.on')?.dataset.tab==='scenes');
 assert.equal(await page.locator('.ref-scene-editor .ref-scene-thumb').count(),5);
 await page.locator('#bocetoEditorNav [data-boceto-tab="escenas"]').click();
 await page.locator('.boceto-hero-detail > summary').click();
 assert.match(await page.locator('#finalHeroStatus').textContent(),/Clip real cargado/);
 const duration=await page.evaluate(()=>window.facelessHeroStatus().duration);
 assert.ok(duration>=5&&duration<=8,'La introducción conserva entre cinco y ocho segundos');
 await page.locator('#finalHeroFile').setInputFiles({name:'archivo-corrupto.mp4',mimeType:'video/mp4',buffer:Buffer.from('no es un vídeo')});
 await page.waitForFunction(()=>document.getElementById('finalHeroStatus')?.dataset.state==='error');
 assert.match(await page.locator('#finalHeroStatus').textContent(),/no contiene un MP4 o WebM válido/i);
 assert.equal(await page.evaluate(()=>window.facelessHeroStatus().loaded),true,'Un reemplazo inválido no borra el Hero anterior');
 assert.equal(await page.locator('.fc-timeline-scene.has-hero').count(),1,'La miniatura previa sigue visible');
 assert.deepEqual(errors,[],'Sin errores JavaScript del editor');
 console.log('PASS: Hero WebM real, thumbnail, clip preservado, mensaje de codec y toolbar sin superposiciones en Android');
 await browser.close();
})().catch(err=>{console.error(err);process.exit(1)});
