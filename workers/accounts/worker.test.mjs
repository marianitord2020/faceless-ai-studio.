import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import worker from './worker.js';

test('registro privado, sesión SQL y proxy protegido', async () => {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  const origin = 'https://studio.example';
  const password = 'example-password-123';
  let mediaCalls = 0;
  const env = {
    DB: { prepare: query => ({ bind: (...values) => ({
      first: async () => sql.prepare(query).get(...values),
      run: async () => sql.prepare(query).run(...values),
    }) }) },
    PASSWORD_PEPPER: 'test-only-pepper-at-least-32-characters',
    REGISTRATION_CODE: 'test-only-invite',
    APP_PASSCODE: 'test-only-backend-secret',
    ASSETS: { fetch: () => new Response('Editor') },
    MEDIA: { fetch: async req => {
      mediaCalls++;
      assert.equal(req.headers.get('x-app-token'), env.APP_PASSCODE);
      assert.equal(req.headers.get('cookie'), null);
      assert.equal(new URL(req.url).pathname, '/ideas');
      assert.deepEqual(await req.json(), { topic: 'Prueba' });
      return Response.json({ ok: true });
    } },
  };
  const get = (path, cookie = '') => worker.fetch(new Request(origin + path, { headers: { cookie } }), env);
  const post = (path, body, cookie = '', from = origin) => worker.fetch(new Request(origin + path, {
    method: 'POST',
    headers: { origin: from, cookie, 'x-app-token': 'faceless-account-session' },
    body,
  }), env);
  const form = (fields = {}) => new URLSearchParams({ username: 'Mariano', password, ...fields });
  const apiBody = () => new Blob(['{"topic":"Prueba"}'], { type: 'application/json' });
  assert.equal((await get('/')).headers.get('Location'), '/login');
  assert.equal((await get('/scripts/discover.js')).status, 303);
  assert.equal((await post('/api/ideas', apiBody())).status, 401);
  assert.equal((await post('/register', form({ invite: 'wrong' }))).status, 403);
  assert.equal((await post('/register', form({ invite: env.REGISTRATION_CODE }), '', 'https://other.example')).status, 403);
  const registered = await post('/register', form({ invite: env.REGISTRATION_CODE }));
  assert.equal(registered.status, 303);
  const setCookie = registered.headers.get('Set-Cookie');
  assert.match(setCookie, /HttpOnly; Secure; SameSite=Lax/);
  const session = setCookie.split(';')[0];
  const user = sql.prepare('SELECT * FROM users').get();
  assert.equal(user.username, 'mariano');
  assert.match(user.password_hash, /^[a-f0-9]{64}$/);
  assert.notEqual(user.password_hash, password);
  assert.notEqual(sql.prepare('SELECT token_hash FROM sessions').get().token_hash, session.split('=')[1]);
  assert.equal((await get('/', session)).headers.get('Cache-Control'), 'private, no-store');
  assert.equal(await (await get('/', session)).text(), 'Editor');
  assert.deepEqual(await (await post('/api/ideas', apiBody(), session)).json(), { ok: true });
  assert.equal(mediaCalls, 1);
  assert.equal((await post('/logout', null, session)).status, 303);
  assert.equal((await post('/api/ideas', apiBody(), session)).status, 401);
  assert.equal((await post('/login', form({ password: 'incorrect-password' }))).status, 401);
  assert.equal((await post('/login', form())).status, 303);
});
