/* Real free-model smoke test. Do not log keys, prompts, responses or image data. */
import assert from 'node:assert/strict';
import {imageRouter} from '../workers/free-image-providers.js';
if(!process.env.IMAGEROUTER_API_KEY){
 console.log('IMAGEROUTER_LIVE_PENDING: falta IMAGEROUTER_API_KEY en GitHub Actions Secrets.');
 process.exit(0);
}
try{
 const result=await imageRouter({IMAGEROUTER_API_KEY:process.env.IMAGEROUTER_API_KEY},'A cinematic photograph of a tropical garden in daylight, no text, no people','9:16');
 assert.match(result.dataURI,/^data:image\/webp;base64,/);
 const bytes=Buffer.from(result.dataURI.split(',')[1],'base64');
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
 assert.ok(bytes.length>500);
 console.log('IMAGEROUTER_LIVE_OK: imagen WebP real validada; modelo gratuito; '+result.provider);
}catch(error){
 const detail=String(error.providerDetail||'').split(process.env.IMAGEROUTER_API_KEY).join('[redacted]').replace(/[\r\n]/g,' ').slice(0,240);
 if(detail)console.error('IMAGEROUTER_REASON: '+detail);
 console.error('IMAGEROUTER_LIVE_FAILED: HTTP '+(error.httpStatus||'desconocido')+'. '+(/precio cero/.test(error.message)?'El modelo no figura con precio cero.':'Revisa disponibilidad, cuota y permisos; no se usan modelos de pago.'));
 process.exitCode=1;
}
