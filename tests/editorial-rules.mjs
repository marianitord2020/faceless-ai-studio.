import assert from 'node:assert/strict';
import {generateVerifiedScript} from '../workers/script-generator.js';
const requests=[];
globalThis.fetch=async(url,options)=>{
 const body=JSON.parse(options.body);requests.push(body);
 if(body.tools)return Response.json({candidates:[{content:{parts:[{text:'Hecho confirmado: un festival fue anunciado en Higüey.'}]},urlContextMetadata:{urlMetadata:[{urlRetrievalStatus:'URL_RETRIEVAL_STATUS_SUCCESS'}]}}]});
 return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({title:'Un nuevo encuentro cultural en Higüey',scenes:Array.from({length:5},()=>({text:'El festival anunciado abre una nueva oportunidad para encontrarse con la cultura.',prompt:'Ilustración de un escenario cultural, no una fotografía real del festival.'}))})}]}}]});
};
for(const style of ['Noticias','Farándula','Entretenimiento']){
 requests.length=0;
 const result=await generateVerifiedScript({topic:'Festival cultural en Higüey',style,mode:'ficcion',idea:{title:'Titular original de la fuente',synopsis:'Un festival cultural anunciado en Higüey.',sourceUrl:'https://example.com/festival'}},{GEMINI_API_KEY:'fixture'});
 assert.equal(result.mode,'noticias');assert.equal(requests.length,2);
 assert.equal(result.title,'Un nuevo encuentro cultural en Higüey');assert.equal(result.sources[0].url,'https://example.com/festival');
 const prompt=requests[1].contents[0].parts[0].text;
 assert.match(prompt,/ORIGINALIDAD EDITORIAL/);assert.match(prompt,/No copies párrafos/);assert.match(prompt,/rumor no es un hecho confirmado/);assert.match(prompt,/ilustración o recreación/);
}
requests.length=0;
const fiction=await generateVerifiedScript({topic:'Una casa misteriosa en Higüey',style:'Terror',mode:'ficcion',idea:{title:'La casa',synopsis:'Una joven descubre una puerta que no existía.'}},{GEMINI_API_KEY:'fixture'});
assert.equal(fiction.mode,'ficcion');assert.equal(requests.length,1);assert.equal(fiction.sources.length,0);
assert.equal(requests[0].generationConfig.temperature,0.85);
assert.match(requests[0].contents[0].parts[0].text,/puedes inventar acciones, diálogos y giros/);
assert.doesNotMatch(requests[0].contents[0].parts[0].text,/ORIGINALIDAD EDITORIAL/);
console.log('PASS: news, celebrity and entertainment verify sources with original storytelling; fiction retains imagination and selected synopsis');
