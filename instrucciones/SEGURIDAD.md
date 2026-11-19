# Seguridad · Puente

La frontera de seguridad es el Worker: D1 y KV no se exponen directamente al
navegador. Este documento describe qué se aplica y qué limitaciones se asumen.

## Autenticación

- **Contraseñas:** PBKDF2-SHA256, 100 000 iteraciones (límite de Cloudflare
  Workers) y sal aleatoria de 16 bytes. El formato guardado es
  `pbkdf2$iteraciones$sal$hash`.
- **Registro:** exige `codigo` cuando el secreto `PUENTE_CODIGO_INVITACION`
  existe en el Worker. El valor del secreto nunca se versiona.
- **Sesiones:** token aleatorio de 32 bytes guardado en D1, con caducidad de
  30 días. Se acepta en `Authorization: Bearer <token>` o en `?sesion=<token>`
  para las vistas previas de imagen.
- **Cierre de sesión:** elimina el token de D1, así que invalida la sesión de
  verdad.

## Sesiones activas

- `GET /api/sesiones` devuelve el identificador público, la fecha de creación,
  la caducidad y si es la sesión actual. Nunca devuelve tokens.
- `DELETE /api/sesiones/:id` cierra solo una sesión del usuario autenticado. Un
  identificador ajeno o inexistente responde 404.
- El identificador público son 16 bytes en hexadecimal. No es un secreto, pero
  tampoco permite iniciar sesión: solo nombra la fila en la API.
- La limpieza programada elimina también las sesiones caducadas.

## Recuperación de contraseña

- El código tiene 10 caracteres de un alfabeto sin `0`, `O`, `1` ni `I`, para
  poder copiarlo a mano sin confusiones.
- Solo se guarda su hash PBKDF2 en `codigos_recuperacion`; la API devuelve el
  valor en claro únicamente al generarlo.
- Caduca en 1 hora. Caducar o agotar los cinco intentos borra la fila.
- Una cuenta inexistente y un código erróneo devuelven el mismo mensaje, para no
  revelar qué correos tienen cuenta.
- Acertar cambia la contraseña, borra el código y cierra todas las sesiones.
- Generar un código nuevo invalida el anterior.

## Límite de intentos

- 5 fallos permitidos por combinación de correo y dirección IP.
- Ventana de 15 minutos; al superarla se responde HTTP 429 con el mensaje
  «Demasiados intentos fallidos. Espera 15 minutos.».
- Un acceso correcto borra el contador de esa clave.
- La IP se toma de `cf-connecting-ip` y, si no está, de `x-forwarded-for`.
- El cron horario elimina las filas con más de 15 minutos de antigüedad.

La tabla `intentos_acceso` se crea en `migrations/0003_intentos_acceso.sql`.

## Cabeceras y CORS

- No hay `Access-Control-Allow-Origin: *`: la interfaz y la API comparten
  origen, así que no se necesita CORS abierto.
- `OPTIONS` responde 204 sin cabeceras de acceso entre orígenes.
- Todas las respuestas de la API incluyen `Cache-Control: no-store`,
  `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff` y
  `X-Frame-Options: DENY`.
- La interfaz y el service worker reciben además una CSP con `default-src
  'self'`, `frame-ancestors 'none'` y `font-src 'self'`: las fuentes se sirven
  desde `public/fuentes/`, sin peticiones a terceros. Los archivos privados
  llevan `Cache-Control: private`.

## Limitación conocida: el token en la URL

Las vistas previas de imágenes usan `/api/archivos/<id>?sesion=<token>` porque
un elemento `<img>` no puede enviar la cabecera `Authorization`. El token puede
quedar en el historial del navegador o en logs internos.

**Decisión del proyecto:** mantener este diseño y no sustituirlo por cookies.
Se mitiga con `Referrer-Policy: no-referrer`, `Cache-Control: no-store` y sin
CORS abierto. Si en el futuro se reconsidera, hay que documentar el cambio en
`DECISIONES.md` y actualizar `SECURITY.md`, el README y las pruebas.

## Datos y secretos

- Los envíos caducan a las 24 h salvo que estén fijados; el cron borra también
  el objeto de KV.
- El código de invitación es el único secreto de la aplicación y vive en
  Cloudflare.
- No se guardan secretos en `memoria.md`, `instrucciones/` ni en ningún otro
  archivo del repositorio. Si ocurre accidentalmente, rotar el secreto y avisar
  según `SECURITY.md`.
- Las copias y la restauración se describen en `docs/OPERACIONES.md`.
