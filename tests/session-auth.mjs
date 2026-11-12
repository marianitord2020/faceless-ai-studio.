import assert from 'node:assert/strict';
import {issueSession,validateSession,SESSION_LIFETIME_DAYS} from '../workers/session-auth.js';
import worker from '../workers/ai-images-worker.js';

const secret='unit-test-only-secret-32-characters!';
const origin='https://marianitord2020.github.io';
const now=Date.UTC(2026,10,12);
const issued=await issueSession(secret,origin,now);
assert.equal(SESSION_LIFETIME_DAYS,30);
assert.match(issued.token,/^fs1\.[0-9a-z]+\.[0-9a-z]+\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/);
assert.equal(await validateSession(issued.token,secret,origin,now),true);
assert.equal(await validateSession(issued.token,secret,'https://attacker.example',now),false);
assert.equal(await validateSession(issued.token,'different-authorization-secret!',origin,now),false);
assert.equal(await validateSession(issued.token,secret,origin,now+31*86400000),false);
assert.equal(await validateSession(issued.token,secret,origin,now-90000),false);
const parts=issued.token.split('.');
parts[3]=parts[3].slice(0,-1)+(parts[3].at(-1)==='A'?'B':'A');
assert.equal(await validateSession(parts.join('.'),secret,origin,now),false);
assert.equal(await validateSession('fs1.invalid',secret,origin,now),false);

async function call(credential,method='POST',route='/auth/session',requestOrigin=origin){
 const req=new Request('https://faceless-images.example.workers.dev'+route,{
  method,headers:{Origin:requestOrigin,'x-app-token':credential||'','content-type':'application/json'},
  ...(method==='POST'?{body:'{}'}:{})
 });
 return worker.fetch(req,{APP_PASSCODE:secret,ALLOWED_ORIGIN:origin});
}
assert.equal((await call('wrong-code')).status,401);
assert.equal((await call(secret,'POST','/auth/session','https://evil.example')).status,403);
const first=await call(secret);
assert.equal(first.status,200);
const data=await first.json();
assert.equal(typeof data.token,'string');
assert.ok(!data.token.includes(secret),'Secret must never be in response');
assert.ok(data.expiresAt>Date.now(),'Expires after issuance');
assert.equal(await validateSession(data.token,secret,origin),true);
const renewal=await call(data.token);
assert.equal(renewal.status,200,'Signed session must renew without original code');
const renewalData=await renewal.json();
assert.equal(await validateSession(renewalData.token,secret,origin),true);
const wrongRoute=await call(data.token,'POST','/not-a-route');
assert.equal(wrongRoute.status,404);
const preflight=await call('', 'OPTIONS');
assert.equal(preflight.status,204);
assert.equal((await call(data.token,'POST','/images')).status,400,'Session can authorize an actual image request, then input validation runs');
console.log('PASS: 30-day signed session, expiry, tamper resistance, master key rotation, CORS, renewal and Worker authorization');
