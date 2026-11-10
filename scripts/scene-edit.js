/* Non-destructive timeline edits. Audio and media references stay in place. */
(function(root){
 const volume=p=>Math.max(0,Math.min(1,Number.isFinite(Number(p.audioVolume))?Number(p.audioVolume):1));
 function bounds(p,index,start,end){
  const scene=p.scenes[index],previous=p.scenes[index-1],next=p.scenes[index+1];
  if(!scene||!Number.isFinite(start)||!Number.isFinite(end)||end-start<.1||start<0||end>p.duration+.001)throw Error('La escena necesita al menos 0,1 segundos dentro del video.');
  const nextEnd=next?next.time+next.duration:p.duration;
  if((!previous&&Math.abs(start)>.001)||(!next&&Math.abs(end-p.duration)>.001)||(previous&&start-previous.time<.1)||(next&&nextEnd-end<.1))throw Error('Deja al menos 0,1 segundos para cada escena vecina.');
  if(previous)previous.duration=start-previous.time;
  scene.time=start;scene.duration=end-start;if(next){next.time=end;next.duration=nextEnd-end;}
  p.audioAlignment={...(p.audioAlignment||{}),method:'manual'};
 }
 function caption(p,index,text,timing){
  const cues=timing.cues(p).map(c=>({...c,words:c.words?.map(w=>({...w}))}));
  if(!cues[index])throw Error('Selecciona un subtítulo de la línea de tiempo.');
  const cue=cues[index];cue.text=String(text).trim();cue.manual=true;delete cue.words;
  p.subtitleCues=cues.filter(c=>c.text);
  p.scenes.forEach((s,i)=>{const end=p.scenes[i+1]?.time??p.duration;s.text=p.subtitleCues.filter(c=>c.start>=s.time-.001&&c.start<end).map(c=>c.text).join(' ');});
  p.narration=p.scenes.map(s=>s.text).join('\n');p.hook=p.scenes[0]?.text||'';
  p.subtitleTextSignature=timing.signature(p);p.audioAlignment={...(p.audioAlignment||{}),method:'manual'};
 }
 const api={volume,bounds,caption};root.FacelessSceneEdit=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
