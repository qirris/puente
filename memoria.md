# Memoria del proyecto: Puente

Archivo de memoria persistente de OpenCode para el proyecto de aplicación web **Puente**.
Regla: no guardar aquí contraseñas, tokens ni ningún secreto.

## 1. Objetivo y alcance
Aplicación web privada para enviar enlaces, notas, fotos y archivos (hasta 20 MB) entre el móvil y el ordenador, con bandeja única, caducidad elegible (1 h, 24 h o 7 días) y opción de fijar. El backend se migró de Supabase a **Cloudflare** (Workers + D1 + Workers KV) para no depender de servicios que piden tarjeta de crédito. Está desplegada y funcionando.

## 2. Estado actual
- Fase: migración completada y desplegada el 19/11/2026.
- URL pública: https://puente-api.qirris.workers.dev
- Repositorio: https://github.com/qirris/puente (público desde el 19/11/2026, previa aprobación del usuario).
- El repo se publicó con licencia MIT, aviso de ámbito personal y registro protegido por código de invitación.
- Versión actual: v1.1.1, con tag y release publicados el 20/11/2026.
- Secreto de Cloudflare `PUENTE_CODIGO_INVITACION` configurado en el Worker `puente-api`; el valor no se guarda en este proyecto.
- Registro, acceso, envío de texto, subida de archivo y descarga verificados contra la URL pública.
- El usuario ya creó su cuenta real el 19/11/2026 a las 14:57; los datos de prueba creados durante la revisión se eliminaron.
- Tras la revisión se desplegó la seguridad reforzada (sin cookies): CORS restringido, límite de intentos, cabeceras y observabilidad. Verificado en remoto.

## 3. Tecnologías y arquitectura
- Interfaz: React 19, TypeScript, Vite, Vitest.
- Servidor: Cloudflare Workers (`src/index.ts`), D1 (`puente-datos`) y Workers KV (`puente-archivos`).
- Binding de D1: `PUENTE_DB`. Binding de KV: `PUENTE_ARCHIVOS`. Recursos estáticos: `PUENTE_STATIC`.
- Worker: `puente-api`. Cron de limpieza: `17 * * * *`.
- Sesiones propias en la tabla `sesiones` (tokens aleatorios de 32 bytes guardados en D1 y un `public_id` de 16 bytes para identificarlas sin revelar el token).
- Contraseñas con PBKDF2-SHA256 (100 000 iteraciones, el máximo de Cloudflare Workers) mediante Web Crypto. El hash guarda las iteraciones usadas para verificar cuentas antiguas.
- Diseño editorial minimalista con `Fraunces` y `Manrope`, alojadas en `public/fuentes/` (WOFF2 con licencia OFL); la interfaz no pide fuentes a Google.
- Módulos principales:
  - `src/index.ts`: API completa del Worker.
  - `src/lib/api.ts`: cliente HTTP con token Bearer.
  - `src/lib/auth.ts`, `src/lib/sesion.ts`: autenticación y sesión persistente.
  - `src/lib/inbox.ts`: operaciones de la bandeja (sondeo cada 10 s en lugar de Realtime).
  - `src/lib/filtrado.ts`: búsqueda y filtros de la bandeja solo en el cliente.
  - `src/components/InboxFilters.tsx`: campo de búsqueda y chips de tipo.
  - `src/lib/sesiones.ts`: listado y cierre de sesiones activas.
  - `src/components/SesionesPanel.tsx`: panel para revisar y cerrar sesiones y generar un código.
  - `src/components/CodigoUnico.tsx`: muestra el código de recuperación una sola vez.
  - `src/lib/upload.ts`: subida con progreso real mediante XHR.
  - `migrations/0001_init.sql`, `0002_sesiones.sql`, `0003_intentos_acceso.sql`, `0004_sesiones_public_id.sql`, `0005_codigos_recuperacion.sql`, `0006_duracion_envios.sql`: esquema D1.
  - `tests/bdFalsa.ts`: SQLite en memoria y KV falso para probar el Worker.
  - `src/*.test.ts` y `src/lib/*.test.ts`: 60 pruebas con Vitest.
  - `.github/workflows/ci.yml`: comprobación de tipos, build y pruebas.
  - `docs/`: operaciones e historial de Supabase.
  - `wrangler.toml`: configuración de Cloudflare, observabilidad y `run_worker_first`.

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
- URLs de archivo con el token en la query para que funcionen en `<img>` y `<a>` (decisión del usuario: no cambiar a cookies).
- Límite de 5 intentos fallidos de acceso por correo e IP en 15 minutos, con respuesta 429.
- Cabeceras de seguridad en API, interfaz y service worker; sin CORS entre orígenes.
- Limpieza de caducados: cron del Worker y ruta manual `/api/limpieza`.
- Interfaz responsive (móvil y escritorio).
- Instalable como aplicación (PWA): manifiesto, iconos PNG y service worker que guarda solo la interfaz, nunca la API.
- Fuentes locales: la interfaz carga los WOFF2 desde `/fuentes/` sin peticiones a terceros.
- Bandeja con búsqueda por contenido, nombre de archivo y tipo MIME, y filtros
  Todo / Enlaces / Notas / Fotos / Archivos; todo se calcula en el navegador.
