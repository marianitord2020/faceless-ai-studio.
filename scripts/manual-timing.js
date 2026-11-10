/* Manual local caption and photo timing; shared project timeline for preview/export. */
(function(){
'use strict';
window.facelessMountManualTiming=function(p,updatePreview){
 const host=document.getElementById('audioAttachment');
 if(!host||document.getElementById('manualTiming'))return;
 const box=document.createElement('details');box.id='manualTiming';box.className='record-panel';
 const title=document.createElement('summary');title.textContent='Ajustar frases y fotos al audio';box.append(title);
 const note=document.createElement('p');note.className='smalltext';note.textContent='Escucha tu audio en el reproductor de arriba. Pausa y pulsa Marcar para tomar el segundo actual. Ajusta cada frase y el comienzo de cada foto, y guarda. Las frases se muestran completas; no se estiman palabras individuales.';box.append(note);
 const rows=document.createElement('div');box.append(rows);
 const message=document.createElement('p');message.className='status';message.setAttribute('aria-live','polite');
 const save=document.createElement('button');save.type='button';save.className='btn primary';save.textContent='Guardar tiempos';
 const reload=document.createElement('button');reload.type='button';reload.className='btn small';reload.textContent='Cargar tiempos actuales';
 box.append(save,reload,message);host.append(box);
 let captionRows=[],sceneRows=[];
 function input(value,label){
  const wrap=document.createElement('label');wrap.style.display='block';wrap.textContent=label+' (segundos)';
  const field=document.createElement('input');field.type='number';field.min='0';field.max=String(p.duration);field.step='0.01';field.value=Number(value).toFixed(2);wrap.append(field);
  const mark=document.createElement('button');mark.type='button';mark.className='btn small';mark.textContent='Marcar '+label.toLowerCase();
  mark.onclick=()=>{const player=document.getElementById('uploadedAudioPlayer');if(!player?.src){message.textContent='Añade primero un audio.';return}field.value=player.currentTime.toFixed(2);};wrap.append(mark);
  return {wrap,field};
 }
 function load(){
  rows.replaceChildren();captionRows=[];sceneRows=[];
  const heading=document.createElement('h3');heading.textContent='Cambios de foto';rows.append(heading);
  p.scenes.forEach((scene,index)=>{
   const row=input(scene.time,'Inicio de foto '+(index+1));
   if(index===0){row.field.value='0';row.field.disabled=true;row.wrap.querySelector('button').disabled=true;}
   rows.append(row.wrap);sceneRows.push(row.field);
  });
  const heading2=document.createElement('h3');heading2.textContent='Subtítulos por frase';rows.append(heading2);
  FacelessTiming.cues(p).forEach((cue,index)=>{
   const row=document.createElement('div');row.className='upload';row.style.marginTop='12px';
   const text=document.createElement('textarea');text.value=cue.text;text.rows=2;text.setAttribute('aria-label','Frase '+(index+1));
   const start=input(cue.start,'Inicio de frase '+(index+1)),end=input(cue.end,'Fin de frase '+(index+1));
   const listen=document.createElement('button');listen.type='button';listen.className='btn small';listen.textContent='Escuchar desde aquí';
   listen.onclick=()=>{const player=document.getElementById('uploadedAudioPlayer');if(player?.src){player.currentTime=Math.max(0,Number(start.field.value)||0);player.play().catch(()=>{message.textContent='Pulsa reproducir en el audio.';});}};
   row.append(text,start.wrap,end.wrap,listen);rows.append(row);captionRows.push({text,start:start.field,end:end.field});
  });
 }
 window.facelessRefreshManualTiming=()=>{if(box.isConnected&&box.open)load();};
 reload.onclick=load;box.addEventListener('toggle',()=>{if(box.open&&!captionRows.length)load();});
 save.onclick=()=>{
  if(facelessIsWorking()){message.textContent='Espera a que termine el montaje.';return}
  if(!audioFile||audioFileProjectId!==p.id){message.textContent='Añade primero el audio.';return}
  const starts=sceneRows.map(field=>Number(field.value));
  if(starts.length!==p.scenes.length||starts.some((n,i)=>!Number.isFinite(n)||n<0||n>=p.duration||(i>0&&n<=starts[i-1]))){message.textContent='Los comienzos de las fotos deben estar ordenados, sin repetirse y dentro del audio.';return}
  const cues=captionRows.map(row=>({text:row.text.value.trim(),start:Number(row.start.value),end:Number(row.end.value)}));
  if(!cues.length||cues.some((c,i)=>!c.text||!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.start<0||c.end<=c.start||c.end>p.duration+.005||(i>0&&c.start<cues[i-1].end))){message.textContent='Cada frase necesita texto, inicio y fin válidos. Las frases no pueden solaparse ni superar el audio.';return}
  stopPreview();
  p.scenes.forEach((scene,i)=>{scene.time=starts[i];scene.duration=(starts[i+1]??p.duration)-starts[i];});
  p.subtitleCues=cues.map(c=>({...c,manual:true}));
  p.subtitleTextSignature=FacelessTiming.signature(p);p.audioAlignment={method:'manual'};p.date=new Date().toISOString();
  if(!persist()){message.textContent='No se pudieron guardar los tiempos.';return}
  const video=document.getElementById('videoResult');if(video){video.pause();video.classList.add('hidden');}
  document.getElementById('previewCanvas')?.classList.remove('hidden');document.getElementById('downloadArea')?.replaceChildren();
  updatePreview();message.textContent='✓ Tiempos manuales guardados. La vista previa y la nueva descarga usarán estas marcas. Crea de nuevo el video para aplicarlas.';
 };
};
})();
