// Puente · operaciones de la bandeja contra la API del Worker.

import { api } from './api'
import { config } from './config'
import { tokenActual } from './sesion'
import type { InboxItem, Item, ItemKind } from './types'
import { uploadWithProgress } from './upload'

function friendlyError(message: string): string {
  if (/sesión|token|no autorizado|unauthorized/i.test(message)) {
    return 'Tu sesión ha caducado. Vuelve a iniciar sesión.'
  }
  if (/failed to fetch|networkerror|load failed|conexión/i.test(message)) {
    return 'No se pudo conectar. Revisa tu conexión.'
  }
  return message
}

function urlArchivo(id: string, descargar = false): string {
  const parametros = new URLSearchParams({ sesion: tokenActual() ?? '' })
  if (descargar) parametros.set('descarga', '1')
  return `${config.apiUrl}/api/archivos/${encodeURIComponent(id)}?${parametros.toString()}`
}

export async function sweepExpired(): Promise<number> {
  try {
    const datos = await api<{ eliminados: number }>('/api/limpieza', {
      method: 'POST',
    })
    return datos.eliminados
  } catch {
    // La limpieza también la hace el Cron del Worker; aquí es best-effort.
    return 0
  }
}

export async function listItems(): Promise<InboxItem[]> {
  try {
    const datos = await api<{ items: InboxItem[] }>('/api/envios')
    return datos.items ?? []
  } catch (error) {
    throw new Error(friendlyError(error instanceof Error ? error.message : 'Error'))
  }
}

export interface NewText {
  kind: Extract<ItemKind, 'text' | 'link'>
  content: string
}

export async function sendText(payload: NewText): Promise<Item> {
  try {
    return await api<Item>('/api/envios', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch (error) {
    throw new Error(friendlyError(error instanceof Error ? error.message : 'Error'))
  }
}

export async function sendFile(
  file: File,
  onProgress: (percent: number) => void,
): Promise<Item> {
  try {
    return await uploadWithProgress({ file, onProgress })
  } catch (error) {
    throw new Error(friendlyError(error instanceof Error ? error.message : 'Error'))
  }
}

export async function setPinned(id: string, pinned: boolean): Promise<Item> {
  try {
    return await api<Item>(`/api/envios/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ pinned }),
    })
  } catch (error) {
    throw new Error(friendlyError(error instanceof Error ? error.message : 'Error'))
  }
}

export async function deleteItem(item: Item): Promise<void> {
  try {
    await api(`/api/envios/${encodeURIComponent(item.id)}`, { method: 'DELETE' })
  } catch (error) {
    throw new Error(friendlyError(error instanceof Error ? error.message : 'Error'))
  }
}

export async function getOpenUrl(item: Item): Promise<string> {
  if (!item.storage_path) throw new Error('Este envío no tiene archivo.')
  const conFicha = item as InboxItem
  return conFicha.previewUrl ?? urlArchivo(item.id)
}

export async function getDownloadUrl(item: Item): Promise<string> {
  if (!item.storage_path) throw new Error('Este envío no tiene archivo.')
  return urlArchivo(item.id, true)
}

export async function downloadItem(item: Item): Promise<void> {
  const url = await getDownloadUrl(item)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = item.file_name ?? 'archivo'
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}

/**
 * No hay Realtime en D1: se sondea la bandeja mientras la pestaña esté visible.
 * App.tsx ya hacía refresco por foco y cada minuto; esto lo hace más ágil.
 */
export function subscribeToInbox(onChange: () => void): () => void {
  const intervalo = window.setInterval(() => {
    if (document.visibilityState === 'visible') onChange()
  }, 10_000)

  return () => window.clearInterval(intervalo)
}
