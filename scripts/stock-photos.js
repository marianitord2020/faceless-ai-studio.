/* Stock photos for video scenes, with source and license metadata. */
(() => {
 'use strict';
 const API='https://faceless-images.marianitord2020.workers.dev/stock/';
 const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;};
 const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:''}catch{return '';}};
 function link(label,url){const a=el('a',label);a.href=safeURL(url)||'#';a.target='_blank';a.rel='noopener noreferrer';return a;}
 window.facelessMountStockPhotos=function(project,updatePreview){
  const slots=document.getElementById('manualPhotoSlots');if(!slots||document.getElementById('stockPhotos'))return;
  const root=el('details','', 'stock-photos');root.id='stockPhotos';root.append(el('summary','Fotos e ilustraciones para las escenas'));
  root.append(el('p','Busca fotos existentes en los bancos comprobados. Elige una y asígnala a una escena.','smalltext'));
  const form=el('form','', 'stock-search');
  const source=el('select');source.setAttribute('aria-label','Banco de fotos');
  for(const [value,text] of [['pixabay','Pixabay'],['wikimedia','Wikimedia Commons · sin clave adicional'],['openverse','Openverse']]){const o=el('option',text);o.value=value;source.append(o);}
  const query=el('input');query.type='search';query.placeholder='Ej.: playa de República Dominicana';query.maxLength=100;query.required=true;query.minLength=2;query.setAttribute('aria-label','Buscar fotografías');
  const pass=el('input');pass.type='password';pass.placeholder='Código privado de tu página';pass.autocomplete='off';pass.setAttribute('aria-label','Código privado de la aplicación');
  const button=el('button','Buscar fotos','btn primary');button.type='submit';form.append(source,query,pass,button);
  const scene=el('select');scene.setAttribute('aria-label','Escena de destino');project.scenes.forEach((s,i)=>{const o=el('option','Escena '+(i+1)+' · '+String(s.text).slice(0,55));o.value=String(i);scene.append(o);});
  const sceneLabel=el('label','Añadir la foto elegida a:');sceneLabel.append(scene);root.append(form,sceneLabel);
  const status=el('p','', 'status');status.setAttribute('aria-live','polite');const grid=el('div','', 'stock-results');
  const more=el('button','Más resultados','btn small');more.type='button';more.hidden=true;
  const external=link('Abrir el banco de fotos', 'https://pixabay.com/');root.append(external,document.createTextNode(' · '),link('Buscar en Pexels','https://www.pexels.com/es-es/'));source.addEventListener('change',()=>{external.href=source.value==='pixabay'?'https://pixabay.com/':source.value==='openverse'?'https://openverse.org/':'https://commons.wikimedia.org/';});
  const note=el('p','Verifica la fuente y la licencia antes de publicar. Conservamos el autor, la licencia y el enlace de cada foto seleccionada.','smalltext');
  const credits=el('div','', 'stock-credits'),copyButton=el('button','Copiar créditos de las fotos','btn small');copyButton.type='button';
  root.append(status,grid,more,note,copyButton,credits);slots.after(root);
  let page=1,ticket=0,controller,loading=false;
  const token=()=>window.facelessAccess?.current()||pass.value.trim()||document.getElementById('productionPass')?.value.trim()||(typeof facelessImagePasscode!=='undefined'?facelessImagePasscode:'')||(typeof facelessVoicePassword!=='undefined'?facelessVoicePassword:'');
  function textCredits(){return project.scenes.flatMap((s,i)=>s.stockCredit?['Escena '+(i+1)+': '+(s.stockCredit.title||'Foto')+' — '+(s.stockCredit.author||'Autor no indicado')+' · '+s.stockCredit.provider+' · '+s.stockCredit.sourceURL+' · '+s.stockCredit.license+' '+s.stockCredit.licenseURL]:[]).join('\n');}
  function refreshCredits(){credits.replaceChildren();project.scenes.forEach((s,i)=>{if(!s.stockCredit)return;const c=s.stockCredit,p=el('p');p.append(document.createTextNode('Escena '+(i+1)+' · '+(c.author||'Autor no indicado')+' · '),link(c.provider,c.sourceURL),document.createTextNode(' · '),link(c.license,c.licenseURL));credits.append(p);});copyButton.disabled=!textCredits();}
  copyButton.onclick=()=>copy(textCredits());refreshCredits();window.facelessRefreshStockCredits=()=>{if(root.isConnected)refreshCredits();};
  async function request(action,data,signal){const code=token();if(code.length<16)throw Error('Introduce el código privado de la página, el mismo que utilizas para generar fotos.');const r=await fetch(API+action,{method:'POST',headers:{'content-type':'application/json','x-app-token':code},body:JSON.stringify(data),signal});let result;try{result=await r.json()}catch{throw Error('El banco de fotos no devolvió una respuesta válida.');}if(!r.ok)throw Error(result.error||'No se pudo completar la petición.');return result;}
  async function apply(photo,chosenButton){
   if(facelessIsWorking())return;const index=Number(scene.value),signature=facelessImageSignature(project,index);window.facelessMediaBusy=true;chosenButton.disabled=true;
   status.textContent='Descargando la foto seleccionada…';
   try{
    const data=photo.localData||await request('import',{selection:photo.selection},AbortSignal.timeout(45000));
    if(current()?.id!==project.id||!root.isConnected||facelessImageSignature(project,index)!==signature)throw Error('El proyecto cambió. Busca y selecciona la foto de nuevo.');
    await facelessRestoreMedia(project);
    const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('No se pudo abrir la foto.'));image.src=data.dataURI;});
    image.facelessManual=true;image.facelessSignature=signature;image.facelessFilename='foto-'+data.credit.provider+'-'+data.credit.id+'.'+(data.dataURI.startsWith('data:image/png')?'png':data.dataURI.startsWith('data:image/webp')?'webp':'jpg');
    const stored=await facelessMediaPut(project.id+':image:'+index,{manual:true,signature,name:image.facelessFilename,dataURI:data.dataURI,credit:data.credit});
    facelessProjectPhotos(project.id).set(index,image);project.scenes[index].stockCredit=data.credit;persist();imgs=[];stopPreview();
    const video=document.getElementById('videoResult');if(video){video.pause();video.removeAttribute('src');video.load();video.classList.add('hidden');}
    if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}document.getElementById('previewCanvas')?.classList.remove('hidden');document.getElementById('downloadArea')?.replaceChildren();
    window.facelessRefreshPhotoSlots?.(project.id);refreshCredits();updatePreview();status.textContent='✓ Foto añadida a la escena '+(index+1)+'.'+(stored?'':' No pudo guardarse para otra sesión.');return true;
   }catch(error){status.textContent=String(error.message||error);}finally{window.facelessMediaBusy=false;chosenButton.disabled=false;window.facelessRefreshPhotoSlots?.(project.id);}
  }
  async function search(nextPage=1){
   if(facelessIsWorking())return;controller?.abort();controller=new AbortController();const operation=++ticket;loading=true;button.disabled=true;more.hidden=true;status.textContent='Buscando fotos…';grid.replaceChildren();
   try{
    const data=await request('search',{query:query.value.trim(),provider:source.value,page:nextPage},controller.signal);
    if(operation!==ticket||!root.isConnected)return;page=nextPage;
    for(const photo of data.results){const card=el('article','', 'stock-card'),img=el('img');img.src=safeURL(photo.thumbnail);img.alt=photo.title||'Fotografía';img.loading='lazy';img.referrerPolicy='no-referrer';const title=el('b',photo.title||'Sin título');const credit=el('p',(photo.author||'Autor no indicado')+' · '+photo.license,'smalltext');const links=el('div','', 'stock-links');links.append(link('Fuente · '+photo.provider,photo.sourceURL),link('Licencia',photo.licenseURL));const use=el('button','Usar esta foto','btn small');use.type='button';use.onclick=()=>apply(photo,use);card.append(img,title,credit,links,use);grid.append(card);}
    status.textContent=(data.notice?data.notice+' ':'')+(data.results.length?data.results.length+' fotos encontradas. Página '+page+'.':'No hay resultados. Prueba otras palabras.');more.hidden=!data.hasMore;
   }catch(error){if(error.name!=='AbortError'&&root.isConnected)status.textContent=String(error.message||error);}finally{if(operation===ticket){loading=false;button.disabled=false;}}
  }
  form.onsubmit=event=>{event.preventDefault();search(1);};more.onclick=()=>{if(!loading)search(page+1);};

 };
})();
