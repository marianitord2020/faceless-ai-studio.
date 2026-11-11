import { cp, readFile, rm, writeFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const output = new URL('./.assets/', import.meta.url);
const sentinel = 'faceless-account-session';
const oldOrigin = 'https://faceless-images.marianitord2020.workers.dev';
const clientFiles = [
  'index.html', 'scripts/discover.js', 'scripts/ai-client.js',
  'scripts/ai-photos.js', 'scripts/ai-voice.js', 'scripts/stock-photos.js',
];

await rm(output, { recursive: true, force: true });
for (const name of ['styles', 'scripts', 'crear-con-ia', 'editar-sin-ia', 'index.html']) {
  await cp(new URL(name, root), new URL(name, output), { recursive: true });
}

for (const name of clientFiles) {
  const path = new URL(name, output);
  let source = (await readFile(path, 'utf8')).replaceAll(oldOrigin, '/api');
  // The existing UI uses a local marker to enable the controls. The API
  // discards that marker and authenticates exclusively with the session cookie.
  if (name === 'index.html') {
    source = source.replace('</head>', `<style>
.studio-access,#productionPass,#aiPhotosPasscode,#aiVoicePasscode,
label[for="productionPass"],label[for="aiPhotosPasscode"],label[for="aiVoicePasscode"],
#stockPhotos input[type="password"]{display:none!important}
.account-actions{display:flex;justify-content:flex-end;padding:8px 16px}
</style><script>window.facelessProductionPasscode=${JSON.stringify(sentinel)}</script></head>`)
      .replace('<body>', '<body><form class="account-actions" method="post" action="/logout"><button class="btn small">Cerrar sesión</button></form>');
  }
  if (name === 'scripts/ai-photos.js' || name === 'scripts/ai-voice.js') {
    source = source.replace(/let (facelessImagePasscode|facelessVoicePassword) = '';/, `let $1 = '${sentinel}';`);
  }
  if (name === 'scripts/stock-photos.js') {
    source = source.replace('const token=()=>', 'const token=()=>window.facelessProductionPasscode||');
  }
  await writeFile(path, source);
}
