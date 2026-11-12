const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
fs.mkdirSync('editor-boceto-capturas',{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [360,390,412,1120]){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});
  await page.waitForFunction(()=>window.facelessStudioReady);
  await page.evaluate(()=>{
    const project={id:'approved-editor-'+innerWidth,title:'El eco de las campanas mudas',topic:'Misterio en una casa antigua',
      style:'Misterio',platform:'TikTok',duration:60,format:'9:16',date:new Date().toISOString(),
      imageStyle:'cinematic',captionStyle:'highlight',scenes:Array.from({length:8},(_,i)=>({
        time:i*7.5,duration:7.5,text:'Escena de misterio '+(i+1),prompt:'Ilustración cinematográfica del misterio '+(i+1)
      }))};
    project.hook=project.scenes[0].text;project.narration=project.scenes.map(s=>s.text).join('\n');
    projects.unshift(project);activeId=project.id;tab='video';route('editor');
  });
  await page.waitForSelector('#editor .boceto-editor-workspace',{timeout:16000});
  await page.waitForSelector('#finalHeroPanel',{state:'attached'});
  await page.waitForSelector('.boceto-transitions-card',{state:'attached'});
  assert.deepEqual(await page.locator('#bocetoEditorNav button').allTextContents(),['▤ Guion','▣ Escenas','▷ Video','⇧ Exportar']);
  assert.equal(await page.locator('.boceto-editor-main .fc-timeline-scene').count(),8);
  assert.equal(await page.locator('#finalHeroFile').count(),1);
  assert.equal(await page.locator('#productionStart').count(),1);
  assert.equal(await page.locator('#aiPhotosStart').count(),1);
  assert.equal(await page.locator('#aiVoiceGenerate').count(),1);
  assert.equal(await page.locator('#previewCanvas').count(),1);
  assert.equal(await page.locator('#renderVideo').count(),1);
  assert.equal(await page.locator('.boceto-export-card #downloadArea').count(),1,'El archivo final debe descargarse desde Exportar');
  assert.equal(await page.locator('.boceto-subtitle-card #bocetoCaption').count(),1);
  assert.equal(await page.locator('#finalTransitionPanel [data-final-transition]').count(),6);
  assert.equal(await page.locator('.boceto-extra-tools,.boceto-hook-panel,.boceto-news-filter').count(),0,'No repetir menús ni mostrar filtros que no funcionan');
  assert.equal(await page.locator('.ref-editor-nav').count(),0,'La navegación antigua no debe generarse');
  assert.equal(await page.locator('.fc-timeline-hero-jump').count(),0,'Hero tiene su propio control, no uno duplicado en el timeline');
  assert.equal(await page.locator('.boceto-hero-change').count(),1,'Un único botón visible para cambiar el clip Hero');
  assert.equal(await page.locator('.boceto-hero-adjust').count(),0,'No duplicar Ajustar con un segundo botón');
  assert.equal(await page.locator('#videoAutoCard > .editor-personalize').count(),0,'Una sola opción Personalizar');
  assert.equal(await page.locator('.boceto-editor-sidebar').isVisible(),false,'Escenas solo muestra reproductor, línea de tiempo y Hero');
  assert.equal(await page.locator('.boceto-timeline-card').isVisible(),true);
  await page.screenshot({path:'editor-boceto-capturas/'+width+'-escenas.png',fullPage:true});
  await page.locator('#bocetoEditorNav [data-boceto-tab="video"]').click();
  assert.equal(await page.locator('.boceto-timeline-card').isVisible(),false,'Video no duplica línea de tiempo');
  assert.equal(await page.locator('.boceto-hero-card').isVisible(),false,'Video no duplica controles Hero');
  assert.equal(await page.locator('.boceto-ai-card #productionStart').isVisible(),true);
  assert.equal(await page.locator('.boceto-ai-more').getAttribute('open'),null,'Personalización cerrada por defecto');
  await page.locator('.boceto-ai-more > summary').click();
  const hidden4=await page.locator('#finalTransitionPanel [data-final-transition="spin"]').isVisible();
  assert.equal(hidden4,false);
  await page.locator('.boceto-more-transitions').click();
  assert.equal(await page.locator('#finalTransitionPanel [data-final-transition="spin"]').isVisible(),true);
  await page.locator('.boceto-subtitle-card select').selectOption('neon');
  assert.equal(await page.evaluate(()=>current().captionStyle),'neon');
  await page.screenshot({path:'editor-boceto-capturas/'+width+'-video.png',fullPage:true});
  await page.locator('#bocetoEditorNav [data-boceto-tab="guion"]').click();
  await page.waitForFunction(()=>document.querySelector('#editor .tabs button.on')?.dataset.tab==='narration');
  assert.equal(await page.locator('.ref-narration-intro').isVisible(),true,'El gancho elegido se muestra una sola vez');
  assert.equal(await page.locator('.boceto-hook-panel').count(),0,'No volver a ofrecer cuatro ganchos genéricos tras elegir');
  await page.locator('#bocetoEditorNav [data-boceto-tab="video"]').click();
  await page.waitForSelector('#editor .boceto-editor-workspace');
  await page.locator('#bocetoEditorNav [data-boceto-tab="exportar"]').click();
  assert.equal(await page.locator('.boceto-export-card #exportQuality').isVisible(),true);
  assert.equal(await page.locator('.boceto-export-card #renderVideo').isVisible(),true);
  const pos=await page.locator('.boceto-export-card .editor-export-bar').evaluate(el=>getComputedStyle(el).position);
  assert.notEqual(pos,'fixed','Export controls must not overlay editor');
  await page.screenshot({path:'editor-boceto-capturas/'+width+'-exportar.png',fullPage:true});
  await page.locator('#bocetoEditorNav [data-boceto-tab="escenas"]').click();
  await page.locator('.boceto-add-scene').click();
  await page.waitForFunction(()=>document.querySelectorAll('.boceto-editor-main .fc-timeline-scene').length===9,{timeout:16000});
  assert.equal(await page.evaluate(()=>current().duration),60);
  assert.equal(await page.evaluate(()=>current().scenes.length),9);
  const overflow=await page.evaluate(()=>({screen:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(overflow.scroll<=overflow.screen+3,'Horizontal overflow '+JSON.stringify(overflow));
  assert.deepEqual(errors,[],'Browser JavaScript errors '+width);
  if(width>=900){
   const cols=await page.locator('.boceto-editor-workspace').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
   assert.equal(cols,1,'Escenas muestra el reproductor a ancho completo');
  }
  console.log('PASS editor layout '+width+' px, four tabs, 9 scene thumbnails, Hero, real buttons, static export, no JS errors');
  await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
