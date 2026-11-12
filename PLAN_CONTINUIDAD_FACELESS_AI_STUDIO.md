# Faceless AI Studio — Plan de continuidad y desarrollo

**Fecha de registro:** 12 de noviembre de 2026  
**Estado:** Plan guardado para continuar posteriormente. No representa un despliegue de nuevas funciones.  
**Web definitiva:** https://marianitord2020.github.io/faceless-ai-studio./  
**Repositorio:** https://github.com/marianitord2020/faceless-ai-studio.  
**Rama:** `main`

## 1. Instrucciones permanentes del proyecto

- **No modificar la página de Inicio:** conservar exactamente su diseño actual, fotografías, colores, tarjetas, botones y distribución, salvo una solicitud explícita posterior.
- Las **cinco pantallas interiores** deben seguir el boceto aprobado en la conversación: **Noticias de hoy, Crear Video, Guion y Escenas, Editor de Escenas y Mis Proyectos**. Mantener la estética violeta/negra, tarjetas redondeadas, miniaturas de verdad y diseño móvil.
- Eliminar elementos visuales innecesarios, textos largos, pantallas repetidas y opciones **Pro/Premium**, sin eliminar funciones útiles. Las herramientas avanzadas deben estar plegadas y accesibles.
- Separar claramente **Crear con IA** y **Editar sin IA**, preservando los motores y controles de cada flujo.
- La aplicación está concebida para **Android**, con pantalla adaptable, botones que no se solapen y navegación sencilla.
- **No inventar** noticias, fuentes, fechas, imágenes fácticas, número de visitas ni estado de videos exportados.
- Antes de introducir nuevas dependencias, hacer una copia o commit y comprobar que no se rompe el código existente.
- No publicar contenido en redes sociales automáticamente.
- La decisión de contratar **Cloudflare y/o servicios de Google** se tomará en el futuro. No activar pagos, depósitos ni modelos de facturación sin autorización explícita.

## 2. Estado técnico a esta fecha

| Componente | Estado constatado / pendiente |
| --- | --- |
| Repositorio y GitHub Pages | Repositorio conectado y publicación de GitHub Pages exitosa tras la actualización visual del 12/11/2026. |
| Inicio | Se ha conservado el código del diseño vigente. No tocar en próximas revisiones. |
| Pantallas interiores | Nuevos archivos visuales desplegados; falta validación final en Android contra el boceto. |
| Cloudflare Worker | `faceless-images` desplegado y protegido mediante `APP_PASSCODE`; despliegue comprobado el 12/11/2026. |
| Guiones | Prueba real de Gemini completada en el Worker; respaldo Groq también probado. |
| Voz en español | Integración Gemini TTS y Cloudflare Aura-2; requiere prueba de extremo a extremo en Android y revisión de cuotas. |
| Fotos de IA | Cloudflare Workers AI y alternativa AI Horde configurados; dependen de disponibilidad/cuotas. Gemini Image y Leonardo no están habilitados en modo gratuito. |
| Noticias | Fuentes RD/GDELT y búsqueda de páginas sociales públicas indexadas implementadas; revisar vigencia, coincidencia y origen. |
| Editor IA y manual | Creados; faltan pruebas finales de subidas, escenas, subtítulos, sincronización y controles Android. |
| MP4/WebM 720p/1080p | Implementados a nivel de código, con verificación de archivo y conversión local; no declarar compatible en Android hasta probar exportaciones reales. |
| Usuarios y almacenamiento | Existe un código privado de acceso; falta autenticación individual y almacenamiento servidor para usuarios/clientes. |

### Pruebas pendientes

Una actualización visual reciente provocó fallos en verificaciones automáticas del menú/dashboard, comprobaciones de UI multimedia y video. Ejemplos observados: un selector oculto esperado visible por una prueba antigua; un placeholder diferente al esperado; una discrepancia en el conteo de elementos. **Estos resultados no prueban por sí solos un fallo real de la API.** Hay que separar pruebas desactualizadas de regresiones funcionales y volver a ejecutar el flujo completo.

## 3. Arquitectura actual que se debe conservar

