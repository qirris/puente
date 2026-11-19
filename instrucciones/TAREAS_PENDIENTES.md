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
- [x] Crear el repositorio privado `qirris/puente`, conectar `origin` y subir el código.

## Prueba final del usuario
- [ ] Crear la cuenta real desde la interfaz web y probar envío entre móvil y ordenador.

## Histórico (Supabase, superado el 19/11/2026)
- [x] Desarrollo del MVP original (React 19 + TypeScript + Supabase).
- [x] Migraciones SQL, RLS y Storage originales.
- [x] Verificación de compilación original.

> El directorio `supabase/` se conserva solo como referencia histórica. El código
> activo es `src/index.ts` + `migrations/` + `wrangler.toml`.
