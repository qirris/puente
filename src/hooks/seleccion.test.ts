// @vitest-environment happy-dom
import { act, createElement, StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { archivoEjemplo } from '../../tests/archivoEjemplo'
import { ErrorApi } from '../lib/api'
import { prepararZip, guardarZip } from '../lib/descargaZip'
import { deleteItem, listItems, sweepExpired } from '../lib/inbox'
import { useInbox } from './useInbox'
import { useSeleccion } from './useSeleccion'
import { ConfirmarBorrado } from '../components/BarraSeleccion'

vi.mock('../lib/descargaZip', () => ({ prepararZip: vi.fn(), guardarZip: vi.fn() }))
vi.mock('../lib/inbox', () => ({ deleteItem: vi.fn(), listItems: vi.fn(), sweepExpired: vi.fn() }))

let root: Root
let host: HTMLDivElement
let seleccion: ReturnType<typeof useSeleccion>
let bandeja: ReturnType<typeof useInbox>
type Props = Parameters<typeof useSeleccion>[0]
let props: Props
function SeleccionPrueba(opciones: Props) { seleccion = useSeleccion(opciones); return null }
function BandejaPrueba() { bandeja = useInbox('demo'); return null }
async function mostrar(cambios: Partial<Props> = {}) {
  props = { ...props, ...cambios }
  await act(async () => { root.render(createElement(SeleccionPrueba, props)) })
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  props = { visibles: [archivoEjemplo('a'), archivoEjemplo('b'), archivoEjemplo('nota', { kind: 'text' })], criterio: 'todos', ahora: Date.now(), alEliminar: vi.fn(), notify: vi.fn() }
  vi.mocked(deleteItem).mockResolvedValue()
  vi.mocked(sweepExpired).mockResolvedValue(0)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

describe('interacción de la selección en React', () => {
  it('mantiene la confirmación abierta en StrictMode y no la cancela al montar', async () => {
    const cancelar = vi.fn()
    const confirmar = vi.fn()
    await act(async () => root.render(createElement(StrictMode, null,
      createElement(ConfirmarBorrado, { cantidad: 2, cancelar, confirmar }))))
    expect(host.querySelector('dialog')?.open).toBe(true)
    expect(cancelar).not.toHaveBeenCalled()
    expect(confirmar).not.toHaveBeenCalled()
    await act(async () => host.querySelector('dialog')?.dispatchEvent(new Event('cancel')))
    expect(cancelar).toHaveBeenCalledOnce()
  })
  it('selecciona solo los archivos visibles y limpia al cambiar de filtro', async () => {
    await mostrar()
    await act(async () => { seleccion.iniciar(); seleccion.seleccionarVisibles() })
    expect([...seleccion.ids]).toEqual(['a', 'b'])
    await mostrar({ criterio: 'fotos' })
    expect(seleccion.ids.size).toBe(0)
    await act(async () => seleccion.alternar('a'))
    expect([...seleccion.ids]).toEqual(['a'])
    await mostrar({ criterio: 'busqueda:a', visibles: [archivoEjemplo('a')] })
    expect(seleccion.ids.size).toBe(0)
  })

  it('retira archivos borrados o caducados y permite cancelar la selección', async () => {
    await mostrar()
    await act(async () => { seleccion.iniciar(); seleccion.seleccionarVisibles() })
    await mostrar({ visibles: [archivoEjemplo('a', { expires_at: '2020-01-01' })] })
    expect(seleccion.ids.size).toBe(0)
    await act(async () => seleccion.cancelarSeleccion())
    expect(seleccion.modo).toBe(false)
  })

  it('no borra sin confirmación y cancelar la confirmación no envía peticiones', async () => {
    await mostrar()
    await act(async () => seleccion.seleccionarVisibles())
    await act(async () => seleccion.eliminar())
    expect(deleteItem).not.toHaveBeenCalled()
    await act(async () => seleccion.pedirConfirmacion())
    expect(seleccion.confirmando).toBe(true)
    await act(async () => seleccion.cerrarConfirmacion())
    expect(seleccion.ids.size).toBe(2)
    expect(deleteItem).not.toHaveBeenCalled()
  })

  it('tras un borrado parcial solo quedan seleccionados los fallidos', async () => {
    vi.mocked(deleteItem).mockImplementation(async (item) => { if (item.id === 'b') throw new ErrorApi('Fallo', 500) })
    await mostrar()
    await act(async () => seleccion.seleccionarVisibles())
    await act(async () => seleccion.pedirConfirmacion())
    await act(async () => seleccion.eliminar())
    expect([...seleccion.ids]).toEqual(['b'])
    expect(props.alEliminar).toHaveBeenCalledExactlyOnceWith('a')
    expect(props.notify).toHaveBeenCalledWith(expect.stringContaining('1 no se pudieron eliminar'), 'error')
  })

  it('bloquea cambios durante el ZIP y mantiene la selección al fallar', async () => {
    let rechazar!: (error: Error) => void
    vi.mocked(prepararZip).mockReturnValue(new Promise((_, reject) => { rechazar = reject }))
    await mostrar()
    await act(async () => seleccion.alternar('a'))
    let pendiente!: Promise<void>
    await act(async () => { pendiente = seleccion.descargar() })
    expect(seleccion.bloqueado).toBe(true)
    await act(async () => { seleccion.alternar('b'); seleccion.cancelarSeleccion(); seleccion.seleccionarVisibles() })
    expect([...seleccion.ids]).toEqual(['a'])
    await act(async () => { rechazar(new Error('No disponible')); await pendiente })
    expect(seleccion.operacion).toBeNull()
    expect([...seleccion.ids]).toEqual(['a'])
    expect(guardarZip).not.toHaveBeenCalled()
  })

  it('permite cancelar el ZIP y aborta al desmontar la bandeja', async () => {
    let signal!: AbortSignal
    vi.mocked(prepararZip).mockImplementation((_, opciones) => {
      signal = opciones.signal
      return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))
    })
    await mostrar()
    await act(async () => seleccion.alternar('a'))
    let pendiente!: Promise<void>
    await act(async () => { pendiente = seleccion.descargar() })
    await act(async () => { seleccion.cancelarDescarga(); await pendiente })
    expect(signal.aborted).toBe(true)
    expect([...seleccion.ids]).toEqual(['a'])
    expect(guardarZip).not.toHaveBeenCalled()
    await act(async () => { pendiente = seleccion.descargar() })
    await act(async () => { root.render(null) })
    await pendiente
    expect(signal.aborted).toBe(true)
  })
})

describe('sondeo concurrente de la bandeja', () => {
  it('una respuesta antigua no resucita un archivo borrado y se vuelve a consultar', async () => {
    const archivo = archivoEjemplo('a')
    let resolverAntigua!: (items: typeof props.visibles) => void
    let resolverNueva!: (items: typeof props.visibles) => void
    vi.mocked(listItems).mockResolvedValueOnce([archivo])
      .mockImplementationOnce(() => new Promise((resolve) => { resolverAntigua = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolverNueva = resolve }))
    await act(async () => root.render(createElement(BandejaPrueba)))
    expect(bandeja.items).toHaveLength(1)
    let refresco!: Promise<void>
    await act(async () => { refresco = bandeja.refreshSilent() })
    await act(async () => bandeja.removeItem('a'))
    await act(async () => { resolverAntigua([archivo]); await refresco })
    expect(bandeja.items).toEqual([])
    expect(listItems).toHaveBeenCalledTimes(3)
    await act(async () => resolverNueva([]))
    expect(bandeja.items).toEqual([])
  })
})
