/* Operator-only live checks. Never log credentials or image contents. */
import {searchStock,importStock} from '../workers/stock-photos.js';
import {hordeStart,hordePoll} from '../workers/free-image-providers.js';
const env={APP_PASSCODE:process.env.APP_PASSCODE||'local-test-signing-code',PIXABAY_API_KEY:process.env.PIXABAY_API_KEY,PEXELS_API_KEY:process.env.PEXELS_API_KEY};
for(const provider of ['pixabay','wikimedia','openverse','pexels']){
 if(provider==='pixabay'&&!env.PIXABAY_API_KEY||provider==='pexels'&&!env.PEXELS_API_KEY){console.log('IMAGE_SERVICE '+JSON.stringify({provider,status:'missing_key'}));continue;}
 try{
  const result=await searchStock({query:provider==='pixabay'?'playa':'beach',provider},env);
  if(result.results[0]?.provider!==provider){console.log('IMAGE_SERVICE '+JSON.stringify({provider,status:'fallback_only',actualProvider:result.results[0]?.provider||'none'}));continue;}
  let found=false;
  for(const photo of result.results.slice(0,3)){try{const image=await importStock({selection:photo.selection},env);if(image.dataURI?.length>500){console.log('IMAGE_SERVICE '+JSON.stringify({provider,status:'ok',search:true,download:true}));found=true;break;}}catch{}}
  if(!found)console.log('IMAGE_SERVICE '+JSON.stringify({provider,status:'download_failed',results:result.results.length}));
 }catch(error){console.log('IMAGE_SERVICE '+JSON.stringify({provider,status:'failed',httpStatus:error.httpStatus||0}));}
}
// Verify the deployed image pipeline using the private application code.
if(process.env.APP_PASSCODE){
 try{
  const r=await fetch('https://faceless-images.marianitord2020.workers.dev/images',{method:'POST',headers:{origin:'https://marianitord2020.github.io','content-type':'application/json','x-app-token':process.env.APP_PASSCODE},body:JSON.stringify({prompt:'A scenic tropical garden in daylight, cinematic photograph, no text',format:'9:16'}),signal:AbortSignal.timeout(100000)});
  const d=await r.json();console.log('IMAGE_SERVICE '+JSON.stringify({provider:'deployed_generator',status:r.ok?(d.dataURI?'ok':d.pending?'queued':'invalid'):'failed',actualProvider:d.provider||'',httpStatus:r.status}));
  if(d.generationId?.startsWith('horde:'))await hordePoll(d.generationId,true).catch(()=>{});
 }catch{console.log('IMAGE_SERVICE '+JSON.stringify({provider:'deployed_generator',status:'connection_failed'}));}
}
let job;
try{
 job=await hordeStart({AI_HORDE_API_KEY:process.env.AI_HORDE_API_KEY},'A watercolor tropical garden, sunlight, no text','9:16');
 let generated=false;
 for(let n=0;n<18;n++){await new Promise(r=>setTimeout(r,5000));const d=await hordePoll(job.generationId);if(d.dataURI){generated=true;break;}}
 console.log('IMAGE_SERVICE '+JSON.stringify({provider:'ai_horde',status:generated?'ok':'queued',generation:generated}));
}catch(error){console.log('IMAGE_SERVICE '+JSON.stringify({provider:'ai_horde',status:'failed',httpStatus:error.httpStatus||0}));}
finally{if(job)await hordePoll(job.generationId,true).catch(()=>{});}
