import { Zip, ZipPassThrough } from 'fflate'
import { ErrorApi } from './api'
import { config } from './config'
import { borrarSesion, tokenActual } from './sesion'
import { esSeleccionable } from './seleccion'
import type { InboxItem } from './types'

export const MAX_BYTES_ZIP = 100 * 1024 * 1024
const MENSAJE_LIMITE = 'La selección supera los 100 MB por ZIP. Selecciona menos archivos.'

/** El ZIP contiene nombres planos, nunca rutas, y no sobrescribe duplicados. */
export function nombreEnZip(original: string | null, usados: Set<string>): string {
  let nombre = (original ?? '').normalize('NFC').replace(/[\\/<>:"|?*\x00-\x1f\x7f]/g, '_').trim().replace(/[. ]+$/g, '')
  if (!nombre || /^\.+$/.test(nombre)) nombre = 'archivo'
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(nombre)) nombre = `_${nombre}`
  // Deja margen para el sufijo dentro de los límites habituales del sistema de archivos.
  const punto = nombre.lastIndexOf('.')
  const extension = punto > 0 ? nombre.slice(punto).slice(0, 24) : ''
  const base = (punto > 0 ? nombre.slice(0, punto) : nombre).slice(0, 160)
  let candidato = `${base}${extension}`
  let numero = 2
  while (usados.has(candidato.toLocaleLowerCase('es'))) candidato = `${base} (${numero++})${extension}`
  usados.add(candidato.toLocaleLowerCase('es'))
  return candidato
}

export interface OpcionesZip {
  signal: AbortSignal
  progreso: (actual: number, total: number) => void
}

export async function prepararZip(items: InboxItem[], { signal, progreso }: OpcionesZip): Promise<Blob> {
  signal.throwIfAborted()
  if (!items.length || items.some((item) => !esSeleccionable(item))) {
    throw new Error('Selecciona fotos o archivos disponibles para descargar.')
  }
  if (items.reduce((suma, item) => suma + Math.max(0, item.size_bytes ?? 0), 0) > MAX_BYTES_ZIP) {
    throw new Error(MENSAJE_LIMITE)
  }
  const token = tokenActual()
  if (!token) throw new ErrorApi('Tu sesión ha caducado. Vuelve a iniciar sesión.', 401)
  const partes: Uint8Array<ArrayBuffer>[] = []
  const usados = new Set<string>()
  let errorZip: Error | undefined
  let terminado = false
  let bytes = 0
  const zip = new Zip((error, datos, final) => {
    if (error) errorZip = error
    else {
      partes.push(new Uint8Array(datos))
      terminado = final
    }
  })
  try {
    for (const [indice, item] of items.entries()) {
      signal.throwIfAborted()
      progreso(indice + 1, items.length)
      signal.throwIfAborted()
      let respuesta: Response
      try {
        respuesta = await fetch(`${config.apiUrl}/api/archivos/${encodeURIComponent(item.id)}`, {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal,
        })
      } catch (error) {
        if (signal.aborted) throw error
        throw new Error('No se pudo conectar. Revisa tu conexión y vuelve a descargar la selección.')
      }
      if (!respuesta.ok) {
        await respuesta.body?.cancel()
        if (respuesta.status === 401) {
          // No borres una sesión nueva si el usuario cambió de cuenta durante la descarga.
          if (tokenActual() === token) borrarSesion()
          throw new ErrorApi('Tu sesión ha caducado. Vuelve a iniciar sesión.', 401)
        }
        throw new Error(`No se pudo descargar «${item.file_name ?? 'archivo'}» (${respuesta.status}). No se ha creado el ZIP; vuelve a intentarlo.`)
      }
      if (!respuesta.body) throw new Error('El servidor no devolvió el archivo. Vuelve a intentarlo.')
      const lector = respuesta.body.getReader()
      const cancelarLectura = () => { void lector.cancel().catch(() => {}) }
      signal.addEventListener('abort', cancelarLectura, { once: true })
      const entrada = new ZipPassThrough(nombreEnZip(item.file_name, usados))
      try {
        const longitud = Number(respuesta.headers.get('Content-Length'))
        if (Number.isFinite(longitud) && bytes + longitud > MAX_BYTES_ZIP) throw new Error(MENSAJE_LIMITE)
        zip.add(entrada)
        while (true) {
          signal.throwIfAborted()
          const { done, value } = await lector.read().catch(() => {
            signal.throwIfAborted()
            throw new Error('Se interrumpió la descarga de un archivo. Revisa tu conexión y vuelve a intentarlo.')
          })
          signal.throwIfAborted()
          if (done) break
          bytes += value.byteLength
          if (bytes > MAX_BYTES_ZIP) throw new Error(MENSAJE_LIMITE)
          entrada.push(value)
          if (errorZip) throw errorZip
        }
        entrada.push(new Uint8Array(), true)
      } finally {
        signal.removeEventListener('abort', cancelarLectura)
        await lector.cancel().catch(() => {})
        lector.releaseLock()
      }
    }
    zip.end()
    if (errorZip) throw errorZip
    signal.throwIfAborted()
    if (!terminado) throw new Error('No se pudo terminar el ZIP. Vuelve a intentarlo.')
    return new Blob(partes, { type: 'application/zip' })
  } finally {
    zip.terminate()
    partes.length = 0
  }
}

/** El mensaje de éxito indica inicio de descarga, no que el navegador haya guardado el archivo. */
export function guardarZip(blob: Blob): void {
  const fecha = new Date()
  const dia = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  try {
    enlace.href = url
    enlace.download = `puente-seleccion-${dia}.zip`
    document.body.append(enlace)
    enlace.click()
  } finally {
    enlace.remove()
    // Da tiempo a Safari para iniciar la lectura de la URL antes de liberarla.
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }
}
