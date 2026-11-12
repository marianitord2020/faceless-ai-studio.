/* Smoke E2E: clips reales independientes, persistencia, compositor y exportación. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const newProject=()=>{
  const p={id:'video-por-escena-test',title:'Prueba de montaje con dos clips',topic:'Historia',
   style:'Misterio',duration:4,format:'9:16',platform:'TikTok',date:new Date().toISOString(),creationFlow:'ai',
   scenes:[{time:0,duration:2,text:'Una escena roja.',prompt:'Rojo'},{time:2,duration:2,text:'Otra escena azul.',prompt:'Azul'}]};
  p.narration=p.scenes.map(s=>s.text).join('\n');p.hook=p.scenes[0].text;
  projects.unshift(p);persist();activeId=p.id;tab='video';route('editor');
 };
 await page.goto('http://127.0.0.1:4173/');
 await page.waitForFunction(()=>window.facelessStudioReady);
 await page.evaluate(newProject);
 await page.waitForSelector('.fc-timeline-scene');
 await page.locator('.fc-timeline-scene').first().click();
 await page.waitForSelector('.ref-scene-editor .scene-clip-panel');
 await page.locator('.scene-clip-panel input[type=file]').setInputFiles('tests/scene-red.webm');
 await page.waitForFunction(()=>window.FacelessSceneVideos?.record(current(),0)?.video.readyState>=2);
 assert.equal(await page.evaluate(()=>current().scenes[0].clipName),'scene-red.webm');
 await page.locator('.ref-scene-thumb').nth(1).click();
 await page.locator('.scene-clip-panel input[type=file]').setInputFiles('tests/scene-blue.webm');
 await page.waitForFunction(()=>window.FacelessSceneVideos?.record(current(),1)?.video.readyState>=2);
 assert.equal(await page.evaluate(()=>current().scenes[1].clipName),'scene-blue.webm');
 assert.equal(await page.locator('.scene-clip-panel').count(),1);
 const colors=await page.evaluate(()=>{
  const p=current(),a=window.FacelessSceneVideos;
  const pixel=i=>{drawFrame(i,i===0?.6:2.6);const d=ctx.getImageData(canvas.width/2,canvas.height/2,1,1).data;return [...d];};
  return {red:pixel(0),blue:pixel(1),distinct:a.record(p,0).video!==a.record(p,1).video,
   stored:p.scenes.map(s=>s.clipName)};
 });
 assert.ok(colors.distinct,'No se deben compartir videos entre escenas');
 assert.ok(colors.red[0]>colors.red[2],'La primera escena debe mostrar el clip rojo: '+colors.red);
 assert.ok(colors.blue[2]>colors.blue[0],'La segunda escena debe mostrar el clip azul: '+colors.blue);
 // Ajustar el inicio del segundo clip sin alterar la duración total.
 await page.locator('.scene-clip-trim input').evaluate(el=>{el.value='0.5';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
 assert.equal(await page.evaluate(()=>current().scenes[1].clipStart),.5);
 await page.reload();
 await page.waitForFunction(()=>window.facelessStudioReady);
 await page.evaluate(()=>{activeId='video-por-escena-test';tab='video';route('editor')});
 await page.waitForFunction(()=>window.FacelessSceneVideos?.record(current(),0)&&window.FacelessSceneVideos?.record(current(),1),null,{timeout:30000});
 assert.equal(await page.evaluate(()=>current().scenes[1].clipStart),.5);
 // El archivo descargado usa el mismo canvas que la vista previa.
 const result=await page.evaluate(async()=>{
  current().exportHeight=720;current().exportFormat='webm';
  const ok=await renderVideo({format:'webm'});
  return {ok,status:document.querySelector('#renderStatus')?.textContent,link:!!document.querySelector('#downloadArea a')};
 });
 assert.ok(result.ok&&result.link,'La exportación falló: '+JSON.stringify(result));
 const file=page.waitForEvent('download');
 await page.locator('#bocetoEditorNav [data-boceto-tab="exportar"]').click();
 await page.locator('#downloadArea a').click();
 const download=await file;
 assert.match(download.suggestedFilename(),/720p\.webm$/);
 await download.saveAs('/tmp/scene-clips-export.webm');
 // Escena reemplazada y eliminada: otra escena permanece intacta.
 await page.locator('#bocetoEditorNav [data-boceto-tab="escenas"]').click();
 await page.locator('.fc-timeline-scene').first().click();
 await page.waitForSelector('.scene-clip-panel');
 await page.getByRole('button',{name:'Quitar video'}).click();
 await page.waitForFunction(()=>!window.FacelessSceneVideos.record(current(),0));
 assert.equal(await page.evaluate(()=>Boolean(window.FacelessSceneVideos.record(current(),1))),true);
 assert.equal(await page.evaluate(()=>Boolean(current().scenes[0].clipName)),false);
 // En edición manual debe existir la misma herramienta por escena.
 const manual=await browser.newPage({viewport:{width:390,height:844}});
 await manual.goto('http://127.0.0.1:4173/?mode=manual');
 await manual.waitForFunction(()=>window.facelessStudioReady);
 await manual.evaluate(()=>{
  const p={id:'manual-clip-test',title:'Manual',topic:'Clips',style:'Historia',duration:4,format:'9:16',platform:'TikTok',
   scenes:[{time:0,duration:2,text:'Uno',prompt:'Uno'},{time:2,duration:2,text:'Dos',prompt:'Dos'}]};
  p.hook=p.scenes[0].text;p.narration=p.scenes.map(s=>s.text).join('\n');
  projects.unshift(p);activeId=p.id;tab='video';route('editor');
 });
 await manual.waitForSelector('.cut-studio .scene-clip-panel');
 assert.equal(await manual.locator('.cut-inspector .scene-clip-panel input[type=file]').count(),1);
 assert.deepEqual(errors,[],'El editor no debe producir errores JavaScript');
 await manual.close();await browser.close();
 console.log('PASS: 2 clips independientes y persistentes, fotogramas reales, recorte, MP4/WebM input, exportación WebM 720p y panel manual Android');
})().catch(e=>{console.error(e);process.exit(1)});
