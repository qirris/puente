# Política de seguridad · Puente

Puente es un proyecto personal desplegado en
https://puente-api.qirris.workers.dev. Agradezco cualquier aviso responsable de
un problema de seguridad.

## Versiones con soporte

| Versión | Soporte |
| --- | --- |
| 1.0.x | Sí |
| Anteriores a 1.0 | No |

## Cómo informar de una vulnerabilidad

**No publiques el detalle en un issue ni en una discusión pública.** Si en la
pestaña **Security** de este repositorio aparece *Report a vulnerability*, usa
ese canal privado. Si no aparece, escribe privadamente al mantenedor a través
de GitHub y limita el issue público a un aviso genérico sin detalles
explotables.

Incluye, si puedes:

- Descripción del problema y su impacto.
- Pasos para reproducirlo.
- Versión o fecha del despliegue afectado.
- Cualquier pista útil (endpoint, petición, cabecera).

Como es un proyecto personal, no hay un plazo de respuesta contractual, pero
intentaré confirmar la recepción y revisar el aviso lo antes posible. Una vez
corregido, se publicará la nota correspondiente en `CHANGELOG.md` sin exponer
los datos de quien informó.

## Alcance

El registro está protegido por el secreto `PUENTE_CODIGO_INVITACION`, que vive
solo en Cloudflare. Nunca se guarda en el repositorio ni en la documentación.
Las contraseñas se almacenan como hash PBKDF2-SHA256 con sal aleatoria; las
sesiones son tokens aleatorios en D1.

El panel de sesiones activas usa un identificador público de 16 bytes para
listar y cerrar sesiones. Ese identificador no sirve para autenticarse: la API
nunca devuelve tokens al consultar las sesiones.

La vista previa de imágenes incluye el token de sesión en la URL. Es una
limitación conocida y asumida por decisión del proyecto: se mitiga con
`Referrer-Policy: no-referrer`, `Cache-Control: no-store` y cabeceras de
seguridad en todas las respuestas. No se ha sustituido por cookies.

Si encuentras un secreto accidentalmente versionado, avísame de inmediato por
el canal privado indicado arriba para que lo rote antes de hablar del caso en
público.
