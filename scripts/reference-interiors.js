/* Visual interior 2026: Respeta INICIO, solo modifica pantallas secundarias. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const discover=$('discover'),editor=$('editor'),projectsPage=$('projects'),create=$('create');
if(!discover||!editor||!projectsPage||!create)return;
const mock=name=>'assets/mockup/'+name;
const prefersMotion=()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const selectChange=(el,val)=>{
 if(!el||!Array.from(el.options||[]).some(o=>o.value===val))return;
 el.value=val;el.dispatchEvent(new Event('change',{bubbles:true}));
};
const newsPhrases=[
 ['RD hoy','Noticias de República Dominicana hoy','Noticias'],
 ['Santo Domingo','Noticias Santo Domingo hoy','Noticias'],
 ['Dólar hoy','Precio del dólar República Dominicana hoy','Noticias'],
 ['Lluvias','Lluvias en República Dominicana hoy','Noticias'],
 ['Accidentes','Accidentes de tránsito República Dominicana hoy','Noticias'],
 ['Farándula','Farándula dominicana hoy','Farándula'],
 ['Política','Política República Dominicana hoy','Noticias'],
 ['Deportes','Deportes República Dominicana hoy','Deportes']
];
const fancyGenres=new Set(['Noticias','Farándula','Entretenimiento','Deportes']);
const menu=discover.querySelector('.studio-menu-view');
const results=discover.querySelector('.studio-results-view');
const resultsGrid=discover.querySelector('.studio-results-layout');
const newsRow=document.createElement('div');newsRow.className='ref-news-categories';
newsRow.setAttribute('aria-label','Buscar por tema');
newsPhrases.forEach(([title,query,genre])=>{
 const button=document.createElement('button');button.type='button';button.textContent=title;
 button.dataset.topic=query;button.dataset.genre=genre;
 button.addEventListener('click',()=>{
  selectChange($('studioGenre'),genre);
  const topic=$('studioTopic');topic.value=query;topic.dispatchEvent(new Event('input',{bubbles:true}));
  newsRow.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===button));
  discover.querySelector('#studioGenerate')?.click();
 });
 newsRow.append(button);
});
menu?.querySelector('.fcx-explore-header')?.after(newsRow);
const backbar=document.createElement('div');backbar.className='ref-news-backbar';
backbar.innerHTML='<button type="button" aria-label="Volver a las noticias">‹</button><span>Detalle de noticia</span>';
resultsGrid?.before(backbar);

const resultsToolbar=document.createElement('div');resultsToolbar.className='ref-news-results-toolbar';
resultsToolbar.innerHTML='<div class="ref-news-results-title"><button type="button" aria-label="Volver a buscar noticias">‹</button><strong>Noticias de hoy</strong><small>🎬 Faceless AI Studio</small></div>'+
 '<form class="ref-news-results-search"><span aria-hidden="true">⌕</span><input aria-label="Buscar noticias" placeholder="Buscar noticias en RD, Santo Domingo, dólar..." maxlength="220"><button type="submit" aria-label="Buscar">Buscar</button></form>'+
 '<div class="ref-news-results-tags"></div>';
resultsGrid?.before(resultsToolbar);
const refTags=resultsToolbar.querySelector('.ref-news-results-tags');
newsPhrases.forEach(([label,topic,genre])=>{
 const button=document.createElement('button');button.type='button';button.textContent=label;
 button.onclick=()=>{selectChange($('studioGenre'),genre);$('studioTopic').value=topic;
  $('studioTopic').dispatchEvent(new Event('input',{bubbles:true}));
  window.facelessShowStudioMenu?.();discover.dataset.refDetail='false';$('studioGenerate')?.click();};
 refTags.append(button);
});
resultsToolbar.querySelector('.ref-news-results-title button').onclick=()=>{discover.dataset.refDetail='false';window.facelessShowStudioMenu?.();};
resultsToolbar.querySelector('.ref-news-results-search').onsubmit=e=>{
 e.preventDefault();const query=resultsToolbar.querySelector('input').value.trim();
 $('studioTopic').value=query;$('studioTopic').dispatchEvent(new Event('input',{bubbles:true}));
 window.facelessShowStudioMenu?.();discover.dataset.refDetail='false';$('studioGenerate')?.click();
};
new MutationObserver(()=>{
 if(!results.hidden){resultsToolbar.querySelector('input').value=$('studioTopic')?.value||'';
 resultsToolbar.querySelector('strong').textContent=$('studioGenre')?.value==='Farándula'?'Farándula de hoy':'Noticias de hoy';}
}).observe(results,{attributes:true,attributeFilter:['hidden']});
backbar.querySelector('button').addEventListener('click',()=>{
 discover.dataset.refDetail='false';window.scrollTo({top:0,behavior:'instant'});
});
$('studioCards')?.addEventListener('click',e=>{
 if(!e.target.closest('.studio-card'))return;
 discover.dataset.refDetail='true';
});
$('studioGenerate')?.addEventListener('click',()=>{discover.dataset.refDetail='false'});
$('studioBackToMenu')?.addEventListener('click',()=>{discover.dataset.refDetail='false'});
function refreshDiscover(){
 const genre=$('studioGenre')?.value||'';
 const news=$('studioMode')?.value==='news'&&fancyGenres.has(genre);
 discover.classList.toggle('ref-news',news);
 const title=menu?.querySelector('.fcx-explore-header strong');
 if(title&&news)title.textContent=genre==='Farándula'?'Farándula de hoy':genre==='Deportes'?'Deportes de hoy':'Noticias de hoy';
 const search=$('studioTopic');
 if(search&&news)search.placeholder='Buscar noticias en RD, Santo Domingo, dólar...';
 if(resultsToolbar){resultsToolbar.querySelector('strong').textContent=genre==='Farándula'?'Farándula de hoy':'Noticias de hoy';}
 const resultTitle=$('studioGalleryTitle');
 if(resultTitle&&news&&discover.classList.contains('studio-show-results'))resultTitle.textContent=genre==='Farándula'?'Farándula de hoy':'Noticias de hoy';
}
['studioGenre','studioMode'].forEach(id=>$(id)?.addEventListener('change',()=>queueMicrotask(refreshDiscover)));
new MutationObserver(refreshDiscover).observe(discover,{attributes:true,attributeFilter:['class']});
refreshDiscover();

/* Paso de producción: utiliza los valores del motor original. No finge un video existente. */
const setup=document.createElement('section');setup.className='ref-create-view';setup.hidden=true;
setup.innerHTML='<header class="ref-titlebar"><button type="button" id="refSetupBack" aria-label="Volver">‹</button><span>🎬 Faceless AI Studio</span><h1>Crear Video</h1></header>'+
 '<div class="ref-poster"><img id="refSetupPhoto" alt="Portada de la historia elegida"><span class="ref-poster-label">PORTADA SELECCIONADA</span></div>'+
 '<h2 id="refSetupTitle" class="ref-selected-title"></h2>'+
 '<label class="ref-setting"><span>◷ &nbsp; Duración</span><select id="refSetupDuration"><option value="30">30 segundos</option><option value="60">60 segundos</option><option value="120">120 segundos</option></select></label>'+
 '<label class="ref-setting"><span>♩ &nbsp; Voz</span><select id="refSetupVoice"><option value="automatic">Automática</option><option value="female">Femenina</option><option value="male">Masculina</option></select></label>'+
 '<label class="ref-setting"><span>▣ &nbsp; Style</span><select id="refSetupStyle"><option value="cinematic">Cinematográfica</option><option value="hyperreal">Realista</option><option value="3d">3D</option><option value="2d">2D</option><option value="anime">Anime</option><option value="cartoon">Caricatura</option><option value="historical">Histórica</option></select></label>'+
 '<details class="ref-setting-advanced"><summary>⚙ &nbsp; Personalizar (avanzado) <span>⌄</span></summary><p>Formato de pantalla</p><div class="ref-format-buttons"><button type="button" data-format="9:16">▯ &nbsp; Vertical 9:16</button><button type="button" data-format="16:9">▭ &nbsp; Horizontal 16:9</button></div><p>Las opciones de IA, fuente y acceso permanecen en los ajustes del proyecto.</p></details>'+
 '<button type="button" id="refSetupContinue" class="ref-action">✦ Generar guion y escenas</button>';
