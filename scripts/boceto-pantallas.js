/* FACILESS — reconstrucción visual de pantallas interiores conforme al boceto de seis paneles.
 * Nunca modifica #home, y reutiliza formularios/motores originales. */
(() => {
 'use strict';
 const el=id=>document.getElementById(id);
 const create=el('create'),discover=el('discover'),editor=el('editor'),projectsPage=el('projects');
 if(!create||!discover||!editor||!projectsPage)return;
 const picture=name=>'assets/mockup/'+name;
 const change=(target,value)=>{if(!target)return;const option=Array.from(target.options||[]).find(o=>o.value===value);if(!option)return;target.value=value;target.dispatchEvent(new Event('change',{bubbles:true}));};
 const screen=(name)=>typeof route==='function'&&route(name);
 const reduceMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const smooth=()=>reduceMotion()?'instant':'smooth';
 const safe=(t)=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 
 // Crear Video — pantalla real, con acceso al generador de IA y al planificador manual.
 const oldCreate=create.querySelector('.form-card'),originalBox=create.querySelector('.fc-create-box');
 if(oldCreate&&originalBox&&!create.querySelector('.boceto-create')){
  const screenNode=document.createElement('section');screenNode.className='boceto-create';
  screenNode.innerHTML=
   '<header class="boceto-page-top"><button type="button" class="boceto-back" aria-label="Volver a Inicio">‹</button><div class="boceto-brand"><span>🎬</span> Faceless AI Studio</div><span></span><h1>Crear Video</h1></header>'+
   '<div class="boceto-create-image"><img id="bocetoCreateCover" src="assets/mockup/cinematic.webp" alt="Ejemplo de estilo cinematográfico"><span class="boceto-poster-type">PORTADA DE EJEMPLO</span><div class="boceto-create-image-text"><strong>Tu próximo video</strong><span>Noticias, relatos y documentales</span></div></div>'+
   '<label class="boceto-topic-label" for="bocetoCreateTopic">¿Qué quieres contar?</label><textarea id="bocetoCreateTopic" rows="2" maxlength="220" placeholder="Escribe un tema, noticia o relato..."></textarea>'+
   '<div class="boceto-create-opts"><label class="boceto-create-row"><span>◷ &nbsp; Duración</span><select id="bocetoCreateDuration"><option value="30">30 segundos</option><option value="60" selected>60 segundos</option><option value="120">120 segundos</option></select></label>'+
   '<label class="boceto-create-row"><span>♬ &nbsp; Voz</span><select id="bocetoCreateVoice"><option value="automatic">Automática</option><option value="female">Femenina</option><option value="male">Masculina</option></select></label>'+
   '<label class="boceto-create-row"><span>▣ &nbsp; Estilo</span><select id="bocetoCreateStyle"><option value="cinematic">Cinematográfica</option><option value="hyperreal">Realista</option><option value="3d">3D animado</option><option value="anime">Anime</option><option value="2d">2D</option><option value="cartoon">Caricatura</option><option value="historical">Histórica</option></select></label></div>'+
   '<details class="boceto-create-advanced"><summary>⚙ &nbsp; Personalizar (avanzado) <span>⌄</span></summary>'+
   '<p>Formato de video</p><div class="boceto-format"><button type="button" data-boceto-format="9:16">▯ &nbsp; Vertical 9:16</button><button type="button" data-boceto-format="16:9">▭ &nbsp; Horizontal 16:9</button></div></details>'+
   '<button type="button" id="bocetoCreateGo" class="boceto-primary">✦ &nbsp; Continuar con IA</button>'+
   '<p class="boceto-create-description">Elige una propuesta, uno de cuatro ganchos y luego genera el video.</p>';
  originalBox.before(screenNode);
  const legacy=document.createElement('details');legacy.className='boceto-legacy-create';
  legacy.innerHTML='<summary>✂️ Herramientas adicionales y borrador sin IA</summary>';
  originalBox.before(legacy);legacy.append(originalBox);
  const existingDetails=create.querySelector('.fc-legacy-options');
  if(existingDetails)legacy.append(existingDetails);
  create.classList.add('boceto-create-active');
  screenNode.querySelector('.boceto-back').onclick=()=>screen('home');
  const chooseFormat=()=>{
   screenNode.querySelectorAll('[data-boceto-format]').forEach(b=>{
    const selected=typeof choice!=='undefined'&&choice.format===b.dataset.bocetoFormat;
    b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));
   });
  };
  chooseFormat();
  screenNode.querySelectorAll('[data-boceto-format]').forEach(b=>b.onclick=()=>{
   if(typeof choice!=='undefined'){choice.format=b.dataset.bocetoFormat;if(typeof renderOpts==='function')renderOpts();}
   chooseFormat();
  });
  const portrait=el('bocetoCreateCover');
  el('bocetoCreateStyle').onchange=()=>{
   const image={cinematic:'cinematic.webp',hyperreal:'realista.webp','3d':'3d.svg',anime:'anime.svg','2d':'2d.svg',cartoon:'3d.svg',historical:'documentales.webp'};
   portrait.src=picture(image[el('bocetoCreateStyle').value]||'cinematic.webp');
   change(el('studioImageStyle'),el('bocetoCreateStyle').value);
  };
  el('bocetoCreateGo').onclick=()=>{
   const topic=el('bocetoCreateTopic'),value=topic.value.trim();
   if(!value){topic.setCustomValidity('Escribe el tema de tu video.');topic.reportValidity();topic.focus();return;}
   topic.setCustomValidity('');
   if(typeof facelessIsWorking==='function'&&facelessIsWorking())return;
   screen('discover');
   window.facelessShowStudioMenu?.();
   const s=el('studioTopic');if(s){s.value=value;s.dispatchEvent(new Event('input',{bubbles:true}));}
   change(el('studioDuration'),el('bocetoCreateDuration').value);
   change(el('studioVoice'),el('bocetoCreateVoice').value);
   change(el('studioImageStyle'),el('bocetoCreateStyle').value);
   // Choose an appropriate documented genre. News is only selected when explicitly asked.
   const news=/\b(noticias?|actualidad|hoy|farándula|farandula|deportes?|dólar|dolar|clima|lluvias?)\b/i.test(value);
   if(news){change(el('studioMode'),'news');change(el('studioGenre'),/farandula|farándula/i.test(value)?'Farándula':/deporte/i.test(value)?'Deportes':'Noticias');}
   else{change(el('studioMode'),'fiction');}
  };
 }
 
 // Noticias — filtros del boceto, pero siempre con noticias reales y sus fechas.
 const results=discover.querySelector('.studio-results-view'),newsMenu=discover.querySelector('.studio-menu-view');
 if(newsMenu&&!newsMenu.querySelector('.boceto-news-top')){
  const top=document.createElement('div');top.className='boceto-news-top';
  top.innerHTML='<button type="button" aria-label="Regresar al Inicio">‹</button><div><small>🎬 Faceless AI Studio</small><h1>Noticias de hoy</h1></div><span></span>';
  newsMenu.prepend(top);top.querySelector('button').onclick=()=>screen('home');
  const filters=document.createElement('div');filters.className='boceto-news-filter';
  filters.innerHTML='<label><span>▦ &nbsp; Período</span><select id="bocetoNewsPeriod"><option value="24">Últimas 24 horas</option><option value="72">Últimos 3 días</option><option value="168">Últimos 7 días</option></select></label>'+
  '<label><span>≡ &nbsp; Orden</span><select id="bocetoNewsOrder"><option value="recent">Más recientes</option><option value="relevant">Más relevantes</option></select></label>';
  const after=newsMenu.querySelector('.ref-news-categories');
  if(after)after.after(filters);else newsMenu.append(filters);
  const realTopic=el('studioTopic');
  const submit=el('studioGenerate');
  filters.querySelectorAll('select').forEach(s=>s.addEventListener('change',()=>{
    // La búsqueda del servidor establece sus propios criterios: NO enviar filtros falsos.
    if(el('studioMode')?.value==='news'&&realTopic)realTopic.title='El intervalo mostrado es una preferencia visual; la búsqueda del servidor puede aplicar su propia ventana de actualidad.';
  }));
  if(results){
   const resultsTitle=document.createElement('div');resultsTitle.className='boceto-results-meta';
   resultsTitle.innerHTML='<div><label>▦ <select id="bocetoNewsResultsPeriod"><option>Noticias encontradas y verificables</option></select></label><span>Sin métricas inventadas</span></div>';
   results.querySelector('.ref-news-results-toolbar')?.after(resultsTitle);
  }
 }
 
 // Guion y Escenas — la acción de elegir cuatro ganchos sucede de verdad en el proyecto.
 function project(){return typeof current==='function'?current():null;}
 const tabBody=el('tabBody');
 const nativeTabs=editor.querySelector('.tabs');
 const editorTabs=editor.querySelector('.ref-editor-nav');
 if(editorTabs){
   editorTabs.classList.add('boceto-tabs');
   const buttons=[...editorTabs.querySelectorAll('[data-ref-tab]')];
   buttons.forEach(b=>{
    if(b.dataset.refTab==='narration')b.textContent='▤ Guion';
    if(b.dataset.refTab==='scenes')b.textContent='▦ Escenas';
    if(b.dataset.refTab==='video')b.textContent='▣ Video';
    if(b.dataset.refTab==='subs')b.textContent='AA';
   });
 }
 // El boceto muestra solo Guion y Escenas; las demás funciones siguen en Más herramientas.
 if(editorTabs&&!editor.querySelector('.boceto-extra-tools')){
  const details=document.createElement('details');details.className='boceto-extra-tools';
  details.innerHTML='<summary>⚙ Más herramientas: Video y Subtítulos</summary>';
  editorTabs.after(details);
  for(const id of ['video','subs']){
   const btn=editorTabs.querySelector('[data-ref-tab="'+id+'"]');
   if(btn)details.append(btn);
  }
 }
 const hookVariants=(p)=>{
  const title=String(p.title||'').trim().replace(/[.!?]+$/,'').slice(0,115);
  return [
   p.selectedHook||p.hook||p.scenes[0]?.text||title,
   '¿Qué se sabe realmente sobre «'+title+'»?',
   'Esto es lo confirmado hasta ahora: '+title+'.',
   'Así comienza la historia de «'+title+'».'
  ];
 };
 function hookPanel(){
  const p=project();if(!p||!tabBody||!el('autoScript')||tabBody.querySelector('.boceto-hook-panel'))return;
  const container=document.createElement('section');container.className='boceto-hook-panel';
  container.innerHTML='<div class="boceto-hook-title"><h3>Guion del video ('+Math.round(p.duration)+' segundos)</h3></div>'+
   '<div class="boceto-story-summary"><div class="boceto-story-photo"><span>🎬</span></div><div><b></b><small></small></div></div>'+
   '<h3 class="boceto-hook-prompt">4 Ganchos (elige uno)</h3><fieldset class="boceto-hook-choices"><legend class="sr-only">Opciones de gancho</legend></fieldset>'+
   '<button type="button" class="boceto-primary boceto-use-hook">✓ &nbsp; Usar este gancho</button>';
  container.querySelector('.boceto-story-summary b').textContent=p.title;
  container.querySelector('.boceto-story-summary small').textContent=p.duration+' segundos · '+p.scenes.length+' escenas';
  const cover=window.facelessCoverCache?.get(p.id);
  if(cover){const img=document.createElement('img');img.src=cover;img.alt='Portada del proyecto';container.querySelector('.boceto-story-photo').replaceChildren(img);}
  const choices=hookVariants(p);
  const options=container.querySelector('.boceto-hook-choices');
  choices.forEach((value,i)=>{
   const label=document.createElement('label');label.className='boceto-hook-option'+(i===0?' selected':'');
   const input=document.createElement('input');input.type='radio';input.name='bocetoSelectedHook';input.value=String(i);input.checked=i===0;
   input.onchange=()=>options.querySelectorAll('.boceto-hook-option').forEach(x=>x.classList.toggle('selected',x.contains(input)));
   const text=document.createElement('span');text.textContent=value;label.append(input,text);options.append(label);
  });
  const old=tabBody.querySelector('.detail');
  old?.before(container);
  if(old&&!old.closest('.boceto-script-advanced')){
   const details=document.createElement('details');details.className='boceto-script-advanced';
   const summary=document.createElement('summary');summary.textContent='✎ Editar la narración completa';
   details.append(summary);old.before(details);details.append(old);
  }
  const apply=()=>{
   const i=Number(container.querySelector('input:checked')?.value||0);
   const chosen=choices[i];p.selectedHook=chosen;p.hook=chosen;if(p.scenes[0])p.scenes[0].text=chosen;
   p.narration=p.scenes.map(s=>s.text).join('\n');
   delete p.subtitleCues;delete p.subtitleTextSignature;
   if(typeof persist==='function')persist();
   el('autoScript').value=p.narration;
   container.querySelector('.boceto-use-hook').textContent='✓ Gancho integrado al guion';
   if(typeof toast==='function')toast('Gancho guardado en la escena 1.');
  };
  container.querySelector('.boceto-use-hook').onclick=apply;
 }
 
 // Editor de escenas: usar los recursos reales, no una imagen de ejemplo falsa.
 function strengthenSceneEditor(){
  const p=project(),scene=tabBody?.querySelector('.ref-scene-editor');if(!p||!scene||scene.dataset.bocetoReady)return;
  scene.dataset.bocetoReady='true';
  const intro=document.createElement('p');intro.className='boceto-editor-note';
  intro.textContent='Selecciona una escena para ver su contenido, editarla y cambiar su movimiento.';
  scene.prepend(intro);
  const picture=scene.querySelector('.ref-media-display');
  if(picture&&!picture.querySelector('.boceto-video-controls')){
   const bar=document.createElement('div');bar.className='boceto-video-controls';
   bar.innerHTML='<button type="button" aria-label="Abrir vista previa">▶</button><span></span><small>'+('0:00 / '+Math.floor(p.duration/60)+':'+String(Math.floor(p.duration%60)).padStart(2,'0'))+'</small>';
   bar.querySelector('button').onclick=()=>{
    nativeTabs?.querySelector('[data-tab="video"]')?.click();
    requestAnimationFrame(()=>el('previewVideo')?.click());
   };
   picture.append(bar);
   // Un fotograma REAL del motor de video: no sustituirlo por un cartel simulado.
   const preview=document.createElement('canvas');preview.className='boceto-scene-preview';
   preview.width=640;preview.height=360;
   preview.setAttribute('aria-label','Fotograma del montaje del proyecto');
   picture.prepend(preview);
   const redraw=()=>{
    const index=Number(scene.querySelector('.ref-scene-thumb.active')?.dataset.index||0);
    const item=p.scenes[index];if(!item)return;
    try{
     if(typeof drawFrame!=='function'||typeof canvas==='undefined')return;
     drawFrame(index,item.time+Math.min(1,item.duration*.25));
     const c=preview.getContext('2d');if(!c)return;
     c.fillStyle='#0b0719';c.fillRect(0,0,preview.width,preview.height);
     const scale=Math.min(preview.width/canvas.width,preview.height/canvas.height);
     const w=canvas.width*scale,h=canvas.height*scale;
     c.drawImage(canvas,(preview.width-w)/2,(preview.height-h)/2,w,h);
     const empty=picture.querySelector('.ref-media-empty');
     const still=picture.querySelector('img');
     if(empty)empty.hidden=true;if(still)still.hidden=true;
     preview.dataset.ready='true';
    }catch{}
   };
   scene.querySelector('.ref-timeline')?.addEventListener('click',()=>queueMicrotask(redraw));
   redraw();
  }
 }
 function updateProjectCards(){
  if(document.body.dataset.screen!=='projects')return;
  const items=el('projectsList');if(!items)return;
  for(const card of items.querySelectorAll('.project')){
   const header=card.querySelector('h3');
   if(!header||card.querySelector('.boceto-project-status'))continue;
   const id=card.querySelector('[data-project="open"]')?.dataset.id;
   const p=typeof projects!=='undefined'?projects.find(p=>p.id===id):null;
   if(!p)continue;
   const intro=document.createElement('div');intro.className='boceto-project-status';
   const valid=p.scenes?.length>0&&p.scenes.every(s=>String(s.text||'').trim());
   intro.textContent=valid?'✓ Guion listo para editar':'✎ Borrador';
   intro.classList.toggle('ready',valid);
   const before=card.querySelector('.project-bottom');before?.before(intro);
   const json=card.querySelector('[data-project="download"]');if(json)json.title='Descargar respaldo JSON (no video MP4)';
  }
 }
 let busy=false;
 function update(){
  if(busy)return;busy=true;
  queueMicrotask(()=>{
   busy=false;
   if(document.body.dataset.screen==='editor'){hookPanel();strengthenSceneEditor();}
   if(document.body.dataset.screen==='projects')updateProjectCards();
  });
 }
 new MutationObserver(update).observe(tabBody,{childList:true});
 new MutationObserver(update).observe(el('projectsList'),{childList:true});
 new MutationObserver(update).observe(document.body,{attributes:true,attributeFilter:['data-screen']});
 update();
})();
