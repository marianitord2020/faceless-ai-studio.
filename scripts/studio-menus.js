/* Visual choices backed by the existing form values and change handlers. */
(() => {
 'use strict';
 const paths={
  Romance:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  Misterio:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM15 15l6 6',
  Terror:'M5 21V10a7 7 0 0 1 14 0v11l-3-2-4 2-4-2-3 2ZM9 10h.01M15 10h.01',
  Fantasía:'m12 2 2.8 6.5L22 12l-7.2 3.5L12 22l-2.8-6.5L2 12l7.2-3.5L12 2Z',
  Historia:'m3 8 9-5 9 5H3ZM5 10v8M10 10v8M14 10v8M19 10v8M3 21h18',
  Curiosidades:'M9 19h6M10 22h4M8 15a7 7 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z',
  Motivación:'m13 2-9 12h7l-1 8 10-13h-8l1-7Z',
  Educativo:'M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1ZM12 5v15',
  Noticias:'M4 3h16v18H4V3ZM7 7h10M7 11h4M7 15h4M14 11h3M14 15h3',
  Farándula:'m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z',
  Entretenimiento:'M3 9h18v12H3V9ZM3 9V4l18-2v7M7 4l3 5M14 3l3 6',
  ai:'m12 2 2.8 6.5L22 12l-7.2 3.5L12 22l-2.8-6.5L2 12l7.2-3.5L12 2Z',
  local:'M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1ZM12 5v15',
  fiction:'M4 4h16v13H9l-5 4V4ZM8 8h8M8 12h5',
  news:'M4 3h16v18H4V3ZM7 7h10M7 11h4M7 15h10',
  factual:'M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1ZM12 5v15',
  image:'M3 3h18v18H3V3ZM4 17l5-5 4 4 3-3 5 5M8 8h.01'
 };
 const descriptions={Romance:'Amor y emociones',Misterio:'Secretos por descubrir',Terror:'Historias que inquietan',Fantasía:'Imagina otros mundos',Historia:'Personajes y épocas',Curiosidades:'Descubre algo nuevo',Motivación:'Ideas que inspiran',Educativo:'Aprender y compartir',Noticias:'Actualidad con fuentes',Farándula:'Artistas y celebridades',Entretenimiento:'Cine, música y cultura'};
 const named={
  studioMode:{fiction:['Ficción','Historias creativas'],news:['Noticias','Hechos actuales'],factual:['Documentales','Información real']},
  studioSource:{ai:['Crear con IA','Historias nuevas · Gemini'],local:['Explorar relatos','Buscar textos y traducir']},
  studioDuration:{'30':['30 s','Rápido'],'60':['1 min','Estándar'],'120':['2 min','Más detalle']},
  studioImageStyle:{cinematic:['Cinematográfica','Luz y composición de cine'],hyperreal:['Hiperrealista','Acabado fotográfico'],'3d':['Animación 3D','Personajes expresivos'],'2d':['Ilustración 2D','Estilo dibujado'],anime:['Anime','Inspiración japonesa'],cartoon:['Caricatura','Trazos con personalidad'],historical:['Histórica','Recreación artística']}
 };
 const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n};
 function icon(key){const n=node('span','choice-icon');n.setAttribute('aria-hidden','true');n.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="'+(paths[key]||paths.image)+'"/></svg>';return n}
 window.mountFriendlyStudioMenus=()=>{
  const controls=[],ids=['studioGenre','studioSubcategory','studioMode','studioSource','studioImageStyle','studioDuration','studioWrittenLanguage'];let activeGroup='',previousGenre='';
  function choose(select,value,focusValue=value){select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));refresh();const c=controls.find(c=>c.select===select);[...c.box.querySelectorAll('[data-choice]')].find(n=>n.dataset.choice===focusValue)?.focus({preventScroll:true})}
  function choice(select,option,kind){
   const label=named[select.id]?.[option.value]||[option.textContent,descriptions[option.value]||''];
   const b=node('button','friendly-choice '+kind);b.type='button';b.dataset.choice=option.value;b.setAttribute('aria-pressed',String(select.value===option.value));b.disabled=select.disabled||option.disabled;
   if(kind!=='choice-chip'&&kind!=='choice-duration')b.append(icon(option.value in paths?option.value:select.id==='studioGenre'?option.value:'image'));
   const copy=node('span','choice-copy');copy.append(node('strong','',label[0]));if(label[1]&&kind!=='choice-chip')copy.append(node('small','',label[1]));b.append(copy);
   if(kind!=='choice-chip'&&kind!=='choice-duration'){const check=node('span','choice-check','✓');check.setAttribute('aria-hidden','true');b.append(check)}
   b.onclick=()=>choose(select,option.value);return b;
  }
  function refresh(only){
   for(const {select,box} of controls){
    if(only&&only!==select)continue;
    box.replaceChildren();
    if(select.id==='studioGenre'){
     const groups=[...select.querySelectorAll('optgroup')];
     if(previousGenre!==select.value){activeGroup=groups.find(g=>[...g.children].some(o=>o.value===select.value))?.label||'';previousGenre=select.value}
     const nav=node('div','choice-group-nav');nav.setAttribute('role','group');nav.setAttribute('aria-label','Grupos de categorías');
     groups.forEach((g,i)=>{const b=node('button','', ['Relatos','Aprender','Actualidad'][i]||g.label);b.type='button';b.setAttribute('aria-pressed',String(g.label===activeGroup));b.onclick=()=>{activeGroup=g.label;choose(select,g.querySelector('option').value)};nav.append(b)});
     const list=node('div','choice-category-grid');for(const o of groups.find(g=>g.label===activeGroup)?.children||[])list.append(choice(select,o,'choice-category'));box.append(nav,list);
    }else{
     const kind=select.id==='studioSubcategory'||select.id==='studioWrittenLanguage'?'choice-chip':select.id==='studioDuration'?'choice-duration':select.id==='studioImageStyle'?'choice-image':select.id==='studioSource'?'choice-source':'choice-mode';
     box.className='friendly-menu friendly-'+kind;
     for(const option of select.options)box.append(choice(select,option,kind));
    }
   }
  }
  for(const key of ids){
   const select=document.getElementById(key);if(!select||select.dataset.friendly)continue;select.dataset.friendly='true';select.classList.add('friendly-native');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
   const label=document.querySelector('label[for="'+key+'"]');const box=node('div','friendly-menu');box.dataset.menu=key;box.setAttribute('role','group');
   if(label){label.id=key+'Label';label.removeAttribute('for');box.setAttribute('aria-labelledby',label.id)}else box.setAttribute('aria-label',key);
   select.after(box);controls.push({select,box});
  }
  for(const {select} of controls){const original=select.onchange;select.onchange=function(event){original?.call(this,event);refresh()};new MutationObserver(()=>refresh(select)).observe(select,{childList:true,subtree:true});}
  refresh();
 };
})();