discover.append(setup);
let originAction=null,skipIntercept=false;
function hideSetup(){
 discover.classList.remove('ref-setup-mode');setup.hidden=true;originAction=null;window.scrollTo({top:0,behavior:'instant'});
}
function updateFormat(){
 setup.querySelectorAll('[data-format]').forEach(b=>b.classList.toggle('chosen',typeof choice!=='undefined'&&choice.format===b.dataset.format));
}
setup.querySelectorAll('[data-format]').forEach(b=>b.addEventListener('click',()=>{
 if(typeof choice!=='undefined')choice.format=b.dataset.format;
 updateFormat();
}));
function showSetup(button){
 originAction=button;
 const img=discover.querySelector('.studio-feature-picture img');
 const out=$('refSetupPhoto');
 if(img?.src){out.src=img.src;out.alt=img.alt||'Portada seleccionada';}
 else{out.src=mock('news.webp');out.alt='Imagen ilustrativa, todavía sin portada generada';}
 $('refSetupTitle').textContent=discover.querySelector('.studio-feature-text h2')?.textContent||'Video nuevo';
 $('refSetupDuration').value=$('studioDuration')?.value||'60';
 $('refSetupVoice').value=['automatic','female','male'].includes($('studioVoice')?.value)?$('studioVoice').value:'automatic';
 $('refSetupStyle').value=$('studioImageStyle')?.value||'cinematic';
 updateFormat();setup.hidden=false;discover.classList.add('ref-setup-mode');
 window.scrollTo({top:0,behavior:'instant'});
}
discover.addEventListener('click',e=>{
 if(skipIntercept)return;
 const b=e.target.closest('.studio-feature-text > .studio-create');
 if(!b||b.disabled||b!==discover.querySelector('.studio-feature-text > .studio-create'))return;
 e.preventDefault();e.stopImmediatePropagation();
 showSetup(b);
},true);
$('refSetupBack').onclick=hideSetup;
$('refSetupContinue').addEventListener('click',()=>{
 const b=originAction;if(!b?.isConnected){hideSetup();return;}
 selectChange($('studioDuration'),$('refSetupDuration').value);
 selectChange($('studioVoice'),$('refSetupVoice').value);
 selectChange($('studioImageStyle'),$('refSetupStyle').value);
 window.refShowScriptAfterCreate=true;
 hideSetup();skipIntercept=true;
 try{b.click()}finally{skipIntercept=false}
});
const createHeading=create.querySelector('.screen-head h1');
if(createHeading)createHeading.textContent='Crear Video';
const createSubtitle=create.querySelector('.screen-head p');
if(createSubtitle)createSubtitle.textContent='Empieza con tu tema o tus propios archivos.';
const creatorTitle=create.querySelector('.fc-creator-banner h2');
if(creatorTitle)creatorTitle.textContent='Tu próximo video';

