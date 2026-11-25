import { describe, expect, it, vi } from 'vitest'
import { archivoEjemplo } from '../../tests/archivoEjemplo'
import { ErrorApi } from './api'
import { depurarSeleccion, eliminarSeleccion, esSeleccionable } from './seleccion'

describe('selección de fotos y archivos', () => {
  it('admite solo archivos disponibles y conserva los fijados', () => {
    expect(esSeleccionable(archivoEjemplo('foto'))).toBe(true)
    expect(esSeleccionable(archivoEjemplo('pdf', { kind: 'file' }))).toBe(true)
    expect(esSeleccionable(archivoEjemplo('nota', { kind: 'text' }))).toBe(false)
    expect(esSeleccionable(archivoEjemplo('enlace', { kind: 'link' }))).toBe(false)
    expect(esSeleccionable(archivoEjemplo('sin-archivo', { storage_path: null }))).toBe(false)
    expect(esSeleccionable(archivoEjemplo('caducada', { expires_at: '2020-01-01' }))).toBe(false)
    expect(esSeleccionable(archivoEjemplo('fijada', { pinned: true, expires_at: '2020-01-01' }))).toBe(true)
  })

  it('retira de la selección archivos ocultos, eliminados y caducados', () => {
    const ids = new Set(['visible', 'oculto', 'borrado', 'caducado'])
    expect([...depurarSeleccion(ids, [archivoEjemplo('visible'), archivoEjemplo('caducado', { expires_at: '2020-01-01' })], Date.now())]).toEqual(['visible'])
    expect(ids.size).toBe(4)
  })
})

describe('borrado conjunto', () => {
  it('borra en orden, continúa tras un fallo y retira los que ya no existen', async () => {
    const llamadas: string[] = []
    const borrados = vi.fn()
    const resultado = await eliminarSeleccion(['a', 'b', 'c', 'd'].map((id) => archivoEjemplo(id)), async (item) => {
      llamadas.push(item.id)
      if (item.id === 'b') throw new ErrorApi('Fallo', 500)
      if (item.id === 'c') throw new ErrorApi('No encontrado', 404)
    }, borrados, new AbortController().signal)
    expect(llamadas).toEqual(['a', 'b', 'c', 'd'])
    expect(resultado).toEqual({ eliminados: ['a', 'c', 'd'], fallidos: ['b'], sesionCaducada: false })
    expect(borrados.mock.calls.flat()).toEqual(['a', 'c', 'd'])
  })

  it('detiene el lote al caducar la sesión', async () => {
    const eliminar = vi.fn().mockRejectedValue(new ErrorApi('Sesión caducada', 401))
    const resultado = await eliminarSeleccion([archivoEjemplo('a'), archivoEjemplo('b')], eliminar, vi.fn(), new AbortController().signal)
    expect(eliminar).toHaveBeenCalledTimes(1)
    expect(resultado.sesionCaducada).toBe(true)
    expect(resultado.eliminados).toEqual([])
  })

  it('no inicia más borrados al desmontar la bandeja', async () => {
    const control = new AbortController()
    const eliminar = vi.fn(async () => { control.abort() })
    await eliminarSeleccion([archivoEjemplo('a'), archivoEjemplo('b')], eliminar, vi.fn(), control.signal)
    expect(eliminar).toHaveBeenCalledTimes(1)
  })
})
