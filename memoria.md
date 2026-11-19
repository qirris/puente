# Memoria del proyecto: Puente

Archivo de memoria persistente de OpenCode para el proyecto de aplicación web **Puente**.
Regla: no guardar aquí contraseñas, tokens ni ningún secreto.

## 1. Objetivo y alcance
Aplicación web privada para enviar enlaces, notas, fotos y archivos (hasta 20 MB) entre el móvil y el ordenador, con bandeja única, caducidad a las 24 h y opción de fijar. El backend se migró de Supabase a **Cloudflare** (Workers + D1 + Workers KV) para no depender de servicios que piden tarjeta de crédito. Está desplegada y funcionando.

## 2. Estado actual
- Fase: migración completada y desplegada el 19/11/2026.
- URL pública: https://puente-api.qirris.workers.dev
- Repositorio: https://github.com/qirris/puente (público desde el 19/11/2026, previa aprobación del usuario).
- El repo se publicó con licencia MIT, aviso de ámbito personal y registro protegido por código de invitación.
- Secreto de Cloudflare `PUENTE_CODIGO_INVITACION` configurado en el Worker `puente-api`; el valor no se guarda en este proyecto.
- Registro, acceso, envío de texto, subida de archivo y descarga verificados contra la URL pública.
- Base de datos remota limpia: se eliminaron todos los datos de prueba, incluida la cuenta creada para probar el código de invitación.
- La primera cuenta real la crea el usuario desde la interfaz web.

## 3. Tecnologías y arquitectura
- Interfaz: React 19, TypeScript, Vite, Vitest.
- Servidor: Cloudflare Workers (`src/index.ts`), D1 (`puente-datos`) y Workers KV (`puente-archivos`).
- Binding de D1: `PUENTE_DB`. Binding de KV: `PUENTE_ARCHIVOS`. Recursos estáticos: `PUENTE_STATIC`.
- Worker: `puente-api`. Cron de limpieza: `17 * * * *`.
- Sesiones propias en la tabla `sesiones` (tokens aleatorios de 32 bytes guardados en D1).
- Contraseñas con PBKDF2-SHA256 (100 000 iteraciones, el máximo de Cloudflare Workers) mediante Web Crypto. El hash guarda las iteraciones usadas para verificar cuentas antiguas.
- Diseño editorial minimalista con `Fraunces` y `Manrope`.
- Módulos principales:
  - `src/index.ts`: API completa del Worker.
  - `src/lib/api.ts`: cliente HTTP con token Bearer.
  - `src/lib/auth.ts`, `src/lib/sesion.ts`: autenticación y sesión persistente.
  - `src/lib/inbox.ts`: operaciones de la bandeja (sondeo cada 10 s en lugar de Realtime).
  - `src/lib/upload.ts`: subida con progreso real mediante XHR.
  - `migrations/0001_init.sql`, `migrations/0002_sesiones.sql`: esquema D1.
  - `wrangler.toml`: configuración de Cloudflare.

## 4. Instrucciones y restricciones
- Consultar `instrucciones/INSTRUCCIONES_GENERALES.md` e `instrucciones/NORMAS_DE_CODIGO.md`.
- Todo en español (UI, código, documentación y mensajes de commit).
- Convención de commits: `tipo: descripción en minúsculas, imperativa y sin punto`.
- No guardar secretos en archivos `.md`.
- El código real manda sobre la memoria.

## 5. Funcionalidades implementadas
- Registro e inicio de sesión con contraseña hasheada; cierre de sesión invalida el token.
- El registro exige un código de invitación cuando el secreto `PUENTE_CODIGO_INVITACION` está configurado; sin secreto queda abierto solo para desarrollo local.
- Envío de texto y enlaces, con validación de longitud y formato.
- Subida de fotos y archivos hasta 20 MB con progreso real.
- Bandeja cronológica con fijado, borrado y descarga.
- URLs de archivo con el token en la query para que funcionen en `<img>` y `<a>`.
- Limpieza de caducados: cron del Worker y ruta manual `/api/limpieza`.
- Interfaz responsive (móvil y escritorio).
- Instalable como aplicación (PWA): manifiesto, iconos PNG y service worker que guarda solo la interfaz, nunca la API.

## 6. Cambios realizados
- 18/11/2026: proyecto movido a `C:\Users\zakaria\Documents\NEGOCIOS\puente`.
- 18/11/2026: decisión de migrar a Cloudflare; creación de la base de datos D1 y del esquema adaptado a SQLite.
- 19/11/2026: renombrado de recursos con nombres ligados a Puente (`puente-datos`, `puente-archivos`, `puente-api`); eliminada la base de datos temporal `puente-db`.
- 19/11/2026: backend Supabase sustituido por Worker; frontend adaptado; dependencia `@supabase/supabase-js` eliminada.
- 19/11/2026: proxy de `/api` en Vite hacia Wrangler (puerto 8787).
- 19/11/2026: R2 descartado porque su activación exige un paso manual en el panel de Cloudflare; almacenamiento migrado a Workers KV (misma binding `PUENTE_ARCHIVOS`).
- 19/11/2026: PBKDF2 bajado de 150 000 a 100 000 iteraciones por un error real del runtime de Cloudflare en el registro remoto.
- 19/11/2026: despliegue de `puente-api` con D1, KV, recursos estáticos y cron.
- 19/11/2026: inicializado el repositorio Git y creado el commit inicial (46 archivos). `.gitignore` excluye `node_modules/`, `dist/`, `.wrangler/` y `.env*`. El árbol de trabajo quedó limpio.
- 19/11/2026: eliminada la pantalla de configuración de Supabase (código muerto), la constante `BUCKET` y el campo `isConfigured`; corregidos los textos que decían "bucket privado" y el comentario que decía R2.
- 19/11/2026: README ampliado con la motivación del autor en primera persona y el aviso de desarrollo asistido por IA; añadida la URL pública.
- 19/11/2026: creado `instrucciones/NORMAS_DE_CODIGO.md` con la convención de commits en español, y añadida la regla a `AGENTS.md`. Todos los mensajes de commit del proyecto están en español.
- 19/11/2026: creado el repositorio privado `qirris/puente` en GitHub con descripción y topics ligados al proyecto.
- 19/11/2026: preparada la publicación segura: licencia MIT, sección "Ámbito del proyecto" en el README, campo "Código de invitación" en el registro y validación en el Worker mediante el secreto `PUENTE_CODIGO_INVITACION`.
- 19/11/2026: compilación y despliegue correctos; registro sin código rechazado (403) y registro con código aceptado (201); cuenta de prueba eliminada después.
- 19/11/2026: añadida instalación como aplicación: `public/manifest.webmanifest`, iconos PNG de 180/192/512 px y `public/sw.js` registrado desde `src/main.tsx`. El service worker guarda solo la interfaz y excluye `/api/`. README ampliado con las instrucciones de instalación en Windows y móvil.

