# Arquitectura de IA de Faceless AI Studio

La página llama a Cloudflare mediante HTTPS y el código privado APP_PASSCODE. Solo el Worker lee las API Keys. Nunca se guardan claves de proveedores en HTML, JavaScript del navegador, localStorage o commits.

## Política de coste vigente

`FREE_DAILY_ONLY=true` es el valor predeterminado, incluso si falta la variable. Esta configuración impide usar los adaptadores de Deepgram y Hugging Face y la generación de imágenes de pago. No crea cuentas, compra créditos ni activa facturación.

La aplicación no puede convertir un plan de proveedor ya facturado en gratuito: usa cuentas sin facturación automática y los límites que permita cada proveedor. No se promete una comprobación universal del saldo antes de cada petición; la API del proveedor hace cumplir sus cuotas y sus errores disparan el respaldo.

| Tarea | Ruta | Principal solicitado | Respaldo / modo gratuito |
| --- | --- | --- | --- |
| Guion y texto | POST /script | Gemini | Groq existente; Hugging Face solo con habilitación explícita fuera del modo diario |
| Fotos | POST /images | Gemini Image preparado | Cloudflare existente en modo gratuito; Gemini Image y HF desactivados por política de coste |
| Timestamps | POST /analyze | Deepgram Nova-3 preparado | HF ASR preparado; por defecto Whisper local en el cliente |
| Texto a voz | POST /voice | EasyVoice | Voz española existente; HF TTS necesita un despliegue compatible configurado y habilitación |

Gemini conserva las herramientas de investigación para noticias; ni Groq ni HF sustituyen búsquedas o lecturas de fuentes por respuestas de un modelo de texto sin acceso a las fuentes.

## Límites comprobados el 10 de noviembre de 2026

