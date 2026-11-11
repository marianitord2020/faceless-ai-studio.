(() => {
  'use strict';

  const steps = {
    read: [10, 'Leyendo tu relato...', 'la lectura del relato'],
    script: [20, 'Comprobando tu guión...', 'la preparación del guion'],
    photos: [40, 'Generando fotos con IA...', 'la generación de fotos'],
    voice: [60, 'Generando voz...', 'la generación de voz'],
    captions: [70, 'Generando voz... Añadiendo subtítulos...', 'la sincronización de subtítulos'],
    render: [85, 'Uniendo video, voz y subtítulos...', 'el montaje del video'],
  };
  let activeDialog;

  window.facelessOpenVideoProgress = (retry) => {
    if (activeDialog?.open) activeDialog.close();
    const dialog = document.createElement('dialog');
    dialog.className = 'video-progress';
    dialog.setAttribute('aria-labelledby', 'videoProgressTitle');
    dialog.innerHTML = `
      <button type="button" class="vp-close" aria-label="Cerrar">×</button>
      <span class="vp-check" aria-hidden="true" hidden>✓</span>
      <h2 id="videoProgressTitle">Creando tu video, espera un momento...</h2>
      <video class="vp-preview" aria-label="Vista previa del video" controls playsinline preload="metadata" hidden></video>
      <progress class="vp-meter" max="100" value="0" aria-label="Progreso del video"></progress>
      <p class="vp-status" role="status"></p>
      <button type="button" class="vp-action" disabled>Creando... Por favor espera</button>
      <a class="vp-action vp-download" hidden>⬇️ DESCARGAR VIDEO</a>
      <button type="button" class="vp-preview-button" hidden>VER VISTA PREVIA</button>
    `;
    const find = (selector) => dialog.querySelector(selector);
    const title = find('h2');
    const preview = find('video');
    const meter = find('progress');
    const status = find('.vp-status');
    const action = find('button.vp-action');
    const download = find('.vp-download');
    const play = find('.vp-preview-button');
    let current = steps.read;

    find('.vp-close').onclick = () => dialog.close();
    dialog.addEventListener('close', () => {
      preview.pause();
      preview.removeAttribute('src');
      dialog.remove();
      if (activeDialog === dialog) activeDialog = null;
    }, { once: true });
    play.onclick = () => {
      preview.focus();
      preview.play().catch(() => { status.textContent = 'Pulsa play en la vista previa.'; });
    };

    document.body.append(dialog);
    activeDialog = dialog;
    dialog.showModal();
    return {
      stage(key) {
        current = steps[key];
        meter.value = current[0];
        status.textContent = current[0] + '% · ' + current[1];
      },
      ready(file) {
        if (!file?.href || !file.download.toLowerCase().endsWith('.mp4')) {
          throw new Error('No se pudo preparar el archivo MP4.');
        }
        if (!dialog.open) return;
        meter.value = 100;
        title.textContent = '¡Tu video está listo!';
        status.textContent = '100% · MP4 listo para descargar';
        find('.vp-check').hidden = false;
        preview.src = file.href;
        preview.hidden = false;
        download.href = file.href;
        download.download = file.download;
        download.hidden = false;
        play.hidden = false;
        action.hidden = true;
      },
      fail(error) {
        if (!dialog.open) return;
        title.textContent = 'Hubo un error en ' + current[2] + ', inténtalo de nuevo';
        status.textContent = error.message || String(error);
        action.textContent = 'REINTENTAR';
        action.disabled = false;
        action.onclick = () => {
          action.disabled = true;
          dialog.close();
          retry();
        };
      },
    };
  };
})();
