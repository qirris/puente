import { config } from './config'
import { tokenActual } from './sesion'
import type { Item } from './types'

interface SubidaArgs {
  file: File
  onProgress: (percent: number) => void
  duracion: number
}

function readError(xhr: XMLHttpRequest): string {
  try {
    const body = JSON.parse(xhr.responseText) as {
      error?: string
      message?: string
    }
    const raw = body.error ?? body.message ?? ''
    if (raw) return raw
  } catch {
    // La respuesta no era JSON.
  }
  if (xhr.status === 0) return 'No se pudo conectar. Revisa tu conexión.'
  return `No se pudo subir el archivo (error ${xhr.status}).`
}

/**
 * Sube el archivo al Worker con progreso real. XHR porque fetch no expone
 * el progreso de subida. El Worker devuelve el envío ya registrado.
 */
export function uploadWithProgress({
  file,
  onProgress,
  duracion,
}: SubidaArgs): Promise<Item> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${config.apiUrl}/api/subir`)
    xhr.setRequestHeader('Authorization', `Bearer ${tokenActual() ?? ''}`)
    xhr.setRequestHeader('x-puente-nombre', encodeURIComponent(file.name))
    xhr.setRequestHeader('x-puente-duracion', String(duracion))
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      const percent = Math.min(99, Math.round((event.loaded / event.total) * 100))
      onProgress(percent)
    }

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(readError(xhr)))
        return
      }
      try {
        const item = JSON.parse(xhr.responseText) as Item
        onProgress(100)
        resolve(item)
      } catch {
        reject(new Error('El servidor devolvió una respuesta inesperada.'))
      }
    }
    xhr.onerror = () => reject(new Error('No se pudo conectar. Revisa tu conexión.'))
    xhr.onabort = () => reject(new Error('Subida cancelada.'))
    xhr.timeout = 120_000
    xhr.ontimeout = () =>
      reject(new Error('La subida tardó demasiado. Inténtalo de nuevo.'))
    xhr.send(file)
  })
}
