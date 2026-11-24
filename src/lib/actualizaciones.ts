export function observarActualizaciones(
  registro: ServiceWorkerRegistration,
  contenedor: ServiceWorkerContainer,
  avisar: () => void,
  recargar: () => void,
) {
  let solicitada = false
  let controlada = Boolean(contenedor.controller)
  const avisarSiPendiente = () => {
    if (registro.waiting && contenedor.controller) avisar()
  }
  const vigilarInstalacion = () => {
    registro.installing?.addEventListener('statechange', avisarSiPendiente)
  }
  const cambiarControlador = () => {
    if (solicitada) recargar()
    else if (controlada) avisar()
    controlada = true
  }
  registro.addEventListener('updatefound', vigilarInstalacion)
  contenedor.addEventListener('controllerchange', cambiarControlador)
  vigilarInstalacion()
  avisarSiPendiente()

  return () => {
    solicitada = true
    if (registro.waiting) registro.waiting.postMessage({ tipo: 'ACTUALIZAR' })
    else recargar()
  }
}

let pendiente = false
let aplicar: (() => void) | undefined
const oyentes = new Set<() => void>()

export const hayActualizacion = () => pendiente
export const suscribirActualizaciones = (oyente: () => void) => {
  oyentes.add(oyente)
  return () => { oyentes.delete(oyente) }
}
export const aplicarActualizacion = () => aplicar?.()

export async function iniciarActualizaciones() {
  if (!('serviceWorker' in navigator)) return
  try {
    const contenedor = navigator.serviceWorker
    const registro = await contenedor.register('/sw.js', { updateViaCache: 'none' })
    aplicar = observarActualizaciones(registro, contenedor, () => {
      pendiente = true
      oyentes.forEach((oyente) => oyente())
    }, () => window.location.reload())
    const comprobar = () => {
      if (navigator.onLine && document.visibilityState === 'visible') {
        void registro.update().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', comprobar)
    window.addEventListener('online', comprobar)
    window.setInterval(comprobar, 60_000)
    comprobar()
  } catch {
    // La interfaz sigue funcionando sin instalación ni conexión.
  }
}
