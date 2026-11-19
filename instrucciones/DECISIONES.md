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

## 19/11/2026 · Recuperación con código y sin correo

El proyecto es personal y no quiere depender de un servicio de correo ni de un
proveedor de identidad. Al registrarse se entrega un código de 10 caracteres que
se muestra una sola vez, y se puede regenerar desde una sesión activa. En D1 solo
se guarda su hash PBKDF2; caduca en 1 hora y admite cinco intentos. Un
restablecimiento correcto cierra todas las sesiones. La limitación es conocida:
quien pierde el código y no tiene ninguna sesión activa no puede recuperar el
acceso de forma automática.

## 19/11/2026 · Identificador público para las sesiones

Para listar y cerrar sesiones hacía falta nombrarlas sin enviar el token al
navegador. Cada sesión guarda un `public_id` aleatorio de 16 bytes en hexadecimal.
Solo identifica la fila dentro de `/api/sesiones`, así que no abre la cuenta por
sí mismo. La migración `0004_sesiones_public_id.sql` rellenó las sesiones ya
abiertas y el Worker genera el valor en cada acceso nuevo.

## 19/11/2026 · Caducidad elegible por envío

La caducidad fija de 24 horas no servía para todo: a veces basta una hora y a
veces conviene conservar algo una semana. Se ofrecen 1 hora, 24 horas y 7 días,
con 24 horas por defecto para no cambiar el comportamiento conocido. El Worker
valida los tres valores y guarda el plazo en `items.duracion_horas` para que al
desfijar un envío recupere su tiempo original. La subida usa una cabecera porque
el cuerpo del archivo se envía en crudo para conservar el progreso XHR.

## 19/11/2026 · Búsqueda y filtros solo en el cliente

La bandeja cabe en memoria y no justificaba índices nuevos en D1. Buscar y filtrar
en el navegador evita tocar la API o el esquema y mantiene la respuesta inmediata.
La lógica vive en `src/lib/filtrado.ts` y tiene pruebas propias.

## 19/11/2026 · Fuentes alojadas en el proyecto

La interfaz pedía Fraunces y Manrope a Google Fonts. Se guardaron los WOFF2, con
su licencia OFL, en `public/fuentes/` y se declararon con `@font-face`. Así no
dependemos de un tercero para mostrar la interfaz y la CSP queda en
`font-src 'self'`.

## 19/11/2026 · Despliegue manual, CI solo de comprobación

GitHub Actions comprueba tipos y pruebas, pero no despliega. El despliegue se
ejecuta a mano para revisar antes de publicar y para no depender de un secreto
de Cloudflare en GitHub.

## 20/11/2026 · Corregir el auto-zoom de iOS sin bloquear el zoom

Safari amplía la página al enfocar campos de texto con menos de 16 px. Los de
correo, contraseña y búsqueda tenían 14,5 y 12,5 px, así que se subieron a 16 px.
Se descartó `user-scalable=no` y `maximum-scale=1`: iOS los ignora y quitan a
quien lo necesita la opción de ampliar. Tampoco se añadió un interruptor en el
panel de sesiones, porque ese panel gestiona dispositivos y no preferencias de
pantalla. El zoom que Safari ya había guardado se quita en el propio móvil.

## 20/11/2026 · Saltos mayores de dependencias pendientes

Vite 8, Vitest 5, TypeScript 7, `@vitejs/plugin-react` 6 y `@types/node` 26
tienen versiones mayores disponibles. Dependabot los propuso y se cerraron sin
aplicar: Vite, Vitest y el plugin de React forman un conjunto que conviene
actualizar a la vez, y un salto mayor puede romper la compilación o las pruebas.
Se mantienen las versiones actuales, se revisan de forma manual de vez en
cuando y Dependabot sigue trayendo las actualizaciones menores.
