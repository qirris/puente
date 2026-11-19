# Registro de cambios · Puente

Este archivo sigue las convenciones de [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y [Semantic Versioning](https://semver.org/lang/es/).

## [No publicado]

### Añadido

- Búsqueda en la bandeja por texto, nombre de archivo o tipo MIME, con filtros
  por tipo de envío. Todo se calcula en el navegador, sin cambios en la API.

### Cambiado

- Fraunces y Manrope se sirven desde `public/fuentes/`; la interfaz ya no pide
  fuentes a Google y la CSP solo permite fuentes del mismo origen.

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
