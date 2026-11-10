// Buscador de noticias verificables usando GDELT Project DOC 2.0.
// Solo usa metadatos publicados: titular, enlace a la fuente, fecha vista y miniatura editorial.
// No inventa noticias ni descarga/republica artículos. Credit: https://www.gdeltproject.org/
function newsError(message,status=422){const e=new Error(message);e.httpStatus=status;throw e}
const RD_DATE=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santo_Domingo',year:'numeric',month:'2-digit',day:'2-digit'});
function localDate(value){return RD_DATE.format(value)}
function searchTerm(topic){
 const normalized=topic.replace(/[¡!¿?.,;:]+/g,' ').trim();
 let term=normalized.replace(/\b(noticias?|noticia|últimas?|actuales?|recientes?|de|del|en|sobre|hoy|ahora|momento|el|la|los|las|al|un|una|para)\b/gi,' ').replace(/\s+/g,' ').trim();
 if(term.length<3)term='República Dominicana';
 // Los nombres pueden aparecer con o sin tildes en medios internacionales.
 if(/hig[uü]e[yí]/i.test(term))return '(Higuey OR Higüey)';
 return term.slice(0,120);
}
function parseGdeltTime(v){
 const value=String(v||'');
 if(/^\d{8}T\d{6}Z$/.test(value)){
  return new Date(value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8)+'T'+value.slice(9,11)+':'+value.slice(11,13)+':'+value.slice(13,15)+'Z');
 }
 const d=new Date(value);return Number.isFinite(d.getTime())?d:null;
}
function cleanTitle(title,domain){
 const t=String(title||'').trim().replace(/\s+/g,' ');
 return t.length>160?t.slice(0,157)+'…':t;
}
function safeHTTPS(url){
 try{const u=new URL(String(url));return u.protocol==='https:'&&u.hostname&&!/(?:^|\.)(?:localhost|local)$/.test(u.hostname)?u.href:''}catch{return ''}
}
export async function searchRealNews(topic,style,env){
 const t=String(topic||'').trim();
 const term=searchTerm(t);
 const todayRequested=/(?:\bhoy\b|última hora|del momento|en vivo|ahora)/i.test(t);
 const window= todayRequested?'24h':/(?:esta semana|semana|últimos días)/i.test(t)?'7d':'3d';
 const params=new URLSearchParams({query:term,mode:'artlist',format:'json',maxrecords:'50',sort:'datedesc',timespan:window});
 const url='https://api.gdeltproject.org/api/v2/doc/doc?'+params.toString();
 // Cache del Worker por 5 minutos: evita repetir búsquedas idénticas y respeta límites GDELT.
 let cache=null,cacheKey=null,resp;
 try{
   if(typeof caches!=='undefined'&&caches.default){
     cache=caches.default;
     cacheKey=new Request('https://faceless-images.marianitord2020.workers.dev/_cache/news?'+params.toString());
     resp=await cache.match(cacheKey);
   }
 }catch{cache=null}
 if(!resp){
   for(let attempt=0;attempt<2;attempt++){
     try{resp=await fetch(url,{headers:{accept:'application/json'}})}
     catch{newsError('No se pudo conectar al índice GDELT. Intenta nuevamente.',503)}
     if(resp.status!==429||attempt===1)break;
     await new Promise(resolve=>setTimeout(resolve,6000));
   }
   if(!resp.ok)newsError('El buscador de noticias alcanzó temporalmente su límite (HTTP '+resp.status+'). Intenta después.',503);
   if(cache&&cacheKey){
     try{
       const headers=new Headers(resp.headers);
       headers.set('cache-control','public, max-age=300');
       const cachedResponse=new Response(resp.clone().body,{headers,status:200});
       await cache.put(cacheKey,cachedResponse);
     }catch{}
   }
 }
 let data;
 try{data=await resp.json()}catch{newsError('La fuente de noticias no devolvió datos legibles.',503)}
 const entries=Array.isArray(data?.articles)?data.articles:[];
 const unique=new Set(),ideas=[],sources=[];
 for(const item of entries){
  const headline=cleanTitle(item?.title,item?.domain);
  const originalUrl=safeHTTPS(item?.url);
  const seen=parseGdeltTime(item?.seendate);
  if(!originalUrl||headline.length<12||!seen)continue;
  // GDELT seendate indica hora de observación, NO la hora de ocurrencia del hecho.
  if(todayRequested&&localDate(seen)!==localDate(new Date()))continue;
  const key=headline.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\W+/g,'');
  if(unique.has(key))continue;
  unique.add(key);
  const publisher=String(item?.domain||new URL(originalUrl).hostname).slice(0,90);
  const seenAt=localDate(seen);
  const photo=safeHTTPS(item?.socialimage);
  const synopsis='Cobertura de '+publisher+' sobre: «'+headline+'». Registro detectado el '+seenAt+
    '. Abre la fuente para confirmar todos los detalles antes de publicar.';
  const n=ideas.length+1;
  ideas.push({id:'news-'+n,title:headline,synopsis,
   outline:'Noticia real de '+publisher+'. Titular: '+headline+'. Fuente original: '+originalUrl+'. Fecha de observación: '+seenAt+'.',
   coverPrompt:'Portada informativa con elementos gráficos, sin representar como fotografía propia hechos reales.',
   sourceUrl:originalUrl,sourceTitle:publisher,sourceSeenAt:seenAt,sourceImageUrl:photo});
  sources.push({title:headline+' — '+publisher,url:originalUrl,date:seenAt});
  if(ideas.length>=10)break;
 }
 if(!ideas.length){
  newsError(todayRequested?
    'No encontré noticias verificables del día de hoy sobre «'+t+'». No inventaré titulares; prueba ampliar la búsqueda o consultar otro día.':
    'No encontré noticias verificables recientes sobre «'+t+'». No inventaré titulares.',422);
 }
 return {mode:'news',style,query:t,ideas,sources,checkedAt:new Date().toISOString(),
  sourceProvider:'GDELT Project',sourceAttribution:'https://www.gdeltproject.org/',
  note:'Las fechas son de detección por GDELT, no necesariamente de publicación ni de los hechos. El usuario debe verificar la fuente.'};
}