/* Editor: navegación compacta, editor visual de escenas y herramientas originales conservadas. */
const editorHead=document.createElement('div');editorHead.className='ref-editor-head';
editorHead.innerHTML='<button type="button" class="ref-editor-back" aria-label="Volver a proyectos">‹</button><strong id="refEditorLabel">Guion y Escenas</strong><span>🎬 Faceless AI Studio</span>';
editor.prepend(editorHead);
editorHead.querySelector('button').addEventListener('click',()=>{if(typeof route==='function')route('projects')});
const tabNav=document.createElement('div');tabNav.className='ref-editor-nav';
tabNav.innerHTML='<button type="button" data-ref-tab="narration">▤ Guion</button><button type="button" data-ref-tab="scenes">▦ Escenas</button><button type="button" data-ref-tab="video">▣ Video</button><button type="button" data-ref-tab="subs">AA Subtítulos</button>';
editor.querySelector('.fc-steps')?.before(tabNav);
tabNav.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
 editor.querySelector('.tabs [data-tab="'+b.dataset.refTab+'"]')?.click();
}));
const actions=editor.querySelector('.editor-top .actions');
if(actions){
 const opts=document.createElement('details');opts.className='ref-editor-actions';
 opts.innerHTML='<summary>Acciones del proyecto · Editar, copiar, respaldo y guardar</summary>';
 actions.before(opts);opts.append(actions);
}
function updateEditorLabel(){
 const active=editor.querySelector('.tabs button.on')?.dataset.tab||'summary';
 $('refEditorLabel').textContent=active==='video'?'Editor de Escenas':active==='scenes'?'Editor de Escenas':'Guion y Escenas';
 tabNav.querySelectorAll('button').forEach(b=>{
  const on=b.dataset.refTab===active||(active==='summary'&&b.dataset.refTab==='narration');
  b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));
 });
}
new MutationObserver(updateEditorLabel).observe(editor.querySelector('.tabs'),{subtree:true,attributes:true,attributeFilter:['class']});
function getProject(){return typeof current==='function'?current():null}
function photoFor(p,index){
 const collection=window.facelessSceneImages?.get(p.id);
 const item=collection?.get(index);
 if(!item)return '';
 if(typeof item==='string')return item;
 return typeof item.src==='string'?item.src:'';
}
function formatClock(t){t=Math.max(0,Math.floor(Number(t)||0));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')}
function buildSceneExplorer(){
 const body=$('tabBody');
 if(!body||body.querySelector('.ref-scene-editor')||!body.querySelector('#sceneForm'))return;
 const p=getProject();if(!p?.scenes?.length)return;
 let chosen=0;
 const sceneView=document.createElement('section');sceneView.className='ref-scene-editor';
 sceneView.innerHTML='<div class="ref-media-display"><div class="ref-media-empty"><span>▣</span><b>Vista de la escena</b><small>Agrega una foto o clip para visualizarlo</small></div><img alt="Fotografía de la escena actual" hidden></div>'+
 '<div class="ref-timeline"></div><div class="ref-scene-description"><h3></h3><p></p><button type="button" class="ref-scene-edit-text">✎ Editar texto y prompts</button></div>'+
 '<div class="ref-motion-buttons"><b>Movimiento de la fotografía</b><div><button type="button" data-motion="zoom">Zoom lento</button><button type="button" data-motion="pan">Paneo</button><button type="button" data-motion="vertical">Vertical</button><button type="button" data-motion="dramatic">Dramático</button></div></div>';
 const timeline=sceneView.querySelector('.ref-timeline');
 p.scenes.forEach((s,i)=>{
  const b=document.createElement('button');b.type='button';b.className='ref-scene-thumb';b.dataset.index=String(i);
  const image=photoFor(p,i);
  if(image){const pic=document.createElement('img');pic.src=image;pic.alt='Escena '+(i+1);b.append(pic);}
  else {const mark=document.createElement('span');mark.className='ref-thumb-missing';mark.textContent='▣';b.append(mark);}
  const caption=document.createElement('span');caption.textContent=String(i+1)+' · '+formatClock(s.time)+'–'+formatClock(s.time+s.duration);b.append(caption);
  b.addEventListener('click',()=>{chosen=i;refresh()});timeline.append(b);
 });
 function refresh(){
  const s=p.scenes[chosen],url=photoFor(p,chosen);
  sceneView.querySelectorAll('.ref-scene-thumb').forEach((b,i)=>b.classList.toggle('active',i===chosen));
  const image=sceneView.querySelector('.ref-media-display img'),empty=sceneView.querySelector('.ref-media-empty');
  if(url){image.src=url;image.hidden=false;empty.hidden=true;}else{image.removeAttribute('src');image.hidden=true;empty.hidden=false;}
  sceneView.querySelector('.ref-scene-description h3').textContent='Escena '+(chosen+1)+' · '+formatClock(s.time)+'–'+formatClock(s.time+s.duration);
  sceneView.querySelector('.ref-scene-description p').textContent=s.text||'Escena sin texto';
  sceneView.querySelectorAll('[data-motion]').forEach(b=>b.classList.toggle('active',b.dataset.motion===(s.photoMotion||'auto')));
  const motionIndex=$('fcMotionScene');if(motionIndex){selectChange(motionIndex,String(chosen));}
 }
 sceneView.querySelector('.ref-scene-edit-text').addEventListener('click',()=>{
  const d=body.querySelector('.ref-scene-advanced');if(d)d.open=true;
  const area=$('s'+chosen);area?.scrollIntoView({behavior:prefersMotion()?'smooth':'instant',block:'center'});area?.focus({preventScroll:true});
 });
 sceneView.querySelectorAll('[data-motion]').forEach(b=>b.addEventListener('click',()=>{
  const s=p.scenes[chosen];s.photoMotion=b.dataset.motion;
  if(s.imageMotion==='static')delete s.imageMotion;
  if(typeof persist==='function')persist();
  const preset=$('fcMotionPreset');if(preset){selectChange($('fcMotionScene'),String(chosen));selectChange(preset,b.dataset.motion);}
  refresh();
 }));
 const old=body.querySelector('.detail');
 const more=document.createElement('details');more.className='ref-scene-advanced';
 more.innerHTML='<summary>▤ Guion y prompts de todas las escenas</summary>';
 old.before(sceneView,more);more.append(old);
 refresh();
}
function buildNarrationIntro(){
 const body=$('tabBody'),p=getProject();
 if(!body||!p||!body.querySelector('#autoScript')||body.querySelector('.ref-narration-intro'))return;
 const intro=document.createElement('section');intro.className='ref-narration-intro';
 intro.innerHTML='<div class="ref-script-summary"><div class="ref-script-image"><span>▣</span></div><div><b></b><small></small></div></div>'+
 '<p class="ref-hook-label">Gancho elegido para el video</p><div class="ref-selected-hook"></div>';
 intro.querySelector('b').textContent=p.title;
 intro.querySelector('small').textContent=p.duration+' segundos · '+p.scenes.length+' escenas';
 intro.querySelector('.ref-selected-hook').textContent=p.selectedHook||p.hook||p.scenes[0]?.text||'';
 const original=body.querySelector('.detail');original.before(intro);
}
const content=$('tabBody');
let pending=false;
function refreshEditor(){
 if(document.body.dataset.screen!=='editor')return;
 updateEditorLabel();
 if(window.refShowScriptAfterCreate){
  window.refShowScriptAfterCreate=false;
  queueMicrotask(()=>editor.querySelector('.tabs [data-tab="narration"]')?.click());
  return;
 }
 buildNarrationIntro();
 buildSceneExplorer();
}
new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;refreshEditor()});}).observe(content,{childList:true});
new MutationObserver(refreshEditor).observe(document.body,{attributes:true,attributeFilter:['data-screen']});
refreshEditor();

