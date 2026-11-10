import { geminiScriptCall, trustedSources } from './script-generator.js';
import { searchRealNews } from './news-search.js';
function ideasError(message,status=502){const e=new Error(message);e.httpStatus=status;throw e}
function json(raw){
 try{return JSON.parse(raw)}catch{
  const first=raw.indexOf('{'),last=raw.lastIndexOf('}');
  try{return JSON.parse(raw.slice(first,last+1))}catch{ideasError('Gemini devolvió propuestas incompletas. Intenta nuevamente.')}
 }
}
function ideasFromAI(items,limit=10){
 const unique=new Set(),out=[];
 for(const o of items||[]){
  const title=String(o?.title||'').trim().slice(0,110);
  const synopsis=String(o?.synopsis||'').trim().slice(0,450);
  if(title.length<8||synopsis.length<30||unique.has(title.toLowerCase()))continue;
  unique.add(title.toLowerCase());
  out.push({id:'idea-'+(out.length+1),title,synopsis,
   outline:String(o.outline||'').trim().slice(0,650),
   coverPrompt:String(o.coverPrompt||'').trim().slice(0,500)});
  if(out.length===limit)break;
 }
 return out;
}
export async function generateCoverIdeas(input,env){
 const topic=String(input?.topic||'').replace(/\s+/g,' ').trim();
 if(topic.length<5||topic.length>220)ideasError('Escribe un tema de 5 a 220 caracteres.',400);
 const style=String(input?.style||'Misterio').slice(0,40);
 const mode=['fiction','news','factual'].includes(input?.mode)?input.mode:'fiction';
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santo_Domingo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 if(mode==='news')return searchRealNews(topic,style,env);
 if(mode==='fiction'){
  const instructions=[
   'Crea EXACTAMENTE diez conceptos de historias de FICCIÓN DIFERENTES en español para que el usuario elija UNA portada y la convierta en video.',
   'TEMA OBLIGATORIO: '+JSON.stringify(topic)+'; GÉNERO: '+style+'. No te desvíes del tema.',
   'Cada propuesta: title atractivo distinto (6-90 caracteres), synopsis de 40-70 palabras explicando el conflicto particular, outline breve de comienzo, nudo y giro, coverPrompt en inglés describiendo la imagen cinematográfica de portada, sin texto ni marcas de agua.',
   'No reutilices la misma trama. Los diez argumentos deben ser claramente diferentes.',
   'Responde solo JSON {"ideas":[{"title":"...","synopsis":"...","outline":"...","coverPrompt":"..."},...]} con exactamente diez objetos.'
  ].join('\n\n');
  const generated=await geminiScriptCall(env,instructions,{json:true});
  const ideas=ideasFromAI(json(generated.text)?.ideas);
  if(ideas.length!==10)ideasError('Gemini no preparó diez historias diferentes; intenta regenerar las propuestas.');
  return {query:topic,style,mode,ideas,checkedAt:null,sources:[]};
 }
 const news=mode==='news';
 const research=await geminiScriptCall(env,[
  'BÚSQUEDA LITERAL: '+JSON.stringify(topic)+'. FECHA ACTUAL: '+date+'.',
  news?'Busca EN GOOGLE noticias reales recientes relacionadas SOLO con esta búsqueda. Si dice "hoy", distingue hechos de hoy de artículos antiguos. No inventes titulares o hechos. Necesito enlaces a noticias individuales, no portales.':
       'Busca EN GOOGLE hechos confirmados y fuentes sobre el tema exacto para proponer enfoques documentales. No inventes hechos.',
  'Entrega un resumen comprobado con hechos concretos y sus fechas; especifica incertidumbres.'
 ].join('\n\n'),{search:true});
 const sources=trustedSources(research.meta);
 const didSearch=Array.isArray(research.meta?.webSearchQueries)&&research.meta.webSearchQueries.some(q=>String(q).trim());
 if(!didSearch||!sources.length)ideasError('No se encontraron fuentes reales verificables para esta búsqueda.',422);
 if(news){
  const eligible=sources.filter(s=>{
   try{
    const u=new URL(s.url);
    const p=u.pathname.replace(/\/$/,'');
    return s.title.length>=10&&p.length>4&&!/(?:^\/(?:inicio|home|portada|news|noticias|newsroom|blog|search)$)/i.test(p);
   }catch{return false}
  });
  const candidates=eligible.length?eligible:sources.filter(s=>s.title.length>=15);
  if(!candidates.length)ideasError('No encontré noticias individuales verificables sobre ese tema.',422);
  const indexed=candidates.slice(0,10).map((x,i)=>({n:i,title:x.title,url:x.url}));
  const prompt=[
   'Prepara tarjetas de noticias REALES EN ESPAÑOL. Cada tarjeta corresponde a una fuente de Google Search. Máximo diez, nunca inventes para completar.',
   'Consulta literal: '+JSON.stringify(topic)+'. Hoy es '+date+'.',
   'FUENTES AUTÉNTICAS CON INDICES: '+JSON.stringify(indexed),
   'HECHOS CORROBORADOS: '+research.text.slice(0,14000),
   'Elige SOLO fuentes que hablen de noticias individuales pertinentes a la consulta. OMITE portales, información sin confirmar, artículos viejos presentados como recientes.',
   'Cada elemento JSON necesita sourceIndex (n de la fuente), title (titular fiel), synopsis (2 frases respaldadas por los hechos del informe), outline (detalles verificables). NO inventes.',
   'Devuelve solo JSON {"ideas":[{"sourceIndex":0,"title":"...","synopsis":"...","outline":"..."}]}.'
  ].join('\n\n');
  const generated=await geminiScriptCall(env,prompt,{json:true});
  const results=json(generated.text)?.ideas||[];
  const used=new Set(),ideas=[];
  for(const row of results){
   const index=Number(row?.sourceIndex);
   if(!Number.isInteger(index)||index<0||index>=indexed.length||used.has(index))continue;
   const original=indexed[index],title=String(row.title||original.title).trim().slice(0,110);
   const synopsis=String(row.synopsis||'').trim().slice(0,400);
   if(title.length<8||synopsis.length<25)continue;
   used.add(index);
   ideas.push({id:'news-'+(ideas.length+1),title,synopsis,
    outline:String(row.outline||'').trim().slice(0,600),
    sourceUrl:original.url,sourceTitle:original.title,
    coverPrompt:'Editorial visual con mapa y símbolos gráficos; no inventar fotografías de noticias reales.'});
   if(ideas.length>=10)break;
  }
  if(!ideas.length)ideasError('No se pudieron identificar noticias actuales verificadas. Prueba una búsqueda más específica.',422);
  return {query:topic,style,mode,ideas,sources,checkedAt:new Date().toISOString()};
 }
 const prompts=[
  'Propón hasta 10 ideas de DOCUMENTAL en español sobre '+JSON.stringify(topic)+', estilo '+style+'.',
  'Usa ÚNICAMENTE hechos del siguiente INFORME DE GOOGLE SEARCH: '+research.text.slice(0,14500),
  'Todos los ángulos deben tratar el tema solicitado, pero abordar diferentes hechos comprobados.',
  'title concreto, synopsis de 40-70 palabras con datos reales, outline con enfoque factual, coverPrompt en inglés que sea ilustración informativa veraz (personajes antiguos: recreación artística, no foto documental falsa).',
  'No inventes sucesos, fechas, cifras ni fuentes. JSON {"ideas":[{"title":"...","synopsis":"...","outline":"...","coverPrompt":"..."}]}'
 ].join('\n\n');
 const generated=await geminiScriptCall(env,prompts,{json:true});
 const ideas=ideasFromAI(json(generated.text)?.ideas,10);
 if(!ideas.length)ideasError('No hay propuestas documentales verificadas disponibles.',422);
 return {query:topic,style,mode,ideas,sources,checkedAt:new Date().toISOString()};
}
