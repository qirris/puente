# Pruebas · Puente

## Automáticas

Se ejecutan con Vitest y no necesitan cuenta de Cloudflare:

```bash
npm test        # una pasada
npm run test:watch
npm run build   # comprueba tipos de aplicación, Worker y pruebas
```

Las 60 pruebas están repartidas así:

| Archivo | Qué cubre |
| --- | --- |
| `src/lib/validation.test.ts` | Enlaces, texto, tamaño de archivos y nombres seguros. |
| `src/lib/format.test.ts` | Tamaños, fechas, caducidad y etiquetas en español. |
| `src/lib/filtrado.test.ts` | Búsqueda por texto, acentos, nombre de archivo y filtros por tipo. |
| `src/lib/actualizaciones.test.ts` | Primera instalación, detección de versiones pendientes, activación y coordinación entre pestañas. |
| `src/index.test.ts` | Registro, acceso, límite de intentos, cabeceras, CORS, sesión en URL, sesiones activas, recuperación, caducidad elegible, archivos y limpieza. |

Las pruebas del Worker usan `tests/bdFalsa.ts`: una base SQLite en memoria con
`node:sqlite` a la que se aplican las seis migraciones reales, más un KV falso.
Por eso un cambio en `migrations/` rompe las pruebas si no es compatible con la
API que usa el Worker.

Se necesita Node.js 24 o superior porque `node:sqlite` forma parte de las
pruebas. La versión también se declara en `engines` y `.nvmrc`.

## Integración continua

`.github/workflows/ci.yml` ejecuta `npm ci`, `npm run build` y `npm test` en
cada push y en cada pull request. No despliega: el despliegue sigue siendo
manual con `npm run deploy` para no publicar cambios sin revisar.

## Verificación manual en remoto

Tras un despliegue, comprobar al menos:

```bash
# La interfaz y los recursos de la PWA responden y traen cabeceras de seguridad.
curl -sI https://puente-api.qirris.workers.dev/ | Select-String 'HTTP/|Content-Security-Policy|Referrer-Policy|X-Frame-Options'
curl -sI https://puente-api.qirris.workers.dev/manifest.webmanifest

# La API no abre CORS y aplica el límite de intentos.
curl -sI https://puente-api.qirris.workers.dev/api/sesion | Select-String 'HTTP/|Access-Control-Allow-Origin|Referrer-Policy'
```

Después, desde el navegador:

1. Registro con el código de invitación y acceso con la cuenta real.
2. Envío de un enlace, una nota, una foto y un archivo.
3. Descarga y vista previa de la foto; comprobar que se ve con el token en la
   URL y que no se envía como referrer a otro sitio.
4. Fijar un envío y comprobar que pierde la caducidad.
5. Cerrar la sesión y verificar que el token ya no sirve.

Si se crea una cuenta de prueba, borrarla de la D1 remota al terminar.

## Antes de dar un cambio por terminado

- `npm test` en verde.
- `npm run build` sin errores.
- Despliegue correcto y comprobaciones remotas anteriores.
- Sin secretos en el historial (`git status` limpio y commits en español).
- Memoria y tareas pendientes actualizadas.
