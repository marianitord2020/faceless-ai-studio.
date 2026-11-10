import assert from 'node:assert/strict';
import {geminiScriptCall} from '../workers/script-generator.js';
const env={GEMINI_SCRIPT_API_KEY:'fixture-gemini',GROQ_API_KEY:'fixture-groq'};
let calls=[];
globalThis.fetch=async(url,options)=>{
 calls.push(url);
 if(url.includes('googleapis'))return new Response('{"error":{"message":"quota"}}',{status:429});
 const body=JSON.parse(options.body);
 assert.equal(options.headers.authorization,'Bearer fixture-groq');
 assert.equal(body.response_format.type,'json_object');
 assert.equal(body.model,'llama-3.3-70b-versatile');
 return Response.json({choices:[{message:{content:'{"ideas":[]}'},finish_reason:'stop'}]});
};
const result=await geminiScriptCall(env,'Devuelve JSON',{json:true});
assert.match(result.provider,/Groq/);assert.equal(calls.length,2);
for(const options of [{search:true},{url:true}]){
 calls=[];await assert.rejects(geminiScriptCall(env,'noticias de hoy',options),/quota/);
 assert.equal(calls.length,1,'Verified research must never fall back to plain text');
}
calls=[];await assert.rejects(geminiScriptCall({GEMINI_SCRIPT_API_KEY:'fixture'},'hola'),/quota/);assert.equal(calls.length,1);
globalThis.fetch=async()=>Response.json({candidates:[{content:{parts:[{text:'hola'}]}}]});
assert.match((await geminiScriptCall(env,'hola')).provider,/Gemini/);
globalThis.fetch=async()=>Response.json({choices:[{message:{content:'{}'},finish_reason:'length'}]});
await assert.rejects(geminiScriptCall({GROQ_API_KEY:'fixture'},'JSON',{json:true}),/incompleto/);
console.log('PASS: Gemini primary, Groq fallback on quota, private auth, no fabricated research, no fallback without key and truncated response rejection');
let hfCalls=0;
globalThis.fetch=async(url)=>{
 if(url.includes('googleapis'))return new Response('{"error":{"message":"quota"}}',{status:429});
 if(url.includes('groq'))return new Response('{}',{status:429});
 hfCalls++;assert.ok(url.startsWith('https://router.huggingface.co/'));
 return Response.json({choices:[{message:{content:'{"ideas":[]}'},finish_reason:'stop'}]});
};
const hfResult=await geminiScriptCall({...env,FREE_DAILY_ONLY:'false',ENABLE_HF_INFERENCE:'true',HF_API_KEY:'fixture-hf'},'JSON',{json:true});
assert.match(hfResult.provider,/Hugging Face/);assert.equal(hfCalls,1);
await assert.rejects(geminiScriptCall({...env,FREE_DAILY_ONLY:'true',ENABLE_HF_INFERENCE:'true',HF_API_KEY:'fixture-hf'},'JSON',{json:true}),/Groq/);assert.equal(hfCalls,1);
console.log('PASS: HF text fallback after Gemini and Groq quotas, blocked under daily-only policy');
