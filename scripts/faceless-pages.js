/* Faceless 2026: complementa Crear, Explorar, Editar y Proyectos, sin sustituir motores. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const create=$('create'),discover=$('discover'),editor=$('editor'),projectsPage=$('projects'),tabBody=$('tabBody'),projectList=$('projectsList');
if(!create||!discover||!editor||!projectsPage||!tabBody||!projectList)return;

// CREAR: entrada limpia desde una idea propia. Conserva el planificador anterior.
create.classList.add('fc-complete-create');
const creator=create.querySelector('.fc-create-box');
if(creator){
  const banner=document.createElement('div');
  banner.className='fc-creator-banner';
  banner.innerHTML='<div class="fc-creator-kicker">✦ TU ESTUDIO</div><h2>Empieza con lo que tienes</h2><p>Escribe un guion o trae tus videos. Faceless se encarga de organizar la producción.</p>';
  creator.before(banner);
  const text=creator.querySelector('#fcOwnIdea');
  if(text){text.setAttribute('aria-label','Escribe el tema, una idea o el guion para tu nuevo video');text.placeholder='Escribe el tema, tu idea o pega un guion completo…';}
  const actions=creator.querySelector('.fc-create-actions');
  if(actions){
    const hints=document.createElement('div');
    hints.className='fc-creation-hints';
    hints.innerHTML='<span>✦ Guion asistido</span><span>▣ Archivos propios</span><span>⌁ Sincronización</span>';
    actions.after(hints);
  }
}
// EXPLORAR: el generador existente sigue funcionando, pero con la jerarquía de la portada.
const menu=discover.querySelector('.studio-menu-view');
if(menu){
  const eyebrow=document.createElement('div');eyebrow.className='fc-discover-kicker';eyebrow.textContent='✦ DESCUBRIR';
  const title=menu.querySelector('.compact-title');title?.before(eyebrow);
  if(title)title.textContent='Encuentra tu próxima historia';
  const intro=menu.querySelector('.studio-intro');
  if(intro)intro.textContent='Busca cualquier tema. Verás propuestas con sinopsis para elegir qué convertir en video.';
  const caption=document.createElement('p');caption.className='fc-search-note';
  caption.textContent='Una búsqueda inteligente para noticias, farándula, relatos y documentales.';
  menu.querySelector('.compact-search')?.after(caption);
  const advanced=menu.querySelector('#studioVideoOptions');
  if(advanced){const summary=advanced.querySelector('summary');summary?.setAttribute('aria-label','Personalizar duración, narrador, estilo y acceso');}
  discover.querySelector('#studioCards')?.setAttribute('aria-label','Resultados de noticias o propuestas');
  const status=$('studioStatus');
  if(status)status.setAttribute('role','status');
  function refreshDiscover(){
    const isNews=$('studioMode')?.value==='news',isFactual=$('studioMode')?.value==='factual';
    discover.classList.toggle('fc-discover-news',isNews);
    discover.classList.toggle('fc-discover-factual',isFactual);
    discover.classList.toggle('fc-discover-creative',!isNews&&!isFactual);
    const category=$('studioGenre')?.value||'';
    const heading=discover.querySelector('.compact-title');
    if(heading)heading.textContent=isNews?(category==='Farándula'?'Farándula y entretenimiento':'Noticias reales'):isFactual?'Historias para aprender':'Encuentra tu próxima historia';
    const intro=discover.querySelector('.studio-intro');
    if(intro)intro.textContent=isNews?'Busca un artista, noticia, ciudad o acontecimiento. Solo resultados con fuentes.':isFactual?'Documentales, historia y conocimientos con referencias.':'Elige un tema y descubre relatos originales para producir.';
    const btn=$('studioGenerate');
    if(btn&&!btn.disabled)btn.textContent=isNews?'Buscar noticias reales':isFactual?'Explorar temas':'Generar 10 propuestas';
  }
  ['studioGenre','studioMode','studioSource'].forEach(id=>$(id)?.addEventListener('change',()=>queueMicrotask(refreshDiscover)));
  discover.querySelectorAll('[data-menu]').forEach(node=>node.addEventListener('click',()=>queueMicrotask(refreshDiscover)));
  new MutationObserver(refreshDiscover).observe(discover,{attributes:true,attributeFilter:['class']});
  refreshDiscover();
}

// PROYECTOS: solo se muestran estados comprobables. No inventamos MP4 descargables.
const heading=projectsPage.querySelector('.screen-head h1');
if(heading)heading.textContent='Mis proyectos';
const subtitle=projectsPage.querySelector('.screen-head p');
if(subtitle)subtitle.textContent='Continúa una historia, edita tus escenas o guarda un respaldo.';
const search=$('search');
if(search)search.placeholder='Buscar proyectos por nombre o tema…';
const statusFilter=document.createElement('div');statusFilter.className='fc-project-status';
statusFilter.innerHTML='<label for="fcProjectStatus">Estado del guion</label><select id="fcProjectStatus"><option value="all">Todos</option><option value="ready">Guion preparado</option><option value="draft">Por completar</option></select>';
const toolbar=projectsPage.querySelector('.fc-project-tools');
if(toolbar)toolbar.append(statusFilter);else projectList.before(statusFilter);
const filter=$('fcProjectStatus');
function statusOf(project){
  return Array.isArray(project?.scenes)&&project.scenes.length>0&&project.scenes.every(s=>String(s?.text||'').trim())?'ready':'draft';
}
let decorating=false;
function decorateProjects(){
  if(decorating)return;
  decorating=true;
  try{
    const data=typeof projects!=='undefined'&&Array.isArray(projects)?projects:[];
    projectList.querySelectorAll('.project[data-cover-project]').forEach(card=>{
      const id=card.dataset.coverProject;
      const p=data.find(item=>String(item.id)===id);
      if(!p)return;
      const ready=statusOf(p)==='ready',isFav=card.querySelector('.fc-bookmark')?.getAttribute('aria-pressed')==='true';
      if(!card.querySelector('.fc-project-thumb')){
        const thumb=document.createElement('div');thumb.className='fc-project-thumb';
        thumb.setAttribute('aria-label','Portada del proyecto');
        const cover=window.facelessCoverCache?.get(id)||window.facelessProjectPhotos?.(id)?.get(0)?.src||'';
        if(typeof cover==='string'&&(cover.startsWith('blob:')||cover.startsWith('data:image/'))){
          const img=document.createElement('img');img.src=cover;img.alt='Portada de '+p.title;img.loading='lazy';thumb.append(img);
          img.onerror=()=>{img.remove();thumb.classList.add('fc-project-no-photo');thumb.textContent='▣ Vista de proyecto'};
        }else{thumb.classList.add('fc-project-no-photo');thumb.innerHTML='<span aria-hidden="true">▣</span><small>Proyecto sin miniatura</small>';}
        card.prepend(thumb);
      }
      let badge=card.querySelector('.fc-project-state');
      if(!badge){badge=document.createElement('span');badge.className='fc-project-state';card.querySelector('.pill-row')?.prepend(badge);}
      badge.classList.toggle('ready',ready);badge.textContent=ready?'✓ Guion preparado':'◷ Borrador';
      const open=card.querySelector('[data-project="open"]');if(open)open.textContent=ready?'Continuar editando':'Continuar';
      const ptag=card.querySelector('p.spec');if(ptag&&!ptag.dataset.fcDone){
        ptag.dataset.fcDone='1';
        ptag.textContent=Number(p.duration||0)+' s · '+new Date(p.date||Date.now()).toLocaleDateString('es-DO')+' · '+p.scenes.length+' escenas';
      }
      const pass=filter.value==='all'||filter.value===(ready?'ready':'draft');
      card.classList.toggle('fc-filtered-out',!pass);
    });
  }finally{decorating=false;}
}
filter.addEventListener('change',decorateProjects);
new MutationObserver(decorateProjects).observe(projectList,{childList:true});
new MutationObserver(decorateProjects).observe(projectsPage,{attributes:true,attributeFilter:['class']});
queueMicrotask(decorateProjects);

// EDITOR: cuatro pasos reales, no dos que lleven a la misma pestaña.
const steps=editor.querySelector('.fc-steps');
if(steps){
  const names={narration:'Guion',scenes:'Escenas',subs:'Subtítulos',video:'Video'};
  const values=['narration','scenes','subs','video'];
  [...steps.querySelectorAll('[data-fc-step]')].forEach((b,i)=>{
    b.dataset.fcStep=values[i];
    const title=b.querySelector('span');if(title)title.textContent=names[values[i]];
  });
  function reflectTab(){
    const selected=editor.querySelector('.tabs button.on')?.dataset.tab||'summary';
    steps.querySelectorAll('[data-fc-step]').forEach(b=>{
      const active=b.dataset.fcStep===selected||(selected==='summary'&&b.dataset.fcStep==='narration');
      b.classList.toggle('on',active);
      if(active)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');
    });
  }
  new MutationObserver(reflectTab).observe(editor.querySelector('.tabs'),{subtree:true,attributes:true,attributeFilter:['class']});
  reflectTab();
}
editor.classList.add('fc-editor-complete');
const editHeading=editor.querySelector('#editorTitle');
if(editHeading)editHeading.setAttribute('aria-live','polite');
// Timeline is generated from real scene timing, without suggesting AI clips already exist.
function mountTimeline(){
  const target=tabBody.querySelector('.compact-video-editor');
  if(!target||tabBody.querySelector('.fc-video-timeline')||!current()?.scenes?.length)return;
  const p=current(),timeline=document.createElement('section');
  timeline.className='fc-video-timeline';
  const top=document.createElement('div');top.className='fc-timeline-head';
  const h=document.createElement('h3');h.textContent='Tu video, escena por escena';
  const meta=document.createElement('span');meta.textContent=p.scenes.length+' escenas · '+Number(p.duration.toFixed(1))+' segundos';
  meta.className='fc-timeline-meta';
  const heroJump=document.createElement('button');heroJump.type='button';heroJump.className='fc-timeline-hero-jump';
  heroJump.textContent='🎬 Hero Video';heroJump.title='Ir a la introducción cinematográfica';
  heroJump.onclick=()=>{const p=document.getElementById('finalHeroPanel');p?.scrollIntoView({block:'center',behavior:'smooth'});p?.querySelector('#finalHeroAdd')?.focus({preventScroll:true});};
  top.append(h,meta,heroJump);timeline.append(top);
  const track=document.createElement('div');track.className='fc-timeline-track';
  p.scenes.forEach((scene,i)=>{
    const btn=document.createElement('button');btn.type='button';btn.className='fc-timeline-scene';
    const stamp=n=>Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
    btn.style.flex='0 0 90px';
    const number=document.createElement('span');number.className='fc-timeline-number';number.textContent=String(i+1);
    const range=document.createElement('span');range.className='fc-timeline-range';range.textContent=stamp(scene.time)+'–'+stamp(scene.time+scene.duration);
    btn.append(number,range);
    if(i===0){const mark=document.createElement('span');mark.className='fc-timeline-hero';btn.append(mark);}
    btn.title='Editar escena '+(i+1)+', '+Number(scene.duration.toFixed(1))+' segundos';
    btn.setAttribute('aria-label',btn.title);
    btn.onclick=()=>{
      editor.querySelector('.tabs [data-tab="scenes"]')?.click();
      queueMicrotask(()=>document.getElementById('s'+i)?.focus({preventScroll:false}));
    };
    track.append(btn);
  });timeline.append(track);
  const note=document.createElement('p');note.textContent='Toca un segmento para editar su guion. Las fotografías pueden animarse con zoom y paneos sin usar IA.';timeline.append(note);
  tabBody.prepend(timeline);
  window.facelessUpdateHeroTimeline=()=>{
    const scene=timeline.querySelector('.fc-timeline-scene');
    const label=scene?.querySelector('.fc-timeline-hero');
    const ready=window.facelessHeroStatus?.().loaded&&current()?.id===p.id;
    if(scene)scene.classList.toggle('has-hero',!!ready);
    if(label)label.textContent=ready?'🎬 Hero '+(p.heroDuration||6)+'s':'';
    heroJump.textContent=ready?'🎬 Editar Hero':'🎬 Añadir Hero';
  };
  window.facelessUpdateHeroTimeline();
}
new MutationObserver(mountTimeline).observe(tabBody,{childList:true});
mountTimeline();
})();
