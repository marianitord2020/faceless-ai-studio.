const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
let active;
class Worker {
 constructor(){active=this;this.terminated=false;}
 postMessage(message){this.message=message;}
 terminate(){this.terminated=true;}
}
class OfflineAudioContext {
 constructor(channels,length,rate){assert.equal(channels,1);assert.equal(rate,16000);this.destination={};}
 createBufferSource(){return {connect(){},start(){}};}
 async startRendering(){return {getChannelData(){return new Float32Array(32000);}};}
}
const window={Worker,OfflineAudioContext};
vm.runInNewContext(fs.readFileSync('scripts/local-speech.js','utf8'),{window,Worker,OfflineAudioContext,setTimeout,clearTimeout,Error});
(async()=>{
 const job=window.facelessRecognizeLocal({duration:2});
 await new Promise(setImmediate);
 await assert.rejects(window.facelessRecognizeLocal({duration:2}),/Ya se/);
 active.onmessage({data:{id:active.message.id+1,words:[]}});
 const words=[{word:'hola',start:0,end:1}];
 active.onmessage({data:{id:active.message.id,words}});
 assert.deepEqual(await job,words);
 const cancelled=window.facelessRecognizeLocal({duration:2});await new Promise(setImmediate);
 window.facelessCancelLocalSpeech();await assert.rejects(cancelled,/detenido/);assert.equal(active.terminated,true);
 const retry=window.facelessRecognizeLocal({duration:2});await new Promise(setImmediate);
 active.onerror();await assert.rejects(retry,/cargar/);
 console.log('PASS: audio resampling, single analysis, stale messages, cancellation, worker cleanup and retry');
})().catch(e=>{console.error(e);process.exitCode=1});
