/* Faceless AI Studio - Boceto final (11 pantallas), interfaz conectada a los motores existentes.
 * No contiene credenciales ni genera contenido simulado. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const A='assets/mockup/';
 const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safeRoute=name=>typeof route==='function'&&route(name);
 const select=(id,value)=>{
  const el=$(id);if(!el||![...el.options].some(o=>o.value===value))return;
  el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));
 };
 document.body.classList.add('final-mockup-v3');
 const home=$('home'),create=$('create'),discover=$('discover'),editor=$('editor'),projects=$('projects');
 if(!home||!create||!discover||!editor||!projects)return;
 const images={
  relatos:'relatos.webp',aprender:'history-sample.webp',actualidad:'news.webp',
  romance:'relatos.webp',misterio:'mystery.webp',terror:'ufo.webp',fantasia:'anime.svg',
  motivacion:'cinematic.webp',salud:'realista.webp',viajes:'travel.webp'
 };
 const tile=(id,label,mode)=>'<button type="button" class="fb-image-tile" data-fb-category="'+id+'" data-fb-kind="'+mode+'"><img src="'+A+images[id]+'" alt="" loading="lazy"><span>'+label+'</span></button>';
 // 1. Inicio: reemplazar por el boceto final, con archivos visuales alojados en GitHub.
 home.classList.remove('fc-home','fcx-home');home.classList.add('fb-home');
 home.innerHTML='<div class="fb-home-hero"><div class="fb-home-hero-copy"><h1>Crea videos increíbles con <em>inteligencia artificial</em></h1><p>Convierte tus ideas en videos profesionales, sin mostrar tu rostro.</p></div><img src="assets/mockup-robot.svg" alt="Asistente creativo de Faceless AI Studio"></div>'+
 '<button class="fb-primary fb-home-cta" type="button" data-route="create">✦ Crear video nuevo <span>→</span></button>'+
 '<div class="fb-section-head"><h2>Explora categorías</h2><button type="button" data-route="create">Ver todas ›</button></div>'+
 '<div class="fb-home-gallery">'+
 '<button type="button" data-fc-category="relatos"><img src="'+A+'mystery.webp" alt="" loading="lazy"><span>Relatos</span></button>'+
 '<button type="button" data-fc-category="aprender"><img src="'+A+'history-sample.webp" alt="" loading="lazy"><span>Aprender</span></button>'+
 '<button type="button" data-fc-category="noticias"><img src="'+A+'news.webp" alt="" loading="lazy"><span>Actualidad</span></button>'+
 '<button type="button" data-fc-category="ideas"><img src="'+A+'cinematic.webp" alt="" loading="lazy"><span>Motivación</span></button>'+
 '<button type="button" data-fc-category="documentales"><img src="'+A+'realista.webp" alt="" loading="lazy"><span>Salud</span></button>'+
 '<button type="button" data-fc-category="documentales"><img src="'+A+'travel.webp" alt="" loading="lazy"><span>Viajes</span></button>'+
 '</div>';
 // Cabecera y navegación inferior sencillas, consistentes en todas las pantallas.
 const topbar=document.querySelector('.topbar .bar');
 if(topbar)topbar.innerHTML='<div class="fb-brand"><img src="assets/final/clapper.svg" alt="" width="35" height="35"><b>Faceless <span>AI Studio</span></b></div><button type="button" data-fc-nav="profile" class="fb-profile" aria-label="Abrir perfil y ajustes">♙</button>';
 const bottom=document.querySelector('.fc-bottom');
 if(bottom)bottom.innerHTML='<button type="button" data-fc-nav="home"><span aria-hidden="true">⌂</span>Inicio</button>'+
 '<button type="button" data-fc-nav="create"><span aria-hidden="true">▣</span>Crear</button>'+
 '<button type="button" data-fc-nav="projects"><span aria-hidden="true">▱</span>Proyectos</button>';
 const syncNav=()=>{
  const screen=document.body.dataset.screen;
  bottom?.querySelectorAll('button').forEach(b=>{
   const on=b.dataset.fcNav===screen||(screen==='editor'&&b.dataset.fcNav==='projects');
   b.toggleAttribute('aria-current',on);if(on)b.setAttribute('aria-current','page');
  });
 };
 new MutationObserver(syncNav).observe(document.body,{attributes:true,attributeFilter:['data-screen']});syncNav();
 // 2. Pantalla Crear: categorías en fotografías y llamada al verdadero generador de propuestas.
 const maker=create.querySelector('.boceto-create');
 if(maker){
  maker.innerHTML='<header class="fb-page-heading"><h1>Tu próximo video</h1></header>'+
  '<div class="fb-step-heading"><b>1</b><h2>Encuentra tu historia</h2></div>'+
  '<label class="fb-topic-box"><span class="sr-only">Tema del video</span><input id="fbTopic" type="text" maxlength="220" placeholder="¿Qué quieres contar?" autocomplete="off"></label>'+
  '<div class="fb-modes" role="group" aria-label="Tipo de contenido"><button type="button" class="active" data-fb-mode="fiction">▤ Relatos</button><button type="button" data-fb-mode="factual">♧ Aprender</button><button type="button" data-fb-mode="news">▣ Actualidad</button></div>'+
  '<div class="fb-genre-gallery" id="fbGenreGallery"></div>'+
  '<div class="fb-step-heading"><b>2</b><h2>Cómo quieres empezar</h2></div>'+
  '<div class="fb-start-modes"><button class="active" type="button" data-fb-flow="ai">✦ Crear con IA <small>Automático</small></button><button type="button" data-fb-flow="manual">✎ Editar yo mismo <small>Manual</small></button></div>'+
  '<details class="fb-settings"><summary>⚙ Ajustes opcionales · 60s · Cinematográfica <span>⌄</span></summary>'+
  '<div class="fb-setting-grid"><label>Duración <select id="fbDuration"><option value="30">30 segundos</option><option selected value="60">60 segundos</option><option value="120">120 segundos</option></select></label>'+
  '<label>Voz <select id="fbVoice"><option value="automatic">Automática</option><option value="female">Femenina</option><option value="male">Masculina</option></select></label>'+
  '<label>Estilo <select id="fbImageStyle"><option value="cinematic">Cinematográfica</option><option value="hyperreal">Realista</option><option value="3d">3D</option><option value="anime">Anime</option><option value="2d">2D</option><option value="cartoon">Caricatura</option><option value="historical">Documental</option></select></label></div></details>'+
  '<button type="button" class="fb-primary fb-generate" id="fbGenerateIdeas">✦ Generar 10 propuestas</button>'+
  '<p class="fb-hint" id="fbGenerateHint">Las noticias utilizarán fuentes verificables; las historias de ficción son creativas.</p>';
  let mode='fiction',genre='Misterio',flow='ai';
  const galleries={
   fiction:[['Romance','romance'],['Misterio','misterio'],['Terror','terror'],['Fantasía','fantasia']],
   factual:[['Historia','aprender'],['Curiosidades','motivacion'],['Educativo','salud'],['Motivación','viajes']],
   news:[['Noticias','actualidad'],['Farándula','romance'],['Deportes','motivacion'],['Entretenimiento','viajes']]
  };
  const refresh=()=>{
   maker.querySelectorAll('[data-fb-mode]').forEach(b=>b.classList.toggle('active',b.dataset.fbMode===mode));
   maker.querySelectorAll('[data-fb-flow]').forEach(b=>b.classList.toggle('active',b.dataset.fbFlow===flow));
   $('fbGenreGallery').innerHTML=galleries[mode].map(([title,id])=>tile(id,title,mode)).join('');
   const current=[...$('fbGenreGallery').querySelectorAll('.fb-image-tile')].find(b=>b.textContent.trim()===genre)||$('fbGenreGallery').querySelector('.fb-image-tile');
   if(current)current.classList.add('active');
   maker.querySelector('.fb-generate').textContent=flow==='manual'?'✎ Abrir editor manual':'✦ Generar 10 propuestas';
  };
  maker.addEventListener('click',event=>{
   const m=event.target.closest('[data-fb-mode]');if(m){mode=m.dataset.fbMode;genre=galleries[mode][0][0];refresh();return;}
   const c=event.target.closest('.fb-image-tile');if(c){genre=c.textContent.trim();maker.querySelectorAll('.fb-image-tile').forEach(el=>el.classList.toggle('active',el===c));return;}
   const f=event.target.closest('[data-fb-flow]');if(f){flow=f.dataset.fbFlow;refresh();return;}
  });
  $('fbGenerateIdeas').addEventListener('click',()=>{
   if(flow==='manual'){
    window.facelessFlow='manual';document.body.dataset.flow='manual';
    location.href='editar-sin-ia/';return;
   }
   const query=$('fbTopic').value.trim();if(query.length<5){$('fbTopic').setCustomValidity('Escribe un tema de cinco caracteres o más.');$('fbTopic').reportValidity();return;}
   $('fbTopic').setCustomValidity('');window.facelessFlow='ai';document.body.dataset.flow='ai';
   safeRoute('discover');window.facelessShowStudioMenu?.();
   const field=$('studioTopic');if(field){field.value=query;field.dispatchEvent(new Event('input',{bubbles:true}));}
   select('studioMode',mode);select('studioGenre',genre);select('studioSource','ai');
   select('studioDuration',$('fbDuration').value);select('studioVoice',$('fbVoice').value);select('studioImageStyle',$('fbImageStyle').value);
   const access=$('studioPass');const code=window.facelessProductionPasscode;
   if(access&&typeof code==='string'&&code.length>=16)access.value=code;
   $('studioGenerate')?.click();
  });
  refresh();
 }
 // 3-5. Propuestas, cuatro ganchos y estilos con miniaturas: los botones actúan sobre el generador existente.
 const resultView=discover.querySelector('.studio-results-view');
 const cards=$('studioCards'),feature=$('studioFeature');
 if(resultView&&cards&&feature){
  const styleChoices=[
   ['cinematic','Cinematográfico','cinematic.webp'],['hyperreal','Realista','realista.webp'],
   ['3d','3D Pixar','3d.svg'],['anime','Anime','anime.svg'],
   ['2d','Caricatura 2D','2d.svg'],['cartoon','Ilustración','history-sample.webp'],
   ['historical','Documental','documentales.webp']
  ];
  const styles=document.createElement('section');styles.id='fbStylePanel';styles.className='fb-style-panel';styles.hidden=true;
  styles.innerHTML='<h2>Elige el estilo visual</h2><p>Así se verán las imágenes de tu video:</p>'+
   '<div class="fb-style-gallery">'+styleChoices.map(([value,label,file])=>
   '<button type="button" data-fb-style="'+value+'" class="'+(value==='cinematic'?'active':'')+'"><img src="'+A+file+'" alt="" loading="lazy"><span>'+label+'</span><i>✓</i></button>').join('')+'</div>'+
   '<div class="fb-step-actions"><button type="button" class="fb-secondary" id="fbStyleBack">← Volver a los ganchos</button><button class="fb-primary" type="button" id="fbCreateSelected">✦ Crear guion y escenas</button></div>';
  resultView.querySelector('.studio-results-layout')?.before(styles);
  const setStep=step=>{
   discover.dataset.fbStep=step;styles.hidden=step!=='styles';
   if(step==='hooks'){feature.querySelector('.fc-hooks')?.scrollIntoView({block:'start',behavior:'instant'});}
   else window.scrollTo({top:0,behavior:'instant'});
  };
  new MutationObserver(()=>{if(!resultView.hidden){setStep('proposals');}}).observe(resultView,{attributes:true,attributeFilter:['hidden']});
  cards.addEventListener('click',event=>{
   if(event.target.closest('.studio-card'))requestAnimationFrame(()=>setStep('hooks'));
  });
  let updating=false;
  const decorateHook=()=>{
   if(updating||!feature.querySelector('.fc-hooks'))return;
   const text=feature.querySelector('.studio-feature-text');
   if(!text||text.querySelector('.fb-next-style'))return;
   updating=true;
   const next=document.createElement('button');next.type='button';next.className='fb-primary fb-next-style';next.textContent='✓ Usar este gancho y elegir estilo';
   text.append(next);next.onclick=()=>setStep('styles');
   updating=false;
  };
  new MutationObserver(decorateHook).observe(feature,{childList:true});decorateHook();
  styles.addEventListener('click',event=>{
   const button=event.target.closest('[data-fb-style]');if(!button)return;
   const value=button.dataset.fbStyle;select('studioImageStyle',value);
   styles.querySelectorAll('[data-fb-style]').forEach(btn=>btn.classList.toggle('active',btn===button));
  });
  $('fbStyleBack').onclick=()=>setStep('hooks');
  $('fbCreateSelected').onclick=()=>{
   const button=feature.querySelector('.studio-feature-text > .studio-create');
   if(button&&!button.disabled)button.click();
  };
 }
 // 7-9. Las herramientas existentes de edición, subtítulos y exportación se presentan como galerías reales.
 const tabBody=$('tabBody');
 function decorateEditor(){
  if(document.body.dataset.screen!=='editor')return;
  const p=typeof current==='function'?current():null;if(!p)return;
  const compact=tabBody.querySelector('.compact-video-editor'),manual=tabBody.querySelector('.cut-studio');
  if(compact&&!compact.querySelector('.fb-hero-upload')){
   const hero=document.createElement('section');hero.className='fb-hero-upload';
   hero.innerHTML='<div class="fb-tool-title"><h3>🎬 Hero Video · Introducción cinematográfica</h3><p>Clip real de 5 a 8 segundos dentro del video final. Puedes subir MP4 o WebM, reemplazarlo o quitarlo.</p></div>'+
    '<div class="fb-hero-actions"><input type="file" id="fbHeroFile" accept="video/mp4,video/webm,video/*" hidden><button type="button" class="fb-secondary fb-hero-pick">＋ Añadir Hero Video</button><button type="button" class="fb-secondary fb-hero-remove" hidden>Quitar</button></div><p class="fb-hero-status" role="status">Sin clip: el inicio utilizará imágenes animadas, no un video IA.</p>';
   compact.prepend(hero);window.facelessMountHeroVideo?.(p,hero);
  }
  if(manual&&!manual.querySelector('.fb-hero-upload')){
   const hero=document.createElement('section');hero.className='fb-hero-upload';
   hero.innerHTML='<div class="fb-tool-title"><h3>🎬 Hero Video</h3><p>Introducción reproducible y editable que se añade a los primeros segundos.</p></div>'+
    '<div class="fb-hero-actions"><input type="file" id="fbHeroFile" accept="video/mp4,video/webm,video/*" hidden><button type="button" class="fb-secondary fb-hero-pick">＋ Añadir Hero Video</button><button type="button" class="fb-secondary fb-hero-remove" hidden>Quitar</button></div><p class="fb-hero-status" role="status">Sin clip de introducción.</p>';
   manual.prepend(hero);window.facelessMountHeroVideo?.(p,hero);
  }
  const caption=tabBody.querySelector('.caption-style');
  if(caption&&!caption.querySelector('.fb-subtitle-gallery')){
   const select=caption.querySelector('#captionStyle');if(select){
    const gallery=document.createElement('div');gallery.className='fb-subtitle-gallery';
    const labels=[['classic','Clásico'],['highlight','Resaltado'],['purple','Karaoke'],['neon','Neón'],['paper','Caja'],['outline','Contorno'],['minimal','Moderno'],['comic','Dinámico']];
    gallery.innerHTML='<div class="fb-tool-title"><h3>Estilos de subtítulos</h3><p>Elige un estilo y se aplicará al video exportado.</p></div>'+
    '<div class="fb-subtitle-grid">'+labels.map(([value,label])=>'<button type="button" data-caption="'+value+'"><span class="fb-caption-demo '+value+'">La verdad salió a la luz</span><small>'+label+'</small></button>').join('')+'</div>';
    select.after(gallery);select.closest('label')?.classList.add('fb-visually-hidden');
    gallery.addEventListener('click',e=>{const b=e.target.closest('[data-caption]');if(!b)return;select.value=b.dataset.caption;select.dispatchEvent(new Event('change',{bubbles:true}));refreshCaptions();});
    const refreshCaptions=()=>gallery.querySelectorAll('[data-caption]').forEach(b=>b.classList.toggle('active',b.dataset.caption===select.value));
    select.addEventListener('change',refreshCaptions);refreshCaptions();
   }
  }
  if(compact&&!compact.querySelector('.fb-transition-panel')){
   const panel=document.createElement('section');panel.className='fb-transition-panel';
   panel.innerHTML='<div class="fb-tool-title"><h3>Transiciones</h3><p>Se aplican al pasar de una escena a otra.</p></div>'+
    '<div class="fb-transition-grid">'+[['fade','Fundido','cinematic.webp'],['slide','Deslizamiento','travel.webp'],['zoom','Zoom','history-sample.webp'],['turn','Giro','mystery.webp'],['light','Luz','realista.webp'],['flash','Flash','news.webp']].map(([value,label,file])=>
     '<button type="button" data-fb-transition="'+value+'"><img src="'+A+file+'" alt="" loading="lazy"><span>'+label+'</span></button>').join('')+'</div>';
   compact.append(panel);
   const refreshTransitions=()=>panel.querySelectorAll('[data-fb-transition]').forEach(btn=>btn.classList.toggle('active',btn.dataset.fbTransition===(p.transitionStyle||'fade')));
   panel.addEventListener('click',event=>{
    const btn=event.target.closest('[data-fb-transition]');if(!btn)return;
    p.transitionStyle=btn.dataset.fbTransition;
    if(typeof persist==='function')persist();
    refreshTransitions();
    const view=$('previewCanvas');
    if(view&&typeof drawFrame==='function'&&p.scenes.length>1&&typeof FacelessTiming!=='undefined'){
     const second=p.scenes[1];drawFrame(1,second.time+.16);
     if(typeof canvas!=='undefined')view.getContext('2d')?.drawImage(canvas,0,0,view.width,view.height);
    }
   });refreshTransitions();
  }
 }
 let scheduled=false;
 new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;decorateEditor();});}).observe(tabBody,{childList:true});
 new MutationObserver(decorateEditor).observe(document.body,{attributes:true,attributeFilter:['data-screen']});
 decorateEditor();
 // 10. Miniaturas en Proyectos: solamente imágenes de ejemplo si el proyecto no tiene portada propia.
 const projectsList=$('projectsList');
 function decorateProjects(){
  for(const card of projectsList.querySelectorAll('.project[data-cover-project]')){
   if(card.querySelector('.studio-project-cover,.fb-project-art'))continue;
   const art=document.createElement('img');art.className='fb-project-art';art.src=A+'cinematic.webp';
   art.alt='Imagen de categoría ilustrativa; todavía no es una portada del proyecto';
   card.prepend(art);
  }
 }
 new MutationObserver(decorateProjects).observe(projectsList,{childList:true});decorateProjects();
})();
