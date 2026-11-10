/* User supplied video is a canvas source shared by preview and export. */
(() => {
 let source=null,sourceProject='',url='';
 window.facelessOwnVideo=()=>window.facelessFlow==='manual'&&sourceProject===activeId?source:null;
 window.facelessPlayOwnVideo=async(seconds=0)=>{const video=window.facelessOwnVideo();if(video){video.currentTime=Math.min(seconds,Math.max(0,video.duration-.01));await video.play();}};
 window.facelessStopOwnVideo=()=>source?.pause();
 window.facelessMountOwnVideo=(p,host)=>{
  const status=host.querySelector('#ownVideoStatus'),remove=host.querySelector('#removeOwnVideo');
  const refresh=()=>{const video=window.facelessOwnVideo();status.textContent=video?'✓ Video añadido · '+fmt(video.duration)+' · listo para vista previa.':'MP4 o WebM. La IA local sincronizará su narración.';remove.hidden=!video;};
  host.querySelector('input').onchange=async event=>{
   const file=event.target.files[0];if(!file||facelessIsWorking())return;
   window.facelessMediaBusy=true;const candidate=document.createElement('video'),candidateURL=URL.createObjectURL(file);candidate.muted=true;candidate.playsInline=true;candidate.preload='auto';
   try{
    await new Promise((resolve,reject)=>{candidate.onloadeddata=resolve;candidate.onerror=()=>reject(Error('No se pudo abrir el video. Prueba MP4 o WebM.'));candidate.src=candidateURL;});
    if(!Number.isFinite(candidate.duration)||candidate.duration<=0||candidate.duration>600)throw Error('Elige un video de hasta 10 minutos.');
    source?.pause();if(url)URL.revokeObjectURL(url);source=candidate;url=candidateURL;sourceProject=p.id;
    if(p.scenes.every(scene=>String(scene.text||'').trim()))Object.assign(p,FacelessTiming.estimated(p,candidate.duration));else{p.duration=candidate.duration;const length=p.duration/p.scenes.length;p.scenes.forEach((scene,i)=>{scene.time=i*length;scene.duration=length;});}p.format=candidate.videoWidth>candidate.videoHeight?'16:9':'9:16';persist();
    status.textContent='Guardando video…';await facelessMediaPut(p.id+':own-video',{blob:file,name:file.name});
    if(current()?.id!==p.id||!host.isConnected)return;
    let extracted;try{
     const Context=window.AudioContext||window.webkitAudioContext,context=new Context();
     try{extracted=facelessAudioToWAV(await context.decodeAudioData((await file.arrayBuffer()).slice(0)));}finally{await context.close();}
    }catch{try{extracted=await FacelessExport.extractAudio(file,message=>status.textContent=message);}catch(error){status.textContent='Video añadido. '+error.message;}}
    window.facelessMediaBusy=false;
    if(extracted){await window.facelessAttachManualAudio?.(new File([extracted],'audio-del-video.wav',{type:'audio/wav'}));}
    else toast('Video añadido. Si contiene voz, puedes añadir la pista de audio por separado.');
    renderEditor();
   }catch(error){if(source!==candidate)URL.revokeObjectURL(candidateURL);status.textContent=error.message;}finally{window.facelessMediaBusy=false;}
  };
  remove.onclick=async()=>{if(facelessIsWorking())return;stopPreview();source?.pause();source=null;sourceProject='';if(url)URL.revokeObjectURL(url);url='';await facelessMediaDelete(p.id+':own-video');refresh();drawFrame(0);};
  refresh();
  if(!window.facelessOwnVideo())facelessMediaGet(p.id+':own-video').then(async saved=>{
   if(!saved?.blob||!host.isConnected||activeId!==p.id)return;
   const restored=document.createElement('video'),restoredURL=URL.createObjectURL(saved.blob);restored.muted=true;restored.playsInline=true;
   restored.onloadeddata=()=>{if(!host.isConnected){URL.revokeObjectURL(restoredURL);return;}source?.pause();if(url)URL.revokeObjectURL(url);source=restored;url=restoredURL;sourceProject=p.id;restored.onseeked=()=>{if(!previewTimer&&current()?.id===p.id){drawFrame(0);const preview=document.getElementById('previewCanvas');preview?.getContext('2d').drawImage(canvas,0,0,preview.width,preview.height);}};restored.currentTime=.001;refresh();document.dispatchEvent(new CustomEvent('faceless-media-updated',{detail:p.id}));drawFrame(0);const view=document.getElementById('previewCanvas');view?.getContext('2d').drawImage(canvas,0,0,view.width,view.height);};restored.src=restoredURL;
  }).catch(()=>{});
 };
})();
