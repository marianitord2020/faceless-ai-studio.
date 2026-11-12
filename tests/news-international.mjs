import assert from 'node:assert/strict';
import {regionForQuery,SPANISH_NEWS_REGIONS,regionDate} from '../workers/news-geography.js';
import {searchTerm,searchSubject,selectSources,searchRealNews} from '../workers/news-search.js';
import {NEWS_SOURCES,sourceSummary} from '../workers/news-sources.js';

assert.ok(SPANISH_NEWS_REGIONS.length>=21,'Cubrir países hispanohablantes, incluyendo Guinea Ecuatorial y Puerto Rico');
for(const [query,code] of [
 ['Noticias de México hoy','MX'],
 ['Noticias de Bogotá hoy','CO'],
 ['Últimas noticias del Perú','PE'],
 ['Noticias de Buenos Aires hoy','AR'],
 ['Noticias en Chile hoy','CL'],
 ['Noticias de Madrid hoy','ES'],
 ['Noticias en Guatemala','GT'],
 ['Noticias de Tegucigalpa','HN'],
 ['Noticias de El Salvador','SV'],
 ['Noticias de Nicaragua','NI'],
 ['Noticias de Panamá','PA'],
 ['Noticias de Asunción Paraguay','PY'],
 ['Noticias de Costa Rica','CR'],
 ['Noticias de La Habana','CU'],
 ['Noticias de Puerto Rico','PR'],
 ['Noticias de Caracas','VE'],
 ['Noticias de Quito','EC'],
 ['Noticias de Bolivia','BO'],
 ['Noticias de Uruguay','UY'],
 ['Noticias de Higüey hoy','DO'],
 ['Noticias de Malabo Guinea Ecuatorial','GQ']
]){
 assert.equal(regionForQuery(query)?.code,code,'País incorrecto: '+query);
}
assert.equal(regionForQuery('Noticias de Santiago hoy'),null,'No suponer país en ciudades ambiguas');
assert.equal(regionForQuery('Noticias de México y Argentina'),null,'Consulta multinacional no se debe restringir');
assert.equal(regionForQuery('Noticias hoy'),null,'No imponer República Dominicana en búsquedas generales');
assert.doesNotMatch(searchTerm('Noticias hoy'),/República Dominicana/i);
assert.match(searchTerm('Noticias de México hoy'),/México/);
assert.equal(searchSubject('Noticias de Colombia hoy'),'Colombia');
assert.ok(selectSources('Noticias de México hoy','Noticias').every(source=>source.region!=='RD'||selectSources('Noticias de México hoy','Noticias').some(x=>x.region==='global')),'No privilegiar medios de RD en México');
assert.ok(selectSources('Noticias de Chile hoy','Noticias').some(source=>source.region==='CL'));
assert.ok(selectSources('Noticias de Uruguay hoy','Noticias').some(source=>source.region==='UY'));
assert.ok(selectSources('Noticias de Panamá hoy','Noticias').some(source=>source.region==='PA'));
assert.ok(selectSources('Farándula hoy','Farándula').some(source=>source.name==='Más VIP'));
assert.ok(selectSources('Entretenimiento hoy','Entretenimiento').some(source=>source.name==='¡HOLA!'));
const broad=selectSources('Noticias hoy','Noticias');
assert.ok(new Set(broad.map(s=>s.region)).size>=6,'La búsqueda general debe abarcar medios de países distintos');
assert.ok(broad.filter(x=>x.region==='RD').length<=3,'No dominar catálogo general con República Dominicana');
assert.equal(broad.length,14);
assert.ok(sourceSummary().regions.includes('CL')&&sourceSummary().regions.includes('UY')&&sourceSummary().regions.includes('PA'));
assert.ok(NEWS_SOURCES.some(s=>s.region==='CL'));
const when=new Date('2026-11-13T02:15:00Z');
assert.equal(regionDate(when,regionForQuery('Perú')),'2026-11-12');
assert.equal(regionDate(when,regionForQuery('España')),'2026-11-13');
// Test real selection path with mock GDELT response; no API keys or external requests.
const original=globalThis.fetch;
const date=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
const mockArticle={title:'México presenta un programa de educación para las escuelas',url:'https://ejemplo.mx/mexico/educacion',seendate:date,domain:'ejemplo.mx'};
let gdeltQuery='';
globalThis.fetch=async url=>{
 if(String(url).includes('gdeltproject.org')){
  gdeltQuery=new URL(url).searchParams.get('query');
  return Response.json({articles:[mockArticle]});
 }
 return new Response('',{status:404});
};
try{
 const news=await searchRealNews('Noticias de México esta semana','Noticias',{});
 assert.equal(news.geography,'México');
 assert.equal(news.sourceCoverage.targetCountry,'México');
 assert.equal(news.ideas[0].matchType,'exact');
 assert.match(gdeltQuery,/México/);
 assert.match(gdeltQuery,/sourcelang:spanish/);
 const general=await searchRealNews('Noticias hoy','Noticias',{});
 assert.equal(general.geography,'Países de habla hispana');
 assert.match(gdeltQuery,/noticias OR actualidad/);
}finally{globalThis.fetch=original;}
console.log('PASS: 21 Spanish-speaking regions, country/city recognition, ambiguous places, global default, diversified publishers, local dates, and GDELT filters');
