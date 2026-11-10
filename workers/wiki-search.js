// Catálogo documental sin Google Search de pago: fuentes de Wikipedia en español.
// Texto CC BY-SA, imágenes libres según PageImages; mostrar atribución y enlace.
import { geminiScriptCall } from './script-generator.js';
function factualError(message,status=422){const e=new Error(message);e.httpStatus=status;throw e}
function parseJson(raw){
 try{return JSON.parse(raw)}catch{
  try{return JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1))}
  catch{factualError('El generador no devolvió propuestas documentales completas.',502)}
 }
}
function https(u){try{const x=new URL(u);return x.protocol==='https:'?x.href:''}catch{return ''}}
export async function generateWikipediaIdeas(topic,style,env){
 const params=new URLSearchParams({
  action:'query',generator:'search',gsrsearch:topic,gsrlimit:'10',
  prop:'extracts|pageimages|info',exintro:'1',explaintext:'1',exlimit:'max',
  inprop:'url',piprop:'thumbnail',pithumbsize:'720',pilicense:'free',
  format:'json',formatversion:'2',utf8:'1'
 });
 let response;
 try{response=await fetch('https://es.wikipedia.org/w/api.php?'+params,{headers:{accept:'application/json'}})}
 catch{factualError('No se pudo consultar Wikipedia para verificar el tema.',503)}
 if(!response.ok)factualError('Wikipedia no respondió correctamente (HTTP '+response.status+').',503);
 let data;
 try{data=await response.json()}catch{factualError('Wikipedia devolvió datos incompletos.',503)}
 const pages=(data?.query?.pages||[]).filter(p=>p?.title&&p?.extract&&p?.fullurl);
 const articles=pages.slice(0,10).map((p,i)=>({
  n:i,title:String(p.title).slice(0,120),url:https(p.fullurl),
  text:String(p.extract).slice(0,2200),
  thumbnail:https(p.thumbnail?.source)
 })).filter(p=>p.url&&p.text.length>=90);
 if(!articles.length)factualError('No encontré artículos informativos suficientes sobre «'+topic+'». No crearé datos históricos inventados.',422);
 const prompt=[
  'Genera hasta diez tarjetas de IDEAS DOCUMENTALES verificables en español sobre EXACTAMENTE '+JSON.stringify(topic)+'.',
  'ESTILO: '+style+'. No inventes sucesos o personajes.',
  'DOCUMENTACIÓN de Wikipedia con n índice y texto de cada artículo: '+JSON.stringify(articles.map(({n,title,url,text})=>({n,title,url,text}))),
  'Cada idea DEBE tener sourceIndex igual a uno de los n suministrados, title distinto, synopsis 35-60 palabras, outline hechos comprobados y coverPrompt para una ilustración fiel a la época. NO simules una fotografía histórica inexistente.',
  'Puedes proponer distintos enfoques del mismo artículo, pero no añadir datos ausentes.',
  'Responde únicamente JSON: {"ideas":[{"sourceIndex":0,"title":"...","synopsis":"...","outline":"...","coverPrompt":"..."}]}. Hasta diez ideas.'
 ].join('\n\n');
 const generated=await geminiScriptCall(env,prompt,{json:true});
 const raw=parseJson(generated.text)?.ideas||[];
 const ideas=[],seen=new Set();
 for(const item of raw){
  const ix=Number(item?.sourceIndex);
  if(!Number.isInteger(ix)||ix<0||ix>=articles.length)continue;
  const page=articles[ix];
  const title=String(item.title||'').trim().slice(0,115);
  const synopsis=String(item.synopsis||'').trim().slice(0,460);
  if(title.length<8||synopsis.length<30||seen.has(title.toLowerCase()))continue;
  seen.add(title.toLowerCase());
  ideas.push({id:'wiki-'+(ideas.length+1),title,synopsis,
   outline:String(item.outline||'').slice(0,650),
   coverPrompt:String(item.coverPrompt||'').slice(0,500),
   sourceUrl:page.url,sourceTitle:page.title,sourceImageUrl:page.thumbnail});
  if(ideas.length===10)break;
 }
 if(!ideas.length)factualError('No pude preparar propuestas basadas en los artículos encontrados.',422);
 return {mode:'factual',style,query:topic,ideas,
  sources:articles.map(a=>({title:a.title,url:a.url})),checkedAt:new Date().toISOString(),
  sourceProvider:'Wikipedia',sourceAttribution:'https://es.wikipedia.org/',
  note:'Información resumida y enlazada a Wikipedia; verificar fuentes originales y derechos de las imágenes antes de reutilizarlas.'};
}
