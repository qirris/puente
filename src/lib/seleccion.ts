import { ErrorApi } from './api'
import type { InboxItem } from './types'

export function esSeleccionable(item: InboxItem, ahora = Date.now()): boolean {
  return (item.kind === 'image' || item.kind === 'file') && Boolean(item.storage_path) &&
    (item.pinned || !item.expires_at || Date.parse(item.expires_at) > ahora)
}

export function depurarSeleccion(ids: ReadonlySet<string>, items: InboxItem[], ahora: number): Set<string> {
  return new Set(items.filter((item) => ids.has(item.id) && esSeleccionable(item, ahora)).map((item) => item.id))
}

export async function eliminarSeleccion(
  items: InboxItem[],
  eliminar: (item: InboxItem) => Promise<void>,
  alEliminar: (id: string) => void,
  signal: AbortSignal,
) {
  const eliminados: string[] = []
  const fallidos: string[] = []
  let sesionCaducada = false
  for (const item of items) {
    if (signal.aborted) break
    try {
      await eliminar(item)
    } catch (error) {
      if (error instanceof ErrorApi && error.status === 401) {
        sesionCaducada = true
        break
      }
      if (!(error instanceof ErrorApi && error.status === 404)) {
        fallidos.push(item.id)
        continue
      }
      // Otro dispositivo o la limpieza ya retiró el envío.
    }
    eliminados.push(item.id)
    alEliminar(item.id)
  }
  return { eliminados, fallidos, sesionCaducada }
}
