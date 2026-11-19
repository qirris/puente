// Puente · autenticación contra la API del Worker.

import { api } from './api'
import { borrarSesion, guardarSesion, leerSesion, tokenActual } from './sesion'
import type { Sesion } from './types'

type RespuestaAcceso = { token: string; user: Sesion['user'] }
type RespuestaRegistro = RespuestaAcceso & { codigoRecuperacion: string }

function aSesion(datos: RespuestaAcceso): Sesion {
  return { token: datos.token, user: datos.user }
}

export async function iniciarSesion(
  email: string,
  password: string,
): Promise<Sesion> {
  const datos = await api<RespuestaAcceso>('/api/acceso', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  const sesion = aSesion(datos)
  guardarSesion(sesion)
  return sesion
}

export async function registrar(
  email: string,
  password: string,
  codigo: string = '',
): Promise<{ sesion: Sesion; codigoRecuperacion: string }> {
  const datos = await api<RespuestaRegistro>('/api/registro', {
    method: 'POST',
    body: JSON.stringify({ email, password, codigo }),
  })
  const sesion = aSesion(datos)
  guardarSesion(sesion)
  return { sesion, codigoRecuperacion: datos.codigoRecuperacion }
}

/** Genera un código nuevo desde una sesión activa e invalida el anterior. */
export async function generarCodigoRecuperacion(): Promise<string> {
  const datos = await api<{ codigo: string }>('/api/recuperacion/codigo', {
    method: 'POST',
  })
  return datos.codigo
}

export async function restablecerContrasena(
  email: string,
  codigo: string,
  password: string,
): Promise<void> {
  await api('/api/recuperacion/restablecer', {
    method: 'POST',
    body: JSON.stringify({ email, codigo, password }),
  })
}

export async function cerrarSesion(): Promise<void> {
  const token = tokenActual()
  if (token) {
    await api('/api/salir', { method: 'POST' }).catch(() => undefined)
  }
  borrarSesion()
}

export function sesionActual(): Sesion | null {
  return leerSesion()
}
