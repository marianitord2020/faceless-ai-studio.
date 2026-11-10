import assert from 'node:assert/strict';
import {imageRouter,hordeStart,hordePoll} from '../workers/free-image-providers.js';
import worker from '../workers/ai-images-worker.js';
const uuid='11111111-1111-4111-8111-111111111111',b64=btoa('RIFF'+'.'.repeat(150));
let calls=[],paid=false,done=false;
globalThis.fetch=async(url,o={})=>{
 calls.push({url,o});
 if(url.includes('/v3/models'))return Response.json([{id:'Tongyi-MAI/Z-Image-Turbo:free',pricing:{min:paid?1:0,max:paid?1:0}}]);
 if(url.includes('imagerouter.io/v1/')){assert.equal(o.headers.authorization,'Bearer fixture');assert.equal(JSON.parse(o.body).response_format,'b64_ephemeral');return Response.json({data:[{b64_json:b64}]});}
 if(url.endsWith('/async')){const body=JSON.parse(o.body);assert.equal(body.r2,false);assert.equal(body.shared,false);assert.equal(o.headers.apikey,'0000000000');return Response.json({id:uuid},{status:202});}
 if(url.includes('/check/'))return Response.json({done,wait_time:15});
 if(url.includes('/status/'))return Response.json({generations:[{img:b64,model:'fixture'}]});
 throw Error('Unexpected URL');
};
await assert.rejects(imageRouter({},'landscape','9:16'),/Falta/);assert.equal(calls.length,0);
await assert.rejects(imageRouter({IMAGEROUTER_API_KEY:'fixture',IMAGEROUTER_MODEL:'paid/model'},'landscape','9:16'),/gratuitos/);assert.equal(calls.length,0);
assert.match((await imageRouter({IMAGEROUTER_API_KEY:'fixture'},'landscape','9:16')).dataURI,/^data:image\/webp/);
paid=true;const before=calls.length;await assert.rejects(imageRouter({IMAGEROUTER_API_KEY:'fixture'},'landscape','9:16'),/precio cero/);assert.equal(calls.length,before+1);
const job=await hordeStart({},'tropical landscape','9:16');assert.equal(job.generationId,'horde:'+uuid);
assert.equal((await hordePoll(job.generationId)).pending,true);done=true;
assert.match((await hordePoll(job.generationId)).dataURI,/^data:image\/webp/);
assert.equal((await hordePoll(job.generationId,true)).cancelled,true);assert.equal(calls.at(-1).o.method,'DELETE');
await assert.rejects(hordePoll('horde:https://malicious'),/no válido/);
// Quota errors from the existing Cloudflare models must reach independent Horde.
const env={APP_PASSCODE:'fixture-private-passcode',FREE_DAILY_ONLY:'true',ENABLE_AI_HORDE:'true',AI:{run:async()=>{throw Error('daily quota exhausted');}}};
const request=data=>new Request('https://example.com/images',{method:'POST',headers:{origin:'https://marianitord2020.github.io','content-type':'application/json','x-app-token':env.APP_PASSCODE},body:JSON.stringify({prompt:'A tropical landscape',format:'9:16',...data})});
const response=await worker.fetch(request({}),env);assert.equal(response.status,200);assert.equal((await response.json()).generationId,job.generationId);
const poll=await worker.fetch(request({generationId:job.generationId}),env);assert.equal(poll.status,200);assert.match((await poll.json()).provider,/AI Horde/);
console.log('PASS: free catalog enforcement, missing key, anonymous Horde, async polling/cancellation, unsafe ID rejection and Cloudflare quota fallback');
