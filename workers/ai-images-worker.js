import {searchStock,importStock} from './stock-photos.js';
import {imageRouter,hordeStart,hordePoll} from './free-image-providers.js';
import {hfEnabled,hfImage,hfSpeech,analyzeAudio,easyVoice,withFallback} from './media-providers.js';
import { generateVerifiedScript } from './script-generator.js';
import { generateCoverIdeas } from './ideas-generator.js';
/**
 * Faceless AI Studio - generador de fotografías seguro.
 *
 * Configuración: Cloudflare Worker con binding AI; secreto APP_PASSCODE;
 * variable ALLOWED_ORIGIN (origen exacto de GitHub Pages).
 *
 * Modo gratuito (por defecto): Cloudflare FLUX.1 Schnell.
 * ENABLE_PAID_IMAGES=true habilita Leonardo -> Gemini -> Cloudflare de respaldo.
 * NO activa la facturación por su cuenta. No agregar claves al frontend.
 */
const MODEL = '@cf/black-forest-labs/flux-1-schnell';
function reply(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json;charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
}
function reject(message, status = 502) {
  const error = new Error(message);
  error.httpStatus = status;
  throw error;
}
function readableError(error) {
  return String(error && error.message || error || 'Error').slice(0, 260);
}
async function parsed(response, provider) {
  let data;
  try { data = await response.json(); } catch (_) { reject(provider + ': respuesta no válida'); }
  if (!response.ok) {
    const message = data?.error?.message || data?.error || data?.message || 'HTTP ' + response.status;
    reject(provider + ': ' + String(message).slice(0, 200), response.status);
  }
  return data;
}
async function cloudflareImage(prompt, env) {
  const result = await env.AI.run(MODEL, { prompt, steps: 4 });
  if (!result?.image) reject('Cloudflare Workers AI no devolvió imagen');
  return { provider: 'Cloudflare Workers AI', dataURI: 'data:image/jpeg;base64,' + result.image };
}
async function cloudflareBackupImage(prompt,format,env){
  const form=new FormData();form.append('prompt',prompt);
  form.append('width',format==='16:9'?'1024':'576');
  form.append('height',format==='16:9'?'576':'1024');
  const payload=new Response(form);
  const result=await env.AI.run('@cf/black-forest-labs/flux-2-klein-4b',{
    multipart:{body:payload.body,contentType:payload.headers.get('content-type')}
  });
  if(!result?.image)reject('El modelo de respaldo no devolvió imagen');
  return {provider:'Cloudflare Workers AI / FLUX.2 klein (respaldo)',dataURI:'data:image/jpeg;base64,'+result.image};
}
async function leonardoStart(prompt, format, env) {
  const wide = format === '16:9';
  const config = { prompt, num_images: 1, alchemy: false, width: wide ? 1024 : 768, height: wide ? 576 : 1360 };
  if (env.LEONARDO_MODEL_ID) config.modelId = env.LEONARDO_MODEL_ID;
  const response = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
    method: 'POST',
    headers: {
      'authorization': 'Bearer ' + env.LEONARDO_API_KEY,
      'accept': 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify(config)
  });
  const data = await parsed(response, 'Leonardo');
  const id = data?.sdGenerationJob?.generationId;
  if (!id) reject('Leonardo no devolvió un ID para consultar');
  return { pending: true, provider: 'Leonardo', generationId: id };
}
function encode64(uint8) {
  let result = '';
  for (let start = 0; start < uint8.length; start += 8192) {
    result += String.fromCharCode(...uint8.subarray(start, start + 8192));
  }
  return btoa(result);
}
async function leonardoCheck(id, env) {
  if (!/^[\da-f-]{36}$/i.test(id)) reject('ID de generación no válido', 400);
  const response = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations/' + id, {
    headers: { 'authorization': 'Bearer ' + env.LEONARDO_API_KEY, 'accept': 'application/json' }
  });
  const data = await parsed(response, 'Leonardo');
  const job = data?.generations_by_pk;
  if (!job) reject('Leonardo no devolvió el estado de la generación');
  if (job.status === 'FAILED') reject('Leonardo no pudo generar la imagen');
  if (job.status !== 'COMPLETE' || !job.generated_images?.[0]?.url) {
    return { pending: true, provider: 'Leonardo', generationId: id };
  }
  const url = job.generated_images[0].url;
  // Restringir la descarga al CDN oficial de Leonardo, nunca a hosts arbitrarios.
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== 'https:' ||
      !(parsedUrl.hostname === 'cdn.leonardo.ai' || parsedUrl.hostname.endsWith('.leonardo.ai'))) {
    reject('Leonardo devolvió un dominio de imagen no autorizado');
  }
  const image = await fetch(url);
  if (!image.ok) reject('Error descargando el resultado de Leonardo');
  const type = (image.headers.get('content-type') || '').split(';')[0];
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) reject('Leonardo devolvió un formato no admitido');
  const bytes = new Uint8Array(await image.arrayBuffer());
  if (bytes.length > 8_000_000) reject('La imagen de Leonardo supera el tamaño permitido');
  return { provider: 'Leonardo', dataURI: 'data:' + type + ';base64,' + encode64(bytes) };
}
async function geminiImage(prompt, format, env) {
  const model = String(env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image');
  if (!/^[\w.-]+$/.test(model)) reject('Configuración Gemini inválida', 500);
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
    method: 'POST',
    headers: { 'x-goog-api-key': env.GEMINI_IMAGE_API_KEY||env.GEMINI_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'], responseFormat: { image: { aspectRatio: format } } }
    })
  });
  const data = await parsed(response, 'Gemini');
  const imagePart = data?.candidates?.[0]?.content?.parts?.find(
    part => part.inlineData?.data || part.inline_data?.data
  );
  const inline = imagePart?.inlineData || imagePart?.inline_data;
  if (!inline?.data) reject('Gemini no devolvió una imagen');
  const mime = inline.mimeType || inline.mime_type || 'image/png';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) reject('Gemini devolvió un formato no admitido');
  return { provider: 'Gemini Image', dataURI: 'data:' + mime + ';base64,' + inline.data };
}
async function generate(prompt, format, env, skipLeonardo = false) {
  const paid = env.FREE_DAILY_ONLY==='false' && env.ENABLE_PAID_IMAGES === 'true';
  const options = [];
  if (paid && (env.GEMINI_IMAGE_API_KEY||env.GEMINI_API_KEY)) {
    options.push(['Gemini', () => geminiImage(prompt, format, env)]);
  }
  if(hfEnabled(env))options.push(['Hugging Face',()=>hfImage(env,prompt,format)]);
  if (paid && env.LEONARDO_API_KEY && !skipLeonardo) {
    options.push(['Leonardo', () => leonardoStart(prompt, format, env)]);
  }
  if (env.AI) {
    options.push(['Cloudflare Workers AI', () => cloudflareImage(prompt, env)]);
    // Same account and daily allocation. This cannot bypass an account quota.
    options.push(['Cloudflare FLUX.2 klein', () => cloudflareBackupImage(prompt,format,env)]);
  }
  if(env.ENABLE_IMAGEROUTER!=='false'&&env.IMAGEROUTER_API_KEY)options.push(['ImageRouter gratis',()=>imageRouter(env,prompt,format)]);
  if(env.ENABLE_AI_HORDE==='true')options.push(['AI Horde',()=>hordeStart(env,prompt,format)]);
  if (!options.length) reject('No hay proveedor habilitado. Configura el binding AI de Cloudflare.', 503);
  const failures = [];
  for (const [name, call] of options) {
    try { return await call(); }
    catch (error) { failures.push(name + ': ' + readableError(error)); }
  }
  reject('Ninguna IA disponible: ' + failures.join(' | '), 503);
}

