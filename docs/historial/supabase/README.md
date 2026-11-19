# Historial · Supabase

Esta carpeta contiene el esquema, las migraciones y la función de limpieza del
backend original de Puente, basado en Supabase. Se movió aquí el 19/11/2026
cuando el proyecto se migró a Cloudflare Workers + D1 + Workers KV.

**No se usa en producción ni en desarrollo.** No ejecutar estas migraciones:
los nombres de recursos y las credenciales son solo de referencia. El esquema
actual está en `migrations/` y la lógica de acceso en `src/index.ts`.

Se conserva por motivos de trazabilidad: explica de dónde vienen las
restricciones de `items` y por qué se tomaron las decisiones recogidas en
`instrucciones/DECISIONES.md`. No contiene secretos reales.
