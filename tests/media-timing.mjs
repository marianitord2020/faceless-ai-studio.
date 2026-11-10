import assert from 'node:assert/strict';
import '../scripts/media-timing.js';
const {align,estimated,cues}=globalThis.FacelessTiming;
const p={duration:12,scenes:[{time:0,duration:4,text:'Hola esta es la primera escena.'},{time:4,duration:4,text:'Ahora contamos una historia sobre Lola.'},{time:8,duration:4,text:'Al final todos regresan a casa.'}]};
const speech=p.scenes.flatMap((s,i)=>s.text.split(' ').map((word,j)=>({word,start:[.5,3,5][i]+j*.2,end:[.5,3,5][i]+j*.2+.15})));
const aligned=align(p,speech,8);
assert.equal(aligned.scenes[1].time,3);assert.equal(aligned.scenes[2].time,5);assert.equal(aligned.duration,8);
assert.equal(aligned.scenes.reduce((n,s)=>n+s.duration,0),8);
assert.deepEqual(aligned.scenes.map(s=>s.text),p.scenes.map(s=>s.text));
assert.equal(aligned.subtitleCues.map(s=>s.text).join(' '),p.scenes.map(s=>s.text).join(' '));
assert.equal(aligned.audioAlignment.coverage,100);
assert.throws(()=>align(p,[{word:'No',start:0,end:1},{word:'coincide',start:1,end:2}],8),/no coincide/);
assert.equal(p.duration,12);assert.equal(estimated(p,7.3).scenes.reduce((n,s)=>n+s.duration,0),7.3);
const edited={...p,...aligned,scenes:aligned.scenes.map(s=>({...s,text:s.text+' Texto nuevo.'}))};
assert.ok(cues(edited).map(c=>c.text).join(' ').includes('Texto nuevo.'));
const repeated={duration:4,scenes:[{time:0,duration:4,text:'Lola volvió. Lola llamó. Lola salió.'}]};
const repeatedWords=['Lola','volvió','Lola','llamó','Lola','salió'].map((word,i)=>({word,start:i*.5,end:i*.5+.3}));
assert.equal(align(repeated,repeatedWords,4).subtitleCues.map(c=>c.text).join(' '),repeated.scenes[0].text);
console.log('PASS: speech anchors, pauses, scene and caption timing, preserved script, repeated words, mismatch rejection and stale-caption invalidation');

// Deliberately unequal spoken clips must replace the old fixed 4-second slots.
const natural=globalThis.FacelessTiming.fromSegments(p,[2,7,3],1.25);
assert.deepEqual(natural.scenes.map(s=>s.time),[0,1.6,7.199999999999999]);
assert.ok(Math.abs(natural.duration-9.6)<1e-9);
assert.deepEqual(natural.scenes.map(s=>s.text),p.scenes.map(s=>s.text));
assert.equal(globalThis.FacelessTiming.sceneAt(natural,1.59),0);
assert.equal(globalThis.FacelessTiming.sceneAt(natural,1.6),1);
assert.equal(globalThis.FacelessTiming.sceneAt(natural,natural.duration),2);
assert.equal(globalThis.FacelessTiming.sceneAt(natural,999),2);
for(const cue of natural.subtitleCues)for(const word of cue.words){
 const i=globalThis.FacelessTiming.sceneAt(natural,word.start+1e-10);
 assert.ok(natural.scenes[i].text.includes(word.text));
 assert.ok(word.end<=natural.scenes[i].time+natural.scenes[i].duration+1e-9);
}
assert.equal(p.duration,12);
assert.throws(()=>globalThis.FacelessTiming.fromSegments(p,[2,0,3]),/válido/);
assert.throws(()=>globalThis.FacelessTiming.fromSegments(p,[2,7,3],0),/válido/);
assert.throws(()=>globalThis.FacelessTiming.fromSegments(p,[201,201,201]),/10 minutos/);
console.log('PASS: decoded speech sets scene cuts, chosen speed, total duration and caption bounds without modifying source');
