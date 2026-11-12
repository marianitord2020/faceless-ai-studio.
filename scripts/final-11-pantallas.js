/* Faceless AI Studio | Visual final del boceto (11 pasos).
   Reutiliza los motores originales; sin claves privadas en cliente. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const home=$("home"),create=$("create"),discover=$("discover"),editor=$("editor"),projects=$("projects");
if(!home||!create||!discover||!editor||!projects)return;
const assets="assets/mockup/";
const pictures=[
 ["Relatos","mystery.webp","fiction","Misterio"],
 ["Aprender","history-sample.webp","factual","Educativo"],
 ["Actualidad","news.webp","news","Noticias"],
 ["Motivación","cinematic.webp","factual","Motivación"],
 ["Salud","realista.webp","factual","Educativo"],
 ["Viajes","travel.webp","factual","Curiosidades"]];
const genres={
 fiction:[["Romance","relatos.webp"],["Misterio","mystery.webp"],["Terror","ufo.webp"],["Fantasía","3d.svg"]],
 factual:[["Historia","documentales.webp"],["Curiosidades","history-sample.webp"],["Motivación","cinematic.webp"],["Educativo","artist-sample.webp"]],
 news:[["Noticias","news.webp"],["Farándula","farandula.webp"],["Entretenimiento","news-sample.webp"],["Deportes","cinematic.webp"]]};
const styles=[["cinematic","Cinematográfico","cinematic.webp"],["hyperreal","Realista","realista.webp"],["3d","3D animado","3d.svg"],["anime","Anime","anime.svg"],["2d","Caricatura 2D","2d.svg"],["cartoon","Ilustración","artist-sample.webp"],["historical","Documental","documentales.webp"]];
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const routing=s=>{if(typeof route==="function")route(s)};
const select=(id,value)=>{const e=$(id);if(!e||![...(e.options||[])].some(x=>x.value===String(value)))return;e.value=String(value);e.dispatchEvent(new Event("change",{bubbles:true}));};
const config={mode:"fiction",genre:"Misterio",topic:"",duration:60,style:"cinematic",voice:"automatic",format:"9:16"};
function card(title,file,attr,value){return '<button type="button" class="final-photo-card" '+attr+'="'+safe(value)+'"><img loading="lazy" src="'+assets+file+'" alt=""><span>'+safe(title)+'</span></button>';}
home.innerHTML='<section class="final-home-hero"><div><h1>Crea videos increíbles con <em>inteligencia artificial</em></h1><p>Convierte tus ideas en videos profesionales, sin mostrar tu rostro.</p></div><img src="assets/mockup-robot.svg" alt="Asistente de Faceless AI Studio"></section>'+
'<button type="button" class="final-primary final-home-button" data-final-new>✦ Crear video nuevo <span aria-hidden="true">→</span></button>'+
'<div class="final-section-title"><h2>Explora categorías</h2><button type="button" data-final-new>Ver todas ›</button></div>'+
'<div class="final-home-categories">'+pictures.map(p=>card(p[0],p[1],"data-final-category",p[0])).join("")+'</div>';
const bottom=document.querySelector(".fc-bottom");
if(bottom){bottom.innerHTML='<button type="button" data-fc-nav="home"><span>⌂</span>Inicio</button><button type="button" data-fc-nav="create"><span>▣</span>Crear</button><button type="button" data-fc-nav="projects"><span>▱</span>Proyectos</button>';
const update=()=>bottom.querySelectorAll("button").forEach(b=>{const page=document.body.dataset.screen;b.toggleAttribute("aria-current",b.dataset.fcNav===(page==="discover"?"create":page==="editor"?"projects":page));});new MutationObserver(update).observe(document.body,{attributes:true,attributeFilter:["data-screen"]});update();}
const newScreen=document.createElement("section");newScreen.className="final-create";
newScreen.innerHTML='<h1>Tu próximo video</h1><div class="final-number"><b>1</b> Encuentra tu historia</div>'+
'<input id="finalTopic" placeholder="¿Qué quieres contar?" maxlength="220" aria-label="Idea o tema">'+
'<div class="final-mode-tabs"><button type="button" data-final-mode="fiction">▤ Relatos</button><button type="button" data-final-mode="factual">♧ Aprender</button><button type="button" data-final-mode="news">▣ Actualidad</button></div>'+
'<div class="final-genre-tiles" id="finalGenres"></div><div class="final-number"><b>2</b> Cómo quieres empezar</div>'+
'<div class="final-source"><button type="button" data-final-source="ai" class="active">✦ Crear con IA<small>Automático</small></button><button type="button" data-final-source="manual">✎ Editar yo mismo<small>Manual</small></button></div>'+
'<details class="final-settings"><summary>⚙ Ajustes opcionales <span id="finalSummary">60s · Cinematográfico</span>⌄</summary>'+
'<label>Duración<select id="finalDuration"><option value="30">30 segundos</option><option value="60">60 segundos</option><option value="120">120 segundos</option></select></label>'+
'<label>Voz<select id="finalVoice"><option value="automatic">Automática</option><option value="female">Femenina</option><option value="male">Masculina</option></select></label>'+
'<label>Formato<select id="finalFormat"><option value="9:16">Vertical 9:16</option><option value="16:9">Horizontal 16:9</option></select></label></details>'+
'<button type="button" class="final-primary" id="finalGenerate">✦ Generar 10 propuestas</button><p class="final-note" id="finalNote" aria-live="polite"></p>';
create.prepend(newScreen);
let source="ai";
function refresh(){
 $("finalTopic").value=config.topic;
 $("finalTopic").placeholder=config.mode==="news"?"¿Qué tema actual te interesa?":config.mode==="factual"?"¿Qué quieres aprender?":"¿Qué quieres contar?";
 newScreen.querySelectorAll("[data-final-mode]").forEach(x=>x.classList.toggle("active",x.dataset.finalMode===config.mode));
 newScreen.querySelectorAll("[data-final-source]").forEach(x=>x.classList.toggle("active",x.dataset.finalSource===source));
 $("finalGenres").innerHTML=genres[config.mode].map(([title,img])=>'<div class="'+(config.genre===title?"active":"")+'">'+card(title,img,"data-final-genre",title)+'</div>').join("");
 $("finalDuration").value=String(config.duration);$("finalVoice").value=config.voice;$("finalFormat").value=config.format;
 $("finalSummary").textContent=config.duration+'s · '+(styles.find(x=>x[0]===config.style)?.[1]||"Cinematográfico");
 $("finalGenerate").textContent=source==="manual"?"✎ Editar mis archivos":"✦ Generar 10 propuestas";
}
function openCreate(preset){
 if(preset){config.mode=preset[2];config.genre=preset[3];if(preset[2]==="news")config.topic="Noticias de República Dominicana hoy";}
 source="ai";refresh();routing("create");
}
home.addEventListener("click",e=>{const cat=e.target.closest("[data-final-category]");if(cat){openCreate(pictures.find(x=>x[0]===cat.dataset.finalCategory));return;}if(e.target.closest("[data-final-new]"))openCreate();});
newScreen.addEventListener("click",e=>{
 const mode=e.target.closest("[data-final-mode]");if(mode){config.mode=mode.dataset.finalMode;config.genre=genres[config.mode][0][0];refresh();return;}
 const genre=e.target.closest("[data-final-genre]");if(genre){config.genre=genre.dataset.finalGenre;refresh();return;}
 const modeSource=e.target.closest("[data-final-source]");if(modeSource){source=modeSource.dataset.finalSource;refresh();}
});
$("finalTopic").addEventListener("input",e=>config.topic=e.target.value);
$("finalDuration").onchange=e=>{config.duration=Number(e.target.value);refresh();};
$("finalVoice").onchange=e=>config.voice=e.target.value;
$("finalFormat").onchange=e=>config.format=e.target.value;
$("finalGenerate").onclick=()=>{
 if(source==="manual"){window.location.href="editar-sin-ia/";return;}
 const topic=config.topic.trim();
 if(topic.length<5){$("finalNote").textContent="Escribe un tema de al menos 5 caracteres.";$("finalTopic").focus();return;}
 window.facelessFlow="ai";document.body.dataset.flow="ai";routing("discover");window.facelessShowStudioMenu?.();
 select("studioMode",config.mode);select("studioGenre",config.genre);
 select("studioSource","ai");select("studioDuration",config.duration);select("studioVoice",config.voice);select("studioImageStyle",config.style);
 if(typeof choice!=="undefined"){choice.format=config.format;typeof renderOpts==="function"&&renderOpts();}
 const input=$("studioTopic");if(input){input.value=topic;input.dispatchEvent(new Event("input",{bubbles:true}));}
 $("studioGenerate")?.click();
};
refresh();
const results=discover.querySelector(".studio-results-view");
const bar=document.createElement("div");bar.className="final-results-header";
bar.innerHTML='<button type="button" id="finalResultBack" aria-label="Volver">‹</button><div><h1 id="finalResultTitle">10 propuestas para tu video</h1><p id="finalResultHelp">Elige la historia que más te guste.</p></div>';
results?.prepend(bar);
let stage="propuestas";
const stageSet=s=>{stage=s;discover.dataset.finalStage=s;$("finalResultTitle").textContent=s==="ganchos"?"Elige un gancho del video":"10 propuestas para tu video";$("finalResultHelp").textContent=s==="ganchos"?"Selecciona el gancho que más atrape a tu audiencia.":"Elige la historia que más te guste.";};
$("finalResultBack").onclick=()=>{if(stage==="ganchos"){stageSet("propuestas");return;}window.facelessShowStudioMenu?.();routing("create");};
discover.addEventListener("click",e=>{if(e.target.closest(".studio-card"))queueMicrotask(()=>stageSet("ganchos"));});
const setup=discover.querySelector(".ref-create-view");
if(setup){const section=document.createElement("section");section.className="final-styles";
 section.innerHTML='<h2>Elige el estilo visual</h2><p>Así se verán las imágenes de tu video.</p><div class="final-style-grid">'+styles.map(s=>card(s[1],s[2],"data-final-style",s[0])).join("")+'</div>';
 setup.querySelector("#refSetupStyle")?.closest("label")?.after(section);
 section.addEventListener("click",e=>{const b=e.target.closest("[data-final-style]");if(!b)return;config.style=b.dataset.finalStyle;select("refSetupStyle",config.style);section.querySelectorAll("[data-final-style]").forEach(x=>x.classList.toggle("selected",x===b));});
}
const projectsHeader=projects.querySelector(".screen-head h1");if(projectsHeader)projectsHeader.textContent="Mis proyectos";
const projectButton=projects.querySelector(".screen-head [data-route]");if(projectButton){projectButton.textContent="+ Crear video nuevo";projectButton.dataset.route="create";}
const projectSub=projects.querySelector(".screen-head p");if(projectSub)projectSub.textContent="Gestiona, continúa y edita tus videos.";
const status=document.createElement("p");status.className="final-project-warning";status.textContent="Los proyectos se conservan en este navegador. Utiliza Respaldo para guardarlos.";projects.querySelector(".projects-grid")?.before(status);
const projectsList=$("projectsList");let scheduled=false;
const updateCards=()=>projectsList?.querySelectorAll(".project").forEach(card=>{const btn=card.querySelector('[data-project="open"]');if(btn)btn.textContent="▶ Continuar";});
new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;updateCards();});}).observe(projectsList,{childList:true});updateCards();
window.facelessVisualFinal={assets,styles,config};
})();