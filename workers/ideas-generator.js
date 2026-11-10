import { geminiScriptCall, trustedSources } from './script-generator.js';
import { searchRealNews } from './news-search.js';
import { generateWikipediaIdeas } from './wiki-search.js';
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
 if(mode==='factual')return generateWikipediaIdeas(topic,style,env);
 if(mode==='fiction'){
  const instructions=[
   'Crea EXACTAMENTE diez conceptos de historias de FICCIÓN DIFERENTES en español para que el usuario elija UNA portada y la convierta en video.',
   'TEMA OBLIGATORIO: '+JSON.stringify(topic)+'; GÉNERO: '+style+'. No te desvíes del tema.',
   'Cada propuesta: title atractivo distinto (6-90 caracteres), synopsis de 40-70 palabras explicando el conflicto particular, outline breve de comienzo, nudo y giro, coverPrompt en inglés describiendo la imagen cinematográfica de portada, sin texto ni marcas de agua.',
   'Cada título, sinopsis y trama debe tratar el tema literal solicitado. Los lugares, personajes y restricciones mencionados por el usuario son obligatorios; el género solo cambia el tono. No sustituyas el tema por ejemplos prefabricados.',
   'Antes de responder, revisa las diez propuestas y reescribe cualquiera que se aparte del tema. No reutilices la misma trama.',
   'Responde solo JSON {"ideas":[{"title":"...","synopsis":"...","outline":"...","coverPrompt":"..."},...]} con exactamente diez objetos.'
  ].join('\n\n');
  const generated=await geminiScriptCall(env,instructions,{json:true});
  const ideas=ideasFromAI(json(generated.text)?.ideas);
  if(ideas.length!==10)ideasError('Gemini no preparó diez historias diferentes; intenta regenerar las propuestas.');
  return {query:topic,style,mode,ideas,checkedAt:null,sources:[]};
 }
}
