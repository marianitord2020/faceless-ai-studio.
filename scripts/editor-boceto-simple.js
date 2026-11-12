/* Editor de Escenas simplificado — boceto aprobado.
 * Reorganiza controles y componentes reales; NO reemplaza generación, clips,
 * línea de tiempo, reproducción, exportación ni almacenamiento originales.
 * Todo mantiene los listeners de los elementos existentes. */
(() => {
  'use strict';
  const editor=document.getElementById('editor');
  const tabBody=document.getElementById('tabBody');
  if(!editor||!tabBody)return;
  const $=id=>document.getElementById(id);
  let currentView='escenas',editorVisible=false,queued=false;
  let releaseHeroListener=()=>{};
  const tabMap={guion:'narration',escenas:'video',video:'video',exportar:'video'};
  const labels={guion:'▤ Guion',escenas:'▣ Escenas',video:'▷ Video',exportar:'⇧ Exportar'};
  let navigation=null;
  function nativeTab(){return editor.querySelector('.tabs button.on')?.dataset.tab||'';}
  function project(){return typeof current==='function'?current():null;}
  function notify(message){
    const status=$('renderStatus')||$('micStatus');
    if(status)status.textContent=message;
  }
  function tabTo(name){const target=editor.querySelector('.tabs [data-tab="'+name+'"]');if(target&&!target.classList.contains('on'))target.click();}
  function showView(next,scroll=true){
    if(!tabMap[next])return;
    currentView=next;
    editor.dataset.bocetoView=next;
    if(navigation)for(const button of navigation.querySelectorAll('[data-boceto-tab]')){
      const active=button.dataset.bocetoTab===next;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',String(active));
      button.tabIndex=active?0:-1;
    }
    tabTo(tabMap[next]);
    schedule();
    if(scroll&&navigation)navigation.scrollIntoView({block:'start',behavior:'smooth'});
  }
  function mountNavigation(){
    if(navigation?.isConnected)return;
    navigation=document.createElement('div');
    navigation.className='boceto-editor-nav';
    navigation.id='bocetoEditorNav';
    navigation.setAttribute('role','tablist');
    navigation.setAttribute('aria-label','Etapas del editor de video');
    navigation.innerHTML=Object.entries(labels).map(([key,label])=>'<button type="button" role="tab" data-boceto-tab="'+key+'" aria-selected="false">'+label+'</button>').join('');
    navigation.addEventListener('click',event=>{
      const button=event.target.closest('[data-boceto-tab]');
      if(button)showView(button.dataset.bocetoTab);
    });
    const anchor=editor.querySelector('.ref-editor-nav')||editor.querySelector('.fc-steps')||editor.querySelector('.tabs');
    anchor?.before(navigation);
    showView(currentView,false);
  }
  const wrap=(className,html='')=>{
    const el=document.createElement('section');el.className=className;el.innerHTML=html;return el;
  };
  function heroState(card,projectID){
    if(!card.isConnected||project()?.id!==projectID)return;
    const loaded=Boolean(window.facelessHeroStatus?.().loaded);
    const poster=loaded?window.facelessHeroPoster?.():'';
    const preview=card.querySelector('.boceto-hero-cover');
    const label=card.querySelector('.boceto-hero-summary');
    if(preview){
      if(poster&&preview.getAttribute('src')!==poster)preview.src=poster;
      preview.hidden=!poster;
    }
    if(label)label.textContent=loaded?
      '✓ Clip real cargado · '+(Number(project()?.heroDuration||6)).toFixed(1)+' s':
      'Sin introducción · puedes usar un video propio';
    card.classList.toggle('has-clip',loaded);
  }
  function addScene(p){
    if(!p?.scenes?.length)return;
    if(window.facelessMediaBusy||typeof rendering!=='undefined'&&rendering){
      notify('Termina el montaje antes de editar las escenas.');return;
    }
    // Dividir la última escena preserva la duración global y los tiempos del proyecto.
    const last=p.scenes[p.scenes.length-1];
    if(Number(last.duration)<4){
      notify('Para añadir otra escena, necesitas al menos 4 segundos en la última escena.');return;
    }
    const remaining=Number(last.duration),first=Number((remaining/2).toFixed(2)),second=Number((remaining-first).toFixed(2));
    const start=Number(last.time)||0;
    last.duration=first;
    p.scenes.push({time:start+first,duration:second,text:'Nueva escena: edita aquí la narración.',prompt:'Describe la imagen de esta escena.'});
    // Invalidar la firma antigua evita exportar subtítulos desincronizados.
    delete p.subtitleTextSignature;delete p.audioAlignment;delete p.subtitleCues;
    p.narration=p.scenes.map(scene=>String(scene.text||'')).join('\n');
    if(typeof persist==='function')persist();
    if(typeof renderEditor==='function')renderEditor();
    currentView='escenas';
    showView('escenas',false);
    notify('Nueva escena añadida. La duración total permanece igual; revisa la sincronización de la narración.');
  }
  function mountVideo(){
    if(document.body.dataset.screen!=='editor'||nativeTab()!=='video')return;
    const root=tabBody.querySelector('.compact-video-editor');
    const p=project();
    if(!root||!p||root.dataset.bocetoBuilt==='1')return;
    // Otros módulos montan primero sus herramientas; no crear copias de controles.
    const frame=root.querySelector('.fc-editor-stage');
    const timeline=tabBody.querySelector('.fc-video-timeline');
    const hero=root.querySelector('#finalHeroPanel');
    const transitions=root.querySelector('#finalTransitionPanel');
    const cards=root.querySelector('.editor-video-cards');
    const style=tabBody.querySelector('#fcx-visual-toolbar');
    const auto=root.querySelector('#videoAutoCard');
    const photos=root.querySelector('#videoPhotosCard');
    const voice=root.querySelector('#videoVoiceCard');
    const tools=root.querySelector('.editor-export-bar');
    const download=root.querySelector('#downloadArea');
    const settings=root.querySelector('.export-options');
    const infrastructure=root.querySelector('#manualInfrastructure');
    const status=root.querySelector('#renderStatus');
    if(!frame||!timeline||!hero||!transitions||!cards||!auto||!photos||!voice||!tools||!settings||!style)return;
    root.dataset.bocetoBuilt='1';
    root.classList.add('boceto-editor-workspace');
    const main=wrap('boceto-editor-main'),sidebar=wrap('boceto-editor-sidebar');
    const display=wrap('boceto-player','<div class="boceto-player-header"><b>Vista previa</b><span>'+String(p.format||'9:16')+' · '+Math.round(Number(p.duration)||0)+' s</span></div>');
    display.append(frame);main.append(display);
    const timelineBox=wrap('boceto-timeline-card');
    timelineBox.append(timeline);
    const add=document.createElement('button');
    add.type='button';add.className='boceto-add-scene';add.textContent='＋ Añadir escena';add.title='Divide la última escena manteniendo la duración del video';
    add.addEventListener('click',()=>addScene(p));
    timeline.querySelector('.fc-timeline-head')?.append(add);
    const timelineHelp=timeline.querySelector(':scope > p');
    if(timelineHelp)timelineHelp.textContent='Selecciona una miniatura para editar esa escena.';
    main.append(timelineBox);
    const heroCard=wrap('boceto-hero-card',
      '<div class="boceto-card-heading"><h3>✦ Hero Video <small>Introducción</small></h3><span class="boceto-hero-time">5–8 s</span></div>'+
      '<div class="boceto-hero-row"><img class="boceto-hero-cover" alt="Fotograma real del Hero Video" hidden>'+
      '<div><p class="boceto-hero-summary" role="status">Preparando el clip…</p>'+
      '<div class="boceto-hero-buttons"><button type="button" class="boceto-hero-change">Cambiar clip</button></div></div></div>');
    const heroDetail=document.createElement('details');
    heroDetail.className='boceto-hero-detail';
    heroDetail.innerHTML='<summary>Ajustar clip</summary>';
    heroDetail.append(hero);
    heroCard.append(heroDetail);main.append(heroCard);
    heroCard.querySelector('.boceto-hero-change').onclick=()=>hero.querySelector('#finalHeroAdd')?.click();
    heroState(heroCard,p.id);
    releaseHeroListener();
    const updateHero=()=>heroState(heroCard,p.id);
    document.addEventListener('faceless-media-updated',updateHero);
    const heroWatcher=new MutationObserver(updateHero);
    heroWatcher.observe(hero,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden']});
    releaseHeroListener=()=>{document.removeEventListener('faceless-media-updated',updateHero);heroWatcher.disconnect();};
    // Reusar botones reales: IA, fotos y voz comparten sus manejadores existentes.
    const aiCard=wrap('boceto-ai-card',
      '<header><div><h3>✦ Generación automática con IA</h3>'+
      '<p>Fotos, narración y subtítulos sincronizados.</p></div></header>');
    aiCard.append(auto);
    const options=document.createElement('details');options.className='boceto-ai-more';
    options.innerHTML='<summary>⚙ Personalizar</summary>';
    // Conservar el código avanzado original, pero quitar el segundo "Personalizar".
    const obsoleteAutoSettings=auto.querySelector(':scope > .editor-personalize');
    if(obsoleteAutoSettings){
      for(const child of [...obsoleteAutoSettings.children]){
        if(child.tagName!=='SUMMARY')options.append(child);
      }
      obsoleteAutoSettings.remove();
    }
    options.append(photos);
    const styleCard=wrap('boceto-style-card');styleCard.append(style);options.append(styleCard);
    const voiceCard=wrap('boceto-voice-card');voiceCard.append(voice);options.append(voiceCard);
    const subtitleCard=wrap('boceto-subtitle-card',
      '<header><h3>Aa Subtítulos</h3></header>');
    const choices=document.createElement('select');
    choices.id='bocetoCaption';choices.setAttribute('aria-label','Estilo de subtítulos');
    const names={highlight:'Resaltado amarillo',classic:'Clásico',purple:'Karaoke violeta',neon:'Neón',paper:'Caja blanca',outline:'Contorno',minimal:'Minimalista',comic:'Cómic'};
    choices.innerHTML=Object.entries(names).map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join('');
    choices.value=p.captionStyle||'highlight';
    choices.onchange=()=>{
      p.captionStyle=choices.value;
      const other=$('captionStyle');if(other){other.value=choices.value;other.dispatchEvent(new Event('change',{bubbles:true}));}
      if(typeof persist==='function')persist();
      if(typeof drawFrame==='function'){try{drawFrame(0,0);const source=$('previewCanvas');if(source&&typeof canvas!=='undefined')source.getContext('2d')?.drawImage(canvas,0,0,source.width,source.height);}catch{}}
    };
    subtitleCard.append(choices);options.append(subtitleCard);
    const transitionsCard=wrap('boceto-transitions-card');
    transitionsCard.append(transitions);
    const more=document.createElement('button');more.type='button';more.className='boceto-more-transitions';more.textContent='Ver más';
    const transHead=transitions.querySelector('.final-editor-panel-head');transHead?.append(more);
    more.onclick=()=>{
      const expanded=transitionsCard.classList.toggle('expanded');
      more.textContent=expanded?'Ver menos':'Ver más';more.setAttribute('aria-expanded',String(expanded));
    };
    if([...transitions.querySelectorAll('[data-final-transition]')].findIndex(b=>b.classList.contains('selected'))>=3){
      transitionsCard.classList.add('expanded');more.textContent='Ver menos';
    }
    options.append(transitionsCard);
    aiCard.append(options);sidebar.append(aiCard);
    // Existing export settings, preview and render buttons are moved, not cloned.
    const exportCard=wrap('boceto-export-card',
      '<header><h3>Exportar video</h3><p>Elige el formato y descarga el montaje completo.</p></header>');
    exportCard.append(settings,tools);
    if(status)exportCard.append(status);
    if(download)exportCard.append(download);
    const extras=document.createElement('details');
    extras.className='boceto-extra-media';
    extras.innerHTML='<summary>＋ Añadir mis fotos, audio o recursos</summary>';
    if(infrastructure)extras.append(infrastructure);
    extras.addEventListener('toggle',()=>{
      if(infrastructure)infrastructure.hidden=!extras.open;
    });
    options.append(extras);
    for(const child of [...cards.children])if(child!==auto&&child!==photos&&child!==voice&&child!==settings)extras.append(child);
    root.replaceChildren(main,sidebar,exportCard);
    // No hay menú técnico que oculte la descarga; se muestra en el paso Exportar.
    if(currentView==='exportar')exportCard.scrollIntoView({block:'nearest',behavior:'instant'});
  }
  function sceneBack(){
    const native=nativeTab();
    const old=tabBody.querySelector('.boceto-back-to-timeline');
    if(native==='scenes'&&currentView==='escenas'){
      if(old)return;
      const b=document.createElement('button');b.type='button';b.className='boceto-back-to-timeline';b.textContent='← Volver al reproductor y la línea de tiempo';
      b.onclick=()=>showView('escenas');tabBody.prepend(b);
    }else old?.remove();
  }
  function refresh(){
    const visible=document.body.dataset.screen==='editor';
    if(!visible){editorVisible=false;releaseHeroListener();releaseHeroListener=()=>{};return;}
    mountNavigation();
    if(!editorVisible){
      editorVisible=true;currentView='escenas';showView('escenas',false);
    }
    editor.dataset.bocetoView=currentView;
    mountVideo();
    sceneBack();
  }
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;refresh()});
  }
  new MutationObserver(schedule).observe(tabBody,{childList:true});
  const tabs=editor.querySelector('.tabs');
  if(tabs)new MutationObserver(schedule).observe(tabs,{attributes:true,subtree:true,attributeFilter:['class']});
  new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['data-screen']});
  schedule();
})();
