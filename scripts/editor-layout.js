/* Compact editor: moves the existing controls without replacing their handlers. */
window.facelessCompactVideoEditor = function (project) {
  const byId = id => document.getElementById(id);
  const root = document.querySelector('#tabBody .video-workspace');
  if (!root) return;
  if(window.facelessFlow==='manual'){window.facelessManualLayout(project,root);return;}
  const shell = root.parentElement;
  const panels = ['productionStart','aiPhotosStart','aiVoiceGenerate'].map(id => byId(id).closest('section'));
  const titles = ['Video completo con IA','Fotografías automáticas con IA','Narración automática en español'];
  const icons = [
    '<rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3M8 9l4 3-4 3Z"/>',
    '<path d="M8 6 9.5 3h5L16 6h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/>',
    '<path d="M5 4a14 14 0 0 0 0 16M8 7a9 9 0 0 0 0 10M19 4a14 14 0 0 1 0 16M16 7a9 9 0 0 1 0 10M12 9v6"/>'
  ];
  const custom = panels.map((panel, i) => {
    panel.className = 'editor-video-card'; panel.id = ['videoAutoCard','videoPhotosCard','videoVoiceCard'][i];
    panel.removeAttribute('style');
    panel.querySelectorAll('h3,p:not([id])').forEach(el => el.remove());
    const header = document.createElement('div'); header.className = 'editor-card-heading';
    const icon = document.createElement('span'); icon.className = 'editor-card-icon'; icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+icons[i]+'</svg>'; icon.setAttribute('aria-hidden','true');
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
  const infrastructure=document.createElement('div');infrastructure.hidden=true;infrastructure.id='manualInfrastructure';shell.append(infrastructure);
  infrastructure.append(byId('images').closest('.media-upload-group'));
  ['imageCount','manualPhotoSlots','stockPhotos'].forEach(id=>move(id,infrastructure));move('aiPhotosResults',custom[1]);
  infrastructure.append(byId('audio').closest('.media-upload-group'));
  ['audioCount','audioAttachment','syncAudio','audioSyncStatus','cancelLocalSpeech'].forEach(id=>move(id,infrastructure));move('aiVoiceAudioArea',custom[2]);
  const recorder=byId('startMic').closest('.record-panel');
  recorder.querySelectorAll('b,p:not([id])').forEach(el=>el.remove());byId('micStatus').textContent='';infrastructure.append(recorder);
  byId('audioAttachment').querySelectorAll('p:not([id])').forEach(el=>el.remove());
  shell.querySelectorAll('.media-upload-copy small').forEach(el=>el.remove());
  const frame=root.querySelector('.media-frame');frame.hidden=false;frame.classList.add('fc-editor-stage');move('downloadArea',custom[0]);
  const toolbar=document.createElement('div');toolbar.className='editor-export-bar';
  move('previewVideo',toolbar);move('renderVideo',toolbar);
  const cards=document.createElement('div');cards.className='editor-video-cards';panels.forEach(panel=>cards.append(panel));
  shell.className='compact-video-editor';shell.replaceChildren(frame,cards,byId('renderStatus'),toolbar,infrastructure);window.facelessMountCaptionStyle?.(project,cards);window.facelessMountExportOptions?.(project,cards);
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
    button.onclick=async function(event,options){
      shareCode();
      if(!window.FacelessGateway.enabled&&!options?.showProgress&&code.value.trim().length<16){custom[0].open=true;advanced.open=true;code.focus();byId('productionStatus').textContent='Introduce tu código privado.';return;}
      return original.call(this,event,options);
    };
  });
  byId('renderVideo').onclick=()=>byId('productionStart').onclick(null,{showProgress:true});
  const showPreview=()=>{custom[0].open=true;frame.hidden=false;};
  const preview=byId('previewVideo'), originalPreview=preview.onclick;
  preview.onclick=function(event){showPreview();frame.scrollIntoView({block:'center',behavior:'smooth'});return originalPreview.call(this,event);};
  const observer=new MutationObserver(()=>{if(!byId('videoResult')?.classList.contains('hidden')||byId('downloadArea')?.querySelector('a'))showPreview();});
  observer.observe(byId('videoResult'),{attributes:true,attributeFilter:['class']});observer.observe(byId('downloadArea'),{childList:true});
  window.facelessEditorObserver?.disconnect();window.facelessEditorObserver=observer;
};
