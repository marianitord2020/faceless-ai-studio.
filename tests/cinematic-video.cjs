const assert=require('node:assert/strict');
const {camera,captionState}=require('../scripts/cinematic-video.js');
const timing=require('../scripts/media-timing.js');
for(const [w,h] of [[540,960],[960,540]])for(const [iw,ih] of [[1600,900],[600,1200],[800,800]])for(let scene=0;scene<6;scene++){
 const first=camera(w,h,iw,ih,0,scene),last=camera(w,h,iw,ih,1,scene);assert.notDeepEqual(first,last);
 for(let progress=0;progress<=1;progress+=.025){const r=camera(w,h,iw,ih,progress,scene);assert.ok(r.x<=0&&r.y<=0);assert.ok(r.x+r.width>=w-.001&&r.y+r.height>=h-.001);}
}
const p={scenes:[{time:0,duration:6,text:'Una historia con pausas reales.'}]};
const aligned=timing.align(p,[{word:'Una',start:.5,end:.8},{word:'historia',start:1,end:1.8},{word:'con',start:2.4,end:2.6},{word:'pausas',start:3,end:3.6},{word:'reales',start:4,end:4.6}],6);
assert.equal(captionState(aligned.subtitleCues,.1),null);
const active=captionState(aligned.subtitleCues,1.2);assert.equal(active.words[active.active].text,'historia');
assert.equal(captionState(aligned.subtitleCues,5),null);
assert.equal(captionState([{start:0,end:2,text:'Voz guardada'}],1.5).active,1);
assert.equal(p.scenes[0].text,'Una historia con pausas reales.');
console.log('PASS: motion fills portrait and landscape frames, alternating shots, speech-word highlights, pauses, legacy cues and unchanged script');
