import { describe, expect, it } from 'vitest'
import worker from './index'
import { entornoFalso } from '../tests/bdFalsa'

type EntornoWorker = Parameters<typeof worker.fetch>[1]
type ContextoWorker = Parameters<typeof worker.fetch>[2]

const contexto: ContextoWorker = { waitUntil() {} }

function crearLlamadas(codigoInvitacion?: string) {
  const entorno = entornoFalso(codigoInvitacion)
  const env = entorno.env as unknown as EntornoWorker

  const llamar = (ruta: string, opciones: RequestInit = {}, ip = '203.0.113.10') => {
    const cabeceras = new Headers(opciones.headers)
    cabeceras.set('cf-connecting-ip', ip)
    return worker.fetch(
      new Request(`https://puente.test${ruta}`, { ...opciones, headers: cabeceras }),
      env,
      contexto,
    )
  }

  const json = (
    ruta: string,
    metodo: string,
    cuerpo: Record<string, unknown>,
    ip?: string,
  ) =>
    llamar(
      ruta,
      {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      },
      ip,
    )

  return { ...entorno, env, llamar, json }
}

describe('registro de cuentas', () => {
  it('rechaza el registro sin el código de invitación', async () => {
    const { json } = crearLlamadas('codigo-de-prueba')
    const respuesta = await json('/api/registro', 'POST', {
      email: 'ana@ejemplo.com',
      password: '123456',
    })
    expect(respuesta.status).toBe(403)
    expect((await respuesta.json()).error).toContain('código de invitación')
  })

  it('crea la cuenta y devuelve un token con el código correcto', async () => {
    const { json } = crearLlamadas('codigo-de-prueba')
    const respuesta = await json('/api/registro', 'POST', {
      email: 'ana@ejemplo.com',
      password: '123456',
      codigo: 'codigo-de-prueba',
    })
    expect(respuesta.status).toBe(201)
    const datos = await respuesta.json()
    expect(datos.user.email).toBe('ana@ejemplo.com')
    expect(typeof datos.token).toBe('string')
    expect(datos.token.length).toBeGreaterThan(20)
  })

  it('valida el email, la contraseña y los duplicados', async () => {
    const { json } = crearLlamadas()
    const datos = { email: 'ana@ejemplo.com', password: '123456' }
    expect((await json('/api/registro', 'POST', { ...datos, email: 'malo' })).status).toBe(400)
    expect((await json('/api/registro', 'POST', { ...datos, password: '12345' })).status).toBe(400)
    expect((await json('/api/registro', 'POST', datos)).status).toBe(201)
    expect((await json('/api/registro', 'POST', datos)).status).toBe(409)
  })
})

describe('límite de intentos de acceso', () => {
  it('bloquea tras cinco fallos por correo e IP', async () => {
    const { json } = crearLlamadas()
    await json('/api/registro', 'POST', {
      email: 'ana@ejemplo.com',
      password: 'correcta',
    })

    for (let intento = 0; intento < 5; intento += 1) {
      const respuesta = await json(
        '/api/acceso',
        'POST',
        { email: 'ana@ejemplo.com', password: 'incorrecta' },
        '198.51.100.7',
      )
      expect(respuesta.status).toBe(401)
    }

    const bloqueo = await json(
      '/api/acceso',
      'POST',
      { email: 'ana@ejemplo.com', password: 'correcta' },
      '198.51.100.7',
    )
    expect(bloqueo.status).toBe(429)
    expect((await bloqueo.json()).error).toBe(
      'Demasiados intentos fallidos. Espera 15 minutos.',
    )
  })

  it('borra los intentos tras un acceso correcto y no afecta a otras IP', async () => {
    const { json } = crearLlamadas()
    await json('/api/registro', 'POST', {
      email: 'ana@ejemplo.com',
      password: 'correcta',
    })

    for (let intento = 0; intento < 4; intento += 1) {
      await json(
        '/api/acceso',
        'POST',
        { email: 'ana@ejemplo.com', password: 'incorrecta' },
        '198.51.100.20',
      )
    }
    const correcto = await json(
      '/api/acceso',
      'POST',
      { email: 'ana@ejemplo.com', password: 'correcta' },
      '198.51.100.20',
    )
    expect(correcto.status).toBe(200)

    const otraIp = await json(
      '/api/acceso',
      'POST',
      { email: 'ana@ejemplo.com', password: 'incorrecta' },
      '198.51.100.21',
    )
    expect(otraIp.status).toBe(401)
  })
})

