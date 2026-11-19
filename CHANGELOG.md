# Registro de cambios · Puente

Este archivo sigue las convenciones de [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y [Semantic Versioning](https://semver.org/lang/es/).

## [No publicado]

### Corregido

- Los campos de correo, contraseña y búsqueda usan 16 px para evitar que Safari
  en iOS amplíe la página sola al enfocarlos.

## [1.1.0] - 2026-11-19

### Añadido

- Búsqueda en la bandeja por texto, nombre de archivo o tipo MIME, con filtros
  por tipo de envío. Todo se calcula en el navegador, sin cambios en la API.
- Panel de sesiones activas para ver y cerrar dispositivos. Cada sesión se
  identifica con un código público: la API nunca devuelve tokens al listarlas.
- Código de recuperación de contraseña de un solo uso: se muestra al crear la
  cuenta o se genera desde una sesión activa, caduca en 1 hora y admite cinco
  intentos. Un restablecimiento correcto cierra todas las sesiones.
- Selector de caducidad al enviar: 1 hora, 24 horas o 7 días. El plazo elegido
  se guarda y se recupera si el envío se fija y luego se desfija.
- Las pruebas automáticas pasan de 32 a 56.

### Cambiado

- Fraunces y Manrope se sirven desde `public/fuentes/`; la interfaz ya no pide
  fuentes a Google y la CSP solo permite fuentes del mismo origen.
- Los envíos ya no caducan siempre a las 24 horas: ese plazo sigue siendo el
  valor por defecto, pero se puede elegir al crear cada envío.

## [1.0.0] - 2026-11-19

Primera versión pública.

### Añadido

- Bandeja privada para enlaces, notas, fotos y archivos de hasta 20 MB.
- Caducidad automática de los envíos a las 24 horas y opción de fijarlos.
- Registro protegido con código de invitación guardado como secreto en Cloudflare.
- Sesiones propias en D1 y contraseñas con PBKDF2-SHA256 de 100 000 iteraciones.
- Límite de 5 intentos fallidos de acceso por correo e IP durante 15 minutos.
- Cabeceras de seguridad y CORS restringido al mismo origen.
- Instalación como aplicación (PWA) con manifiesto, iconos y service worker que
  nunca guarda la API en caché.
- 32 pruebas automáticas del Worker y de las utilidades del cliente.
- Integración continua con `npm run build` y `npm test`.
- Documentación de arquitectura, seguridad, pruebas, decisiones y operaciones.

### Cambiado

- Backend migrado de Supabase a Cloudflare Workers, D1 y Workers KV.
- `formatBytes` muestra tamaños con un decimal cuando es útil (por ejemplo,
  «1,5 KB» en lugar de «2 KB»).

### Eliminado

- Dependencia de Supabase y del almacenamiento R2; las migraciones antiguas se
  conservan solo como referencia histórica en `docs/historial/supabase/`.

[1.0.0]: https://github.com/qirris/puente/releases/tag/v1.0.0
