/* Compact editor: moves the existing controls without replacing their handlers. */
window.facelessCompactVideoEditor = function (project) {
  const byId = id => document.getElementById(id);
  const root = document.querySelector('#tabBody .video-workspace');
  if (!root) return;
  const shell = root.parentElement;
  const panels = ['productionStart','aiPhotosStart','aiVoiceGenerate'].map(id => byId(id).closest('section'));
  const titles = ['Video automático sin créditos','Fotografías automáticas con IA','Narración automática en español'];
  const icons = ['▹','▧','◉'];
  const custom = panels.map((panel, i) => {
    panel.className = 'editor-video-card'; panel.id = ['videoAutoCard','videoPhotosCard','videoVoiceCard'][i];
    panel.removeAttribute('style');
    panel.querySelectorAll('h3,p:not([id])').forEach(el => el.remove());
    const header = document.createElement('div'); header.className = 'editor-card-heading';
    const icon = document.createElement('span'); icon.className = 'editor-card-icon'; icon.textContent = icons[i]; icon.setAttribute('aria-hidden','true');
    const text = document.createElement('div'); const title = document.createElement('h3'); title.textContent = titles[i]; text.append(title);
    if(i) { const caption = document.createElement('span'); caption.id = i===1?'editorPhotoStyle':'editorVoiceSummary'; caption.className='editor-card-caption'; caption.textContent=i===1?'Cinematográfica':'Automática según el relato'; text.append(caption); }
    header.append(icon,text); panel.prepend(header);
    const details = document.createElement('details'); details.className = 'editor-personalize';
    const summary = document.createElement('summary'); summary.textContent='⚙ Personalizar'; details.append(summary); panel.append(details);
    details.addEventListener('toggle',()=>{if(details.open)custom.forEach(other=>{if(other!==details)other.open=false;});});
    return details;
  });
  const move = (id, destination, label=false) => {
    const node=byId(id); if(!node)return;
    if(label){const el=document.querySelector(`label[for="${id}"]`);if(el)destination.append(el);}
    destination.append(node);
  };
  const advanced=document.createElement('details'); advanced.className='editor-advanced'; advanced.id='editorAdvanced';
  advanced.innerHTML='<summary>Avanzado <span aria-hidden="true">⌄</span></summary>';
  custom[0].append(advanced); move('productionPass',advanced,true);
  move('aiImageStyle',custom[1],true);
  ['aiVoiceOption','aiVoiceMood','aiVoiceSpeed'].forEach(id=>move(id,custom[2],true));
  ['aiPhotosPasscode','aiVoicePasscode'].forEach(id=>{document.querySelector(`label[for="${id}"]`)?.remove();byId(id).hidden=true;});
  custom[1].append(byId('images').closest('.media-upload-group'));
  ['imageCount','manualPhotoSlots','aiPhotosResults'].forEach(id=>move(id,custom[1]));
  custom[2].append(byId('audio').closest('.media-upload-group'));
  ['audioCount','audioAttachment','audioSyncStatus','aiVoiceAudioArea'].forEach(id=>move(id,custom[2]));
  const recorder=byId('startMic').closest('.record-panel');
  recorder.querySelectorAll('b,p:not([id])').forEach(el=>el.remove());byId('micStatus').textContent='';custom[2].append(recorder);
  byId('audioAttachment').querySelectorAll('p:not([id])').forEach(el=>el.remove());
  shell.querySelectorAll('.media-upload-copy small').forEach(el=>el.remove());
  const frame=root.querySelector('.media-frame');frame.hidden=true;custom[0].append(frame);move('downloadArea',custom[0]);
  const toolbar=document.createElement('div');toolbar.className='editor-export-bar';
  move('previewVideo',toolbar);move('renderVideo',toolbar);move('renderStatus',toolbar);
  const cards=document.createElement('div');cards.className='editor-video-cards';panels.forEach(panel=>cards.append(panel));
  shell.className='compact-video-editor';shell.replaceChildren(cards,toolbar);
  byId('productionStart').textContent='Crear video completo';
  byId('aiPhotosStart').textContent='Generar fotos automáticamente';
  byId('aiPhotosStart').className='btn outline full';
  byId('aiVoiceGenerate').textContent='Generar voz automáticamente';
  byId('previewVideo').textContent='Vista previa';byId('renderVideo').textContent='Crear y descargar video';
  byId('productionStatus').textContent='';
  const style=byId('aiImageStyle');const refreshStyle=()=>{byId('editorPhotoStyle').textContent=style.value==='cinematic'?'Cinematográfica':style.selectedOptions[0].textContent;};refreshStyle();style.addEventListener('change',refreshStyle);
  const voice=byId('aiVoiceOption');const refreshVoice=()=>{byId('editorVoiceSummary').textContent=voice.value==='automatic'?'Automática según el relato':voice.selectedOptions[0].textContent.split(' (')[0];};refreshVoice();voice.addEventListener('change',refreshVoice);
  const help=document.createElement('button');help.type='button';help.className='editor-help';help.textContent='?';help.setAttribute('aria-label','Información sobre las fotografías');help.setAttribute('aria-expanded','false');
  const tooltip=document.createElement('span');tooltip.className='editor-tooltip';tooltip.hidden=true;tooltip.id='editorPhotoHelp';tooltip.textContent='Una imagen por escena. Se usa la cuota disponible del proveedor conectado. Los retratos históricos son recreaciones. Guarda una copia de tus fotos.';
  help.setAttribute('aria-controls',tooltip.id);help.title=tooltip.textContent;help.onclick=()=>{tooltip.hidden=!tooltip.hidden;help.setAttribute('aria-expanded',String(!tooltip.hidden));};panels[1].querySelector('.editor-card-heading').append(help);panels[1].querySelector('.editor-card-heading').after(tooltip);
  const code=byId('productionPass');
  code.value=window.facelessProductionPasscode||(typeof facelessImagePasscode==='string'?facelessImagePasscode:'')||(typeof facelessVoicePassword==='string'?facelessVoicePassword:'')||'';
  const shareCode=()=>{['aiPhotosPasscode','aiVoicePasscode'].forEach(id=>{byId(id).value=code.value;});};code.addEventListener('input',shareCode);shareCode();
  ['productionStart','aiPhotosStart','aiVoiceGenerate'].forEach(id=>{
    const button=byId(id), original=button.onclick;
    button.onclick=async function(event){
      shareCode();
      if(code.value.trim().length<16){custom[0].open=true;advanced.open=true;code.focus();byId('productionStatus').textContent='Introduce tu código privado.';return;}
      return original.call(this,event);
    };
  });
  const showPreview=()=>{custom[0].open=true;frame.hidden=false;};
  const preview=byId('previewVideo'), originalPreview=preview.onclick;
  preview.onclick=function(event){showPreview();frame.scrollIntoView({block:'nearest',behavior:'smooth'});return originalPreview.call(this,event);};
  const observer=new MutationObserver(()=>{if(!byId('videoResult')?.classList.contains('hidden')||byId('downloadArea')?.querySelector('a'))showPreview();});
  observer.observe(byId('videoResult'),{attributes:true,attributeFilter:['class']});observer.observe(byId('downloadArea'),{childList:true});
  window.facelessEditorObserver?.disconnect();window.facelessEditorObserver=observer;
};