describe('seguridad de las respuestas', () => {
  it('no abre CORS y añade cabeceras de seguridad a la API', async () => {
    const { json, llamar } = crearLlamadas()
    const respuesta = await json('/api/acceso', 'POST', {
      email: 'ana@ejemplo.com',
      password: 'incorrecta',
    })
    expect(respuesta.headers.get('access-control-allow-origin')).toBeNull()
    expect(respuesta.headers.get('referrer-policy')).toBe('no-referrer')
    expect(respuesta.headers.get('x-content-type-options')).toBe('nosniff')
    expect(respuesta.headers.get('x-frame-options')).toBe('DENY')

    const opciones = await llamar('/api/sesion', { method: 'OPTIONS' })
    expect(opciones.status).toBe(204)
    expect(opciones.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('añade la política de seguridad a la interfaz', async () => {
    const { llamar } = crearLlamadas()
    const respuesta = await llamar('/')
    expect(respuesta.status).toBe(200)
    expect(respuesta.headers.get('content-security-policy')).toContain(
      "default-src 'self'",
    )
    expect(respuesta.headers.get('x-frame-options')).toBe('DENY')
  })
})

describe('sesión y archivos', () => {
  it('mantiene el token de sesión en la URL', async () => {
    const { json, llamar, base, archivos } = crearLlamadas()
    const registro = await json('/api/registro', 'POST', {
      email: 'ana@ejemplo.com',
      password: '123456',
    })
    const { token, user } = await registro.json()

    const sesion = await llamar(`/api/sesion?sesion=${encodeURIComponent(token)}`)
    expect(sesion.status).toBe(200)

    const id = '11111111-1111-4111-8111-111111111111'
    base.prepare(
      `insert into items
         (id, user_id, kind, storage_path, file_name, mime_type, size_bytes)
       values (?, ?, 'image', ?, ?, ?, ?)`,
    ).run(id, user.id, 'archivos/foto.png', 'foto.png', 'image/png', 9)
    await archivos.put('archivos/foto.png', new TextEncoder().encode('contenido').buffer)

    const bandeja = await llamar(`/api/envios?sesion=${encodeURIComponent(token)}`)
    const datos = await bandeja.json()
    expect(datos.items).toHaveLength(1)
    expect(datos.items[0].previewUrl).toContain('?sesion=')

    const imagen = await llamar(
      `/api/archivos/${id}?sesion=${encodeURIComponent(token)}`,
    )
    expect(imagen.status).toBe(200)
    expect(imagen.headers.get('content-type')).toBe('image/png')
    expect(imagen.headers.get('referrer-policy')).toBe('no-referrer')
  })

  it('invalida el token al cerrar la sesión', async () => {
    const { json, llamar } = crearLlamadas()
    const registro = await json('/api/registro', 'POST', {
      email: 'ana@ejemplo.com',
      password: '123456',
    })
    const { token } = await registro.json()

    expect((await llamar(`/api/sesion?sesion=${token}`)).status).toBe(200)
    const salida = await llamar('/api/salir', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(salida.status).toBe(200)
    expect((await llamar(`/api/sesion?sesion=${token}`)).status).toBe(401)
  })
})

describe('mantenimiento', () => {
  it('borra los intentos caducados en la tarea programada', async () => {
    const { json, base, env } = crearLlamadas()
    await json('/api/acceso', 'POST', {
      email: 'ana@ejemplo.com',
      password: 'incorrecta',
    }, '203.0.113.44')
    base.prepare('update intentos_acceso set ultima_at = ?')
      .run('2020-01-01T00:00:00.000Z')

    const antes = base.prepare('select count(*) as n from intentos_acceso')
      .get() as { n: number }
    expect(antes.n).toBe(1)

    await worker.scheduled(
      { scheduledTime: Date.now() } as Parameters<typeof worker.scheduled>[0],
      env,
      contexto,
    )

    const despues = base.prepare('select count(*) as n from intentos_acceso')
      .get() as { n: number }
    expect(despues.n).toBe(0)
  })
})

describe('sesiones activas', () => {
  const Bearer = (token: string) => ({ Authorization: `Bearer ${token}` })

  it('guarda un identificador público distinto del token', async () => {
    const { base, json } = crearLlamadas()
    const registro = await json('/api/registro', 'POST', {
      email: 'ana@ejemplo.com',
      password: '123456',
    })
    const { token } = await registro.json()

    const fila = base.prepare('select public_id from sesiones where token = ?')
      .get(token) as { public_id: string }
    expect(fila.public_id).toMatch(/^[0-9a-f]{32}$/)
    expect(fila.public_id).not.toBe(token)
  })

  it('lista las sesiones sin devolver ningún token', async () => {
    const { json, llamar } = crearLlamadas()
    const registro = await json('/api/registro', 'POST', {
      email: 'ana@ejemplo.com',
      password: '123456',
    })
    const { token } = await registro.json()
    const acceso = await json(
      '/api/acceso',
      'POST',
      { email: 'ana@ejemplo.com', password: '123456' },
      '198.51.100.77',
    )
    const { token: tokenSegunda } = await acceso.json()

    const respuesta = await llamar('/api/sesiones', { headers: Bearer(token) })
    expect(respuesta.status).toBe(200)
    const datos = await respuesta.json()
    expect(datos.sesiones).toHaveLength(2)
    expect(datos.sesiones.filter((sesion: { actual: boolean }) => sesion.actual)).toHaveLength(1)

    const texto = JSON.stringify(datos)
    expect(texto).not.toContain(token)
    expect(texto).not.toContain(tokenSegunda)
  })

  it('cierra otra sesión por su id público y avisa si no existe', async () => {
    const { base, json, llamar } = crearLlamadas()
    const registro = await json('/api/registro', 'POST', {
      email: 'ana@ejemplo.com',
      password: '123456',
    })
    const { token } = await registro.json()
    const acceso = await json(
      '/api/acceso',
      'POST',
      { email: 'ana@ejemplo.com', password: '123456' },
      '198.51.100.78',
    )
    const { token: tokenOtra } = await acceso.json()
    const idOtra = (
      base.prepare('select public_id from sesiones where token = ?')
        .get(tokenOtra) as { public_id: string }
    ).public_id

    const cierre = await llamar(`/api/sesiones/${idOtra}`, {
      method: 'DELETE',
      headers: Bearer(token),
    })
    expect(cierre.status).toBe(200)

    const datos = await (
      await llamar('/api/sesiones', { headers: Bearer(token) })
    ).json()
    expect(datos.sesiones).toHaveLength(1)
    expect(
      (await llamar('/api/sesiones/no-existe', {
        method: 'DELETE',
        headers: Bearer(token),
      })).status,
    ).toBe(404)
  })

  it('no permite cerrar sesiones de otra cuenta', async () => {
    const { base, json, llamar } = crearLlamadas()
    const primera = await json('/api/registro', 'POST', {
      email: 'ana@ejemplo.com',
      password: '123456',
    })
    const { token: tokenAna } = await primera.json()
    const segunda = await json('/api/registro', 'POST', {
      email: 'beto@ejemplo.com',
      password: '123456',
    })
    const { token: tokenBeto } = await segunda.json()
    const idBeto = (
      base.prepare('select public_id from sesiones where token = ?')
        .get(tokenBeto) as { public_id: string }
    ).public_id

    const respuesta = await llamar(`/api/sesiones/${idBeto}`, {
      method: 'DELETE',
      headers: Bearer(tokenAna),
    })
    expect(respuesta.status).toBe(404)
    expect(
      base.prepare('select public_id from sesiones where public_id = ?').get(idBeto),
    ).toBeTruthy()
  })

  it('borra las sesiones caducadas en la tarea programada', async () => {
    const { base, env, json } = crearLlamadas()
    await json('/api/registro', 'POST', {
      email: 'ana@ejemplo.com',
      password: '123456',
    })
    base.prepare('update sesiones set expires_at = ?')
      .run('2020-01-01T00:00:00.000Z')

    await worker.scheduled(
      { scheduledTime: Date.now() } as Parameters<typeof worker.scheduled>[0],
      env,
      contexto,
    )

    const despues = base.prepare('select count(*) as n from sesiones')
      .get() as { n: number }
    expect(despues.n).toBe(0)
  })
})
