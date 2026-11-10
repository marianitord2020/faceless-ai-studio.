const assert=require('node:assert/strict'),edit=require('../scripts/scene-edit.js'),timing=require('../scripts/media-timing.js');
const p={duration:12,scenes:[{time:0,duration:4,text:'Primera frase.'},{time:4,duration:4,text:'Segunda frase.'},{time:8,duration:4,text:'Tercera frase.'}]};
const original=timing.cues(p);edit.bounds(p,1,3,9);
assert.equal(p.scenes.reduce((sum,s)=>sum+s.duration,0),12);assert.deepEqual(p.scenes.map(s=>[s.time,s.duration]),[[0,3],[3,6],[9,3]]);
const before=JSON.stringify(p);assert.throws(()=>edit.bounds(p,1,.02,11.99));assert.equal(JSON.stringify(p),before);
p.subtitleCues=original;p.subtitleTextSignature=timing.signature(p);
edit.caption(p,1,'Texto corregido.',timing);assert.equal(p.subtitleCues[1].text,'Texto corregido.');assert.equal(p.subtitleCues[1].start,original[1].start);assert.equal(p.subtitleCues[1].end,original[1].end);assert.equal(p.subtitleCues[0].text,original[0].text);assert.equal(p.subtitleCues[2].text,original[2].text);assert.equal(p.audioAlignment.method,'manual');assert.equal(p.subtitleTextSignature,timing.signature(p));
assert.equal(edit.volume({}),1);assert.equal(edit.volume({audioVolume:0}),0);assert.equal(edit.volume({audioVolume:2}),1);assert.equal(edit.volume({audioVolume:.35}),.35);
const cinema=require('../scripts/cinematic-video.js');assert.equal(Object.keys(cinema.captionStyles).length,8);for(const theme of Object.values(cinema.captionStyles)){assert.ok(theme.name);assert.ok(theme.text);}
console.log('PASS: adjacent scene cuts preserve duration, invalid edits are atomic, caption corrections preserve timestamps and neighbors, volume clamps, eight caption styles');
// Presets must reach the shared canvas renderer, rather than just the picker.
for(const [style,theme] of Object.entries(cinema.captionStyles)){
 const colors=[],text=[];const gradient={addColorStop(){}};const ctx=new Proxy({canvas:{width:1080,height:1920},measureText:t=>({width:t.length*35}),createLinearGradient:()=>gradient},{get:(target,key)=>key in target?target[key]:(...args)=>{if(key==='fillText')text.push(args);},set:(target,key,value)=>{if(key==='fillStyle')colors.push(value);target[key]=value;return true;}});
 const project={title:'',style:'Historia',duration:4,captionStyle:style,captionScale:1.2,captionPosition:'top',scenes:[{time:0,duration:4,text:'Texto visible.'}]};
 cinema.render(ctx,project,0,1,()=>null,[{start:0,end:4,text:'Texto visible.',manual:true}]);assert.ok(colors.includes(theme.text),style+' applies its actual text color');assert.ok(text.some(args=>args[0]==='Texto'&&args[2]<1920*.4),style+' uses the selected position');
}
console.log('PASS: all eight caption presets render through the export canvas with size and position controls');
