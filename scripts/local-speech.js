/* Run multilingual Whisper off the UI thread, with a bounded worker lifetime. */
(() => {
 'use strict';
 const workerURL=typeof document==='undefined'?'scripts/local-speech-worker.js':new URL('local-speech-worker.js',document.currentScript.src);
 let worker=null,sequence=0,pending=false;
 let cancel=null;
 window.facelessCancelLocalSpeech=()=>cancel?.();
 window.facelessRecognizeLocal=async function(buffer,onProgress=()=>{}){
  if(pending)throw Error('Ya se está analizando un audio.');
  if(!window.Worker||!window.OfflineAudioContext)throw Error('Este navegador no admite la IA local. Usa Chrome actualizado o los ajustes manuales.');
  pending=true;
  try {
   onProgress('Preparando el audio para la IA…');
   const context=new OfflineAudioContext(1,Math.ceil(buffer.duration*16000),16000);
   const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);source.start();
   const mono=(await context.startRendering()).getChannelData(0).slice();
   worker ??= new Worker(workerURL,{type:'module'});
   const id=++sequence;
   return await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>finish(Error('El análisis tardó demasiado. Puedes reintentarlo o ajustar las frases manualmente.')),15*60*1000);
    function finish(error,words){cancel=null;clearTimeout(timer);worker.onmessage=null;worker.onerror=null;if(error){worker.terminate();worker=null;reject(error)}else resolve(words);}
    cancel=()=>finish(Error('Análisis detenido. Se conservan los tiempos anteriores.'));
    worker.onerror=()=>finish(Error('No se pudo cargar la IA local. Comprueba tu conexión y vuelve a intentar.'));
    worker.onmessage=({data})=>{
     if(data.id!==id)return;
     if(data.error)finish(Error(data.error));
     else if(data.words)finish(null,data.words);
     else onProgress(data.status==='recognizing'?'Escuchando la narración con IA… Puede tardar varios minutos.':'Descargando modelo de voz: '+data.progress+' %. Solo la primera descarga requiere estos archivos.');
    };
    onProgress('Cargando IA de voz en este dispositivo…');worker.postMessage({id,audio:mono},[mono.buffer]);
   });
  }finally{pending=false;}
 };
})();
