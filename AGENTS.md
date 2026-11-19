# AGENTS.md · Puente

Punto de entrada al proyecto de aplicación web privada **Puente** (sondeo cada 10 s entre móvil y ordenador).

## Orden de lectura obligatoria
1. `memoria.md` (Estado actual y contexto).
2. `instrucciones/INSTRUCCIONES_GENERALES.md` (Cómo trabajar aquí).
3. Documento específico de `instrucciones/` para la tarea actual.
4. Contrastar siempre con el código real.

## Reglas duras
- El código manda sobre la memoria.
- NO guardar secretos en los archivos `.md`.
- El proyecto debe mantenerse en español (UI, código, documentación).
- Los mensajes de commit van en español y siguen `instrucciones/NORMAS_DE_CODIGO.md`.
- Cualquier avance debe registrarse en `memoria.md` y `instrucciones/TAREAS_PENDIENTES.md`.

## Estado actual
- Fase: migración a Cloudflare terminada y desplegada.
- URL pública: https://puente-api.qirris.workers.dev
- Repositorio: https://github.com/qirris/puente (público, licencia MIT).
- El registro está protegido por el secreto `PUENTE_CODIGO_INVITACION` de Cloudflare. Nunca escribir su valor en los archivos `.md`.
- Servidor: Workers (`puente-api`) + D1 (`puente-datos`) + Workers KV (`puente-archivos`). Sin R2: su activación exige un paso manual en el panel de Cloudflare.
