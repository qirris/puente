// Puente · base de datos y almacenamiento falsos para las pruebas del Worker.
// Usa node:sqlite de Node 24 y aplica las mismas migraciones que producción.

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'

const MIGRACIONES = [
  '0001_init.sql',
  '0002_sesiones.sql',
  '0003_intentos_acceso.sql',
]

export function crearBase(): DatabaseSync {
  const base = new DatabaseSync(':memory:')
  const carpeta = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'migrations',
  )
  for (const nombre of MIGRACIONES) {
    base.exec(readFileSync(join(carpeta, nombre), 'utf8'))
  }
  return base
}

interface ResultadoFalso<T> {
  results: T[]
  success: boolean
}

/** Implementa solo la parte de la API de D1 que usa el Worker. */
export function d1Falso(base: DatabaseSync) {
  const convertir = (valor: unknown): SQLInputValue => {
    if (typeof valor === 'boolean') return valor ? 1 : 0
    if (valor === null || valor === undefined) return null
    if (typeof valor === 'string' || typeof valor === 'number') return valor
    if (typeof valor === 'bigint') return valor
    if (valor instanceof Uint8Array) return valor
    return String(valor)
  }

  return {
    prepare(sql: string) {
      const sentencia = base.prepare(sql)
      const crear = (parametros: unknown[]) => ({
        first<T>(): Promise<T | null> {
          const fila = sentencia.get(...parametros.map(convertir)) as T | undefined
          return Promise.resolve(fila ?? null)
        },
        all<T>(): Promise<ResultadoFalso<T>> {
          const filas = sentencia.all(...parametros.map(convertir)) as T[]
          return Promise.resolve({ results: filas, success: true })
        },
        run(): Promise<ResultadoFalso<unknown>> {
          sentencia.run(...parametros.map(convertir))
          return Promise.resolve({ results: [], success: true })
        },
        bind(...valores: unknown[]) {
          return crear(parametros.concat(valores))
        },
      })
      return crear([])
    },
  }
}

export function kvFalso() {
  const archivos = new Map<string, ArrayBuffer>()

  const aArrayBuffer = (valor: ArrayBuffer | Uint8Array | string): ArrayBuffer => {
    if (valor instanceof ArrayBuffer) return valor
    if (typeof valor === 'string') return new TextEncoder().encode(valor).buffer
    return valor.buffer.slice(
      valor.byteOffset,
      valor.byteOffset + valor.byteLength,
    ) as ArrayBuffer
  }

  return {
    archivos,
    async put(clave: string, valor: ArrayBuffer | Uint8Array | string) {
      archivos.set(clave, aArrayBuffer(valor))
    },
    async get(clave: string, _opciones: { type: 'arrayBuffer' }) {
      return archivos.get(clave) ?? null
    },
    async delete(clave: string) {
      archivos.delete(clave)
    },
  }
}

export function entornoFalso(codigoInvitacion?: string) {
  const base = crearBase()
  const archivos = kvFalso()
  const env = {
    PUENTE_DB: d1Falso(base),
    PUENTE_ARCHIVOS: archivos,
    PUENTE_STATIC: {
      async fetch() {
        return new Response('<!doctype html><html><body>Puente</body></html>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      },
    },
    ...(codigoInvitacion ? { PUENTE_CODIGO_INVITACION: codigoInvitacion } : {}),
  }
  return { base, archivos, env }
}
