// Guiones verificados. Ficción solo cuando el usuario la elige expresamente.
const SCRIPT_MODEL='gemini-2.5-flash-lite';
function scriptError(msg,status=502){const e=new Error(msg);e.httpStatus=status;throw e}
const NEWS_TERMS=/(?:noticias?|actualidad|últimas?|recientes?|\bhoy\b|\bahora\b|\bmomento\b|esta semana|en vivo|última hora|breaking news|news today)/i;
const FICTION_TERMS=/(?:historia ficticia|cuento ficticio|historia inventada|cuento inventado|ficción|ficcion|cuento de fantasía|invent[a-zá]* una historia|crea un cuento)/i;
async function geminiScriptCall(env,query,options={}){
  if(!env.GEMINI_TTS_API_KEY)scriptError('Falta conectar Gemini para crear guiones.',503);
  const generationConfig={temperature:options.search?0.05:0.15,maxOutputTokens:options.search?2800:5000};
  if(options.json)generationConfig.responseMimeType='application/json';
  const request={contents:[{role:'user',parts:[{text:query}]}],generationConfig};
  if(options.search)request.tools=[{google_search:{}}];
  const res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+SCRIPT_MODEL+':generateContent',{
    method:'POST',headers:{'content-type':'application/json','x-goog-api-key':env.GEMINI_TTS_API_KEY},
    body:JSON.stringify(request)
  });
  let data;try{data=await res.json()}catch{scriptError('Gemini no devolvió un resultado válido.')}
  if(!res.ok)scriptError('Gemini: '+String(data?.error?.message||res.status).slice(0,210),res.status);
  const candidate=data?.candidates?.[0];
  const text=(candidate?.content?.parts||[]).map(p=>p.text||'').join('\n').trim();
  if(!text)scriptError('Gemini no devolvió datos. Revisa los límites de uso.');
  return {text,meta:candidate?.groundingMetadata||{}};
}
function trustedSources(meta){
  const unique=new Set(),list=[];
  for(const c of meta?.groundingChunks||[]){
    const uri=String(c?.web?.uri||'');
    if(!uri.startsWith('https://')||uri.length>1600||unique.has(uri))continue;
    unique.add(uri);
    list.push({title:String(c.web.title||'Fuente consultada').slice(0,120),url:uri});
  }
  return list.slice(0,10);
}
export async function generateVerifiedScript(input,env){
  const topic=String(input.topic||'').trim().replace(/\s+/g,' ');
  if(topic.length<5||topic.length>240)scriptError('Escribe una búsqueda concreta (5–240 caracteres).',400);
  const duration=[30,60,120].includes(Number(input.duration))?Number(input.duration):30;
  const platform=['TikTok','Shorts','Reels','Facebook'].includes(input.platform)?input.platform:'TikTok';
  const style=['Misterio','Historia','Curiosidades','Motivación','Noticias','Educativo','Romance','Farándula'].includes(input.style)?input.style:'Educativo';
  const selected=['informativo','noticias','ficcion'].includes(input.mode)?input.mode:'informativo';
  // Una petición explícita de ficción cuenta incluso con el selector predeterminado.
  const fiction=selected==='ficcion'||(selected==='informativo'&&FICTION_TERMS.test(topic));
  const mode=fiction?'ficcion':(selected==='noticias'||style==='Noticias'||NEWS_TERMS.test(topic)?'noticias':'informativo');
  const count=duration===30?5:duration===60?8:12;
  const idea=input.idea&&typeof input.idea==='object'?{
    title:String(input.idea.title||'').trim().slice(0,140),
    synopsis:String(input.idea.synopsis||'').trim().slice(0,500),
    outline:String(input.idea.outline||'').trim().slice(0,700),
    sourceUrl:String(input.idea.sourceUrl||'').trim().slice(0,1500)
  }:null;
  if(idea&&(!idea.title||!idea.synopsis))scriptError('La portada elegida necesita título y sinopsis.',400);
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santo_Domingo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  let proof='',sources=[];
  if(mode!=='ficcion'){
    const instruction=mode==='noticias'
      ?'Busca noticias REALES y RECIENTES sobre la consulta exacta. Usa Google Search. Indica fecha de los hechos y publicación. Si la petición es genérica, selecciona noticias de hoy o ayer con fuentes identificables. Si no hay resultados suficientes, dilo. NUNCA inventes titulares o eventos.'
      :'Investiga la consulta EXACTA usando Google Search. Prioriza fuentes primarias o contrastadas y datos corroborados. Di si algún detalle está sin verificar. NUNCA inventes hechos.';
    const research=await geminiScriptCall(env,[
      'CONSULTA LITERAL DEL USUARIO: '+JSON.stringify(topic),
      ...(idea?['PORTADA SELECCIONADA: '+JSON.stringify(idea.title),
        'SINOPSIS ESPECÍFICA DE LA PORTADA: '+idea.synopsis,
        idea.sourceUrl?'FUENTE ORIGINAL DE LA NOTICIA SELECCIONADA: '+idea.sourceUrl:'',
        'Investiga SOLAMENTE el suceso o ángulo de esta portada. No mezcles con otros titulares de la búsqueda general.']:[]),
      'FECHA DE HOY: '+date,
      instruction,
      'Entrega únicamente hechos comprobados y sus fechas, sin cuentos o dramatizaciones.',
      'Evita sucesos y lugares que no estén vinculados a esa consulta.'
    ].join('\n'),{search:true});
    sources=trustedSources(research.meta);
    const didSearch=Array.isArray(research.meta?.webSearchQueries)&&
      research.meta.webSearchQueries.some(q=>String(q).trim());
    if(!didSearch||sources.length<(mode==='noticias'&&!idea?2:1)){
      scriptError('No pude comprobar '+(mode==='noticias'?'noticias recientes':'el tema')+
        ' con fuentes de Google. No generaré datos inventados. Intenta una búsqueda más concreta.',422);
    }
    proof=research.text.slice(0,14000);
  }
  const rules=mode==='ficcion'
    ?'El usuario ha pedido FICCIÓN. Puedes inventar personajes y acontecimientos; indica claramente que es una historia ficticia.'
    :'Solo información REAL del resumen verificado. Prohibido inventar nombres, fechas, cifras, citas, sucesos o fuentes. Reparte los hechos confirmados entre escenas sin añadir material no confirmado. No confundas fechas de publicación con fechas de hechos.';
  const prompt=[
    'Crea guion para video EN ESPAÑOL sobre la búsqueda literal '+JSON.stringify(topic)+'.',
    ...(idea?['PORTADA ELEGIDA POR EL USUARIO: '+JSON.stringify(idea.title),
      'SINOPSIS FIJA: '+idea.synopsis,
      idea.outline?'TRAMA O ENFOQUE FIJO: '+idea.outline:'',
      idea.sourceUrl?'ARTÍCULO ORIGINAL DE LA PORTADA: '+idea.sourceUrl:'',
      'OBLIGATORIO: la narración desarrolla esta portada precisa; conserva personajes, sucesos y enfoque. No cambies de historia ni inventes otra noticia.']:[]),
    'FECHA: '+date+'. MODO: '+mode+'. DURACIÓN: '+duration+' s. ESCENAS EXACTAS: '+count+'. PLATAFORMA: '+platform+'. ESTILO: '+style+'.',
    rules,
    'No cambies ni amplíes el tema: responde SOLO a lo que el usuario pidió.',
    'Título específico, fiel a la búsqueda. Cada texto escena 20–270 caracteres, narración natural en español.',
    'Los prompts visuales describen esa escena sin simular fotografías documentales de hechos no probados.',
    'Devuelve exclusivamente JSON {"title":"...","scenes":[{"text":"...","prompt":"..."},...]} con exactamente '+count+' escenas.',
    mode==='ficcion'?'':'RESUMEN COMPROBADO CON GOOGLE SEARCH (ÚNICA FUENTE PARA AFIRMACIONES):\n'+proof
  ].filter(Boolean).join('\n\n');
  const out=await geminiScriptCall(env,prompt,{json:true});
  let data;
  try{data=JSON.parse(out.text)}
  catch{scriptError('Gemini devolvió un guion con formato inválido. Regenera.')}
  if(!Array.isArray(data?.scenes)||data.scenes.length!==count)
    scriptError('Gemini no devolvió las '+count+' escenas solicitadas. Intenta nuevamente.');
  const scenes=data.scenes.map((s,i)=>{
    const text=String(s?.text||'').trim().slice(0,520);
    const prompt=String(s?.prompt||'').trim().slice(0,600);
    if(text.length<12||prompt.length<10)scriptError('La escena '+(i+1)+' está incompleta.');
    return {text,prompt};
  });
  return {
    title:idea?.title||String(data.title||topic).slice(0,140),scenes,mode,query:topic,sources,
    checkedAt:mode==='ficcion'?null:new Date().toISOString(),
    provider:'Gemini 2.5 Flash-Lite'+(mode==='ficcion'?'':' + Google Search')
  };
}

export { geminiScriptCall, trustedSources };
