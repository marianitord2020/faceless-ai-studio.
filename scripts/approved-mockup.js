/* Faceless — diseño visual aprobado (sin Pro). Conserva el motor existente. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const home=$('home'),explore=$('discover'),create=$('create'),projectsPage=$('projects'),editor=$('editor');
if(!home||!explore||!create||!projectsPage||!editor)return;
const asset=name=>'assets/mockup/'+name;
const allStyles=[
  {id:'2d',name:'2D',image:asset('2d.svg')},
  {id:'anime',name:'Anime',image:asset('anime.svg')},
  {id:'3d',name:'3D',image:asset('3d.svg')},
  {id:'cinematic',name:'Cinematográfica',image:asset('cinematic.webp')},
  {id:'hyperreal',name:'Realista',image:asset('realista.webp')},
  {id:'cartoon',name:'Caricatura',image:asset('3d.svg')},
  {id:'historical',name:'Histórica',image:asset('documentales.webp')}
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let style='cinematic';
try{const stored=localStorage.getItem('fc-visual-style');if(allStyles.some(s=>s.id===stored))style=stored}catch{}
const cats=[
 {id:'noticias',name:'Noticias',icon:'▤',photo:'news.webp'},
 {id:'farandula',name:'Farándula',icon:'☆',photo:'farandula.webp'},
 {id:'relatos',name:'Relatos',icon:'▣',photo:'relatos.webp'},
 {id:'documentales',name:'Documentales',icon:'▥',photo:'documentales.webp'}
];
function styleTiles(limit=5){
 return allStyles.slice(0,limit).map(s=>'<button class="fcx-style '+(style===s.id?'selected':'')+'" data-fcx-style="'+s.id+'" type="button" aria-pressed="'+String(style===s.id)+'"><img src="'+s.image+'" alt="" loading="lazy"><span>'+esc(s.name)+'</span></button>').join('');
}
home.classList.add('fcx-home');
home.innerHTML='<section class="fcx-hero" aria-label="Crea videos con Faceless">'+
 '<div class="fcx-hero-content"><div class="fcx-hero-brand">✦ TU ESTUDIO CON IA</div><h1>Convierte ideas<br>en <em>videos virales</em></h1><p>Noticias, farándula, relatos, documentales y más, con el poder de la IA.</p></div>'+
 '<img class="fcx-robot" src="'+asset('../mockup-robot.svg')+'" alt="Robot violeta de Faceless AI Studio">'+
 '</section>'+
 '<form id="fcxHomeSearch" class="fcx-home-search" role="search"><span class="fcx-search-icon" aria-hidden="true">⌕</span><input id="fcxHomeQuery" placeholder="Busca un tema, noticia o historia..." aria-label="Buscar historia o noticia" maxlength="220"><button type="submit" aria-label="Buscar">⌕</button></form>'+
 '<section aria-label="Categorías" class="fcx-category-grid">'+cats.map(c=>'<button type="button" class="fcx-category" data-fc-category="'+c.id+'"><img src="'+asset(c.photo)+'" alt="" loading="lazy"><span class="fcx-category-name"><i aria-hidden="true">'+c.icon+'</i>'+c.name+'</span></button>').join('')+'</section>'+
 '<section class="fcx-quick-menu" aria-label="Descubrir"><button type="button" data-fc-category="tendencias"><span aria-hidden="true">🔥</span>Tendencias</button><button type="button" data-fc-category="ideas"><span aria-hidden="true">💡</span>Ideas</button><button type="button" data-fc-nav="favorites"><span aria-hidden="true">♥</span>Favoritos</button></section>'+
 '<section class="fcx-style-home" aria-labelledby="fcxStyleHeading"><div class="fcx-section-head"><h2 id="fcxStyleHeading">Estilo visual</h2><button type="button" data-fcx-open-styles>Ver más ›</button></div><div class="fcx-style-row">'+styleTiles()+'</div></section>'+
 '<button class="fcx-create-btn" type="button" data-route="create"><b aria-hidden="true">＋</b>Crear video nuevo<span aria-hidden="true">›</span></button>'+
 '<section class="fcx-recommended" aria-label="Ideas visuales"><div class="fcx-section-head"><h2>Recomendados para ti</h2><button type="button" data-fc-category="ideas">Ver más ›</button></div>'+
 '<div class="fcx-rec-grid"><button type="button" data-fc-category="ideas" aria-label="Ideas de viajes"><img src="'+asset('travel.webp')+'" alt="Paisaje tropical"></button><button type="button" data-fc-category="relatos" aria-label="Ideas misteriosas"><img src="'+asset('ufo.webp')+'" alt="Cielo misterioso"></button><button type="button" data-fc-category="relatos" aria-label="Relatos de misterio"><img src="'+asset('mystery.webp')+'" alt="Escena misteriosa"></button></div></section>';

const styleModal=document.createElement('dialog');styleModal.id='fcxStyleModal';styleModal.className='fcx-style-modal';
styleModal.innerHTML='<header><h2>Elige tu estilo visual</h2><button type="button" data-fcx-close aria-label="Cerrar">✕</button></header><p>Selecciona la apariencia de las imágenes de tu próximo video.</p><div class="fcx-modal-styles">'+styleTiles(allStyles.length)+'</div><button class="fcx-create-btn" type="button" data-fcx-close>Continuar ✓</button>';
document.body.appendChild(styleModal);
styleModal.addEventListener('click',e=>{
 const tile=e.target.closest('[data-fcx-style]');if(tile){setStyle(tile.dataset.fcxStyle);return}
 if(e.target.closest('[data-fcx-close]'))styleModal.close();
});
function setStyle(id){
 if(!allStyles.some(s=>s.id===id))return;
 style=id;try{localStorage.setItem('fc-visual-style',id)}catch{}
 document.querySelectorAll('[data-fcx-style]').forEach(btn=>{
   const on=btn.dataset.fcxStyle===id;btn.classList.toggle('selected',on);btn.setAttribute('aria-pressed',String(on));
 });
 const select=$('studioImageStyle');
 if(select&&Array.from(select.options).some(o=>o.value===id)){select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}))}
}
home.addEventListener('click',e=>{
 const tile=e.target.closest('[data-fcx-style]');if(tile)setStyle(tile.dataset.fcxStyle);
 if(e.target.closest('[data-fcx-open-styles]'))styleModal.showModal();
});
$('fcxHomeSearch').addEventListener('submit',e=>{
 e.preventDefault();
 const value=$('fcxHomeQuery').value.trim();
 if(typeof route==='function')route('discover');
 if(typeof window.facelessShowStudioMenu==='function')window.facelessShowStudioMenu();
 const field=$('studioTopic');
 if(field){field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));field.focus({preventScroll:true})}
});
// The original home click delegate still routes category buttons into the real generator.
document.addEventListener('click',e=>{
 if(e.target.closest('.fcx-home [data-route]'))return;
 const btn=e.target.closest('.fcx-home [data-fc-nav=favorites]');
 if(btn&&typeof route==='function')return; // favorites handled by original implementation.
},false);

// Navigation: match five icons from the approved reference. Existing four handlers remain.
const nav=document.querySelector('.fc-bottom');
if(nav){
 nav.innerHTML='<button type="button" data-fc-nav="home"><span aria-hidden="true">⌂</span>Inicio</button>'+
 '<button type="button" data-fc-nav="explore"><span aria-hidden="true">⌕</span>Explorar</button>'+
 '<button type="button" data-fc-nav="create" class="fcx-nav-create"><span aria-hidden="true">＋</span>Crear</button>'+
 '<button type="button" data-fc-nav="projects"><span aria-hidden="true">▱</span>Proyectos</button>'+
 '<button type="button" data-fc-nav="profile"><span aria-hidden="true">♙</span>Perfil</button>';
 nav.addEventListener('click',e=>{
  const b=e.target.closest('[data-fc-nav=explore]');
  if(b){e.stopPropagation();if(typeof route==='function')route('discover')}
 });
 const refresh=()=>{
  const currentPage=document.body.dataset.screen;
  nav.querySelectorAll('button').forEach(b=>{
   const on=currentPage==='discover'?b.dataset.fcNav==='explore':b.dataset.fcNav===currentPage;
   if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  });
 };
 new MutationObserver(refresh).observe(document.body,{attributes:true,attributeFilter:['data-screen']});
 refresh();
}
// Discover is visual-only: no fabricated headlines, counts, ages or videos.
explore.classList.add('fcx-explore');
const discoverMenu=explore.querySelector('.studio-menu-view');
if(discoverMenu){
 const head=document.createElement('div');head.className='fcx-explore-header';
 head.innerHTML='<button type="button" data-route="home" aria-label="Volver a Inicio">‹</button><strong>Explorar historias</strong>';
 discoverMenu.prepend(head);
 const title=discoverMenu.querySelector('.compact-title');if(title)title.classList.add('fcx-discover-title');
 const recommendations=document.createElement('div');recommendations.className='fcx-discover-chips';
 recommendations.innerHTML='<button type="button" data-fcx-genre="all" class="active">Todo</button><button type="button" data-fcx-genre="Noticias">Noticias</button><button type="button" data-fcx-genre="Farándula">Farándula</button><button type="button" data-fcx-genre="Misterio">Relatos</button><button type="button" data-fcx-genre="Historia">Documentales</button>';
 head.after(recommendations);
 recommendations.addEventListener('click',e=>{
  const b=e.target.closest('[data-fcx-genre]');if(!b)return;
  const id=b.dataset.fcxGenre;
  if(id!=='all'){
    const genre=$('studioGenre');if(genre){genre.value=id;genre.dispatchEvent(new Event('change',{bubbles:true}))}
  }
  recommendations.querySelectorAll('button').forEach(el=>el.classList.toggle('active',el===b));
 });
}
// Projects filtering represented only by real project data; avoid inventing "completed" status.
const projectsHeading=projectsPage.querySelector('.screen-head h1');if(projectsHeading)projectsHeading.textContent='▱ Mis proyectos';
const filter=$('fcProjectStatus');
const pButtons=document.createElement('div');pButtons.className='fcx-project-tabs';
pButtons.innerHTML='<button type="button" class="active" data-fcx-filter="all">Todos</button><button type="button" data-fcx-filter="ready">Guion listo</button><button type="button" data-fcx-filter="draft">Borradores</button>';
projectsPage.querySelector('.screen-head')?.after(pButtons);
pButtons.addEventListener('click',e=>{
 const b=e.target.closest('[data-fcx-filter]');if(!b)return;
 pButtons.querySelectorAll('button').forEach(el=>el.classList.toggle('active',el===b));
 if(filter){filter.value=b.dataset.fcxFilter;filter.dispatchEvent(new Event('change',{bubbles:true}))}
});
if(filter)filter.parentElement.closest('.fc-project-status').hidden=true;
const toolbar=projectsPage.querySelector('.fc-project-tools');if(toolbar)toolbar.classList.add('fcx-hide-status-toolbar');
const search=$('search');if(search)search.placeholder='⌕  Buscar proyecto…';
const makeButton=projectsPage.querySelector('.screen-head [data-route]');if(makeButton)makeButton.textContent='＋ Nuevo proyecto';

// Editor: mockup’s purple stepper, hero panels, controls and real photo-style tiles.
const tabs=editor.querySelector('.fc-steps');
if(tabs)tabs.classList.add('fcx-stepper');
const videoSection=editor.querySelector('#tabBody');
const existingSummary=editor.querySelector('.editor-hero');
if(existingSummary)existingSummary.classList.add('fcx-edit-heading');
function augmentEditor(){
 const p=typeof current==='function'?current():null;
 if(!p||document.body.dataset.screen!=='editor')return;
 const videoTab=editor.querySelector('.tabs button.on')?.dataset.tab;
 const tools=editor.querySelector('#fcx-visual-toolbar');
 if(videoTab==='video'){
   if(!tools){
     const wrap=document.createElement('section');wrap.id='fcx-visual-toolbar';wrap.className='fcx-editor-style';
     wrap.innerHTML='<h3>Estilo visual</h3><div class="fcx-style-row">'+styleTiles()+'</div>';
     const stage=editor.querySelector('.fc-video-timeline')||videoSection.firstElementChild;
     stage?.before(wrap);
     wrap.addEventListener('click',e=>{const b=e.target.closest('[data-fcx-style]');if(b){setStyle(b.dataset.fcxStyle);p.imageStyle=style;if(typeof persist==='function')persist()}});
   }
 }else if(tools)tools.remove();
}
new MutationObserver(augmentEditor).observe(videoSection,{childList:true});
new MutationObserver(augmentEditor).observe(document.body,{attributes:true,attributeFilter:['data-screen']});
augmentEditor();
// Set saved visual style as the generator's default without changing other settings.
setStyle(style);
})();
