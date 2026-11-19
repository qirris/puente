# Decisiones de diseño · Puente

Cada decisión se anota con su fecha y su motivo. Si se cambia, se añade una
entrada nueva indicando qué la sustituye; no se borra la anterior.

## 16/11/2026 · Cloudflare en lugar de Supabase

Supabase era cómodo, pero el proyecto personal quiere evitar servicios que
piden tarjeta. Cloudflare ofrece Workers, D1 y KV dentro del plan gratuito. Se
migraron el esquema y la autenticación al Worker. Las migraciones antiguas se
conservan en `docs/historial/supabase/` como referencia histórica.

## 17/11/2026 · Workers KV en lugar de R2

R2 ofrecía mejor encaje para archivos, pero su activación exige pasos manuales
en el panel de Cloudflare. KV ya estaba disponible y los envíos caducan en 24
horas, así que el coste y la complejidad son menores. Los archivos se guardan
como bytes en KV y sus metadatos en D1.

## 18/11/2026 · PBKDF2 de 100 000 iteraciones

Cloudflare Workers limita PBKDF2 a 100 000 iteraciones. Se usa SHA-256 con sal
aleatoria de 16 bytes. No se ha subido el número porque el despliegue fallaría
en el entorno de producción.

## 19/11/2026 · Repositorio público con licencia MIT

El código se publicó para poder compartirlo y mostrar el trabajo, con MIT y un
aviso claro de que es un proyecto personal. El registro se protegió con un
código de invitación guardado como secreto de Cloudflare para que la URL pública
no se convierta en un servicio abierto.

## 19/11/2026 · Aplicación instalable (PWA)

Manifiesto, iconos y service worker propio. El service worker guarda solo la
interfaz y excluye `/api/` de la caché para no almacenar datos privados.

## 19/11/2026 · Mantener el token en la URL de las imágenes

Un elemento `<img>` no puede enviar una cabecera `Authorization`, así que las
vistas previas usan `?sesion=<token>`. Se valoró pasar a cookies `HttpOnly`,
pero **el usuario lo rechazó explícitamente**: se mantiene el token en la URL.
Mitigación aplicada: `Referrer-Policy: no-referrer`, `Cache-Control: no-store`
y sin CORS entre orígenes. Ver `SEGURIDAD.md`.

## 19/11/2026 · Límite de intentos de acceso

El registro ya estaba cerrado, pero `/api/acceso` permitía probar contraseñas
sin límite. Se fijaron 5 fallos por correo e IP en 15 minutos, con respuesta
429 y limpieza automática de la tabla de intentos.

## 19/11/2026 · CORS restringido y cabeceras de seguridad

La interfaz se sirve desde el mismo Worker, así que `Access-Control-Allow-Origin:
*` no aportaba nada y ampliaba la superficie de ataque. Se eliminó y se añadieron
CSP, `X-Frame-Options`, `nosniff` y `Referrer-Policy` en todas las respuestas.

## 19/11/2026 · Despliegue manual, CI solo de comprobación

GitHub Actions comprueba tipos y pruebas, pero no despliega. El despliegue se
ejecuta a mano para revisar antes de publicar y para no depender de un secreto
de Cloudflare en GitHub.
