/* Capa final de interfaz: conserva los controles y servicios originales. */
(() => {
 'use strict';
 const get=id=>document.getElementById(id);
 const home=get('home'),create=get('create');
 if(!home||!create)return;
 home.classList.add('fc-home');
 home.innerHTML=`
 <section class="fc-hero">
  <div class="fc-kicker">✦ Tu estudio creativo con IA</div>
  <h1>Convierte ideas en <span>videos que atrapan</span></h1>
  <p>Noticias reales, farándula, relatos, documentales y aprendizaje. Elige una historia y hazla tuya.</p>
  <button type="button" class="fc-primary" data-fc-category="noticias"><span>⚡ Noticias de hoy</span><span aria-hidden="true">›</span></button>
 </section>
 <h2 class="fc-card-heading">¿Qué te gustaría contar?</h2>
 <div class="fc-categories">
  <button type="button" class="fc-category" data-category="noticias" data-fc-category="noticias"><span class="fc-art" aria-hidden="true">🌆</span><strong>Noticias</strong><small>Actualidad con fuentes</small></button>
  <button type="button" class="fc-category" data-category="farandula" data-fc-category="farandula"><span class="fc-art" aria-hidden="true">🎤</span><strong>Farándula</strong><small>Artistas y entretenimiento</small></button>
  <button type="button" class="fc-category" data-category="relatos" data-fc-category="relatos"><span class="fc-art" aria-hidden="true">🌒</span><strong>Relatos</strong><small>Misterio, amor y ficción</small></button>
  <button type="button" class="fc-category" data-category="documentales" data-fc-category="documentales"><span class="fc-art" aria-hidden="true">🏛️</span><strong>Documentales</strong><small>Historia, ciencia y hechos</small></button>
  <button type="button" class="fc-category" data-category="aprender" data-fc-category="aprender"><span class="fc-art" aria-hidden="true">🧠</span><strong>Aprender</strong><small>Ideas y conocimientos</small></button>
  <button type="button" class="fc-category" data-category="tendencias" data-fc-category="tendencias"><span class="fc-art" aria-hidden="true">🔥</span><strong>Tendencias</strong><small>Encuentra temas recientes</small></button>
 </div>
 <div class="fc-shortcuts">
  <button type="button" class="fc-quick" data-fc-category="tendencias"><span class="fc-symbol" aria-hidden="true">🔥</span>Tendencias</button>
  <button type="button" class="fc-quick" data-fc-category="ideas"><span class="fc-symbol" aria-hidden="true">💡</span>Ideas</button>
  <button type="button" class="fc-quick" data-fc-nav="favorites"><span class="fc-symbol" aria-hidden="true">♡</span>Favoritos</button>
 </div>`;
 const h=create.querySelector('.screen-head h1'),sub=create.querySelector('.screen-head p');
 if(h)h.textContent='✦ Nuevo proyecto';
 if(sub)sub.textContent='Tu idea o tus archivos, sin repetir las categorías de Inicio.';
 const original=create.querySelector('.form-card');
 if(original){
  const details=document.createElement('details');details.className='fc-legacy-options';
  const summary=document.createElement('summary');summary.textContent='⚙ Planificador clásico y opciones adicionales';
  original.before(details);details.append(summary,original);
 }
 const box=document.createElement('section');box.className='fc-create-box';
 box.innerHTML=`<label for="fcOwnIdea">Tu idea o guion</label>
 <textarea id="fcOwnIdea" placeholder="Escribe tu idea, pega un guion o describe el video que quieres crear…"></textarea>
 <div class="fc-create-actions">
  <button class="btn primary" id="fcStartAi" type="button">✦ Continuar con IA</button>
  <a class="btn" href="editar-sin-ia/" data-flow="manual">▣ Subir y editar archivos</a>
 </div>
 <p class="hint">Puedes comenzar con el campo vacío. Tus herramientas anteriores siguen disponibles.</p>`;
 const details=create.querySelector('.fc-legacy-options');
 if(details)details.before(box);else create.append(box);
 const isBusy=()=>typeof facelessIsWorking==='function'&&facelessIsWorking();
 const go=name=>{if(isBusy()){if(typeof toast==='function')toast('Detén o termina primero la operación actual.');return false}route(name);return true};
 function setSelect(id,value){
  const s=get(id);if(!s||!Array.from(s.options||[]).some(o=>o.value===value))return;
  s.value=value;s.dispatchEvent(new Event('change',{bubbles:true}));
 }
 function openCategory(kind,idea){
  window.facelessFlow='ai';document.body.dataset.flow='ai';
  if(!go('discover'))return;
  if(window.facelessShowStudioMenu)window.facelessShowStudioMenu();
  const presets={
   noticias:['news','Noticias','Noticias de República Dominicana hoy'],
   farandula:['news','Farándula','Farándula dominicana hoy'],
   relatos:['fiction','Misterio',''],
   documentales:['factual','Historia',''],
   aprender:['factual','Educativo',''],
   tendencias:['news','Noticias','Noticias y tendencias recientes de República Dominicana'],
   ideas:['fiction','Fantasía','']
  };
  const vals=presets[kind]||presets.ideas;
  setSelect('studioMode',vals[0]);setSelect('studioGenre',vals[1]);setSelect('studioSource','ai');
  const topic=get('studioTopic');
  if(topic){topic.value=idea||vals[2];topic.dispatchEvent(new Event('input',{bubbles:true}));if(!topic.value)topic.focus({preventScroll:true});}
 }
 home.addEventListener('click',e=>{const b=e.target.closest('[data-fc-category]');if(b)openCategory(b.dataset.fcCategory)});
 get('fcStartAi')?.addEventListener('click',()=>openCategory('ideas',get('fcOwnIdea').value.trim()));
 const nav=document.createElement('nav');nav.className='fc-bottom';nav.setAttribute('aria-label','Navegación principal móvil');
 nav.innerHTML=`
 <button type="button" data-fc-nav="home"><span aria-hidden="true">⌂</span>Inicio</button>
 <button type="button" data-fc-nav="create"><span aria-hidden="true">⊕</span>Crear</button>
 <button type="button" data-fc-nav="projects"><span aria-hidden="true">▣</span>Proyectos</button>
 <button type="button" data-fc-nav="profile"><span aria-hidden="true">♙</span>Perfil</button>`;
 document.body.append(nav);
 const profile=document.createElement('dialog');profile.className='fc-profile-dialog';
 profile.innerHTML=`<h2>Perfil y ajustes</h2>
 <p>Los proyectos de esta versión se guardan en el navegador. Conserva una copia de seguridad desde Mis proyectos.</p>
 <p>Las preferencias de narración, imagen y exportación están en cada proyecto.</p>
 <button type="button" class="btn primary full" data-fc-close>Cerrar</button>`;
 document.body.append(profile);
 profile.querySelector('[data-fc-close]').onclick=()=>profile.close();
 function syncNav(){
  const current=document.body.dataset.screen||'home';
  nav.querySelectorAll('button').forEach(b=>{
   const on=b.dataset.fcNav===current||(current==='editor'&&b.dataset.fcNav==='projects');
   on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current');
  });
 }
 new MutationObserver(syncNav).observe(document.body,{attributes:true,attributeFilter:['data-screen']});syncNav();
 const key='faceless-favorite-project-ids-v1';
 let saved=new Set();try{saved=new Set(JSON.parse(localStorage.getItem(key)||'[]'))}catch{}
 let favoritesOnly=false;
 const list=get('projectsList');
 if(list){
  const tools=document.createElement('div');tools.className='fc-project-tools';
  tools.innerHTML='<label for="fcFavoritesFilter">Mostrar proyectos</label><select id="fcFavoritesFilter"><option value="all">Todos</option><option value="fav">Solo favoritos</option></select>';
  list.before(tools);
  function refresh(){
   list.querySelectorAll('.project[data-cover-project]').forEach(card=>{
    const id=card.dataset.coverProject;
    if(!card.querySelector('.fc-bookmark')){
     const b=document.createElement('button');b.className='fc-bookmark';b.type='button';b.dataset.fcBookmark=id;b.title='Guardar favorito';
     (card.querySelector('.pill-row')||card).append(b);
    }
    const b=card.querySelector('.fc-bookmark');
    b.textContent=saved.has(id)?'♥':'♡';b.setAttribute('aria-pressed',String(saved.has(id)));
    b.setAttribute('aria-label',saved.has(id)?'Quitar favorito':'Añadir favorito');
    card.hidden=favoritesOnly&&!saved.has(id);
   });
  }
  new MutationObserver(refresh).observe(list,{childList:true});
  list.addEventListener('click',e=>{
   const b=e.target.closest('[data-fc-bookmark]');if(!b)return;
   e.preventDefault();e.stopPropagation();
   const id=b.dataset.fcBookmark;
   saved.has(id)?saved.delete(id):saved.add(id);
   try{localStorage.setItem(key,JSON.stringify([...saved]))}catch{}
   refresh();
  },true);
  get('fcFavoritesFilter').addEventListener('change',e=>{favoritesOnly=e.target.value==='fav';refresh()});
  document.addEventListener('click',e=>{
   const b=e.target.closest('[data-fc-nav]');if(!b)return;
   const action=b.dataset.fcNav;
   if(action==='profile'){profile.showModal();return}
   if(action==='favorites'){favoritesOnly=true;get('fcFavoritesFilter').value='fav';if(go('projects'))refresh();return}
   if(action==='projects'){favoritesOnly=false;get('fcFavoritesFilter').value='all'}
   go(action);
  });
 }
 const mode=document.querySelector('#discover .studio-models');
 const settings=get('studioVideoOptions')?.querySelector('.compact-options-body');
 if(mode&&settings)settings.prepend(mode);
 // Guía visual de cuatro pasos: usa las pestañas originales, sin eliminar herramientas.
 const editor=get('editor'),oldTabs=editor?.querySelector('.tabs');
 if(oldTabs){
  const steps=document.createElement('nav');steps.className='fc-steps';steps.setAttribute('aria-label','Pasos de edición');
  steps.innerHTML='<button type="button" data-fc-step="narration" class="on"><b>1</b><span>Guion</span></button><button type="button" data-fc-step="scenes"><b>2</b><span>Escenas</span></button><button type="button" data-fc-step="style"><b>3</b><span>Estilo</span></button><button type="button" data-fc-step="video"><b>4</b><span>Generar</span></button>';
  oldTabs.before(steps);
  const more=document.createElement('details');more.className='fc-more-tabs';
  const summary=document.createElement('summary');summary.textContent='Más herramientas: resumen, narración y subtítulos';
  oldTabs.before(more);more.append(summary,oldTabs);
  steps.addEventListener('click',e=>{
   const step=e.target.closest('[data-fc-step]');if(!step)return;
   const target=step.dataset.fcStep==='style'?'video':step.dataset.fcStep;
   const tabButton=oldTabs.querySelector('button[data-tab="'+target+'"]');
   if(tabButton){tabButton.click();steps.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===step));}
   if(step.dataset.fcStep==='video')setTimeout(()=>get('renderVideo')?.scrollIntoView({block:'nearest',behavior:'smooth'}),80);
  });
 }

})();
