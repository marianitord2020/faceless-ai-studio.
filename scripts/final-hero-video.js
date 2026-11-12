/* Hero Video REAL, editable y exportable sobre el motor FacelessCinema existente.
   El archivo es del usuario, permanece en su navegador, nunca se envía al repo. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const mockupRoot=new URL('../assets/mockup/',document.currentScript.src).pathname;
const state={id:null,file:null,url:'',video:null,poster:'',loading:false,playing:false};
let memoryDB=null;
function getDB(){
 return memoryDB||=(new Promise(resolve=>{
  try{const q=indexedDB.open('faceless-hero-video-v1',1);q.onupgradeneeded=()=>q.result.createObjectStore('files');q.onsuccess=()=>resolve(q.result);q.onerror=()=>resolve(null);}
  catch{resolve(null);}
 }));
}
async function stored(id){
 const db=await getDB();if(!db)return null;
 return new Promise(resolve=>{try{const q=db.transaction('files','readonly').objectStore('files').get(id);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>resolve(null);}catch{resolve(null);}});
}
async function save(id,file){
 const db=await getDB();if(!db)return false;
 return new Promise(resolve=>{try{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(file,id);tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);}catch{resolve(false);}});
}
async function erase(id){
 const db=await getDB();if(!db)return;
 return new Promise(resolve=>{try{const tx=db.transaction('files','readwrite');tx.objectStore('files').delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>resolve();}catch{resolve();}});
}
const project=()=>typeof current==='function'?current():null;
function clean(){
 state.video?.pause();state.playing=false;
 if(state.url)URL.revokeObjectURL(state.url);
 Object.assign(state,{id:null,file:null,url:'',video:null,poster:''});
}
async function normalizeHeroFile(file){
 if(!file?.size)throw Error('El archivo está vacío o no se descargó por completo desde tu galería.');
 const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());
 const four=String.fromCharCode(...bytes.slice(4,8));
 const isMp4=four==='ftyp';
 const isWebM=bytes.length>=4&&[0x1a,0x45,0xdf,0xa3].every((byte,i)=>bytes[i]===byte);
 if(!isMp4&&!isWebM)throw Error('Este archivo no contiene un MP4 o WebM válido. Guarda una copia de video en el teléfono y vuelve a seleccionarla.');
 const mime=isMp4?'video/mp4':'video/webm';
 return file.type===mime?file:new File([file],file.name||'hero-video',{type:mime,lastModified:file.lastModified||Date.now()});
}
function capturePoster(video){
 if(state.video!==video||video.readyState<2||!video.videoWidth||!video.videoHeight)return;
 try{
  const canvas=document.createElement('canvas');
  canvas.width=160;canvas.height=100;
  const scale=Math.max(canvas.width/video.videoWidth,canvas.height/video.videoHeight);
  const w=video.videoWidth*scale,h=video.videoHeight*scale;
  canvas.getContext('2d').drawImage(video,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
  state.poster=canvas.toDataURL('image/jpeg',.7);
  const player=$('finalHeroRaw');if(player)player.poster=state.poster;
  window.facelessUpdateHeroTimeline?.();
 }catch(error){console.warn('Hero thumbnail: '+error.message);}
}
async function load(p,file){
 const url=URL.createObjectURL(file),v=document.createElement('video');
 v.preload='auto';v.playsInline=true;v.muted=true;
 try{
  await new Promise((resolve,reject)=>{
   let settled=false;
   const cleanup=()=>{clearTimeout(timer);v.removeEventListener('loadedmetadata',done);v.removeEventListener('error',fail);};
   const done=()=>{if(settled)return;settled=true;cleanup();resolve();};
   const fail=()=>{if(settled)return;settled=true;cleanup();reject(Error('Chrome no puede reproducir el códec de este video. Utiliza MP4 con H.264 o WebM VP8/VP9. No se ha eliminado el clip anterior.'));};
   const timer=setTimeout(()=>{if(settled)return;settled=true;cleanup();reject(Error('El video tarda demasiado en abrirse. Guárdalo primero en tu teléfono e inténtalo de nuevo.'));},20000);
   v.addEventListener('loadedmetadata',done);
   v.addEventListener('error',fail);
   v.src=url;v.load();
  });
  if(!Number.isFinite(v.duration)||v.duration<5)throw Error('El Hero Video debe durar por lo menos 5 segundos.');
  if((Number(p.duration)||0)<5)throw Error('El proyecto debe durar al menos 5 segundos para añadir una introducción.');
 }catch(error){v.removeAttribute('src');v.load();URL.revokeObjectURL(url);throw error;}
 clean();
 state.id=p.id;state.file=file;state.url=url;state.video=v;state.poster='';
 p.heroDuration=Math.min(8,Math.max(5,Number(p.heroDuration)||6),Number(p.duration)||6,v.duration);
 p.heroStart=Math.min(Number(p.heroStart)||0,Math.max(0,v.duration-p.heroDuration));
 v.addEventListener('seeked',()=>capturePoster(v));v.addEventListener('loadeddata',()=>capturePoster(v));
 v.currentTime=p.heroStart;if(v.readyState>=2)capturePoster(v);
 if(typeof persist==='function')persist();
 previewRefresh();
}
function previewRefresh(){
 if(typeof drawFrame!=='function'||!project())return;
 try{
  if(typeof previewTimer!=='undefined'&&previewTimer)return;
  drawFrame(0,0);const view=$('previewCanvas');
  if(view&&!view.classList.contains('hidden'))view.getContext('2d')?.drawImage(canvas,0,0,view.width,view.height);
 }catch(error){console.warn('Hero preview: '+error.message);}
}
async function loadStored(p){
 if(state.id===p.id||state.loading)return;
 state.loading=true;
 try{
  const file=await stored(p.id);if(project()?.id!==p.id)return;
  if(!file){clean();return;}
  await load(p,file);
 }catch(error){console.warn('Hero Video: '+error.message);state.lastError=error.message;}
 finally{state.loading=false;updatePanel();if(state.lastError){const status=$('finalHeroStatus');if(status){status.textContent=state.lastError;status.dataset.state='error';}delete state.lastError;}}
}
const active=()=>{const p=project();return p?.id===state.id?state.video:null;};
window.facelessHeroVideo=active;
window.facelessHeroPoster=()=>active()?state.poster:'';
window.facelessPauseHeroVideo=()=>{if(active())active().pause();};
window.facelessResumeHeroVideo=async()=>{if(state.playing&&active())await active().play();};
const priorPlay=window.facelessPlayOwnVideo,priorStop=window.facelessStopOwnVideo;
window.facelessPlayOwnVideo=async function(...args){
 const result=await priorPlay?.apply(this,args);
 const video=active(),p=project();
 if(video&&p){
  const offset=Number(p.heroStart)||0;video.currentTime=Math.min(offset,Math.max(0,video.duration-.02));
  video.muted=true;
  state.playing=true;
  try{await video.play();}catch(error){state.playing=false;console.warn('Hero Video: '+error.message);}
 }
 return result;
};
window.facelessStopOwnVideo=function(...args){
 state.playing=false;active()?.pause();return priorStop?.apply(this,args);
};
document.addEventListener('visibilitychange',()=>{
 const video=active();
 if(!video)return;
 if(document.hidden)video.pause();
 else if(state.playing&&video.paused)video.play().catch(()=>{});
});
if(window.FacelessCinema?.render){
 const original=window.FacelessCinema.render;
 const film=document.createElement('canvas'),filmCtx=film.getContext('2d',{alpha:false});
 window.FacelessCinema.render=function(ctx,p,index,seconds,getImage,cues){
  const v=p.id===state.id?state.video:null;
  const length=Math.min(Number(p.heroDuration)||6,Number(p.duration)||6);
  if(v&&seconds<length&&v.readyState>=2){
   const scale=Math.min(1,720/Math.max(v.videoWidth,v.videoHeight));
   const w=Math.max(2,Math.round(v.videoWidth*scale)),h=Math.max(2,Math.round(v.videoHeight*scale));
   if(film.width!==w||film.height!==h){film.width=w;film.height=h;}
   filmCtx.drawImage(v,0,0,w,h);
   original(ctx,p,index,seconds,i=>seconds<length?film:getImage(i),cues);
  }else original(ctx,p,index,seconds,getImage,cues);
  if(index>0&&p.transitionType&&p.transitionType!=='fade'){
   const scene=p.scenes[index],elapsed=seconds-scene.time,range=.5;
   if(elapsed>=0&&elapsed<range){
    const strength=1-elapsed/range;
    ctx.save();
    if(p.transitionType==='flash'){ctx.fillStyle='#fff';ctx.globalAlpha=Math.pow(strength,3)*.85;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);}
    if(p.transitionType==='light'){const grad=ctx.createRadialGradient(ctx.canvas.width/2,ctx.canvas.height/2,0,ctx.canvas.width/2,ctx.canvas.height/2,ctx.canvas.width*.7);grad.addColorStop(0,'#fff');grad.addColorStop(1,'#fff0');ctx.fillStyle=grad;ctx.globalAlpha=strength*.75;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);}
    if(p.transitionType==='slide'){ctx.fillStyle='#0f0620';ctx.globalAlpha=strength*.48;ctx.fillRect(0,0,ctx.canvas.width*strength*.85,ctx.canvas.height);}
    if(p.transitionType==='zoom'){ctx.fillStyle='#b345ed';ctx.globalAlpha=strength*.17;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);}
    if(p.transitionType==='spin'){ctx.fillStyle='#ffffff';ctx.globalAlpha=strength*.18;ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);}
    ctx.restore();
   }
  }
 };
}
function updatePanel(){
 const panel=$('finalHeroPanel');if(!panel)return;
 const p=project(),clip=active(),text=panel.querySelector('#finalHeroStatus'),player=panel.querySelector('#finalHeroRaw'),remove=panel.querySelector('#finalHeroRemove'),trim=panel.querySelector('#finalHeroStart'),duration=panel.querySelector('#finalHeroDuration');
 if(!p)return;
 if(clip){
  text.textContent='✓ Clip real cargado · '+clip.duration.toFixed(1)+' s. Se utilizará en la introducción del video exportado, con la narración y subtítulos del proyecto.';
  if(player.src!==state.url)player.src=state.url;if(state.poster)player.poster=state.poster;player.hidden=false;remove.hidden=false;
  panel.querySelector('.final-hero-settings').hidden=false;text.dataset.state='success';
  duration.max=String(Math.min(8,Math.floor(Number(p.duration)||8),Math.floor(clip.duration)));
  duration.value=String(Math.min(Number(duration.max),Number(p.heroDuration)||6));
  trim.max=String(Math.max(0,clip.duration-Number(duration.value)));trim.value=String(p.heroStart||0);
  trim.disabled=Number(trim.max)===0;
  window.facelessUpdateHeroTimeline?.();
 }else{
  text.textContent='Sube un clip MP4 o WebM de 5 segundos o más. El Hero Video reemplaza la imagen de la primera escena y conserva los subtítulos. Todavía no hay un clip añadido.';
  player.hidden=true;if(player.hasAttribute('src')){player.removeAttribute('src');player.load();}player.removeAttribute('poster');remove.hidden=true;trim.disabled=true;
  panel.querySelector('.final-hero-settings').hidden=true;text.dataset.state='idle';
 }
 window.facelessUpdateHeroTimeline?.();
}
function mount(){
 if(document.body.dataset.screen!=='editor')return;
 const p=project(),body=$('tabBody');if(!p||!body)return;
 const stage=body.querySelector('.compact-video-editor, .cut-studio');
 if(!stage)return;
 if(body.querySelector('#finalHeroPanel')){loadStored(p);return;}
 const panel=document.createElement('section');panel.className='final-editor-panel final-hero-panel';panel.id='finalHeroPanel';
 panel.innerHTML='<div class="final-editor-panel-head"><h3>✦ Hero Video · Introducción</h3><span>5–8 segundos</span></div>'+
  '<p id="finalHeroStatus" aria-live="polite">Puedes subir un video real para la primera escena.</p>'+
  '<video id="finalHeroRaw" controls muted playsinline hidden aria-label="Vista previa del clip original"></video>'+
  '<div class="final-hero-actions"><input type="file" accept="video/mp4,video/webm,video/*" id="finalHeroFile" hidden>'+
  '<button type="button" id="finalHeroAdd">▣ Subir / reemplazar clip</button><button type="button" id="finalHeroRemove" hidden>Eliminar clip</button></div>'+
  '<div class="final-hero-settings" hidden><label>Duración del Hero Video <input id="finalHeroDuration" type="range" min="5" max="8" step=".5" value="6"><output id="finalHeroDurLabel">6 s</output></label>'+
  '<label>Inicio dentro del clip (s) <input id="finalHeroStart" type="range" min="0" max="0" step=".1" value="0"><output id="finalHeroStartLabel">0 s</output></label></div>'+
  '<small>El Hero ocupa los primeros 5–8 segundos y puede abarcar dos escenas. La narración y los subtítulos mantienen sus tiempos; se silencia el audio original del clip.</small>';
 const anchor=stage.querySelector('.fc-editor-stage')||stage.querySelector('.cut-studio')||stage.firstElementChild;
 if(anchor)anchor.before(panel);else stage.prepend(panel);
 const input=panel.querySelector('#finalHeroFile');
 panel.querySelector('#finalHeroAdd').onclick=()=>input.click();
 input.onchange=async()=>{
  const file=input.files?.[0];input.value='';if(!file)return;
  const status=panel.querySelector('#finalHeroStatus');
  const add=panel.querySelector('#finalHeroAdd');add.disabled=true;panel.classList.add('is-loading');
  try{
   if(file.size>80_000_000)throw Error('El clip supera 80 MB. Reduce su tamaño e inténtalo nuevamente.');
   status.dataset.state='loading';status.textContent='Revisando el formato y los códecs del clip…';
   const normalized=await normalizeHeroFile(file);
   await load(p,normalized);
   const saved=await save(p.id,normalized);
   updatePanel();
   if(!saved){status.dataset.state='error';status.textContent='Clip añadido solo para esta sesión; el navegador no permitió guardar el archivo.';}
  }catch(error){
   status.dataset.state='error';
   status.textContent=(error.message||'No se pudo abrir el archivo.')+(active()?' El clip anterior continúa activo.':'');
  }finally{add.disabled=false;panel.classList.remove('is-loading');}
 };
 panel.querySelector('#finalHeroRemove').onclick=async()=>{clean();delete p.heroStart;delete p.heroDuration;if(typeof persist==='function')persist();await erase(p.id);updatePanel();previewRefresh();};
 const dur=panel.querySelector('#finalHeroDuration'),start=panel.querySelector('#finalHeroStart');
 dur.oninput=()=>{
  p.heroDuration=Number(dur.value);
  if(active())p.heroDuration=Math.min(p.heroDuration,active().duration,Number(p.duration)||8);
  panel.querySelector('#finalHeroDurLabel').textContent=p.heroDuration+' s';
  if(active()){start.max=String(Math.max(0,active().duration-p.heroDuration));start.value=String(Math.min(Number(start.value),Number(start.max)));p.heroStart=Number(start.value);}
  if(typeof persist==='function')persist();previewRefresh();
 };
 start.oninput=()=>{
  p.heroStart=Number(start.value);panel.querySelector('#finalHeroStartLabel').textContent=p.heroStart.toFixed(1)+' s';
  if(active())active().currentTime=p.heroStart;
  if(typeof persist==='function')persist();previewRefresh();
 };
 updatePanel();loadStored(p);
}
// Reusable actual transition effects; all choices persist in the project.
function mountTools(){
 if(document.body.dataset.screen!=='editor')return;
 const p=project(),body=$('tabBody');if(!p||!body||!body.querySelector('.compact-video-editor, .cut-studio'))return;
 if(body.querySelector('#finalTransitionPanel'))return;
 const host=body.querySelector('.compact-video-editor, .cut-studio');
 const wrap=document.createElement('section');wrap.id='finalTransitionPanel';wrap.className='final-editor-panel';
 const names={fade:'Fundido',slide:'Deslizamiento',zoom:'Zoom',spin:'Giro',light:'Luz',flash:'Flash'};
 wrap.innerHTML='<div class="final-editor-panel-head"><h3>Transiciones</h3><span>Entre escenas</span></div><div class="final-transition-grid">'+
 Object.entries(names).map(([key,name])=>'<button type="button" data-final-transition="'+key+'"><img loading="lazy" src="'+mockupRoot+({fade:'cinematic.webp',slide:'travel.webp',zoom:'history-sample.webp',spin:'mystery.webp',light:'realista.webp',flash:'news.webp'}[key])+'" alt=""><span>'+name+'</span></button>').join('')+'</div>';
 host.append(wrap);
 const refresh=()=>wrap.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.finalTransition===(p.transitionType||'fade')));
 wrap.onclick=e=>{const b=e.target.closest('[data-final-transition]');if(!b)return;p.transitionType=b.dataset.finalTransition;if(typeof persist==='function')persist();refresh();previewRefresh();};
 refresh();
}
let scheduled=false;
function update(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;try{mount();mountTools();}catch(error){console.warn('Hero panel: '+error.message);}});}
new MutationObserver(update).observe($('tabBody'),{childList:true});
new MutationObserver(update).observe(document.body,{attributes:true,attributeFilter:['data-screen']});
update();
window.facelessHeroStatus=()=>({loaded:!!active(),duration:project()?.heroDuration||0});
})();