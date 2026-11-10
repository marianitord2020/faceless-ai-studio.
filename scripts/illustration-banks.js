/* External illustration libraries and local imports. No paid API calls or scraping. */
(() => {
 'use strict';
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const styles=[['anime','Anime y manga','anime manga illustration'],['2d','Ilustración 2D','2d flat illustration'],['3d','Ilustración 3D','3d illustration'],['movie3d','3D animado (tipo Pixar)','3d animated movie cartoon'],['comic','Cómic','comic illustration'],['watercolor','Acuarela','watercolor illustration']];
 const providers={icons8:{name:'Icons8 · Ouch!',base:'https://icons8.com/illustrations',note:'Busca recursos con la etiqueta Free. Su API requiere un plan de pago.',hosts:['icons8.com']},vecteezy:{name:'Vecteezy',base:'https://www.vecteezy.com/',note:'Elige recursos Free y guarda su atribución. API gratuita disponible con cuenta; todavía sin conectar.',hosts:['vecteezy.com']},freepik:{name:'Freepik',base:'https://www.freepik.com/',note:'Elige recursos gratuitos y revisa la atribución de tu descarga. Su API usa créditos.',hosts:['freepik.com','freepik.es']}};
 function sourceURL(value,provider){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&providers[provider].hosts.some(h=>u.hostname===h||u.hostname.endsWith('.'+h))?u.href:''}catch{return '';}}
 function searchURL(provider,query,style){
  const term=[String(query||'').trim().slice(0,100),styles.find(s=>s[0]===style)?.[2]||'illustration'].filter(Boolean).join(' ');
  if(provider==='icons8')return 'https://icons8.com/illustrations/search/'+encodeURIComponent(term);
  if(provider==='vecteezy')return 'https://www.vecteezy.com/free-vector/'+encodeURIComponent(term.toLowerCase().replace(/\s+/g,'-'));
  const u=new URL('https://www.freepik.com/search');u.searchParams.set('query',term);return u.href;
 }
 window.FacelessIllustrations={searchURL,sourceURL,styles};
 window.facelessMountIllustrationBanks=function(root,project,query,applyLocal){
  const box=el('details','', 'illustration-banks');box.id='illustrationBanks';box.append(el('summary','Anime, 2D, 3D y más · bancos de ilustraciones'));
  box.append(el('p','Elige un estilo y abre el banco. Descarga un recurso gratuito y añádelo a la escena elegida arriba. Estos enlaces abren la web del proveedor; no son una búsqueda por API dentro de la página.','smalltext'));
  const style=el('select');style.setAttribute('aria-label','Estilo de ilustración');for(const [value,label] of styles){const o=el('option',label);o.value=value;style.append(o);}const styleLabel=el('label','Estilo visual');styleLabel.append(style);box.append(styleLabel);
  const cards=el('div','', 'illustration-provider-grid'),links=[];
  for(const [id,p] of Object.entries(providers)){const card=el('article','', 'stock-card');card.append(el('b',p.name),el('p',p.note,'smalltext'));const a=el('a','Buscar en '+p.name,'btn small');a.target='_blank';a.rel='noopener noreferrer';links.push([id,a]);card.append(a);cards.append(card);}
  const refresh=()=>links.forEach(([id,a])=>{a.href=searchURL(id,query.value||project.topic||project.title,style.value);});style.onchange=refresh;query.addEventListener('input',refresh);refresh();box.append(cards);
  const importBox=el('form','', 'illustration-import');importBox.append(el('b','Añadir una ilustración descargada'));
  const provider=el('select');provider.setAttribute('aria-label','Banco de la ilustración descargada');for(const [id,p] of Object.entries(providers)){const o=el('option',p.name);o.value=id;provider.append(o);}
  const file=el('input');file.type='file';file.accept='image/png,image/jpeg,image/webp';file.required=true;file.setAttribute('aria-label','Ilustración descargada');
  const source=el('input');source.type='url';source.placeholder='Enlace de la página del recurso';source.required=true;source.maxLength=2000;source.setAttribute('aria-label','Fuente de la ilustración');
  const author=el('input');author.placeholder='Autor o crédito indicado en la descarga';author.maxLength=250;author.setAttribute('aria-label','Autor de la ilustración');
  const license=el('input');license.placeholder='Licencia indicada en la descarga';license.maxLength=250;license.setAttribute('aria-label','Licencia de la ilustración');
  const button=el('button','Añadir a la escena seleccionada','btn primary');button.type='submit';
  const status=el('p','', 'status');status.setAttribute('aria-live','polite');importBox.append(provider,file,source,author,license,button,status);
  importBox.append(el('p','Formatos: PNG, JPG o WebP, hasta 8 MB. Si el banco entrega SVG, EPS, PSD o ZIP, exporta primero una imagen compatible. Guarda la licencia y los créditos del recurso que descargaste.','smalltext'));
  importBox.onsubmit=async event=>{
   event.preventDefault();if(facelessIsWorking())return;
   const selected=file.files[0],url=sourceURL(source.value.trim(),provider.value);
   if(!url){status.textContent='Usa el enlace HTTPS del recurso en el banco seleccionado.';return;}
   if(!selected||!['image/png','image/jpeg','image/webp'].includes(selected.type)||!selected.size||selected.size>8_000_000){status.textContent='Selecciona un PNG, JPG o WebP de hasta 8 MB.';return;}
   button.disabled=true;status.textContent='Abriendo la ilustración…';
   try{
    const dataURI=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('No se pudo leer el archivo.'));reader.readAsDataURL(selected);});
    if(!root.isConnected||current()?.id!==project.id)return;
    const data={dataURI,credit:{id:'local-'+Date.now(),provider:providers[provider.value].name,title:selected.name,sourceURL:url,author:author.value.trim()||'Autor no indicado',license:license.value.trim()||'Consultar licencia de la descarga',licenseURL:url,style:style.value,importMethod:'manual'}};
    const saved=await applyLocal(data,button);status.textContent=saved?'✓ Ilustración incorporada con su fuente y crédito.':'No se añadió la ilustración. Revisa el estado de las fotos.';
   }catch(error){status.textContent=String(error.message||error);}finally{button.disabled=false;}
  };
  box.append(importBox);root.append(box);
 };
})();
