/* Fotos IA de Faceless AI Studio.
 * Los secretos de los proveedores están en Cloudflare, nunca en este archivo.
 * Las imágenes se guardan en IndexedDB. El código privado permanece solo en memoria.
 */
'use strict';
const FACELESS_IMAGE_API = 'https://faceless-images.marianitord2020.workers.dev/images';
window.facelessSceneImages = new Map();
let facelessImagePasscode = '';
let facelessImageRunning = false;
let facelessImageCancel = false;

function facelessProjectPhotos(id) {
  if (!window.facelessSceneImages.has(id)) window.facelessSceneImages.set(id, new Map());
  return window.facelessSceneImages.get(id);
}
async function facelessFetchPhoto(passcode, prompt, format, generationId) {
  let response;
  try {
    response = await fetch(FACELESS_IMAGE_API, {
      method: 'POST',
      signal: typeof AbortSignal.timeout==='function'?AbortSignal.timeout(90000):undefined,
      headers: { 'content-type': 'application/json', 'x-app-token': passcode },
      body: JSON.stringify({ prompt: prompt, format: format, ...(generationId ? { generationId: generationId } : {}) })
    });
  } catch (_) {
    throw new Error('No se pudo conectar con el Worker de fotos. Comprueba que se haya publicado en Cloudflare.');
  }
  let body;
  try { body = await response.json(); }
  catch (_) { throw new Error('La API de fotos devolvió una respuesta no válida.'); }
  if (!response.ok) {
    if (response.status === 401) facelessImagePasscode = '';
    throw new Error(String(body.error || 'Error ' + response.status).slice(0, 350));
  }
  if (body.pending && body.generationId) {
    // Poll the same asynchronous job; never start a second generation while waiting.
    for (let n = 0; n < (body.generationId.startsWith('horde:')?120:20) && !facelessImageCancel; n++) {
      await new Promise(resolve => setTimeout(resolve, body.generationId.startsWith('horde:')?3000:1800));
      const result = await facelessFetchPhotoPoll(passcode, prompt, format, body.generationId);
      if (!result.pending) return result;
      if(body.generationId.startsWith('horde:')){const status=document.getElementById('aiPhotosStatus');if(status)status.textContent='AI Horde está preparando la foto en su cola comunitaria… Puedes detener el proceso.';}
    }
    if(body.generationId.startsWith('horde:')){
      await facelessFetchPhotoPoll(passcode,prompt,format,body.generationId,true).catch(()=>{});
      throw new Error(facelessImageCancel?'Generación detenida.':'AI Horde sigue en cola. Se solicitó cancelar el trabajo; puedes intentarlo más tarde.');
    }
    throw new Error('La IA no terminó a tiempo. No se inició una segunda generación.');
  }
  if (!body.dataURI || !/^data:image\/(jpeg|png|webp);base64,/.test(body.dataURI)) {
    throw new Error('La IA no devolvió una fotografía válida.');
  }
  return body;
}
async function facelessFetchPhotoPoll(passcode, prompt, format, generationId, cancelJob=false) {
  let response;
  try {
    response = await fetch(FACELESS_IMAGE_API, {
      method: 'POST',
      signal: typeof AbortSignal.timeout==='function'?AbortSignal.timeout(90000):undefined,
      headers: { 'content-type': 'application/json', 'x-app-token': passcode },
      body: JSON.stringify({ prompt: prompt, format: format, generationId: generationId, ...(cancelJob?{cancelJob:true}:{}) })
    });
  } catch (_) { throw new Error('No se pudo consultar la foto pendiente.'); }
  let data;
  try { data = await response.json(); } catch (_) { throw new Error('Respuesta no válida del proveedor de fotos.'); }
  if (!response.ok) throw new Error(String(data.error || 'Error consultando la foto').slice(0, 350));
  if (!data.cancelled && !data.pending && (!data.dataURI || !/^data:image\/(jpeg|png|webp);base64,/.test(data.dataURI))) {
    throw new Error('El proveedor no devolvió una imagen válida.');
  }
  return data;
}
function mountAIPhotoControls(project, updatePreview) {
  const root = document.querySelector('#tabBody .video-workspace > div');
  if (!root) return;
  const panel = document.createElement('section');
  panel.className = 'notice';
  panel.style.marginTop = '0';
  panel.innerHTML =
    '<h3 style="margin:0 0 8px">🖼 Fotografías automáticas con IA</h3>' +
    '<p>Una fotografía por escena a partir del guion. Las imágenes se utilizan en el video sin tener que subirlas manualmente.</p>' +
    '<label for="aiImageStyle" class="group-label" style="margin-top:14px">Estilo de imágenes del video</label>' +
    '<select id="aiImageStyle" style="margin-bottom:12px">' +
    '<option value="cinematic">Fotografía cinematográfica</option>' +
    '<option value="hyperreal">Hiperrealista</option>' +
    '<option value="3d">Animación 3D tipo Pixar</option>' +
    '<option value="2d">Ilustración 2D</option>' +
    '<option value="anime">Anime</option>' +
    '<option value="cartoon">Caricatura</option>' +
    '<option value="historical">Personajes reales / retrato histórico</option>' +
    '</select>' +
    '<p class="smalltext">Para figuras históricas como Napoleón generaremos recreaciones o ilustraciones; no las presentaremos como fotos documentales auténticas.</p>' +
    '<label for="aiPhotosPasscode" class="group-label" style="margin-top:14px">Código privado para las fotos</label>' +
    '<input id="aiPhotosPasscode" type="password" autocomplete="new-password" spellcheck="false" placeholder="APP_PASSCODE (el secreto de GitHub)" style="width:100%;margin-bottom:10px">' +
    '<p class="smalltext">Usa el mismo valor que guardaste como <b>APP_PASSCODE</b> en los secretos de GitHub. No es el token API de Cloudflare ni el código del Gemini de guiones.</p>' +
    '<button type="button" class="btn primary full" id="aiPhotosStart">✦ Generar fotos automáticamente</button>' +
    '<button type="button" class="btn small" id="aiPhotosStop" style="margin-top:8px;display:none">Detener después de esta foto</button>' +
    '<p id="aiPhotosStatus" class="status" role="status" aria-live="polite"></p>' +
    '<div id="aiPhotosResults" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:9px;margin-top:12px"></div>' +
    '<p class="smalltext">Modo inicial gratuito: Cloudflare Workers AI. Leonardo y Gemini se usarán solo si más adelante habilitas sus API de pago. Las fotos generadas se guardan en este navegador. Descárgalas también como respaldo.</p>';
  root.insertAdjacentElement('afterbegin', panel);
  const start = panel.querySelector('#aiPhotosStart');
  const stop = panel.querySelector('#aiPhotosStop');
  const status = panel.querySelector('#aiPhotosStatus');
  const results = panel.querySelector('#aiPhotosResults');
  const photoMap = facelessProjectPhotos(project.id);
  const imageStyleSelect=panel.querySelector('#aiImageStyle');
  imageStyleSelect.value=project.imageStyle||'cinematic';
  imageStyleSelect.onchange=()=>{
    project.imageStyle=imageStyleSelect.value;
    for(const [index,photo] of photoMap)if(!photo.facelessManual)photoMap.delete(index);refreshGallery();updatePreview();
    if(typeof persist==='function')persist();
  };


  function refreshGallery() {
    results.innerHTML = '';
    results.hidden=Boolean(document.getElementById('manualPhotoSlots'));
    window.facelessRefreshPhotoSlots?.(project.id);
    for (let i = 0; i < project.scenes.length; i++) {
      const photo = photoMap.get(i);
      if (!photo) continue;
      const item = document.createElement('div');
      item.style.cssText = 'border:1px solid #46516e;border-radius:10px;padding:6px;text-align:center;background:#0a1022';
      const image = document.createElement('img');
      image.src = photo.src;
      image.alt = 'Imagen generada para escena ' + (i + 1);
      image.style.cssText = 'display:block;width:100%;height:108px;object-fit:cover;border-radius:7px';
      const link = document.createElement('a');
      const format = photo.src.startsWith('data:image/png') ? '.png' : photo.src.startsWith('data:image/webp') ? '.webp' : '.jpg';
      link.href = photo.src;
      link.download = 'faceless-escena-' + (i + 1) + format;
      link.textContent = '↓ Escena ' + (i + 1);
      link.style.cssText = 'display:block;font-size:12px;margin-top:6px';
      item.appendChild(image);
      item.appendChild(link);
      results.appendChild(item);
    }
  }
  const hydration=facelessRestoreMedia(project).then(()=>{
    if(current()?.id===project.id && panel.isConnected){refreshGallery();updatePreview();updateAudioAttachmentUI()}
  });
  refreshGallery();
  stop.onclick = function () {
    facelessImageCancel = true;
    status.textContent = 'Terminando la foto actual y deteniendo la generación…';
  };
  start.onclick = async function () {
    await hydration;
    if (facelessImageRunning||window.facelessMediaBusy) return;
    // IMPORTANTE: el Worker de guiones y el de fotos tienen códigos distintos.
    // Nunca reutilizar geminiPass ni una clave API de otro servicio.
    const passInput = panel.querySelector('#aiPhotosPasscode');
    const newPass = passInput.value.trim();
    if (newPass) facelessImagePasscode = newPass;
    if (!facelessImagePasscode) {
      status.textContent = 'Introduce aquí el valor exacto del secreto APP_PASSCODE que guardaste en GitHub.';
      passInput.focus();
      return;
    }
    if (facelessImagePasscode.length < 16) {
      facelessImagePasscode = '';
      status.textContent = 'El código privado de fotos debe tener al menos 16 caracteres. No es una API Key.';
      passInput.focus();
      return;
    }
    const remaining = project.scenes.map((scene, index) => index).filter(index => !photoMap.has(index));
    if (!remaining.length) {
      status.textContent = 'Todas las escenas tienen foto. Descárgalas o úsalas en el video.';
      return;
    }
    facelessImageCancel = false;
    facelessImageRunning = true;
    start.disabled = true;
    imageStyleSelect.disabled=true;
    stop.style.display = '';
    let done = 0;
    try {
      for (const i of remaining) {
        if (facelessImageCancel) break;
        status.textContent = 'Generando foto ' + (done + 1) + ' de ' + remaining.length +
          ' (escena ' + (i + 1) + ')…';
        const scene = project.scenes[i];
        const visualPresets={
          cinematic:'Fotografía cinematográfica profesional, iluminación realista.',
          hyperreal:'Imagen hiperrealista con textura detallada y luz natural.',
          '3d':'Animación 3D cinematográfica colorida, personajes expresivos, acabado de película animada.',
          '2d':'Ilustración digital 2D cuidada, composición de ilustrador profesional.',
          anime:'Ilustración anime con iluminación atmosférica y detalles finos.',
          cartoon:'Caricatura ilustrada de gran calidad con colores vivos.',
          historical:'Recreación histórica artística respetuosa de la época y vestimenta, personajes reales reconocibles cuando corresponda, no fingir una fotografía histórica auténtica.'
        };
        const prompt = String(scene.prompt || ('Escena ' + (i + 1) + ': ' + scene.text + '. ' + project.topic)) +
          '. Tema exacto: '+project.topic+'. '+(visualPresets[imageStyleSelect.value]||visualPresets.cinematic)+
          ' Personajes y escenario consistentes entre escenas. Sin letras ni marcas de agua. ' +
          'Estilo narrativo: ' + project.style + '. Formato ' + project.format + '.';
        const data = await facelessFetchPhoto(facelessImagePasscode, prompt, project.format);
        const photo = new Image();
        await new Promise((resolve, reject) => {
          photo.onload = resolve;
          photo.onerror = () => reject(new Error('La imagen generada no se pudo abrir.'));
          photo.src = data.dataURI;
        });
        photo.facelessSignature=facelessImageSignature(project,i);
        photoMap.set(i, photo);
        if(!await facelessMediaPut(project.id+':image:'+i,{signature:photo.facelessSignature,dataURI:data.dataURI}))
          toast('No se pudo guardar esta foto en el dispositivo. Descárgala antes de cerrar.');
        done++;
        refreshGallery();
        updatePreview();
        status.textContent = 'Foto ' + done + ' de ' + remaining.length + ' lista (' + data.provider + ').';
      }
      if (facelessImageCancel) {
        status.textContent = 'Generación detenida. ' + done + ' foto(s) nuevas conservadas.';
      } else {
        status.textContent = '¡Fotografías listas! ' + photoMap.size + ' escenas con fotos IA. Ya están en el montaje del video.';
      }
    } catch (error) {
      const message = String(error.message || error);
      if (/código privado incorrecto|incorrecto|Error 401/i.test(message)) {
        facelessImagePasscode = '';
        const input = panel.querySelector('#aiPhotosPasscode');
        input.value = '';
        status.textContent = 'Código privado incorrecto. Escribe el valor de APP_PASSCODE guardado en GitHub (no el de Gemini ni el token de Cloudflare). Si no lo recuerdas, reemplázalo en GitHub y ejecuta nuevamente el despliegue.';
        input.focus();
      } else {
        status.textContent = 'Se guardaron ' + done + ' foto(s) nuevas. Error: ' + message;
      }
    } finally {
      facelessImageRunning = false;
      start.disabled = Boolean(window.facelessProductionBusy);
      imageStyleSelect.disabled=Boolean(window.facelessProductionBusy);
      stop.style.display = 'none';
    }
  };
}

