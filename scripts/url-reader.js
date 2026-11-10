/* Populate published-story fields from a URL; preserve in-flight user edits. */
(() => {
 'use strict';
 window.facelessMountUrlReader=function({read,busy}){
  const url=document.getElementById('studioWrittenUrl'),title=document.getElementById('studioWrittenTitle'),text=document.getElementById('studioWrittenText'),language=document.getElementById('studioWrittenLanguage');
  if(!url||url.dataset.readerMounted)return;url.dataset.readerMounted='true';
  const button=document.createElement('button');button.type='button';button.id='studioReadUrl';button.className='btn small';button.textContent='Leer relato desde el enlace';
  const status=document.createElement('p');status.id='studioUrlStatus';status.className='studio-limit';status.setAttribute('aria-live','polite');url.after(button,status);
  const copyButton=document.createElement('button');copyButton.type='button';copyButton.id='studioCopyWritten';copyButton.className='btn small';copyButton.textContent='Copiar texto cargado';copyButton.onclick=()=>{if(text.value.trim())copy(text.value);else status.textContent='Carga un enlace o pega un texto primero.';};text.after(copyButton);
  let revision=0,request=0,timer,loadedURL='';
  const changed=()=>{revision++;};title.addEventListener('input',changed);text.addEventListener('input',changed);
  async function load(explicit=false){
   clearTimeout(timer);const value=url.value.trim();if(!value)return false;
   if(busy()){if(explicit)status.textContent='Espera a que termine la operación actual.';return false;}
   try{const parsed=new URL(value);if(parsed.protocol!=='https:')throw Error();}catch{if(explicit)status.textContent='Escribe un enlace HTTPS válido.';return false;}
   if(!explicit&&loadedURL===value)return true;
   const ticket=++request,version=revision;button.disabled=true;status.textContent='Leyendo el enlace y extrayendo el relato…';
   try{
    const data=await read(value);
    if(ticket!==request||url.value.trim()!==value||!url.isConnected)return false;
    if(revision!==version){status.textContent='El enlace se leyó, pero editaste los campos durante la carga. Pulsa Leer relato para cargarlo de nuevo.';return false;}
    title.value=data.title||'Texto importado';text.value=data.text;url.value=data.sourceURL||value;loadedURL=url.value.trim();
    if(['es','en','fr','pt','it','de'].includes(data.language))language.value=data.language;
    text.dataset.sourceAuthor=data.author||'';text.dataset.sourceURL=loadedURL;
    status.textContent='✓ Relato cargado: '+data.characters.toLocaleString('es-DO')+' caracteres'+(data.author?' · '+data.author:'')+'. Revisa el texto antes de copiarlo o traducirlo.'+(data.text.length>5000?' La traducción gratuita admite hasta 5.000 caracteres por vez.':'');
    return true;
   }catch(error){if(ticket===request&&url.isConnected)status.textContent=String(error.message||error)+' El texto que ya tenías se conserva.';return false;}
   finally{if(ticket===request)button.disabled=false;}
  }
  button.onclick=()=>load(true);
  url.addEventListener('input',()=>{request++;button.disabled=false;clearTimeout(timer);timer=setTimeout(()=>load(false),650);});
  url.addEventListener('change',()=>load(false));
  // If the private access code was entered after pasting the link, retry automatically.
  document.getElementById('studioPass')?.addEventListener('change',()=>{if(url.value.trim()&&!text.value.trim())load(false);});
  window.facelessReadWrittenURL=()=>load(true);
 };
})();
