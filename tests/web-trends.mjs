import assert from 'node:assert/strict';
import {searchRealNews,requestedTokens,relevant} from '../workers/news-search.js';
const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santo_Domingo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
assert.deepEqual(requestedTokens('Bullin 47 viral hoy'),['bulin','47']);
assert.ok(relevant({title:'Bulin 47 presenta una canción',url:'https://example.com'},requestedTokens('Bullin 47 tendencia')));
assert.ok(relevant({title:'Santiago Matías anuncia programa',url:'https://example.com'},requestedTokens('Alofoke hoy')));
const seen=[];
globalThis.fetch=async(url,options)=>{
 if(!String(url).includes('googleapis'))return new Response('',{status:503});
 const body=JSON.parse(options.body);seen.push(body);
 if(body.tools)return Response.json({candidates:[{content:{parts:[{text:'Bulin 47 anunció una canción en su página pública. Publicado '+date+'.'}]},groundingMetadata:{webSearchQueries:['Bulin 47 hoy'],groundingChunks:[{web:{title:'Canal oficial del artista',uri:'https://www.youtube.com/watch?v=fixture'}}]}}]});
 return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({items:[{title:'Bulin 47 anuncia una canción en su canal',summary:'El artista anunció una canción en una publicación pública de su canal oficial.',date,sourceIndex:0},{title:'Noticia sin fuente verificable',summary:'Este resultado no debe aparecer en las propuestas.',date,sourceIndex:99}]})}]}}]});
};
const result=await searchRealNews('Bullin 47 viral hoy','Farándula',{GEMINI_API_KEY:'fixture'});
assert.equal(result.ideas.length,1);assert.match(result.ideas[0].sourceUrl,/youtube.com/);assert.match(result.sourceProvider,/Google Search/);
assert.match(seen[0].contents[0].parts[0].text,/No te limites a periódicos/);
for(const domain of ['facebook.com','tiktok.com','instagram.com','youtube.com']){
 assert.ok(seen[0].contents[0].parts[0].text.includes('site:'+domain));
}
assert.match(result.ideas[0].synopsis,/anunció una canción/);
console.log('PASS: public Spanish web and creator sources, name variants, grounded source validation, dated relevant proposals and publisher outage fallback');
