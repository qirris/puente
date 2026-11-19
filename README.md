# Puente

Tu bandeja privada para enviar enlaces, notas, fotos y archivos entre el móvil y el ordenador.

## ¿Por qué hice Puente?

Lo hice para mí, porque lo necesitaba. Siempre me encontraba con el mismo problema: tener que subir archivos a un servicio u otro para pasarlos del móvil al ordenador y volver, y eso se me hacía incómodo y poco privado. Quería una bandeja sencilla, mía, donde dejar enlaces, notas, fotos y archivos y olvidarme del resto.

La aplicación Puente fue desarrollada con asistencia de inteligencia artificial. Yo definí qué necesitaba y revisé las decisiones; la IA me ayudó a escribir el código, los textos y a resolver los detalles técnicos.

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
- `migrations/` — esquema de D1.
- `supabase/` — migraciones antiguas, conservadas solo como referencia histórica.
- `wrangler.toml` — configuración de Cloudflare.

Todo el proyecto está en español.
