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
  const chunks=result.chunks||[];
  const duration=audio.length/16000;
  const words=chunks.map((chunk,index)=>{
   const start=chunk.timestamp?.[0];
   const end=chunk.timestamp?.[1]??chunks[index+1]?.timestamp?.[0]??duration;
   return {word:chunk.text,start,end:Math.min(end,duration)};
  }).filter(word=>Number.isFinite(word.start)&&word.end>word.start);
  if(!words.length)throw Error('La IA no devolvió tiempos de voz válidos.');
  self.postMessage({id,words});
 }catch(error){recognizer=null;self.postMessage({id,error:String(error.message||error)});}
};
