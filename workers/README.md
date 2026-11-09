# Faceless AI Studio — fotos automáticas

## Despliegue automático desde GitHub (recomendado)
Ya existe el workflow [Publicar fotos IA en Cloudflare](../.github/workflows/deploy-images.yml).
El propietario del repositorio **solo** debe gestionar las credenciales. Nunca debe pegarlas en el chat, en código ni en un commit.

1. En https://dash.cloudflare.com/profile/api-tokens crea un token restringido a la cuenta correspondiente y con permiso **Edit Cloudflare Workers**.
2. En https://github.com/marianitord2020/faceless-ai-studio./settings/secrets/actions crea los secretos:
   - \`CLOUDFLARE_API_TOKEN\`: el token privado.
   - \`CLOUDFLARE_ACCOUNT_ID\`: el identificador de cuenta que aparece en Cloudflare.
3. El secreto \`APP_PASSCODE\` se conserva **únicamente en el Worker de Cloudflare** y no debe copiarse en la web ni en GitHub.
4. Después, ejecutar o reintentar [el workflow](https://github.com/marianitord2020/faceless-ai-studio./actions/workflows/deploy-images.yml). El proceso desplegará código, configuración y binding AI. Las siguientes actualizaciones del directorio \`workers/\` se publicarán automáticamente al cambiar el repositorio.

Si faltan credenciales, el proceso da un error claro y **no** modifica Cloudflare. 

## Estado
El frontend y este backend están versionados en GitHub. **GitHub Pages no ejecuta Cloudflare Workers.**
Debes desplegar por separado el Worker, activar su binding AI y establecer un código de acceso.
Hasta que se despliegue, el botón de fotos informará que no logra conectarse.

## Configuración desde Android (panel de Cloudflare)
1. Abre https://dash.cloudflare.com/ y entra en **Workers & Pages**.
2. Crea un Worker llamado **faceless-images** y publica el código de [ai-images-worker.js](ai-images-worker.js). También puedes conectar este repositorio y configurar la carpeta base \`workers\` usando el archivo \`wrangler.toml\`.
3. En ese Worker agrega el **binding Workers AI** con nombre **AI**. Es imprescindible para FLUX.1 Schnell.
4. En **Settings > Variables and Secrets**, crea:
   - **APP_PASSCODE** — tipo **Secret**; un código aleatorio y privado de **mínimo 16 caracteres**. No lo copies en GitHub ni lo compartas en el chat.
   - **ALLOWED_ORIGIN** — variable normal: el origen de tu web, por ejemplo \`https://marianitord2020.github.io\`. No agregues rutas ni barra final.
   - **ENABLE_PAID_IMAGES** — variable normal \`false\`.
5. Asegúrate de que el Worker tenga habilitado su dominio \`workers.dev\` y que su URL sea
   \`https://faceless-images.marianitord2020.workers.dev\`.
   Si Cloudflare te da otro subdominio, actualiza \`FACELESS_IMAGE_API\` en \`scripts/ai-photos.js\` con el dominio real.
6. Abre Faceless AI Studio en tu navegador, genera un proyecto, entra en la pestaña **🎬 Video** y pulsa **Generar fotos automáticamente**. Introduce tu APP_PASSCODE privado una sola vez cuando se solicite. La web te irá mostrando las fotografías por escena y podrás descargarlas.

### Sin mensualidad ahora
El modo inicial usa el binding \`AI\` de Cloudflare y \`@cf/black-forest-labs/flux-1-schnell\`.
Cloudflare incluye una asignación gratuita diaria; al agotarse, si no hay más proveedores habilitados, la página mostrará el error y conservará las fotos ya realizadas. **No se utiliza Leonardo ni Gemini hasta que tú habilites pagos.**

### Más adelante: respaldo automático de Leonardo y Gemini
Únicamente cuando quieras pagar por uso de API:
- Crear y guardar **LEONARDO_API_KEY** como Secret de Cloudflare.
- Crear y guardar **GEMINI_IMAGE_API_KEY** como Secret de Cloudflare.
- Opcional: \`LEONARDO_MODEL_ID\` y \`GEMINI_IMAGE_MODEL\`.
- Cambiar \`ENABLE_PAID_IMAGES\` a \`true\`.

Con pagos activos el orden será **Leonardo → Gemini → Cloudflare**. En errores del inicio de generación (incluidos límites o cuota) se prueba el siguiente proveedor. Si Leonardo ya aceptó un trabajo, el navegador **consulta el mismo ID**, sin iniciar otro de manera automática.

**Importante:** el plan gratuito del sitio web de Leonardo no es equivalente al acceso gratuito a su API. La API de imágenes de Gemini también puede requerir facturación. Nunca introduzcas las claves API en la página pública.

### Limitaciones y seguridad
- Las fotos generadas están solo en la memoria del navegador: descárgalas antes de actualizar o cerrar.
- El código APP_PASSCODE es un bloqueo básico para un proyecto personal, **no** sustituye autenticación individual, límites por usuario y control de costos para una web pública.
- La opción de video aprovecha las imágenes de IA en las escenas y conserva las fotos manuales como alternativa.
- El render de video sigue dependiendo de la compatibilidad de MediaRecorder del dispositivo.
- La conexión a Cloudflare desde GitHub **no está desplegada automáticamente** por estos archivos.
