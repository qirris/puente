// Puente · sesión persistente en el navegador.
// El token lo emite el Worker y se guarda solo en localStorage.

import type { Sesion } from './types'

const CLAVE = 'puente.sesion'
export const EVENTO_SESION = 'puente:sesion'

let enMemoria: Sesion | null = null

function esSesion(valor: unknown): valor is Sesion {
  if (!valor || typeof valor !== 'object') return false
  const candidato = valor as { token?: unknown; user?: unknown }
  if (typeof candidato.token !== 'string' || !candidato.token) return false
  const usuario = candidato.user
  if (!usuario || typeof usuario !== 'object') return false
  const cuenta = usuario as { id?: unknown; email?: unknown }
  return typeof cuenta.id === 'string' && typeof cuenta.email === 'string'
}

export function leerSesion(): Sesion | null {
  if (enMemoria) return enMemoria
  try {
    const texto = localStorage.getItem(CLAVE)
    if (!texto) return null
    const dato: unknown = JSON.parse(texto)
    if (!esSesion(dato)) return null
    enMemoria = dato
    return dato
  } catch {
    return null
  }
}

export function guardarSesion(sesion: Sesion): void {
  enMemoria = sesion
  try {
    localStorage.setItem(CLAVE, JSON.stringify(sesion))
  } catch {
    // Si el almacenamiento está bloqueado, la sesión vive mientras dure la pestaña.
  }
  window.dispatchEvent(new Event(EVENTO_SESION))
}

export function borrarSesion(): void {
  enMemoria = null
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // Nada que limpiar.
  }
  window.dispatchEvent(new Event(EVENTO_SESION))
}

export function tokenActual(): string | null {
  return leerSesion()?.token ?? null
}
