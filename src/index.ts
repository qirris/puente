// Puente · API en Cloudflare Workers
// Sustituye al backend de Supabase: D1 guarda los envíos, KV los archivos y
// las sesiones se gestionan aquí. Sin secretos que configurar a mano.

interface D1Result<T> {
  results: T[]
  success: boolean
}

interface D1Statement {
  bind(...values: unknown[]): D1Statement
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>
  run(): Promise<D1Result<unknown>>
}

interface D1Database {
  prepare(sql: string): D1Statement
}

interface KVArchivos {
  put(key: string, value: ArrayBuffer | Uint8Array | string): Promise<void>
  get(key: string, options: { type: 'arrayBuffer' }): Promise<ArrayBuffer | null>
  delete(key: string): Promise<void>
}

interface Fetcher {
  fetch(request: Request): Promise<Response>
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
}

interface ScheduledController {
  scheduledTime: number
}

interface Env {
  PUENTE_DB: D1Database
  PUENTE_ARCHIVOS: KVArchivos
  PUENTE_STATIC: Fetcher
  // Si no se configura, el registro queda abierto (útil en desarrollo local).
  PUENTE_CODIGO_INVITACION?: string
}

interface Cuenta {
  id: string
  email: string
  password_hash: string
}

interface SesionFila {
  token: string
  user_id: string
  email: string
  public_id: string | null
}

interface Envio {
  id: string
  user_id: string
  kind: 'text' | 'link' | 'image' | 'file'
  content: string | null
  storage_path: string | null
  file_name: string | null
  mime_type: string | null
  size_bytes: number | null
  pinned: number
  created_at: string
  expires_at: string | null
}

interface UsuarioSesion {
  id: string
  email: string
  token: string
  publicId: string
}

interface CodigoRecuperacion {
  user_id: string
  hash: string
  fallos: number
  creado_at: string
  expires_at: string
}

const LIMITE_ARCHIVO = 20 * 1024 * 1024
const MAX_TEXTO = 10_000
// Cloudflare Workers limita PBKDF2 a 100000 iteraciones como máximo.
const ITERACIONES = 100_000
const HORAS = 24 * 60 * 60 * 1000
const INTENTOS_MAXIMOS = 5
const VENTANA_INTENTOS = 15 * 60 * 1000
// El código de recuperación vive una hora y admite cinco intentos.
const RECUPERACION_MS = 60 * 60 * 1000
const RECUPERACION_MAX_FALLOS = 5
// Sin 0, O, 1, I, l ni otros caracteres fáciles de confundir al copiar a mano.
const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const LONGITUD_CODIGO = 10

// La interfaz se sirve desde el mismo origen, así que no hace falta CORS abierto.
const CABECERAS_COMUNES: Record<string, string> = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
}

const POLITICA_SEGURIDAD = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' blob: data:",
  "connect-src 'self'",
].join('; ')

function ahora(): string {
  return new Date().toISOString()
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CABECERAS_COMUNES, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

/** Añade cabeceras de seguridad a la interfaz y al service worker. */
function conCabecerasSeguras(respuesta: Response): Response {
  const cabeceras = new Headers(respuesta.headers)
  const tipo = cabeceras.get('Content-Type') ?? ''
  if (tipo.includes('text/html') || tipo.includes('javascript')) {
    cabeceras.set('Content-Security-Policy', POLITICA_SEGURIDAD)
    cabeceras.set('Referrer-Policy', 'no-referrer')
    cabeceras.set('X-Content-Type-Options', 'nosniff')
    cabeceras.set('X-Frame-Options', 'DENY')
  }
  return new Response(respuesta.body, {
    status: respuesta.status,
    statusText: respuesta.statusText,
    headers: cabeceras,
  })
}

function fallo(mensaje: string, status: number): Response {
  return json({ error: mensaje }, status)
}

function aBase64(bytes: Uint8Array): string {
  let cadena = ''
  for (const byte of bytes) cadena += String.fromCharCode(byte)
  return btoa(cadena)
}

function deBase64(valor: string): Uint8Array {
  const cadena = atob(valor)
  return Uint8Array.from(cadena, (caracter) => caracter.charCodeAt(0))
}

async function hashContrasena(
  password: string,
  salB64?: string,
  iteraciones: number = ITERACIONES,
): Promise<string> {
  const sal = salB64
    ? deBase64(salB64)
    : crypto.getRandomValues(new Uint8Array(16))
  const salBuffer = sal.buffer.slice(
    sal.byteOffset,
    sal.byteOffset + sal.byteLength,
  ) as ArrayBuffer
  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salBuffer, iterations: iteraciones },
    clave,
    256,
  )
  return `pbkdf2$${iteraciones}$${aBase64(sal)}$${aBase64(new Uint8Array(bits))}`
}

