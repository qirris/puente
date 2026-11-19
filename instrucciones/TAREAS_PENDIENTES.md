# Tareas pendientes · Puente

## Migración a Cloudflare
- [x] Diseñar el esquema D1 a partir de las migraciones anteriores.
- [x] Crear la base de datos `puente-datos` y aplicar `0001_init.sql` y `0002_sesiones.sql` (local y remoto).
- [x] Implementar la API en `src/index.ts` (auth, envíos, archivos, limpieza, cron).
- [x] Adaptar el frontend a la API propia y eliminar la dependencia de Supabase.
- [x] Verificar registro, acceso, envíos, subida y descarga en local.
- [x] Compilación de producción correcta.
- [x] Renovar permisos de Wrangler (`npx wrangler login`).
- [x] Almacenamiento de archivos resuelto con Workers KV `puente-archivos` (R2 descartado: exige activación manual en el panel).
- [x] Desplegar `puente-api` en https://puente-api.qirris.workers.dev.
- [x] Corregir PBKDF2 a 100 000 iteraciones (límite de Cloudflare Workers) y verificar en remoto.
- [x] Probar registro, envío, subida y descarga contra la URL pública.
- [x] Eliminar los datos de prueba de la D1 remota y la clave de prueba de KV.
- [x] Redactar README con el arranque local, el despliegue, la motivación personal y el aviso de IA.
- [x] Inicializar Git, excluir artefactos locales y crear el commit inicial.
- [x] Limpiar restos de Supabase y R2 del código (pantalla muerta, constantes y textos).
- [x] Fijar las normas de código y la convención de commits en español en `instrucciones/NORMAS_DE_CODIGO.md` y `AGENTS.md`.
- [x] Crear el repositorio `qirris/puente` (inicialmente privado), conectar `origin` y subir el código.
- [x] Pulir la redacción y la ortografía de documentación, comentarios y textos de la interfaz.
- [x] Añadir licencia MIT y aviso de ámbito personal en el README.
- [x] Proteger el registro con código de invitación guardado como secreto en Cloudflare.
- [x] Probar el registro con y sin código (403/201) y dejar la D1 remota limpia.
- [x] Publicar el repositorio `qirris/puente` en GitHub.
- [x] Añadir manifiesto PWA, iconos PNG y service worker para instalar Puente como aplicación.
- [x] Documentar la instalación en Windows y en el móvil.

## Revisión profesional (19/11/2026)
- [x] Arreglar `npm test`: 32 pruebas con Vitest, SQLite en memoria y KV falso.
- [x] Corregir el README (código de invitación, secretos, límite de intentos y Node 24).
- [x] Crear `SECURITY.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `docs/OPERACIONES.md` y los cuatro documentos que faltaban en `instrucciones/`.
- [x] Mover el historial de Supabase a `docs/historial/supabase/`.
- [x] Restringir CORS, añadir cabeceras de seguridad y límite de 5 intentos en 15 minutos.
- [x] Aplicar la migración `0003_intentos_acceso.sql` en local y remoto.
- [x] Mantener el token en la URL de imágenes; descartada la cookie por decisión del usuario.
- [x] Añadir observabilidad y `run_worker_first` al Worker.
- [x] Mover `@types/node` a dependencias de desarrollo, añadir `engines` y `.nvmrc`.
- [x] Añadir integración continua y Dependabot.
- [x] Verificar cabeceras, CORS, 429, registro y acceso en la URL pública.
- [x] Publicar tag y release `v1.0.0` y ajustar la configuración de GitHub.
- [x] Limitar Dependabot a actualizaciones menores y añadir una captura al README.

## Mejoras posteriores a v1.0.0
- [x] Alojar Fraunces y Manrope en `public/fuentes/` y quitar Google Fonts de la CSP.
- [x] Añadir búsqueda y filtros por tipo en la bandeja.
- [x] Listar y cerrar sesiones activas.
- [x] Código de recuperación mostrado una sola vez, regenerable desde una sesión activa.
- [x] Selector de caducidad (1 h, 24 h y 7 días) al enviar.
- [x] Publicar la versión v1.1.0 con las cinco mejoras.

## Prueba final del usuario
- [ ] Volver a iniciar sesión (se invalidó la sesión anterior por precaución) y probar el envío entre móvil y ordenador.

## Histórico (Supabase, superado el 19/11/2026)
- [x] Desarrollo del MVP original (React 19 + TypeScript + Supabase).
- [x] Migraciones SQL, RLS y Storage originales.
- [x] Verificación de compilación original.

> El directorio `docs/historial/supabase/` se conserva solo como referencia
> histórica. El código activo es `src/index.ts` + `migrations/` + `wrangler.toml`.
