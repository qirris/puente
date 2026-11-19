# Arquitectura · Puente

## Visión general

Puente es una aplicación web de un solo usuario. El mismo Worker de Cloudflare
sirve la interfaz compilada y expone la API; no hay servidor propio ni servicio
de autenticación externo.

```text
Navegador (React)
   │  /api/*  (Authorization: Bearer o ?sesion=)
   ▼
Cloudflare Worker  puente-api
   ├── D1      puente-datos   → users, sesiones, items, intentos_acceso
   ├── KV      puente-archivos → bytes de fotos y archivos
   └── Assets  dist/          → interfaz, fuentes, manifiesto PWA y service worker
```

## Módulos del cliente (`src/`)

| Archivo | Responsabilidad |
| --- | --- |
| `main.tsx` | Arranca React y registra el service worker de la PWA. |
| `App.tsx` | Composición de la interfaz y estados globales. |
| `components/` | Bandeja, tarjetas de envío, avisos y pantalla de carga. |
| `hooks/useAuth.ts` | Inicio de sesión, registro y cierre de sesión. |
| `hooks/useInbox.ts` | Bandeja, sondeo cada 10 s y operaciones sobre envíos. |
| `lib/api.ts` | Cliente HTTP con el token de sesión. |
| `lib/auth.ts` y `lib/sesion.ts` | Persistencia local de la sesión. |
| `lib/inbox.ts` | Tipos y acceso a los envíos. |
| `lib/filtrado.ts` | Búsqueda y filtros de la bandeja, sin tocar la API. |
| `components/InboxFilters.tsx` | Campo de búsqueda y chips de tipo. |
| `lib/sesiones.ts` | Listado y cierre de sesiones activas. |
| `components/SesionesPanel.tsx` | Panel para revisar y cerrar sesiones. |
| `lib/upload.ts` | Subida de archivos con barra de progreso. |
| `lib/validation.ts` | Normalización de enlaces y validación de archivos. |
| `lib/format.ts` | Tamaños, fechas relativas y etiquetas en español. |

## API del Worker (`src/index.ts`)

| Ruta | Método | Uso |
| --- | --- | --- |
| `/api/registro` | POST | Crea una cuenta; exige el código de invitación si está configurado. |
| `/api/acceso` | POST | Inicia sesión y aplica el límite de intentos. |
| `/api/salir` | POST | Borra la sesión en D1. |
| `/api/sesion` | GET | Devuelve el usuario de la sesión actual. |
| `/api/sesiones` | GET | Lista las sesiones activas con su id público, sin tokens. |
| `/api/sesiones/:id` | DELETE | Cierra una sesión propia por su id público. |
| `/api/envios` | GET / POST | Lista o crea envíos de texto y enlace. |
| `/api/envios/:id` | PATCH / DELETE | Fija, desfija o borra un envío. |
| `/api/archivos` | POST | Sube un archivo a KV y crea su registro en D1. |
| `/api/archivos/:id` | GET | Sirve el archivo o su vista previa. |
| `/api/limpieza` | POST | Ejecuta la limpieza manualmente. |

## Bandeja

`hooks/useInbox.ts` mantiene la lista de envíos y `lib/filtrado.ts` aplica la
búsqueda y los filtros solo en el navegador. No hay rutas ni consultas nuevas:
la lista llega de `/api/envios` y se filtra en memoria.

## Sesiones activas

`lib/sesiones.ts` consulta `GET /api/sesiones` y cierra sesiones con
`DELETE /api/sesiones/:id`. El Worker devuelve un `public_id` aleatorio de 16
bytes, la fecha de creación, la caducidad y si es la sesión actual; en ningún
caso devuelve el token. La migración `0004_sesiones_public_id.sql` añadió esa
columna y rellenó las sesiones ya abiertas.

Todas las rutas excepto registro, acceso y `OPTIONS` exigen una sesión válida.
El trabajador programado (`17 * * * *`) llama a la misma limpieza que
`/api/limpieza`: borra archivos caducados, registros caducados, sesiones
caducadas e intentos de acceso antiguos.

## Esquema de datos

Las migraciones están en `migrations/` y se aplican con Wrangler:

- `0001_init.sql`: `users` e `items`, con restricciones de contenido y tamaño.
- `0002_sesiones.sql`: tokens de sesión con expiración a 30 días.
- `0003_intentos_acceso.sql`: fallos de acceso por clave `IP|correo`.
- `0004_sesiones_public_id.sql`: identificador público de cada sesión.

`items` guarda metadatos y, para imágenes y archivos, la ruta del objeto en KV.
Los bytes viven siempre en `puente-archivos`; D1 nunca guarda archivos.

## Flujo de una subida

1. El cliente valida tamaño y tipo y envía el archivo a `/api/archivos`.
2. El Worker comprueba la sesión, limita el tamaño a 20 MB y genera un nombre
   seguro con `nombreSeguro`.
3. Escribe los bytes en KV y crea la fila en `items` con caducidad de 24 horas.
4. Para las imágenes, la bandeja devuelve una `previewUrl` con el token de
   sesión en la query; el service worker excluye `/api/` de su caché.

## PWA

`public/manifest.webmanifest` define el nombre, los colores y los iconos;
`public/sw.js` guarda solo la interfaz y los recursos estáticos. La API nunca se
almacena en caché porque contiene datos privados de la sesión.
