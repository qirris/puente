# Puente

Tu bandeja privada para enviar enlaces, notas, fotos y archivos entre el móvil y el ordenador.

## ¿Por qué hice Puente?

Lo hice para mí, porque lo necesitaba. Siempre me encontraba con el mismo problema: tener que subir archivos a un servicio u otro para pasarlos del móvil al ordenador y volver, y eso se me hacía incómodo y poco privado. Quería una bandeja sencilla, mía, donde dejar enlaces, notas, fotos y archivos y olvidarme del resto.

La aplicación Puente fue desarrollada con asistencia de inteligencia artificial. Yo definí qué necesitaba y revisé las decisiones; la IA me ayudó a escribir el código, los textos y a resolver los detalles técnicos.

## Ámbito del proyecto

Puente es un proyecto personal, no un servicio abierto al público. El registro
nuevo exige un código de invitación, que se guarda en Cloudflare como secreto
`PUENTE_CODIGO_INVITACION` (nunca en el repositorio). Si el secreto no está
configurado, el registro queda abierto: eso solo se recomienda en desarrollo
local.

El código se comparte bajo licencia MIT. El despliegue está pensado para un
solo usuario y depende de las cuotas gratuitas de Cloudflare.

## Arquitectura

| Parte | Tecnología | Nombre en Cloudflare |
| --- | --- | --- |
| Interfaz | React + Vite + TypeScript | `puente-api` (recursos estáticos) |
| API | Cloudflare Workers (`src/index.ts`) | `puente-api` |
| Datos | D1 (SQLite) | `puente-datos` |
| Archivos | Workers KV (espacio de nombres privado) | `puente-archivos` |

Todo se sirve desde el mismo Worker. No hay claves secretas que configurar: las
contraseñas se guardan como hash en D1 y las sesiones son tokens aleatorios
también en D1.

## Desarrollo local

Necesitas Node.js 20 o superior.

```bash
npm install
npm run dev:api     # Wrangler en http://localhost:8787
npm run dev         # Vite en http://localhost:5173
```

Vite redirige `/api` al puerto 8787, así que no hace falta configurar nada.
La primera vez, Wrangler crea la base de datos local en `.wrangler/state/`.

Para aplicar migraciones:

```bash
npx wrangler d1 migrations apply puente-datos --local
npx wrangler d1 migrations apply puente-datos --remote
```

## Despliegue

```bash
npm run build
npm run deploy
```

El Worker sirve automáticamente el contenido de `dist/` y la API en `/api/*`.
La limpieza de envíos caducados corre cada hora mediante el cron `17 * * * *`.
La versión desplegada está en https://puente-api.qirris.workers.dev.

## Instalar Puente como aplicación

Puente se puede instalar para abrirla en su propia ventana, sin la barra del
navegador y con un icono propio, tanto en el ordenador como en el móvil.

**En Windows:** abre la URL en Edge y elige *⋯ → Aplicaciones → Instalar este
sitio como aplicación*. En Chrome, elige *⋯ → Guardar y compartir → Crear
acceso directo* y marca «Abrir como ventana». Después puedes anclar Puente a la
barra de tareas o arrastrar el acceso directo al escritorio.

**En el móvil:** abre la URL en Chrome (Android) o en Safari (iPhone) y pulsa
*Instalar aplicación* o *Añadir a la pantalla de inicio*, según el navegador.

La instalación guarda solo la interfaz. Los envíos y los archivos siguen
viniendo de Cloudflare, así que hace falta conexión para usar la bandeja. Si el
botón de instalar no aparece, comprueba que estás en HTTPS y que la página se ha
recargado una vez después del despliegue.

## Comprobación rápida de la API

```bash
curl -X POST http://localhost:8787/api/registro \
  -H 'Content-Type: application/json' \
  -d '{"email":"tu@email.com","password":"123456"}'
```

La respuesta incluye un `token`. Úsalo como `Authorization: Bearer <token>`
para el resto de la API.

## Estructura

- `src/index.ts` — API del Worker y limpieza programada.
- `src/lib/` — cliente HTTP, sesión, bandeja y subida con progreso.
- `public/manifest.webmanifest` — datos de instalación como aplicación.
- `public/sw.js` — caché mínima de la interfaz; nunca guarda la API.
- `public/icon-*.png` — iconos para el escritorio y el móvil.
- `migrations/` — esquema de D1.
- `supabase/` — migraciones antiguas, conservadas solo como referencia histórica.
- `wrangler.toml` — configuración de Cloudflare.

Todo el proyecto está en español.
