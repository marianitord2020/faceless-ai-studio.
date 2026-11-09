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

## Seguridad y límites
- `APP_PASSCODE` es una protección básica para una web personal. Antes de abrir la web a clientes necesitas autenticación individual, límites por usuario y control de gastos.
- La cuota diaria gratis de Cloudflare puede agotarse. No se activan pagos automáticamente.
- Los renders de video dependen de MediaRecorder y del dispositivo.
