/**
 * Prepare an update of the EXISTING Cloudflare Access Worker without replacing
 * its D1 login or MEDIA service binding. The deployed auth code is fetched and
 * kept byte-for-byte as source input, never embedded in the public asset bundle.
 * No secrets, DB values, session tokens or test passwords enter the frontend.
 */
import {readFile,writeFile,mkdir,cp,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';

const account=process.env.CLOUDFLARE_ACCOUNT_ID;
const token=process.env.CLOUDFLARE_API_TOKEN;
if(!account||!token)throw Error('Cloudflare deployment credentials are not configured.');
const base='https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(account);
const headers={'Authorization':'Bearer '+token};
async function load(path,json=true){
 const res=await fetch(base+path,{headers,signal:AbortSignal.timeout(25000)});
 if(!res.ok)throw Error('Cloudflare read-only source retrieval failed: HTTP '+res.status+' ('+path.split('/').pop()+')');
 if(!json)return await res.text();
 const data=await res.json();
 if(!data.success||!data.result)throw Error('Cloudflare returned incomplete worker metadata.');
 return data.result;
}
const settings=await load('/workers/scripts/faceless-access-prueba/settings');
const bindings=Array.isArray(settings.bindings)?settings.bindings:[];
const unique=type=>{
 const matches=bindings.filter(b=>b.type===type);
 if(matches.length!==1)throw Error('Unexpected '+type+' bindings: '+matches.length+'. Refusing to deploy.');
 return matches[0];
};
const db=unique('d1'),media=unique('service'),assets=unique('assets');
if(db.name!=='DB'||media.name!=='MEDIA'||assets.name!=='ASSETS'||media.service!=='faceless-images'||!db.id)
 throw Error('Binding names differ from the tested Cloudflare D1 login configuration. Aborting.');
const remote=await load('/workers/scripts/faceless-access-prueba',false);
function unwrapWorkerBundle(raw){
 if(!raw.startsWith('--'))return raw;
 const boundary=raw.split(/\r?\n/,1)[0];
 const parts=raw.split(boundary);
 for(const section of parts){
  const split=section.search(/\r?\n\r?\n/);
  if(split<0)continue;
  const body=section.slice(split).replace(/^\r?\n\r?\n/,'').replace(/\r?\n$/,'');
  if(body.includes('env.DB')&&body.includes('env.MEDIA')&&body.includes('env.ASSETS')&&body.includes('export ')){
   console.log('Recovered the existing Worker module from Cloudflare multipart source.');
   return body;
  }
 }
 throw Error('Could not identify the existing D1 Worker module safely; no deployment will occur.');
}
const src=unwrapWorkerBundle(remote);
for(const required of ['env.DB','env.MEDIA','env.ASSETS','/login','/api/','PASSWORD_PEPPER','APP_PASSCODE']){
 if(!src.includes(required))throw Error('Missing expected access-worker feature: '+required);
}
if(src.length<2000||src.length>2000000)throw Error('Unexpected Access Worker source length; refusing to update.');
const build=resolve('.access-build'),pub=join(build,'public');
await mkdir(pub,{recursive:true});
for(const directory of ['assets','styles','scripts','editar-sin-ia']){
 try{const info=await stat(directory);if(info.isDirectory())await cp(directory,join(pub,directory),{recursive:true});}
 catch(e){if(e.code!=='ENOENT')throw e;}
}
for(const name of ['index.html','favicon.ico','favicon.png','manifest.webmanifest','robots.txt']){
 try{const info=await stat(name);if(info.isFile())await cp(name,join(pub,name));}
 catch(e){if(e.code!=='ENOENT')throw e;}
}
const html=await readFile(join(pub,'index.html'),'utf8');
if(!html.includes('scripts/gateway-access.js')||!html.includes('styles/d1-gateway.css'))
 throw Error('The client is not yet connected to Cloudflare D1. Refusing deployment.');
await writeFile(join(build,'access-source.mjs'),src,{mode:0o600});
const config={
 name:'faceless-access-prueba',
 main:'./access-source.mjs',
 compatibility_date:settings.compatibility_date||'2026-11-01',
 ...(Array.isArray(settings.compatibility_flags)&&settings.compatibility_flags.length?{compatibility_flags:settings.compatibility_flags}:{}),
 workers_dev:true,
 assets:{directory:'./public',binding:'ASSETS'},
 d1_databases:[{binding:'DB',database_name:'faceless-access-d1',database_id:db.id}],
 services:[{binding:'MEDIA',service:'faceless-images'}]
};
// Preserve the existing cleanup schedule, if the API exposes it; never invent triggers.
try{
 const schedule=await load('/workers/scripts/faceless-access-prueba/schedules');
 const entries=Array.isArray(schedule.schedules)?schedule.schedules:Array.isArray(schedule)?schedule:[];
 const crons=entries.map(x=>x.cron).filter(Boolean);
 if(crons.length)config.triggers={crons};
}catch{/* If schedules cannot be read, retain the existing Worker code and bindings. */}
await writeFile(join(build,'wrangler.json'),JSON.stringify(config,null,2),{mode:0o600});
console.log('Prepared existing D1 access Worker source and curated public assets.');
console.log('Verified bindings: DB (D1), MEDIA (service), ASSETS (static files).');
console.log('Client gateway loaded:',html.includes('scripts/gateway-access.js'));
console.log('No secrets or access-worker code are included in public asset directory.');