- [EasyVoice](https://easyvoice.ae/api-docs): 5000 caracteres diarios, compartidos con su web. Su catálogo gratuito documentado es inglés y árabe. El adaptador gratuito no selecciona voces de pago ni intenta leer español con una voz inglesa. Para español conserva la voz actual de Cloudflare/Gemini.
- [Deepgram](https://deepgram.com/pricing): créditos iniciales de prueba, no cuota diaria perpetua. No se activa en modo diario.
- [Hugging Face](https://huggingface.co/docs/inference-providers/pricing): la cuenta Free no incluye créditos mensuales en la tabla actual. No es un respaldo sin coste garantizado. Su adaptador no se llama en modo diario.
- [Gemini](https://ai.google.dev/gemini-api/docs/pricing): las cuotas dependen del modelo y proyecto. La generación de imágenes no se trata como API gratuita. El acceso gratuito a una web de chat no implica acceso gratuito a su API.

## Archivos y contratos

- `workers/media-providers.js`: fetch de Deepgram, EasyVoice y HF; normalización de binarios y timestamps; política de coste y función `withFallback`.
- `workers/script-generator.js`: Gemini → Groq → HF para redacción. Investigación con herramientas permanece en Gemini.
- `workers/ai-images-worker.js`: rutas protegidas, fotos y voces; análisis WAV limitado a 10 minutos.
- `scripts/ai-client.js`: funciones de navegador `FacelessAI.generateText`, `generatePhotos`, `textToSpeech`, `analyzeAudio`.
- `scripts/local-speech.js` y `local-speech-worker.js`: reconocimiento local, sin subir audio; descarga inicial del modelo.

Las respuestas multimedia tienen `{provider,mime,dataURI}`. Las transcripciones tienen `{provider,duration,granularity,words:[{word,start,end}]}` con segundos desde el comienzo del archivo. Deepgram devuelve `granularity: word`; el adaptador HF declara `phrase` porque su API documenta chunks y no garantiza palabras. No dividas esas frases para presentarlas como marcas exactas. El reconocimiento automático siempre requiere revisión humana y no garantiza exactitud absoluta.

## Peticiones desde la página

```js
// appCode es APP_PASSCODE, NO una clave de Gemini/Deepgram/etc.
const script = await FacelessAI.generateText({
  topic: 'Una aventura ficticia en Higüey', mode: 'ficcion',
  style: 'Fantasía', duration: 30
}, appCode);
const image = await FacelessAI.generatePhotos(
  'Una calle tropical al atardecer, sin texto', '9:16', appCode
);
const spanishVoice = await FacelessAI.textToSpeech('Hola, bienvenido.', appCode);
const freeEnglishVoice = await FacelessAI.textToSpeech('Hello, welcome.', appCode, {
  language: 'en', voice: 'female'
});
const timing = await FacelessAI.analyzeAudio(file, appCode, {
  remote: false, // gratis: Whisper local, no envía el audio
  onProgress: message => console.log(message)
});
// remote:true envía el WAV al Worker. Si el servicio no está disponible,
// vuelve a Whisper local. No se envía audio con remote:false.
```

`generateText` devuelve un guion de escenas del proyecto, no un chat genérico. El cliente convierte MP3/WAV/M4A/etc. que pueda decodificar el navegador a WAV PCM mono 16 kHz. Máximo de entrada: 35 MB y 10 minutos. El respaldo remoto HF se limita a 30 segundos por petición para acotar memoria; archivos más largos vuelven a Whisper local si Deepgram no está disponible. Los abortos, el acceso no autorizado y los errores de formato no se reintentan en otro servicio. `AbortSignal` se puede pasar a las funciones.

## Claves privadas y configuración

Guarda en GitHub Actions Secrets o directamente en Cloudflare: `GEMINI_API_KEY`, `GEMINI_SCRIPT_API_KEY`, `GEMINI_IMAGE_API_KEY`, `DEEPGRAM_API_KEY`, `EASYVOICE_API_KEY`, `HF_API_KEY`. Se conservan `GEMINI_TTS_API_KEY` y `GROQ_API_KEY` anteriores. Solo se necesitan las claves de los proveedores que vayas a utilizar. El workflow sincroniza claves presentes; no imprime sus valores ni borra otras claves.

Valores publicados actualmente:

```toml
FREE_DAILY_ONLY = "true"
ENABLE_PAID_IMAGES = "false"
ENABLE_HF_INFERENCE = "false"
ENABLE_DEEPGRAM_TRIAL = "false"
```

Para usar posteriormente créditos de prueba u opciones que podrían costar dinero, una decisión explícita debe cambiar `FREE_DAILY_ONLY` a `false` y el indicador correspondiente. Tener una clave guardada no basta para activar estos proveedores. Las modificaciones de variables deben conservarse también en `workers/wrangler.toml` para que un futuro despliegue no las restablezca.

Modelos HF configurables: `HF_TEXT_MODEL`, `HF_IMAGE_MODEL`, `HF_ASR_MODEL`, `HF_TTS_MODEL`. Un modelo del Hub no implica que esté servido por Inference Providers. HF TTS no tiene modelo predeterminado: necesita comprobar un despliegue compatible; sin él el respaldo continúa a la voz existente. No se conecta una URL arbitraria ni se envían tokens a dominios configurados por visitantes.

No se ha verificado generación real con claves nuevas. Las pruebas automatizadas usan respuestas simuladas para comprobar contratos, autenticación, bloqueo de coste, validación de tiempos, binarios y respaldo. Una prueba simulada no demuestra disponibilidad o crédito de una cuenta real.

## Respaldos gratuitos de fotos: AI Horde e ImageRouter

Orden gratuito: Cloudflare FLUX.1 → Cloudflare FLUX.2 → ImageRouter si tiene clave → AI Horde. Los dos modelos de Cloudflare comparten cuota; los nuevos respaldos usan proveedores independientes.

- `ENABLE_AI_HORDE=true` habilita AI Horde. `AI_HORDE_API_KEY` es opcional para probar el acceso anónimo; una cuenta propia mejora la prioridad y evita restricciones del acceso anónimo. Los trabajos son asíncronos: se consulta su estado sin iniciar otra foto; al detener o superar seis minutos se solicita cancelar el trabajo. La disponibilidad depende de voluntarios y puede no haber capacidad.
- `ENABLE_IMAGEROUTER=true` habilita ImageRouter únicamente cuando existe `IMAGEROUTER_API_KEY`. `IMAGEROUTER_MODEL` selecciona `Tongyi-MAI/Z-Image-Turbo:free` por defecto. Antes de generar se verifica que esté en el catálogo gratuito con precios mínimo y máximo cero. Si desaparece o cambia de precio, se omite. No se cambia a un modelo de pago. La cuota efectiva debe comprobarse en la cuenta de ImageRouter; no se promete una cantidad diaria universal para la API.
- Guarda las claves en GitHub Actions Secrets con los nombres exactos anteriores. El despliegue las sincroniza en Cloudflare; no se escriben en el navegador.
- Los resultados de AI Horde se solicitan como base64 WebP: el servidor no descarga enlaces arbitrarios devueltos por trabajadores comunitarios. ImageRouter usa `b64_ephemeral`.
- `node tests/free-image-providers.mjs` verifica el catálogo gratuito, las claves ausentes, la cola, la cancelación y el respaldo tras agotar la cuota de Cloudflare con respuestas simuladas. Una prueba simulada no acredita una generación real.

Registro: https://aihorde.net/register y https://imagerouter.io/ (API Keys en su panel).

### Resultado de activación real de ImageRouter — 10 de noviembre de 2026

La clave se sincronizó en Cloudflare. La API respondió HTTP 403: los modelos gratuitos están disponibles en la web, pero el uso por API requiere un depósito inicial contra abuso. No se realizó ningún depósito. `ENABLE_IMAGEROUTER=false` conserva la política de no pagar. Cloudflare y AI Horde siguen habilitados. El adaptador y la clave se conservan preparados; su futura activación requiere una decisión explícita sobre ese depósito. La prueba real permanece como script manual y no bloquea despliegues posteriores.

## Bancos de fotos existentes

En Video → Fotografías → Personalizar → Buscar fotos gratuitas se pueden buscar Openverse, Pixabay y Pexels. Cada selección se asigna a una escena, descarga una copia a través del Worker y conserva autor, fuente y licencia en el proyecto e IndexedDB. El botón Copiar créditos permite preparar la atribución de las fotos utilizadas. Reemplazar una foto por una imagen propia o generada elimina el crédito anterior.

- Openverse: búsqueda anónima; solo CC0, dominio público y CC BY. Importa la vista previa del proxy Openverse para evitar descargas arbitrarias. La calidad depende del tamaño servido por ese proxy. No se prometen imágenes de alta resolución ni disponibilidad continua. Si el servicio bloquea el acceso del servidor, se informa y queda el enlace al banco para uso manual.
- Pixabay: clave gratuita `PIXABAY_API_KEY` en GitHub Actions Secrets. Las consultas se almacenan 24 horas con Cloudflare Cache API; no hay búsquedas masivas ni hotlinking permanente de fotos seleccionadas.
- Pexels: clave gratuita `PEXELS_API_KEY` en GitHub Actions Secrets. Los resultados muestran autor, enlace a Pexels y licencia.

Las rutas POST `/stock/search` y `/stock/import` exigen el mismo APP_PASSCODE del editor. Las claves de los bancos solo existen en el servidor. Cada resultado contiene una selección firmada de dos horas; el importador rechaza cambios de URL, redirecciones fuera de los hosts permitidos y archivos mayores de 8 MB. No se obtienen imágenes directamente de URLs que escribe un visitante.

No se presentan fotos de archivo como prueba de que ocurrió una noticia. Verifica su contexto y licencia original antes de publicar.

Crea las claves en https://pixabay.com/api/docs/ y https://www.pexels.com/api/ . Las pruebas de la interfaz y contratos usan respuestas simuladas; no demuestran acceso real a una cuenta sin su clave.

Wikimedia Commons se incluye como cuarto banco sin clave. Si Openverse responde 403, 429 o un fallo temporal, la búsqueda pasa a Commons y lo indica expresamente. Se conservan las fuentes reales y se filtran las licencias CC0, dominio público y CC BY.

## Anime, ilustración 2D y 3D: bancos externos

Video → Fotografías → Personalizar → Fotos e ilustraciones → Anime, 2D, 3D y más permite elegir Anime/manga, 2D, 3D, 3D animado de película, cómic o acuarela y abrir una búsqueda contextual en Icons8 Ouch!, Vecteezy o Freepik.

Esta sección abre las páginas de los proveedores. No presenta sus catálogos como una API ya conectada, no extrae sus webs ni hace llamadas a APIs de pago. El usuario descarga un recurso gratuito desde el banco y lo importa en PNG, JPG o WebP (hasta 8 MB) a la escena seleccionada. Se registra el enlace original, autor, licencia indicada y estilo junto con la imagen. Los archivos ZIP, EPS, PSD o SVG necesitan exportarse primero a un formato compatible.

- Icons8 Ouch!: consultar el filtro o etiqueta Free de la web; su API no tiene nivel gratuito según su centro de ayuda. No se usa su API para descargar ni almacenar activos.
- Vecteezy: publica una API Free con hasta 500 descargas al mes. El acceso directo por API no se ha conectado: requiere cuenta y clave. La sección ofrece el flujo externo de descarga/importación y créditos.
- Freepik: la API utiliza créditos. Se ofrece búsqueda en su web y descarga manual de los recursos que la cuenta permita utilizar gratuitamente.

“3D animado (tipo Pixar)” es una categoría visual de búsqueda. No indica que el material pertenezca a Pixar ni garantiza personajes o franquicias licenciadas.

Se valida que el enlace de procedencia pertenezca al proveedor elegido. Los créditos introducidos por el usuario no verifican por sí mismos una licencia: deben copiarse de la descarga original y conservarse al publicar.

## Lectura del relato al pegar una URL

El campo Enlace del relato ahora solicita `/read-url` al pegar o terminar de escribir un enlace HTTPS válido. También existe Leer relato desde el enlace para reintentar y Copiar texto cargado. El lector rellena título, texto original y, cuando puede determinarlo, idioma y autor. Si se edita el campo mientras llega una respuesta, esa respuesta no borra la edición.

El servidor descarga HTML público con un límite de 2 MB, obtiene el contenido de article/main o contenedores de relato comunes y elimina scripts, navegación y formularios. No usa Gemini ni Groq para inventar, completar o resumir el texto. No accede a sesiones privadas ni evita muros de pago o bloqueos. Las páginas dinámicas o sin contenido principal identificable pueden necesitar copia manual.

El texto original admite hasta 100.000 caracteres. MyMemory conserva su límite separado de 5.000 caracteres por traducción: si el relato es mayor, se carga completo y se informa del límite sin recortarlo. La creación de un video conserva su política existente de usar un fragmento que cabe en la duración elegida y guardar el original.

La ruta exige APP_PASSCODE. Solo admite HTTPS público por el puerto estándar; rechaza credenciales, hosts locales, IPs literales y resoluciones DNS privadas, y vuelve a comprobar cada redirección. La extracción conserva la referencia del sitio y autor detectado; eso no concede por sí mismo permisos de reutilización.

Pruebas: `node tests/url-reader.mjs` y el workflow Verificar lectura automática de relatos por URL. La prueba de interfaz usa un relato sintético; una prueba de extracción real confirmó el título, autor y 12.348 caracteres del enlace de Ciudad Seva solicitado, sin incluir menús ni publicidad.
