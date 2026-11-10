// GDELT plus public publisher feeds. No paid API or invented headlines.
function newsError(message,status=422){const e=new Error(message);e.httpStatus=status;throw e}
const RD_DATE=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santo_Domingo',year:'numeric',month:'2-digit',day:'2-digit'});
const localDate=value=>RD_DATE.format(value);
const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const FEEDS=[
 {name:'Diario Libre',url:'https://www.diariolibre.com/rss/actualidad.xml',context:'República Dominicana noticias nacionales'},
 {name:'Diario Libre',url:'https://www.diariolibre.com/rss/portada.xml'},
 {name:'Listín Diario',url:'https://listindiario.com/sitemap-google-news.xml',sitemap:true},
 {name:'El Nuevo Diario',url:'https://elnuevodiario.com.do/feed/'},
 {name:'Hoy',url:'https://hoy.com.do/rss/home.xml'},
 {name:'BBC Mundo',url:'https://feeds.bbci.co.uk/mundo/rss.xml',context:'noticias mundo internacionales'}
];
function searchSubject(topic){
 return String(topic||'').replace(/[¡!¿?;]+/g,' ')
  .replace(/^(?:(?:quiero|dame|genera|generar|muéstrame|muestrame|busca|buscar|ver)\s+)+/i,'')
  .replace(/^(?:(?:las|unas|últimas|ultimas|actuales|recientes)\s+)*noticias?\s*(?:(?:de|del|en|sobre)\s+)?/i,'')
  .replace(/^(?:de|del|en|sobre)\s+/i,'')
  .replace(/(?<!\p{L})(?:noticias?|hoy|ahora|última hora|del momento|esta semana|últimos días)(?!\p{L})/giu,' ')
  .replace(/\s+/g,' ').replace(/^[\s,.:]+|[\s,.:]+$/g,'').trim();
}
function searchTerm(topic){return (searchSubject(topic)||'República Dominicana').replace(/hig[uü]e[yí]/gi,'(Higuey OR Higüey)').slice(0,220)}
function requestedTokens(topic){
 const ignored=new Set(['de','del','el','la','los','las','en','sobre','y','o','al','un','una','para','por','con','que','ultimas','actuales','recientes']);
 return [...new Set((fold(searchSubject(topic)).match(/[a-z0-9]+/g)||[]).filter(w=>!ignored.has(w)))];
}
function relevant(item,tokens){
 const words=fold([item.title,item.description,item.keywords,item.context,item.url].join(' ')).replace(/[^a-z0-9]+/g,' ').split(' ');
 return tokens.every(word=>words.some(x=>x===word||(word.length>=5&&x.startsWith(word))));
}
function safeHTTPS(value){try{const u=new URL(String(value));return u.protocol==='https:'&&u.hostname&&!/(?:^|\.)(?:localhost|local)$/.test(u.hostname)?u.href:''}catch{return ''}}
function dateOf(value){
 const t=String(value||'');const s=/^\d{8}T\d{6}Z$/.test(t)?t.slice(0,4)+'-'+t.slice(4,6)+'-'+t.slice(6,8)+'T'+t.slice(9,11)+':'+t.slice(11,13)+':'+t.slice(13,15)+'Z':t;
 const d=new Date(s);return Number.isFinite(d.getTime())?d:null;
}
function xmlText(value){
 return String(value||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
  .replace(/&#(x[0-9a-f]+|[0-9]+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):''})
  .replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[n])
  .replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
}
function tag(block,name){return xmlText(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i').exec(block)?.[1]||'')}
function parseFeed(xml,feed){
 const blocks=xml.match(feed.sitemap?/<url(?:\s[^>]*)?>[\s\S]*?<\/url>/gi:/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)||[];
 return blocks.slice(0,300).map(block=>{
  const url=safeHTTPS(tag(block,feed.sitemap?'loc':'link'));if(!url)return null;
  const host=new URL(url).hostname.replace(/^www\./,'');const feedHost=new URL(feed.url).hostname.replace(/^www\./,'');
  if(host!==feedHost&&!(feed.name==='BBC Mundo'&&['bbc.com','bbc.co.uk'].includes(host)))return null;
  return {title:tag(block,feed.sitemap?'news:title':'title'),url,
   description:tag(block,'description').replace(/\s+La entrada [\s\S]*$/i,'').slice(0,600),keywords:tag(block,'news:keywords'),
   date:dateOf(tag(block,feed.sitemap?'news:publication_date':'pubDate')),dateKind:'publication',publisher:feed.name,
   context:feed.context||(/\/la-republica\//.test(url)||/^(nacionales|nacional|politica|republica dominicana|pais)$/.test(fold(tag(block,'category')))?'República Dominicana noticias nacionales':''),provider:feed.name};
 }).filter(Boolean);
}
async function cachedFetch(url,kind){
 let cache,key;
 try{cache=typeof caches!=='undefined'?caches.default:null;key=new Request('https://faceless-images.marianitord2020.workers.dev/_cache/news-v3?kind='+kind+'&url='+encodeURIComponent(url));const hit=cache&&await cache.match(key);if(hit)return hit}catch{cache=null}
 const response=await fetch(url,{headers:{accept:kind==='gdelt'?'application/json':'application/rss+xml, application/xml, text/xml'},signal:AbortSignal.timeout(12000)});
 if(cache&&key&&(response.ok||response.status===429)){
  const copy=response.clone(),headers=new Headers(copy.headers);headers.set('cache-control','public, max-age='+(response.ok?300:60));
  try{await cache.put(key,new Response(copy.body,{status:copy.status,headers}))}catch{}
 }return response;
}
function eligible(item,tokens,today,days){
 if(!item?.url||!item.date||item.title?.length<12||!relevant(item,tokens))return false;
 if(item.date.getTime()>Date.now()+300000)return false;
 return today?localDate(item.date)===localDate(new Date()):item.date.getTime()>=Date.now()-days*86400000;
}
export async function searchRealNews(topic,style,env){
 const query=String(topic||'').trim(),tokens=requestedTokens(query);
 const today=/(?:\bhoy\b|última hora|del momento|en vivo|ahora)/i.test(query),days=/(?:esta semana|semana|últimos días)/i.test(query)?7:3;
 const params=new URLSearchParams({query:searchTerm(query),mode:'artlist',format:'json',maxrecords:'50',sort:'datedesc',timespan:today?'24h':days+'d'});
 let entries=[],primaryIssue='',available=0;
 try{
  const response=await cachedFetch('https://api.gdeltproject.org/api/v2/doc/doc?'+params,'gdelt');if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();if(!Array.isArray(data.articles))throw Error('Respuesta incompleta');available++;
  entries=data.articles.map(a=>({title:String(a.title||'').trim(),url:safeHTTPS(a.url),date:dateOf(a.seendate),dateKind:'observation',publisher:String(a.domain||''),image:safeHTTPS(a.socialimage),provider:'GDELT Project'})).filter(a=>eligible(a,tokens,today,days));
 }catch(error){primaryIssue=String(error.message||error).slice(0,120)}
 if(!entries.length){
  const feeds=await Promise.allSettled(FEEDS.map(async feed=>{
   const response=await cachedFetch(feed.url,'publisher');if(!response.ok)throw Error(feed.name+': HTTP '+response.status);
   const xml=await response.text();if(xml.length>1500000||!/<(?:rss|urlset)\b/i.test(xml))throw Error('Formato no válido');return parseFeed(xml,feed);
  }));
  for(const r of feeds)if(r.status==='fulfilled'){available++;entries.push(...r.value.filter(a=>eligible(a,tokens,today,days)))}
 }
 const seen=new Set();entries=entries.sort((a,b)=>b.date-a.date).filter(a=>{const key=fold(a.title).replace(/\W/g,'');if(seen.has(key))return false;seen.add(key);return true}).slice(0,10);
 if(!entries.length){
  if(!available)newsError('Los buscadores de noticias no están disponibles temporalmente para «'+query+'». Conservé tu tema; vuelve a intentar en unos minutos.',503);
  newsError('No encontré noticias '+(today?'publicadas o detectadas hoy':'recientes')+' que coincidan con «'+query+'» en las fuentes disponibles.'+(primaryIssue?' El buscador principal está temporalmente limitado; también consulté medios de respaldo.':'')+' No sustituí tu tema por otro.',422);
 }
 const ideas=entries.map((a,i)=>({id:'news-'+(i+1),title:a.title.slice(0,200),
  synopsis:'Titular publicado por '+(a.publisher||new URL(a.url).hostname)+': «'+a.title+'». '+(a.dateKind==='publication'?'Fecha de publicación: ':'Fecha de detección: ')+localDate(a.date)+'. Consulta el artículo original para conocer los detalles.',
  outline:'Titular de la fuente: '+a.title+'. Medio: '+a.publisher+'. Enlace original: '+a.url+'. '+(a.dateKind==='publication'?'Publicado':'Detectado')+' el '+localDate(a.date)+'. No afirmar detalles que no aparezcan en el artículo.',
  coverPrompt:'Portada informativa con elementos gráficos; no representar una ilustración como fotografía del suceso.',sourceUrl:a.url,sourceTitle:a.publisher,sourceSeenAt:localDate(a.date),sourceDateKind:a.dateKind,sourceImageUrl:a.image||''}));
 return {mode:'news',style,query,ideas,sources:entries.map(a=>({title:a.title+' — '+a.publisher,url:a.url,date:localDate(a.date)})),checkedAt:new Date().toISOString(),sourceProvider:[...new Set(entries.map(a=>a.provider))].join(', '),usedFallback:entries.some(a=>a.provider!=='GDELT Project'),note:'Las fechas son de publicación en el medio o de detección en GDELT, no necesariamente de los hechos. Se conserva el tema literal de la búsqueda.'};
}
export {searchSubject,searchTerm,requestedTokens,relevant,parseFeed,eligible};
