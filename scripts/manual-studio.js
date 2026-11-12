/* Visual manual editor; uses the existing media store, renderer and HD export. */
(() => {
 'use strict';
 window.facelessMountManualStudio=(p,cards,previewCard)=>{
  const id=s=>document.getElementById(s),view=id('previewCanvas'),frame=view.closest('.media-frame');
  const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  const shell=node('section','cut-studio');shell.setAttribute('aria-label','Editor visual de video');cards.prepend(shell);
  shell.innerHTML='<div class="cut-head"><div><span class="cut-eyebrow">TU MESA DE EDICIÓN</span><h3>Tu video, a tu manera</h3></div><span class="cut-local">✦ IA local</span></div><div class="cut-stage"><span class="cut-scene-label"></span><button type="button" class="cut-edit-overlay">✎ Toca para editar</button></div><div class="cut-transport"><button type="button" class="cut-icon" id="cutPrevious" aria-label="Escena anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5v14M18 6l-8 6 8 6Z"/></svg></button><button type="button" id="cutPlay" class="cut-play" aria-label="Reproducir video">▶</button><button type="button" class="cut-icon" id="cutNext" aria-label="Escena siguiente"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 5v14M6 6l8 6-8 6Z"/></svg></button><output id="cutTime">00:00 / 00:00</output><button type="button" class="cut-icon" id="cutUndo" aria-label="Deshacer último ajuste" title="Deshacer último ajuste" disabled>↶</button></div><label class="sr-only" for="cutSeek">Posición del video</label><input id="cutSeek" class="cut-seek" type="range" min="0" step="0.01" value="0"><div class="cut-timeline-title"><b>Línea de tiempo</b><span>Toca una escena o un subtítulo</span></div><div class="cut-timeline-scroll"><div class="cut-timeline"><div class="cut-ruler"></div><div class="cut-track cut-visual-track" aria-label="Escenas"></div><div class="cut-track cut-caption-track" aria-label="Subtítulos"></div><button type="button" class="cut-audio-track" aria-label="Editar audio"><span>♫ Audio</span><canvas width="800" height="40" aria-label="Forma de onda del audio"></canvas></button><div class="cut-playhead" aria-hidden="true"></div></div></div><div class="cut-tools" role="tablist" aria-label="Herramientas de la escena"><button type="button" data-tool="scene" role="tab">▧ Escena</button><button type="button" data-tool="text" role="tab">Tt Subtítulos</button><button type="button" data-tool="audio" role="tab">♫ Audio</button></div><div class="cut-inspector"></div><p class="cut-feedback" role="status" aria-live="polite"></p>';
  shell.querySelector('.cut-stage').prepend(frame);const downloads=document.getElementById('downloadArea'),formatNote=document.getElementById('mediaFormatNote');if(downloads)shell.append(downloads);if(formatNote)shell.append(formatNote);previewCard.remove();
  const legacy=node('details','cut-source-tools');const summary=node('summary','','Archivos y herramientas');legacy.append(summary);cards.append(legacy);
  for(const card of [...cards.children])if(card!==shell&&card!==legacy&&!card.classList.contains('export-options'))legacy.append(card);
  // Downloads and the native output player stay in the existing frame/containers.
  const feedback=shell.querySelector('.cut-feedback'),inspector=shell.querySelector('.cut-inspector'),seek=id('cutSeek'),play=id('cutPlay'),track=shell.querySelector('.cut-timeline');
  let seconds=0,selected=0,selectedCue=0,tool='scene',destroyed=false,paintFrame=null,history=[],waveFile=null,wave=[];
  const scenePhotoInput=node('input');scenePhotoInput.type='file';scenePhotoInput.accept='image/*';scenePhotoInput.hidden=true;shell.append(scenePhotoInput);let photoTarget=0;scenePhotoInput.onchange=async()=>{const file=scenePhotoInput.files[0],target=photoTarget;if(file){await window.facelessReplaceScenePhoto?.(p.id,target,file);if(!destroyed){jump(p.scenes[target].time+Math.min(.5,p.scenes[target].duration/2));feedback.textContent='Foto actualizada en la escena '+(target+1)+'.';}}scenePhotoInput.value='';};
  const display=t=>{const n=Math.max(0,Number(t)||0);return Math.floor(n/60).toString().padStart(2,'0')+':'+Math.floor(n%60).toString().padStart(2,'0');};
  const locked=()=>facelessIsWorking();
  function record(){history.push(JSON.stringify(p));if(history.length>20)history.shift();id('cutUndo').disabled=false;}
  function invalid(){stopPreview();const result=id('videoResult');result.pause();result.removeAttribute('src');result.load();result.classList.add('hidden');view.classList.remove('hidden');id('downloadArea')?.replaceChildren();if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}}
  function commit(message){p.date=new Date().toISOString();p.narration=p.scenes.map(s=>s.text).join('\n');p.hook=p.scenes[0]?.text||'';persist();const audioPlayer=id('uploadedAudioPlayer');if(audioPlayer)audioPlayer.volume=FacelessSceneEdit.volume(p);const manual=id('manualCaptions');if(manual)manual.value=p.scenes.map(s=>s.text).join('\n');invalid();refresh();paint(seconds);feedback.textContent=message;window.facelessRefreshManualTiming?.();}
  function showTool(next){tool=next;shell.querySelectorAll('[data-tool]').forEach(b=>{b.classList.toggle('on',b.dataset.tool===tool);b.setAttribute('aria-selected',String(b.dataset.tool===tool));});renderInspector();}
  function paint(time,fromPlayback=false){
   if(destroyed||!shell.isConnected||rendering)return;
   seconds=Math.max(0,Math.min(Math.max(0,p.duration-.001),Number(time)||0));seek.max=p.duration;seek.value=seconds;
   const index=FacelessTiming.sceneAt(p,seconds),changed=index!==selected;selected=index;
   const beforeCue=selectedCue,cues=FacelessTiming.cues(p),cue=cues.findIndex(c=>seconds>=c.start&&seconds<c.end);if(cue>=0)selectedCue=cue;
   shell.querySelector('.cut-scene-label').textContent='Escena '+(selected+1)+' / '+p.scenes.length;
   id('cutTime').textContent=display(seconds)+' / '+display(p.duration);track.querySelector('.cut-playhead').style.left=(seconds/Math.max(.01,p.duration)*100)+'%';
   track.querySelectorAll('[data-scene-index]').forEach(b=>{const active=Number(b.dataset.sceneIndex)===selected;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
   drawFrame(selected,seconds);view.getContext('2d').drawImage(canvas,0,0,view.width,view.height);
   if(changed||beforeCue!==selectedCue)renderInspector();
  }
  function jump(time){if(locked())return;stopPreview();id('videoResult').pause();id('videoResult').classList.add('hidden');view.classList.remove('hidden');const video=window.facelessOwnVideo?.();if(video){video.currentTime=Math.min(time,Math.max(0,video.duration-.01));video.onseeked=()=>{if(!previewTimer&&!rendering)paint(seconds);};}paint(time);renderInspector();}
  async function toggle(){
   if(window.facelessMediaBusy||rendering)return;if(previewTimer){stopPreview();renderInspector();return;}
   try{
    if(destroyed||!shell.isConnected)return;
    if(seconds>=p.duration-.05)seconds=0;
    id('videoResult').pause();id('videoResult').classList.add('hidden');view.classList.remove('hidden');
    if(audioFile){previewAudioURL=URL.createObjectURL(audioFile);previewAudio=new Audio(previewAudioURL);previewAudio.volume=FacelessSceneEdit.volume(p);previewAudio.currentTime=seconds;await previewAudio.play();}
    await window.facelessPlayOwnVideo?.(seconds);
    const start=performance.now(),offset=seconds;
    const tick=()=>{if(destroyed||!shell.isConnected){stopPreview();return;}const t=previewAudio?previewAudio.currentTime:offset+(performance.now()-start)/1000;paint(t,true);if(t<p.duration-.01&&(!previewAudio||!previewAudio.ended))previewTimer=requestAnimationFrame(tick);else{stopPreview();renderInspector();}};
    previewTimer=requestAnimationFrame(tick);play.textContent='Ⅱ';play.setAttribute('aria-label','Pausar video');id('previewVideo').textContent='Pausar vista previa';
   }catch(error){stopPreview();feedback.textContent=error.message||'No se pudo reproducir. Vuelve a pulsar Reproducir.';}
  }
  const stopped=()=>{if(!shell.isConnected)return;play.textContent='▶';play.setAttribute('aria-label','Reproducir video');id('previewVideo').textContent='Vista previa';};window.facelessOnPreviewStopped=stopped;
  play.onclick=toggle;id('previewVideo').onclick=toggle;seek.oninput=()=>jump(Number(seek.value));
  id('cutPrevious').onclick=()=>{const scene=p.scenes[Math.max(0,selected-1)];jump(scene.time+Math.min(.5,scene.duration/2));};
  id('cutNext').onclick=()=>{const scene=p.scenes[Math.min(p.scenes.length-1,selected+1)];jump(scene.time+Math.min(.5,scene.duration/2));};
  id('cutUndo').onclick=()=>{if(locked()||!history.length)return;const previous=JSON.parse(history.pop());for(const key of Object.keys(p))if(!(key in previous))delete p[key];Object.assign(p,previous);id('cutUndo').disabled=!history.length;commit('Último ajuste deshecho.');};
  shell.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{if(!locked()){stopPreview();showTool(b.dataset.tool);}});
  shell.querySelector('.cut-edit-overlay').onclick=()=>{if(!locked()){stopPreview();showTool('text');}};
  view.onclick=()=>{if(!locked()){stopPreview();showTool('text');}};
  shell.querySelector('.cut-audio-track').onclick=()=>{if(!locked()){stopPreview();showTool('audio');}};
  function field(label,type,value){const wrap=node('label','cut-field'),text=node('span','',label),input=node(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.value=value;wrap.append(text,input);inspector.append(wrap);return input;}
  function button(label,action,cls=''){const b=node('button','btn small '+cls,label);b.type='button';b.onclick=()=>{if(!locked()){stopPreview();action();}};inspector.append(b);return b;}
  function renderInspector(){
   if(destroyed)return;inspector.replaceChildren();const editIndex=selected,scene=p.scenes[editIndex];if(!scene)return;
   if(tool==='scene'){
    inspector.append(node('h4','','Escena '+(selected+1)));
    const actions=node('div','cut-scene-actions');inspector.append(actions);
    const change=button('▧ Reemplazar foto',()=>{photoTarget=editIndex;scenePhotoInput.click();});
    const remove=button('Quitar foto',()=>{const slot=id('manualPhotoSlots')?.querySelector('[data-scene="'+editIndex+'"]');const target=[...(slot?.querySelectorAll('button')||[])].find(b=>b.textContent==='Quitar foto');if(target)target.click();else feedback.textContent='Esta escena todavía no tiene foto.';});actions.append(change,remove);
    window.FacelessSceneVideos?.mountControls(inspector,p,editIndex);
    const start=field('Inicio de escena (s)','number',scene.time.toFixed(2)),end=field('Fin de escena (s)','number',(scene.time+scene.duration).toFixed(2));for(const f of [start,end]){f.step='.01';f.min='0';f.max=p.duration;}start.disabled=selected===0;end.disabled=selected===p.scenes.length-1;
    button('Guardar duración',()=>{try{const before=JSON.stringify(p);FacelessSceneEdit.bounds(p,editIndex,editIndex===0?0:Number(start.value),editIndex===p.scenes.length-1?p.duration:Number(end.value));history.push(before);if(history.length>20)history.shift();id('cutUndo').disabled=false;commit('Tiempos de escena guardados. El audio conserva su sincronización.');}catch(error){feedback.textContent=error.message;}});
    inspector.append(node('p','cut-hint','Ajusta el encuadre y el movimiento de esta escena.'));
    const choices=node('div','cut-choice-row');inspector.append(choices);
    for(const [value,label] of [['cover','Llenar'],['contain','Ajustar']]){const b=node('button','cut-choice'+((scene.imageFit||'cover')===value?' on':''),label);b.type='button';b.onclick=()=>{if(locked())return;record();scene.imageFit=value;commit('Encuadre aplicado.');renderInspector();};choices.append(b);}
    const motion=node('label','cut-check'),check=node('input');check.type='checkbox';check.checked=scene.imageMotion!=='static';check.disabled=scene.imageFit==='contain';motion.append(check,document.createTextNode(' Movimiento suave al llenar'));inspector.append(motion);check.onchange=()=>{if(locked())return;record();scene.imageMotion=check.checked?'pan':'static';commit('Movimiento actualizado.');};
   }else if(tool==='text'){
    const cues=FacelessTiming.cues(p);selectedCue=Math.max(0,Math.min(selectedCue,cues.length-1));
    inspector.append(node('h4','','Subtítulos en pantalla'));
    if(cues.length){const choice=node('select','cut-caption-select');choice.setAttribute('aria-label','Subtítulo para editar');cues.forEach((c,i)=>{const option=node('option','',display(c.start)+' · '+c.text.slice(0,55));option.value=i;choice.append(option);});choice.value=selectedCue;choice.onchange=()=>{selectedCue=Number(choice.value);jump(cues[selectedCue].start+.01);showTool('text');};inspector.append(choice);
     const cueIndex=selectedCue,text=field('Texto del subtítulo','textarea',cues[cueIndex].text);text.rows=2;
     button('Aplicar texto',()=>{record();FacelessSceneEdit.caption(p,cueIndex,text.value,FacelessTiming);commit('Subtítulo actualizado sin regenerar tu audio.');renderInspector();});
    }else{inspector.append(node('p','cut-hint','Añade un audio para crear subtítulos con IA local o escribe tu texto en las herramientas.'));button('Escribir mis subtítulos',()=>{legacy.open=true;id('manualCaptions').focus();id('manualCaptions').scrollIntoView({block:'center',behavior:'smooth'});});}
    const presets=node('div','cut-presets');presets.setAttribute('aria-label','Estilos de subtítulos');inspector.append(presets);
    for(const [value,theme] of Object.entries(FacelessCinema.captionStyles)){const b=node('button','cut-preset preset-'+value+(p.captionStyle===value?' on':''));b.type='button';b.setAttribute('aria-pressed',String((p.captionStyle||'highlight')===value));const sample=node('span','','Tu historia'),label=node('small','',theme.name);b.append(sample,label);b.onclick=()=>{if(locked())return;record();p.captionStyle=value;const select=id('captionStyle');if(select)select.value=value;commit('Estilo '+theme.name+' aplicado al video.');renderInspector();};presets.append(b);}
    const size=field('Tamaño de subtítulos','range',Math.round((p.captionScale||1)*100));size.min='70';size.max='140';size.step='5';size.value=Math.round((p.captionScale||1)*100);size.onchange=()=>{if(locked())return;record();p.captionScale=Number(size.value)/100;commit('Tamaño de subtítulos actualizado.');};
    const positions=node('div','cut-choice-row');inspector.append(positions);for(const [value,label] of [['top','Arriba'],['middle','Centro'],['bottom','Abajo']]){const b=node('button','cut-choice'+((p.captionPosition||'bottom')===value?' on':''),label);b.type='button';b.onclick=()=>{if(locked())return;record();p.captionPosition=value;commit('Posición de subtítulos actualizada.');renderInspector();};positions.append(b);}
   }else{
    inspector.append(node('h4','','Audio de tu video'),node('p','cut-hint',audioFile?.name||'Todavía no has añadido audio.'));
    const level=field('Volumen · '+Math.round(FacelessSceneEdit.volume(p)*100)+' %','range',Math.round(FacelessSceneEdit.volume(p)*100));level.min='0';level.max='100';level.step='1';level.onchange=()=>{if(locked())return;record();p.audioVolume=Number(level.value)/100;const player=id('uploadedAudioPlayer');if(player)player.volume=FacelessSceneEdit.volume(p);commit('Volumen guardado para la vista previa y la descarga.');renderInspector();};
    button('♫ Cambiar audio',()=>id('pickOwnAudio').click());button('✦ Sincronizar con IA local',()=>{if(audioFile)id('syncAudio').click();else feedback.textContent='Añade primero un audio.';});button('Quitar audio',()=>{if(audioFile)id('removeAudio').click();});
   }
   inspector.querySelectorAll('input,textarea,select').forEach(el=>el.addEventListener('focus',()=>{if(previewTimer)stopPreview();}));
  }
  function refresh(){
   if(destroyed||!shell.isConnected)return;
   selected=Math.min(selected,p.scenes.length-1);const duration=Math.max(.01,p.duration);seek.max=duration;
   const ruler=track.querySelector('.cut-ruler');ruler.replaceChildren();for(let i=0;i<=4;i++){const label=node('span','',display(duration*i/4));label.style.left=i*25+'%';ruler.append(label);}
   const scenes=track.querySelector('.cut-visual-track');scenes.replaceChildren();p.scenes.forEach((scene,i)=>{const b=node('button','cut-scene-block');b.type='button';b.dataset.sceneIndex=i;b.style.left=scene.time/duration*100+'%';b.style.width=scene.duration/duration*100+'%';b.title='Escena '+(i+1)+' · '+scene.duration.toFixed(1)+' s';const photo=facelessProjectPhotos(p.id).get(i);if(photo){const image=node('img');image.src=photo.src;image.alt='';b.append(image);}else b.append(node('span','cut-block-empty',window.facelessOwnVideo?.()?'▷':'▧'));b.append(node('span','','Escena '+(i+1)));b.onclick=()=>{jump(scene.time+Math.min(.5,scene.duration/2));showTool('scene');};scenes.append(b);});
   const captions=track.querySelector('.cut-caption-track');captions.replaceChildren();FacelessTiming.cues(p).forEach((cue,i)=>{const b=node('button','cut-caption-block',cue.text);b.type='button';b.style.left=cue.start/duration*100+'%';b.style.width=(cue.end-cue.start)/duration*100+'%';b.title=cue.text;b.onclick=()=>{selectedCue=i;jump(cue.start+.001);showTool('text');};captions.append(b);});
   shell.querySelector('.cut-audio-track span').textContent=audioFile?'♫ '+(audioFile.name||'Narración'):'＋ Añadir audio';
   renderInspector();paint(seconds);drawWave();
  }
  async function drawWave(){
   const waveCanvas=track.querySelector('canvas'),ctx=waveCanvas.getContext('2d');ctx.clearRect(0,0,waveCanvas.width,waveCanvas.height);
   if(!audioFile)return;if(waveFile!==audioFile){waveFile=audioFile;wave=[];const file=audioFile;let context;try{context=new (window.AudioContext||window.webkitAudioContext)();const buffer=await context.decodeAudioData((await file.arrayBuffer()).slice(0)),data=buffer.getChannelData(0);const bars=120;const points=Array.from({length:bars},(_,i)=>{let peak=0;const a=Math.floor(i*data.length/bars),b=Math.floor((i+1)*data.length/bars);for(let j=a;j<b;j+=Math.max(1,Math.floor((b-a)/80)))peak=Math.max(peak,Math.abs(data[j]));return peak;});if(audioFile===file&&!destroyed)wave=points;}catch{if(audioFile===file)wave=[];}finally{await context?.close().catch(()=>{});}if(destroyed||audioFile!==file)return;}
   const peak=Math.max(.01,...wave);ctx.fillStyle='#4cdbbb';wave.forEach((v,i)=>{const height=Math.max(2,v/peak*34);ctx.fillRect(i*waveCanvas.width/wave.length,20-height/2,4,height);});
  }
  const originalPhotos=window.facelessRefreshPhotoSlots,originalAudio=window.facelessRefreshAudioAttachment;
  const photos=id=>{originalPhotos?.(id);if(id===p.id)refresh();};const audio=()=>{originalAudio?.();refresh();};window.facelessRefreshPhotoSlots=photos;window.facelessRefreshAudioAttachment=audio;
  const mediaUpdated=event=>{if(event.detail===p.id)refresh();};document.addEventListener('faceless-media-updated',mediaUpdated);
  const cleanup=()=>{document.removeEventListener('faceless-media-updated',mediaUpdated);destroyed=true;if(paintFrame)cancelAnimationFrame(paintFrame);if(window.facelessOnPreviewStopped===stopped)window.facelessOnPreviewStopped=null;if(window.facelessRefreshPhotoSlots===photos)window.facelessRefreshPhotoSlots=originalPhotos;if(window.facelessRefreshAudioAttachment===audio)window.facelessRefreshAudioAttachment=originalAudio;stopPreview();};
  window.facelessManualStudio={projectId:p.id,destroy:cleanup,refresh,redraw:()=>paint(seconds)};showTool('scene');refresh();
 };
})();
