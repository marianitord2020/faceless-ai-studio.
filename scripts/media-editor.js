/* Local media uploads and on-device speech alignment. */
(() => {
 'use strict';
 let playerURL='',operation=0;const recognitionCache=new WeakMap();
 const id=s=>document.getElementById(s);
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n};
 function invalidateVideo(){stopPreview();const video=id('videoResult');if(video){video.pause();video.removeAttribute('src');video.load();video.classList.add('hidden')}id('previewCanvas')?.classList.remove('hidden');id('downloadArea')?.replaceChildren();if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null}}
 function applyTiming(p,data){Object.assign(p,data);p.hook=p.scenes[0]?.text||'';p.date=new Date().toISOString();persist();id('sceneTotal').textContent='Suma de escenas: '+fmt(p.duration)+' / '+fmt(p.duration);const pills=id('editorPills');if(pills)pills.textContent=p.style+' '+Number(p.duration.toFixed(1))+'s • '+p.format}
 function restoreTimeline(p){if(p.audioBaseTimeline){const base=p.audioBaseTimeline;if(base.scenes.length===p.scenes.length){p.duration=base.duration;p.scenes.forEach((s,i)=>Object.assign(s,base.scenes[i]))}else Object.assign(p,FacelessTiming.estimated(p,base.duration));delete p.audioBaseTimeline}delete p.subtitleCues;delete p.subtitleTextSignature;delete p.audioAlignment;persist()}
 async function saveAudio(p,file,manual=true){file.facelessManual=manual;file.facelessSignature=facelessVoiceSignature(p);audioFile=file;audioFileProjectId=p.id;generatedVoiceByProject.set(p.id,file);const saved=await facelessMediaPut(p.id+':voice',{manual,signature:file.facelessSignature,blob:file,name:file.name});if(!saved)toast('El audio está disponible en esta sesión, pero no se pudo guardar.');updateAudioAttachmentUI()}
 async function decode(file){if(file.size>35_000_000)throw Error('El audio supera 35 MB. Usa un archivo de hasta 10 minutos.');const Context=window.AudioContext||window.webkitAudioContext;const context=new Context();try{const buffer=await context.decodeAudioData((await file.arrayBuffer()).slice(0));if(!buffer.duration||buffer.duration>600)throw Error('Usa un audio de hasta 10 minutos.');return buffer}finally{await context.close()}}
 window.facelessMountMediaEditor=function(p,updatePreview){
  const photoRoot=id('manualPhotoSlots'),audioRoot=id('audioAttachment');if(!photoRoot||!audioRoot)return;
  const status=id('audioSyncStatus');
  const cancel=el('button','Detener análisis IA','btn small outline');cancel.id='cancelLocalSpeech';cancel.type='button';cancel.hidden=true;status.after(cancel);cancel.onclick=()=>window.facelessCancelLocalSpeech?.();
  function busy(value){window.facelessMediaBusy=value;for(const n of document.querySelectorAll('#images,#audio,#pickOwnPhotos,#pickOwnAudio,#removeAudio,#syncAudio,#manualPhotoSlots button,#manualPhotoSlots input,#renderVideo,#previewVideo,#pickOwnVideo,#ownVideo,#exportQuality,#exportContainer,#saveManualCaptions,#manualCaptions'))n.disabled=value||Boolean(window.facelessProductionBusy)||Boolean(rendering)}
  function photoRefresh(projectId){if(projectId!==p.id||!photoRoot.isConnected)return;photoRoot.replaceChildren();let count=0;const photos=facelessProjectPhotos(p.id);
   p.scenes.forEach((s,i)=>{
    const photo=photos.get(i);if(!photo)return;const card=el('div','', 'media-photo-slot');card.dataset.scene=String(i);
    const heading=el('b','Escena '+(i+1));card.append(heading);
    if(photo){count++;const image=el('img');image.src=photo.src;image.alt='Foto de la escena '+(i+1);card.append(image)}else card.append(el('div','Sin foto','media-photo-empty'));
    const input=el('input');input.type='file';input.accept='image/*';input.hidden=true;input.setAttribute('aria-label','Foto para escena '+(i+1));input.onchange=()=>addPhotos([...input.files],i);
    const add=el('button',photo?'Reemplazar':'Añadir foto','btn small');add.type='button';add.onclick=()=>input.click();add.disabled=Boolean(window.facelessMediaBusy);
    card.append(input,add);
    if(photo){const remove=el('button','Quitar foto','btn small outline');remove.type='button';remove.setAttribute('aria-label','Quitar foto de escena '+(i+1));remove.disabled=Boolean(window.facelessMediaBusy);remove.onclick=async()=>{if(facelessIsWorking())return;busy(true);try{await facelessRestoreMedia(p);photos.delete(i);delete p.scenes[i].stockCredit;persist();window.facelessRefreshStockCredits?.();await facelessMediaDelete(p.id+':image:'+i);invalidateVideo();photoRefresh(p.id);updatePreview()}finally{busy(false);photoRefresh(p.id)}};const download=el('a','Descargar','media-photo-download');download.href=photo.src;download.download=photo.facelessFilename||'faceless-escena-'+(i+1)+'.png';card.append(remove,download)}photoRoot.append(card);
   });
   photoRoot.hidden=count===0;id('imageCount').hidden=count===0;
   id('imageCount').textContent=count+' de '+p.scenes.length+' escenas con foto. Las escenas vacías usan fondos animados.';document.dispatchEvent(new CustomEvent('faceless-media-updated',{detail:p.id}));
  }
  window.facelessRefreshPhotoSlots=photoRefresh;
  async function addPhotos(files,start){
   if(!files.length||facelessIsWorking())return;busy(true);
   try{
    await facelessRestoreMedia(p);const photos=facelessProjectPhotos(p.id);
    for(const file of files){
     let index=start;if(index==null)index=p.scenes.findIndex((_,i)=>!photos.has(i));
     if(index<0&&window.facelessFlow==='manual'){index=p.scenes.length;p.scenes.push({time:p.duration,duration:1,text:'',prompt:''});const duration=p.duration/p.scenes.length;p.scenes.forEach((scene,i)=>{scene.time=i*duration;scene.duration=duration;});delete p.subtitleTextSignature;persist();}
     if(index<0){toast('Todas las escenas tienen foto. Usa Reemplazar en la escena que quieras cambiar.');break}
     if(!/^image\//.test(file.type)||file.size>12_000_000){toast('Elige una imagen válida de hasta 12 MB.');continue}
     const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});
     const photo=new Image();await new Promise((resolve,reject)=>{photo.onload=resolve;photo.onerror=()=>reject(Error('No se pudo abrir '+file.name));photo.src=src});
     delete p.scenes[index].stockCredit;persist();window.facelessRefreshStockCredits?.();photo.facelessManual=true;photo.facelessFilename=file.name;photo.facelessSignature=facelessImageSignature(p,index);photos.set(index,photo);
     if(!await facelessMediaPut(p.id+':image:'+index,{manual:true,name:file.name,signature:photo.facelessSignature,dataURI:src}))toast('La foto se añadió, pero no se pudo guardar para otra sesión.');
     if(start!=null)break;
    }
    imgs=[];invalidateVideo();photoRefresh(p.id);updatePreview();
   }catch(error){toast(String(error.message||'No se pudo cargar la imagen.'))}finally{id('images').value='';busy(false);photoRefresh(p.id);if(audioFile)try{await window.facelessEnsureAudioSync?.();}catch(error){status.textContent=error.message;}}
  }
  window.facelessReplaceScenePhoto=(projectId,index,file)=>{if(projectId===p.id&&index>=0&&index<p.scenes.length)return addPhotos([file],index);};
  id('images').onchange=event=>addPhotos([...event.target.files]);
  id('pickOwnPhotos').onclick=()=>{if(!facelessIsWorking())id('images').click()};
  id('pickOwnAudio').onclick=()=>{if(!facelessIsWorking())id('audio').click()};
  async function sync(file,decoded){
   if(audioFile!==file||current()?.id!==p.id)return;
   const signature=FacelessTiming.signature(p),ticket=operation;
   cancel.hidden=false;let words;
   try{words=recognitionCache.get(file)||await facelessRecognizeLocal(decoded,message=>{if(status.isConnected)status.textContent=message});recognitionCache.set(file,words);}finally{cancel.hidden=true;}
   if(ticket!==operation||audioFile!==file||current()?.id!==p.id||FacelessTiming.signature(p)!==signature)throw Error('El proyecto o el audio cambió durante el análisis. Vuelve a sincronizar.');
   const aligned=p.scenes.some(scene=>!String(scene.text||'').trim())?FacelessTiming.transcribed(p,words,decoded.duration):FacelessTiming.align(p,words,decoded.duration);
   applyTiming(p,aligned);
   invalidateVideo();await saveAudio(p,file,Boolean(file.facelessManual));photoRefresh(p.id);window.facelessRefreshManualTiming?.();const captions=id('manualCaptions');if(captions)captions.value=p.scenes.map(s=>s.text).join('\n');updatePreview();
   status.textContent='✓ IA local: voz reconocida y alineada con el guion ('+aligned.audioAlignment.coverage+' % de coincidencia). La vista previa y la descarga usarán los mismos tiempos. Revisa el resultado antes de compartirlo.';
  }
  window.facelessSyncGeneratedAudio=async(project,file,decoded)=>{
   if(project.id!==p.id||!status.isConnected)throw Error('Abre Video para sincronizar la narración.');
   await sync(file,decoded);
  };
  async function attach(file){
   if(!file||facelessIsWorking())return;busy(true);const ticket=++operation;
   try{
    const decoded=await decode(file);if(ticket!==operation||current()?.id!==p.id)return;
    await facelessRestoreMedia(p);invalidateVideo();
    // Do not let stale generated voice players keep sounding after replacement.
    for(const player of document.querySelectorAll('#aiVoiceAudioArea audio,#micPlayback')){player.pause();player.removeAttribute('src');player.load()}
    id('aiVoiceAudioArea')?.replaceChildren();
    if(!p.audioBaseTimeline)p.audioBaseTimeline={duration:p.duration,scenes:p.scenes.map(s=>({time:s.time,duration:s.duration}))};
    if(p.scenes.every(scene=>String(scene.text||'').trim()))applyTiming(p,FacelessTiming.estimated(p,decoded.duration));
    delete p.subtitleTextSignature;delete p.audioAlignment;await saveAudio(p,file);updatePreview();
    status.textContent='Audio añadido. Preparando reconocimiento con IA…';
    try{await sync(file,decoded)}catch(error){status.textContent=String(error.message||error)+' El audio está guardado. Pulsa Sincronizar con IA local para reintentar antes de exportar.'}
   }catch(error){status.textContent=String(error.message||error)}finally{busy(false);photoRefresh(p.id);updateAudioAttachmentUI();id('audio').value=''}
  }
  window.facelessAttachManualAudio=attach;
  window.facelessEnsureAudioSync=async({force=false}={})=>{
   if(!audioFile||audioFileProjectId!==p.id)return;
   if((p.audioAlignment?.method==='speech'||(!force&&['manual','tts-segments'].includes(p.audioAlignment?.method)))&&p.subtitleTextSignature===FacelessTiming.signature(p))return;
   const file=audioFile;busy(true);try{await sync(file,await decode(file));}finally{busy(false);}
  };
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
   window.facelessMountManualTiming?.(p,updatePreview);
   const has=Boolean(audioFile&&audioFileProjectId===p.id);
   audioRoot.hidden=!has;id('audioCount').hidden=!has;
   id('pickOwnAudio').querySelector('strong').textContent=has&&audioFile.facelessManual?'Cambiar mi audio':'Añadir mi audio';id('removeAudio').disabled=!has||Boolean(window.facelessMediaBusy)||Boolean(rendering);id('syncAudio').disabled=!has||Boolean(window.facelessMediaBusy)||Boolean(rendering);id('syncAudio').hidden=!has;
   if(playerURL){URL.revokeObjectURL(playerURL);playerURL=''}
   const player=id('uploadedAudioPlayer');player.pause();player.removeAttribute('src');player.load();player.hidden=!has||!audioFile.facelessManual;
   if(has&&audioFile.facelessManual){playerURL=URL.createObjectURL(audioFile);player.src=playerURL;
    if(!window.facelessMediaBusy&&p.subtitleTextSignature!==FacelessTiming.signature(p))status.textContent='El guion cambió. Pulsa Sincronizar con IA para recalcular los tiempos.';
   }
   if(has&&!window.facelessMediaBusy&&p.audioAlignment?.method==='speech'&&p.subtitleTextSignature===FacelessTiming.signature(p))status.textContent='✓ IA local: voz, fotos y subtítulos sincronizados. Revisa las palabras reconocidas antes de exportar.';
   id('audioFileName').textContent=has?(audioFile.name||'Narración añadida'):'No hay audio añadido';
  };
  window.facelessCaptionAt=(project,seconds)=>{const cue=FacelessTiming.cues(project).find(c=>seconds>=c.start&&seconds<c.end);return cue?.text||''};
  facelessRestoreMedia(p).then(()=>{if(current()?.id===p.id&&photoRoot.isConnected){photoRefresh(p.id);updateAudioAttachmentUI();updatePreview()}});
  photoRefresh(p.id);window.facelessRefreshAudioAttachment();
 };
})();
