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
