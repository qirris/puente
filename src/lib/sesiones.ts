// Puente · consulta y cierre de sesiones activas.
// El Worker solo devuelve identificadores públicos: aquí nunca hay tokens.

import { api } from './api'
import type { SesionActiva } from './types'

export async function listarSesiones(): Promise<SesionActiva[]> {
  const datos = await api<{ sesiones: SesionActiva[] }>('/api/sesiones')
  return datos.sesiones
}

export async function cerrarSesionActiva(id: string): Promise<void> {
  await api(`/api/sesiones/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
