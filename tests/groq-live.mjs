/* Run only in CI with private credentials. Never print API responses or keys. */
import assert from 'node:assert/strict';
import {generateVerifiedScript} from '../workers/script-generator.js';
const key=process.env.GROQ_API_KEY;
if(!key){console.log('GROQ_LIVE_PENDING: falta GROQ_API_KEY en GitHub Actions Secrets.');process.exit(0);}
const input={topic:'Un cuento ficticio sobre una niña que descubre un jardín luminoso',mode:'ficcion',duration:30,style:'Fantasía',platform:'TikTok'};
try{
 // Deliberately omit Gemini keys to exercise the real application fallback.
 const result=await generateVerifiedScript(input,{GROQ_API_KEY:key});
 assert.ok(result.provider.startsWith('Groq '));assert.equal(result.scenes.length,5);
 assert.ok(result.scenes.every(s=>s.text.length>=12&&s.prompt.length>=10));
 console.log('GROQ_LIVE_OK: respaldo real validado; 5 escenas en español; '+result.provider);
 if(process.env.APP_PASSCODE){
  const response=await fetch('https://faceless-images.marianitord2020.workers.dev/script',{
   method:'POST',headers:{origin:'https://marianitord2020.github.io','content-type':'application/json','x-app-token':process.env.APP_PASSCODE},
   body:JSON.stringify(input),signal:AbortSignal.timeout(120000)
  });
  if(!response.ok){console.error('GROQ_DEPLOYED_FAILED: la ruta publicada respondió HTTP '+response.status);process.exit(1);}
  const project=await response.json();assert.equal(project.scenes?.length,5);assert.match(project.provider,/^(Gemini|Groq) /);
  console.log('TEXT_DEPLOYED_OK: ruta privada publicada generó 5 escenas; proveedor '+project.provider);
 }
}catch(error){
 const status=Number(error.httpStatus)||0;
 console.error('GROQ_LIVE_FAILED: '+(status?'HTTP '+status:'generación, conexión o validación fallida')+'. Revisa la clave, los límites y los permisos. No se publican credenciales ni respuestas.');
 process.exitCode=1;
}