async function contrasenaValida(password: string, guardada: string): Promise<boolean> {
  const partes = guardada.split('$')
  if (partes.length !== 4 || partes[0] !== 'pbkdf2') return false
  const iteraciones = Number(partes[1])
  if (!Number.isInteger(iteraciones) || iteraciones < 1) return false
  const candidata = await hashContrasena(password, partes[2], iteraciones)
  return candidata === guardada
}

function nuevoToken(): string {
  return aBase64(crypto.getRandomValues(new Uint8Array(32)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function ipDe(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'local'
  )
}

function claveIntento(request: Request, email: string): string {
  return `${ipDe(request)}|${email}`
}

interface IntentoAcceso {
  fallos: number
  ultima_at: string
}

async function consultarIntento(
  env: Env,
  clave: string,
): Promise<IntentoAcceso | null> {
  return env.PUENTE_DB.prepare(
    'select fallos, ultima_at from intentos_acceso where clave = ?',
  )
    .bind(clave)
    .first<IntentoAcceso>()
}

function dentroDeLaVentana(intento: IntentoAcceso): boolean {
  return Date.now() - new Date(intento.ultima_at).getTime() <= VENTANA_INTENTOS
}

async function registrarFallo(env: Env, clave: string): Promise<number> {
  const intento = await consultarIntento(env, clave)
  const fallos = !intento || !dentroDeLaVentana(intento) ? 1 : intento.fallos + 1
  const instante = ahora()
  await env.PUENTE_DB.prepare(
    `insert into intentos_acceso (clave, fallos, primera_at, ultima_at)
     values (?, ?, ?, ?)
     on conflict(clave) do update set
       fallos = excluded.fallos,
       primera_at = excluded.primera_at,
       ultima_at = excluded.ultima_at`,
  )
    .bind(clave, fallos, instante, instante)
    .run()
  return fallos
}

async function borrarIntento(env: Env, clave: string): Promise<void> {
  await env.PUENTE_DB.prepare('delete from intentos_acceso where clave = ?')
    .bind(clave)
    .run()
}

async function crearSesion(env: Env, userId: string): Promise<string> {
  const token = nuevoToken()
  const publicId = crypto.randomUUID().replace(/-/g, '')
  await env.PUENTE_DB.prepare(
    'insert into sesiones (token, public_id, user_id) values (?, ?, ?)',
  )
    .bind(token, publicId, userId)
    .run()
  return token
}

function nuevoCodigoRecuperacion(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LONGITUD_CODIGO))
  let codigo = ''
  for (const byte of bytes) codigo += ALFABETO_CODIGO[byte % ALFABETO_CODIGO.length]
  return codigo
}

/** Guarda el hash del código y devuelve el valor en claro una sola vez. */
async function guardarCodigoRecuperacion(
  env: Env,
  userId: string,
): Promise<string> {
  const codigo = nuevoCodigoRecuperacion()
  const hash = await hashContrasena(codigo)
  const expira = new Date(Date.now() + RECUPERACION_MS).toISOString()
  await env.PUENTE_DB.prepare(
    `insert into codigos_recuperacion (user_id, hash, fallos, creado_at, expires_at)
     values (?, ?, 0, ?, ?)
     on conflict(user_id) do update set
       hash = excluded.hash,
       fallos = 0,
       creado_at = excluded.creado_at,
       expires_at = excluded.expires_at`,
  )
    .bind(userId, hash, ahora(), expira)
    .run()
  return codigo
}

function tokenDe(request: Request): string | null {
  const autorizacion = request.headers.get('Authorization') ?? ''
  if (autorizacion.startsWith('Bearer ')) {
    return autorizacion.slice(7).trim() || null
  }
  return new URL(request.url).searchParams.get('sesion')
}

async function usuarioDe(request: Request, env: Env): Promise<UsuarioSesion | null> {
  const token = tokenDe(request)
  if (!token) return null
  const fila = await env.PUENTE_DB.prepare(
    `select s.token, s.public_id, s.user_id, u.email
       from sesiones s
       join users u on u.id = s.user_id
      where s.token = ? and s.expires_at > ?`,
  )
    .bind(token, ahora())
    .first<SesionFila>()
  if (!fila) return null
  return {
    id: fila.user_id,
    email: fila.email,
    token: fila.token,
    publicId: fila.public_id ?? '',
  }
}