/** Narración por escena. Google TTS opcional; Cloudflare Aura-2-es como respaldo. */
function voiceDataURI(mime,base64) {
  if(!/^[A-Za-z0-9+/=\r\n]+$/.test(base64)||base64.length<1000) reject('El proveedor no devolvió audio válido');
  return { mime, dataURI: 'data:'+mime+';base64,'+base64 };
}
async function geminiVoice(text,voice,env,style='neutral'){
  if(!env.GEMINI_TTS_API_KEY) reject('Falta GEMINI_TTS_API_KEY',503);
  const model='gemini-3.8-flash-lite-tts';
  const safeVoice = ['Fola','Kore','Aoede','Puck','Charon','Leda','Zephyr'].includes(voice)?voice:'Fola';
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{
    method:'POST',
    headers:{'content-type':'application/json','x-goog-api-key':env.GEMINI_TTS_API_KEY},
    body:JSON.stringify({
      contents:[{parts:[{text,speechMetadata:{style:({
        news:'Voz de noticiero profesional en español latinoamericano: dicción precisa, seria, ritmo informado y sin dramatizar.',
        suspense:'Narración de misterio y suspenso en español latinoamericano: tensión suave, silencios expresivos y voz profunda.',
        romantic:'Narración romántica en español latinoamericano: cálida, íntima, emotiva y delicada.',
        documentary:'Narración documental histórica en español latinoamericano: sobria, pausada y clara.',
        entertainment:'Narración de farándula y entretenimiento en español latinoamericano: dinámica, alegre y expresiva.',
        energetic:'Narración motivadora en español latinoamericano: inspiradora, segura y llena de energía.',
        neutral:'Narración clara, expresiva y natural en español latinoamericano.'
      })[style]||'Narración clara, expresiva y natural en español latinoamericano.'}}]}],
      generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{voice:safeVoice}}}
    })
  });
  const result=await parsed(response,'Google AI Studio TTS');
  const part=result?.candidates?.[0]?.content?.parts?.find(p=>p.inlineData?.data||p.inline_data?.data);
  const audio=part?.inlineData||part?.inline_data;
  if(!audio?.data)reject('Google TTS no devolvió audio');
  const mime=audio.mimeType||audio.mime_type||'audio/wav';
  if(!/^audio\/(wav|x-wav|l16|pcm)(;.*)?$/i.test(mime))reject('Google devolvió un formato de audio inesperado');
  return {provider:'Gemini TTS'+(safeVoice==='Fola'?' / Fola':' / '+safeVoice),...voiceDataURI(mime.startsWith('audio/l16')?'audio/l16':'audio/wav',audio.data)};
}
async function cloudflareVoice(text,voice,env){
  if(!env.AI)reject('Binding AI de Cloudflare no disponible',503);
  // Deepgram Aura 2 ES es Cloudflare-hosted; no utiliza claves de terceros.
  const speaker=voice==='male'?'alvaro':'celeste';
  const result=await env.AI.run('@cf/deepgram/aura-2-es',{text,speaker,encoding:'mp3'});
  let buffer;
  if(result instanceof ReadableStream)buffer=await new Response(result).arrayBuffer();
  else if(result instanceof ArrayBuffer)buffer=result;
  else if(ArrayBuffer.isView(result))buffer=result.buffer.slice(result.byteOffset,result.byteOffset+result.byteLength);
  else if(result?.audio&&typeof result.audio==='string')return {provider:'Cloudflare Aura-2 español',...voiceDataURI('audio/mpeg',result.audio)};
  else reject('Cloudflare Aura-2-es no devolvió audio reconocible');
  const bytes=new Uint8Array(buffer);
  if(bytes.length<400)reject('Audio demasiado pequeño');
  if(bytes.length>6_000_000)reject('Audio por escena demasiado grande',413);
  return {provider:'Cloudflare Aura-2 español',...voiceDataURI('audio/mpeg',encode64(bytes))};
}
async function legacyVoice(text,voice,env,style){
  const issues=[];
  // Gemini 3.8 Flash-Lite TTS tiene nivel API gratuito sujeto a cuotas.
  if(env.GEMINI_TTS_API_KEY && !['female','male'].includes(voice)){
    try{return await geminiVoice(text,voice,env,style)}catch(e){issues.push(readableError(e));}
  }
  try{return await cloudflareVoice(text,voice,env);}
  catch(e){issues.push(readableError(e));}
  reject('No se pudo producir la voz: '+issues.join(' | '),503);
}