- Panel de sesiones activas: permite ver los dispositivos con acceso y cerrar
  los que no se reconozcan, identificados por un código público y nunca por el token.
- Recuperación de contraseña sin correo: código de 10 caracteres mostrado una sola
  vez al registrarse o generado desde una sesión activa; válido 1 hora, con 5
  intentos y guardado solo como hash PBKDF2. Un acierto cambia la contraseña y
  cierra todas las sesiones.
- Selector de caducidad al enviar: 1 hora, 24 horas (por defecto) o 7 días, tanto
  para texto y enlaces como para archivos. El plazo se guarda y se recupera al
  desfijar un envío.
- Selección múltiple de fotos y archivos, con vista previa, eliminación individual
  y subida secuencial para mantener visible el progreso de cada archivo.
- Aviso «Actualización pendiente» cuando una nueva interfaz está lista, con
  activación y recarga mediante «Actualizar ahora»; comprobación al abrir,
  volver a la app y cada minuto en primer plano con conexión.

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
- 19/11/2026: revisión profesional completa. El usuario eligió «Todo» pero rechazó expresamente el cambio a cookies, así que el token sigue en la URL. Añadido el límite de intentos, CORS restringido, cabeceras de seguridad, migración `0003_intentos_acceso.sql` (aplicada en local y remoto), observabilidad y `run_worker_first` para que el Worker vea también los archivos estáticos.
- 19/11/2026: creadas 32 pruebas automáticas con Vitest y una base SQLite/KV falsa; `npm test` pasa con código 0. `formatBytes` corregido para mostrar «1,5 KB» en lugar de «2 KB».
- 19/11/2026: documentación ampliada con `SECURITY.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `instrucciones/ARQUITECTURA.md`, `SEGURIDAD.md`, `PRUEBAS.md`, `DECISIONES.md` y `docs/OPERACIONES.md`. `supabase/` movido a `docs/historial/supabase/` con una nota de por qué se conserva.
- 19/11/2026: `@types/node` movido a `devDependencies`, añadidos metadatos del paquete, `engines`, `.nvmrc`, CI y Dependabot.
- 19/11/2026: fuentes locales: WOFF2 de Fraunces (normal e itálica) y Manrope guardados en `public/fuentes/` con sus licencias OFL; eliminados los `<link>` a Google Fonts, declarados los `@font-face` en `src/styles.css` y simplificada la CSP a `font-src 'self'`.
- 19/11/2026: búsqueda y filtros en la bandeja: función pura `filtrarEnvios` con 8 pruebas, componente `InboxFilters`, estado «sin resultados» y estilos responsive; sin cambios en la API ni en D1.
- 19/11/2026: sesiones activas: migración `0004_sesiones_public_id.sql` aplicada en local y remoto, rutas `GET /api/sesiones` y `DELETE /api/sesiones/:id`, 5 pruebas nuevas, panel `SesionesPanel` y botón en la cabecera; desplegado y verificado en remoto.
- 19/11/2026: recuperación de contraseña: migración `0005_codigos_recuperacion.sql` aplicada en local y remoto, rutas `POST /api/recuperacion/codigo` y `POST /api/recuperacion/restablecer`, componente `CodigoUnico`, modo `recover` en `AuthScreen`, botón de generación en `SesionesPanel` y 7 pruebas nuevas; desplegado y verificado en remoto.
- 19/11/2026: corregido el flujo del registro: `guardarSesion()` desmontaba `AuthScreen` antes de mostrar el código, así que `App` muestra ahora una pantalla de confirmación con el código hasta que el usuario confirma que lo ha guardado. Nuevos estilos `.codigo-pantalla`.
- 19/11/2026: caducidad configurable: migración `0006_duracion_envios.sql` aplicada en local y remoto, valores 1/24/168 validados en el Worker, selector en `Composer`, cabecera `x-puente-duracion` en la subida y 4 pruebas nuevas; desplegado y verificado en remoto.
- 19/11/2026: limpieza documental final: `SECURITY.md` marca la 1.1.x como versión con soporte, `instrucciones/SEGURIDAD.md` describe la caducidad elegible y `memoria.md` actualiza el alcance; commit `4aad8e1`. Sin cambios de código ni redespliegue.
- 20/11/2026: corregido el auto-zoom de Safari en iOS: `.input-shell input` y `.search-field input` pasan de 14,5 y 12,5 px a 16 px. Se descartó bloquear el zoom manual y añadir un interruptor en sesiones; desplegada la versión `772d439f-8275-4ce7-997f-ba78d7420708`.
- 20/11/2026: publicada la v1.1.1 con esa corrección; `package.json` sincronizado a 1.1.1, README ampliado con la actualización de la PWA y `master` protegida con `enforce_admins` para que el check obligatorio no se pueda saltar.
- 24/11/2026: el compositor permite seleccionar o arrastrar varios archivos, revisarlos y subirlos secuencialmente; conserva en la cola los que falten si una subida falla.
- 24/11/2026: aviso de actualización de la PWA y del navegador. Vite genera una huella de la interfaz para renovar el service worker y su caché; las nuevas versiones esperan la pulsación de «Actualizar ahora».
- 24/11/2026: README reorganizado con la historia personal (pasar contenido entre móvil y portátil mediante WhatsApp o Drive), aviso claro de desarrollo con IA y cuatro capturas reales en `docs/capturas/`. Cuenta y contenido ficticios en D1/KV locales aislados; sin cambios de aplicación ni de producción. Sustituida la captura antigua de acceso y documentado cómo renovar las imágenes. Compilación de producción correcta y 16 enlaces/recursos locales del README comprobados.

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
- El token de sesión sigue en la URL de las imágenes porque el usuario rechazó el cambio a cookies; se mitiga con `Referrer-Policy: no-referrer` y `Cache-Control: no-store`.
- CORS restringido al mismo origen: la interfaz se sirve desde el propio Worker, así que no se necesita `Access-Control-Allow-Origin: *`.
- `run_worker_first = true` en los recursos estáticos para que el Worker pueda añadir cabeceras de seguridad a la interfaz.
- Las fuentes se alojan en el propio proyecto: evitan dependencias de terceros y permiten una CSP más estricta sin dominios de Google.
- La búsqueda y los filtros de la bandeja se resuelven en el cliente: la lista ya está en memoria y no merece índices nuevos ni rutas adicionales.
- Cada sesión tiene un `public_id` aleatorio de 16 bytes: permite listarla y cerrarla sin enviar el token al navegador. No es un secreto, pero tampoco autentica.
- Recuperación sin correo ni servicios de terceros: el código se muestra una sola vez y solo se guarda su hash PBKDF2. Conviene guardarlo en un gestor de contraseñas; quien lo pierde y no tiene sesión activa no puede recuperar el acceso automáticamente.
- La caducidad se elige por envío entre 1 hora, 24 horas y 7 días. 24 horas sigue siendo el valor por defecto; el Worker valida el plazo y calcula la fecha, y guarda el plazo para recuperarlo al desfijar.
- Los saltos mayores de dependencias se revisan a mano: Vite, Vitest y el plugin de React deben actualizarse juntos y un salto puede romper la compilación. Dependabot sigue trayendo solo las versiones menores.

## 8. Pruebas verificadas
- 19/11/2026: `npm run build` correcto.
- 19/11/2026: API local (`wrangler dev --local`) con KV: registro, acceso, creación de envío, listado, fijado, subida de archivo y descarga con token en query. Todas correctas.
- 19/11/2026: primer despliegue detectó `Pbkdf2 failed: iteration counts above 100000 are not supported`; corregido y vuelto a desplegar.
- 19/11/2026: API en la URL pública: registro (201), acceso (200), envío de texto (201), listado (200), subida (201), descarga del archivo (200 con el contenido correcto) y página principal (200).
- 19/11/2026: tras la limpieza de código, `npm run build` correcto (48 módulos), redespliegue correcto y comprobación en la URL pública: página principal (200) y `/api/sesion` sin token (401, respuesta esperada).
- 19/11/2026: con el código de invitación activo, `npm run build` y despliegue correctos; `/api/registro` sin código devuelve 403 con "El código de invitación no es correcto." y con código devuelve 201. Cuenta de prueba eliminada de la D1 remota.
- 19/11/2026: con la PWA añadida, `npm run build` correcto; el manifiesto, los iconos y el service worker se sirven desde la URL pública con estado 200 y tipos correctos.
- 19/11/2026: `npm ci`, `npm run build` y `npm test` correctos (32 pruebas). Despliegue correcto con observabilidad y `run_worker_first`.
- 19/11/2026: en remoto, la interfaz y `/sw.js` sirven CSP, `Referrer-Policy`, `nosniff` y `X-Frame-Options`; `/api/sesion` sin token devuelve 401 sin cabeceras CORS; `OPTIONS` devuelve 204 sin `Access-Control-Allow-Origin`.
- 19/11/2026: en remoto, 5 accesos fallidos devuelven 401 y el sexto 429 con el mensaje previsto; la tabla de intentos se limpió justo después.
- 19/11/2026: en remoto, registro sin código devuelve 403, con código 201, acceso correcto 200, sesión con token en URL 200 y limpieza manual 200; la cuenta temporal se borró de D1.
- 19/11/2026: CI de GitHub en verde en `master`. Configurados homepage, Dependabot, secret scanning con push protection, protección de `master`, tag `v1.0.0` y release `v1.0.0`.
- 19/11/2026: CI en verde para el commit `6fe5767` (check «Tipos, build y pruebas»).
- 19/11/2026: con la caducidad configurable, `npm run build` (53 módulos) y `npm test` (56 pruebas, 4 archivos) correctos; migración 0006 aplicada en local y remoto; desplegada la versión `38a86cd1-87f4-40d2-a3ea-a892759137cc`. En remoto: `POST /api/envios` sin sesión devuelve 401; el JS publicado contiene «Caducidad», «1 hora», «24 horas», «7 días», «Caduca en» y `x-puente-duracion`; el CSS sirve `.duracion-campo`, `.duracion-opciones` y `.duracion-opcion`.
- 19/11/2026: CI en verde para el commit `6236a19` (check «Tipos, build y pruebas»). Tag y release `v1.1.0` publicados en https://github.com/qirris/puente/releases/tag/v1.1.0.
- 19/11/2026: Dependabot propuso saltos de versión mayores incompatibles; se limitó a actualizaciones menores y se cerraron esos 7 pull requests. Añadida una captura real de la pantalla de acceso al README.
- 19/11/2026: con las fuentes locales, `npm run build` y `npm test` (32 pruebas) correctos; desplegado y verificado en remoto: los tres WOFF2 devuelven 200 con `font/woff2`, el CSS sirve las rutas `/fuentes/` y la CSP ya no contiene dominios de Google.
- 19/11/2026: con la búsqueda y los filtros, `npm run build` y `npm test` (40 pruebas, 4 archivos) correctos; desplegado y verificado en remoto: el JS publicado tiene el mismo tamaño que el local (265 880 bytes) y contiene los textos nuevos, y el CSS sirve los estilos de búsqueda y filtros.
- 19/11/2026: con las sesiones activas, `npm run build` (52 módulos) y `npm test` (45 pruebas, 4 archivos) correctos; migración 0004 aplicada en local y remoto; desplegada la versión `fcceef93-2bb7-4851-a34a-693fd888d3b2`. En remoto: `GET`/`DELETE /api/sesiones` sin token devuelven 401; el JS publicado contiene «Sesiones activas», «Cerrar las demás», «Este dispositivo» y «Ver sesiones activas»; el CSS sirve `.sesion-fila.actual`.
- 19/11/2026: con la recuperación, `npm run build` (53 módulos) y `npm test` (52 pruebas, 4 archivos) correctos; migración 0005 aplicada en local y remoto. Primer despliegue `be81db5e-671f-4566-a17f-28cbb6ad13ba`; tras corregir el flujo del registro, despliegue final `ba8412a6-089d-410a-ad00-ebedf38c330e`. En remoto: `POST /api/recuperacion/codigo` sin sesión devuelve 401 y `POST /api/recuperacion/restablecer` con cuenta inexistente devuelve 401 con el mismo mensaje que un código erróneo; el JS publicado contiene «¿Olvidaste tu contraseña?», «Código de recuperación», «Guarda tu código de recuperación», «Ya lo he guardado, entrar en mi bandeja» y «Cambiar contraseña»; el CSS sirve `.codigo-pantalla`, `.codigo-valor` y `.recuperacion-bloque`.
- 19/11/2026: CI en verde para el commit `4aad8e1` (check «Tipos, build y pruebas»). Los ajustes fueron solo de documentación; no se repitieron build, pruebas ni despliegue.
- 20/11/2026: con los campos a 16 px, `npm run build` (53 módulos) y `npm test` (56 pruebas, 4 archivos) correctos; desplegada la versión `772d439f-8275-4ce7-997f-ba78d7420708`. En remoto: la página principal devuelve 200, el HTML sirve `/assets/index-CPw96IDd.css` y ese CSS contiene `font-size:16px` en `.input-shell input` y `.search-field input`.
- 20/11/2026: `npm run build` y `npm test` repetidos al sincronizar la versión a 1.1.1; tag y release `v1.1.1` publicados y check «Tipos, build y pruebas» en verde. Protección de `master` verificada con `enforce_admins` activo.

## 9. Errores y problemas pendientes
- R2 no se pudo crear: `Please enable R2 through the Cloudflare Dashboard. [code: 10042]`. No es bloqueante: se sustituyó por Workers KV.
- Los `wrangler dev` de prueba se duplicaron y colgaron por pelear por el puerto 8787 y por borrar `.wrangler/state` con un servidor activo. Se limpiaron todos; solo se usa uno a la vez.
- PBKDF2 con 150 000 iteraciones falla en el runtime de Cloudflare (no en local); corregido a 100 000 y verificado en remoto.
- Resuelto: `npm test` antes fallaba por falta de archivos de prueba; ahora hay 32 pruebas y termina con código 0.
- Las respuestas HEAD de `/` pueden mostrar cabeceras antiguas durante unos minutos por caché de Cloudflare; las peticiones GET reales sí incluyen las cabeceras nuevas.
- Al inspeccionar la D1 remota se encontró la cuenta real del usuario (creada a las 14:57). No se borró. La consulta mostró su token de sesión en la salida, así que se invalidó esa sesión por precaución; el usuario debe volver a iniciar sesión.
- El aviso privado de vulnerabilidades de GitHub no se pudo activar con el token disponible; `SECURITY.md` contempla el contacto privado alternativo.
- KV tiene propagación eventual: un archivo recién subido puede tardar unos segundos en aparecer en otra ubicación.
- Resuelto: en el registro, `guardarSesion()` desmontaba `AuthScreen` y el código de recuperación nunca se veía. Ahora `App` retiene el código y muestra una pantalla de confirmación antes de entrar en la bandeja.
- Resuelto: al añadir la caducidad se reutilizó la constante `HORAS`, que ya valía 24 horas, y «1 hora» caducaba a las 24 horas. Las 56 pruebas lo detectaron; la constante se renombró a `MILISEGUNDOS_POR_HORA`.

## 10. Próximos pasos
- [x] Desplegar `puente-api` y anotar la URL pública.
- [x] Probar registro/envío/descarga contra la URL desplegada.
- [x] Añadir README con las instrucciones de arranque local, la motivación y el aviso de IA.
- [x] Crear el repositorio `qirris/puente`, fijar las normas en español y subir el código.
- [x] Publicar el repositorio con licencia MIT, aviso de proyecto personal y registro protegido con código de invitación.
- [x] Permitir instalar Puente como aplicación en escritorio y móvil.
- [x] Arreglar `npm test`, el README y la documentación rota.
- [x] Cerrar la seguridad sin cambiar el token de URL por cookies.
- [x] Añadir CI, dependencias y documentación de operaciones.
- [x] Añadir tag y release v1.0.0 y ajustar la configuración de GitHub.
- [x] Alojar las fuentes localmente y quitar Google Fonts de la CSP.
- [x] Añadir búsqueda y filtros por tipo en la bandeja.
- [x] Listar y cerrar sesiones activas.
- [x] Código de recuperación de contraseña mostrado una sola vez.
- [x] Selector de caducidad (1 h, 24 h y 7 días) al enviar.
- [x] Publicar v1.1.0 con las mejoras anteriores.
- [x] Evitar el auto-zoom de Safari en iOS subiendo los campos de texto a 16 px.
- [x] Publicar v1.1.1 y sincronizar `package.json`.
- [x] Aclarar en el README cómo se actualiza la PWA instalada.
- [x] Proteger `master` con `enforce_admins` y documentar los saltos mayores de dependencias.
- [x] Permitir seleccionar y enviar varias fotos o archivos de una vez.
- [x] Mostrar actualizaciones pendientes y permitir aplicarlas desde la app.
- [ ] Revisar de forma manual los saltos mayores de dependencias cuando haya hueco.
- [ ] El usuario vuelve a iniciar sesión (se invalidó su sesión por precaución) y prueba la app desde móvil y ordenador.

## 11. Historial de actualizaciones
- 16/11/2026: inicialización del proyecto y sistema de memoria (fase Supabase).
- 18/11/2026: traslado a `Documents\NEGOCIOS` y cambio de rumbo a Cloudflare.
- 19/11/2026: migración completa del backend, cambio a KV, corrección de PBKDF2, despliegue, verificación en remoto, limpieza de restos de Supabase, documentación de la motivación y del aviso de IA, normas de commits en español, repositorio en GitHub, publicación segura con licencia MIT, ámbito personal y registro protegido, e instalación como aplicación.
- 19/11/2026: revisión profesional integral: pruebas automáticas, seguridad reforzada sin cookies, documentación completa, integración continua, observabilidad y cierre de GitHub con versión 1.0.0.
- 19/11/2026: primera mejora posterior a v1.0.0: fuentes Fraunces y Manrope alojadas en el proyecto, sin peticiones a Google y con CSP simplificada.
- 19/11/2026: segunda mejora: búsqueda y filtros por tipo en la bandeja, resueltos en el cliente y con 8 pruebas nuevas.
- 19/11/2026: tercera mejora: panel de sesiones activas con identificador público, rutas propias y limpieza de sesiones caducadas.
- 19/11/2026: cuarta mejora: recuperación de contraseña con código de un solo uso, hash PBKDF2, cinco intentos y cierre de todas las sesiones al acertar.
- 19/11/2026: quinta mejora: caducidad elegible al enviar (1 h, 24 h o 7 días), validada en el Worker y conservada al desfijar. Cierre de las cinco mejoras con publicación de v1.1.0.
- 19/11/2026: limpieza documental final de la v1.1.0: tabla de versiones con soporte, texto de caducidad y memoria del proyecto actualizados; CI en verde.
- 20/11/2026: corrección del auto-zoom en iOS: campos de texto a 16 px, opción de bloquear el zoom manual descartada y despliegue verificado en remoto.
- 20/11/2026: cierre de la v1.1.1 con versión sincronizada, explicación de la actualización de la PWA, protección estricta de `master` y decisión sobre los saltos mayores de dependencias.
- 24/11/2026: selección múltiple en el compositor, con previsualización, retirada individual y subida secuencial.
- 24/11/2026: presentación del repositorio con README personal, galería de escritorio/móvil y selección múltiple, instrucciones locales revisadas y enlaces a la documentación técnica. Trabajo en una PR independiente de la PR #9 de registro de despliegue.