### Interfaz
- `index.html`: aplicación y rutas principales.
- `scripts/approved-mockup.js` + `styles/approved-mockup.css`: diseño vigente de Inicio y componentes aprobados.
- `scripts/reference-interiors.js` + `styles/reference-interiors.css`: cambios visuales **solo de pantallas interiores**.
- `scripts/discover.js`: búsqueda y propuestas reales, cuatro ganchos seleccionables, creación de proyectos.
- `scripts/faceless-pages.js`, `scripts/faceless-final.js`, `scripts/studio-menus.js`: navegación y componentes.
- `scripts/ai-client.js`, `scripts/ai-photos.js`, `scripts/ai-voice.js`: comunicación con el Worker.
- `scripts/manual-studio.js`, `scripts/media-editor.js`, `scripts/scene-motion.js`, `scripts/scene-edit.js`: editor y montaje.
- `scripts/media-timing.js`, `scripts/local-speech.js`, `scripts/own-video.js`: tiempos, transcripción y archivos de usuario.
- `scripts/video-export.js`, `scripts/transcode-worker.js`, `scripts/video-progress.js`: exportación y progreso.

### Servidor
- Worker: `workers/ai-images-worker.js`.
- Investigación: `workers/news-search.js`, `workers/news-sources.js`, `workers/web-trends.js`, `workers/wiki-search.js`.
- Texto e ideas: `workers/script-generator.js`, `workers/ideas-generator.js`.
- Proveedores: `workers/media-providers.js`, `workers/free-image-providers.js`.
- Despliegue: `.github/workflows/deploy-images.yml`.
- Configuración: `workers/wrangler.toml`.
- Documentación técnica existente: `docs/AI_ARCHITECTURE.md`, `docs/hd-export.md`, `docs/manual-editor.md`.

### Seguridad
- **Nunca añadir API keys ni contraseñas al repositorio, HTML, JavaScript público o documentación.**
- Guardarlas exclusivamente en los **Secrets de Cloudflare** y, cuando corresponda, en **GitHub Actions Secrets** para el despliegue.
- `APP_PASSCODE` es el código de acceso a las rutas protegidas del Worker; no es una API key de proveedor.
- Para usuarios públicos, reemplazar la idea de una única clave compartida con autenticación individual, límites por usuario, seguridad del backend y monitoreo de costes.

## 4. Orden de trabajo antes de la puesta en producción completa

- [ ] **Paso A: Estabilizar GitHub Pages y navegación.** Verificar la URL definitiva, consola del navegador, rutas de Inicio / Noticias / Crear / Guion / Editor / Proyectos y diseño móvil sin desbordamientos.
- [ ] **Paso B: Regresión visual.** Capturar pantallas en Android y contrastarlas con el boceto aprobado; mantener Inicio sin cambios. Unificar tarjetas, espaciados, miniaturas, botones y estados vacíos.
- [ ] **Paso C: Test real de IA con controles de coste.** Crear ideas y guiones con Gemini; probar respaldo Groq; comprobar errores de autenticación y cuota; probar fuentes verificables de noticias.
- [ ] **Paso D: Fotos y voces.** Crear fotos pertinentes a cada escena, guardarlas/recuperarlas y generar audio en español; confirmar que el respaldo seleccionado realmente responde.
- [ ] **Paso E: Sincronización y edición.** Comparar duraciones de guion, audio, subtítulos, imágenes y escenas; probar cortes y reemplazos por escena; probar subida de fotos/video/audio propio.
- [ ] **Paso F: Exportación final.** Descargar **MP4 y WebM** a **720p y 1080p**, cuando el navegador/dispositivo lo permitan, y verificar pistas de video/audio, duración, resolución y reproducción en Android. No ofrecer un formato si falla la conversión real.
- [ ] **Paso G: Proyectos y persistencia.** Abrir, guardar, duplicar, respaldar y recuperar proyectos sin pérdida; probar reingreso y límites de almacenamiento.
- [ ] **Paso H: Usuarios y producción pública.** Cuando se vaya a abrir a otros usuarios: registro, contraseñas con hash seguro, sesiones, recuperación de acceso, base de datos, cuotas, rate limiting, monitorización y protección del gasto.

**Criterio de aceptación:** crear un video completo desde Android de principio a fin — elegir noticia o relato, seleccionar uno de cuatro ganchos, generar guion, crear imágenes pertinentes y voz, sincronizar subtítulos, revisar montaje, descargar y reproducir un archivo final sin errores — y repetir el mismo proceso de forma manual con archivos propios.

## 5. Mejoras cuando el usuario decida pagar Cloudflare o Google

