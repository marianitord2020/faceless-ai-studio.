/* Per-scene uploads, removable audio and speech-based caption timing. */
(() => {
 'use strict';
 let playerURL='',operation=0;
 const id=s=>document.getElementById(s);
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n};
 function invalidateVideo(){stopPreview();const video=id('videoResult');if(video){video.pause();video.removeAttribute('src');video.load();video.classList.add('hidden')}id('previewCanvas')?.classList.remove('hidden');id('downloadArea')?.replaceChildren();if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null}}
 function applyTiming(p,data){Object.assign(p,data);p.date=new Date().toISOString();persist();id('sceneTotal').textContent='Suma de escenas: '+fmt(p.duration)+' / '+fmt(p.duration);const pills=id('editorPills');if(pills)pills.textContent=p.platform+' '+fmt(p.duration)+' '+p.style+' '+p.format}
 function restoreTimeline(p){if(p.audioBaseTimeline){const base=p.audioBaseTimeline;if(base.scenes.length===p.scenes.length){p.duration=base.duration;p.scenes.forEach((s,i)=>Object.assign(s,base.scenes[i]))}else Object.assign(p,FacelessTiming.estimated(p,base.duration));delete p.audioBaseTimeline}delete p.subtitleCues;delete p.subtitleTextSignature;delete p.audioAlignment;persist()}
 async function saveAudio(p,file){file.facelessManual=true;file.facelessSignature=facelessVoiceSignature(p);audioFile=file;audioFileProjectId=p.id;generatedVoiceByProject.set(p.id,file);const saved=await facelessMediaPut(p.id+':voice',{manual:true,signature:file.facelessSignature,blob:file,name:file.name});if(!saved)toast('El audio está disponible en esta sesión, pero no se pudo guardar.');updateAudioAttachmentUI()}
 function password(){return id('productionPass')?.value.trim()||id('aiPhotosPasscode')?.value.trim()||id('aiVoicePasscode')?.value.trim()||window.facelessProductionPasscode||facelessImagePasscode||facelessVoicePassword||''}
 async function decode(file){if(file.size>35_000_000)throw Error('El audio supera 35 MB. Usa un archivo de hasta 10 minutos.');const Context=window.AudioContext||window.webkitAudioContext;const context=new Context();try{const buffer=await context.decodeAudioData((await file.arrayBuffer()).slice(0));if(!buffer.duration||buffer.duration>600)throw Error('Usa un audio de hasta 10 minutos.');return buffer}finally{await context.close()}}
 async function transcribe(buffer,pass,status){
  const words=[];
  for(let offset=0;offset<buffer.duration;offset+=25){
   status.textContent='Reconociendo la voz: '+Math.floor(offset/buffer.duration*100)+'%…';
   const duration=Math.min(25,buffer.duration-offset),offline=new OfflineAudioContext(1,Math.ceil(duration*16000),16000),source=offline.createBufferSource();source.buffer=buffer;source.connect(offline.destination);source.start(0,offset,duration);
   const wav=facelessAudioToWAV(await offline.startRendering());
   const response=await fetch('https://faceless-images.marianitord2020.workers.dev/transcribe',{method:'POST',headers:{'content-type':'audio/wav','x-app-token':pass},body:wav,signal:AbortSignal.timeout(110000)});
   let data;try{data=await response.json()}catch{throw Error('El reconocimiento no devolvió datos válidos.')}
   if(!response.ok)throw Error(data.error||'No se pudo reconocer la voz.');
   if(!Array.isArray(data.words)||!data.words.length)continue;
   for(const w of data.words)words.push({...w,start:Number(w.start)+offset,end:Number(w.end)+offset});
  }
  return words;
 }
 window.facelessMountMediaEditor=function(p,updatePreview){
  const photoRoot=id('manualPhotoSlots'),audioRoot=id('audioAttachment');if(!photoRoot||!audioRoot)return;
  const status=id('audioSyncStatus');
  function busy(value){window.facelessMediaBusy=value;for(const n of document.querySelectorAll('#images,#audio,#pickOwnPhotos,#pickOwnAudio,#removeAudio,#syncAudio,#manualPhotoSlots button,#manualPhotoSlots input'))n.disabled=value}
  function photoRefresh(projectId){if(projectId!==p.id||!photoRoot.isConnected)return;photoRoot.replaceChildren();let count=0;const photos=facelessProjectPhotos(p.id);
   p.scenes.forEach((s,i)=>{
    const photo=photos.get(i);if(!photo)return;const card=el('div','', 'media-photo-slot');card.dataset.scene=String(i);
    const heading=el('b','Escena '+(i+1));card.append(heading);
    if(photo){count++;const image=el('img');image.src=photo.src;image.alt='Foto de la escena '+(i+1);card.append(image)}else card.append(el('div','Sin foto','media-photo-empty'));
    const input=el('input');input.type='file';input.accept='image/*';input.hidden=true;input.setAttribute('aria-label','Foto para escena '+(i+1));input.onchange=()=>addPhotos([...input.files],i);
    const add=el('button',photo?'Reemplazar':'Añadir foto','btn small');add.type='button';add.onclick=()=>input.click();add.disabled=Boolean(window.facelessMediaBusy);
    card.append(input,add);
    if(photo){const remove=el('button','Quitar foto','btn small outline');remove.type='button';remove.setAttribute('aria-label','Quitar foto de escena '+(i+1));remove.disabled=Boolean(window.facelessMediaBusy);remove.onclick=async()=>{if(facelessIsWorking())return;busy(true);try{await facelessRestoreMedia(p);photos.delete(i);await facelessMediaDelete(p.id+':image:'+i);invalidateVideo();photoRefresh(p.id);updatePreview()}finally{busy(false);photoRefresh(p.id)}};const download=el('a','Descargar','media-photo-download');download.href=photo.src;download.download=photo.facelessFilename||'faceless-escena-'+(i+1)+'.png';card.append(remove,download)}photoRoot.append(card);
   });
   photoRoot.hidden=count===0;id('imageCount').hidden=count===0;
   id('imageCount').textContent=count+' de '+p.scenes.length+' escenas con foto. Las escenas vacías usan fondos animados.';
  }
  window.facelessRefreshPhotoSlots=photoRefresh;
  async function addPhotos(files,start){
   if(!files.length||facelessIsWorking())return;busy(true);
   try{
    await facelessRestoreMedia(p);const photos=facelessProjectPhotos(p.id);
    for(const file of files){
     let index=start;if(index==null)index=p.scenes.findIndex((_,i)=>!photos.has(i));
     if(index<0){toast('Todas las escenas tienen foto. Usa Reemplazar en la escena que quieras cambiar.');break}
     if(!/^image\//.test(file.type)||file.size>12_000_000){toast('Elige una imagen válida de hasta 12 MB.');continue}
     const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});
     const photo=new Image();await new Promise((resolve,reject)=>{photo.onload=resolve;photo.onerror=()=>reject(Error('No se pudo abrir '+file.name));photo.src=src});
     photo.facelessManual=true;photo.facelessFilename=file.name;photo.facelessSignature=facelessImageSignature(p,index);photos.set(index,photo);
     if(!await facelessMediaPut(p.id+':image:'+index,{manual:true,name:file.name,signature:photo.facelessSignature,dataURI:src}))toast('La foto se añadió, pero no se pudo guardar para otra sesión.');
     if(start!=null)break;
    }
    imgs=[];invalidateVideo();photoRefresh(p.id);updatePreview();
   }catch(error){toast(String(error.message||'No se pudo cargar la imagen.'))}finally{id('images').value='';busy(false);photoRefresh(p.id)}
  }
  id('images').onchange=event=>addPhotos([...event.target.files]);
  id('pickOwnPhotos').onclick=()=>{if(!facelessIsWorking())id('images').click()};
  id('pickOwnAudio').onclick=()=>{if(!facelessIsWorking())id('audio').click()};
  async function sync(file,decoded){
   const pass=password();if(pass.length<16){status.textContent='Duración ajustada al audio. Los subtítulos tienen tiempos estimados. Introduce tu código privado arriba y pulsa Sincronizar con la voz para reconocer las palabras.';return}
   const recognized=await transcribe(decoded,pass,status);
   if(audioFile!==file||current()?.id!==p.id)return;
   const data=FacelessTiming.align(p,recognized,decoded.duration);applyTiming(p,data);invalidateVideo();await saveAudio(p,file);updatePreview();status.textContent='✓ Subtítulos y escenas ajustados a la voz reconocida. Coincidencia del guion: '+data.audioAlignment.coverage+'%. Revisa la vista previa.';
  }
  async function attach(file){
   if(!file||facelessIsWorking())return;busy(true);const ticket=++operation;
   try{
    const decoded=await decode(file);if(ticket!==operation||current()?.id!==p.id)return;
    await facelessRestoreMedia(p);invalidateVideo();
    // Do not let stale generated voice players keep sounding after replacement.
    for(const player of document.querySelectorAll('#aiVoiceAudioArea audio,#micPlayback')){player.pause();player.removeAttribute('src');player.load()}
    id('aiVoiceAudioArea')?.replaceChildren();
    if(!p.audioBaseTimeline)p.audioBaseTimeline={duration:p.duration,scenes:p.scenes.map(s=>({time:s.time,duration:s.duration}))};
    applyTiming(p,FacelessTiming.estimated(p,decoded.duration));await saveAudio(p,file);updatePreview();
    status.textContent='Audio añadido. Ajustando los subtítulos a tu voz…';
    try{await sync(file,decoded)}catch(error){status.textContent=String(error.message||error)+' El audio sigue añadido; los tiempos son estimados. Puedes reintentar la sincronización.'}
   }catch(error){status.textContent=String(error.message||error)}finally{busy(false);photoRefresh(p.id);updateAudioAttachmentUI();id('audio').value=''}
  }
  window.facelessAttachManualAudio=attach;
  id('audio').onchange=event=>attach(event.target.files[0]);
  id('syncAudio').onclick=async()=>{
   if(!audioFile||facelessIsWorking())return;busy(true);const file=audioFile;
   try{await sync(file,await decode(file))}catch(error){status.textContent=String(error.message||error)+' No se cambiaron los tiempos existentes.'}finally{busy(false);photoRefresh(p.id)}
  };
  id('removeAudio').onclick=async()=>{
   if(facelessIsWorking())return;busy(true);operation++;
   try{await facelessRestoreMedia(p);invalidateVideo();for(const player of document.querySelectorAll('#aiVoiceAudioArea audio,#micPlayback,#uploadedAudioPlayer'))player.pause();generatedVoiceByProject.delete(p.id);audioFile=null;audioFileProjectId=p.id;await facelessMediaDelete(p.id+':voice');restoreTimeline(p);id('aiVoiceAudioArea')?.replaceChildren();id('micPlayback')?.classList.add('hidden');id('audio').value='';status.textContent='Audio eliminado. Puedes añadir uno nuevo o generar otra voz.';updateAudioAttachmentUI();updatePreview()}finally{busy(false);photoRefresh(p.id)}
  };
  window.facelessRefreshAudioAttachment=()=>{
   if(!audioRoot.isConnected)return;
   const has=Boolean(audioFile&&audioFileProjectId===p.id);
   audioRoot.hidden=!has||!audioFile.facelessManual;id('audioCount').hidden=!has;
   id('pickOwnAudio').querySelector('strong').textContent=has&&audioFile.facelessManual?'Cambiar mi audio':'Añadir mi audio';id('removeAudio').disabled=!has||Boolean(window.facelessMediaBusy);id('syncAudio').disabled=!has||Boolean(window.facelessMediaBusy);id('syncAudio').hidden=!has||!audioFile.facelessManual;
   if(playerURL){URL.revokeObjectURL(playerURL);playerURL=''}
   const player=id('uploadedAudioPlayer');player.pause();player.removeAttribute('src');player.load();player.hidden=!has||!audioFile.facelessManual;
   if(has&&audioFile.facelessManual){playerURL=URL.createObjectURL(audioFile);player.src=playerURL;
    if(!window.facelessMediaBusy&&p.subtitleTextSignature!==FacelessTiming.signature(p))status.textContent='El guion cambió. Pulsa Sincronizar con la voz para recalcular los subtítulos.';
   }
   id('audioFileName').textContent=has?(audioFile.name||'Narración añadida'):'No hay audio añadido';
  };
  window.facelessCaptionAt=(project,seconds)=>{const cue=FacelessTiming.cues(project).find(c=>seconds>=c.start&&seconds<c.end);return cue?.text||''};
  facelessRestoreMedia(p).then(()=>{if(current()?.id===p.id&&photoRoot.isConnected){photoRefresh(p.id);updateAudioAttachmentUI();updatePreview()}});
  photoRefresh(p.id);window.facelessRefreshAudioAttachment();
 };
})();
