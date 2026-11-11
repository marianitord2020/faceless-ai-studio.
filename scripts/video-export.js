/* Shared HD export policy for both workflows. No renamed containers. */
(function(root){
 'use strict';
 const scriptURL=typeof document!=='undefined'?document.currentScript?.src:null;
 const types={mp4:['video/mp4;codecs="avc1.42E028,mp4a.40.2"','video/mp4;codecs="avc1.4D4028,mp4a.40.2"','video/mp4;codecs="avc1,mp4a.40.2"'],webm:['video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm']};
 const destinations={
  facebook:{label:'Facebook · Inicio',aspect:'1:1'},
  tiktok:{label:'TikTok',aspect:'9:16'},
  instagram:{label:'Instagram · Reels',aspect:'9:16'},
  shorts:{label:'YouTube Shorts',aspect:'9:16'},
  youtube:{label:'YouTube · Video normal',aspect:'16:9'},
 };
 function settings(p){
  const height=Number(p.exportHeight)===720?720:1080;
  const format=p.exportFormat==='webm'?'webm':'mp4';
  const aspect=Object.hasOwn(destinations,p.exportDestination)
   ?destinations[p.exportDestination].aspect
   :p.format==='16:9'?'16:9':'9:16';
  return {height,format,aspect,width:aspect==='16:9'?height*16/9:height,
   frameHeight:aspect==='9:16'?height*16/9:height,bitrate:height===1080?8_000_000:5_000_000};
 }
 function mime(format,supported=t=>root.MediaRecorder?.isTypeSupported(t)){return (types[format]||[]).find(supported)||'';}
 function recordingMime(p){const format=settings(p).format;return mime(format)||mime(format==='mp4'?'webm':'mp4')||(root.MediaRecorder?.isTypeSupported('video/mp4')?'video/mp4':'');}
 function dimensions(p,exporting=true){if(!exporting)return p.format==='16:9'?{width:960,height:540}:{width:540,height:960};const s=settings(p);return {width:Math.round(s.width),height:Math.round(s.frameHeight)};}
 async function runWorker(blob,format,onStatus,action='convert',force=false,duration){
  if(!force&&action==='convert'&&blob.type.startsWith('video/'+format))return blob;
  if(!root.Worker)throw Error('Este navegador no puede convertir al formato elegido. Selecciona el formato nativo.');
  onStatus(action==='extract'?'Extrayendo el audio del video en este dispositivo…':'Preparando conversión local a '+format.toUpperCase()+'… La primera vez descarga el conversor.');
  const worker=new Worker(new URL('transcode-worker.js',scriptURL),{type:'module'});
  const data=await blob.arrayBuffer();
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>finish(Error('La conversión tardó demasiado. Prueba 720p o el otro formato.')),12*60*1000);
   const finish=(error,result)=>{clearTimeout(timer);worker.terminate();root.facelessCancelConversion=null;error?reject(error):resolve(result);};
   root.facelessCancelConversion=()=>finish(Error('Conversión detenida.'));
   worker.onerror=()=>finish(Error('No se pudo cargar el conversor local. Comprueba tu conexión y prueba 720p.'));
   worker.onmessage=({data})=>{if(data.error)finish(Error(data.error));else if(data.output)finish(null,new Blob([data.output],{type:action==='extract'?'audio/wav':'video/'+format}));else if(data.progress!=null)onStatus('Convirtiendo a '+format.toUpperCase()+': '+data.progress+' %');};
   worker.postMessage({input:data,source:blob.type.includes('mp4')?'mp4':'webm',format,action,duration},[data]);
  });
 }
 async function verify(blob,p){
  const signature=new Uint8Array(await blob.slice(0,12).arrayBuffer()),format=settings(p).format;
  const valid=format==='mp4'?String.fromCharCode(...signature.slice(4,8))==='ftyp':signature[0]===0x1a&&signature[1]===0x45&&signature[2]===0xdf&&signature[3]===0xa3;
  if(!valid)throw Error('El archivo no tiene un contenedor '+format.toUpperCase()+' válido.');
  const video=document.createElement('video'),url=URL.createObjectURL(blob);video.preload='metadata';
  try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No se pudo comprobar el video exportado.')),15000);video.onloadedmetadata=()=>{clearTimeout(timer);resolve();};video.onerror=()=>{clearTimeout(timer);reject(Error('El navegador no pudo abrir el video exportado.'));};video.src=url;});
   if(!Number.isFinite(video.duration)||Math.abs(video.duration-p.duration)>.5){
    const actual=Number.isFinite(video.duration)?video.duration.toFixed(1)+' s':'desconocida';
    const error=Error('Duración esperada: '+p.duration.toFixed(1)+' s. Duración del archivo: '+actual+'. Prueba WebM o 720p.');
    error.code='VIDEO_DURATION_MISMATCH';
    error.actualDuration=video.duration;
    throw error;
   }
   const expected=dimensions(p);if(video.videoWidth!==expected.width||video.videoHeight!==expected.height)throw Error('La resolución del archivo no coincide con la calidad elegida.');
  }finally{video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
 }
 const convert=(blob,format,onStatus,force=false)=>runWorker(blob,format,onStatus,'convert',force);
 async function verifyOrRepair(blob,p,onStatus){
  try{await verify(blob,p);return blob;}catch(error){
   if(error.code!=='VIDEO_DURATION_MISMATCH'||!Number.isFinite(error.actualDuration)||error.actualDuration<=p.duration+.5)throw error;
   onStatus('Ajustando la duración del archivo a '+p.duration.toFixed(1)+' s…');
   const repaired=await runWorker(blob,settings(p).format,onStatus,'convert',true,p.duration);
   await verify(repaired,p);
   return repaired;
  }
 }
 const extractAudio=(blob,onStatus)=>runWorker(blob,'wav',onStatus,'extract');
 const api={destinations,settings,mime,recordingMime,dimensions,convert,extractAudio,verify,verifyOrRepair};root.FacelessExport=api;if(typeof module!=='undefined')module.exports=api;
 if(typeof document==='undefined')return;
 root.facelessMountExportOptions=(p,host)=>{
  if(document.getElementById('exportQuality'))return;
  const card=document.createElement('section');card.className='editor-video-card export-options';
  card.innerHTML='<h3>Calidad y descarga</h3><label for="exportDestination">Dónde vas a publicar</label><select id="exportDestination"><option value="">Formato del proyecto</option></select><div class="export-option-grid"><div><label for="exportQuality">Resolución</label><select id="exportQuality" aria-label="Resolución"><option value="1080">1080p · Full HD</option><option value="720">720p · HD</option></select></div><div><label for="exportContainer">Formato</label><select id="exportContainer" aria-label="Formato"><option value="mp4">MP4</option><option value="webm">WebM</option></select></div></div><p class="smalltext">El audio, las imágenes y los subtítulos usan la misma línea de tiempo. Mantén esta pantalla visible durante la exportación.</p><p id="exportSupport" class="smalltext"></p><button type="button" id="cancelVideoExport" class="btn small outline" hidden>Detener exportación</button>';
  host.append(card);
  card.querySelector('#cancelVideoExport').onclick=()=>{
   root.facelessExportCancelled=true;root.facelessCancelLocalSpeech?.();root.facelessCancelConversion?.();
  };
  const destination=card.querySelector('#exportDestination');
  const quality=card.querySelector('#exportQuality');
  const container=card.querySelector('#exportContainer');
  for(const [value,option] of Object.entries(destinations)){
   destination.add(new Option(option.label+' · '+option.aspect,value));
  }
  const reset=()=>{
   destination.value=Object.hasOwn(destinations,p.exportDestination)?p.exportDestination:'';
   quality.value=String(settings(p).height);
   container.value=settings(p).format;
  };
  const refresh=()=>{
   const {format,aspect}=settings(p),size=dimensions(p);
   card.querySelector('#exportSupport').textContent=aspect+' · '+size.width+' × '+size.height+' · '+
    (mime(format)?'Exportación directa en '+format.toUpperCase()+'.':'Conversión a '+format.toUpperCase()+' al terminar.');
  };
  const change=()=>{
   if(facelessIsWorking()){reset();return;}
   p.exportDestination=destination.value;
   p.exportHeight=Number(quality.value);
   p.exportFormat=container.value;
   persist();
   refresh();
   const note=document.getElementById('mediaFormatNote');
   if(note)note.textContent='Exportación: '+settings(p).aspect+' · '+quality.value+'p · '+container.value.toUpperCase();
   document.getElementById('downloadArea')?.replaceChildren();
  };
  reset();
  destination.onchange=quality.onchange=container.onchange=change;
  refresh();
 };
})(typeof window==='undefined'?globalThis:window);