## 7. Decisiones tomadas
- Cloudflare en lugar de Supabase: el usuario no quiere facilitar tarjeta de crédito.
- Workers KV en lugar de R2: R2 devuelve `code: 10042` y solo se activa desde el panel (flujo de checkout). KV se crea por CLI, no pide tarjeta y admite 25 MB por valor (el límite de la app es 20 MB).
- Sesiones en D1 en lugar de secretos HMAC: evita configurar variables sensibles a mano.
- Sondeo cada 10 s en lugar de Realtime: D1 no ofrece suscripciones en tiempo real.
- El Worker es la única frontera de seguridad: D1 no tiene RLS, así que cada consulta lleva `user_id`.
- Los nombres de recursos llevan siempre el prefijo `puente`.
- El repositorio de GitHub se hizo público a petición del usuario, con licencia MIT y registro protegido para preservar el uso personal.
- El código de invitación vive solo como secreto de Cloudflare; no se escribe en archivos ni en commits.
- La motivación personal y el aviso de asistencia por IA se documentan en el README, redactados en primera persona.

## 8. Pruebas verificadas
- 19/11/2026: `npm run build` correcto.
- 19/11/2026: API local (`wrangler dev --local`) con KV: registro, acceso, creación de envío, listado, fijado, subida de archivo y descarga con token en query. Todas correctas.
- 19/11/2026: primer despliegue detectó `Pbkdf2 failed: iteration counts above 100000 are not supported`; corregido y vuelto a desplegar.
- 19/11/2026: API en la URL pública: registro (201), acceso (200), envío de texto (201), listado (200), subida (201), descarga del archivo (200 con el contenido correcto) y página principal (200).
- 19/11/2026: tras la limpieza de código, `npm run build` correcto (48 módulos), redespliegue correcto y comprobación en la URL pública: página principal (200) y `/api/sesion` sin token (401, respuesta esperada).
- 19/11/2026: con el código de invitación activo, `npm run build` y despliegue correctos; `/api/registro` sin código devuelve 403 con "El código de invitación no es correcto." y con código devuelve 201. Cuenta de prueba eliminada de la D1 remota.
- 19/11/2026: con la PWA añadida, `npm run build` correcto; el manifiesto, los iconos y el service worker se sirven desde la URL pública con estado 200 y tipos correctos.

## 9. Errores y problemas pendientes
- R2 no se pudo crear: `Please enable R2 through the Cloudflare Dashboard. [code: 10042]`. No es bloqueante: se sustituyó por Workers KV.
- Los `wrangler dev` de prueba se duplicaron y colgaron por pelear por el puerto 8787 y por borrar `.wrangler/state` con un servidor activo. Se limpiaron todos; solo se usa uno a la vez.
- PBKDF2 con 150 000 iteraciones falla en el runtime de Cloudflare (no en local); corregido a 100 000 y verificado en remoto.
- No hay archivos de prueba automatizados: `npm test` (Vitest) termina con código 1 porque no encuentra `*.test.*`/`*.spec.*`. La verificación real se hace con `npm run build` y las pruebas manuales de la API documentadas arriba.
- Sin problemas pendientes conocidos. KV tiene propagación eventual: un archivo recién subido puede tardar unos segundos en aparecer en otra ubicación.

## 10. Próximos pasos
- [x] Desplegar `puente-api` y anotar la URL pública.
- [x] Probar registro/envío/descarga contra la URL desplegada.
- [x] Añadir README con las instrucciones de arranque local, la motivación y el aviso de IA.
- [x] Crear el repositorio `qirris/puente`, fijar las normas en español y subir el código.
- [x] Publicar el repositorio con licencia MIT, aviso de proyecto personal y registro protegido con código de invitación.
- [x] Permitir instalar Puente como aplicación en escritorio y móvil.
- [ ] El usuario crea su cuenta real desde https://puente-api.qirris.workers.dev con el código de invitación y prueba la app desde móvil y ordenador.

## 11. Historial de actualizaciones
- 16/11/2026: inicialización del proyecto y sistema de memoria (fase Supabase).
- 18/11/2026: traslado a `Documents\NEGOCIOS` y cambio de rumbo a Cloudflare.
- 19/11/2026: migración completa del backend, cambio a KV, corrección de PBKDF2, despliegue, verificación en remoto, limpieza de restos de Supabase, documentación de la motivación y del aviso de IA, normas de commits en español, repositorio en GitHub, publicación segura con licencia MIT, ámbito personal y registro protegido, e instalación como aplicación.
