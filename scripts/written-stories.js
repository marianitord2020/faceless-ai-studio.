/* Textos publicados: búsqueda pública, lectura y traducción; nunca genera relatos. */
(() => {
  'use strict';
  const BASE='https://es.wikisource.org/w/api.php',cache=new Map();
  const plain=html=>{const d=new DOMParser().parseFromString(String(html),'text/html');d.querySelectorAll('script,style,table,nav,.mw-editsection,.ws-noexport,.noprint,.catlinks,.printfooter,.interwiki-extra,.pagenum,[hidden],[style*="display:none"],[style*="display: none"]').forEach(n=>n.remove());d.querySelectorAll('p,br,h1,h2,h3,li,div').forEach(n=>n.appendChild(d.createTextNode(' ')));return (d.body.textContent||'').replace(/\s+/g,' ').trim()};
  async function wiki(params){
    const url=BASE+'?'+new URLSearchParams({action:'query',format:'json',formatversion:'2',origin:'*',...params});
    if(cache.has(url))return cache.get(url);
    const r=await fetch(url,{signal:AbortSignal.timeout(20000)});
    if(!r.ok)throw Error('Wikisource no respondió (HTTP '+r.status+'). Puedes pegar un texto publicado.');
    const data=await r.json();if(data.error)throw Error('Wikisource no pudo completar la consulta.');
    cache.set(url,data);return data;
  }
  const genres={Romance:'amor',Misterio:'cuentos de misterio',Terror:'cuentos de terror',Fantasía:'cuentos fantásticos',Historia:'leyendas',Curiosidades:'cuentos',Motivación:'fábulas',Educativo:'fábulas'};
  async function search(topic,style){
    const lookup=async q=>(await wiki({list:'search',srsearch:q,srnamespace:'0',srlimit:'10',srprop:'snippet'})).query?.search||[];
    let rows=await lookup('"'+topic.replaceAll('"','')+'"'),related=false;
    if(!rows.length){rows=await lookup(topic);related=rows.length>0}
    if(!rows.length&&genres[style]&&genres[style]!==topic){rows=await lookup(genres[style]);related=true}
    const ideas=rows.map(p=>({id:'written-'+p.pageid,title:p.title,synopsis:'Fragmento del texto publicado: '+plain(p.snippet),
      pageId:p.pageid,sourceUrl:'https://es.wikisource.org/wiki/'+encodeURIComponent(p.title.replaceAll(' ','_')),sourceTitle:p.title,
      matchType:related?'related':'exact',matchReason:related?'No hay resultados exactos; coincide con el género elegido.':'',outline:'Texto publicado, sin reescritura con IA.',coverPrompt:''}));
    return {ideas,matchType:related?'related':'exact',sourceProvider:'Wikisource en español',sources:ideas.map(p=>({title:p.title,url:p.sourceUrl}))};
  }
  async function read(idea){
    if(idea.writtenText)return idea.writtenText;
    if(!Number.isInteger(idea.pageId)||idea.pageId<=0)throw Error('Selecciona un texto publicado.');
    const data=await wiki({action:'parse',pageid:String(idea.pageId),prop:'text',disableeditsection:'1',disabletoc:'1'});
    const text=plain(data.parse?.text||'');
    if(text.split(/\s+/).length<45)throw Error('Esta página es un índice o un texto demasiado corto. Abre la fuente y elige un capítulo, o pega su contenido.');
    if(text.length>100000)throw Error('La obra es muy larga. Abre la fuente y pega el capítulo o fragmento que quieras usar.');
    return text;
  }
  async function translate(text,language){
    if(language==='es')return text;
    if(!['en','fr','pt','it','de'].includes(language))throw Error('Selecciona el idioma original.');
    if(text.length>5000)throw Error('Traduce hasta 5.000 caracteres cada vez; el proveedor también aplica una cuota diaria.');
    const chunks=[];let part='';const encoder=new TextEncoder();
    for(const word of text.split(/\s+/)){
      if(encoder.encode(word).length>450)throw Error('El texto contiene una palabra o enlace demasiado largo.');
      const next=part?part+' '+word:word;
      if(encoder.encode(next).length>450){chunks.push(part);part=word}else part=next;
    }
    if(part)chunks.push(part);
    const result=[];
    for(const q of chunks){
      const response=await fetch('https://api.mymemory.translated.net/get?'+new URLSearchParams({q,langpair:language+'|es'}),{signal:AbortSignal.timeout(20000)});
      const data=await response.json();
      if(!response.ok||Number(data.responseStatus)!==200||data.quotaFinished||!data.responseData?.translatedText)throw Error('No se completó la traducción. MyMemory puede haber alcanzado su cuota diaria; el texto original sigue disponible.');
      // The provider may return encoded entities. Decode as inert text, never insert HTML.
      result.push(plain(data.responseData.translatedText));
    }
    return result.join(' ');
  }
  function scenes(text,duration,title){
    const count=duration===30?5:duration===60?8:12;
    const words=text.trim().split(/\s+/),budget=Math.floor(duration*2.1);
    let selected=words.slice(0,budget).join(' ');
    if(words.length>budget){const end=Math.max(selected.lastIndexOf('.'),selected.lastIndexOf('!'),selected.lastIndexOf('?'));if(end>selected.length*.65)selected=selected.slice(0,end+1)}
    const excerpt=selected.split(/\s+/);if(excerpt.length<count)throw Error('El texto es demasiado corto para la duración elegida.');
    let time=0;const list=Array.from({length:count},(_,i)=>{const seconds=Math.floor(duration/count)+(i<duration%count?1:0),scene={time,duration:seconds,text:excerpt.slice(Math.floor(i*excerpt.length/count),Math.floor((i+1)*excerpt.length/count)).join(' '),prompt:'Illustration for the published story '+title+'. Scene '+(i+1)+'. No text.'};time+=seconds;return scene});
    return {scenes:list,excerpt:words.length>excerpt.length,originalText:text};
  }
  window.facelessWrittenStories={search,read,translate,scenes};
})();
