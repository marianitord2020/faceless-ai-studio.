import assert from 'node:assert/strict';
import {searchStock,importStock} from '../workers/stock-photos.js';
import worker from '../workers/ai-images-worker.js';
const id='11111111-1111-4111-8111-111111111111',env={APP_PASSCODE:'fixture-stock-private-code',PIXABAY_API_KEY:'private-pixabay-key',PEXELS_API_KEY:'private-pexels-key'};
const cache=new Map();globalThis.caches={default:{match:async req=>cache.get(req.url)?.clone(),put:async(req,r)=>cache.set(req.url,r.clone())}};
let calls=0,mode='normal';
globalThis.fetch=async(url,options={})=>{
 calls++;
 if(url.includes('/thumb/')){
  if(mode==='redirect')return new Response(null,{status:302,headers:{location:'https://127.0.0.1/private'}});
  if(mode==='large')return new Response('x',{headers:{'content-type':'image/jpeg','content-length':'9000000'}});
  return new Response(new Uint8Array([255,216,255,0,1,2]),{headers:{'content-type':'image/jpeg'}});
 }
 if(url.startsWith('https://api.openverse.org/'))return Response.json({results:[{id,title:'Beach',creator:'Test author',license:'by',license_version:'4.0',license_url:'https://creativecommons.org/licenses/by/4.0/',foreign_landing_url:'https://example.org/photo',url:'https://127.0.0.1/internal'},{id,title:'Restricted',license:'by-nc',foreign_landing_url:'https://example.org/other'}]});
 if(url.startsWith('https://pixabay.com/api/')){assert.match(url,/private-pixabay-key/);return Response.json({hits:[{id:5,tags:'beach',user:'Test',user_id:6,pageURL:'https://pixabay.com/photos/test-5/',previewURL:'https://cdn.pixabay.com/preview.jpg',webformatURL:'https://cdn.pixabay.com/photo.jpg'}]});}
 if(url.startsWith('https://api.pexels.com/')){assert.equal(options.headers.Authorization,'private-pexels-key');return Response.json({photos:[]});}
 throw Error('Unexpected URL '+url);
};
const found=await searchStock({query:'beach'},env);assert.equal(found.results.length,1);assert.equal(found.results[0].license,'by 4.0');assert.match(found.results[0].selection,/\./);assert.ok(!JSON.stringify(found).includes('127.0.0.1'));
const before=calls;await searchStock({query:'beach'},env);assert.equal(calls,before,'Cached searches do not call the provider again');
const chosen=await importStock({selection:found.results[0].selection},env);assert.match(chosen.dataURI,/^data:image\/jpeg/);assert.equal(chosen.credit.author,'Test author');
await assert.rejects(importStock({selection:found.results[0].selection+'tampered'},env),/selección|Selección/);
mode='redirect';await assert.rejects(importStock({selection:found.results[0].selection},env),/Redirección/);
mode='large';await assert.rejects(importStock({selection:found.results[0].selection},env),/8 MB/);mode='normal';
const pix=await searchStock({query:'playa',provider:'pixabay'},env);assert.equal(pix.results[0].provider,'pixabay');assert.ok(!JSON.stringify(pix).includes(env.PIXABAY_API_KEY));
await assert.rejects(searchStock({query:'playa',provider:'pixabay'},{APP_PASSCODE:env.APP_PASSCODE}),/PIXABAY_API_KEY/);
await assert.rejects(searchStock({query:'a'},env),/2 a 100/);
await searchStock({query:'playa',provider:'pexels'},env);
const request=pass=>new Request('https://example.com/stock/search',{method:'POST',headers:{origin:'https://marianitord2020.github.io','content-type':'application/json','x-app-token':pass},body:JSON.stringify({query:'beach'})});
assert.equal((await worker.fetch(request('bad'),env)).status,401);assert.equal((await worker.fetch(request(env.APP_PASSCODE),env)).status,200);
console.log('PASS: source search, 24h cache, license filters, signed imports, tamper/SSRF/size rejection, private keys and protected routes');
