/* Editor local de movimientos de foto por escena; no requiere IA ni créditos. */
(() => {
 'use strict';
 const host=document.getElementById('tabBody');
 if(!host)return;
 const movements=[['auto','Automático'],['zoom','Zoom cinematográfico'],['pan','Paneo horizontal'],['vertical','Movimiento vertical'],['dramatic','Zoom dramático'],['static','Imagen fija']];
 function mount(){
  if(document.body.dataset.screen!=='editor'||!document.getElementById('sceneForm')||document.getElementById('fcMotionPanel'))return;
  const project=typeof current==='function'?current():null;
  if(!project?.scenes?.length)return;
  const panel=document.createElement('section');panel.id='fcMotionPanel';panel.className='fc-motion-panel';
  const heading=document.createElement('h3');heading.textContent='🎥 Animar fotografías sin IA';panel.append(heading);
  const description=document.createElement('p');description.textContent='Elige cómo se moverá la fotografía en cada escena. Se conserva al previsualizar y exportar.';panel.append(description);
  const layout=document.createElement('div');layout.className='fc-motion-layout';
  function field(name,selectId,opts){
   const label=document.createElement('label');label.htmlFor=selectId;label.textContent=name;
   const select=document.createElement('select');select.id=selectId;for(const [value,title] of opts){const option=document.createElement('option');option.value=value;option.textContent=title;select.append(option)}
   const wrap=document.createElement('div');wrap.append(label,select);return {wrap,select};
  }
  const scene=field('Escena','fcMotionScene',project.scenes.map((s,i)=>[String(i),'Escena '+(i+1)+' · '+Number(s.duration.toFixed(1))+'s']));
  const effect=field('Movimiento','fcMotionPreset',movements);
  layout.append(scene.wrap,effect.wrap);panel.append(layout);
  const intensityWrap=document.createElement('div');intensityWrap.className='fc-motion-intensity';
  const intensityLabel=document.createElement('label');intensityLabel.htmlFor='fcMotionIntensity';intensityLabel.textContent='Intensidad ';
  const amount=document.createElement('output');amount.htmlFor='fcMotionIntensity';intensityLabel.append(amount);
  const intensity=document.createElement('input');intensity.type='range';intensity.id='fcMotionIntensity';intensity.min='10';intensity.max='100';intensity.step='10';
  intensityWrap.append(intensityLabel,intensity);panel.append(intensityWrap);
  const preview=document.createElement('canvas');preview.id='fcMotionPreview';preview.width=216;preview.height=384;preview.setAttribute('aria-label','Fotograma de ejemplo');panel.append(preview);
  const note=document.createElement('p');note.className='smalltext';note.textContent='Esto mueve la cámara sobre una imagen fija. No hace hablar ni caminar a una persona.';panel.append(note);
  (document.getElementById('sceneForm')?.parentElement||host).append(panel);
  const pick=()=>project.scenes[Number(scene.select.value)]||project.scenes[0];
  function refreshCanvas(){
   try{
    const i=Number(scene.select.value),s=pick(),sec=s.time+Math.min(s.duration*.35,1.5);
    if(typeof drawFrame==='function'&&typeof canvas!=='undefined'){
     drawFrame(i,sec);preview.getContext('2d').drawImage(canvas,0,0,preview.width,preview.height);
    }
   }catch{}
  }
  function refresh(){
   const s=pick();effect.select.value=s.photoMotion||((s.imageMotion==='static')?'static':'auto');
   intensity.value=String(s.photoIntensity||50);amount.textContent=intensity.value+'%';
   intensity.disabled=effect.select.value==='static'||effect.select.value==='auto';refreshCanvas();
  }
  function save(){
   const s=pick();s.photoMotion=effect.select.value;s.photoIntensity=Number(intensity.value);
   if(s.photoMotion==='static')s.imageMotion='static';else if(s.imageMotion==='static')delete s.imageMotion;
   if(typeof persist==='function')persist();amount.textContent=intensity.value+'%';refreshCanvas();
  }
  scene.select.addEventListener('change',refresh);effect.select.addEventListener('change',()=>{intensity.disabled=['static','auto'].includes(effect.select.value);save()});
  intensity.addEventListener('input',save);refresh();
 }
 let scheduled=false;
 const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;mount()})});
 observer.observe(host,{childList:true});
 new MutationObserver(()=>mount()).observe(document.body,{attributes:true,attributeFilter:['data-screen']});
 mount();
})();
