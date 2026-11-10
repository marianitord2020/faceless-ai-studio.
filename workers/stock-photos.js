/* Stock discovery and one-photo imports; server-side credentials and signed selections. */
import {base64} from './media-providers.js';
const DAY=86400,MAX=8_000_000;
function fail(message,status=502){const e=Error(message);e.httpStatus=status;throw e;}
const clean=(s,n=250)=>String(s||'').slice(0,n);
function https(s){try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return '';}}
async function json(url,headers={}){let r;try{r=await fetch(url,{headers,signal:AbortSignal.timeout(20000)})}catch{fail('El banco de fotos no respondió.',504);}if(!r.ok){await r.body?.cancel();fail('Banco de fotos no disponible (HTTP '+r.status+').',r.status);}return r.json();}
async function cached(provider,q,page,loader){
 const cache=globalThis.caches?.default;
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([provider,q,page]))))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const key=new Request('https://stock-cache.faceless.invalid/'+hash);
 if(cache){const hit=await cache.match(key);if(hit)return hit.json();}
 const data=await loader();if(cache)await cache.put(key,new Response(JSON.stringify(data),{headers:{'content-type':'application/json','cache-control':'public, max-age='+DAY}}));return data;
}
async function signingKey(env){return crypto.subtle.importKey('raw',new TextEncoder().encode(env.APP_PASSCODE),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
const b64url=b=>base64(b).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function unbase64(s){try{return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))}catch{fail('Selección inválida.',400);}}
async function sign(photo,env){const payload=b64url(new TextEncoder().encode(JSON.stringify({...photo,expires:Date.now()+2*60*60*1000})));const signature=await crypto.subtle.sign('HMAC',await signingKey(env),new TextEncoder().encode(payload));return payload+'.'+b64url(new Uint8Array(signature));}
async function verify(token,env){
 if(typeof token!=='string'||token.length>12000)fail('Selección inválida.',400);
 const [payload,sig,...extra]=token.split('.');if(!payload||!sig||extra.length)fail('Selección inválida.',400);
 if(!await crypto.subtle.verify('HMAC',await signingKey(env),unbase64(sig),new TextEncoder().encode(payload)))fail('La selección no es válida. Busca de nuevo.',400);
 let data;try{data=JSON.parse(new TextDecoder().decode(unbase64(payload)))}catch{fail('Selección inválida.',400);}
 if(!Number.isFinite(data.expires)||data.expires<Date.now())fail('La búsqueda venció. Busca de nuevo.',410);return data;
}
export async function searchStock(input,env){
 const query=clean(input.query,101).trim();if(query.length<2||query.length>100)fail('Escribe una búsqueda de 2 a 100 caracteres.',400);
 const provider=String(input.provider||'openverse'),page=Math.min(20,Math.max(1,Math.floor(Number(input.page)||1)));
 if(!['openverse','pixabay','pexels'].includes(provider))fail('Banco de fotos no válido.',400);
 if(provider==='pixabay'&&!env.PIXABAY_API_KEY)fail('Falta conectar PIXABAY_API_KEY. Puedes usar Openverse mientras tanto.',503);
 if(provider==='pexels'&&!env.PEXELS_API_KEY)fail('Falta conectar PEXELS_API_KEY. Puedes usar Openverse mientras tanto.',503);
 const items=await cached(provider,query,page,async()=>{
  if(provider==='openverse'){
   const u=new URL('https://api.openverse.org/v1/images/');u.search=new URLSearchParams({q:query,page:String(page),page_size:'12',license:'cc0,pdm,by',mature:'false',filter_dead:'true'});
   const d=await json(u.href,{'User-Agent':'FacelessAIStudio/1.0'});
   return (d.results||[]).filter(x=>/^[a-f0-9-]{36}$/i.test(x.id)&&['cc0','pdm','by'].includes(x.license)).map(x=>({id:x.id,provider,title:clean(x.title),author:clean(x.creator),authorURL:https(x.creator_url),sourceURL:https(x.foreign_landing_url),license:clean(x.license+' '+(x.license_version||'')),licenseURL:https(x.license_url),thumbnail:'https://api.openverse.org/v1/images/'+x.id+'/thumb/',download:'https://api.openverse.org/v1/images/'+x.id+'/thumb/'}));
  }
  if(provider==='pixabay'){
   const u=new URL('https://pixabay.com/api/');u.search=new URLSearchParams({key:env.PIXABAY_API_KEY,q:query,lang:'es',image_type:'photo',safesearch:'true',per_page:'12',page:String(page)});
   const d=await json(u.href);return (d.hits||[]).map(x=>({id:String(x.id),provider,title:clean(x.tags),author:clean(x.user),authorURL:'https://pixabay.com/users/'+encodeURIComponent(x.user)+'-'+x.user_id+'/',sourceURL:https(x.pageURL),license:'Pixabay Content License',licenseURL:'https://pixabay.com/service/license-summary/',thumbnail:https(x.previewURL),download:https(x.largeImageURL||x.webformatURL)}));
  }
  const u=new URL('https://api.pexels.com/v1/search');u.search=new URLSearchParams({query,locale:'es-ES',per_page:'12',page:String(page)});
  const d=await json(u.href,{Authorization:env.PEXELS_API_KEY});return (d.photos||[]).map(x=>({id:String(x.id),provider,title:clean(x.alt),author:clean(x.photographer),authorURL:https(x.photographer_url),sourceURL:https(x.url),license:'Pexels License',licenseURL:'https://www.pexels.com/license/',thumbnail:https(x.src?.medium),download:https(x.src?.large2x||x.src?.large)}));
 });
 const results=await Promise.all(items.filter(x=>x.download&&x.thumbnail&&x.sourceURL).map(async p=>{const {download,...publicPhoto}=p;return {...publicPhoto,selection:await sign(p,env)};}));
 return {provider,query,page,results,hasMore:items.length===12};
}
function allowedImageURL(value,provider){
 const href=https(value);if(!href)return false;const u=new URL(href);
 if(u.port&&u.port!=='443')return false;
 if(provider==='openverse')return u.hostname==='api.openverse.org'&&/^\/v1\/images\/[a-f0-9-]{36}\/thumb\/$/i.test(u.pathname);
 if(provider==='pixabay')return ['cdn.pixabay.com','pixabay.com'].includes(u.hostname);
 if(provider==='pexels')return u.hostname==='images.pexels.com';return false;
}
export async function importStock(input,env){
 const p=await verify(input.selection,env);if(!allowedImageURL(p.download,p.provider))fail('Origen de imagen no permitido.',400);
 let r,url=p.download;
 for(let redirects=0;redirects<3;redirects++){
  r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(30000)});
  if([301,302,303,307,308].includes(r.status)){const next=new URL(r.headers.get('location')||'',url).href;await r.body?.cancel();if(!allowedImageURL(next,p.provider))fail('Redirección de imagen no permitida.');url=next;continue;}
  break;
 }
 if(!r.ok)fail('No se pudo descargar esta foto. Elige otra.',502);
 const mime=(r.headers.get('content-type')||'').split(';')[0];if(!['image/jpeg','image/png','image/webp'].includes(mime)){await r.body?.cancel();fail('El archivo no es una foto compatible.');}
 if(Number(r.headers.get('content-length'))>MAX){await r.body?.cancel();fail('La foto supera 8 MB.',413);}
 const reader=r.body.getReader(),parts=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX){await reader.cancel();fail('La foto supera 8 MB.',413);}parts.push(value);}}finally{reader.releaseLock();}
 if(!size)fail('La imagen está vacía.');const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
 const {download,thumbnail,expires,...credit}=p;
 return {dataURI:'data:'+mime+';base64,'+base64(bytes),credit};
}
