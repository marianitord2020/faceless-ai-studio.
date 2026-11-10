/* Fotos IA de Faceless AI Studio.
 * Los secretos de los proveedores están en Cloudflare, nunca en este archivo.
 * Las imágenes y el código privado solo se guardan temporalmente en la memoria del navegador.
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
    // Leonardo genera de forma asíncrona. Consultar el MISMO trabajo evita cobrar otro.
    for (let n = 0; n < 20 && !facelessImageCancel; n++) {
      await new Promise(resolve => setTimeout(resolve, 1800));
      const result = await facelessFetchPhotoPoll(passcode, prompt, format, body.generationId);
      if (!result.pending) return result;
    }
    throw new Error('Leonardo no terminó a tiempo. Inténtalo después; no se inició una segunda generación.');
  }
  if (!body.dataURI || !/^data:image\/(jpeg|png|webp);base64,/.test(body.dataURI)) {
    throw new Error('La IA no devolvió una fotografía válida.');
  }
  return body;
}
async function facelessFetchPhotoPoll(passcode, prompt, format, generationId) {
  let response;
  try {
    response = await fetch(FACELESS_IMAGE_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-app-token': passcode },
      body: JSON.stringify({ prompt: prompt, format: format, generationId: generationId })
    });
  } catch (_) { throw new Error('No se pudo consultar la foto pendiente.'); }
  let data;
  try { data = await response.json(); } catch (_) { throw new Error('Respuesta no válida de Leonardo.'); }
  if (!response.ok) throw new Error(String(data.error || 'Error consultando Leonardo').slice(0, 350));
  if (!data.pending && (!data.dataURI || !/^data:image\/(jpeg|png|webp);base64,/.test(data.dataURI))) {
    throw new Error('Leonardo no devolvió imagen válida.');
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
    '<p class="smalltext">Modo inicial gratuito: Cloudflare Workers AI. Leonardo y Gemini se usarán solo si más adelante habilitas sus API de pago. Las fotos generadas quedan en esta sesión: descárgalas antes de cerrar la página.</p>';
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
    if(typeof persist==='function')persist();
  };


  function refreshGallery() {
    results.innerHTML = '';
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
  refreshGallery();
  stop.onclick = function () {
    facelessImageCancel = true;
    status.textContent = 'Terminando la foto actual y deteniendo la generación…';
  };
  start.onclick = async function () {
    if (facelessImageRunning) return;
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
        photoMap.set(i, photo);
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
      start.disabled = false;
      stop.style.display = 'none';
    }
  };
}