async function makeVoice(text,voice,env,style,language='es'){
 const calls=[];
 if(env.EASYVOICE_API_KEY)calls.push(['EasyVoice',()=>easyVoice(env,text,language,voice)]);
 if(hfEnabled(env))calls.push(['Hugging Face',()=>hfSpeech(env,text)]);
 calls.push(['Voz española existente',()=>legacyVoice(text,voice,env,style)]);
 return withFallback(calls);
}
async function readAudio(request){
 if(!(request.headers.get('content-type')||'').startsWith('audio/wav')){const e=new Error('Envía WAV PCM mono de 16 kHz.');e.httpStatus=415;throw e;}
 const reader=request.body?.getReader();if(!reader)reject('Falta el audio.',400);
 const chunks=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>19_200_044){await reader.cancel();reject('Usa un audio de hasta 10 minutos.',413);}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
 const v=new DataView(bytes.buffer),tag=(o,n)=>String.fromCharCode(...bytes.subarray(o,o+n));
 if(total<46||tag(0,4)!=='RIFF'||tag(8,4)!=='WAVE'||tag(12,4)!=='fmt '||v.getUint32(16,true)!==16||v.getUint16(20,true)!==1||v.getUint16(22,true)!==1||v.getUint32(24,true)!==16000||v.getUint16(34,true)!==16||tag(36,4)!=='data'||v.getUint32(40,true)!==total-44||(total-44)%2)reject('WAV inválido. Usa PCM mono de 16 kHz y 16 bits.',400);
 return {bytes,duration:(total-44)/32000};
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '';
    const allowed = String(env.ALLOWED_ORIGIN || 'https://marianitord2020.github.io').replace(/\/$/, '');
    if (origin !== allowed) return reply({ error: 'Origen no autorizado; revisa ALLOWED_ORIGIN.' }, 403);
    const cors = {
      'access-control-allow-origin': allowed,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type, x-app-token',
      'vary': 'Origin'
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const path = new URL(request.url).pathname;
    if (request.method !== 'POST' || !['/images','/voice','/script','/ideas','/transcribe','/analyze','/stock/search','/stock/import'].includes(path)) {
      return reply({ error: 'Ruta no encontrada' }, 404, cors);
    }
    if (!env.APP_PASSCODE || env.APP_PASSCODE.length < 16) {
      return reply({ error: 'Configura APP_PASSCODE en Cloudflare (mínimo 16 caracteres).' }, 503, cors);
    }
    if (request.headers.get('x-app-token') !== env.APP_PASSCODE) {
      return reply({ error: 'Código privado incorrecto.' }, 401, cors);
    }
    try {

      if(path==='/analyze'){
        const {bytes,duration}=await readAudio(request);
        return reply(await analyzeAudio(env,bytes,'audio/wav',duration),200,cors);
      }
      if(path==='/transcribe'){
        if(!env.AI)reject('El reconocimiento de voz no está disponible.',503);
        if(!(request.headers.get('content-type')||'').startsWith('audio/wav'))reject('Envía audio WAV mono de 16 kHz.',415);
        const limit=960044,reader=request.body?.getReader(),parts=[];let total=0;
        if(!reader)reject('Falta el audio.',400);
        try{
          while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>limit){await reader.cancel();reject('Cada fragmento debe durar como máximo 30 segundos.',413)}parts.push(value)}
        }finally{reader.releaseLock()}
        const bytes=new Uint8Array(total);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length}
        const view=new DataView(bytes.buffer);
        const tag=(start,count)=>String.fromCharCode(...bytes.subarray(start,start+count));
        if(total<46||tag(0,4)!=='RIFF'||tag(8,4)!=='WAVE'||tag(12,4)!=='fmt '||view.getUint32(16,true)!==16||view.getUint16(20,true)!==1||view.getUint16(22,true)!==1||view.getUint32(24,true)!==16000||view.getUint16(34,true)!==16||tag(36,4)!=='data'||view.getUint32(40,true)!==total-44)reject('Formato de audio no válido: usa WAV PCM mono, 16 kHz, 16 bits.',400);
        const duration=(total-44)/32000;
        let result;
        try{result=await env.AI.run('@cf/openai/whisper',{audio:Array.from(bytes)})}catch(error){
          if(/4006|daily free allocation|quota|neurons/i.test(String(error?.message||error)))reject('Se agotó la cuota diaria gratuita de Cloudflare para reconocer la voz. El audio sigue añadido; reintenta la sincronización cuando se renueve la cuota.',503);
          throw error;
        }
        const words=(result?.words||[]).map(w=>({word:String(w.word||'').trim().slice(0,180),start:Number(w.start),end:Number(w.end)})).filter(w=>w.word&&Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.start>=0&&w.end>w.start&&w.end<=duration+.2).slice(0,1000);
        if(!words.length)reject('No se detectó voz con tiempos. Comprueba que la grabación contenga narración clara.',422);
        return reply({words,provider:'Cloudflare Whisper',duration},200,cors);
      }
      if (Number(request.headers.get('content-length') || 0) > (path==='/stock/import'?16000:9000)) {
        return reply({ error: 'Solicitud demasiado larga.' }, 413, cors);
      }
      const data = await request.json();
      if(path==='/stock/search')return reply(await searchStock(data,env),200,cors);
      if(path==='/stock/import')return reply(await importStock(data,env),200,cors);
      if(path==='/ideas'){
        const result=await generateCoverIdeas(data,env);
        return reply(result,200,cors);
      }
      if(path==='/script'){
        const result = await generateVerifiedScript(data,env);
        return reply(result,200,cors);
      }
      if(path==='/voice'){
        const spoken=String(data?.text||'').trim();
        if(spoken.length<2||spoken.length>650){
          return reply({error:'Cada fragmento de voz debe tener entre 2 y 650 caracteres.'},400,cors);
        }
        const voice=String(data?.voice||'Fola');
        const allowedStyles=['news','suspense','romantic','documentary','entertainment','energetic','neutral'];
        const style=allowedStyles.includes(data?.style)?data.style:'neutral';
        const result=await makeVoice(spoken,voice,env,style,String(data?.language||'es'));
        return reply(result,200,cors);
      }
      const prompt = String(data?.prompt || '').trim().slice(0, 1800);
      if (prompt.length < 10) return reply({ error: 'Escribe un prompt de al menos 10 caracteres.' }, 400, cors);
      const format = data?.format === '16:9' ? '16:9' : '9:16';
      let result;
      if(String(data?.generationId||'').startsWith('horde:')){
        if(env.ENABLE_AI_HORDE!=='true')return reply({error:'AI Horde no está habilitado.'},503,cors);
        result=await hordePoll(String(data.generationId),data.cancelJob===true);
      } else if (data?.generationId) {
        if (env.ENABLE_PAID_IMAGES !== 'true' || !env.LEONARDO_API_KEY) {
          return reply({ error: 'Leonardo no está activado.' }, 400, cors);
        }
        // Una vez aceptado el trabajo no iniciar otra generación de pago por un fallo de consulta.
        result = await leonardoCheck(String(data.generationId), env);
      } else {
        result = await generate(prompt, format, env);
      }
      return reply(result, 200, cors);
    } catch (error) {
      return reply({ error: readableError(error) }, Math.min(599, Math.max(400, error.httpStatus || 502)), cors);
    }
  }
};


