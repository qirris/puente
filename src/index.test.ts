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

describe('recuperación de contraseña', () => {
  const Bearer = (token: string) => ({ Authorization: `Bearer ${token}` })
  const REGEX_CODIGO = /^[A-HJ-NP-Z2-9]{10}$/
  const EMAIL = 'ana@ejemplo.com'

  it('entrega el código en el registro y guarda solo su hash', async () => {
    const { base, json } = crearLlamadas()
    const respuesta = await json('/api/registro', 'POST', {
      email: EMAIL,
      password: '123456',
    })
    expect(respuesta.status).toBe(201)
    const datos = await respuesta.json()
    expect(datos.codigoRecuperacion).toMatch(REGEX_CODIGO)

    const id = (
      base.prepare('select id from users where email = ?').get(EMAIL) as { id: string }
    ).id
    const fila = base.prepare(
      'select hash, fallos from codigos_recuperacion where user_id = ?',
    )
      .get(id) as { hash: string; fallos: number }
    expect(fila.hash).toContain('pbkdf2$100000$')
    expect(fila.hash).not.toContain(datos.codigoRecuperacion)
    expect(fila.fallos).toBe(0)
  })

  it('exige sesión para generar un código e invalida el anterior', async () => {
    const { base, json, llamar } = crearLlamadas()
    expect((await llamar('/api/recuperacion/codigo', { method: 'POST' })).status).toBe(401)

    const registro = await json('/api/registro', 'POST', {
      email: EMAIL,
      password: '123456',
    })
    const { token, codigoRecuperacion: primero } = await registro.json()

    const generada = await llamar('/api/recuperacion/codigo', {
      method: 'POST',
      headers: Bearer(token),
    })
    expect(generada.status).toBe(200)
    const { codigo: segundo } = await generada.json()
    expect(segundo).toMatch(REGEX_CODIGO)
    expect(segundo).not.toBe(primero)

    const id = (
      base.prepare('select id from users where email = ?').get(EMAIL) as { id: string }
    ).id
    const total = base.prepare(
      'select count(*) as n from codigos_recuperacion where user_id = ?',
    )
      .get(id) as { n: number }
    expect(total.n).toBe(1)

    const anterior = await json('/api/recuperacion/restablecer', 'POST', {
      email: EMAIL,
      codigo: primero,
      password: 'nueva123',
    })
    expect(anterior.status).toBe(401)
  })

  it('cambia la contraseña, cierra las sesiones y gasta el código', async () => {
    const { base, json } = crearLlamadas()
    const registro = await json('/api/registro', 'POST', {
      email: EMAIL,
      password: '123456',
    })
    const { codigoRecuperacion } = await registro.json()

    const respuesta = await json('/api/recuperacion/restablecer', 'POST', {
      email: EMAIL,
      codigo: codigoRecuperacion.toLowerCase(),
      password: 'nueva123',
    })
    expect(respuesta.status).toBe(200)

    const sesiones = base.prepare('select count(*) as n from sesiones')
      .get() as { n: number }
    const codigos = base.prepare('select count(*) as n from codigos_recuperacion')
      .get() as { n: number }
    expect(sesiones.n).toBe(0)
    expect(codigos.n).toBe(0)

    const antigua = await json('/api/acceso', 'POST', {
      email: EMAIL,
      password: '123456',
    })
    expect(antigua.status).toBe(401)
    const nueva = await json('/api/acceso', 'POST', {
      email: EMAIL,
      password: 'nueva123',
    })
    expect(nueva.status).toBe(200)
  })

  it('bloquea tras cinco códigos erróneos y borra el código', async () => {
    const { base, json } = crearLlamadas()
    const registro = await json('/api/registro', 'POST', {
      email: EMAIL,
      password: '123456',
    })
    const { codigoRecuperacion } = await registro.json()
    const erroneo = codigoRecuperacion === 'AAAAAAAAAA' ? 'BBBBBBBBBB' : 'AAAAAAAAAA'

    for (let intento = 0; intento < 4; intento += 1) {
      const respuesta = await json('/api/recuperacion/restablecer', 'POST', {
        email: EMAIL,
        codigo: erroneo,
        password: 'nueva123',
      })
      expect(respuesta.status).toBe(401)
    }

    const bloqueo = await json('/api/recuperacion/restablecer', 'POST', {
      email: EMAIL,
      codigo: erroneo,
      password: 'nueva123',
    })
    expect(bloqueo.status).toBe(429)
    expect((await bloqueo.json()).error).toContain('Demasiados intentos')

    const restante = base.prepare('select count(*) as n from codigos_recuperacion')
      .get() as { n: number }
    expect(restante.n).toBe(0)
  })

  it('rechaza códigos caducados y no revela si la cuenta existe', async () => {
    const { base, json } = crearLlamadas()
    const registro = await json('/api/registro', 'POST', {
      email: EMAIL,
      password: '123456',
    })
    const { codigoRecuperacion } = await registro.json()
    base.prepare('update codigos_recuperacion set expires_at = ?')
      .run('2020-01-01T00:00:00.000Z')

    const caducado = await json('/api/recuperacion/restablecer', 'POST', {
      email: EMAIL,
      codigo: codigoRecuperacion,
      password: 'nueva123',
    })
    expect(caducado.status).toBe(401)
    const mensaje = (await caducado.json()).error
    expect(mensaje).toBe('Código de recuperación incorrecto o caducado.')

    const inexistente = await json('/api/recuperacion/restablecer', 'POST', {
      email: 'nadie@ejemplo.com',
      codigo: codigoRecuperacion,
      password: 'nueva123',
    })
    expect(inexistente.status).toBe(401)
    expect((await inexistente.json()).error).toBe(mensaje)
  })

  it('valida el formato del código antes de buscar en la base', async () => {
    const { json } = crearLlamadas()
    await json('/api/registro', 'POST', { email: EMAIL, password: '123456' })

    const respuesta = await json('/api/recuperacion/restablecer', 'POST', {
      email: EMAIL,
      codigo: '0000000000',
      password: 'nueva123',
    })
    expect(respuesta.status).toBe(401)
    expect((await respuesta.json()).error).toContain('Código de recuperación')
  })

  it('borra los códigos caducados en la limpieza programada', async () => {
    const { base, env, json } = crearLlamadas()
    await json('/api/registro', 'POST', { email: EMAIL, password: '123456' })
    base.prepare('update codigos_recuperacion set expires_at = ?')
      .run('2020-01-01T00:00:00.000Z')

    await worker.scheduled(
      { scheduledTime: Date.now() } as Parameters<typeof worker.scheduled>[0],
      env,
      contexto,
    )

    const restante = base.prepare('select count(*) as n from codigos_recuperacion')
      .get() as { n: number }
    expect(restante.n).toBe(0)
  })
})

