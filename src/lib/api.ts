// Puente · cliente HTTP hacia la API del Worker.

import { config } from './config'
import { borrarSesion, tokenActual } from './sesion'

export class ErrorApi extends Error {
  readonly status: number

  constructor(mensaje: string, status: number) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.status = status
  }
}

export async function api<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const cabeceras = new Headers(init.headers)
  const token = tokenActual()

  if (
    init.body &&
    typeof init.body === 'string' &&
    !cabeceras.has('Content-Type')
  ) {
    cabeceras.set('Content-Type', 'application/json')
  }
  if (token) cabeceras.set('Authorization', `Bearer ${token}`)

  let respuesta: Response
  try {
    respuesta = await fetch(`${config.apiUrl}${ruta}`, { ...init, headers: cabeceras })
  } catch {
    throw new ErrorApi('No se pudo conectar. Revisa tu conexión.', 0)
  }

  if (respuesta.status === 401 && ruta !== '/api/acceso') {
    // El token ya no sirve: se limpia y se avisa a la interfaz.
    borrarSesion()
  }

  const texto = await respuesta.text()
  let dato: unknown = null
  if (texto) {
    try {
      dato = JSON.parse(texto) as unknown
    } catch {
      dato = null
    }
  }

  if (!respuesta.ok) {
    const mensaje =
      dato && typeof dato === 'object' && 'error' in dato
        ? String((dato as { error: unknown }).error)
        : `No se pudo completar la operación (error ${respuesta.status}).`
    throw new ErrorApi(mensaje, respuesta.status)
  }

  return dato as T
}
