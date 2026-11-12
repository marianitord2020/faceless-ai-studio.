/* Faceless Cloudflare session: only a time-limited signed session is saved locally.
   APP_PASSCODE and provider API keys remain in Cloudflare Secrets. */
(function(){
 'use strict';
 const API='https://faceless-images.marianitord2020.workers.dev/auth/session';
 const STORAGE='faceless.session.cloud.v1';
 const TOKEN=/^fs1\.[0-9a-z]{1,12}\.[0-9a-z]{1,12}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/;
 const fields=['studioPass','productionPass','aiPhotosPasscode','aiVoicePasscode','geminiPass'];
 let saved=null;
 function eraseStorage(){try{localStorage.removeItem(STORAGE);}catch{}}
 function read(){
  try{
   const data=JSON.parse(localStorage.getItem(STORAGE)||'null');
   if(TOKEN.test(data?.token||'')&&Number.isFinite(data?.expiresAt)&&data.expiresAt>Date.now()+60000)return data;
  }catch{}
  eraseStorage();return null;
 }
 saved=read();
 function current(){
  if(saved&&saved.expiresAt>Date.now()+60000&&TOKEN.test(saved.token))return saved.token;
  saved=read();return saved?.token||'';
 }
 function distribute(token=current()){
  if(!token)return '';
  window.facelessProductionPasscode=token;
  for(const id of fields){
   const target=document.getElementById(id);
   if(target&&target.value!==token){
    target.value=token;
    if(id==='studioPass')target.dispatchEvent(new Event('input',{bubbles:true}));
   }
  }
  return token;
 }
 function clear(){
  const old=saved?.token;
  saved=null;eraseStorage();
  if(window.facelessProductionPasscode===old)window.facelessProductionPasscode='';
  for(const id of fields){const el=document.getElementById(id);if(el&&el.value===old)el.value='';}
 }
 let inFlight=null;
 async function authorize(credential){
  const candidate=String(credential||current()||'').trim();
  if(candidate.length<16)throw Error('Introduce una vez el código privado configurado en Cloudflare.');
  if(inFlight)return inFlight;
  inFlight=(async()=>{
   let response;
   try{
    response=await fetch(API,{method:'POST',cache:'no-store',headers:{
     'content-type':'application/json','x-app-token':candidate
    },body:'{}'});
   }catch{throw Error('No se pudo conectar con Cloudflare para autorizar Faceless. Comprueba tu conexión.');}
   let json={};try{json=await response.json();}catch{}
   if(!response.ok){
    if(response.status===401&&TOKEN.test(candidate))clear();
    if(response.status===404)throw Error('Cloudflare todavía no tiene activa la sesión unificada.');
    throw Error(response.status===401?'El código o la sesión no son válidos. Introduce tu código de Cloudflare una vez más.':String(json?.error||'Error de autorización en Cloudflare').slice(0,220));
   }
   if(!TOKEN.test(json.token||'')||!Number.isFinite(json.expiresAt)||
       json.expiresAt<Date.now()+60000||json.expiresAt>Date.now()+32*24*3600*1000)
      throw Error('Cloudflare devolvió una sesión inválida. No se ha guardado ningún código.');
   saved={token:json.token,expiresAt:json.expiresAt};
   try{localStorage.setItem(STORAGE,JSON.stringify(saved));}
   catch{ /* Session works in memory if device blocks storage. */ }
   distribute(saved.token);
   return saved.token;
  })();
  try{return await inFlight;}finally{inFlight=null;}
 }
 async function ready(){
  const token=current();
  if(!token)return '';
  distribute(token);
  if(saved.expiresAt-Date.now()<7*24*3600*1000){
   try{return await authorize(token);}catch{return current();}
  }
  return token;
 }
 window.facelessAccess={current,ready,authorize,clear,distribute};
 if(saved)window.facelessProductionPasscode=saved.token;
 // Existing editor panels are rendered dynamically after page load.
 document.addEventListener('DOMContentLoaded',()=>{distribute();void ready();});
 const originalStore=window.facelessAccess.current;
 window.facelessAccess.current=()=>originalStore();
})();
