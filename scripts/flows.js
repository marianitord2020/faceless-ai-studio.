/* Separate entry points; original generation and export handlers remain in place. */
(() => {
 'use strict';
 const base=new URL('../',document.currentScript.src).pathname;
 window.facelessFlow='ai';
 const path=mode=>base+(mode==='manual'?'editar-sin-ia/':'crear-con-ia/');
 window.facelessHomeURL=()=>{if(location.pathname!==base||location.search)history.pushState({},'',base);};
 function enter(mode,push=true){
  if(facelessIsWorking())return;
  window.facelessFlow=mode;document.body.dataset.flow=mode;
  if(push)history.pushState({},'',path(mode));
  if(mode==='ai'){route('discover');return;}
  let p=current();
  if(!p||p.creationFlow!=='manual'){p=projects.find(project=>project.creationFlow==='manual');if(p)activeId=p.id;}
  if(!p||p.creationFlow!=='manual'){
   p={id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),creationFlow:'manual',title:'Mi video',topic:'Mi montaje',platform:'TikTok',duration:30,format:'9:16',style:'Personalizado',date:new Date().toISOString(),narration:'',hook:'',scenes:[{time:0,duration:30,text:'',prompt:''}]};
   projects.unshift(p);activeId=p.id;persist();resetMedia();
  }
  tab='video';showEditor=false;route('editor');
 }
 document.addEventListener('click',event=>{
  const card=event.target.closest('a[data-flow]');if(card){event.preventDefault();enter(card.dataset.flow);}
 });
 const originalRoute=route;
 route=function(name){
  if(name==='discover'&&window.facelessFlow==='manual'){enter('manual');return;}
  if(name==='editor'){
   const p=current();if(p?.creationFlow){window.facelessFlow=p.creationFlow;document.body.dataset.flow=p.creationFlow;history.replaceState({},'',path(p.creationFlow));}
  }
  return originalRoute(name);
 };
 // Projects retain their flow when reopened from the project list.
 const originalPersist=persist;
 persist=function(){const p=current();if(p&&!p.creationFlow)p.creationFlow=window.facelessFlow;return originalPersist();};
 const discover=document.getElementById('discover'),back=document.createElement('button');back.type='button';back.className='btn small flow-back';back.textContent='← Volver al inicio';back.dataset.route='home';discover.before(back);
 // Keep the return link outside the discover renderer, which rebuilds its contents.
 back.id='discoverFlowBack';
 window.addEventListener('popstate',()=>{
  if(location.pathname===base){originalRoute('home');return;}
  enter(location.pathname.includes('editar-sin-ia')?'manual':'ai',false);
 });
 window.facelessMountCaptionStyle=(p,host)=>{
  const panel=document.createElement('section');panel.className='editor-video-card caption-style';
  panel.innerHTML='<label class="group-label" for="captionStyle">Estilo de subtítulos</label><select id="captionStyle"><option value="highlight">Palabra resaltada · amarillo</option><option value="purple">Palabra resaltada · violeta</option><option value="classic">Clásico · blanco</option></select>';
  const select=panel.querySelector('select');select.replaceChildren(...Object.entries(FacelessCinema.captionStyles).map(([value,theme])=>{const option=document.createElement('option');option.value=value;option.textContent=theme.name;return option;}));select.value=p.captionStyle||'highlight';select.onchange=()=>{p.captionStyle=select.value;persist();drawFrame(0);const view=document.getElementById('previewCanvas');view?.getContext('2d').drawImage(canvas,0,0,view.width,view.height);};host.append(panel);
 };
 window.facelessManualLayout=(p,root)=>{
  const byId=id=>document.getElementById(id),shell=root.parentElement;
  const frame=root.querySelector('.media-frame');
  const cards=document.createElement('div');cards.className='editor-video-cards manual-cards';
  // Keep controls connected while moving them: existing handlers and async restores use IDs.
  shell.append(cards);
  const makeCard=(number,title,caption)=>{
   const card=document.createElement('section');card.className='editor-video-card manual-card';
   const head=document.createElement('div');head.className='editor-card-heading';
   const badge=document.createElement('span');badge.className='manual-step';badge.textContent=number;badge.setAttribute('aria-hidden','true');
   const copy=document.createElement('div'),heading=document.createElement('h3'),description=document.createElement('p');
   heading.textContent=title;description.className='editor-card-caption';description.textContent=caption;copy.append(heading,description);head.append(badge,copy);card.append(head);cards.append(card);return card;
  };
  const move=(id,host)=>{const node=byId(id);if(node)host.append(node);};
  const visual=makeCard('01','Fotos y video','Usa tus archivos o busca imágenes para tus escenas.');
  const uploads=document.createElement('div');uploads.className='manual-upload-grid';visual.append(uploads);
  const upload=document.createElement('div');upload.className='media-upload-group manual-video-upload';
  upload.innerHTML='<span class="media-upload-heading">Tu video <small>Opcional</small></span><input id="ownVideo" type="file" accept="video/*" hidden aria-label="Seleccionar mi video"><button type="button" id="pickOwnVideo" class="media-upload-trigger"><span class="media-upload-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="12" height="14" rx="3"/><path d="m15 10 6-3v10l-6-3"/></svg></span><span class="media-upload-copy"><strong>Subir mi video</strong><small>Elige un clip de tu galería</small></span><span class="media-upload-plus" aria-hidden="true">+</span></button><p id="ownVideoStatus" class="smalltext manual-file-note"></p><button id="removeOwnVideo" class="btn small" type="button" hidden>Quitar video</button>';
  uploads.append(byId('images').closest('.media-upload-group'),upload);
  byId('pickOwnVideo').onclick=()=>{if(!facelessIsWorking())byId('ownVideo').click();};
  window.facelessMountOwnVideo?.(p,upload);
  ['imageCount','manualPhotoSlots','stockPhotos'].forEach(id=>move(id,visual));
  const audio=makeCard('02','Audio','Añade tu narración o grábala desde el teléfono.');
  audio.append(byId('audio').closest('.media-upload-group'));
  ['audioCount','audioAttachment','audioSyncStatus','cancelLocalSpeech'].forEach(id=>move(id,audio));
  byId('syncAudio').hidden=false;byId('syncAudio').textContent='Sincronizar con IA local';
  byId('audioAttachment').querySelector('p').textContent='La IA local sincroniza automáticamente tu voz, los subtítulos y las fotos. Puedes ajustar el resultado en Subtítulos.';
  const recorder=byId('startMic').closest('.record-panel'),recordDetails=document.createElement('details');recordDetails.className='manual-disclosure';
  const recordSummary=document.createElement('summary');recordSummary.textContent='Grabar mi voz';recordDetails.append(recordSummary,recorder);audio.append(recordDetails);
  recorder.querySelector('b')?.remove();
  const captions=makeCard('03','Subtítulos','La IA local crea y sincroniza los subtítulos con tu audio. También puedes editarlos.');
  const label=document.createElement('label');label.className='sr-only';label.htmlFor='manualCaptions';label.textContent='Subtítulos manuales';
  const field=document.createElement('textarea');field.id='manualCaptions';field.rows=4;field.placeholder='Escribe aquí tus subtítulos…';field.value=p.scenes.map(s=>s.text).join('\n');
  const save=document.createElement('button');save.id='saveManualCaptions';save.type='button';save.className='btn small manual-save-captions';save.textContent='Guardar subtítulos';
  save.onclick=()=>{const raw=field.value.trim();if(raw)applyNarrationToScenes(p,raw);else{p.scenes.forEach(s=>s.text='');p.narration='';}delete p.subtitleCues;delete p.subtitleTextSignature;persist();renderEditor();toast('Subtítulos guardados.');};
  captions.append(label,field,save);window.facelessMountCaptionStyle(p,captions);
  // Timing controls stay available with or without an uploaded audio file.
  window.facelessMountManualTiming?.(p,()=>{drawFrame(0);const view=byId('previewCanvas');view?.getContext('2d').drawImage(canvas,0,0,view.width,view.height);});
  move('manualTiming',captions);
  window.facelessMountExportOptions?.(p,cards);
  const preview=makeCard('04','Vista previa','Revisa tu montaje antes de exportarlo.');preview.classList.add('manual-preview-card');
  preview.append(frame);move('mediaFormatNote',preview);move('downloadArea',preview);
  const status=byId('renderStatus'),toolbar=document.createElement('div');toolbar.className='editor-export-bar';shell.append(toolbar);
  move('previewVideo',toolbar);move('renderVideo',toolbar);byId('renderVideo').textContent='Exportar mi video';
  const previewButton=byId('previewVideo'),originalPreview=previewButton.onclick;
  previewButton.onclick=function(event){if(!previewTimer)frame.scrollIntoView({block:'center',behavior:'smooth'});return originalPreview.call(this,event);};
  shell.className='compact-video-editor manual-video-editor';shell.replaceChildren(cards,status,toolbar);window.facelessMountManualStudio?.(p,cards,preview);
 };
 const requested=new URLSearchParams(location.search).get('mode');
 if(requested){history.replaceState({},'',path(requested==='manual'?'manual':'ai'));enter(requested==='manual'?'manual':'ai',false);}else route('home');
})();
