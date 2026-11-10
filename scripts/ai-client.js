/* Browser client: APP_PASSCODE only. Provider API keys belong in Cloudflare Secrets. */
(() => {
 'use strict';
 const base='https://faceless-images.marianitord2020.workers.dev';
 async function call(path,token,body,signal,type='application/json'){
  if(typeof token!=='string'||token.length<16)throw Error('Introduce el código privado de la aplicación, no una API Key.');
  const response=await fetch(base+path,{method:'POST',headers:{'content-type':type,'x-app-token':token},body:type==='application/json'?JSON.stringify(body):body,signal});
  let result;try{result=await response.json()}catch{throw Error('El servidor devolvió una respuesta no válida.');}
  if(!response.ok){const error=Error(result.error||'No se pudo completar la petición.');error.status=response.status;throw error;}
  return result;
 }
 async function prepareAudio(file){
  if(!(file instanceof Blob)||!file.size||file.size>35_000_000)throw Error('Selecciona un audio de hasta 35 MB y 10 minutos.');
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context)throw Error('El navegador no puede decodificar audio.');
  const context=new Context();let buffer;
  try{buffer=await context.decodeAudioData(await file.arrayBuffer())}finally{await context.close();}
  if(!buffer.duration||buffer.duration>600)throw Error('Usa un audio de hasta 10 minutos.');
  const offline=new OfflineAudioContext(1,Math.ceil(buffer.duration*16000),16000);
  const source=offline.createBufferSource();source.buffer=buffer;source.connect(offline.destination);source.start();
  const resampled=await offline.startRendering();
  const pcm=resampled.getChannelData(0),wav=new ArrayBuffer(44+pcm.length*2),v=new DataView(wav);
  const tag=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  tag(0,'RIFF');v.setUint32(4,wav.byteLength-8,true);tag(8,'WAVE');tag(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);tag(36,'data');v.setUint32(40,pcm.length*2,true);
  pcm.forEach((sample,i)=>{const n=Math.max(-1,Math.min(1,sample));v.setInt16(44+i*2,Math.round(n*(n<0?32768:32767)),true);});
  return {buffer,wav};
 }
 window.FacelessAI=Object.freeze({
  generateText:(input,token,signal)=>call('/script',token,input,signal),
  generatePhotos:(prompt,format,token,signal)=>call('/images',token,{prompt,format},signal),
  textToSpeech:(text,token,{voice='female',language='es',style='neutral',signal}={})=>call('/voice',token,{text,voice,language,style},signal),
  async analyzeAudio(file,token,{remote=false,signal,onProgress=()=>{}}={}){
   const {buffer,wav}=await prepareAudio(file);
   if(remote){
    onProgress('Enviando el audio al servidor para el proveedor remoto habilitado…');
    try{return await call('/analyze',token,wav,signal,'audio/wav')}catch(error){
     if(error.name==='AbortError'||[400,401,403,413,415].includes(error.status))throw error;
     onProgress('Proveedor remoto no disponible. Usando Whisper en el dispositivo…');
    }
   }
   if(signal?.aborted)throw new DOMException('Operación cancelada','AbortError');
   const cancel=()=>window.facelessCancelLocalSpeech?.();signal?.addEventListener('abort',cancel,{once:true});
   try{return {provider:'Whisper local',granularity:'word',duration:buffer.duration,words:await window.facelessRecognizeLocal(buffer,onProgress)}}finally{signal?.removeEventListener('abort',cancel);}
  }
 });
})();
