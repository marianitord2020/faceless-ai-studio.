/* Public HTTPS article extraction. No AI rewriting, cookies, login or paywall bypass. */
const MAX_BYTES=2_000_000,MAX_TEXT=100_000;
function fail(message,status=422){const e=Error(message);e.httpStatus=status;throw e;}
export function validateStoryURL(value){
 let u;try{u=new URL(String(value||''))}catch{fail('Escribe un enlace HTTPS válido.',400);}
 const h=u.hostname.toLowerCase();
 if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||h.includes(':')||/^\d+[.\d]*$/.test(h)||!h.includes('.')||/(^|\.)(localhost|local|internal|test|invalid|onion)$/.test(h)||h.length>253)fail('Usa una página pública HTTPS, sin direcciones privadas ni credenciales.',400);
 if(u.href.length>2000)fail('El enlace es demasiado largo.',400);u.hash='';return u;
}
function publicAddress(ip){
 if(ip.includes(':')){const s=ip.toLowerCase();return !s.startsWith('::')&&!s.startsWith('fc')&&!s.startsWith('fd')&&!s.startsWith('fe8')&&!s.startsWith('fe9')&&!s.startsWith('fea')&&!s.startsWith('feb')&&!s.startsWith('ff')&&!s.startsWith('2001:db8');}
 const p=ip.split('.').map(Number);if(p.length!==4||p.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
 return !(p[0]===0||p[0]===10||p[0]===127||p[0]>=224||p[0]===169&&p[1]===254||p[0]===172&&p[1]>=16&&p[1]<=31||p[0]===192&&p[1]===168||p[0]===100&&p[1]>=64&&p[1]<=127||p[0]===198&&[18,19].includes(p[1]));
}
async function verifyDNS(host){
 const answers=await Promise.all(['A','AAAA'].map(async type=>{
  const u=new URL('https://cloudflare-dns.com/dns-query');u.search=new URLSearchParams({name:host,type});
  let r;try{r=await fetch(u.href,{headers:{accept:'application/dns-json'},signal:AbortSignal.timeout(10000)})}catch{fail('No se pudo resolver el dominio del enlace.',502);}
  if(!r.ok)fail('No se pudo comprobar el dominio del enlace.',502);const d=await r.json();if(d.Status!==0)fail('El dominio no está disponible.',400);return (d.Answer||[]).filter(a=>[1,28].includes(a.type)).map(a=>a.data);
 }));
 const ips=answers.flat();if(!ips.length||ips.some(ip=>!publicAddress(ip)))fail('El enlace no apunta a una página pública permitida.',400);
}
const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',iexcl:'¡',iquest:'¿',aacute:'á',eacute:'é',iacute:'í',oacute:'ó',uacute:'ú',Aacute:'Á',Eacute:'É',Iacute:'Í',Oacute:'Ó',Uacute:'Ú',ntilde:'ñ',Ntilde:'Ñ',uuml:'ü',Uuml:'Ü',hellip:'…',mdash:'—',ndash:'–',ldquo:'“',rdquo:'”',lsquo:'‘',rsquo:'’',laquo:'«',raquo:'»',copy:'©'};
function decode(text){return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(all,key)=>{if(key[0]!=='#')return entities[key]??all;const code=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));return code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):'';});}
function plain(html){return decode(html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|noscript|svg|nav|footer|aside|form|button)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<\/?(?:p|div|section|article|main|h[1-6]|li|blockquote|br|hr)\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,'')).replace(/[ \t\r\f]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
function attrs(tag){const out={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))out[m[1].toLowerCase()]=m[2]??m[3]??m[4];return out;}
function block(html,start,tag){const re=new RegExp('<\\/?'+tag+'\\b[^>]*>','gi');re.lastIndex=start;let depth=0,begin=-1;for(let m;(m=re.exec(html));){if(m[0][1]==='/'){if(--depth===0)return html.slice(begin,m.index);}else{if(depth++===0)begin=re.lastIndex;}}return '';}
export function extractStoryHTML(html,url=''){
 const title=plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'Texto importado').slice(0,120);
 let author='',language='';
 for(const m of html.matchAll(/<meta\b[^>]*>/gi)){const a=attrs(m[0]);if(/^(author|article:author)$/i.test(a.name||a.property||''))author=plain(a.content||'').slice(0,250);}
 language=(attrs(html.match(/<html\b[^>]*>/i)?.[0]||'').lang||'').split(/[-_]/)[0].toLowerCase();
 if(!author&&/ciudadseva\.com/i.test(url)){const header=html.match(/<article\b[\s\S]*?<header\b[^>]*>([\s\S]*?)<\/header>/i)?.[1]||'';author=plain(header.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i,'').replace(/<p\b[^>]*>[\s\S]*?<\/p>/gi,'')).slice(0,250);}
 const candidates=[];
 for(const m of html.matchAll(/<(div|section|article|main)\b[^>]*>/gi)){
  const a=attrs(m[0]),classes=(a.class||'')+' '+(a.id||'');let priority=0;
  if(/\b(text-justify|entry-content|article-body|story-content|storytext|mw-parser-output)\b/i.test(classes))priority=3;
  else if(m[1].toLowerCase()==='main'||a.role==='main')priority=2;
  else if(m[1].toLowerCase()==='article')priority=1;
  if(priority){const text=plain(block(html,m.index,m[1]));if(text.length>=100)candidates.push({text,priority});}
 }
 candidates.sort((a,b)=>b.priority-a.priority||b.text.length-a.text.length);
 const text=candidates[0]?.text||'';
 if(text.length<100)fail('No se encontró el relato principal. La página puede necesitar iniciar sesión, bloquear la lectura o no contener texto accesible. Puedes pegar el contenido manualmente.');
 if(text.length>MAX_TEXT)fail('El texto supera 100.000 caracteres. Importa un capítulo o fragmento.');
 return {title,author,language,text,characters:text.length,sourceURL:url,method:'html-extraction'};
}
export async function readStoryURL(input){
 let url=validateStoryURL(input.url);let response;
 for(let n=0;n<4;n++){
  await verifyDNS(url.hostname);
  try{response=await fetch(url.href,{redirect:'manual',headers:{'User-Agent':'FacelessAIStudio/1.0 (public text reader)','accept':'text/html,text/plain;q=0.9'},signal:AbortSignal.timeout(20000)})}catch{fail('La página no respondió. Puedes abrirla y pegar el texto manualmente.',502);}
  if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');await response.body?.cancel();if(!location)fail('Redirección inválida.');url=validateStoryURL(new URL(location,url).href);continue;}break;
 }
 if(!response.ok){await response.body?.cancel();fail('No se pudo leer la página (HTTP '+response.status+'). No se intentará saltar su acceso; puedes pegar el texto manualmente.',422);}
 const type=(response.headers.get('content-type')||'').toLowerCase();if(!type.includes('text/html')&&!type.includes('text/plain')){await response.body?.cancel();fail('Este enlace no es una página de texto. Usa el enlace al relato, no un PDF, imagen o video.');}
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BYTES){await reader.cancel();fail('La página es demasiado grande. Usa el enlace al capítulo.');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
 const charset=type.match(/charset\s*=\s*["']?([\w-]+)/)?.[1]||'utf-8';let html;try{html=new TextDecoder(charset).decode(bytes)}catch{html=new TextDecoder().decode(bytes);}
 if(type.includes('text/plain')){const text=html.trim();if(text.length<100||text.length>MAX_TEXT)fail('El texto debe tener entre 100 y 100.000 caracteres.');return {title:decodeURIComponent(url.pathname.split('/').filter(Boolean).pop()||'Texto importado').slice(0,120),text,author:'',language:'',sourceURL:url.href,characters:text.length,method:'plain-text'};}
 return extractStoryHTML(html,url.href);
}