// Generated media are stored per project; credentials never enter this database.
let facelessMediaDB;
const facelessRestoring=new Map();
function facelessOpenMedia(){
  if(!facelessMediaDB)facelessMediaDB=new Promise((resolve,reject)=>{
    const request=indexedDB.open('faceless-generated-media-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('media');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('El almacenamiento está ocupado en otra pestaña.'));
  }).catch(error=>{facelessMediaDB=null;throw error});
  return facelessMediaDB;
}
async function facelessMediaPut(key,value){
  try{
    const db=await facelessOpenMedia();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction('media','readwrite');
      tx.objectStore('media').put(value,key);
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });return true;
  }catch{return false}
}
async function facelessMediaDelete(key){
  try{
    const db=await facelessOpenMedia();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction('media','readwrite');tx.objectStore('media').delete(key);
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
  }catch{}
}
async function facelessMediaGet(key){
  const db=await facelessOpenMedia();
  return new Promise((resolve,reject)=>{
    const req=db.transaction('media','readonly').objectStore('media').get(key);
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
function facelessImageSignature(p,i){return JSON.stringify([p.format,p.imageStyle||'cinematic',p.topic,p.style,p.scenes[i]?.prompt,p.scenes[i]?.text])}
function facelessVoiceSignature(p){return JSON.stringify([p.duration,p.voicePreset||'automatic',p.voiceMood||'automatic',Number(p.voiceSpeed)||1,p.style,p.scenes.map(s=>[s.time,s.duration,s.text])])}
async function facelessRestoreMedia(p){
  if(facelessRestoring.has(p.id))return facelessRestoring.get(p.id);
  const task=(async()=>{
    const map=facelessProjectPhotos(p.id);
    for(let i=0;i<p.scenes.length;i++){
      const signature=facelessImageSignature(p,i),existing=map.get(i);
      if(existing?.facelessManual||existing?.facelessSignature===signature)continue;
      if(existing)map.delete(i);
      const stored=await facelessMediaGet(p.id+':image:'+i);
      if(!stored||(!stored.manual&&stored.signature!==signature))continue;
      const photo=new Image();
      await new Promise((resolve,reject)=>{photo.onload=resolve;photo.onerror=reject;photo.src=stored.dataURI});
      photo.facelessSignature=signature;photo.facelessManual=Boolean(stored.manual);photo.facelessFilename=stored.name||'';
      if(facelessImageSignature(p,i)===signature)map.set(i,photo);
    }
    const signature=facelessVoiceSignature(p),cached=generatedVoiceByProject.get(p.id);
    if(cached?.facelessSignature&&!cached.facelessManual&&cached.facelessSignature!==signature){
      generatedVoiceByProject.delete(p.id);
      if(audioFile===cached){audioFile=null;updateAudioAttachmentUI()}
    }
    if(!generatedVoiceByProject.has(p.id)){
      const stored=await facelessMediaGet(p.id+':voice');
      if((stored?.manual||stored?.signature===signature) && stored.blob instanceof Blob && facelessVoiceSignature(p)===signature){
        const file=new File([stored.blob],stored.name||'faceless-voz-'+p.id+'.wav',{type:stored.blob.type});
        file.facelessSignature=signature;file.facelessManual=Boolean(stored.manual);generatedVoiceByProject.set(p.id,file);
      }
    }
    if(current()?.id===p.id && (!audioFile || audioFileProjectId!==p.id)){
      audioFile=generatedVoiceByProject.get(p.id)||null;audioFileProjectId=p.id;
    }
    return true;
  })().catch(()=>{toast('No se pudo recuperar el guardado de medios. Puedes generar y descargar los archivos.');return false})
    .finally(()=>facelessRestoring.delete(p.id));
  facelessRestoring.set(p.id,task);return task;
}

function mountFacelessProduction(project){
  const root=document.querySelector('#tabBody .video-workspace > div');if(!root)return;
  const panel=document.createElement('section');panel.className='notice';
  panel.innerHTML='<h3>🎬 Crear el video completo</h3><p>Genera las fotos que faltan, añade la voz y monta el video. Puedes retomar si una etapa falla.</p>'+ 
    '<label class="group-label" for="productionPass">Código privado</label><input type="password" id="productionPass" autocomplete="off" placeholder="Tu código privado" style="width:100%;margin-bottom:12px">'+
    '<button type="button" class="btn primary full" id="productionStart">✦ Generar video completo</button>'+
    '<button type="button" class="btn small" id="productionStop" style="display:none;margin-top:10px">Detener</button>'+
    '<p id="productionStatus" role="status" aria-live="polite">Fotos y voz se guardan en este navegador. Mantén la página abierta durante el montaje.</p>';
  root.prepend(panel);
  const start=panel.querySelector('#productionStart'),stop=panel.querySelector('#productionStop'),status=panel.querySelector('#productionStatus');
  stop.onclick=()=>{
    window.facelessProductionCancelled=true;facelessImageCancel=true;facelessVoiceCancel=true;
    status.textContent='Deteniendo… Los medios terminados quedan guardados para retomar.';
  };
  start.onclick=async()=>{
    if(window.facelessMediaBusy||window.facelessProductionBusy||facelessImageRunning||facelessVoiceBusy||rendering)return;
    const pass=panel.querySelector('#productionPass').value.trim()||window.facelessProductionPasscode||facelessImagePasscode||facelessVoicePassword;
    if(!pass||pass.length<16){status.textContent='Introduce tu código privado de mínimo 16 caracteres.';panel.querySelector('#productionPass').focus();return}
    if(!safeMime(true)){status.textContent='Este navegador no permite exportar video con voz. Abre la página en Chrome actualizado.';return}
    window.facelessProductionBusy=true;window.facelessProductionCancelled=false;
    const controls=[...document.querySelectorAll('button,input,select,textarea')].filter(el=>el!==stop).map(el=>[el,el.disabled]);
    controls.forEach(([el])=>el.disabled=true);stop.style.display='';
    let wakeLock;
    try{
      // Start audio in the original tap, before network requests, for Android.
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      window.facelessProductionAudioContext=new AudioCtx();
      await window.facelessProductionAudioContext.resume();
      try{wakeLock=await navigator.wakeLock?.request('screen')}catch{}
      await facelessRestoreMedia(project);
      const cancelled=()=>{if(window.facelessProductionCancelled)throw Error('Proceso detenido. Pulsa Generar video completo para retomar.')};
      cancelled();
      facelessImagePasscode=pass;facelessVoicePassword=pass;
      document.getElementById('aiPhotosPasscode').value=pass;
      document.getElementById('aiVoicePasscode').value=pass;
      status.textContent='1 de 3 · Preparando las fotos de las escenas…';
      await document.getElementById('aiPhotosStart').onclick();
      cancelled();
      if(project.scenes.some((_,i)=>!facelessProjectPhotos(project.id).has(i)))
        throw Error(document.getElementById('aiPhotosStatus').textContent||'Faltan fotografías. Puedes retomar más tarde.');
      status.textContent='2 de 3 · Preparando la narración en español…';
      if(!audioFile || audioFileProjectId!==project.id)await document.getElementById('aiVoiceGenerate').onclick();
      cancelled();
      if(!audioFile||audioFileProjectId!==project.id)
        throw Error(document.getElementById('aiVoiceStatus').textContent||'No se pudo generar la narración.');
      status.textContent='3 de 3 · Montando el video con voz. Mantén esta página abierta…';
      await renderVideo();cancelled();
      if(!document.querySelector('#downloadArea a'))throw Error(document.getElementById('renderStatus').textContent||'No se pudo montar el video.');
      status.textContent='✓ Video completo listo. Reprodúcelo y pulsa Descargar video.';
      document.getElementById('downloadArea').scrollIntoView({behavior:'smooth',block:'center'});
    }catch(error){status.textContent=String(error.message||error)+' Las fotos y voces terminadas se reutilizarán al retomar.'}
    finally{
      if(window.facelessProductionAudioContext)await window.facelessProductionAudioContext.close().catch(()=>{});
      window.facelessProductionAudioContext=null;
      if(wakeLock)await wakeLock.release().catch(()=>{});
      window.facelessProductionBusy=false;stop.style.display='none';
      controls.forEach(([el,disabled])=>el.disabled=disabled);
      updateAudioAttachmentUI();
    }
  };
}