### Decisiones primero
1. Preguntar **qué producto concreto** se ha contratado (Cloudflare Workers / AI / R2 / D1; Google AI Studio API / Gemini API con facturación / Google Cloud). La suscripción a una interfaz de Google no implica automáticamente cuota o acceso API de pago.
2. Revisar presupuesto mensual y límites máximos antes de habilitar generación pagada.
3. Confirmar proveedor, modelos disponibles, política de datos, precios y cuotas **en la fecha de contratación**; no asumir tarifas fijas.
4. Crear alertas y límites de consumo y conservar un mecanismo de respaldo ante cuota agotada.

### Posibles ampliaciones, sujetas a contratación
- **Cloudflare:** Worker para orquestación segura, `D1` para usuarios/proyectos si procede, `R2` para multimedia y Workers AI para modelos compatibles, siempre considerando límites y costos.
- **Google:** habilitar modelos Gemini API para guiones/imagen/voz **solo** si la cuenta contratada los ofrece y está autorizada la facturación.
- Alternar proveedores sin cobros duplicados; registrar solo los metadatos necesarios y mostrar errores reales cuando no exista cuota.
- Conectar opcionalmente animación de imagen a video y lipsync mediante servicios especializados **solo** tras estudiar costes/condiciones. El movimiento de cámara sobre una foto fija no equivale a animación facial o labios.
- Si el uso crece: sesiones por usuario, cola de generación, registros de trabajo, cuotas, recuperación ante fallos y almacenamiento duradero.

### Variables existentes — no colocar valores aquí
`APP_PASSCODE`, `GEMINI_TTS_API_KEY`, `GEMINI_SCRIPT_API_KEY`, `GEMINI_API_KEY`, `GEMINI_IMAGE_API_KEY`, `GROQ_API_KEY`, `LEONARDO_API_KEY`, `DEEPGRAM_API_KEY`, `EASYVOICE_API_KEY`, `HF_API_KEY`, `PIXABAY_API_KEY`, `PEXELS_API_KEY`, `AI_HORDE_API_KEY`, `IMAGEROUTER_API_KEY`.

Configuración gratuita vigente en `workers/wrangler.toml`:
- `FREE_DAILY_ONLY = "true"`
- `ENABLE_PAID_IMAGES = "false"`
- `ENABLE_HF_INFERENCE = "false"`
- `ENABLE_DEEPGRAM_TRIAL = "false"`
- `ENABLE_AI_HORDE = "true"`
- `ENABLE_IMAGEROUTER = "false"`

**No cambiar estas opciones simplemente porque una clave exista.** Requerir autorización de coste y prueba controlada.

## 6. Reglas del trabajo visual futuro

- Referencia: boceto aprobado de las **cinco pantallas interiores**, no una imagen que el usuario corrigió o descartó.
- Inicio: **intocable**. Mantener sus imágenes y secciones tal como estén en la web.
- Paleta: oscuro, negro/violeta, botones morados brillantes, contenedores redondeados, jerarquía de títulos clara.
- Noticias: filtros compactos, miniaturas, sinopsis, fuente real y selección para crear video.
- Crear Video: portada, duración, voz, estilo visual, formato vertical/horizontal, botón claro para generar.
- Guion y Escenas: vista legible del guion, gancho elegido, edición por escena; guardar sin perder cambios.
- Editor de Escenas: vista previa, miniaturas/cortes, edición de texto, foto/clip, movimiento, audio y subtítulos.
- Mis Proyectos: miniaturas reales, estados honestos, abrir, continuar, respaldo y borrar; distinguir un **guion listo** de un **video renderizado**.
- Mantener separado el código visual del código de generación para reducir regresiones.

## 7. Cómo retomar el proyecto después

Abrir este archivo y decir: **«Seguimos con Faceless. Revisa el plan de continuidad en GitHub y retomemos desde el primer punto pendiente».**

Antes de cada nueva modificación:
1. Revisar estado del repositorio y últimos cambios.
2. Elegir **una** tarea concreta del plan, sin romper Inicio.
3. Implementarla, probarla en Chrome Android o entorno equivalente y verificar GitHub Actions.
4. Registrar aquí la fecha, qué se modificó, las pruebas superadas y los pendientes.
5. No declarar como funcional una conexión o exportación que solo se haya probado con datos simulados.

## 8. Historial

- **2026-11-12:** Documento de continuidad creado para conservar decisiones, arquitectura, diseño y pendientes. Sin modificación de código funcional ni activación de pagos.
