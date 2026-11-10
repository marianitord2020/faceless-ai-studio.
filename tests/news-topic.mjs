import assert from 'node:assert/strict';
import {searchRealNews,searchSubject,searchTerm,parseFeed} from '../workers/news-search.js';
import {generateWikipediaIdeas} from '../workers/wiki-search.js';
assert.equal(searchSubject('Noticias de La Romana hoy'),'La Romana');
assert.equal(searchSubject('Noticias de IA hoy'),'IA');
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
console.log('PASS: HTTP 429 fallback, complete topic, place names, short topics, source hosts, dates, no unrelated headlines, no invented results');