describe('caducidad configurable', () => {
  const EMAIL = 'ana@ejemplo.com'

  async function registrar() {
    const entorno = crearLlamadas()
    const respuesta = await entorno.json('/api/registro', 'POST', {
      email: EMAIL,
      password: '123456',
    })
    const { token } = await respuesta.json()
    return { ...entorno, token }
  }

  function texto(token: string, duracion?: number) {
    const cuerpo: Record<string, unknown> = { kind: 'text', content: 'Mensaje de prueba' }
    if (duracion !== undefined) cuerpo.duracion = duracion
    return {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cuerpo),
    }
  }

  it('aplica la duración elegida a los envíos de texto', async () => {
    const { llamar, token } = await registrar()
    const antes = Date.now()

    const corto = await llamar('/api/envios', texto(token, 1))
    expect(corto.status).toBe(201)
    const uno = await corto.json()
    expect(uno.duracionHoras).toBe(1)
    const milisCorto = new Date(uno.expires_at).getTime() - antes
    expect(milisCorto).toBeGreaterThan(59 * 60_000)
    expect(milisCorto).toBeLessThanOrEqual(61 * 60_000)

    const largo = await llamar('/api/envios', texto(token, 168))
    const siete = await largo.json()
    expect(siete.duracionHoras).toBe(168)
    const milisLargo = new Date(siete.expires_at).getTime() - antes
    expect(milisLargo).toBeGreaterThan(167 * 60 * 60_000)
    expect(milisLargo).toBeLessThanOrEqual(169 * 60 * 60_000)

    const normal = await llamar('/api/envios', texto(token))
    const veinticuatro = await normal.json()
    expect(veinticuatro.duracionHoras).toBe(24)
  })

  it('rechaza una duración no permitida', async () => {
    const { llamar, token } = await registrar()
    const respuesta = await llamar('/api/envios', texto(token, 2))
    expect(respuesta.status).toBe(400)
    expect((await respuesta.json()).error).toContain('1, 24 o 168')
  })

  it('aplica la duración del encabezado a los archivos', async () => {
    const { base, llamar, token } = await registrar()
    const antes = Date.now()
    const respuesta = await llamar('/api/subir', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-puente-nombre': encodeURIComponent('prueba.txt'),
        'x-puente-duracion': '168',
        'Content-Type': 'text/plain',
      },
      body: 'contenido de prueba',
    })
    expect(respuesta.status).toBe(201)
    const item = await respuesta.json()
    expect(item.duracionHoras).toBe(168)
    expect(new Date(item.expires_at).getTime() - antes).toBeGreaterThan(167 * 60 * 60_000)

    const fila = base.prepare('select duracion_horas from items where id = ?')
      .get(item.id) as { duracion_horas: number }
    expect(fila.duracion_horas).toBe(168)

    const invalida = await llamar('/api/subir', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-puente-duracion': '7',
        'Content-Type': 'text/plain',
      },
      body: 'otro contenido',
    })
    expect(invalida.status).toBe(400)
  })

  it('recupera la duración original al desfijar un envío', async () => {
    const { base, llamar, token } = await registrar()
    const creado = await llamar('/api/envios', texto(token, 1))
    const { id } = await creado.json()
    const cabeceras = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    await llamar(`/api/envios/${id}`, {
      method: 'PATCH',
      headers: cabeceras,
      body: JSON.stringify({ pinned: true }),
    })
    base.prepare('update items set expires_at = ? where id = ?')
      .run('2020-01-01T00:00:00.000Z', id)

    const antes = Date.now()
    const desfijado = await llamar(`/api/envios/${id}`, {
      method: 'PATCH',
      headers: cabeceras,
      body: JSON.stringify({ pinned: false }),
    })
    expect(desfijado.status).toBe(200)
    const item = await desfijado.json()
    expect(item.duracionHoras).toBe(1)
    expect(new Date(item.expires_at).getTime() - antes).toBeLessThanOrEqual(61 * 60_000)
  })
})
