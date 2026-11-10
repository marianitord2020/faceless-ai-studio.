/* Voces IA en español para Faceless AI Studio — integración con el video. */
'use strict';
const FACELESS_VOICE_API = 'https://faceless-images.marianitord2020.workers.dev/voice';
let facelessVoicePassword = '';
let facelessVoiceBusy = false;
let facelessVoiceCancel = false;
let facelessVoiceURL = null;

function facelessDecodeURI(dataURI) {
  const match = /^data:(audio\/[\w+.-]+(?:;[^,]+)?);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(dataURI || '');
  if (!match) throw new Error('El servidor no devolvió audio válido.');
  const raw = atob(match[2]);
  const bytes = new Uint8Array(raw.length);
  for (let k = 0; k < raw.length; k++) bytes[k] = raw.charCodeAt(k);
  return bytes.buffer;
}
async function facelessRequestVoice(text, voice, passcode, style) {
  let response;
  try {
    response = await fetch(FACELESS_VOICE_API, {
      method: 'POST',
      signal: typeof AbortSignal.timeout==='function'?AbortSignal.timeout(90000):undefined,
      headers: { 'content-type': 'application/json', 'x-app-token': passcode },
      body: JSON.stringify({ text, voice, style })
    });
  } catch (_) { throw new Error('No se pudo conectar con Cloudflare para generar la voz.'); }
  let json;
  try { json = await response.json(); }
  catch (_) { throw new Error('La API de voz no devolvió una respuesta válida.'); }
  if (!response.ok) {
    if (response.status === 401) facelessVoicePassword = '';
    throw new Error(String(json.error || 'Error ' + response.status).slice(0, 330));
  }
  if (!json.dataURI) throw new Error('El servidor no devolvió voz.');
  return json;
}
function facelessAudioToWAV(rendered) {
  const samples = rendered.getChannelData(0);
  const rate = rendered.sampleRate;
  const result = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(result);
  const word = (index, text) => { for (let k = 0; k < text.length; k++) view.setUint8(index + k, text.charCodeAt(k)); };
  word(0, 'RIFF'); view.setUint32(4, result.byteLength - 8, true);
  word(8, 'WAVE'); word(12, 'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  word(36, 'data'); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, v < 0 ? Math.round(v * 32768) : Math.round(v * 32767), true);
  }
  return new Blob([result], { type: 'audio/wav' });
}
function facelessStopOldVoicePlayback(panel) {
  // Los elementos de audio extraídos del DOM pueden seguir sonando en Android.
  const oldPlayer = panel.querySelector('#aiVoiceAudioArea audio');
  if (oldPlayer) { oldPlayer.pause(); oldPlayer.removeAttribute('src'); oldPlayer.load(); }
  const exported = document.getElementById('videoResult');
  if (exported) { exported.pause(); exported.removeAttribute('src'); exported.load(); exported.classList.add('hidden'); }
  const microphone = document.getElementById('micPlayback');
  if (microphone) microphone.pause();
  if (typeof stopPreview === 'function') stopPreview();
}
function facelessRemovePriorVoice(project, panel) {
  facelessStopOldVoicePlayback(panel);
  const oldGallery = panel.querySelector('#aiVoiceAudioArea');
  if (oldGallery) oldGallery.replaceChildren();
  if (facelessVoiceURL) { URL.revokeObjectURL(facelessVoiceURL); facelessVoiceURL = null; }
  // La generación siempre SUSTITUYE la narración anterior, nunca las mezcla.
  const oldGenerated = generatedVoiceByProject.get(project.id);
  generatedVoiceByProject.delete(project.id);
  facelessMediaDelete(project.id+':voice');
  if (audioFileProjectId === project.id && oldGenerated && audioFile === oldGenerated) {
    audioFile = null;
  }
  const oldDownload = document.getElementById('downloadArea');
  if (oldDownload) oldDownload.replaceChildren();
  const oldCanvas = document.getElementById('previewCanvas');
  if (oldCanvas) oldCanvas.classList.remove('hidden');
  if (previewURL) { URL.revokeObjectURL(previewURL); previewURL = null; }
  if (typeof updateAudioAttachmentUI === 'function') updateAudioAttachmentUI();
}
function mountAIVoiceControls(project) {
  const root = document.querySelector('#tabBody .video-workspace > div');
  if (!root) return;
  const panel = document.createElement('section');
  panel.className = 'notice';
  panel.style.marginTop = '12px';
  panel.innerHTML =
    '<h3 style="margin:0 0 8px">🎙 Narración automática en español</h3>' +
    '<p>Convierte el guion en voz IA, une las escenas y añade el audio al video. Sin grabar con micrófono.</p>' +
    '<label class="group-label" for="aiVoiceOption">Voz para narración</label>' +
    '<select id="aiVoiceOption" style="margin-bottom:12px"><option value="automatic">✦ Automática según el relato</option>' +
    '<option value="Fola">Fola (Google, cálida y versátil)</option>' +
    '<option value="Kore">Kore (Google, firme y clara)</option>' +
    '<option value="Aoede">Aoede (Google, suave y narrativa)</option>' +
    '<option value="Puck">Puck (Google, dinámica)</option>' +
    '<option value="Charon">Charon (Google, documental)</option>' +
    '<option value="Leda">Leda (Google, juvenil)</option>' +
    '<option value="Zephyr">Zephyr (Google, expresiva)</option>' +
    '<option value="female">Español: Celeste (Cloudflare)</option>' +
    '<option value="male">Español: Álvaro (Cloudflare)</option></select>' +
    '<label class="group-label" for="aiVoiceMood">Interpretación</label>' +
    '<select id="aiVoiceMood" style="margin-bottom:12px">' +
    '<option value="automatic">Automática según la categoría</option>' +
    '<option value="news">Noticiero profesional</option>' +
    '<option value="suspense">Misterio y suspenso</option>' +
    '<option value="romantic">Emotiva y romántica</option>' +
    '<option value="documentary">Documental histórico</option>' +
    '<option value="entertainment">Farándula y entretenimiento</option>' +
    '<option value="energetic">Motivadora y enérgica</option>' +
    '<option value="neutral">Neutra e informativa</option></select>' +
    '<label class="group-label" for="aiVoiceSpeed">Velocidad de narración</label>' +
    '<select id="aiVoiceSpeed" style="margin-bottom:12px">' +
    '<option value="0.9">Pausada (0.9×)</option>' +
    '<option value="1" selected>Normal (1×)</option>' +
    '<option value="1.1">Ágil (1.1×)</option></select>' +
    '<label for="aiVoicePasscode" class="group-label">Código privado de Cloudflare</label>' +
    '<input type="password" id="aiVoicePasscode" autocomplete="new-password" placeholder="El mismo APP_PASSCODE que usas para las fotos" style="width:100%;margin-bottom:12px">' +
    '<button type="button" class="btn primary full" id="aiVoiceGenerate">🎙 Generar voz automáticamente</button>' +
    '<button type="button" class="btn small" id="aiVoiceCancel" style="display:none;margin-top:8px">Detener después de esta escena</button>' +
    '<p id="aiVoiceStatus" class="status" role="status" aria-live="polite"></p>' +
    '<div id="aiVoiceAudioArea"></div>' +
    '<p class="smalltext">Los audios se guardan en este navegador; descárgalos como respaldo. La voz de Google usa su cuota gratuita cuando tengas una API Key habilitada; Cloudflare es la alternativa. Ninguna suscripción se activa automáticamente.</p>';
  const photosPanel = root.querySelector('#aiPhotosStart');
  if (photosPanel) photosPanel.closest('section').insertAdjacentElement('afterend', panel);
  else root.insertAdjacentElement('afterbegin', panel);
  const passwordInput = panel.querySelector('#aiVoicePasscode');
  const status = panel.querySelector('#aiVoiceStatus');
  const start = panel.querySelector('#aiVoiceGenerate');
  const cancel = panel.querySelector('#aiVoiceCancel');
  const audioArea = panel.querySelector('#aiVoiceAudioArea');
  if (audioFile && /^faceless-voz-/.test(audioFile.name)) {
    status.textContent = 'La voz IA ya está cargada en este proyecto. Puedes descargarla o crear el video.';
  }
  const voiceSelect = panel.querySelector('#aiVoiceOption');
  const voiceByGenre={
    Noticias:{voice:'Charon',mood:'news'},
    Misterio:{voice:'Charon',mood:'suspense'},
    Historia:{voice:'Kore',mood:'documentary'},
    Romance:{voice:'Aoede',mood:'romantic'},
    Farándula:{voice:'Zephyr',mood:'entertainment'},
    Curiosidades:{voice:'Puck',mood:'neutral'},
    Motivación:{voice:'Fola',mood:'energetic'},
    Educativo:{voice:'Fola',mood:'neutral'}
  };
  const preset=voiceByGenre[project.style]||{voice:'Fola',mood:'neutral'};
  const moodSelect=panel.querySelector('#aiVoiceMood');
  const speedSelect=panel.querySelector('#aiVoiceSpeed');
  voiceSelect.value=project.voicePreset||'automatic';
  moodSelect.value=project.voiceMood||'automatic';
  speedSelect.value=String(project.voiceSpeed||1);
  const voicePreview=panel.querySelector('p.smalltext');
  const note=document.createElement('p');
  note.className='smalltext';
  note.textContent='Sugerencia para '+project.style+': voz '+preset.voice+' con interpretación '+preset.mood+'. Puedes cambiarla sin duplicar audios.';
  voiceSelect.insertAdjacentElement('afterend',note);

  const stopVoiceOnChange=()=>{
    if (facelessVoiceBusy) { facelessVoiceCancel=true; return; }
    facelessRemovePriorVoice(project,panel);
    status.textContent='El audio anterior fue eliminado. Genera la nueva voz para sustituirlo.';
  };
  moodSelect.onchange=()=>{
    project.voiceMood=moodSelect.value;
    if(typeof persist==='function')persist();
    stopVoiceOnChange();
  };
  speedSelect.onchange=()=>{
    project.voiceSpeed=Number(speedSelect.value)||1;
    if(typeof persist==='function')persist();
    stopVoiceOnChange();
  };
  voiceSelect.onchange = () => {
    project.voicePreset=voiceSelect.value;
    if(typeof persist==='function')persist();
    if (facelessVoiceBusy) {
      facelessVoiceCancel = true;
      status.textContent = 'Cambio de voz solicitado: cancelando generación anterior…';
      return;
    }
    facelessRemovePriorVoice(project, panel);
    status.textContent = 'Voz anterior detenida y eliminada. Pulsa Generar voz para escuchar solo la voz seleccionada.';
  };
  cancel.onclick = () => { facelessVoiceCancel = true; status.textContent = 'Deteniendo después de esta escena…'; };
  start.onclick = async () => {
    if (facelessVoiceBusy) return;
    await facelessRestoreMedia(project);
    if (facelessVoiceBusy) return;
    const pass = passwordInput.value.trim();
    if (pass) facelessVoicePassword = pass;
    if (!facelessVoicePassword || facelessVoicePassword.length < 16) {
      status.textContent = 'Introduce el código APP_PASSCODE de mínimo 16 caracteres, el mismo que utilizaste para las fotos.';
      passwordInput.focus();
      return;
    }
    const voice = voiceSelect.value==='automatic'?preset.voice:voiceSelect.value;
    const mood=moodSelect.value==='automatic'?preset.mood:moodSelect.value;
    const speed=Number(speedSelect.value)||1;
    if (!project.scenes?.length) { status.textContent = 'Este proyecto no tiene escenas.'; return; }
    // Antes de generar una nueva voz, eliminar y detener TODO el audio antiguo.
    facelessRemovePriorVoice(project, panel);
    facelessVoiceBusy = true;
    facelessVoiceCancel = false;
    start.disabled = true;
    voiceSelect.disabled = true;
    cancel.style.display = '';
    let audioCtx;
    let completed = 0;
    try {
      const segments = [];
      audioCtx = window.facelessProductionAudioContext || new (window.AudioContext || window.webkitAudioContext)();
      await audioCtx.resume();
      for (const [index, scene] of project.scenes.entries()) {
        if (facelessVoiceCancel) throw new Error('Generación cancelada, sin modificar el audio anterior.');
        const text = String(scene.text || '').trim();
        if (!text) continue;
        if (text.length > 650) throw new Error('La escena ' + (index + 1) + ' supera 650 caracteres. Acorta su texto antes de generar voz.');
        status.textContent = 'Generando voz IA: escena ' + (index + 1) + ' de ' + project.scenes.length + '…';
        const segmentKey=project.id+':voice-segment:'+index;
        const segmentSignature=JSON.stringify([text,voice,mood]);
        let cached;
        try{cached=await facelessMediaGet(segmentKey)}catch{}
        const result=cached?.signature===segmentSignature?cached.result:
          await facelessRequestVoice(text, voice, facelessVoicePassword, mood);
        if(cached?.signature!==segmentSignature)
          await facelessMediaPut(segmentKey,{signature:segmentSignature,result});
        let decoded;
        try { decoded = await audioCtx.decodeAudioData(facelessDecodeURI(result.dataURI)); }
        catch (_) { throw new Error('No se pudo interpretar el audio de la escena ' + (index + 1) + '.'); }
        segments.push({time:Number(scene.time)||0, duration:Number(scene.duration)||0, audio:decoded, provider:result.provider});
        completed++;
      }
      if (facelessVoiceCancel) throw new Error('Generación anterior cancelada. Selecciona la voz y pulsa Generar otra vez.');
      if (!segments.length) throw new Error('No hay escenas con texto para narrar.');
      status.textContent = 'Uniendo ' + segments.length + ' escenas de voz y preparando el video…';
      const duration = Number(project.duration) || 30;
      const sampleRate = 24000;
      const offline = new OfflineAudioContext(1, Math.ceil(duration * sampleRate), sampleRate);
      let clipped = 0;
      for (const segment of segments) {
        const source = offline.createBufferSource();
        source.buffer = segment.audio;
        source.playbackRate.value=speed;
        source.connect(offline.destination);
        const available = Math.max(0, Math.min(segment.duration, duration - segment.time));
        if (segment.audio.duration/speed > available + 0.12) clipped++;
        if (available > 0) source.start(segment.time, 0, Math.min(available*speed, segment.audio.duration));
      }
      const mixed = await offline.startRendering();
      const blob = facelessAudioToWAV(mixed);
      audioFile = new File([blob], 'faceless-voz-' + project.id + '.wav', {type:'audio/wav'});
      audioFileProjectId = project.id;
      generatedVoiceByProject.set(project.id, audioFile);
      audioFile.facelessSignature=facelessVoiceSignature(project);
      if(!await facelessMediaPut(project.id+':voice',{signature:audioFile.facelessSignature,blob:audioFile,name:audioFile.name}))
        toast('No se pudo guardar la voz en el dispositivo. Descárgala antes de cerrar.');
      updateAudioAttachmentUI();
      // Si el video ya estaba exportado, marcarlo como anterior a la nueva voz.
      const oldVideo = document.getElementById('videoResult');
      if (oldVideo) { oldVideo.pause(); oldVideo.classList.add('hidden'); oldVideo.removeAttribute('src'); oldVideo.load(); }
      const canvasPreview = document.getElementById('previewCanvas');
      if (canvasPreview) canvasPreview.classList.remove('hidden');
      const downloadOld = document.getElementById('downloadArea');
      if (downloadOld) downloadOld.replaceChildren();
      if (previewURL) { URL.revokeObjectURL(previewURL); previewURL = null; }
      if (facelessVoiceURL) URL.revokeObjectURL(facelessVoiceURL);
      facelessVoiceURL = URL.createObjectURL(blob);
      audioArea.replaceChildren();
      const player = document.createElement('audio');
      player.controls = true;
      player.src = facelessVoiceURL;
      player.style.cssText = 'display:block;width:100%;margin:10px 0';
      const link = document.createElement('a');
      link.href = facelessVoiceURL;
      link.download = audioFile.name;
      link.textContent = '↓ Descargar narración WAV';
      link.className = 'btn small';
      audioArea.append(player, link);
      status.textContent = '✓ Voz lista e incorporada al proyecto. Pulsa «Crear y descargar video CON VOZ» para exportar el video narrado. ' +
        (clipped ? 'Aviso: ' + clipped + ' escenas tenían voz más larga que su tiempo asignado y se recortaron. Ajusta el guion para sincronizar.' : 'Las escenas respetan sus tiempos.') +
        ' Voz: '+voice+'. Estilo: '+mood+'. Velocidad: '+speed+'×. Fuente: ' + [...new Set(segments.map(s=>s.provider))].join(', ');
    } catch (error) {
      const msg = String(error?.message || error);
      if (/código privado incorrecto/i.test(msg)) {
        passwordInput.value = '';
        facelessVoicePassword = '';
        status.textContent = 'Código privado incorrecto. Usa el APP_PASSCODE de las fotos, no tu API Key.';
      } else status.textContent = 'Voz no generada: ' + msg;
    } finally {
      if (audioCtx && audioCtx!==window.facelessProductionAudioContext) await audioCtx.close().catch(()=>{});
      start.disabled = Boolean(window.facelessProductionBusy);
      voiceSelect.disabled = Boolean(window.facelessProductionBusy);
      cancel.style.display = 'none';
      facelessVoiceBusy = false;
    }
  };
}

