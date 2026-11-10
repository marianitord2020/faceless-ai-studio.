/* Faceless AI Studio — catálogo visual de historias y noticias verificadas.
   Módulo independiente del editor, fotografías, narración y exportación originales. */
(() => {
  'use strict';
  const API='https://faceless-images.marianitord2020.workers.dev';
  const styles=['Romance','Misterio','Historia','Curiosidades','Noticias','Farándula','Motivación','Educativo'];
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
    Motivación:{emoji:'✨',colors:['#5b355e','#cc7054','#192b62']},
    Educativo:{emoji:'🎓',colors:['#134e58','#248487','#15254b']}
  };
  const state={ideas:[],selected:0,mode:'fiction',topic:'',style:'Romance',source:'ai',imageStyle:'cinematic',
    pass:'',busy:false,building:false,epoch:0,covers:new Map(),sources:[],checkedAt:null};
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
    '<aside class="studio-rail" aria-label="Herramientas del estudio">'+
    '<h3>Mi estudio creativo</h3>'+
    '<button type="button" class="active" id="studioSideNew">✦ Crear proyecto</button>'+
    '<button type="button" id="studioSideProjects">▱ Mis proyectos</button>'+
    '<button type="button" id="studioSideOld">◫ Editor clásico</button>'+
    '<button type="button" id="studioSideVoices">♫ Voces IA</button>'+
    '<button type="button" id="studioSidePhotos">▧ Imágenes IA</button>'+
    '<div class="studio-free"><b>♢ Etapa gratuita</b><span>Cloudflare y Gemini sujetos a sus cuotas. No se activan servicios de pago.</span></div>'+
    '</aside>'+
    '<div class="studio-center">'+
    '<div class="studio-title"><div><h1>Generador de <span class="sparkle">Relatos y Noticias</span> con IA</h1>'+
    '<p>Elige un estilo y descubre portadas con título y sinopsis. Tú decides qué historia llevar a creación.</p></div></div>'+
    '<div class="studio-settings">'+
    '<div class="studio-fields">'+
    '<div class="studio-field"><label for="studioGenre"><em>1</em> Estilo narrativo</label><select id="studioGenre"></select></div>'+
    '<div class="studio-field"><label for="studioTopic"><em>2</em> Tema o búsqueda</label><input id="studioTopic" type="text" maxlength="220" placeholder="Ej.: Historias de amor"></div>'+
    '<div class="studio-field"><label for="studioMode"><em>3</em> Tipo de contenido</label><select id="studioMode">'+
    '<option value="fiction">Relatos creativos</option><option value="news">Noticias reales y actuales</option><option value="factual">Documentales / hechos reales</option></select></div>'+
    '<div class="studio-field"><button class="studio-generate" type="button" id="studioGenerate">⌕ Generar 10 propuestas</button></div></div>'+
    '<div class="studio-addons">'+
    '<div class="studio-addon"><label for="studioSource">Origen de propuestas</label><select id="studioSource"><option value="ai">IA — Gemini</option><option value="local">Local — sin IA</option></select></div>'+
    '<div class="studio-addon"><label for="studioImageStyle">Estilo de imágenes</label><select id="studioImageStyle"></select></div>'+
    '<div class="studio-addon"><label for="studioDuration">Duración</label><select id="studioDuration"><option value="30">30 segundos</option><option value="60" selected>60 segundos</option><option value="120">120 segundos</option></select></div>'+
    '<div class="studio-addon pass"><label for="studioPass">Código APP_PASSCODE</label><input id="studioPass" type="password" autocomplete="new-password" placeholder="Solo para IA; no es tu API Key"></div>'+
    '<div class="studio-helper">Para noticias se usa Google Search. Se muestran solo fuentes recuperadas, nunca noticias inventadas. Las portadas visuales de noticias son ilustraciones editoriales.</div></div>'+
    '</div>'+
    '<div class="studio-results-head"><div><h2>✦ <span id="studioGalleryTitle">10 propuestas de historias</span></h2>'+
    '<p id="studioGallerySubtitle">Selecciona un relato, lee su sinopsis y llévalo a creación.</p></div>'+
    '<span class="studio-results-tag" id="studioGalleryTag">Sin propuestas</span></div>'+
    '<p id="studioStatus" class="studio-status" aria-live="polite"></p>'+
    '<div class="studio-results-layout"><div id="studioCards" class="studio-cards"></div>'+
    '<aside class="studio-feature" id="studioFeature" aria-label="Relato seleccionado"></aside></div>'+
    '<p class="studio-limit" id="studioLimit">Una portada seleccionada siempre conservará su título, tema y sinopsis al crear el guion.</p>'+
    '</div></div>';
    const genre=$id('studioGenre');for(const name of styles){const opt=new Option(name,name);genre.add(opt)}
    genre.value='Romance';
    const image=$id('studioImageStyle');for(const [key,name] of imageStyles)image.add(new Option(name,key));
    $id('studioTopic').value='Historias de amor';
    $id('studioSideNew').onclick=()=>{$id('studioTopic').focus()};
    $id('studioSideProjects').onclick=()=>route('projects');
    $id('studioSideOld').onclick=()=>route('create');
    $id('studioSideVoices').onclick=()=>{toast('Selecciona un relato. En 🎬 Video podrás elegir voz automática o manual.')};
    $id('studioSidePhotos').onclick=()=>{toast('Selecciona un relato para abrir el generador de imágenes de escenas.')};
    genre.onchange=()=>{
      if(genre.value==='Noticias'){
        $id('studioMode').value='news';
        $id('studioSource').value='ai';
      }else if($id('studioMode').value==='news')$id('studioMode').value='fiction';
    };
    $id('studioMode').onchange=()=>{
      if($id('studioMode').value==='news')genre.value='Noticias';
      if($id('studioMode').value!=='fiction')$id('studioSource').value='ai';
    };
    $id('studioSource').onchange=()=>{
      const local=$id('studioSource').value==='local';
      if(local&&$id('studioMode').value!=='fiction'){
        $id('studioMode').value='fiction';
        $id('studioGallerySubtitle').textContent='Sin conexión solo hay relatos ficticios predefinidos; las noticias requieren fuentes actuales.';
      }
    };
    $id('studioGenerate').onclick=generateIdeas;
    $id('studioTopic').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();generateIdeas()}});
    // Portadas de demostración visibles al abrir, igual que el diseño aprobado.
    state.ideas=localIdeas('Historias de amor','Romance');
    state.topic='Historias de amor';
    state.style='Romance';state.source='local';state.mode='fiction';
    $id('studioSource').value='local';
    renderCards();renderFeature();
    setStatus('✦ Catálogo local de ejemplo. Puedes elegir El amor olvidado o escribir otro tema y generar 10 propuestas con Gemini.');
  }
  function initialState(){
    $id('studioCards').replaceChildren();
    const empty=e('div','studio-state');
    empty.style.gridColumn='1 / -1';
    const icon=e('span','big','✦');
    empty.append(icon,e('b',null,'Tu próxima historia empieza aquí'),
      e('p',null,'Escribe un tema y pulsa «Generar 10 propuestas». Cada portada tendrá su propia sinopsis; después podrás elegir una.'));
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
    const publisherPhoto=state.mode==='news'&&idea.sourceImageUrl?idea.sourceImageUrl:null;
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
      large?(state.mode==='news'?'📰 Noticia verificada':state.style):'#'+(index+1));
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
        e('span','chip',state.mode==='news'?'📰 Fuente real':state.mode==='factual'?'📚 Documental':'✦ '+state.style));
      card.append(picture,body);
      card.onclick=()=>{state.selected=index;renderCards();renderFeature()};
      cards.appendChild(card);
    });
    $id('studioGalleryTag').textContent=state.ideas.length+' '+(state.mode==='news'?'noticias verificadas':'propuestas');
    $id('studioGalleryTitle').textContent=state.mode==='news'?'Noticias encontradas':state.ideas.length+' propuestas de '+(state.mode==='factual'?'documentales':'historias');
    $id('studioGallerySubtitle').textContent=state.mode==='news'
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
    const meta=e('div','studio-feature-meta');
    meta.append(e('span',null,'◷ '+$id('studioDuration').value+' segundos'),
      e('span',null,'▱ '+(Number($id('studioDuration').value)===30?5:Number($id('studioDuration').value)===60?8:12)+' escenas'));
    if(idea.sourceSeenAt)meta.append(e('span',null,'Detectada por GDELT: '+idea.sourceSeenAt));
    text.appendChild(meta);
    const button=e('button','studio-create',state.building?'Preparando guion…':'▣ Llevar a creación');
    button.type='button';button.disabled=state.building;button.onclick=createProject;
    text.appendChild(button);
    if(idea.sourceUrl){
      const a=e('a','studio-source','↗ Ver fuente original');
      a.href=idea.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';text.appendChild(a);
    }
    feature.append(picture,text);
    if(state.mode==='news'){
      const credit=e('p','studio-limit','Noticias detectadas por GDELT Project. La fecha corresponde a observación, no necesariamente al hecho. Verifica la noticia en el medio antes de publicar. Las fotografías del medio no se incorporan al video sin permiso.');
      feature.appendChild(credit);
      const attribution=e('a','studio-source','Datos: GDELT Project');
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
    const response=await fetch(API+path,{method:'POST',headers:{'content-type':'application/json','x-app-token':pass},
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
    const requestedMode=$id('studioMode').value;
    const local=$id('studioSource').value==='local';
    const mode=style==='Noticias'?'news':requestedMode;
    if(topic.length<5){setStatus('Escribe un tema de al menos cinco caracteres.');$id('studioTopic').focus();return}
    if(local&&mode!=='fiction'){setStatus('Las noticias y los documentales reales requieren IA y fuentes actuales. Cambia el origen a «IA — Gemini».');return}
    state.busy=true;state.epoch++;const epoch=state.epoch;
    state.pass=$id('studioPass').value.trim()||state.pass;
    state.topic=topic;state.style=style;state.mode=mode;state.source=local?'local':'ai';
    state.imageStyle=$id('studioImageStyle').value;
    state.selected=0;state.covers.clear();state.sources=[];state.ideas=[];
    $id('studioGenerate').disabled=true;
    try{
      if(local){
        state.ideas=localIdeas(topic,style);
        setStatus('✓ 10 relatos locales preparados sin usar créditos de IA. Son ejemplos de ficción; puedes elegir uno.');
      }else{
        setStatus(mode==='news'?'Consultando Google Search para noticias reales y fuentes actuales…':
          'Gemini está preparando 10 títulos y sinopsis sobre «'+topic+'»…');
        const result=await callEndpoint('/ideas',{topic,style,mode});
        if(epoch!==state.epoch)return;
        if(!Array.isArray(result.ideas)||!result.ideas.length)throw Error('La búsqueda no devolvió propuestas verificables.');
        state.ideas=result.ideas.slice(0,10);
        state.sources=Array.isArray(result.sources)?result.sources:[];
        state.checkedAt=result.checkedAt||null;
        setStatus('✓ '+state.ideas.length+' '+(mode==='news'?'noticias vinculadas a fuentes':'propuestas con sinopsis')+
          '. '+(mode==='news'?'No se inventaron titulares para completar diez.':'Generando sus imágenes de portada…'));
      }
      renderCards();renderFeature();
      if(!local&&mode!=='news')await generateCoverImages(epoch);
    }catch(error){
      setStatus('No se pudieron preparar las portadas: '+String(error?.message||error));
      if(!state.ideas.length)initialState();
    }finally{
      state.busy=false;$id('studioGenerate').disabled=false;
    }
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
      'Central theme: '+state.topic+'.',
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
    const raw=[
      'Todo comenzó con '+idea.title.toLowerCase()+'. '+idea.synopsis,
      'Al principio, nadie sospechaba que esa decisión cambiaría lo que estaba a punto de suceder.',
      'Pero una pista inesperada reveló que había algo más detrás de la primera impresión.',
      'Mientras trataban de encontrar respuestas, surgió un conflicto que parecía imposible de resolver.',
      'La verdad apareció cuando menos la esperaban, y obligó a mirar el pasado de otra manera.',
      'Desde aquel día, ninguna de las personas implicadas volvió a ver la situación del mismo modo.'
    ];
    let time=0;
    return Array.from({length:count},(_,i)=>{
      const seconds=base+(i<extra?1:0);
      const text=raw[Math.min(raw.length-1,Math.floor(i*raw.length/count))]+' '+(i===count-1?idea.outline:'');
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
    state.building=true;renderFeature();
    const duration=Number($id('studioDuration').value)||60;
    const local=state.source==='local';
    setStatus(local?'Creando proyecto con el relato local seleccionado…':
      'Gemini está escribiendo el guion completo de «'+idea.title+'» sin cambiar su trama…');
    try{
      const data=local?{title:idea.title,scenes:createLocalScenes(idea,duration),
        sources:[],provider:'Relato local',mode:'ficcion',checkedAt:null}:await callEndpoint('/script',{
        topic:state.topic,
        duration,platform:choice.platform||'TikTok',style:state.style,
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
        id,title:idea.title,topic:state.topic,platform:choice.platform||'TikTok',
        duration,format:choice.format||'9:16',style:state.style,date:new Date().toISOString(),
        scenes,narration:scenes.map(s=>s.text).join('\n'),hook:scenes[0].text,
        coverTitle:idea.title,coverSynopsis:idea.synopsis,coverPrompt:idea.coverPrompt,
        imageStyle:state.imageStyle,scriptMode:data.mode,
        voicePreset:'automatic',
        aiProvider:data.provider||'Gemini',sources,
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
      resetMedia();route('editor');
      toast('✓ '+idea.title+' está en creación, con su propio guion.');
    }catch(error){setStatus('No se pudo llevar a creación: '+String(error?.message||error))}
    finally{state.building=false;if($id('studioFeature'))renderFeature()}
  }
  shell();
  window.facelessStudioReady=true;
})();
