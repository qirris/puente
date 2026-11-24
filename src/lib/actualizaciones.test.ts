import { describe, expect, it, vi } from 'vitest'
import { observarActualizaciones } from './actualizaciones'

function preparar(controlada = true) {
  const contenedor = Object.assign(new EventTarget(), {
    controller: controlada ? {} : null,
  })
  const registro = Object.assign(new EventTarget(), {
    waiting: null as { postMessage: ReturnType<typeof vi.fn> } | null,
    installing: new EventTarget(),
  })
  const avisar = vi.fn()
  const recargar = vi.fn()
  const aplicar = observarActualizaciones(
    registro as unknown as ServiceWorkerRegistration,
    contenedor as unknown as ServiceWorkerContainer,
    avisar,
    recargar,
  )
  return { registro, contenedor, avisar, recargar, aplicar }
}

describe('actualizaciones de la aplicación', () => {
  it('no anuncia la primera instalación ni recarga automáticamente', () => {
    const { registro, contenedor, avisar, recargar } = preparar(false)
    registro.waiting = { postMessage: vi.fn() }
    registro.installing.dispatchEvent(new Event('statechange'))
    contenedor.controller = {}
    contenedor.dispatchEvent(new Event('controllerchange'))
    expect(avisar).not.toHaveBeenCalled()
    expect(recargar).not.toHaveBeenCalled()
  })

  it('anuncia una actualización instalada y espera la acción del usuario', () => {
    const { registro, avisar, recargar, aplicar, contenedor } = preparar()
    const postMessage = vi.fn()
    registro.waiting = { postMessage }
    registro.installing.dispatchEvent(new Event('statechange'))
    expect(avisar).toHaveBeenCalledOnce()
    expect(postMessage).not.toHaveBeenCalled()
    expect(recargar).not.toHaveBeenCalled()
    aplicar()
    expect(postMessage).toHaveBeenCalledWith({ tipo: 'ACTUALIZAR' })
    expect(recargar).not.toHaveBeenCalled()
    contenedor.dispatchEvent(new Event('controllerchange'))
    expect(recargar).toHaveBeenCalledOnce()
  })

  it('detecta una versión que ya esperaba al abrir la aplicación', () => {
    const registro = Object.assign(new EventTarget(), { waiting: {}, installing: null })
    const contenedor = Object.assign(new EventTarget(), { controller: {} })
    const avisar = vi.fn()
    observarActualizaciones(registro as unknown as ServiceWorkerRegistration,
      contenedor as unknown as ServiceWorkerContainer, avisar, vi.fn())
    expect(avisar).toHaveBeenCalledOnce()
  })

  it('permite recargar si otra pestaña ya activó la actualización', () => {
    const { contenedor, avisar, recargar, aplicar } = preparar()
    contenedor.dispatchEvent(new Event('controllerchange'))
    expect(avisar).toHaveBeenCalledOnce()
    expect(recargar).not.toHaveBeenCalled()
    aplicar()
    expect(recargar).toHaveBeenCalledOnce()
  })
})
