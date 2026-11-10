import assert from 'node:assert/strict';
import {generateCoverIdeas} from '../workers/ideas-generator.js';
import {generateVerifiedScript} from '../workers/script-generator.js';
const prompts=[];
globalThis.fetch=async(url,options)=>{
 assert.ok(String(url).startsWith('https://generativelanguage.googleapis.com/'));
 const body=JSON.parse(options.body);prompts.push(body.contents[0].parts[0].text);
 const text=prompts.length===1?JSON.stringify({ideas:Array.from({length:10},(_,i)=>({title:'La casa de los fantasmas '+i,synopsis:'Una historia sobre la casa abandonada en La Romana y los misterios que guarda.',outline:'Llegada, misterio y revelación',coverPrompt:'An abandoned house in La Romana'}))}):JSON.stringify({title:'La casa',scenes:Array.from({length:5},()=>({text:'La casa abandonada de La Romana guardaba una presencia que nadie podía explicar.',prompt:'A clearly fictional ghost in an abandoned house'}))});
 return new Response(JSON.stringify({candidates:[{content:{parts:[{text}]}}]}),{headers:{'content-type':'application/json'}});
};
const input={topic:'Una casa abandonada en La Romana',style:'Terror',mode:'fiction',subcategory:'Fantasmas'};
const result=await generateCoverIdeas(input,{GEMINI_TTS_API_KEY:'fixture-key'});
assert.equal(result.query,input.topic);assert.equal(result.subcategory,'Fantasmas');assert.match(prompts[0],/SUBCATEGORÍA ELEGIDA: "Fantasmas"/);assert.ok(prompts[0].includes(JSON.stringify(input.topic)));
await generateVerifiedScript({...input,mode:'ficcion',duration:30},{GEMINI_TTS_API_KEY:'fixture-key'});
assert.match(prompts[1],/SUBCATEGORÍA SOLICITADA: "Fantasmas"/);assert.ok(prompts[1].includes(JSON.stringify(input.topic)));
console.log('PASS: selected subcategory reaches idea and script prompts without replacing the literal topic');