/* Proyectos: datos auténticos del navegador, sin inventar videos MP4. */
const projectHeader=projectsPage.querySelector('.screen-head h1');
if(projectHeader)projectHeader.textContent='Mis Proyectos';
const projectTabs=projectsPage.querySelector('.fcx-project-tabs');
const projectList=$('projectsList');
function redrawProjects(){
 const existing=typeof projects!=='undefined'&&Array.isArray(projects)?projects:[];
 const ready=existing.filter(p=>Array.isArray(p.scenes)&&p.scenes.length>0&&p.scenes.every(s=>String(s.text||'').trim())).length;
 const nodes=projectTabs?.querySelectorAll('button');
 if(nodes?.length>=3){
  nodes[0].textContent='Todos ('+existing.length+')';
  nodes[1].textContent='Guion listo ('+ready+')';
  nodes[2].textContent='Borrador ('+(existing.length-ready)+')';
 }
 projectList.querySelectorAll('.project').forEach(card=>{
  const button=card.querySelector('[data-project="open"]');if(button)button.textContent='✎ Continuar';
  const back=card.querySelector('[data-project="download"]');if(back){back.textContent='↓ JSON';back.title='Descargar respaldo JSON, no video final';}
 });
}
let scheduleProjects=false;
new MutationObserver(()=>{
 if(scheduleProjects)return;scheduleProjects=true;
 queueMicrotask(()=>{scheduleProjects=false;redrawProjects()});
}).observe(projectList,{childList:true});
redrawProjects();

/* Progreso: aro visual conectado con el progreso real por etapas; no crea progreso falso. */
function decorateProgress(){
 document.querySelectorAll('.video-progress.vp-inline').forEach(box=>{
  if(box.querySelector('.ref-progress-wheel'))return;
  const meter=box.querySelector('.vp-meter');if(!meter)return;
  const wheel=document.createElement('div');wheel.className='ref-progress-wheel';
  wheel.innerHTML='<div><span>🎬</span><strong>0%</strong></div>';
  meter.before(wheel);
  const update=()=>{
   const pct=Math.min(100,Math.max(0,Math.round(Number(meter.value)||0)));
   wheel.style.setProperty('--ref-percent',pct+'%');wheel.querySelector('strong').textContent=pct+'%';
  };
  new MutationObserver(update).observe(meter,{attributes:true,attributeFilter:['value']});
  update();
 });
}
new MutationObserver(decorateProgress).observe(document.body,{childList:true,subtree:true});
decorateProgress();
})();