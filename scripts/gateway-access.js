/* Faceless AI Studio: existing Cloudflare D1 login and same-origin AI gateway.
 * The access Worker owns the HttpOnly session cookie and injects APP_PASSCODE
 * server-side using its MEDIA service binding. The browser never needs it. */
(function(){
 'use strict';
 const ACCESS_HOST='faceless-access-prueba.marianitord2020.workers.dev';
 const LEGACY_ORIGIN='https://faceless-images.marianitord2020.workers.dev';
 const enabled=location.hostname.toLowerCase()===ACCESS_HOST;
 document.documentElement.classList.toggle('faceless-d1',enabled);
 const ensurePath=path=>{
  const value=String(path||'');
  if(!/^\/(?:images|voice|script|ideas|transcribe|analyze|stock\/(?:search|import)|read-url)$/.test(value))
    throw new Error('La ruta del servicio de IA no está permitida.');
  return value;
 };
 const endpoint=path=>enabled?'/api'+ensurePath(path):LEGACY_ORIGIN+ensurePath(path);
 const credentialsRequired=()=>!enabled;
 const authorized=passcode=>enabled||(typeof passcode==='string'&&passcode.trim().length>=16);
 function headers(type='application/json',passcode=''){
  const value=new Headers({'Content-Type':type});
  if(!enabled&&passcode)value.set('x-app-token',passcode);
  return value;
 }
 async function request(path,options={}){
  const target=endpoint(path);
  const inputHeaders=new Headers(options.headers||{});
  if(enabled)inputHeaders.delete('x-app-token');
  let response;
  try{
   response=await fetch(target,{
    ...options,headers:inputHeaders,
    credentials:enabled?'same-origin':(options.credentials||'omit'),
    cache:'no-store'
   });
  }catch(error){throw error}
  if(enabled&&(response.status===401||response.redirected&&new URL(response.url).pathname==='/login')){
   // The Access Worker checks D1 sessions on every request.
   // No query tokens or master passcodes are ever placed into URLs.
   window.location.assign('/login');
   throw new Error('Tu sesión terminó. Inicia sesión para seguir creando videos.');
  }
  return response;
 }
 window.FacelessGateway=Object.freeze({
  enabled, endpoint, headers, authorized, credentialsRequired, request,
  loginURL:enabled?'/login':'https://'+ACCESS_HOST+'/login'
 });
})();
