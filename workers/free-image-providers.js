/* Independent free image providers. API keys never leave the Worker. */
const HORDE='https://aihorde.net/api/v2/generate/';
const agent='FacelessAIStudio:1.0:https://github.com/marianitord2020/faceless-ai-studio.';
function fail(message,status=502){const e=Error(message);e.httpStatus=status;throw e;}
async function jsonFetch(url,options={}){
 let response;try{response=await fetch(url,{...options,signal:AbortSignal.timeout(60000)})}catch{fail('Proveedor de fotos no disponible. Reintenta más tarde.',504);}
 if(!response.ok){await response.body?.cancel();fail('Proveedor de fotos: HTTP '+response.status,response.status);}
 try{return await response.json()}catch{fail('Respuesta de fotos no válida.');}
}
function photo(base64,mime,provider){
 if(typeof base64!=='string'||base64.length<100||base64.length>10_666_668||!/^[A-Za-z0-9+/=\r\n]+$/.test(base64))fail('El proveedor no devolvió una imagen válida.');
 return {provider,dataURI:'data:'+mime+';base64,'+base64};
}
export async function imageRouter(env,prompt,format){
 if(!env.IMAGEROUTER_API_KEY)fail('Falta IMAGEROUTER_API_KEY.',503);
 const model=String(env.IMAGEROUTER_MODEL||'Tongyi-MAI/Z-Image-Turbo:free');
 if(!model.endsWith(':free'))fail('Solo se permiten modelos gratuitos de ImageRouter.',503);
 // Check the live free catalog on every generation: never fall through to a paid model.
 const catalog=await jsonFetch('https://api.imagerouter.io/v3/models?output_modalities=image&free=true');
 const models=Array.isArray(catalog)?catalog:catalog.data;
 const entry=models?.find(m=>m.id===model);
 if(!entry||!entry.pricing||entry.pricing.min!==0||entry.pricing.max!==0)fail('El modelo no figura con precio cero en ImageRouter. Se conserva el modo gratuito.',503);
 const result=await jsonFetch('https://api.imagerouter.io/v1/openai/images/generations',{
  method:'POST',headers:{authorization:'Bearer '+env.IMAGEROUTER_API_KEY,'content-type':'application/json'},
  body:JSON.stringify({model,prompt,quality:'auto',size:format==='16:9'?'768x512':'512x768',response_format:'b64_ephemeral',output_format:'webp'})
 });
 return photo(result.data?.[0]?.b64_json,'image/webp','ImageRouter / '+model);
}
export async function hordeStart(env,prompt,format){
 const result=await jsonFetch(HORDE+'async',{
  method:'POST',headers:{apikey:env.AI_HORDE_API_KEY||'0000000000','content-type':'application/json','Client-Agent':agent},
  body:JSON.stringify({prompt,params:{width:env.AI_HORDE_API_KEY?(format==='16:9'?768:512):512,height:env.AI_HORDE_API_KEY?(format==='16:9'?512:768):512,steps:20,n:1},nsfw:false,censor_nsfw:true,r2:false,shared:false,slow_workers:true})
 });
 if(!/^[a-f0-9-]{36}$/i.test(result.id||''))fail('AI Horde no devolvió un trabajo válido.');
 return {pending:true,provider:'AI Horde',generationId:'horde:'+result.id};
}
export async function hordePoll(generationId,cancel=false){
 if(!/^horde:[a-f0-9-]{36}$/i.test(generationId))fail('Trabajo AI Horde no válido.',400);
 const id=generationId.slice(6),headers={'Client-Agent':agent};
 if(cancel){await jsonFetch(HORDE+'status/'+id,{method:'DELETE',headers});return {cancelled:true,provider:'AI Horde'};}
 const status=await jsonFetch(HORDE+'check/'+id,{headers});
 if(status.faulted)fail('AI Horde no pudo generar la foto.',503);
 if(!status.done)return {pending:true,provider:'AI Horde',generationId,waitTime:status.wait_time||0};
 const result=await jsonFetch(HORDE+'status/'+id,{headers});
 const generation=result.generations?.find(g=>!g.censored&&g.img);
 if(!generation)fail('AI Horde no devolvió una foto disponible.',422);
 // r2:false requests base64 WebP; never fetch URLs supplied by a volunteer worker.
 return photo(generation.img,'image/webp','AI Horde / '+(generation.model||'Stable Diffusion'));
}
