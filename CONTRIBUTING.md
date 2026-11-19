# Cómo colaborar · Puente

Gracias por interesarte en Puente. Es un proyecto personal y sencillo: cualquier
mejora que haga la bandeja más clara, segura o fácil de mantener es bienvenida.

## Antes de empezar

1. Lee `README.md` para entender el alcance y el despliegue.
2. Lee `instrucciones/ARQUITECTURA.md` y `instrucciones/DECISIONES.md`.
3. Comprueba si ya existe un issue sobre lo que quieres cambiar.

## Preparar el entorno

Necesitas Node.js 24 o superior y una cuenta de Cloudflare si quieres probar el
Worker en remoto.

```bash
npm install
npm test
npm run build
```

Para desarrollar en local, consulta la sección «Desarrollo local» del README.
No hace falta configurar secretos para trabajar en local; en producción el
código de invitación se guarda solo en Cloudflare.

## Convenciones

- Todo el proyecto está en español: código, textos de interfaz, documentación y
  mensajes de commit.
- Sigue `instrucciones/NORMAS_DE_CODIGO.md`: un commit, un propósito, con tipos
  como `funcionalidad:`, `corrección:`, `documentación:` o `pruebas:`.
- TypeScript estricto; `npm run build` debe terminar sin errores.
- Añade pruebas cuando cambies lógica de la API o de las utilidades
  (`instrucciones/PRUEBAS.md`).
- Nunca incluyas secretos, tokens ni contraseñas en archivos ni en commits.

## Pull requests

- Describe qué cambias y por qué; si tiene impacto visual, añade capturas.
- Enlaza el issue relacionado si existe.
- Verifica `npm test` y `npm run build` antes de abrir la PR; la integración
  continua ejecutará ambos comandos.
- Los cambios de esquema van en un archivo nuevo dentro de `migrations/` y
  explican cómo se aplican en `docs/OPERACIONES.md`.

## Seguridad

Si encuentras una vulnerabilidad, sigue `SECURITY.md` y no la publiques en un
issue.
