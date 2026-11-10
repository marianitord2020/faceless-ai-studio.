import {NEWS_SOURCES,sourceSummary} from './news-sources.js';
// GDELT plus public publisher feeds. No paid API or invented headlines.
function newsError(message,status=422){const e=new Error(message);e.httpStatus=status;throw e}
const RD_DATE=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santo_Domingo',year:'numeric',month:'2-digit',day:'2-digit'});
const localDate=value=>RD_DATE.format(value);
const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

function searchSubject(topic){
 return String(topic||'').replace(/[¡!¿?;]+/g,' ')
  .replace(/^(?:(?:quiero|dame|genera|generar|muéstrame|muestrame|busca|buscar|ver)\s+)+/i,'')
  .replace(/^(?:(?:las|unas|últimas|ultimas|actuales|recientes)\s+)*noticias?\s*(?:(?:de|del|en|sobre)\s+)?/i,'')
  .replace(/^(?:de|del|en|sobre)\s+/i,'')
  .replace(/\b(?:en espa[nñ]ol|de habla hispana|medios hispanos)\b/gi,' ')
  .replace(/\btoda\s+(?:la\s+)?rep[uú]blica dominicana/gi,'República Dominicana')
  .replace(/(?<!\p{L})(?:noticias?|hoy|ahora|última hora|del momento|esta semana|últimos días)(?!\p{L})/giu,' ')
  .replace(/\b(?:recientes?|actual(?:es)?)\s*$/gi,' ')
  .replace(/\s+/g,' ').replace(/^[\s,.:]+|[\s,.:]+$/g,'').trim();
}
function searchTerm(topic){return (searchSubject(topic)||'República Dominicana').replace(/hig[uü]e[yí]/gi,'(Higuey OR Higüey)').slice(0,220)}
function requestedTokens(topic){
 const ignored=new Set(['de','del','el','la','los','las','en','sobre','y','o','al','un','una','para','por','con','que','ultimas','actuales','recientes']);
 return [...new Set((matchText(searchSubject(topic)).match(/[a-z0-9]+/g)||[]).filter(w=>!ignored.has(w)))];
}
function matchText(value){
 return fold(value).replace(/republica dominicana|rep\.? dom\.?|\brd\b/g,' dominicana ')
  .replace(/\bdominican(?:o|os|as)\b/g,'dominicana').replace(/\bia\b/g,'inteligencia artificial')
  .replace(/\b(?:espectaculos|celebridades|famosos)\b/g,'farandula')
  .replace(/\bturistic[oa]s?\b/g,'turismo').replace(/\bmusical(?:es)?\b/g,'musica')
  .replace(/\beconomic[oa]s?\b/g,'economia').replace(/\btecnologic[oa]s?\b/g,'tecnologia');
}
function itemWords(item){
 if(!item._words)item._words=matchText([item.title,item.description,item.keywords,item.context,item.url].join(' ')).replace(/[^a-z0-9]+/g,' ').split(' ');
 return item._words;
}
function hasWord(item,word){return itemWords(item).some(x=>x===word||(word.length>=5&&x.startsWith(word)))}
function relevant(item,tokens){return tokens.every(word=>hasWord(item,word))}
const LOCATIONS=['santo domingo','santiago','puerto plata','la romana','higuey','san pedro de macoris','san francisco de macoris','la vega','samana','barahona','san cristobal','san juan','monte cristi','monte plata','azua','espaillat','moca','bonao','cotui','nagua','dajabon','pedernales','san jose de ocoa','bavaro','punta cana','el seibo','hato mayor','valverde','mao','neiba','bahoruco','sanchez ramirez','duarte','salcedo','hermanas mirabal','elias pina','santiago rodriguez','dominicana','mexico','espana','argentina','colombia','peru','venezuela','chile','uruguay','puerto rico','cuba','ecuador','bolivia','panama','costa rica','guatemala'];
const RELATED={concierto:['show','musica','gala','presentacion','escenario','recital'],cine:['pelicula','serie','actor','estreno'],beisbol:['pelota','deporte','estadio'],turismo:['viaje','cultura','hotel','playa','destino','visitante'],musica:['cancion','concierto','cantante','artista','album'],farandula:['entretenimiento','cantante','actor','artista','television','cine','musica'],entretenimiento:['farandula','cine','musica','serie','television','videojuego','teatro'],economia:['negocio','finanza','comercio','inversion'],tecnologia:['innovacion','digital','inteligencia','robot'],deporte:['beisbol','baloncesto','futbol','pelota'],salud:['medicina','hospital','bienestar'],educacion:['escuela','universidad','estudiante']};
function relatedMatches(pool,query,today,days){
 const tokens=requestedTokens(query),normalized=matchText(searchSubject(query));
 if(!tokens.length)return [];
 const locations=LOCATIONS.filter(place=>(' '+normalized+' ').includes(' '+place+' '));
 const locationTokens=new Set(locations.flatMap(requestedTokens));
 const content=tokens.filter(t=>!locationTokens.has(t));
 const generic=new Set([...Object.keys(RELATED),'cultura','politica','actualidad','historia','crecimiento','demanda','noticia']);
 const anchor=locations.length?null:content.find(t=>t.length>=3&&!generic.has(t));
 return pool.filter(item=>eligible(item,[],false,Math.max(days,7))).map(item=>{
  if(!locations.every(place=>relevant(item,requestedTokens(place)))||(anchor&&!hasWord(item,anchor)))return null;
  const scores=content.map(word=>hasWord(item,word)?1:(RELATED[word]||[]).some(alias=>hasWord(item,alias))?0.6:0);
  const score=content.length?scores.reduce((a,b)=>a+b,0)/content.length:1;
  if(score<0.5)return null;
  const sameTopic=relevant(item,tokens),sameDay=localDate(item.date)===localDate(new Date());
  return {...item,relatedScore:score+(sameTopic?0.4:0)+(sameDay?0.1:0),matchType:'related',
   matchReason:sameTopic&&!eligible(item,tokens,today,days)?'Coincide con el tema; fecha ampliada al '+localDate(item.date)+'.':
    'Tema relacionado'+(locations.length?' que mantiene '+locations.join(', '):'')+'. Coincide por '+content.filter((_,i)=>scores[i]>0).join(', ')+'.'};
 }).filter(Boolean).sort((a,b)=>b.relatedScore-a.relatedScore||b.date-a.date);
}
function selectSources(query,style){
 const text=matchText(query),ent=/farandula|entretenimiento|musica|cine|actor|artista|concierto/.test(text)||['Farándula','Entretenimiento'].includes(style);
 const rd=/dominicana/.test(text),abroad=/mundo|internacional|hispan|mexico|espana|argentina|colombia|peru|chile|ecuador/.test(text)&&!rd;
 const scored=NEWS_SOURCES.map((f,i)=>({f,i,score:(f.region==='RD'?(abroad?0:3):(abroad?5:1))+(ent?(f.topics?.includes('entertainment')?8:0):(!f.entertainment?1:0))})).sort((a,b)=>b.score-a.score||a.i-b.i);
 const chosen=[],names=new Set();
 for(const {f} of scored){
  if(names.has(f.name))continue;
  if(!rd&&!abroad&&f.region==='RD'&&chosen.filter(x=>x.region==='RD').length>=10)continue;
  chosen.push(f);names.add(f.name);if(chosen.length===14)break;
 }
 return chosen;
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
function tag(block,name){name=name.includes(':')?'(?:[a-z][\\w.-]*:)?'+name.split(':').pop():name;return xmlText(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i').exec(block)?.[1]||'')}
function parseFeed(xml,feed){
 const blocks=xml.match(feed.sitemap?/<url(?:\s[^>]*)?>[\s\S]*?<\/url>/gi:/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)||[];
 return blocks.slice(0,300).map(block=>{
  const url=safeHTTPS(tag(block,feed.sitemap?'loc':'link'));if(!url)return null;
  const host=new URL(url).hostname.replace(/^www\./,'');const feedHost=new URL(feed.url).hostname.replace(/^www\./,'');
  if(host!==feedHost&&!(feed.hosts||[]).includes(host)&&!(feed.name==='BBC Mundo'&&['bbc.com','bbc.co.uk'].includes(host)))return null;
  const title=tag(block,feed.sitemap?'news:title':'title'),category=tag(block,'category');
  const entertainment=(feed.entertainment&&!/horoscop/.test(fold(url)))||/farandula|espectaculo|musica|cine|television|cantante|actor|actriz|artista|concierto|album|cancion/.test(fold(title+' '+url+' '+category));
  const extra=entertainment?' farándula entretenimiento ':'';
  return {title,url,region:feed.region,
   description:tag(block,'description').replace(/\s+La entrada [\s\S]*$/i,'').slice(0,600),keywords:tag(block,'news:keywords'),
   date:dateOf(tag(block,feed.sitemap?'news:publication_date':'pubDate')),dateKind:'publication',publisher:feed.name,
   context:(feed.context||(/\/la-republica\//.test(url)||/^(nacionales|nacional|politica|republica dominicana|pais)$/.test(fold(category))?'República Dominicana noticias nacionales':''))+' '+category+extra,provider:feed.name};
 }).filter(Boolean);
}
async function cachedFetch(url,kind){
 let cache,key;
 try{cache=typeof caches!=='undefined'?caches.default:null;key=new Request('https://faceless-images.marianitord2020.workers.dev/_cache/news-v4?kind='+kind+'&url='+encodeURIComponent(url));const hit=cache&&await cache.match(key);if(hit)return hit}catch{cache=null}
 const response=await fetch(url,{headers:{accept:kind==='gdelt'?'application/json':'application/rss+xml, application/xml, text/xml','User-Agent':'FacelessAIStudioBot/1.2 (https://github.com/marianitord2020/faceless-ai-studio.)'},signal:AbortSignal.timeout(12000)});
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
 const params=new URLSearchParams({query:searchTerm(query)+' sourcelang:spanish',mode:'artlist',format:'json',maxrecords:'50',sort:'datedesc',timespan:today?'24h':days+'d'});
 let entries=[],pool=[],primaryIssue='',available=0,checkedSources=[];
 try{
  const response=await cachedFetch('https://api.gdeltproject.org/api/v2/doc/doc?'+params,'gdelt');if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();if(!Array.isArray(data.articles))throw Error('Respuesta incompleta');available++;
  pool=data.articles.map(a=>({title:String(a.title||'').trim(),url:safeHTTPS(a.url),date:dateOf(a.seendate),dateKind:'observation',publisher:String(a.domain||''),image:safeHTTPS(a.socialimage),provider:'GDELT Project'}));entries=pool.filter(a=>eligible(a,tokens,today,days));
 }catch(error){primaryIssue=String(error.message||error).slice(0,120)}
 if(entries.length<5){
  const selected=selectSources(query,style);let next=0;
  await Promise.all(Array.from({length:4},async()=>{
   while(next<selected.length){const feed=selected[next++];
    try{
     const response=await cachedFetch(feed.url,'publisher');if(!response.ok)throw Error('HTTP '+response.status);
     const xml=await response.text();if(xml.length>1500000||!/<(?:rss|urlset)\b/i.test(xml))throw Error('Formato no válido');
     const items=parseFeed(xml,feed);available++;checkedSources.push(feed.name);pool.push(...items);
    }catch{}
   }
  }));
  entries=pool.filter(a=>eligible(a,tokens,today,days));
 }
 const exactMatchCount=entries.length;
 if(!entries.length)entries=relatedMatches(pool,query,today,days);

 const seen=new Set();entries=(exactMatchCount?entries.sort((a,b)=>b.date-a.date):entries).filter(a=>{const key=fold(a.title).replace(/\W/g,'');if(seen.has(key))return false;seen.add(key);return true}).slice(0,10);
 if(!entries.length){
  if(!available)newsError('Los buscadores de noticias no están disponibles temporalmente para «'+query+'». Conservé tu tema; vuelve a intentar en unos minutos.',503);
  newsError('No encontré coincidencias exactas ni temas relacionados recientes para «'+query+'» en las fuentes disponibles.'+(primaryIssue?' El buscador principal está temporalmente limitado; también consulté medios de respaldo.':'')+' No hay noticias respaldadas para sugerir en esta consulta.',422);
 }
 const ideas=entries.map((a,i)=>({matchType:exactMatchCount?'exact':'related',matchReason:a.matchReason||'Coincide con tu búsqueda y el periodo solicitado.',originalQuery:query,id:'news-'+(i+1),title:a.title.slice(0,200),
  synopsis:'Titular publicado por '+(a.publisher||new URL(a.url).hostname)+': «'+a.title+'». '+(a.dateKind==='publication'?'Fecha de publicación: ':'Fecha de detección: ')+localDate(a.date)+'. Consulta el artículo original para conocer los detalles.',
  outline:'Titular de la fuente: '+a.title+'. Medio: '+a.publisher+'. Enlace original: '+a.url+'. '+(a.dateKind==='publication'?'Publicado':'Detectado')+' el '+localDate(a.date)+'. No afirmar detalles que no aparezcan en el artículo.',
  coverPrompt:'Portada informativa con elementos gráficos; no representar una ilustración como fotografía del suceso.',sourceUrl:a.url,sourceTitle:a.publisher,sourceSeenAt:localDate(a.date),sourceDateKind:a.dateKind,sourceImageUrl:a.image||''}));
 return {mode:'news',style,query,ideas,sources:entries.map(a=>({title:a.title+' — '+a.publisher,url:a.url,date:localDate(a.date)})),checkedAt:new Date().toISOString(),sourceProvider:[...new Set(entries.map(a=>a.provider))].join(', '),usedFallback:entries.some(a=>a.provider!=='GDELT Project'),matchType:exactMatchCount?'exact':'related',exactMatchCount:exactMatchCount?ideas.length:0,sourceCoverage:{...sourceSummary(),queriedPublishers:[...new Set(checkedSources)]},note:'Las fechas son de publicación en el medio o de detección en GDELT, no necesariamente de los hechos. Se conserva el tema literal de la búsqueda.'};
}
export {searchSubject,searchTerm,requestedTokens,relevant,parseFeed,eligible,relatedMatches,selectSources};
