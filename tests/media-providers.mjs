import assert from 'node:assert/strict';
import {withFallback,deepgramAnalyze,hfAnalyze,easyVoice,hfImage,hfSpeech,hfText,analyzeAudio} from '../workers/media-providers.js';
import worker from '../workers/ai-images-worker.js';
const env={FREE_DAILY_ONLY:'false',ENABLE_HF_INFERENCE:'true',ENABLE_DEEPGRAM_TRIAL:'true',HF_API_KEY:'fixture-hf',DEEPGRAM_API_KEY:'fixture-dg',EASYVOICE_API_KEY:'fixture-ev'};
let calls=[];
globalThis.fetch=async(url,options)=>{calls.push(url);throw Error('Should not call upstream in daily-only mode');};
const strict={...env,FREE_DAILY_ONLY:'true'};
await assert.rejects(deepgramAnalyze(strict,new Uint8Array(10),'audio/wav',2),/cuota diaria/);
await assert.rejects(hfText(strict,'hola'),/desactivado/);
await assert.rejects(hfImage(strict,'foto','9:16'),/desactivado/);
await assert.rejects(hfSpeech(strict,'hola'),/desactivado/);
await assert.rejects(analyzeAudio(strict,new Uint8Array(10),'audio/wav',2),/Whisper local/);
await assert.rejects(easyVoice(env,'Hola','es'),/español/);assert.equal(calls.length,0);
globalThis.fetch=async(url,options)=>{
 calls.push(url);
 if(url.includes('deepgram')){assert.equal(options.headers.authorization,'Token fixture-dg');return Response.json({results:{channels:[{alternatives:[{transcript:'Hola mundo',words:[{word:'hola',punctuated_word:'Hola',start:0,end:.4},{word:'mundo',start:.5,end:1}]}]}]}});}
 if(url.includes('easyvoice')){const body=JSON.parse(options.body);assert.equal(body.voice,'af_aoede');assert.equal(body.response_format,'mp3');return new Response(new Uint8Array(1100),{headers:{'content-type':'audio/mpeg'}});}
 assert.equal(options.headers.authorization,'Bearer fixture-hf');return Response.json({text:'Hola mundo',chunks:[{text:'Hola mundo',timestamp:[0,1]}]});
};
const dg=await deepgramAnalyze(env,new Uint8Array(10),'audio/wav',2);assert.equal(dg.granularity,'word');assert.equal(dg.words.length,2);
const hf=await hfAnalyze(env,new Uint8Array(10),2);assert.equal(hf.granularity,'phrase');assert.equal(hf.words.length,1);assert.equal(hf.words[0].word,'Hola mundo');
const voice=await easyVoice(env,'Hello world','en');assert.match(voice.dataURI,/^data:audio\/mpeg;base64,/);
let fallbackCalls=0;
assert.equal(await withFallback([['Primary',async()=>{const e=Error('quota');e.httpStatus=429;throw e}],['Backup',async()=>{fallbackCalls++;return 'ok'}]]),'ok');assert.equal(fallbackCalls,1);
await assert.rejects(withFallback([['Primary',async()=>{const e=Error('bad input');e.httpStatus=400;throw e}],['Backup',async()=>{fallbackCalls++;}]]),/bad input/);assert.equal(fallbackCalls,1);
// Reject unauthorized requests before reading uploads or calling a provider.
const req=new Request('https://example.com/analyze',{method:'POST',headers:{origin:'https://marianitord2020.github.io','x-app-token':'wrong','content-type':'audio/wav'},body:new Uint8Array(1)});
assert.equal((await worker.fetch(req,{...env,APP_PASSCODE:'fixture-private-passcode'})).status,401);
console.log('PASS: daily-only cost gates, Deepgram word timestamps, HF phrase integrity, EasyVoice free catalog, binary audio, quota fallback and protected upload route');
const wav=new Uint8Array(32044),v=new DataView(wav.buffer),tag=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
tag(0,'RIFF');v.setUint32(4,wav.length-8,true);tag(8,'WAVE');tag(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);tag(36,'data');v.setUint32(40,32000,true);
const makeReq=(bytes=wav)=>new Request('https://example.com/analyze',{method:'POST',headers:{origin:'https://marianitord2020.github.io','x-app-token':'fixture-private-passcode','content-type':'audio/wav'},body:bytes});
globalThis.fetch=async(url)=>{
 if(url.includes('deepgram'))return new Response('quota',{status:429});
 return Response.json({text:'hola',chunks:[{text:'hola',timestamp:[.1,.8]}]});
};
const analyzed=await worker.fetch(makeReq(),{...env,APP_PASSCODE:'fixture-private-passcode'});
assert.equal(analyzed.status,200);assert.equal((await analyzed.json()).granularity,'phrase');
const badWav=wav.slice();badWav[0]=0;
assert.equal((await worker.fetch(makeReq(badWav),{...env,APP_PASSCODE:'fixture-private-passcode'})).status,400);
assert.equal((await worker.fetch(makeReq(),{...strict,APP_PASSCODE:'fixture-private-passcode'})).status,503);
console.log('PASS: protected full-file WAV route, Deepgram quota to HF fallback, malformed file rejection and daily-only server policy');
