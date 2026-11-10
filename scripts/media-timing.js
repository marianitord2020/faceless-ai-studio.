/* Align the existing script to recognized speech; never rewrite the script. */
(function(root){
 'use strict';
 const signature=p=>p.scenes.map(s=>s.text).join('\n');
 const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 function tokens(p){return p.scenes.flatMap((s,scene)=>String(s.text).trim().split(/\s+/).filter(Boolean).map(text=>({text,key:normalize(text),scene}))).filter(w=>w.key)}
 function cuesFromWords(words){
  const cues=[];let batch=[];
  function flush(){if(!batch.length)return;cues.push({start:batch[0].start,end:batch[batch.length-1].end,text:batch.map(w=>w.text).join(' '),words:batch.map(({text,start,end})=>({text,start,end}))});batch=[]}
  for(const word of words){if(batch.length&&(word.scene!==batch[0].scene||word.start-batch[batch.length-1].end>.65))flush();batch.push(word);if(batch.length>=6||/[.!?]$/.test(word.text))flush()}
  flush();return cues;
 }
 function estimated(p,duration){
  if(!Number.isFinite(duration)||duration<=0||duration>600)throw Error('La duración del audio debe ser de hasta 10 minutos.');
  const words=tokens(p);if(!words.length)throw Error('El proyecto no contiene narración.');
  const timed=words.map((w,i)=>({...w,start:i*duration/words.length,end:(i+1)*duration/words.length}));
  return timeline(p,timed,duration,'estimated',null);
 }
 function timeline(p,words,duration,method,coverage){
  const starts=p.scenes.map((s,i)=>i?words.find(w=>w.scene===i)?.start:0);
  if(starts.some(n=>!Number.isFinite(n)))throw Error('Cada escena necesita texto para sincronizarse.');
  const scenes=p.scenes.map((s,i)=>({...s,time:starts[i],duration:(starts[i+1]??duration)-starts[i]}));
  if(scenes.some(s=>s.duration<=0))throw Error('No se encontraron tiempos válidos para todas las escenas.');
  return {duration,scenes,subtitleCues:cuesFromWords(words),subtitleTextSignature:signature(p),audioAlignment:{method,coverage}};
 }
 function align(p,recognized,duration){
  const script=tokens(p),speech=recognized.flatMap(w=>{
   const parts=String(w.word||'').trim().split(/\s+/).filter(Boolean);
   return parts.map((text,i)=>({key:normalize(text),start:Number(w.start)+(Number(w.end)-Number(w.start))*i/parts.length,end:Number(w.start)+(Number(w.end)-Number(w.start))*(i+1)/parts.length}));
  }).filter(w=>w.key&&Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.start>=0&&w.end>w.start&&w.end<=duration+.15);
  if(!script.length||!speech.length||script.length>1800||speech.length>2200)throw Error('No hay suficiente voz reconocible o el texto es demasiado largo.');
  for(let j=1;j<speech.length;j++)if(speech[j].start<speech[j-1].start)throw Error('El reconocimiento devolvió tiempos fuera de orden.');
  const cols=speech.length+1,dp=new Uint16Array((script.length+1)*cols);
  for(let i=script.length-1;i>=0;i--)for(let j=speech.length-1;j>=0;j--)dp[i*cols+j]=script[i].key===speech[j].key?1+dp[(i+1)*cols+j+1]:Math.max(dp[(i+1)*cols+j],dp[i*cols+j+1]);
  const anchors=new Map();let i=0,j=0;
  while(i<script.length&&j<speech.length){if(script[i].key===speech[j].key){anchors.set(i,speech[j]);i++;j++}else if(dp[(i+1)*cols+j]>=dp[i*cols+j+1])i++;else j++}
  const coverage=anchors.size/script.length;
  const speechCoverage=anchors.size/speech.length;
  if(coverage<.72||speechCoverage<.65||p.scenes.some((s,n)=>{const ix=script.map((w,i)=>w.scene===n?i:-1).filter(i=>i>=0);return !ix.length||ix.filter(i=>anchors.has(i)).length/ix.length<.5}))throw Error('El audio no coincide suficientemente con la narración. Comprueba que sea la lectura de este guion; no se aplicaron tiempos de voz.');
  const timed=script.map((w,i)=>({...w,...(anchors.get(i)||{})}));
  // Interpolate only words missed by ASR, between neighboring recognized anchors.
  for(let a=0;a<timed.length;){if(anchors.has(a)){a++;continue}let b=a;while(b<timed.length&&!anchors.has(b))b++;const start=a?timed[a-1].end:0,end=b<timed.length?timed[b].start:duration;for(let k=a;k<b;k++){timed[k].start=start+Math.max(0,end-start)*(k-a)/(b-a);timed[k].end=start+Math.max(0,end-start)*(k-a+1)/(b-a)}a=b}
  // Tiny gaps at segment boundaries can occur in speech recognition.
  for(let k=0;k<timed.length-1;k++)timed[k].end=Math.min(timed[k].end,timed[k+1].start);
  return timeline(p,timed,duration,'speech',Math.round(coverage*100));
 }
 // TTS scene boundaries come from decoded audio, rather than template slots.
 function fromSegments(p,durations,speed=1){
  if(!Number.isFinite(speed)||speed<=0||durations.length!==p.scenes.length||durations.some(n=>!Number.isFinite(n)||n<=0))throw Error('Cada escena necesita un fragmento de voz válido.');
  const duration=durations.reduce((sum,n)=>sum+n/speed,0);
  if(duration>600)throw Error('La narración supera 10 minutos. Acorta el guion.');
  let cursor=0;const words=[];
  p.scenes.forEach((s,scene)=>{
   const list=tokens({scenes:[s]}),length=durations[scene]/speed;
   if(!list.length)throw Error('Cada escena necesita texto para sincronizarse.');
   list.forEach((w,i)=>words.push({...w,scene,start:cursor+length*i/list.length,end:cursor+length*(i+1)/list.length}));
   cursor+=length;
  });
  return timeline(p,words,duration,'tts-segments',null);
 }
 // Generate captions from speech when the manual project has no written script.
 function transcribed(p,recognized,duration){
  if(!Number.isFinite(duration)||duration<=0||duration>600)throw Error('Usa un audio de hasta 10 minutos.');
  const speech=recognized.map(w=>({text:String(w.word||'').trim(),start:Number(w.start),end:Math.min(duration,Number(w.end))})).filter(w=>w.text&&Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.start>=0&&w.end>w.start);
  if(!speech.length)throw Error('No se reconoció voz. Prueba una grabación más clara.');
  for(let i=1;i<speech.length;i++)if(speech[i].start<speech[i-1].start)throw Error('La IA devolvió palabras fuera de orden. Vuelve a sincronizar.');
  const count=Math.max(1,p.scenes.length),starts=Array.from({length:count},(_,i)=>i===0?0:speech.length>=count?speech[Math.floor(i*speech.length/count)].start:duration*i/count);
  if(starts.some((n,i)=>i&&n<=starts[i-1]))throw Error('La IA no pudo separar los tiempos de las escenas.');
  const words=speech.map(w=>({...w,scene:Math.max(0,starts.findLastIndex(t=>t<=w.start))}));
  const scenes=starts.map((time,i)=>({...p.scenes[i],time,duration:(starts[i+1]??duration)-time,text:words.filter(w=>w.scene===i).map(w=>w.text).join(' ')}));
  return {duration,scenes,narration:scenes.map(s=>s.text).join('\n'),subtitleCues:cuesFromWords(words),subtitleTextSignature:signature({scenes}),audioAlignment:{method:'speech',coverage:100,source:'transcription'}};
 }
 function sceneAt(p,seconds){
  let index=0;
  for(let i=1;i<p.scenes.length;i++){if(seconds<p.scenes[i].time)break;index=i;}
  return index;
 }
 function cues(p){
  if(p.subtitleTextSignature===signature(p)&&Array.isArray(p.subtitleCues))return p.subtitleCues;
  return p.scenes.flatMap(s=>{const words=String(s.text).split(/\s+/).filter(Boolean);return cuesFromWords(words.map((text,i)=>({text,scene:0,start:s.time+i*s.duration/words.length,end:s.time+(i+1)*s.duration/words.length})))})
 }
 const api={signature,estimated,align,fromSegments,transcribed,sceneAt,cues};root.FacelessTiming=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
