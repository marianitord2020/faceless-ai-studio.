/* Audio stays in this worker; only model assets are downloaded. */
let recognizer;
self.onmessage = async ({data}) => {
 const {id,audio}=data;
 try {
  const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
  env.allowLocalModels=false;
  env.backends.onnx.wasm.numThreads=1;
  recognizer ??= await pipeline('automatic-speech-recognition','Xenova/whisper-tiny',{
   progress_callback: p=>{if(p.status==='progress')self.postMessage({id,progress:Math.round(p.progress||0)});}
  });
  self.postMessage({id,status:'recognizing'});
  const result=await recognizer(audio,{language:'spanish',task:'transcribe',return_timestamps:'word',chunk_length_s:30,stride_length_s:5});
  const words=(result.chunks||[]).map(c=>({word:c.text,start:c.timestamp?.[0],end:c.timestamp?.[1]}));
  if(!words.length||words.some(w=>!Number.isFinite(w.start)||!Number.isFinite(w.end)))throw Error('La IA no devolvió tiempos de voz válidos.');
  self.postMessage({id,words});
 }catch(error){recognizer=null;self.postMessage({id,error:String(error.message||error)});}
};
