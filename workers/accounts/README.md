# Cuentas de Faceless AI Studio

El Worker de prueba sirve el editor después de iniciar sesión y protege las
rutas de IA con la misma sesión. Cloudflare D1 almacena el usuario, un hash
PBKDF2-SHA256 con sal individual y los hashes de las sesiones. La sesión se
envía en una cookie segura de siete días. Los proyectos existentes siguen en
el almacenamiento del navegador asociado a su dirección original.

## Despliegue en el Worker de prueba

Desde esta carpeta, con Node 24 y una sesión de Wrangler de la cuenta de
Cloudflare que contiene `faceless-images`:

1. Ejecuta `npx wrangler d1 create faceless-cuentas`. Copia el ID de la base en
   `database_id` en `wrangler.toml`.
2. Aplica el esquema con
   `npx wrangler d1 execute faceless-cuentas --remote --file=schema.sql`.
3. Ejecuta `node build-assets.mjs` y luego `npx wrangler deploy`. El Worker
   devuelve 503 hasta que los secretos requeridos estén configurados.
4. Configura los secretos con `npx wrangler secret put NOMBRE` o desde
   **Configuración → Variables y secretos** del Worker de prueba.
   - `APP_PASSCODE` debe coincidir con el secreto del Worker `faceless-images`.
     Es una credencial interna entre Workers.
   - `PASSWORD_PEPPER` debe ser un valor aleatorio de al menos 32 caracteres.
     Conserva una copia segura. Cambiarlo invalida las contraseñas existentes.
   - `REGISTRATION_CODE` es un código aleatorio distinto para invitar usuarios.
     Sin este secreto, el registro queda cerrado y las cuentas existentes
     pueden iniciar sesión.
5. Abre
   [Faceless de prueba](https://faceless-access-prueba.marianitord2020.workers.dev/).
   Registra una cuenta con invitación, cierra sesión y vuelve a entrar.
   Prueba la generación con esa sesión. Abre el mismo enlace en una ventana
   privada y comprueba que el editor redirige al inicio de sesión.

El Worker de prueba se comunica con `faceless-images` mediante el binding
`MEDIA`. Las claves de los proveedores siguen en ese Worker. GitHub Pages
sigue siendo un sitio estático público con su propio flujo de acceso.

## Prueba local

Ejecuta `node --test worker.test.mjs`. La prueba usa SQLite en memoria y un
servicio de IA simulado para verificar el registro, la sesión y el proxy sin
hacer peticiones facturables.
