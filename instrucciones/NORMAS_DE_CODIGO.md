# Normas de código · Puente

Todo el proyecto se mantiene en español: nombres de recursos, comentarios,
textos de la interfaz, documentación y mensajes de commit.

## Mensajes de commit

Formato: `tipo: descripción en minúsculas, imperativa y sin punto final`.

Tipos permitidos:

- `inicial:` — commit inicial del repositorio.
- `funcionalidad:` — nueva funcionalidad.
- `corrección:` — corrección de errores o limpieza de restos obsoletos.
- `documentación:` — README, memoria, instrucciones y textos.
- `configuración:` — configuración de Cloudflare, dependencias o scripts.
- `refactorización:` — cambios de estructura sin cambiar el comportamiento.
- `pruebas:` — pruebas automatizadas o manuales.

Ejemplos:

- `documentación: arreglar el README`
- `corrección: limitar PBKDF2 a 100000 iteraciones`

Reglas:

- Un commit, un propósito.
- Nunca incluir secretos, tokens ni contraseñas en el historial.
- La memoria (`memoria.md`) se actualiza con cada avance importante.

## Código

- TypeScript estricto. `npm run build` debe pasar antes de cada commit.
- La API del Worker (`src/index.ts`) es la única frontera de seguridad: cada
  consulta a D1 lleva el `user_id` de la sesión.
- Los recursos de Cloudflare llevan siempre el prefijo `puente`: Worker
  `puente-api`, base de datos `puente-datos` y espacio KV `puente-archivos`.
- Los archivos se guardan en Workers KV. No se usa R2: su activación exige un
  paso manual en el panel de Cloudflare.
- Las contraseñas usan PBKDF2-SHA256 con 100000 iteraciones, el máximo que
  admite el runtime de Cloudflare Workers.
