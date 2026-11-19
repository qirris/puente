# Operaciones · Puente

Procedimientos para mantener el despliegue. Todos los comandos se ejecutan
desde la raíz del repositorio con Wrangler autenticado (`npx wrangler login`).

## Recursos

| Recurso | Nombre | ID |
| --- | --- | --- |
| Worker | `puente-api` | — |
| D1 | `puente-datos` | `8592609d-e6a4-475b-bc8a-c5a0073db1dd` |
| KV | `puente-archivos` | `f00415679cbd4c8e9fbf3dcba07d2240` |
| URL pública | — | https://puente-api.qirris.workers.dev |

El único secreto es `PUENTE_CODIGO_INVITACION`, configurado en Cloudflare. Si se
pierde o se expone, se rota desde el panel de Cloudflare (Workers → puente-api →
Settings → Variables y secretos) y se vuelve a desplegar.

## Despliegue

```bash
npm test
npm run build
npm run deploy
```

Tras desplegar, seguir la comprobación de `instrucciones/PRUEBAS.md`. Si hay
datos de prueba, borrarlos de la D1 remota al terminar.

## Migraciones

```bash
npx wrangler d1 migrations apply puente-datos --local
npx wrangler d1 migrations apply puente-datos --remote
```

Las migraciones son acumulativas: no editar las ya aplicadas. Añadir siempre un
archivo nuevo en `migrations/` con número correlativo.

## Copias de seguridad

### D1

Exportación completa (estructura y datos):

```bash
npx wrangler d1 export puente-datos --remote \
  --output "copia-d1-$(Get-Date -Format yyyyMMdd).sql"
```

Guardar el archivo fuera del repositorio: contiene correos y hashes de
contraseñas. No subirlo a GitHub.

### KV

KV no tiene exportación masiva integrada. Se puede listar y recuperar cada
clave:

```bash
npx wrangler kv key list --binding PUENTE_ARCHIVOS --remote
npx wrangler kv key get "<clave>" --binding PUENTE_ARCHIVOS --remote
```

`get` devuelve bytes en la salida estándar; para archivos binarios conviene
usar la API de Cloudflare o el panel en lugar de redirigir la salida en
PowerShell. En la práctica, los archivos caducan según el plazo elegido al
enviarlos (1 hora, 24 horas o 7 días) y sus metadatos están en D1, así que la
copia crítica es la de D1.

## Restauración

**Precaución:** restaurar D1 sobrescribe datos actuales. Hacer antes una copia
reciente y avisar de la ventana de mantenimiento.

```bash
npx wrangler d1 execute puente-datos --remote --file="copia-d1-20261119.sql"
```

Después, verificar con un acceso real que las sesiones y los envíos siguen
disponibles. Si la copia se hizo antes de una migración, aplicar primero las
migraciones posteriores.

## Rollback del Worker

Listar despliegues y volver a una versión anterior:

```bash
npx wrangler deployments list
npx wrangler rollback <id-de-version> --message "volver a la versión anterior"
```

El rollback cambia solo el código del Worker; no revierte migraciones de D1 ni
datos de KV. Para un cambio de esquema, revertir el commit, crear una migración
correctiva y volver a desplegar.

## Limpieza manual

```bash
curl -X POST https://puente-api.qirris.workers.dev/api/limpieza \
  -H "Authorization: Bearer <token>"
```

También corre automáticamente cada hora (`17 * * * *`) y elimina intentos de
acceso con más de 15 minutos.
