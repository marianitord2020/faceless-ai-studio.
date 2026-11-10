/* Faceless AI Studio — catálogo visual de historias y noticias verificadas.
   Módulo independiente del editor, fotografías, narración y exportación originales. */
(() => {
  'use strict';
  const API='https://faceless-images.marianitord2020.workers.dev';
  const styles=['Romance','Misterio','Terror','Fantasía','Historia','Curiosidades','Noticias','Farándula','Entretenimiento','Motivación','Educativo'];
  const categoryGroups=[['Ficción y relatos',['Romance','Misterio','Terror','Fantasía']],['Aprender e inspirar',['Historia','Curiosidades','Motivación','Educativo']],['Actualidad y cultura',['Noticias','Farándula','Entretenimiento']]];
  const subcategories={
    Romance:['Reencuentros','Amor imposible','Segundas oportunidades','Amor y traición','Historias de pareja'],
    Misterio:['Secretos familiares','Enigmas','Desapariciones ficticias','Investigación','Suspenso psicológico'],
    Terror:['Fantasmas','Casas embrujadas','Leyendas urbanas','Terror psicológico','Criaturas'],
    Fantasía:['Magia','Mundos imaginarios','Aventuras épicas','Seres mitológicos','Fantasía urbana'],
    Historia:['Historia dominicana','Biografías','Civilizaciones','Acontecimientos históricos','Patrimonio cultural'],
    Curiosidades:['Ciencia','Naturaleza','Tecnología','Cuerpo humano','Lugares sorprendentes'],
    Motivación:['Superación personal','Disciplina','Autoestima','Emprendimiento','Metas y hábitos'],
    Educativo:['Ciencia','Tecnología','Cultura general','Medioambiente','Aprendizaje'],
    Noticias:['Política','Economía','Deportes','Tecnología','Salud','Seguridad','Cultura'],
    Farándula:['Música','Cine','Televisión','Celebridades','Redes sociales'],
    Entretenimiento:['Cine','Series','Música','Eventos','Videojuegos','Humor']
  };
  const categoryTopics={Romance:'Historias de amor',Misterio:'Misterios y secretos',Terror:'Historias de terror',Fantasía:'Aventuras de fantasía',Historia:'Historia de República Dominicana',Curiosidades:'Curiosidades del mundo',Motivación:'Historias de superación',Educativo:'Aprender algo nuevo',Noticias:'Noticias de República Dominicana hoy',Farándula:'Farándula hoy',Entretenimiento:'Entretenimiento hoy'};
  let subcategoryGenre='';
  const imageStyles=[
    ['cinematic','Fotografía cinematográfica'],
    ['hyperreal','Foto hiperrealista'],
    ['3d','Animación 3D tipo Pixar'],
    ['2d','Ilustración 2D'],
    ['anime','Anime'],
    ['cartoon','Caricatura'],
    ['historical','Recreación histórica / personajes famosos']
  ];
  const visuals={
    Romance:{emoji:'💌',colors:['#51304d','#bd755b','#2f193f']},
    Misterio:{emoji:'🕯️',colors:['#28264e','#5e3980','#101c40']},
    Historia:{emoji:'🏛️',colors:['#57432d','#af865a','#142c3e']},
    Curiosidades:{emoji:'🧠',colors:['#203e53','#3281a3','#121a40']},
    Noticias:{emoji:'📰',colors:['#093a66','#266da0','#07172e']},
    Farándula:{emoji:'🌟',colors:['#69315d','#ac4691','#30215d']},
    Entretenimiento:{emoji:'🎬',colors:['#69315d','#ac4691','#30215d']},
    Motivación:{emoji:'✨',colors:['#5b355e','#cc7054','#192b62']},
    Educativo:{emoji:'🎓',colors:['#134e58','#248487','#15254b']}
  };
  const state={ideas:[],selected:0,mode:'fiction',topic:'',style:'Romance',source:'ai',imageStyle:'cinematic',
    subcategory:'',pass:'',busy:false,building:false,epoch:0,covers:new Map(),sources:[],checkedAt:null,sourceProvider:'',matchType:'exact',sourceCoverage:null};
  window.facelessCoverCache=window.facelessCoverCache||new Map();
  let dbPromise=null;
  const $id=id=>document.getElementById(id);
  const e=(tag,cls,text)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(text!=null)el.textContent=String(text);
    return el;
  };
  function db(){
    if(!('indexedDB' in window))return Promise.resolve(null);
    if(!dbPromise)dbPromise=new Promise(resolve=>{
      try{
        const r=indexedDB.open('faceless-studio-covers-v1',1);
        r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('covers'))r.result.createObjectStore('covers')};
        r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null);
      }catch{resolve(null)}
    });
    return dbPromise;
  }
  async function saveCover(id,dataURI){
    if(!dataURI||!dataURI.startsWith('data:image/'))return;
    try{
      const store=await db();if(!store)return;
      const blob=await (await fetch(dataURI)).blob();
      if(blob.size>5_000_000)return;
      await new Promise(resolve=>{
        const t=store.transaction('covers','readwrite');
        t.objectStore('covers').put(blob,id);
        t.oncomplete=resolve;t.onerror=resolve;
      });
    }catch{}
  }
  async function readCover(id){
    const current=window.facelessCoverCache.get(id);
    if(current)return current;
    try{
      const database=await db();if(!database)return null;
      const blob=await new Promise(resolve=>{
        const t=database.transaction('covers','readonly');
        const req=t.objectStore('covers').get(id);
        req.onsuccess=()=>resolve(req.result||null);
        req.onerror=()=>resolve(null);
      });
      if(!blob)return null;
      const url=URL.createObjectURL(blob);
      window.facelessCoverCache.set(id,url);
      return url;
    }catch{return null}
  }
  window.facelessRenderProjectCovers=async function(){
    for(const p of document.querySelectorAll('#projectsList .project[data-cover-project]')){
      const id=p.dataset.coverProject,src=await readCover(id);
      if(!src||!p.isConnected)continue;
      let cover=p.querySelector('.studio-project-cover');
      if(!cover){
        cover=e('img','studio-project-cover');
        cover.style.cssText='display:block;width:100%;height:145px;object-fit:cover;border-radius:10px;margin-bottom:12px';
        p.prepend(cover);
      }
      cover.src=src;cover.alt='Portada seleccionada para el proyecto';
    }
  };
  window.facelessShowEditorCover=async function(project){
    const banner=$id('editBanner');if(!banner)return;
    let image=banner.querySelector('.studio-editor-thumb');
    if(image)image.remove();
    const src=await readCover(project.id);
    if(!src||!banner.isConnected)return;
    image=e('img','studio-editor-thumb');
    image.src=src;image.alt='Portada del proyecto';
    image.style.cssText='display:block;width:100%;max-width:360px;max-height:180px;object-fit:cover;border-radius:12px;margin:12px 0';
    banner.appendChild(image);
  };
  function styleVisual(style){return visuals[style]||visuals.Misterio}
  function bg(style,index=0){
    const v=styleVisual(style),angle=125+(index*23)%110;
    return 'linear-gradient('+angle+'deg,'+v.colors.join(',')+')';
  }
  function shell(){
    const root=$id('discover');if(!root)return;
    root.innerHTML=
    '<div class="studio-layout">'+
    '<div class="studio-center">'+
    '<div class="studio-title"><div><span class="studio-eyebrow">TU ESPACIO CREATIVO</span><h1>Una idea. <span class="sparkle">Tu próximo video.</span></h1>'+
    '<p>Encuentra una historia, elige tu favorita y dale vida.</p></div></div>'+
    '<div class="studio-settings">'+
    '<div class="studio-fields">'+
    '<div class="studio-field"><label for="studioGenre">Categoría</label><select id="studioGenre"></select></div>'+
    '<div class="studio-field"><label for="studioTopic">¿Qué quieres contar?</label><input id="studioTopic" type="text" maxlength="220" placeholder="Ej.: Historias de amor"></div>'+
    '<div class="studio-field"><label for="studioSubcategory">Subcategoría</label><select id="studioSubcategory"></select></div>'+
    '<div class="studio-field"><label for="studioMode">Tipo de contenido</label><select id="studioMode">'+
    '<option value="fiction">Relatos creativos</option><option value="news">Noticias reales y actuales</option><option value="factual">Documentales / hechos reales</option></select></div>'+
    '<div class="studio-field"><button class="studio-generate" type="button" id="studioGenerate">⌕ Generar 10 propuestas</button></div></div>'+
    '<div class="studio-addons">'+
    '<div class="studio-addon"><label for="studioSource">Cómo quieres empezar</label><select id="studioSource"><option value="ai">Crear con IA · Gemini</option><option value="local">Buscar textos publicados</option></select></div>'+
    '<div class="studio-addon"><label for="studioImageStyle">Estilo de imágenes</label><select id="studioImageStyle"></select></div>'+
    '<div class="studio-addon"><label for="studioDuration">Duración</label><select id="studioDuration"><option value="30">30 segundos</option><option value="60" selected>60 segundos</option><option value="120">120 segundos</option></select></div>'+
    '<div class="studio-addon pass"><label for="studioPass">Código de acceso</label><input id="studioPass" type="password" autocomplete="new-password" placeholder="Tu código privado"></div>'+
    '<div class="studio-helper" id="studioCoverage">Noticias de República Dominicana y medios en español, con enlace a su fuente. Las imágenes generadas son ilustraciones editoriales.</div></div>'+
    '</div>'+
    '<div id="studioWritten" class="studio-settings" hidden>'+
    '<p>Busca obras en Wikisource o importa un relato de otra página.</p>'+
    '<a id="studioReddit" class="studio-source" href="https://www.reddit.com/search/" target="_blank" rel="noopener noreferrer">↗ Buscar relatos en Reddit</a>'+
    '<label for="studioWrittenTitle">Título del texto</label><input id="studioWrittenTitle" maxlength="120" placeholder="Título del relato publicado">'+
    '<label for="studioWrittenUrl">Enlace original (opcional)</label><input id="studioWrittenUrl" type="url" maxlength="1000" placeholder="https://…">'+
    '<label for="studioWrittenLanguage">Idioma del texto original</label><select id="studioWrittenLanguage"><option value="es">Español</option><option value="en">Inglés</option><option value="fr">Francés</option><option value="pt">Portugués</option><option value="it">Italiano</option><option value="de">Alemán</option></select>'+
    '<label for="studioWrittenText">Texto publicado (hasta 5.000 caracteres)</label><textarea id="studioWrittenText" maxlength="5000" rows="6" placeholder="Pega aquí el relato. No lo sustituiremos por una historia inventada."></textarea>'+
    '<p class="studio-limit">Si eliges otro idioma, se enviará el texto a MyMemory para traducirlo. Su cuota gratuita anónima es de 5.000 caracteres al día. Conserva autor, enlace y permisos de uso.</p>'+
    '<button id="studioImportWritten" class="studio-create" type="button">Importar texto / traducir al español</button></div>'+
    '<div class="studio-results-head"><div><h2>✦ <span id="studioGalleryTitle">10 propuestas de historias</span></h2>'+
    '<p id="studioGallerySubtitle">Selecciona un relato, lee su sinopsis y llévalo a creación.</p></div>'+
    '<span class="studio-results-tag" id="studioGalleryTag">Sin propuestas</span></div>'+
    '<p id="studioStatus" class="studio-status" aria-live="polite"></p>'+
    '<div class="studio-results-layout"><div id="studioCards" class="studio-cards"></div>'+
    '<aside class="studio-feature" id="studioFeature" aria-label="Relato seleccionado"></aside></div>'+
    '</div></div>';
    // One primary navigation; no duplicate sidebar links or placeholder media shortcuts.
    const panel=root.querySelector('.studio-settings');panel.classList.add('studio-search-panel');
    const heading=e('div','studio-panel-heading');
    heading.append(e('span','studio-step','01'),e('div',null,'Encuentra tu historia'));
    panel.prepend(heading);
    const fields=panel.querySelector('.studio-fields'),addons=panel.querySelector('.studio-addons');
    const topicField=$id('studioTopic').parentElement;topicField.classList.add('studio-topic');fields.prepend(topicField);
    const sourceField=$id('studioSource').parentElement;sourceField.classList.add('studio-field','studio-origin');fields.appendChild(sourceField);
    sourceField.appendChild(e('p','studio-field-hint',''));
    const action=$id('studioGenerate').parentElement;action.className='studio-search-action';
    const helper=$id('studioCoverage'),sourceInfo=e('details','studio-source-info');
    sourceInfo.append(e('summary',null,'Fuentes y cobertura'),helper);
    const searchFooter=e('div','studio-search-footer');searchFooter.append(sourceInfo,action);panel.append(searchFooter);
    const preferences=e('details','studio-video-options');preferences.id='studioVideoOptions';
    const preferencesSummary=e('summary');const preferencesTitle=e('span','studio-options-title','Imagen y duración');
    const preferencesValue=e('span','studio-options-value','60 s · Cinematográfica');preferencesValue.id='studioVideoSummary';
    preferencesSummary.append(preferencesTitle,preferencesValue);preferences.append(preferencesSummary,addons);
    const access=addons.querySelector('#studioPass').parentElement;access.classList.add('studio-access');
    panel.insertBefore(preferences,searchFooter);panel.insertBefore(access,searchFooter);
    function updateVideoSummary(){const names={cinematic:'Cinematográfica',hyperreal:'Hiperrealista','3d':'Animación 3D','2d':'Ilustración 2D',anime:'Anime',cartoon:'Caricatura',historical:'Recreación histórica'};$id('studioVideoSummary').textContent=$id('studioDuration').value+' s · '+names[$id('studioImageStyle').value]}
    $id('studioDuration').addEventListener('change',updateVideoSummary);$id('studioImageStyle').addEventListener('change',updateVideoSummary);
    const writtenHeading=e('div','studio-panel-heading');writtenHeading.append(e('span','studio-step','↳'),e('div',null,'Importa un relato'));
    $id('studioWritten').prepend(writtenHeading);
    const resultsHeading=root.querySelector('.studio-results-head');resultsHeading.prepend(e('span','studio-step','02'));
    const genre=$id('studioGenre');
    for(const [label,names] of categoryGroups){const group=e('optgroup');group.label=label;for(const name of names)group.append(new Option(name,name));genre.append(group)}
    function refreshSubcategories(){
      if(subcategoryGenre===genre.value)return;subcategoryGenre=genre.value;
      const sub=$id('studioSubcategory');sub.replaceChildren(new Option('Todos los temas',''));
      for(const name of subcategories[genre.value]||[])sub.add(new Option(name,name));
    }
    genre.value='Romance';refreshSubcategories();
    const image=$id('studioImageStyle');for(const [key,name] of imageStyles)image.add(new Option(name,key));
    $id('studioTopic').value='Historias de amor';
    $id('studioTopic').addEventListener('input',()=>{$id('studioTopic').dataset.edited='true'});
    genre.onchange=()=>{
      refreshSubcategories();
      if(!$id('studioTopic').dataset.edited)$id('studioTopic').value=categoryTopics[genre.value]||'';
      if(['Noticias','Farándula','Entretenimiento'].includes(genre.value)){
        $id('studioMode').value='news';
        $id('studioSource').value='ai';
      }else if($id('studioMode').value==='news')$id('studioMode').value='fiction';
      $id('studioSource').onchange();
      if(state.source==='demo'){
        state.ideas=[];state.topic=$id('studioTopic').value;state.style=genre.value;state.mode=$id('studioMode').value;state.epoch++;
        initialState();setStatus('Inicia la búsqueda para ver resultados de esta categoría.');
      }
    };
    $id('studioMode').onchange=()=>{
      if($id('studioMode').value==='news'&&!['Noticias','Farándula','Entretenimiento'].includes(genre.value)){genre.value='Noticias';if(!$id('studioTopic').dataset.edited)$id('studioTopic').value=categoryTopics.Noticias}
      refreshSubcategories();
      if($id('studioMode').value!=='fiction')$id('studioSource').value='ai';
      $id('studioSource').onchange();
    };
    $id('studioSource').onchange=()=>{
      const local=$id('studioSource').value==='local';
      $id('studioWritten').hidden=!local;
      $id('studioPass').parentElement.hidden=local;
      const mode=$id('studioMode').value;
      sourceField.querySelector('.studio-field-hint').textContent=local?'Busca relatos publicados o importa un texto para traducirlo.':mode==='news'?'Consulta noticias con fuentes reales y elige una para crear el guion.':mode==='factual'?'Consulta información documentada y prepara un guion con sus fuentes.':'Crea propuestas originales sobre el tema que escribas.';
      $id('studioGenerate').textContent=local?'⌕ Buscar textos publicados':'⌕ Generar 10 propuestas';
      if(local)$id('studioMode').value='fiction';
      $id('studioReddit').href='https://www.reddit.com/search/?'+new URLSearchParams({q:$id('studioTopic').value});
    };
    $id('studioImportWritten').onclick=importWritten;
    $id('studioTopic').addEventListener('input',()=>{$id('studioReddit').href='https://www.reddit.com/search/?'+new URLSearchParams({q:$id('studioTopic').value})});
    $id('studioDuration').onchange=renderFeature;
    $id('studioGenerate').onclick=generateIdeas;
    $id('studioTopic').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();generateIdeas()}});
    // Portadas de demostración visibles al abrir, igual que el diseño aprobado.
    state.ideas=localIdeas('Historias de amor','Romance');
    state.topic='Historias de amor';
    state.style='Romance';state.source='demo';state.mode='fiction';
    $id('studioSource').value='ai';$id('studioSource').onchange();
    renderCards();renderFeature();
    setStatus('Relatos de ejemplo · Escribe tu tema para encontrar o crear otra historia.');
  }
  function initialState(){
    $id('studioGalleryTitle').textContent=state.mode==='news'?'Noticias sobre «'+state.topic+'»':'Resultados de «'+state.topic+'»';
    $id('studioGalleryTag').textContent='0 resultados';
    $id('studioGallerySubtitle').textContent='Solo se mostrarán resultados de esta búsqueda.';
    $id('studioCards').replaceChildren();
    const empty=e('div','studio-state');
    empty.style.gridColumn='1 / -1';
    const icon=e('span','big','✦');
    empty.append(icon,e('b',null,'Tu búsqueda: '+state.topic),
      e('p',null,'Aquí aparecerán los resultados que coincidan con tu tema. Si no hay fuentes disponibles, lo indicaremos sin cambiar tu búsqueda.'));
    $id('studioCards').appendChild(empty);
    $id('studioFeature').replaceChildren();
    const block=e('div','studio-state');
    block.append(e('span','big','🎬'),e('b',null,'Elige tu favorita'),e('p',null,'Aquí verás la sinopsis y el botón «Llevar a creación».'));
    $id('studioFeature').appendChild(block);
  }
  function setStatus(str){const el=$id('studioStatus');if(el)el.textContent=str}
  function selectedIdea(){return state.ideas[state.selected]||null}
  function visual(container,idea,index,large){
    container.replaceChildren();
    const publisherPhoto=(state.mode==='news'||state.mode==='factual')&&idea.sourceImageUrl?idea.sourceImageUrl:null;
    if(state.covers.has(idea.id)||publisherPhoto){
      const pic=e('img');pic.alt=publisherPhoto?'Vista previa ofrecida por el medio enlazado':'Portada de '+idea.title;
      pic.src=publisherPhoto||state.covers.get(idea.id);pic.loading='lazy';
      pic.referrerPolicy='no-referrer';
      pic.onerror=()=>{
        if(!pic.isConnected)return;
        const fallback=e('div','illustration');fallback.style.background=bg(state.style,index);
        fallback.appendChild(e('span',null,styleVisual(state.style).emoji));
        pic.replaceWith(fallback);
      };
      container.appendChild(pic);
    }else{
      const fallback=e('div','illustration');fallback.style.background=bg(state.style,index);
      fallback.appendChild(e('span',null,styleVisual(state.style).emoji));
      container.appendChild(fallback);
    }
    const badge=e('span',large?'studio-feature-badge':'studio-card-number',
      large?(state.mode==='news'?'📰 Fuente enlazada':state.style):'#'+(index+1));
    container.appendChild(badge);
  }
  function renderCards(){
    const cards=$id('studioCards');cards.replaceChildren();
    state.ideas.forEach((idea,index)=>{
      const card=e('button','studio-card'+(index===state.selected?' on':''));card.type='button';
      card.setAttribute('aria-pressed',String(index===state.selected));
      const picture=e('div','studio-card-visual');visual(picture,idea,index,false);
      const body=e('div','studio-card-text');
      body.append(e('b',null,idea.title),e('small',null,idea.synopsis),
        e('span','chip',idea.matchType==='related'?'≈ Relacionado':state.mode==='news'?'📰 Fuente real':state.mode==='factual'?'📚 Documental':'✦ '+state.style));
      if(idea.matchType==='related'&&idea.matchReason)body.appendChild(e('small',null,idea.matchReason));
      card.append(picture,body);
      card.onclick=()=>{state.selected=index;renderCards();renderFeature();if(window.matchMedia('(max-width: 760px)').matches)$id('studioFeature').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})};
      cards.appendChild(card);
    });
    $id('studioGalleryTag').textContent=state.ideas.length+' '+(state.matchType==='related'?'relacionados':state.mode==='news'?'noticias encontradas':'propuestas');
    $id('studioGalleryTitle').textContent=state.matchType==='related'?'Temas relacionados con «'+state.topic+'»':state.mode==='news'?'Noticias encontradas':(state.mode==='factual'?'Documentales para elegir':'Historias para elegir');
    if(state.source==='local'){$id('studioGalleryTitle').textContent=state.ideas.length+' texto'+(state.ideas.length===1?'':'s')+' publicado'+(state.ideas.length===1?'':'s');$id('studioGalleryTag').textContent=state.ideas.length+' resultado'+(state.ideas.length===1?'':'s')}
    $id('studioGallerySubtitle').textContent=state.matchType==='related'?'No hubo coincidencias exactas. Estos resultados son cercanos a tu búsqueda; revisa el motivo y su fecha.':state.mode==='news'
      ?'Solo noticias vinculadas a fuentes reales. Selecciona una y consulta su fecha y origen.'
      :'Selecciona una portada, lee la sinopsis y luego llévala a creación.';
  }
  function renderFeature(){
    const feature=$id('studioFeature');feature.replaceChildren();
    const idea=selectedIdea();if(!idea){initialState();return}
    const picture=e('div','studio-feature-picture');visual(picture,idea,state.selected,true);
    const text=e('div','studio-feature-text');
    text.appendChild(e('h2',null,idea.title));
    text.appendChild(e('p',null,idea.synopsis));
    if(idea.matchType==='related')text.appendChild(e('p','studio-limit','≈ Relacionado con «'+state.topic+'». '+(idea.matchReason||'')));
    const meta=e('div','studio-feature-meta');
    meta.append(e('span',null,'◷ '+$id('studioDuration').value+' segundos'),
      e('span',null,'▱ '+(Number($id('studioDuration').value)===30?5:Number($id('studioDuration').value)===60?8:12)+' escenas'));
    if(idea.sourceSeenAt)meta.append(e('span',null,(idea.sourceDateKind==='publication'?'Publicada: ':'Detectada: ')+idea.sourceSeenAt));
    text.appendChild(meta);
    const button=e('button','studio-create',state.building?'Preparando guion…':'▣ Llevar a creación');
    button.type='button';button.disabled=state.building||state.busy;button.onclick=createProject;
    text.appendChild(button);
    if(state.source==='local'){
      const adapt=e('button','studio-create','✦ Crear una historia nueva con IA a partir de este texto');
      adapt.type='button';adapt.disabled=state.busy||state.building;adapt.onclick=adaptWritten;text.appendChild(adapt);
    }
    if(state.source==='local')text.appendChild(e('p','studio-limit','Texto publicado, sin generación con IA. Al crear se toma un fragmento según la duración; no se resume ni se inventa un final.'));
    if(idea.sourceUrl){
      const a=e('a','studio-source','↗ Ver fuente original');
      a.href=idea.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';text.appendChild(a);
    }
    feature.append(picture,text);
    if(state.mode==='factual'){
      const wikiInfo=e('p','studio-limit','Artículos e imágenes de Wikipedia/Wikimedia como referencia; cada archivo puede requerir atribución y licencia específica. Las imágenes de personas históricas pueden ser retratos artísticos, no fotografías.');
      feature.appendChild(wikiInfo);
      const wiki=e('a','studio-source','Consultar Wikipedia y créditos');
      wiki.href='https://es.wikipedia.org/';wiki.target='_blank';wiki.rel='noopener noreferrer';
      feature.appendChild(wiki);
    }
    if(state.mode==='news'){
      const credit=e('p','studio-limit','Fuentes consultadas: '+(state.sourceProvider||'medios enlazados')+'. La fecha es de publicación o detección, no necesariamente del hecho. Consulta el artículo original. Las fotografías del medio no se incorporan al video sin permiso.');
      feature.appendChild(credit);
      const attribution=e('a','studio-source','Acerca del índice GDELT');
      attribution.href='https://www.gdeltproject.org/';attribution.rel='noopener noreferrer';attribution.target='_blank';
      feature.appendChild(attribution);
    }
    if(state.mode!=='fiction'&&state.sources.length){
      const details=e('details','studio-sources'),sum=e('summary',null,'Fuentes consultadas ('+state.sources.length+')');
      details.appendChild(sum);
      for(const src of state.sources.slice(0,8)){
        const a=e('a',null,src.title||'Fuente');a.href=src.url;a.target='_blank';a.rel='noopener noreferrer';
        details.appendChild(a);
      }
      feature.appendChild(details);
    }
  }
  async function callEndpoint(path,payload){
    const pass=state.pass;
    if(pass.length<16)throw Error('Introduce el mismo APP_PASSCODE de fotos y voces (mínimo 16 caracteres).');
    const response=await fetch(API+path,{method:'POST',signal:typeof AbortSignal.timeout==='function'?AbortSignal.timeout(110000):undefined,headers:{'content-type':'application/json','x-app-token':pass},
      body:JSON.stringify(payload)});
    let data;
    try{data=await response.json()}catch{throw Error('La API no devolvió una respuesta válida.')}
    if(!response.ok)throw Error(String(data?.error||'HTTP '+response.status).slice(0,400));
    return data;
  }
  const localTemplates={
    Romance:[
      ['El último adiós','Una despedida inesperada cambia el destino de dos enamorados cuando descubren que su separación fue provocada por un secreto familiar.','Despedida; carta oculta; reencuentro'],
      ['El amor olvidado','Después de veinte años, Elena encuentra una carta de Daniel que jamás llegó a recibir. Lo que estaba escrito en ella cambia todo lo que creía sobre su primer amor.','Elena encuentra una carta; descubre una mentira; busca a Daniel'],
      ['La novia equivocada','El día de su boda, Clara descubre una fotografía que vincula a su prometido con su mejor amiga. Deberá decidir si quiere conocer toda la verdad.','Boda; fotografía secreta; decisión difícil'],
      ['Un amor imposible','Dos jóvenes de familias enfrentadas se enamoran durante un verano. Cuando todos se enteran, tendrán que decidir si seguir juntos.','Encuentro; oposición familiar; una elección'],
      ['Promesa de verano','Una promesa hecha en la playa parece olvidada hasta que dos antiguos enamorados se encuentran por casualidad muchos años después.','Promesa; tiempo; reencuentro'],
      ['Segunda oportunidad','Una mujer regresa a su ciudad natal y encuentra a la persona que dejó atrás. Esta vez, ambos han cambiado demasiado para repetir el pasado.','Regreso; dudas; nueva oportunidad'],
      ['El recuerdo','Un viejo colgante lleva a un escritor a descubrir una historia de amor que su familia le ocultó durante décadas.','Colgante; búsqueda; revelación'],
      ['Amor y traición','Una pareja aparentemente perfecta descubre que alguien cercano manipula sus mensajes para separarlos.','Mensajes; traición; verdad'],
      ['Cartas sin destinatario','Durante años, una mujer escribe cartas a un desconocido que algún día podría leerlas. Una entrega equivocada cambiará ambas vidas.','Cartas; error; encuentro'],
      ['Nuestro último baile','En una fiesta de aniversario, dos personas que se amaron en secreto vuelven a bailar la canción que marcó sus vidas.','Fiesta; canción; confesión']
    ]
  };
  function localIdeas(topic,style){
    const custom=style==='Romance'?localTemplates.Romance:null;
    const shapes=[
      ['La última señal','Una señal inesperada transforma una noche tranquila y obliga a descubrir el misterio que oculta el lugar.','Primera señal; búsqueda; revelación'],
      ['El secreto de la puerta','Al abrir una puerta clausurada, alguien encuentra una prueba que altera por completo todo lo que sabía sobre este tema.','Puerta cerrada; descubrimiento; decisión'],
      ['La llamada de medianoche','Una llamada a medianoche revela un nombre que nadie había mencionado en años. Los protagonistas deciden seguir la pista.','Llamada; investigación; encuentro'],
      ['Los pasos perdidos','Una huella imposible aparece cerca del lugar elegido, y las explicaciones se vuelven cada vez más inquietantes.','Huella; sospechas; desenlace'],
      ['El testigo silencioso','Una persona que siempre guardó silencio decide contar lo que presenció, pero descubre que la verdad tiene consecuencias.','Testigo; confesión; conflicto'],
      ['El mapa secreto','Un mapa antiguo conduce hacia algo que nadie esperaba encontrar, y cada pista cambia el rumbo de la búsqueda.','Mapa; viaje; misterio'],
      ['La segunda llave','La aparición de una llave olvidada inicia una cadena de revelaciones que nadie en el vecindario imaginaba.','Llave; secreto; revelación'],
      ['Donde acaba el camino','Un viaje hacia un lugar desconocido plantea una decisión imposible cuando el personaje principal encuentra una prueba inesperada.','Viaje; prueba; elección'],
      ['La habitación vacía','Una habitación aparentemente desocupada contiene una pista sobre un suceso de hace años. La investigación avanza contra el tiempo.','Habitación; rastro; giro'],
      ['El nombre escondido','Un nombre aparece en un viejo registro y conecta a personas que nunca debieron conocerse.','Registro; conexión; final']
    ];
    return (custom||shapes).map(([title,synopsis,outline],i)=>({
      id:'local-'+(i+1),title,
      synopsis:custom?synopsis:synopsis+' Relato ficticio inspirado en «'+topic+'».',
      outline,coverPrompt:style+' cinematic illustration '+title+' '+topic
    }));
  }
  async function generateIdeas(){
    if(state.busy||state.building)return;
    const topic=$id('studioTopic').value.trim().replace(/\s+/g,' ');
    const style=$id('studioGenre').value;
    const subcategory=$id('studioSubcategory').value;
    const requestedMode=$id('studioMode').value;
    const local=$id('studioSource').value==='local';
    const mode=requestedMode;
    if(topic.length<5){setStatus('Escribe un tema de al menos cinco caracteres.');$id('studioTopic').focus();return}
    if(local&&mode!=='fiction'){setStatus('Las noticias y los documentales reales requieren IA y fuentes actuales. Cambia el origen a «IA — Gemini».');return}
    state.busy=true;state.epoch++;const epoch=state.epoch;
    state.pass=$id('studioPass').value.trim()||state.pass;
    state.topic=topic;state.style=style;state.subcategory=subcategory;state.mode=mode;state.source=local?'local':'ai';
    state.imageStyle=$id('studioImageStyle').value;
    state.selected=0;state.covers.clear();state.sources=[];state.ideas=[];state.sourceProvider='';state.matchType='exact';state.sourceCoverage=null;initialState();
    $id('studioGenerate').disabled=true;
    try{
      if(local){
        setStatus('Buscando textos publicados en Wikisource sobre «'+topic+'»…');
        const result=await window.facelessWrittenStories.search([topic,subcategory].filter(Boolean).join(' '),style);
        if(!result.ideas.length)throw Error('No encontré textos publicados. Puedes abrir Reddit y pegar un relato.');
        state.ideas=result.ideas;state.sources=result.sources;state.sourceProvider=result.sourceProvider;state.matchType=result.matchType;
        setStatus('✓ '+state.ideas.length+' textos publicados'+(state.matchType==='related'?' relacionados con el género elegido':'')+'. La descripción es un fragmento de la fuente, sin reescritura con IA.');
      }else{
        setStatus(mode==='news'?'Consultando GDELT para noticias reales y fuentes actuales…':
          'Gemini está preparando 10 títulos y sinopsis sobre «'+topic+'»…');
        const result=await callEndpoint('/ideas',{topic,style,mode,subcategory});
        if(epoch!==state.epoch)return;
        if(!Array.isArray(result.ideas)||!result.ideas.length)throw Error('La búsqueda no devolvió propuestas verificables.');
        state.ideas=result.ideas.slice(0,10);
        state.sources=Array.isArray(result.sources)?result.sources:[];
        state.checkedAt=result.checkedAt||null;state.sourceProvider=String(result.sourceProvider||'');state.matchType=result.matchType||'exact';state.sourceCoverage=result.sourceCoverage||null;
        if(state.sourceCoverage){const c=state.sourceCoverage;$id('studioCoverage').textContent='Catálogo: '+c.publishers+' medios, '+c.dominicanPublishers+' dominicanos. En esta búsqueda: '+c.queriedPublishers.length+' medios consultados, además del índice GDELT. Cada resultado mantiene su fuente.';}
        setStatus((state.matchType==='related'?'No encontré coincidencias exactas. Estas son '+state.ideas.length+' opciones relacionadas':'✓ '+state.ideas.length+' '+(mode==='news'?'noticias vinculadas a fuentes':'propuestas con sinopsis'))+
          '. '+(mode==='news'?'Fuentes: '+state.sourceProvider+'. No se inventaron titulares para completar diez.':'Generando sus imágenes de portada…'));
      }
      state.busy=false;renderCards();renderFeature();
      if(!local&&mode!=='news')void generateCoverImages(epoch);
    }catch(error){
      setStatus('No se pudo completar la búsqueda de «'+topic+'»: '+String(error?.message||error));
      if(!state.ideas.length)initialState();
    }finally{
      state.busy=false;$id('studioGenerate').disabled=false;renderFeature();
    }
  }
  async function adaptWritten(){
    if(state.busy||state.building)return;
    const idea=selectedIdea();if(!idea)return;
    state.pass=$id('studioPass').value.trim()||state.pass;
    if(state.pass.length<16){setStatus('Para crear una historia nueva con IA necesitas el APP_PASSCODE. El texto publicado sigue disponible sin IA.');return}
    state.busy=true;state.epoch++;renderFeature();
    try{
      setStatus('Leyendo la fuente para crear ficción nueva con Gemini…');
      const text=await window.facelessWrittenStories.read(idea);
      const style=$id('studioGenre').value;
      const topic=('Una historia de '+style+' inspirada en '+idea.title).slice(0,220);
      const result=await callEndpoint('/ideas',{topic,style,subcategory:$id('studioSubcategory').value,mode:'fiction',reference:{title:idea.title,url:idea.sourceUrl||'',text:text.slice(0,1800)}});
      if(!result.ideas?.length)throw Error('No se prepararon propuestas nuevas.');
      state.ideas=result.ideas;state.topic=topic;state.style=style;state.subcategory=$id('studioSubcategory').value;state.mode='fiction';state.source='ai';state.selected=0;state.matchType='exact';state.sources=result.sources||[];state.covers.clear();
      $id('studioTopic').value=topic;$id('studioSource').value='ai';$id('studioSource').onchange();
      setStatus('✓ Historias nuevas de ficción inspiradas en la fuente. No son sucesos reales ni traducciones del relato original.');
    }catch(error){setStatus(String(error.message||error))}
    finally{state.busy=false;renderCards();renderFeature()}
  }
  async function importWritten(){
    if(state.busy||state.building)return;
    const text=$id('studioWrittenText').value.trim(),title=$id('studioWrittenTitle').value.trim();
    if(text.length<100||!title){setStatus('Escribe un título y pega al menos 100 caracteres del relato.');return}
    let url=$id('studioWrittenUrl').value.trim();
    try{if(url&&new URL(url).protocol!=='https:')throw Error()}catch{setStatus('El enlace original debe empezar con https://');return}
    state.busy=true;state.epoch++;$id('studioImportWritten').disabled=true;
    // Clear stale cards before translating; no previous story can be selected on failure.
    state.ideas=[];state.topic=title;initialState();renderFeature();
    try{
      setStatus($id('studioWrittenLanguage').value==='es'?'Importando texto publicado…':'Traduciendo con MyMemory; conservando el texto original…');
      const translated=await window.facelessWrittenStories.translate(text,$id('studioWrittenLanguage').value);
      state.topic=title;state.style=$id('studioGenre').value;state.subcategory=$id('studioSubcategory').value;state.source='local';state.mode='fiction';state.selected=0;
      state.sources=url?[{title,url}]:[];state.matchType='exact';state.sourceProvider='Texto importado';state.covers.clear();
      state.ideas=[{id:'imported-'+Date.now(),title,synopsis:translated.slice(0,400)+(translated.length>400?'…':''),writtenText:translated,importedOriginal:text,sourceUrl:url,sourceTitle:title,outline:'Texto publicado importado por el usuario.',coverPrompt:''}];
      setStatus('✓ Texto preparado en español. Revisa la traducción y la fuente antes de crear el video.');
      state.busy=false;renderCards();renderFeature();
    }catch(error){setStatus(String(error.message||error))}
    finally{state.busy=false;$id('studioImportWritten').disabled=false;renderFeature()}
  }
  function imagePrompt(idea){
    const preset={
      cinematic:'Cinematic professional editorial photograph, dramatic light, detailed composition',
      hyperreal:'Hyperrealistic photo, natural texture, sophisticated lighting, photographic lens detail',
      '3d':'Beautiful vibrant family-friendly 3D animated feature-film aesthetic, expressive characters',
      '2d':'Polished 2D digital illustration, detailed hand-painted lighting',
      anime:'High-quality Japanese anime key visual, atmospheric composition',
      cartoon:'Expressive editorial cartoon illustration, lively colors and clear silhouettes',
      historical:'Historically researched period illustration or painted portrait; clearly an artistic reconstruction, no false documentary photograph'
    };
    return [
      String(idea.coverPrompt||'').slice(0,450),
      'Cover for the FICTIONAL or illustrated documentary story: '+idea.title+'.',
      'Central theme: '+state.topic+'. Subcategory: '+state.subcategory+'.',
      preset[state.imageStyle]||preset.cinematic,
      'Landscape 16:9 card composition; subject centered; no words, no lettering, no watermarks, no logos.'
    ].join(' ');
  }
  async function generateCoverImages(epoch){
    let done=0,fail=0;
    for(const idea of state.ideas){
      if(epoch!==state.epoch)break;
      try{
        const result=await callEndpoint('/images',{prompt:imagePrompt(idea),format:'16:9'});
        if(epoch!==state.epoch)break;
        if(typeof result.dataURI!=='string'||!result.dataURI.startsWith('data:image/'))throw Error('Imagen no válida');
        state.covers.set(idea.id,result.dataURI);
        done++;
        renderCards();renderFeature();
        setStatus('✓ '+state.ideas.length+' historias escritas. Portadas IA: '+done+' de '+state.ideas.length+' listas.');
      }catch(error){
        if(epoch!==state.epoch)break;
        fail++;
        if(fail>=3){
          setStatus('Se prepararon '+state.ideas.length+' sinopsis y '+done+' portadas IA. Cloudflare alcanzó un límite o tuvo errores; las restantes usan ilustraciones locales.');
          break;
        }
      }
    }
    if(epoch===state.epoch&&fail===0)setStatus('✓ '+state.ideas.length+' historias y '+done+' portadas IA listas. Selecciona una para ver su sinopsis.');
  }
  function createLocalScenes(idea,duration){
    const count=duration===30?5:duration===60?8:12,base=Math.floor(duration/count),extra=duration%count;
    const elenaStory=[
      'Durante veinte años, Elena creyó que Daniel, su primer amor, se había marchado sin despedirse. Ella aprendió a vivir con aquella ausencia.',
      'Una tarde, mientras ordenaba la casa de su abuela, encontró una caja de cartas atada con una cinta azul.',
      'Entre aquellas cartas había una dirigida a Elena, escrita con una letra que reconoció de inmediato: era de Daniel.',
      'La carta llevaba veinte años sin abrirse. Elena tembló al leer la fecha y recordar el verano en que todo terminó.',
      'Daniel no decía que había dejado de quererla. Le contaba que alguien le había asegurado que ella ya no quería volver a verlo.',
      'Elena recordó una discusión familiar de aquel verano. Por primera vez sospechó que alguien había decidido por los dos.',
      'Dentro del sobre encontró también una fotografía pequeña y una dirección antigua, la única pista para localizar a Daniel.',
      'Elena pasó la noche preguntándose si debía buscarlo. Al amanecer comprendió que necesitaba conocer la verdad.',
      'La vieja dirección la llevó a una librería. Allí, una mujer mayor miró la fotografía y reconoció enseguida a Daniel.',
      'Le dijeron que él había conservado durante años la misma esperanza: saber por qué Elena dejó de responder sus cartas.',
      'Cuando finalmente estuvieron frente a frente, ninguno encontró las palabras. Habían perdido décadas por una carta escondida.',
      'Elena entendió que no podían recuperar veinte años, pero sí decidir qué hacer con el tiempo que todavía les quedaba.'
    ];
    const generic=[
      'Todo comenzó con '+idea.title.toLowerCase()+'. '+idea.synopsis,
      'Al principio, nadie sospechaba que esa decisión cambiaría lo que estaba a punto de suceder.',
      'Pero una pista inesperada reveló que había algo más detrás de la primera impresión.',
      'Mientras trataban de encontrar respuestas, surgió un conflicto que parecía imposible de resolver.',
      'La verdad apareció cuando menos la esperaban, y obligó a mirar el pasado de otra manera.',
      'Desde aquel día, ninguna de las personas implicadas volvió a ver la situación del mismo modo.'
    ];
    // El relato local El amor olvidado tiene narración propia ya escrita, no escenas genéricas.
    const raw=idea.title==='El amor olvidado'?elenaStory:generic;
    let time=0;
    return Array.from({length:count},(_,i)=>{
      const seconds=base+(i<extra?1:0);
      const text=raw[Math.min(raw.length-1,Math.floor(i*raw.length/count))]+
        (idea.title==='El amor olvidado'?'':(i===count-1?' '+idea.outline:''));
      const scene={time,duration:seconds,text:text.slice(0,410),
        prompt:'Illustrate the fictional story "'+idea.title+'". '+idea.coverPrompt+
        '. Scene '+(i+1)+' of '+count+'. Visual style: '+state.imageStyle+'. No text.'};
      time+=seconds;return scene;
    });
  }
  function validSources(sources){
    if(!Array.isArray(sources))return[];
    return sources.filter(s=>{
      try{return new URL(s.url).protocol==='https:'}catch{return false}
    }).slice(0,12);
  }
  async function createProject(){
    if(state.building||state.busy)return;
    const idea=selectedIdea();if(!idea)return;
    state.epoch++; // Stop background covers before developing the chosen story.
    state.imageStyle=$id('studioImageStyle').value;
    state.pass=$id('studioPass').value.trim()||state.pass;
    state.building=true;renderFeature();
    const duration=Number($id('studioDuration').value)||60;
    const written=state.source==='local';
    const local=written||state.source==='demo';
    const creationTopic=idea.matchType==='related'?idea.title:state.topic;
    setStatus(local?'Creando proyecto con el relato local seleccionado…':
      'Gemini está escribiendo el guion completo de «'+idea.title+'» sin cambiar su trama…');
    try{
      let writtenData;
      if(written){
        setStatus('Leyendo el texto seleccionado; se usará un fragmento acorde a la duración, sin inventar escenas…');
        const original=await window.facelessWrittenStories.read(idea);
        writtenData=window.facelessWrittenStories.scenes(original,duration,idea.title);
      }
      const data=local?{title:idea.title,scenes:written?writtenData.scenes:createLocalScenes(idea,duration),
        sources:written?state.sources:[],provider:written?'Texto publicado / sin IA generativa':'Relato local',mode:written?'texto_publicado':'ficcion',checkedAt:null}:await callEndpoint('/script',{
        topic:creationTopic,
        duration,platform:choice.platform||'TikTok',style:state.style,subcategory:state.subcategory,
        mode:state.mode==='fiction'?'ficcion':state.mode==='news'?'noticias':'informativo',
        idea:{title:idea.title,synopsis:idea.synopsis,outline:idea.outline,sourceUrl:idea.sourceUrl||''}
      });
      const count=duration===30?5:duration===60?8:12;
      if(!Array.isArray(data.scenes)||data.scenes.length!==count)throw Error('El guion no respetó la duración. Intenta de nuevo.');
      const base=Math.floor(duration/count),extra=duration%count;
      let time=0;
      const scenes=data.scenes.map((s,i)=>{
        const seconds=base+(i<extra?1:0);
        const scene={time,duration:seconds,text:String(s.text||'').trim(),
          prompt:String(s.prompt||'').trim()+'. Estilo visual: '+state.imageStyle+'.'};
        time+=seconds;return scene;
      });
      if(scenes.some(s=>!s.text))throw Error('Una escena quedó vacía.');
      const id=String(Date.now())+Math.random().toString(36).slice(2,7);
      const sources=validSources(data.sources);
      if(idea.sourceUrl&&!sources.some(s=>s.url===idea.sourceUrl))sources.unshift({title:idea.sourceTitle||idea.title,url:idea.sourceUrl});
      const project={
        id,title:idea.title,topic:creationTopic,originalQuery:state.topic,matchType:idea.matchType||'exact',matchReason:idea.matchReason||'',platform:choice.platform||'TikTok',
        duration,format:choice.format||'9:16',style:state.style,subcategory:state.subcategory,date:new Date().toISOString(),
        scenes,narration:scenes.map(s=>s.text).join('\n'),hook:scenes[0].text,
        coverTitle:idea.title,coverSynopsis:idea.synopsis,coverPrompt:idea.coverPrompt,
        imageStyle:state.imageStyle,scriptMode:data.mode,
        writtenOriginal:written?(idea.importedOriginal||writtenData.originalText):'',writtenSpanish:writtenData?.originalText||'',writtenExcerpt:writtenData?.excerpt||false,
        voicePreset:'automatic',
        aiProvider:data.provider||'Gemini',sources,inspirationSources:state.mode==='fiction'?validSources(state.sources):[],
        sourceCheckedAt:data.checkedAt||state.checkedAt,searchQuery:state.topic
      };
      projects.unshift(project);
      if(!persist()){projects.shift();throw Error('No hay espacio suficiente para guardar el proyecto.')}
      const cover=state.covers.get(idea.id);
      if(cover){
        const url=URL.createObjectURL(await (await fetch(cover)).blob());
        window.facelessCoverCache.set(id,url);
        await saveCover(id,cover);
      }
      activeId=id;tab='summary';showEditor=false;
      resetMedia();tab='video';route('editor');
      window.facelessProductionPasscode=state.pass;
      toast(writtenData?.excerpt?'✓ Fragmento del texto original preparado. Revisa el fragmento en el editor.':'✓ '+idea.title+' está en creación, con su propio guion.');
    }catch(error){setStatus('No se pudo llevar a creación: '+String(error?.message||error))}
    finally{state.building=false;if($id('studioFeature'))renderFeature()}
  }
  shell();
  window.mountFriendlyStudioMenus?.();
  window.facelessStudioReady=true;
})();

