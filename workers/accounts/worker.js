const encoder = new TextEncoder();
const routes = new Set(['/ideas','/script','/images','/voice','/transcribe','/analyze','/stock/search','/stock/import','/read-url']);
const day = 86400;
const cookieName = '__Host-faceless_session';
const hex = bytes => [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2,'0')).join('');
const randomHex = size => hex(crypto.getRandomValues(new Uint8Array(size)));
const digest = async value => hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
const now = () => Math.floor(Date.now()/1000);

function equal(a,b) {
  if(a.length!==b.length)return false;
  let difference=0;
  for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);
  return difference===0;
}

async function passwordHash(password,salt,pepper) {
  const pepperKey=await crypto.subtle.importKey('raw',encoder.encode(pepper),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const mixed=await crypto.subtle.sign('HMAC',pepperKey,encoder.encode(password));
  const key=await crypto.subtle.importKey('raw',mixed,'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:100000},key,256));
}

function token(request) {
  return request.headers.get('cookie')?.split(';').map(value=>value.trim()).find(value=>value.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
}

function cookie(value,age) {
  return cookieName+'='+value+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+age;
}

function redirect(path,headers={}) {
  return new Response(null,{status:303,headers:{Location:path,'Cache-Control':'no-store',...headers}});
}

function loginPage(message='',registration=false,status=200) {
  const name=registration?'Crear cuenta':'Entrar a Faceless';
  const registerField=registration?'<label>Código de invitación<input name="invite" type="password" required maxlength="128"></label>':'';
  const switchLink=registration?'<a href="/login">Volver a iniciar sesión</a>':'<a href="/register">Crear cuenta con invitación</a>';
  return new Response(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title>
  <style>body{margin:0;background:#100b1d;color:#fff;font:16px system-ui;display:grid;place-items:center;min-height:100vh}main{width:min(380px,86vw);padding:20px}label,input,button{display:block;width:100%;box-sizing:border-box}label{margin:16px 0}input,button{margin-top:7px;padding:12px;border-radius:9px;border:1px solid #8978ae;font:inherit}button{background:#6542cf;color:white;margin-bottom:16px}a{color:#d5c8ff}</style>
  <main><h1>${name}</h1><p role="status">${message}</p><form method="post" action="${registration?'/register':'/login'}">
  <label>Usuario<input name="username" autocomplete="username" required minlength="3" maxlength="40" pattern="[a-zA-Z0-9_.\\-]+"></label>
  <label>Contraseña<input name="password" type="password" autocomplete="${registration?'new-password':'current-password'}" required minlength="12" maxlength="128"></label>${registerField}
  <button>${name}</button></form>${switchLink}</main></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"}});
}

async function limit(db,scope,seconds,max) {
  const window=Math.floor(now()/seconds)*seconds;
  const row=await db.prepare('INSERT INTO account_limits(scope, window, hits) VALUES (?, ?, 1) ON CONFLICT(scope, window) DO UPDATE SET hits = hits + 1 RETURNING hits').bind(scope,window).first();
  return row.hits<=max;
}

async function readForm(request) {
  if (Number(request.headers.get('Content-Length')) > 4096 ||
      !request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded') ||
      !request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) return new URLSearchParams(text + decoder.decode());
    bytes += value.byteLength;
    if (bytes > 4096) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}

async function authenticate(request,env,registration) {
  const ip=await digest(request.headers.get('CF-Connecting-IP')||'unknown');
  if(!await limit(env.DB,'login:'+ip,900,10))return loginPage('Demasiados intentos. Espera unos minutos.',registration,429);
  const data=await readForm(request);
  if(!data)return loginPage('Formulario inválido.',registration,400);
  const username=String(data.get('username')||'').trim().toLowerCase();
  const password=String(data.get('password')||'');
  if(!/^[a-z0-9_.-]{3,40}$/.test(username)||password.length<12||password.length>128)return loginPage('Revisa el usuario y la contraseña. Usa al menos 12 caracteres en la contraseña.',registration,400);
  if(!await limit(env.DB,'account:'+username,900,10))return loginPage('Demasiados intentos. Espera unos minutos.',registration,429);
  let user;
  if(registration){
    const invite=String(data.get('invite')||'');
    if(!env.REGISTRATION_CODE||!equal(await digest(invite),await digest(env.REGISTRATION_CODE)))return loginPage('La invitación no es válida.',true,403);
    const salt=randomHex(32);
    const hash=await passwordHash(password,salt,env.PASSWORD_PEPPER);
    user=await env.DB.prepare('INSERT INTO users(username,password_hash,salt,created_at) VALUES (?,?,?,?) ON CONFLICT(username) DO NOTHING RETURNING id').bind(username,hash,salt,now()).first();
    if(!user)return loginPage('Ese nombre de usuario no está disponible.',true,409);
  }else{
    user=await env.DB.prepare('SELECT id,password_hash,salt FROM users WHERE username=?').bind(username).first();
    const hash=await passwordHash(password,user?.salt||'0'.repeat(64),env.PASSWORD_PEPPER);
    if(!equal(hash,user?.password_hash||'0'.repeat(64))||!user)return loginPage('Usuario o contraseña incorrectos.',false,401);
  }
  const value=randomHex(32);
  await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)').bind(await digest(value),user.id,now()+7*day).run();
  return redirect('/',{'Set-Cookie':cookie(value,7*day)});
}

export default {
  async scheduled(_event, env) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now()),
      env.DB.prepare('DELETE FROM account_limits WHERE window <= ?').bind(now() - day),
    ]);
  },

  async fetch(request,env) {
    const url=new URL(request.url);
    if(!env.DB||!env.PASSWORD_PEPPER||env.PASSWORD_PEPPER.length<32||!env.APP_PASSCODE||env.APP_PASSCODE.length<16)return new Response('Faceless requiere configuración del servidor.',{status:503});
    if(request.method==='POST'&&request.headers.get('Origin')!==url.origin)return new Response('Origen no autorizado.',{status:403});
    if(url.pathname==='/login'||url.pathname==='/register'){
      const registration=url.pathname==='/register';
      if(request.method==='GET')return loginPage('',registration);
      if(request.method==='POST')return authenticate(request,env,registration);
      return new Response(null,{status:405});
    }
    const value=token(request);
    const key=/^[0-9a-f]{64}$/.test(value)?await digest(value):'';
    if(url.pathname==='/logout'&&request.method==='POST'){
      if(key)await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(key).run();
      return redirect('/login',{'Set-Cookie':cookie('',0)});
    }
    const session=key&&await env.DB.prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?').bind(key,now()).first();
    if(!session){
      if(url.pathname.startsWith('/api/'))return Response.json({error:'La sesión expiró. Vuelve a iniciar sesión.'},{status:401,headers:{'Cache-Control':'no-store'}});
      return redirect('/login');
    }
    if(url.pathname.startsWith('/api/')){
      const path=url.pathname.slice(4);
      if(request.method!=='POST'||!routes.has(path))return new Response(null,{status:404});
      if(!await limit(env.DB,'api:'+session.user_id,3600,120))return Response.json({error:'Llegaste al límite de solicitudes de esta hora.'},{status:429});
      const headers=new Headers({'Origin':'https://marianitord2020.github.io','x-app-token':env.APP_PASSCODE});
      const contentType=request.headers.get('Content-Type');
      if(contentType)headers.set('Content-Type',contentType);
      const result=await env.MEDIA.fetch(new Request('https://faceless-images.marianitord2020.workers.dev'+path,{method:'POST',headers,body:request.body,duplex:'half'}));
      const out=new Response(result.body,result);
      out.headers.set('Cache-Control','no-store');
      return out;
    }
    if(request.method!=='GET'&&request.method!=='HEAD')return new Response(null,{status:405});
    const result = await env.ASSETS.fetch(request);
    const out = new Response(result.body, result);
    out.headers.set('Cache-Control', 'private, no-store');
    return out;
  }
};
