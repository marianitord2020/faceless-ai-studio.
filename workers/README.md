# Configuración vigente

Consulta [la arquitectura y política gratuita](../docs/AI_ARCHITECTURE.md). `FREE_DAILY_ONLY=true` prevalece sobre las opciones de pago descritas más abajo. Deepgram y Hugging Face están preparados y desactivados; EasyVoice gratis no incluye español.

# Faceless AI Studio — fotografías IA

## Implementado
- Interfaz pública: botón **Generar fotos automáticamente** en la pestaña **🎬 Video**, con una foto por escena y opción de descarga.
- Cloudflare Worker publicado como `faceless-images`.
- Modelo gratuito inicial: Cloudflare Workers AI FLUX.1 Schnell con binding `AI`.
- Código para respaldo de Leonardo y Gemini preparado, **desactivado hasta autorizar uso pagado**.
- GitHub Actions: despliegue automático al cambiar archivos de `workers/`.

## Configuración privada desde GitHub (solo propietario)
Entra a [GitHub Actions Secrets](https://github.com/marianitord2020/faceless-ai-studio./settings/secrets/actions) y guarda estos tres secretos; **nunca publiques sus valores, ni los pegues en el chat**:

| Nombre | Contenido |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Token de Cloudflare limitado a Workers Scripts: Edit |
| `CLOUDFLARE_ACCOUNT_ID` | ID de cuenta Cloudflare |
| `APP_PASSCODE` | Código aleatorio privado de al menos 16 caracteres |

El workflow [Publicar fotos IA en Cloudflare](https://github.com/marianitord2020/faceless-ai-studio./actions/workflows/deploy-images.yml) entrega automáticamente `APP_PASSCODE` al Worker como Secret, sin guardarlo en el repositorio ni exponerlo en GitHub Pages. Si faltan secretos, el workflow falla sin publicar cambios nuevos. Después de crear o cambiar secretos, vuelve a ejecutar el workflow desde la pestaña **Actions** (los cambios de secretos no lo inician solos).

Cloudflare: `https://faceless-images.marianitord2020.workers.dev`
Ruta de generación: `POST /images`. No abras la URL como página web: requiere POST, Origin permitido y código privado.

## Usar desde Android
1. Abre Faceless AI Studio en GitHub Pages y entra a uno de tus proyectos.
2. Abre la pestaña **🎬 Video** y pulsa **Generar fotos automáticamente**.
3. Introduce tu `APP_PASSCODE` cuando se solicite. La web no conserva este código tras recargar.
4. Espera las fotografías y descárgalas antes de cerrar o actualizar: quedan solamente en la memoria del navegador durante la sesión.

## Opcional: conectar Leonardo y Gemini más adelante
En el Worker de Cloudflare, y **solo después de habilitar API de pago voluntariamente**:
- `LEONARDO_API_KEY` y `GEMINI_IMAGE_API_KEY` como Secrets
- `LEONARDO_MODEL_ID` / `GEMINI_IMAGE_MODEL` si hace falta
- `ENABLE_PAID_IMAGES=true` como variable normal

Con modo pagado: Leonardo → Gemini → Cloudflare. Si un proveedor falla al **iniciar** un trabajo, intenta el siguiente. La generación ya iniciada por Leonardo se consulta por ID sin iniciar otra y evitar cobros duplicados. El plan gratuito de Leonardo en su web no implica API gratuita.

## Narración automática en español (Google Fola + Cloudflare)
El botón **Generar voz automáticamente** está en la pestaña **🎬 Video**. Genera narración por escena, la une en un WAV de la duración del proyecto y la carga en el montaje. También permite escuchar y descargar ese WAV.

- **Funciona sin nueva clave:** Cloudflare Workers AI `@cf/deepgram/aura-2-es`, voz Celeste o Álvaro en español, dentro de la cuota que tenga tu cuenta.
- **Voz Fola de Google AI Studio:** opcional. En [Google AI Studio](https://aistudio.google.com/apikey) crea una clave API del proyecto que permita usar TTS. Guárdala **solo** en [GitHub > Actions secrets](https://github.com/marianitord2020/faceless-ai-studio./settings/secrets/actions) con nombre `GEMINI_TTS_API_KEY`. Nunca compartas el valor en el chat ni en HTML. Vuelve a ejecutar el workflow de despliegue; sincronizará el secreto en Cloudflare. Cuando exista, el servidor intentará **Gemini 3.8 Flash-Lite TTS (Fola)** primero, y ante un error usará **Cloudflare Aura-2-es**.
- Google publica una cuota gratuita para ciertos modelos TTS, sujeta a disponibilidad y límites por cuenta; **no se habilita facturación automáticamente**. Las llamadas se pagan o descuentan según el plan activo de cada servicio.
- El texto de cada escena tiene límite de 650 caracteres. Si la voz dura más que el tiempo asignado a una escena, el montaje recorta esa parte y avisa. Para evitar cortes, ajusta el guion.
- No hay sincronización exacta por palabra: cada escena se coloca en su instante programado. La narración generada se almacena temporalmente en memoria y puede descargarse como WAV.

## Seguridad y límites
- `APP_PASSCODE` es una protección básica para una web personal. Antes de abrir la web a clientes necesitas autenticación individual, límites por usuario y control de gastos.
- La cuota diaria gratis de Cloudflare puede agotarse. No se activan pagos automáticamente.
- Los renders de video dependen de MediaRecorder y del dispositivo.

## Respaldo de texto con Groq

- Gemini sigue siendo el proveedor principal. `GEMINI_SCRIPT_API_KEY` permite usar una clave separada para guiones; si falta, se conserva `GEMINI_TTS_API_KEY` como antes.
- Guarda `GROQ_API_KEY` únicamente como secreto de GitHub Actions o del Worker. El despliegue sincroniza la clave cuando existe; no aparece en la página.
- Ante un fallo de Gemini, la generación de texto intenta Groq `openai/gpt-oss-120b`. Si falta la clave, Groq no se llama. Esto no activa ni configura facturación: el uso depende del plan y cuotas de la cuenta del proveedor.
- Las búsquedas actuales y lecturas de fuentes con herramientas Gemini no pasan a un modelo sin búsqueda. Si no pueden verificarse, se informa del error. Un guion puede redactarse con Groq después de haber recuperado la información verificada.
- Los resultados identifican el proveedor real. No se sustituyen errores por historias prefabricadas.
- Variables opcionales del Worker: `GEMINI_SCRIPT_MODEL`, `GROQ_TEXT_MODEL`. Los valores predeterminados conservan Gemini 3.5 Flash-Lite y GPT-OSS 120B.
- Prueba sin credenciales reales: `node tests/text-fallback.mjs`. Verifica cuota simulada, autenticación, preferencia por Gemini y bloqueo del respaldo para investigación.

La sincronización de audio subido o grabado usa ahora Whisper Tiny multilingüe dentro de un Worker del navegador. Descarga los archivos del modelo la primera vez y no envía la grabación al servidor. Analiza la grabación después de detenerla; no es escucha en vivo. Puede detenerse el análisis y conservar los tiempos anteriores.
