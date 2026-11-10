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
  const select=panel.querySelector('select');select.value=p.captionStyle||'highlight';select.onchange=()=>{p.captionStyle=select.value;persist();drawFrame(0);const view=document.getElementById('previewCanvas');view?.getContext('2d').drawImage(canvas,0,0);};host.append(panel);
 };
 window.facelessManualLayout=(p,root)=>{
  const shell=root.parentElement,media=root.firstElementChild;
  shell.querySelector(':scope > h3').textContent='✂️ Editar sin IA';
  shell.querySelector(':scope > p').textContent='Añade tus archivos, edita los textos de las escenas y exporta tu montaje.';
  media.querySelector(':scope > .notice')?.remove();
  document.getElementById('syncAudio').hidden=true;
  document.querySelector('#audioAttachment > p').textContent='Ajusta los tiempos de las fotos y los subtítulos manualmente.';
  const upload=document.createElement('section');upload.className='record-panel';
  upload.innerHTML='<label class="group-label" for="ownVideo">Subir mi video</label><input id="ownVideo" type="file" accept="video/*"><p id="ownVideoStatus" class="smalltext"></p><button id="removeOwnVideo" class="btn small" type="button" hidden>Quitar video</button>';
  media.prepend(upload);window.facelessMountOwnVideo?.(p,upload);
  const captions=document.createElement('section');captions.className='record-panel';
  captions.innerHTML='<label class="group-label" for="manualCaptions">Subtítulos manuales</label><textarea id="manualCaptions" placeholder="Escribe tus subtítulos. Una línea por escena."></textarea><button id="saveManualCaptions" class="btn small" type="button">Guardar subtítulos</button>';
  const field=captions.querySelector('textarea');field.value=p.scenes.map(s=>s.text).join('\n');
  captions.querySelector('button').onclick=()=>{const raw=field.value.trim();if(raw)applyNarrationToScenes(p,raw);else{p.scenes.forEach(s=>s.text='');p.narration='';}delete p.subtitleCues;delete p.subtitleTextSignature;persist();renderEditor();toast('Subtítulos guardados.');};
  media.append(captions);window.facelessMountCaptionStyle(p,media);
  document.getElementById('renderVideo').textContent='Exportar mi video';
  const note=[...media.querySelectorAll(':scope > p')].find(n=>n.textContent.includes('narración IA'));if(note)note.remove();
  // Manual timing remains accessible even without an uploaded narration.
  window.facelessMountManualTiming?.(p,()=>drawFrame(0));
  const timing=document.getElementById('manualTiming');if(timing)media.append(timing);
 };
 const requested=new URLSearchParams(location.search).get('mode');
 if(requested){history.replaceState({},'',path(requested==='manual'?'manual':'ai'));enter(requested==='manual'?'manual':'ai',false);}else route('home');
})();
