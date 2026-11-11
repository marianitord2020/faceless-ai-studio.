const assert=require('node:assert/strict');
const exp=require('../scripts/video-export.js');
for(const height of [720,1080])for(const format of ['mp4','webm'])for(const aspect of ['9:16','16:9']){
 const p={exportHeight:height,exportFormat:format,format:aspect};const size=exp.dimensions(p);
 assert.equal(Math.min(size.width,size.height),height);assert.equal(size.width/size.height,aspect==='16:9'?16/9:9/16);assert.equal(exp.settings(p).format,format);
}
for(const height of [720,1080]){
 const vertical={width:height,height:height*16/9};
 assert.deepEqual(exp.dimensions({exportHeight:height,format:'9:16',exportDestination:'facebook'}),{width:height,height});
 for(const exportDestination of ['tiktok','instagram','shorts'])
  assert.deepEqual(exp.dimensions({exportHeight:height,format:'16:9',exportDestination}),vertical);
 assert.deepEqual(exp.dimensions({exportHeight:height,format:'9:16',exportDestination:'youtube'}),{width:height*16/9,height});
}
assert.deepEqual(exp.dimensions({format:'9:16',exportDestination:'facebook'},false),{width:540,height:960});
assert.deepEqual(exp.dimensions({exportHeight:360,format:'9:16'}),{width:1080,height:1920});
assert.deepEqual(exp.dimensions({format:'9:16'},false),{width:540,height:960});
assert.equal(exp.mime('mp4',t=>t==='video/mp4'),'');
assert.ok(exp.mime('mp4',t=>t.includes('avc1')).includes('avc1'));
assert.equal(exp.mime('webm',()=>false),'');
assert.ok(exp.mime('webm',t=>t.includes('vp8')).includes('vp8'));
assert.equal(exp.mime('mp4',t=>t.startsWith('video/webm')),'');
require('../scripts/media-timing.js');
const timing=globalThis.FacelessTiming;
const p={scenes:[{text:'',prompt:'Foto A',stockCredit:{author:'A'}},{text:'',prompt:'Foto B'}]};
const words=[{word:'Hola',start:.2,end:.5},{word:'Mariano.',start:.6,end:1.1},{word:'Otra',start:2,end:2.4},{word:'escena.',start:2.5,end:3}];
const result=timing.transcribed(p,words,4);
assert.equal(result.scenes.length,2);assert.equal(result.scenes[1].time,2);assert.equal(result.scenes[0].stockCredit.author,'A');assert.equal(result.scenes[1].prompt,'Foto B');
assert.equal(result.subtitleTextSignature,timing.signature(result));assert.equal(result.audioAlignment.method,'speech');assert.equal(result.narration,'Hola Mariano.\nOtra escena.');
assert.equal(result.scenes.reduce((sum,s)=>sum+s.duration,0),4);
assert.throws(()=>timing.transcribed(p,[],4),/No se reconoció/);
assert.throws(()=>timing.transcribed(p,[words[2],words[0]],4),/fuera de orden/);
console.log('PASS: real HD dimensions, native container choice, silent previews, speech transcription and retained photo metadata');
