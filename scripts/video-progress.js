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
  let closeActive;

  window.facelessOpenVideoProgress = (retry) => {
    closeActive?.();
    const dialog = document.createElement('section');
    dialog.className = 'video-progress vp-inline';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'videoProgressTitle');
    dialog.innerHTML = `
      <button type="button" class="vp-close" aria-label="Cerrar">×</button>
      <span class="vp-check" aria-hidden="true" hidden>✓</span>
      <h2 id="videoProgressTitle">Creando tu video, espera un momento...</h2>
      <video class="vp-preview" aria-label="Vista previa del video" controls playsinline preload="metadata" hidden></video>
      <progress class="vp-meter" max="100" value="0" aria-label="Progreso del video"></progress>
      <p class="vp-status" role="status"></p>
      <form class="vp-access" hidden>
        <label>Código privado <input type="password" minlength="16" required autocomplete="new-password"></label>
        <button type="submit" class="vp-action">CONTINUAR</button>
      </form>
      <button type="button" class="vp-action vp-working" disabled>Creando... Por favor espera</button>
      <a class="vp-action vp-download" hidden>⬇️ DESCARGAR VIDEO</a>
      <button type="button" class="vp-preview-button" hidden>VER VISTA PREVIA</button>
    `;
    const find = (selector) => dialog.querySelector(selector);
    const title = find('h2');
    const preview = find('video');
    const meter = find('progress');
    const status = find('.vp-status');
    const action = find('.vp-working');
    const download = find('.vp-download');
    const play = find('.vp-preview-button');
    const access = find('.vp-access');
    const code = access.querySelector('input');
    let current = steps.read;

    let closed = false;
    const opener = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'vp-overlay';
    const background = [...document.body.children].filter(element => !element.inert);
    function close() {
      if (closed) return;
      closed = true;
      preview.pause();
      preview.removeAttribute('src');
      dialog.remove();
      overlay.remove();
      background.forEach(element => { element.inert = false; });
      if (closeActive === close) closeActive = null;
      if (opener?.isConnected && !opener.disabled) opener.focus();
    }
    find('.vp-close').onclick = close;
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab') return;
      const focusable = [...dialog.querySelectorAll('button, input, a[href], video[controls]')]
        .filter(element => !element.disabled && element.getClientRects().length);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    });
    play.onclick = async () => {
      try {
        if (preview.ended) preview.currentTime = 0;
        await preview.play();
      } catch {
        status.textContent = 'Pulsa ▶ en el reproductor. Si el navegador bloquea el video, puedes descargarlo y reproducirlo en tu dispositivo.';
      }
    };

    overlay.append(dialog);
    document.body.append(overlay);
    background.forEach(element => { element.inert = true; });
    closeActive = close;
    find('.vp-close').focus();
    return {
      requestAccess(continueWithCode) {
        title.textContent = 'Introduce tu código privado';
        status.textContent = 'Necesitas el código de Faceless para crear el video.';
        action.hidden = true;
        access.hidden = false;
        access.onsubmit = (event) => {
          event.preventDefault();
          const value = code.value.trim();
          if (value.length < 16) {
            status.textContent = 'El código debe tener al menos 16 caracteres.';
            return;
          }
          code.value = '';
          access.hidden = true;
          action.hidden = false;
          title.textContent = 'Creando tu video, espera un momento...';
          continueWithCode(value);
        };
        code.focus();
      },
      stage(key) {
        current = steps[key];
        meter.value = current[0];
        status.textContent = current[0] + '% · ' + current[1];
      },
      progress(message) {
        if (!closed) status.textContent = '85% · ' + message;
      },
      visibility(paused) {
        if (!closed) status.textContent = paused
          ? '85% · Montaje pausado. Vuelve a esta pestaña para continuar.'
          : '85% · ' + steps.render[1];
      },
      ready(file) {
        if (!file?.href || !/\.(mp4|webm)$/i.test(file.download)) {
          throw new Error('No se pudo preparar el archivo de video.');
        }
        if (closed) return;
        meter.value = 100;
        title.textContent = '¡Tu video está listo!';
        status.textContent = '100% · ' + file.download.split('.').pop().toUpperCase() + ' listo para descargar';
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
        if (closed) return;
        title.textContent = 'Hubo un error en ' + current[2] + ', inténtalo de nuevo';
        status.textContent = error.message || String(error);
        action.textContent = 'REINTENTAR';
        action.disabled = false;
        action.onclick = () => {
          action.disabled = true;
          close();
          retry();
        };
      },
    };
  };
})();
