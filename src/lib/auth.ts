// Puente · autenticación contra la API del Worker.

import { api } from './api'
import { borrarSesion, guardarSesion, leerSesion, tokenActual } from './sesion'
import type { Sesion } from './types'

type RespuestaAcceso = { token: string; user: Sesion['user'] }

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
): Promise<Sesion> {
  const datos = await api<RespuestaAcceso>('/api/registro', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  const sesion = aSesion(datos)
  guardarSesion(sesion)
  return sesion
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
