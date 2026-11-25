import { useEffect, useRef, useState } from 'react'
import { prepararZip, guardarZip } from '../lib/descargaZip'
import { deleteItem } from '../lib/inbox'
import { depurarSeleccion, eliminarSeleccion, esSeleccionable } from '../lib/seleccion'
import type { InboxItem, ToastTone } from '../lib/types'

interface OpcionesSeleccion {
  visibles: InboxItem[]
  criterio: string
  ahora: number
  alEliminar: (id: string) => void
  notify: (mensaje: string, tono?: ToastTone) => void
}

export function useSeleccion({ visibles, criterio, ahora, alEliminar, notify }: OpcionesSeleccion) {
  const [modo, setModo] = useState(false)
  const [estado, setEstado] = useState({ criterio, ids: new Set<string>() })
  const [confirmando, setConfirmando] = useState(false)
  const [operacion, setOperacion] = useState<'zip' | 'borrado' | null>(null)
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 })
  const controlador = useRef<AbortController | null>(null)
  const activo = useRef(true)
  const elegibles = visibles.filter((item) => esSeleccionable(item, ahora))
  const ids = estado.criterio === criterio ? depurarSeleccion(estado.ids, visibles, ahora) : new Set<string>()
  const seleccionados = elegibles.filter((item) => ids.has(item.id))
  const bloqueado = operacion !== null || confirmando

  useEffect(() => {
    activo.current = true
    return () => {
      activo.current = false
      controlador.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (operacion) return
    setEstado((actual) => {
      const siguientes = actual.criterio === criterio ? depurarSeleccion(actual.ids, visibles, ahora) : new Set<string>()
      return actual.criterio === criterio && siguientes.size === actual.ids.size ? actual : { criterio, ids: siguientes }
    })
  }, [visibles, criterio, ahora, operacion])

  function alternar(id: string) {
    if (bloqueado || !elegibles.some((item) => item.id === id)) return
    const siguientes = new Set(ids)
    if (siguientes.has(id)) siguientes.delete(id)
    else siguientes.add(id)
    setEstado({ criterio, ids: siguientes })
  }

  function cancelarSeleccion() {
    if (operacion) return
    setConfirmando(false)
    setModo(false)
    setEstado({ criterio, ids: new Set() })
  }

  async function descargar() {
    if (controlador.current || bloqueado || !seleccionados.length) return
    const control = new AbortController()
    controlador.current = control
    setOperacion('zip')
    setProgreso({ actual: 0, total: seleccionados.length })
    try {
      const blob = await prepararZip(seleccionados, {
        signal: control.signal,
        progreso: (actual, total) => { if (activo.current) setProgreso({ actual, total }) },
      })
      control.signal.throwIfAborted()
      if (activo.current) {
        guardarZip(blob)
        notify('Descarga del ZIP iniciada.', 'success')
      }
    } catch (error) {
      if (activo.current) {
        if (control.signal.aborted) notify('Descarga cancelada. Puedes volver a intentarlo.', 'info')
        else notify(error instanceof Error ? error.message : 'No se pudo preparar el ZIP.', 'error')
      }
    } finally {
      controlador.current = null
      if (activo.current) setOperacion(null)
    }
  }

  async function eliminar() {
    if (controlador.current || operacion || !confirmando || !seleccionados.length) return
    const control = new AbortController()
    controlador.current = control
    setConfirmando(false)
    setOperacion('borrado')
    setProgreso({ actual: 0, total: seleccionados.length })
    try {
      const resultado = await eliminarSeleccion(seleccionados,
        (item) => deleteItem(item, control.signal),
        (id) => {
          if (!activo.current) return
          alEliminar(id)
          setEstado((actual) => {
            const siguientes = new Set(actual.ids)
            siguientes.delete(id)
            return { ...actual, ids: siguientes }
          })
          setProgreso((actual) => ({ ...actual, actual: actual.actual + 1 }))
        }, control.signal)
      if (!activo.current) return
      if (resultado.sesionCaducada) {
        notify('Tu sesión ha caducado. Vuelve a iniciar sesión.', 'error')
      } else if (resultado.fallidos.length) {
        notify(`${resultado.eliminados.length} archivos retirados; ${resultado.fallidos.length} no se pudieron eliminar. Siguen seleccionados para reintentar.`, 'error')
      } else {
        notify(`${resultado.eliminados.length} archivos retirados de la bandeja.`, 'success')
      }
    } finally {
      controlador.current = null
      if (activo.current) setOperacion(null)
    }
  }

  return {
    modo, ids, seleccionados, elegibles, confirmando, bloqueado, operacion, progreso,
    iniciar: () => setModo(true), alternar, cancelarSeleccion, descargar, eliminar,
    seleccionarVisibles: () => { if (!bloqueado) setEstado({ criterio, ids: new Set(elegibles.map((item) => item.id)) }) },
    pedirConfirmacion: () => { if (!bloqueado && ids.size) setConfirmando(true) },
    cerrarConfirmacion: () => setConfirmando(false),
    cancelarDescarga: () => { if (operacion === 'zip') controlador.current?.abort() },
  }
}
