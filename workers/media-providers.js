/* Private provider adapters. No keys or upstream error bodies reach the client. */
export function providerError(message,status=502){const e=new Error(message);e.httpStatus=status;return e;}
const enabled=env=>env.FREE_DAILY_ONLY!=='false';
export const hfEnabled=env=>!enabled(env)&&env.ENABLE_HF_INFERENCE==='true'&&Boolean(env.HF_API_KEY);
function trialEnabled(env){return !enabled(env)&&env.ENABLE_DEEPGRAM_TRIAL==='true'&&Boolean(env.DEEPGRAM_API_KEY);}
export async function withFallback(calls){
 const failures=[];
 for(const [name,call] of calls){try{return await call()}catch(error){
  if(error.httpStatus===400||error.httpStatus===413||error.httpStatus===415)throw error;
  failures.push(name+': '+(error.httpStatus||'red/tiempo agotado'));
 }}
 throw providerError('Proveedores no disponibles. '+failures.join(' | '),503);
}
async function request(url,key,body,type='application/json',auth='Bearer'){
 let r;try{r=await fetch(url,{method:'POST',headers:{authorization:auth+' '+key,'content-type':type},body,signal:AbortSignal.timeout(90000)})}catch{throw providerError('El proveedor no respondió.',504)}
 if(!r.ok){await r.body?.cancel();throw providerError('El proveedor rechazó la solicitud (HTTP '+r.status+').',r.status);}
 return r;
}
async function json(r){try{return await r.json()}catch{throw providerError('Respuesta JSON no válida.');}}
export function base64(bytes){let out='';for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(out);}
async function media(r,kind,provider){
 const mime=(r.headers.get('content-type')||'').split(';')[0].toLowerCase();
 const allowed=kind==='image'?['image/jpeg','image/png','image/webp']:['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/ogg','audio/flac'];
 if(!allowed.includes(mime))throw providerError(provider+' no devolvió '+kind+' válido.');
 const reader=r.body?.getReader();if(!reader)throw providerError('Respuesta multimedia vacía.');
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8_000_000){await reader.cancel();throw providerError('Respuesta multimedia demasiado grande.');}chunks.push(value);}}finally{reader.releaseLock();}
 if(size<100)throw providerError('Respuesta multimedia vacía.');
 const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.length;}
 return {provider,mime,dataURI:'data:'+mime+';base64,'+base64(bytes)};
}
function hfModel(env,name,fallback){
 if(!hfEnabled(env))throw providerError('Hugging Face está desactivado: no tiene cuota diaria gratuita garantizada.',503);
 const model=String(env[name]||fallback||'');
 if(!/^[\w.-]+\/[\w.-]+$/.test(model))throw providerError('Configura un modelo compatible para '+name+'.',503);
 return model;
}
export async function hfText(env,prompt,asJSON=true){
 const model=hfModel(env,'HF_TEXT_MODEL','Qwen/Qwen2.5-7B-Instruct');
 const data=await json(await request('https://router.huggingface.co/v1/chat/completions',env.HF_API_KEY,JSON.stringify({model,messages:[{role:'system',content:asJSON?'Responde solo JSON válido. Respeta las fuentes proporcionadas; no inventes noticias.':'Responde en español.'},{role:'user',content:prompt}],max_tokens:5000,temperature:.15,...(asJSON?{response_format:{type:'json_object'}}:{})})));
 const choice=data.choices?.[0],text=choice?.message?.content?.trim();
 if(!text||choice.finish_reason==='length')throw providerError('Hugging Face devolvió texto vacío o incompleto.');
 return {text,provider:'Hugging Face / '+model,meta:{},urlMeta:{}};
}
export async function hfImage(env,prompt,format){
 const model=hfModel(env,'HF_IMAGE_MODEL','stabilityai/stable-diffusion-3-medium-diffusers');
 return media(await request('https://router.huggingface.co/hf-inference/models/'+model,env.HF_API_KEY,JSON.stringify({inputs:prompt,parameters:{width:format==='16:9'?768:512,height:format==='16:9'?512:768}})),'image','Hugging Face / '+model);
}
export async function hfSpeech(env,text){
 // No universal hosted TTS model is promised. Operator must select a supported deployment.
 const model=hfModel(env,'HF_TTS_MODEL');
 return media(await request('https://router.huggingface.co/hf-inference/models/'+model,env.HF_API_KEY,JSON.stringify({inputs:text})),'audio','Hugging Face / '+model);
}
export function validWords(items,duration){
 const words=(items||[]).map(w=>({word:String(w.punctuated_word||w.word||'').trim(),start:w.start,end:w.end})).filter(w=>w.word&&typeof w.start==='number'&&typeof w.end==='number'&&Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.start>=0&&w.end>w.start&&w.end<=duration+.2);
 if(!words.length||words.some((w,i)=>i&&w.start<words[i-1].start))throw providerError('No se recibieron marcas de tiempo válidas.',422);
 return words;
}
export async function deepgramAnalyze(env,bytes,type,duration){
 if(!trialEnabled(env))throw providerError('Deepgram requiere habilitar sus créditos de prueba; no es cuota diaria.',503);
 const url='https://api.deepgram.com/v1/listen?model=nova-3&language=es&smart_format=true&punctuate=true&utterances=true';
 const data=await json(await request(url,env.DEEPGRAM_API_KEY,bytes,type,'Token'));
 const alt=data.results?.channels?.[0]?.alternatives?.[0];
 return {provider:'Deepgram Nova-3',granularity:'word',duration,transcript:alt?.transcript||'',words:validWords(alt?.words,duration)};
}
export async function hfAnalyze(env,bytes,duration){
 const model=hfModel(env,'HF_ASR_MODEL','openai/whisper-large-v3');
 const data=await json(await request('https://router.huggingface.co/hf-inference/models/'+model,env.HF_API_KEY,JSON.stringify({inputs:base64(bytes),parameters:{return_timestamps:true}})));
 // HF may return phrase chunks. Never invent word times by dividing a phrase.
 const segments=(data.chunks||[]).map(c=>({word:c.text,start:c.timestamp?.[0],end:c.timestamp?.[1]}));
 return {provider:'Hugging Face / '+model,granularity:'phrase',duration,transcript:data.text||'',words:validWords(segments,duration)};
}
export async function analyzeAudio(env,bytes,type,duration){
 const calls=[];
 if(trialEnabled(env))calls.push(['Deepgram',()=>deepgramAnalyze(env,bytes,type,duration)]);
 if(hfEnabled(env))calls.push(['Hugging Face',()=>hfAnalyze(env,bytes,duration)]);
 if(!calls.length)throw providerError('No hay análisis remoto gratuito habilitado. Usa Whisper local, sin cuota de API.',503);
 return withFallback(calls);
}
export async function easyVoice(env,text,language='es',voice='female'){
 if(!env.EASYVOICE_API_KEY)throw providerError('Falta conectar EasyVoice.',503);
 const lang=String(language).toLowerCase().split('-')[0];
 const defaults={en:voice==='male'?'am_adam':'af_aoede',ar:voice==='male'?'ar_m1':'ar_f1'};
 // EasyVoice free catalog has only English and Arabic; don't silently read Spanish in English.
 const selected=defaults[lang];
 if(!selected)throw providerError('EasyVoice no incluye español en su catálogo gratuito. Se usará la voz española de respaldo.',503);
 if(typeof text!=='string'||text.length<2||text.length>5000)throw providerError('EasyVoice acepta entre 2 y 5000 caracteres por petición.',400);
 return media(await request('https://easyvoice.ae/api/v1/audio/speech',env.EASYVOICE_API_KEY,JSON.stringify({model:'kokoro-82m',input:text,voice:selected,response_format:'mp3',speed:1})),'audio','EasyVoice / '+selected);
}
