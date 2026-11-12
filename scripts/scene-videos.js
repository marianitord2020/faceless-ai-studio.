/* Clips MP4/WebM por escena. Archivos locales: nunca se envían a servicios externos.
 * El mismo fotograma se compone en vista previa y exportación.
 */
(() => {
 'use strict';
 const clips=new Map(), restoring=new Map();
 const maxBytes=120_000_000;
 let active=null;
 const key=(id,index)=>id+':scene-video:'+index;
 const currentProject=()=>typeof current==='function'?current():null;
 const mapFor=id=>{if(!clips.has(id))clips.set(id,new Map());return clips.get(id);};
 const record=(p,index)=>clips.get(p.id)?.get(index)||null;
 const locked=()=>Boolean(typeof facelessIsWorking==='function'&&facelessIsWorking());
 function refresh(p){
  document.dispatchEvent(new CustomEvent('faceless-media-updated',{detail:p.id}));
  if(currentProject()?.id!==p.id||typeof rendering!=='undefined'&&rendering)return;
  if(typeof previewTimer!=='undefined'&&previewTimer)return;
  try{
   const manual=window.facelessManualStudio;
   if(manual?.projectId===p.id){manual.redraw();return;}
   const view=document.getElementById('previewCanvas');
   if(view&&!view.classList.contains('hidden')&&typeof drawFrame==='function'){
    drawFrame(0,0);view.getContext('2d').drawImage(canvas,0,0,view.width,view.height);
   }
  }catch(error){console.warn('Miniatura de escena: '+error.message);}
 }
 function invalidate(p){
  if(currentProject()?.id!==p.id)return;
  if(typeof stopPreview==='function')stopPreview();
  const result=document.getElementById('videoResult');
  if(result){result.pause();result.removeAttribute('src');result.load();result.classList.add('hidden');}
  document.getElementById('previewCanvas')?.classList.remove('hidden');
  document.getElementById('downloadArea')?.replaceChildren();
  if(typeof previewURL!=='undefined'&&previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}
 }
 function pause(){
  for(const entries of clips.values())for(const item of entries.values())item.video.pause();
  active=null;
 }
 function dispose(item){
  if(!item)return;
  item.video.pause();item.video.removeAttribute('src');item.video.load();
  URL.revokeObjectURL(item.url);
 }
 async function normalize(file){
  if(!file?.size)throw Error('El video está vacío.');
  if(file.size>maxBytes)throw Error('El video supera los 120 MB. Comprímelo antes de subirlo.');
  const header=new Uint8Array(await file.slice(0,12).arrayBuffer());
  const mp4=String.fromCharCode(...header.slice(4,8))==='ftyp';
  const webm=[0x1a,0x45,0xdf,0xa3].every((n,i)=>header[i]===n);
  if(!mp4&&!webm)throw Error('Archivo inválido: selecciona un MP4 o WebM real.');
  const type=mp4?'video/mp4':'video/webm';
  return file.type===type?file:new File([file],file.name||'clip', {type,lastModified:file.lastModified||Date.now()});
 }
 async function prepare(file){
  const normalized=await normalize(file);
  const url=URL.createObjectURL(normalized);
  const video=document.createElement('video');
  video.preload='auto';video.playsInline=true;video.muted=true;video.loop=true;
  try{
   await new Promise((resolve,reject)=>{
    let done=false;
    const end=error=>{if(done)return;done=true;clearTimeout(timer);video.removeEventListener('loadedmetadata',good);video.removeEventListener('error',bad);error?reject(error):resolve();};
    const good=()=>end(),bad=()=>end(Error('Tu navegador no puede reproducir el códec. Prueba MP4 H.264.'));
    const timer=setTimeout(()=>end(Error('El clip tardó demasiado en abrirse.')),18000);
    video.addEventListener('loadedmetadata',good);video.addEventListener('error',bad);
    video.src=url;video.load();
   });
   if(!Number.isFinite(video.duration)||video.duration<=0||video.duration>600)throw Error('El clip debe durar entre 1 segundo y 10 minutos.');
  }catch(error){video.removeAttribute('src');video.load();URL.revokeObjectURL(url);throw error;}
  const item={url,video,file:normalized,poster:'',lastPlay:0};
  const poster=()=>{
   if(!video.videoWidth||!video.videoHeight||video.readyState<2)return;
   try{
    const c=document.createElement('canvas');c.width=160;c.height=90;
    const scale=Math.max(c.width/video.videoWidth,c.height/video.videoHeight);
    c.getContext('2d').drawImage(video,(c.width-video.videoWidth*scale)/2,(c.height-video.videoHeight*scale)/2,video.videoWidth*scale,video.videoHeight*scale);
    item.poster=c.toDataURL('image/jpeg',.7);
   }catch{}
  };
  video.addEventListener('loadeddata',poster,{once:true});
  video.addEventListener('seeked',()=>{
   if(!item.poster)poster();
   // Redibuja el fotograma buscado cuando la vista previa está pausada.
   const p=currentProject();
   if(p&&record(p,p.scenes.findIndex(s=>s.clipName===item.file.name))===item&&typeof rendering!=='undefined'&&!rendering&&typeof previewTimer!=='undefined'&&!previewTimer){
    const manual=window.facelessManualStudio;
    if(manual?.projectId===p.id)manual.redraw();
   }
  });
  if(video.readyState>=2)poster();
  return item;
 }
 async function assign(p,index,file,saveFile=true){
  if(!p?.scenes?.[index])throw Error('Esta escena ya no existe.');
  if(locked())throw Error('Termina la reproducción o exportación antes de modificar clips.');
  const item=await prepare(file);
  if(currentProject()?.id!==p.id){dispose(item);throw Error('Cambiaste de proyecto mientras se abría el clip.');}
  let stored=true;
  if(saveFile){
   try{await facelessMediaPut(key(p.id,index),{blob:item.file,name:item.file.name});}
   catch(error){stored=false;console.warn('No se guardó el clip en el dispositivo: '+error.message);}
  }
  const m=mapFor(p.id),old=m.get(index);
  if(old===active)active=null;
  if(old)dispose(old);
  m.set(index,item);
  p.scenes[index].clipName=item.file.name;
  p.scenes[index].clipStart=Math.min(Number(p.scenes[index].clipStart)||0,Math.max(0,item.video.duration-.05));
  if(typeof persist==='function')persist();
  invalidate(p);refresh(p);
  return {item,stored};
 }
 async function restore(p){
  if(!p?.id||!Array.isArray(p.scenes))return;
  if(restoring.has(p.id))return restoring.get(p.id);
  const task=(async()=>{
   const m=mapFor(p.id);
   for(let index=0;index<p.scenes.length;index++){
    if(m.has(index)||!p.scenes[index].clipName)continue;
    try{
     const saved=await facelessMediaGet(key(p.id,index));
     if(!saved?.blob)continue;
     const item=await prepare(saved.blob);
     if(!p.scenes[index]||m.has(index)){dispose(item);continue;}
     m.set(index,item);
    }catch(error){console.warn('Restaurar clip de escena '+(index+1)+': '+error.message);}
   }
   refresh(p);
  })();
  restoring.set(p.id,task);
  try{await task;}finally{restoring.delete(p.id);}
 }
 async function remove(p,index){
  if(locked())throw Error('Termina el montaje antes de quitar el video.');
  const m=mapFor(p.id),item=m.get(index);
  if(item===active)active=null;
  if(item)dispose(item);m.delete(index);
  if(p.scenes[index]){delete p.scenes[index].clipName;delete p.scenes[index].clipStart;}
  await facelessMediaDelete(key(p.id,index));
  if(typeof persist==='function')persist();
  invalidate(p);refresh(p);
 }
 function sync(p,index,seconds,playing){
  const item=record(p,index);
  if(active&&active!==item)active.video.pause();
  active=item;
  if(!item)return null;
  const video=item.video,scene=p.scenes[index];
  if(!scene||video.readyState<1)return null;
  const start=Math.min(Math.max(0,Number(scene.clipStart)||0),Math.max(0,video.duration-.05));
  const usable=Math.max(.05,video.duration-start);
  const elapsed=Math.max(0,seconds-scene.time);
  const desired=start+(elapsed%usable);
  const threshold=playing?.4:.05;
  if(!video.seeking&&Math.abs(video.currentTime-desired)>threshold)try{video.currentTime=Math.min(desired,video.duration-.02);}catch{}
  if(playing&&!document.hidden){
   if(video.paused&&performance.now()-item.lastPlay>700){
    item.lastPlay=performance.now();
    video.play().catch(()=>{});
   }
  }else video.pause();
  return video.readyState>=2?video:null;
 }
 function control(host,p,index){
  const scene=p.scenes[index];if(!scene)return;
  const item=record(p,index);
  const panel=document.createElement('section');panel.className='scene-clip-panel';
  const heading=document.createElement('h4');heading.textContent='🎬 Video de la escena '+(index+1);panel.append(heading);
  const note=document.createElement('p');note.className='scene-clip-note';
  note.textContent=item?'✓ '+item.file.name+' · '+item.video.duration.toFixed(1)+' s · audio original silenciado':
   scene.clipName?'⚠ No se pudo recuperar «'+scene.clipName+'». Súbelo de nuevo.':
   'Opcional: usa un MP4 o WebM diferente para esta escena. Reemplaza la imagen solo aquí.';
  panel.append(note);
  if(item?.poster){const img=document.createElement('img');img.className='scene-clip-poster';img.src=item.poster;img.alt='Fotograma del clip de esta escena';panel.append(img);}
  const input=document.createElement('input');input.type='file';input.accept='video/mp4,video/webm,video/*';input.hidden=true;input.setAttribute('aria-label','Video de escena '+(index+1));
  const row=document.createElement('div');row.className='scene-clip-actions';
  const upload=document.createElement('button');upload.type='button';upload.className='btn small';upload.textContent=item?'Cambiar video':'Subir video';upload.onclick=()=>{if(!locked())input.click();};
  row.append(upload);
  if(item){const del=document.createElement('button');del.type='button';del.className='btn small outline';del.textContent='Quitar video';del.onclick=async()=>{try{await remove(p,index);}catch(error){note.textContent=error.message;}};row.append(del);}
  row.append(input);panel.append(row);
  input.onchange=async()=>{
   const f=input.files?.[0];input.value='';if(!f)return;
   upload.disabled=true;note.textContent='Comprobando y guardando el clip…';
   try{
    const result=await assign(p,index,f);
    if(!result.stored)note.textContent='El clip funciona esta sesión, pero no se pudo guardar. Libera espacio del teléfono.';
   }catch(error){note.textContent=error.message||'No se pudo subir el video.';}
   finally{upload.disabled=false;}
  };
  if(item){
   const label=document.createElement('label');label.className='scene-clip-trim';label.textContent='Comenzar clip en (segundos)';
   const range=document.createElement('input');range.type='range';range.min='0';range.max=String(Math.max(0,Math.floor((item.video.duration-.05)*10)/10));range.step='.1';
   range.value=String(Math.min(Number(scene.clipStart)||0,Number(range.max)));
   const output=document.createElement('output');output.textContent=Number(range.value).toFixed(1)+' s';
   range.oninput=()=>output.textContent=Number(range.value).toFixed(1)+' s';
   range.onchange=()=>{
    if(locked())return;
    scene.clipStart=Number(range.value);
    if(typeof persist==='function')persist();
    invalidate(p);refresh(p);
   };
   label.append(range,output);panel.append(label);
  }
  host.append(panel);
 }
 function attachExplorer(){
  if(document.body.dataset.screen!=='editor')return;
  const explorer=document.querySelector('#tabBody .ref-scene-editor');
  if(!explorer||explorer.dataset.sceneClipMounted)return;
  const p=currentProject();if(!p)return;
  explorer.dataset.sceneClipMounted='1';
  const host=document.createElement('div');host.className='scene-clip-explorer';
  const anchor=explorer.querySelector('.ref-scene-description');
  (anchor||explorer).after(host);
  const show=()=>{if(!host.isConnected||currentProject()?.id!==p.id)return;
   const index=Number(explorer.querySelector('.ref-scene-thumb.active')?.dataset.index||0);
   host.replaceChildren();control(host,p,index);
  };
  explorer.addEventListener('click',event=>{if(event.target.closest('.ref-scene-thumb'))queueMicrotask(show);});
  const updated=event=>{if(event.detail===p.id)show();};
  document.addEventListener('faceless-media-updated',updated);
  const cleanup=new MutationObserver(()=>{if(explorer.isConnected)return;document.removeEventListener('faceless-media-updated',updated);cleanup.disconnect();});
  cleanup.observe(document.getElementById('tabBody'),{childList:true,subtree:true});
  restore(p).then(show);show();
 }
 new MutationObserver(attachExplorer).observe(document.getElementById('tabBody'),{childList:true,subtree:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
 window.FacelessSceneVideos={assign,restore,remove,record,sync,pause,mountControls:control};
 attachExplorer();
})();
