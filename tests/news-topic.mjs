import assert from 'node:assert/strict';
import {searchRealNews,searchSubject,searchTerm,parseFeed,relatedMatches,selectSources} from '../workers/news-search.js';
import {sourceSummary} from '../workers/news-sources.js';
import {generateWikipediaIdeas} from '../workers/wiki-search.js';
assert.equal(searchSubject('Noticias de La Romana hoy'),'La Romana');
assert.equal(searchSubject('Noticias de IA hoy'),'IA');
assert.equal(searchSubject('Farándula reciente'),'Farándula');
assert.match(searchTerm('Noticias de turismo en Higüey hoy'),/turismo en \(Higuey OR Higüey\)/);
assert.equal(searchTerm('Noticias de La Romana hoy'),'La Romana');
const now=new Date().toUTCString(),old=new Date(Date.now()-86400000*10).toUTCString();
const xml=(title,date=now,url='https://www.diariolibre.com/actualidad/2026/11/09/noticia/1')=>'<rss><channel><item><title><![CDATA['+title+']]></title><link>'+url+'</link><pubDate>'+date+'</pubDate></item></channel></rss>';
const feed={name:'Diario Libre',url:'https://www.diariolibre.com/rss/actualidad.xml'};
assert.equal(parseFeed(xml('Turismo en Higüey crece con una nueva propuesta'),feed)[0].title,'Turismo en Higüey crece con una nueva propuesta');
assert.equal(parseFeed(xml('No aceptar enlaces externos',now,'https://evil.example/x'),feed).length,0);
assert.equal(parseFeed('<rss><item><title>Una noticia de Paraguay publicada hoy</title><link>https://www.diariolibre.com/x</link><description>Suceso en Paraguay. La entrada texto se publicó primero en El Nuevo Diario (República Dominicana).</description><pubDate>'+now+'</pubDate></item></rss>',feed)[0].description,'Suceso en Paraguay.');
const original=globalThis.fetch;let primaryCalls=0,requestedQuery;
globalThis.fetch=async url=>{
 if(String(url).includes('gdeltproject')){primaryCalls++;requestedQuery=new URL(url).searchParams.get('query');return new Response('',{status:429})}
 return new Response(xml('Turismo en Higüey crece con una nueva propuesta'),{headers:{'content-type':'application/xml'}});
};
let result=await searchRealNews('Noticias de turismo en Higüey hoy','Noticias',{});
assert.equal(primaryCalls,1);assert.match(requestedQuery,/turismo/);assert.match(requestedQuery,/Higuey/);
assert.equal(result.ideas.length,1);assert.equal(result.usedFallback,true);assert.equal(result.query,'Noticias de turismo en Higüey hoy');
assert.equal(result.ideas[0].sourceDateKind,'publication');
assert.equal(result.matchType,'exact');
assert.ok(sourceSummary().publishers>=22);
assert.ok(sourceSummary().dominicanPublishers>=14);
assert.ok(selectSources('Farándula hoy','Farándula').some(s=>s.name==='Más VIP'));
assert.ok(selectSources('Entretenimiento hoy','Entretenimiento').some(s=>s.name==='¡HOLA!'));
assert.ok(selectSources('Noticias de República Dominicana hoy','Noticias').every(s=>s.region==='RD'));
assert.ok(selectSources('Noticias de México hoy','Noticias').some(s=>s.region!=='RD'));
assert.ok(selectSources('Noticias hoy','Noticias').length<=14);
assert.match(requestedQuery,/sourcelang:spanish/);
const candidate=(title,age=0)=>({title,url:'https://example.test/news',description:'',date:new Date(Date.now()-age*86400000),publisher:'Fixture',provider:'Fixture',dateKind:'publication'});
let related=relatedMatches([candidate('Festival cultural abre sus puertas en Higüey'),candidate('Nueva inversión hotelera en Santiago'),candidate('Un partido de béisbol en Higüey')],'Turismo en Higüey hoy',true,3);
assert.equal(related.length,1);assert.match(related[0].title,/cultural/);assert.equal(related[0].matchType,'related');
related=relatedMatches([candidate('Shakira presenta su nuevo álbum'),candidate('Otra cantante anuncia su concierto')],'Shakira concierto hoy',true,3);
assert.equal(related.length,1);assert.match(related[0].title,/Shakira/);
related=relatedMatches([candidate('Turismo en Higüey crece con una nueva propuesta',2)],'Turismo en Higüey hoy',true,3);
assert.equal(related.length,1);assert.match(related[0].matchReason,/fecha ampliada/);
globalThis.fetch=async url=>String(url).includes('gdeltproject')?new Response('',{status:429}):new Response(xml('Festival cultural abre sus puertas en Higüey'));
const similar=await searchRealNews('Turismo en Higüey hoy','Noticias',{});
assert.equal(similar.matchType,'related');assert.equal(similar.exactMatchCount,0);assert.equal(similar.ideas[0].originalQuery,'Turismo en Higüey hoy');
globalThis.fetch=async url=>String(url).includes('gdeltproject')?new Response('',{status:429}):new Response(xml('Béisbol en Higüey tiene una nueva propuesta'));
await assert.rejects(()=>searchRealNews('Turismo en Higüey hoy','Noticias',{}),e=>e.httpStatus===422&&!e.message.includes('Béisbol'));
globalThis.fetch=async url=>String(url).includes('gdeltproject')?new Response('',{status:429}):new Response(xml('Turismo en Higüey crece con una nueva propuesta',old));
await assert.rejects(()=>searchRealNews('Turismo en Higüey hoy','Noticias',{}),e=>e.httpStatus===422);
globalThis.fetch=async()=>new Response('',{status:503});
await assert.rejects(()=>searchRealNews('Turismo en Higüey hoy','Noticias',{}),e=>e.httpStatus===503);
globalThis.fetch=original;
globalThis.fetch=async (url,options)=>{
 if(String(url).includes('wikipedia.org')){assert.match(options.headers['User-Agent'],/FacelessAIStudioBot\/.*github/);assert.equal(options.headers['Api-User-Agent'],options.headers['User-Agent']);}
 if(String(url).includes('wikipedia.org'))return Response.json({query:{pages:[
   {title:'Artículo incompleto',extract:'Corto',fullurl:'https://es.wikipedia.org/wiki/Corto'},
   {title:'Napoleón Bonaparte',extract:'Información documentada sobre Napoleón Bonaparte. '.repeat(5),fullurl:'https://es.wikipedia.org/wiki/Napoleón_Bonaparte'}]}});
 return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({ideas:[{sourceIndex:0,title:'La vida de Napoleón Bonaparte',synopsis:'Una propuesta documental basada en la vida de Napoleón Bonaparte.',outline:'Su vida documentada',coverPrompt:'A historical portrait'}]})}]}}]});
};
const documentary=await generateWikipediaIdeas('Napoleón Bonaparte','Historia',{GEMINI_TTS_API_KEY:'fixture-only'});
assert.match(documentary.ideas[0].sourceUrl,/Napole/);
globalThis.fetch=original;
console.log('PASS: nationwide/Spanish catalog, exact-first, labeled related topics, preserved places/names/dates, HTTP 429 fallback and source integrity');
