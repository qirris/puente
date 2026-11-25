import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { unzipSync } from 'fflate'
import { archivoEjemplo } from '../../tests/archivoEjemplo'
import { MAX_BYTES_ZIP, nombreEnZip, prepararZip } from './descargaZip'
import { borrarSesion, tokenActual } from './sesion'

vi.mock('./sesion', () => ({ tokenActual: vi.fn(() => 'sesion-de-prueba'), borrarSesion: vi.fn() }))
const opciones = () => ({ signal: new AbortController().signal, progreso: vi.fn() })

beforeEach(() => { vi.mocked(tokenActual).mockReturnValue('sesion-de-prueba') })
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('archivos ZIP', () => {
  it('conserva los originales y resuelve nombres duplicados, sin rutas ni tokens en el ZIP', async () => {
    const datos = [new Uint8Array([137, 80, 78, 71]), new Uint8Array([0, 255, 42]), new TextEncoder().encode('ideas con acentos: áéñ')]
    const fetchFalso = vi.fn()
    datos.forEach((contenido) => fetchFalso.mockResolvedValueOnce(new Response(contenido)))
    vi.stubGlobal('fetch', fetchFalso)
    const items = [archivoEjemplo('1', { file_name: 'Foto.png' }), archivoEjemplo('2', { file_name: 'foto.png' }), archivoEjemplo('3', { kind: 'file', file_name: 'ideas-áéñ.txt', mime_type: 'text/plain' })]
    const ajustes = opciones()
    const zip = await prepararZip(items, ajustes)
    const extraidos = unzipSync(new Uint8Array(await zip.arrayBuffer()))
    expect(Object.keys(extraidos)).toEqual(['Foto.png', 'foto (2).png', 'ideas-áéñ.txt'])
    Object.values(extraidos).forEach((contenido, indice) => expect(contenido).toEqual(datos[indice]))
    expect(ajustes.progreso.mock.calls).toEqual([[1, 3], [2, 3], [3, 3]])
    expect(fetchFalso.mock.calls[0][0]).toBe('/api/archivos/1')
    expect(fetchFalso.mock.calls[0][1]).toMatchObject({ cache: 'no-store', headers: { Authorization: 'Bearer sesion-de-prueba' } })
    expect(zip.type).toBe('application/zip')
  })

  it('genera un ZIP también con un solo archivo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('original')))
    const zip = await prepararZip([archivoEjemplo('solo')], opciones())
    expect(Object.keys(unzipSync(new Uint8Array(await zip.arrayBuffer())))).toEqual(['solo.png'])
  })

  it('rechaza una selección vacía o con notas', async () => {
    const peticion = vi.fn()
    vi.stubGlobal('fetch', peticion)
    await expect(prepararZip([], opciones())).rejects.toThrow('Selecciona')
    await expect(prepararZip([archivoEjemplo('nota', { kind: 'text' })], opciones())).rejects.toThrow('Selecciona')
    expect(peticion).not.toHaveBeenCalled()
  })

  it('rechaza más de 100 MB antes de pedir los archivos', async () => {
    const peticion = vi.fn()
    vi.stubGlobal('fetch', peticion)
    await expect(prepararZip([archivoEjemplo('grande', { size_bytes: MAX_BYTES_ZIP + 1 })], opciones())).rejects.toThrow('100 MB')
    expect(peticion).not.toHaveBeenCalled()
  })

  it('comprueba también el tamaño de la respuesta, aunque los metadatos indiquen menos', async () => {
    const cancelar = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ReadableStream({ cancel: cancelar }), { headers: { 'Content-Length': String(MAX_BYTES_ZIP + 1) } })))
    await expect(prepararZip([archivoEjemplo('grande')], opciones())).rejects.toThrow('100 MB')
    expect(cancelar).toHaveBeenCalledOnce()
  })

  it('limita los bytes reales de un flujo sin Content-Length y libera el lector', async () => {
    const cancelar = vi.fn()
    const trozo = new Uint8Array(1024 * 1024)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ReadableStream({
      pull(control) { control.enqueue(trozo) }, cancel: cancelar,
    }))))
    await expect(prepararZip([archivoEjemplo('grande', { size_bytes: null })], opciones())).rejects.toThrow('100 MB')
    expect(cancelar).toHaveBeenCalledOnce()
  })

  it('no devuelve un ZIP parcial si falla el segundo archivo', async () => {
    const peticion = vi.fn().mockResolvedValueOnce(new Response('uno')).mockResolvedValueOnce(new Response('No encontrado', { status: 404 }))
    vi.stubGlobal('fetch', peticion)
    await expect(prepararZip([archivoEjemplo('a'), archivoEjemplo('b'), archivoEjemplo('c')], opciones())).rejects.toThrow('No se ha creado el ZIP')
    expect(peticion).toHaveBeenCalledTimes(2)
  })

  it('detiene la descarga si caduca la sesión y no solicita el siguiente archivo', async () => {
    const peticion = vi.fn().mockResolvedValue(new Response('', { status: 401 }))
    vi.stubGlobal('fetch', peticion)
    await expect(prepararZip([archivoEjemplo('a'), archivoEjemplo('b')], opciones())).rejects.toThrow('sesión ha caducado')
    expect(borrarSesion).toHaveBeenCalledOnce()
    expect(peticion).toHaveBeenCalledTimes(1)
  })

  it('informa de desconexión sin exponer la URL privada', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(prepararZip([archivoEjemplo('a')], opciones())).rejects.toThrow('Revisa tu conexión')
  })

  it('permite cancelar antes de empezar o entre archivos sin generar el ZIP', async () => {
    const control = new AbortController()
    const peticion = vi.fn().mockResolvedValue(new Response('uno'))
    vi.stubGlobal('fetch', peticion)
    control.abort()
    await expect(prepararZip([archivoEjemplo('a')], { signal: control.signal, progreso: vi.fn() })).rejects.toMatchObject({ name: 'AbortError' })
    expect(peticion).not.toHaveBeenCalled()
    const segundoControl = new AbortController()
    await expect(prepararZip([archivoEjemplo('a'), archivoEjemplo('b')], {
      signal: segundoControl.signal, progreso(actual) { if (actual === 2) segundoControl.abort() },
    })).rejects.toMatchObject({ name: 'AbortError' })
    expect(peticion).toHaveBeenCalledTimes(1)
  })

  it('cancela una lectura pendiente y libera sus recursos', async () => {
    const control = new AbortController()
    const cancelar = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ReadableStream({ cancel: cancelar }))))
    const descarga = prepararZip([archivoEjemplo('lenta')], { signal: control.signal, progreso: vi.fn() })
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce())
    control.abort()
    await expect(descarga).rejects.toMatchObject({ name: 'AbortError' })
    expect(cancelar).toHaveBeenCalledOnce()
  })

  it('sanea rutas, nombres reservados y colisiones con sufijos existentes', () => {
    const usados = new Set<string>()
    const nombres = ['../foto.png', '..\\foto.png', 'CON.txt', 'foto (2).png', 'foto.png', 'FOTO.png', '...', 'áéñ.txt'].map((nombre) => nombreEnZip(nombre, usados))
    expect(nombres).toEqual(['.._foto.png', '.._foto (2).png', '_CON.txt', 'foto (2).png', 'foto.png', 'FOTO (3).png', 'archivo', 'áéñ.txt'])
    expect(nombres.every((nombre) => !/[\\/]/.test(nombre))).toBe(true)
  })
})
