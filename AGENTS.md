# AGENTS.md · Puente

Punto de entrada al proyecto de aplicación web privada **Puente** (sincronización instantánea entre móvil y ordenador).

## Orden de lectura obligatoria
1. `memoria.md` (Estado actual y contexto).
2. `instrucciones/INSTRUCCIONES_GENERALES.md` (Cómo trabajar aquí).
3. Documento específico de `instrucciones/` para la tarea actual.
4. Contrastar siempre con el código real.

## Reglas duras
- El código manda sobre la memoria.
- NO guardar secretos en los archivos `.md`.
- El proyecto debe mantenerse en español (UI, código, documentación).
- Cualquier avance debe registrarse en `memoria.md` y `instrucciones/TAREAS_PENDIENTES.md`.

## Estado actual
- Fase: migración a Cloudflare terminada y desplegada.
- URL pública: https://puente-api.qirris.workers.dev
- Backend: Workers (`puente-api`) + D1 (`puente-datos`) + Workers KV (`puente-archivos`). Sin R2: su activación exige un paso manual en el panel de Cloudflare.