function itemDe(envio: Envio): Record<string, unknown> {
  const base = {
    id: envio.id,
    user_id: envio.user_id,
    kind: envio.kind,
    content: envio.content,
    storage_path: envio.storage_path,
    file_name: envio.file_name,
    mime_type: envio.mime_type,
    size_bytes: envio.size_bytes,
    pinned: Boolean(envio.pinned),
    created_at: envio.created_at,
    expires_at: envio.expires_at,
  }
  return base
}

async function cuerpo(request: Request): Promise<Record<string, unknown>> {
  try {
    const dato: unknown = await request.json()
    return dato && typeof dato === 'object'
      ? (dato as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function nombreSeguro(nombre: string): string {
  const normalizado = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 96)
  return normalizado || 'archivo'
}

/** Borra caducados: primero el archivo y después el registro. */
async function limpiarCaducados(env: Env): Promise<number> {
  const corte = ahora()
  let eliminados = 0

  await env.PUENTE_DB.prepare('delete from intentos_acceso where ultima_at < ?')
    .bind(new Date(Date.now() - VENTANA_INTENTOS).toISOString())
    .run()

  await env.PUENTE_DB.prepare('delete from sesiones where expires_at < ?')
    .bind(corte)
    .run()

  await env.PUENTE_DB.prepare('delete from codigos_recuperacion where expires_at < ?')
    .bind(corte)
    .run()

  for (let ronda = 0; ronda < 10; ronda += 1) {
    const filas = await env.PUENTE_DB.prepare(
      `select id, storage_path from items
        where pinned = 0 and expires_at < ?
        order by expires_at asc limit 100`,
    )
      .bind(corte)
      .all<{ id: string; storage_path: string | null }>()

    if (filas.results.length === 0) break

    for (const fila of filas.results) {
      if (fila.storage_path) {
        // Si falla el borrado del archivo, conservamos el registro para reintentarlo.
        await env.PUENTE_ARCHIVOS.delete(fila.storage_path)
      }
      await env.PUENTE_DB.prepare(
        'delete from items where id = ? and pinned = 0',
      )
        .bind(fila.id)
        .run()
      eliminados += 1
    }

    if (filas.results.length < 100) break
  }

  return eliminados
}

function urlArchivo(id: string, token: string, descargar = false): string {
  const parametros = new URLSearchParams({ sesion: token })
  if (descargar) parametros.set('descarga', '1')
  return `/api/archivos/${encodeURIComponent(id)}?${parametros.toString()}`
}

async function manejarApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const ruta = url.pathname
  const metodo = request.method

  if (metodo === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CABECERAS_COMUNES })
  }

  // Registro de cuenta.
  if (ruta === '/api/registro' && metodo === 'POST') {
    const datos = await cuerpo(request)
    const email = String(datos.email ?? '').trim().toLowerCase()
    const password = String(datos.password ?? '')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fallo('Escribe un email válido.', 400)
    }
    if (password.length < 6) {
      return fallo('La contraseña debe tener al menos 6 caracteres.', 400)
    }

    const codigo = String(datos.codigo ?? '').trim()
    if (env.PUENTE_CODIGO_INVITACION && codigo !== env.PUENTE_CODIGO_INVITACION) {
      return fallo('El código de invitación no es correcto.', 403)
    }

    const previa = await env.PUENTE_DB.prepare('select id from users where email = ?')
      .bind(email)
      .first()
    if (previa) {
      return fallo('Ya existe una cuenta con ese email. Inicia sesión.', 409)
    }

    const id = crypto.randomUUID()
    const hash = await hashContrasena(password)
    await env.PUENTE_DB.prepare(
      'insert into users (id, email, password_hash) values (?, ?, ?)',
    )
      .bind(id, email, hash)
      .run()

    const token = await crearSesion(env, id)
    const codigoRecuperacion = await guardarCodigoRecuperacion(env, id)
    return json({ token, user: { id, email }, codigoRecuperacion }, 201)
  }

  // Inicio de sesión, con límite de intentos por correo y dirección IP.
  if (ruta === '/api/acceso' && metodo === 'POST') {
    const datos = await cuerpo(request)
    const email = String(datos.email ?? '').trim().toLowerCase()
    const password = String(datos.password ?? '')
    const clave = claveIntento(request, email)
    const intento = await consultarIntento(env, clave)
    if (intento && dentroDeLaVentana(intento) && intento.fallos >= INTENTOS_MAXIMOS) {
      return fallo('Demasiados intentos fallidos. Espera 15 minutos.', 429)
    }

    const cuenta = await env.PUENTE_DB.prepare(
      'select id, email, password_hash from users where email = ?',
    )
      .bind(email)
      .first<Cuenta>()
    if (!cuenta || !(await contrasenaValida(password, cuenta.password_hash))) {
      await registrarFallo(env, clave)
      return fallo('Email o contraseña incorrectos.', 401)
    }

    await borrarIntento(env, clave)
    const token = await crearSesion(env, cuenta.id)
    return json({ token, user: { id: cuenta.id, email: cuenta.email } })
  }

  // Cierre de sesión: se invalida el token en la base de datos.
  if (ruta === '/api/salir' && metodo === 'POST') {
    const token = tokenDe(request)
    if (token) {
      await env.PUENTE_DB.prepare('delete from sesiones where token = ?')
        .bind(token)
        .run()
    }
    return json({ ok: true })
  }

  // Restablecimiento: no exige sesión, pero sí un código vigente y sin agotar.
  if (ruta === '/api/recuperacion/restablecer' && metodo === 'POST') {
    const datos = await cuerpo(request)
    const email = String(datos.email ?? '').trim().toLowerCase()
    const codigo = String(datos.codigo ?? '').trim().toUpperCase()
    const password = String(datos.password ?? '')
    const errorCodigo = 'Código de recuperación incorrecto o caducado.'
    const errorIntentos =
      'Demasiados intentos. Genera un código nuevo desde una sesión activa.'
    const expirar = async (userId: string) => {
      await env.PUENTE_DB.prepare('delete from codigos_recuperacion where user_id = ?')
        .bind(userId)
        .run()
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fallo('Escribe un email válido.', 400)
    }
    if (password.length < 6) {
      return fallo('La contraseña debe tener al menos 6 caracteres.', 400)
    }
    if (!new RegExp(`^[${ALFABETO_CODIGO}]{${LONGITUD_CODIGO}}$`).test(codigo)) {
      return fallo(errorCodigo, 401)
    }

    const cuenta = await env.PUENTE_DB.prepare('select id, email from users where email = ?')
      .bind(email)
      .first<Cuenta>()
    if (!cuenta) return fallo(errorCodigo, 401)

    const fila = await env.PUENTE_DB.prepare(
      'select user_id, hash, fallos, expires_at from codigos_recuperacion where user_id = ?',
    )
      .bind(cuenta.id)
      .first<CodigoRecuperacion>()
    if (!fila) return fallo(errorCodigo, 401)

    if (fila.expires_at < ahora()) {
      await expirar(cuenta.id)
      return fallo(errorCodigo, 401)
    }
    if (fila.fallos >= RECUPERACION_MAX_FALLOS) {
      await expirar(cuenta.id)
      return fallo(errorIntentos, 429)
    }
    if (!(await contrasenaValida(codigo, fila.hash))) {
      const fallos = fila.fallos + 1
      if (fallos >= RECUPERACION_MAX_FALLOS) {
        await expirar(cuenta.id)
        return fallo(errorIntentos, 429)
      }
      await env.PUENTE_DB.prepare(
        'update codigos_recuperacion set fallos = ? where user_id = ?',
      )
        .bind(fallos, cuenta.id)
        .run()
      return fallo(errorCodigo, 401)
    }

    const hash = await hashContrasena(password)
    await env.PUENTE_DB.prepare('update users set password_hash = ? where id = ?')
      .bind(hash, cuenta.id)
      .run()
    await expirar(cuenta.id)
    // Cambiar la contraseña cierra todas las sesiones: ningún dispositivo
    // antiguo conserva acceso con la credencial anterior.
    await env.PUENTE_DB.prepare('delete from sesiones where user_id = ?')
      .bind(cuenta.id)
      .run()
    return json({ ok: true })
  }

  const usuario = await usuarioDe(request, env)
  if (!usuario) {
    return fallo('Tu sesión ha caducado. Vuelve a iniciar sesión.', 401)
  }

  if (ruta === '/api/sesion' && metodo === 'GET') {
    return json({ user: { id: usuario.id, email: usuario.email } })
  }

  // Solo una sesión válida puede generar un código de recuperación.
  if (ruta === '/api/recuperacion/codigo' && metodo === 'POST') {
    const codigo = await guardarCodigoRecuperacion(env, usuario.id)
    return json({ codigo })
  }

  // Sesiones activas: se identifican por un id público, nunca por el token.
  if (ruta === '/api/sesiones' && metodo === 'GET') {
    const filas = await env.PUENTE_DB.prepare(
      `select public_id, created_at, expires_at from sesiones
        where user_id = ? and expires_at > ? order by created_at desc`,
    )
      .bind(usuario.id, ahora())
      .all<{ public_id: string | null; created_at: string; expires_at: string }>()

    return json({
      sesiones: filas.results.map((fila) => ({
        id: fila.public_id ?? '',
        creada: fila.created_at,
        caduca: fila.expires_at,
        actual: fila.public_id === usuario.publicId,
      })),
    })
  }

  const coincideSesion = ruta.match(/^\/api\/sesiones\/([^/]+)$/)
  if (coincideSesion && metodo === 'DELETE') {
    const id = coincideSesion[1] ?? ''
    const fila = await env.PUENTE_DB.prepare(
      'select public_id from sesiones where public_id = ? and user_id = ?',
    )
      .bind(id, usuario.id)
      .first()
    if (!fila) return fallo('Sesión no encontrada.', 404)
    await env.PUENTE_DB.prepare('delete from sesiones where public_id = ? and user_id = ?')
      .bind(id, usuario.id)
      .run()
    return json({ ok: true })
  }

  // Bandeja.
  if (ruta === '/api/envios' && metodo === 'GET') {
    const filas = await env.PUENTE_DB.prepare(
      'select * from items where user_id = ? order by created_at desc',
    )
      .bind(usuario.id)
      .all<Envio>()

    const envios = filas.results.map((fila) => {
      const item = itemDe(fila)
      if (fila.kind === 'image' && fila.storage_path) {
        return { ...item, previewUrl: urlArchivo(fila.id, usuario.token) }
      }
      return item
    })
    return json({ items: envios })
  }

  if (ruta === '/api/envios' && metodo === 'POST') {
    const datos = await cuerpo(request)
    const kind = String(datos.kind ?? '')
    const content = typeof datos.content === 'string' ? datos.content : ''
    if (kind !== 'text' && kind !== 'link') {
      return fallo('Tipo de envío no válido.', 400)
    }
    if (!content.trim() || content.length > MAX_TEXTO) {
      return fallo('El texto debe tener entre 1 y 10000 caracteres.', 400)
    }
    if (kind === 'link' && !/^https?:\/\/\S+$/i.test(content)) {
      return fallo('Escribe un enlace http(s) válido.', 400)
    }

    const id = crypto.randomUUID()
    await env.PUENTE_DB.prepare(
      `insert into items (id, user_id, kind, content)
       values (?, ?, ?, ?)`,
    )
      .bind(id, usuario.id, kind, content)
      .run()

    const fila = await env.PUENTE_DB.prepare('select * from items where id = ?')
      .bind(id)
      .first<Envio>()
    return json(fila ? itemDe(fila) : null, 201)
  }

  const coincideEnvio = ruta.match(/^\/api\/envios\/([^/]+)$/)
  if (coincideEnvio) {
    const id = coincideEnvio[1] ?? ''
    const fila = await env.PUENTE_DB.prepare(
      'select * from items where id = ? and user_id = ?',
    )
      .bind(id, usuario.id)
      .first<Envio>()
    if (!fila) return fallo('Envío no encontrado.', 404)

    if (metodo === 'PATCH') {
      const datos = await cuerpo(request)
      const pinned = datos.pinned === true ? 1 : 0
      let expiresAt = fila.expires_at
      if (pinned !== fila.pinned) {
        // Al desfijar se conceden otras 24 horas; al fijar se conserva el plazo.
        expiresAt = pinned
          ? fila.expires_at
          : new Date(Date.now() + HORAS).toISOString()
      }
      await env.PUENTE_DB.prepare(
        'update items set pinned = ?, expires_at = ? where id = ? and user_id = ?',
      )
        .bind(pinned, expiresAt, id, usuario.id)
        .run()
      const actualizado = await env.PUENTE_DB.prepare(
        'select * from items where id = ?',
      )
        .bind(id)
        .first<Envio>()
      return json(actualizado ? itemDe(actualizado) : null)
    }

    if (metodo === 'DELETE') {
      if (fila.storage_path) {
        await env.PUENTE_ARCHIVOS.delete(fila.storage_path)
      }
      await env.PUENTE_DB.prepare('delete from items where id = ? and user_id = ?')
        .bind(id, usuario.id)
        .run()
      return json({ ok: true })
    }
  }

  // Subida de archivos. El cuerpo es el archivo en crudo para conservar el progreso XHR.
  if (ruta === '/api/subir' && metodo === 'POST') {
    const tamanoCabecera = Number(request.headers.get('content-length') ?? 0)
    if (tamanoCabecera > LIMITE_ARCHIVO) {
      return fallo('El archivo supera el límite de 20 MB.', 413)
    }

    const bytes = await request.arrayBuffer()
    if (bytes.byteLength === 0) return fallo('El archivo está vacío.', 400)
    if (bytes.byteLength > LIMITE_ARCHIVO) {
      return fallo('El archivo supera el límite de 20 MB.', 413)
    }

    let nombreOriginal = 'archivo'
    try {
      nombreOriginal = decodeURIComponent(
        request.headers.get('x-puente-nombre') ?? 'archivo',
      )
    } catch {
      nombreOriginal = 'archivo'
    }
    const tipo = request.headers.get('Content-Type') || 'application/octet-stream'
    const kind = tipo.startsWith('image/') ? 'image' : 'file'
    const clave = `${usuario.id}/${crypto.randomUUID()}-${nombreSeguro(nombreOriginal)}`
    const id = crypto.randomUUID()
    const expira = new Date(Date.now() + HORAS).toISOString()

    try {
      await env.PUENTE_ARCHIVOS.put(clave, bytes)
      await env.PUENTE_DB.prepare(
        `insert into items
           (id, user_id, kind, storage_path, file_name, mime_type, size_bytes, expires_at)
         values (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          id,
          usuario.id,
          kind,
          clave,
          nombreOriginal,
          tipo,
          bytes.byteLength,
          expira,
        )
        .run()
    } catch (error) {
      await env.PUENTE_ARCHIVOS.delete(clave).catch(() => undefined)
      const mensaje = error instanceof Error ? error.message : 'No se pudo guardar el archivo.'
      return fallo(mensaje, 500)
    }

    const fila = await env.PUENTE_DB.prepare('select * from items where id = ?')
      .bind(id)
      .first<Envio>()
    if (!fila) return fallo('No se pudo registrar el archivo.', 500)

    const item = itemDe(fila)
    if (kind === 'image') {
      return json({ ...item, previewUrl: urlArchivo(id, usuario.token) }, 201)
    }
    return json(item, 201)
  }

  // Descarga y vista previa de archivos.
  const coincideArchivo = ruta.match(/^\/api\/archivos\/([^/]+)$/)
  if (coincideArchivo && metodo === 'GET') {
    const id = coincideArchivo[1] ?? ''
    const fila = await env.PUENTE_DB.prepare(
      'select * from items where id = ? and user_id = ?',
    )
      .bind(id, usuario.id)
      .first<Envio>()
    if (!fila?.storage_path) return fallo('Archivo no encontrado.', 404)

    const bytes = await env.PUENTE_ARCHIVOS.get(fila.storage_path, {
      type: 'arrayBuffer',
    })
    if (!bytes) return fallo('El archivo ya no está disponible.', 404)

    const descargar = url.searchParams.get('descarga') === '1'
    const nombre = (fila.file_name ?? 'archivo').replace(/["\r\n]/g, '')
    const cabeceras = new Headers({
      ...CABECERAS_COMUNES,
      'Content-Type': fila.mime_type ?? 'application/octet-stream',
      'Content-Disposition': `${descargar ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      'Cache-Control': 'private, max-age=3600',
      'Referrer-Policy': 'no-referrer',
    })
    return new Response(bytes, { headers: cabeceras })
  }

  // Limpieza manual (la programada usa la misma función).
  if (ruta === '/api/limpieza' && metodo === 'POST') {
    const eliminados = await limpiarCaducados(env)
    return json({ eliminados })
  }

  return fallo('Ruta no encontrada.', 404)
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      try {
        return await manejarApi(request, env)
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'Error inesperado.'
        console.error('[puente-api]', mensaje)
        return fallo(mensaje, 500)
      }
    }
    if (env.PUENTE_STATIC) {
      const respuesta = await env.PUENTE_STATIC.fetch(request)
      return conCabecerasSeguras(respuesta)
    }
    return fallo('Interfaz no disponible.', 404)
  },

  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    const eliminados = await limpiarCaducados(env)
    console.log('[puente-api] limpieza programada:', eliminados)
  },
}
