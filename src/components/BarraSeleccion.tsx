import { useEffect, useId, useRef } from 'react'
import type { useSeleccion } from '../hooks/useSeleccion'
import { IconDownload, IconTrash, IconX } from './Icons'

type Seleccion = ReturnType<typeof useSeleccion>

export function BarraSeleccion({ seleccion, online }: { seleccion: Seleccion; online: boolean }) {
  const { ids, elegibles, bloqueado, operacion, progreso } = seleccion
  return (
    <div className="seleccion-barra" aria-label="Acciones de archivos seleccionados">
      <div className="seleccion-cabecera">
        <strong role="status">{ids.size} {ids.size === 1 ? 'seleccionado' : 'seleccionados'}</strong>
        <button type="button" className="button button-small button-quiet" disabled={bloqueado} onClick={seleccion.cancelarSeleccion}>
          <IconX size={16} /> Cancelar selección
        </button>
      </div>
      <div className="seleccion-acciones">
        <button type="button" className="button button-small button-quiet" disabled={bloqueado || !elegibles.length || ids.size === elegibles.length} onClick={seleccion.seleccionarVisibles}>
          Seleccionar visibles
        </button>
        <button type="button" className="button button-small button-primary" disabled={bloqueado || !ids.size || !online} onClick={() => void seleccion.descargar()}>
          <IconDownload size={16} /> Descargar ZIP
        </button>
        <button type="button" className="button button-small button-quiet seleccion-eliminar" disabled={bloqueado || !ids.size || !online} onClick={seleccion.pedirConfirmacion}>
          <IconTrash size={16} /> Eliminar
        </button>
      </div>
      {operacion ? (
        <div className="seleccion-progreso">
          <span role="status">{operacion === 'zip' ? `Preparando ${progreso.actual} de ${progreso.total}…` : `Retirados ${progreso.actual} de ${progreso.total}…`}</span>
          {operacion === 'zip' ? <button type="button" className="button button-small button-quiet" onClick={seleccion.cancelarDescarga}>Cancelar descarga</button> : null}
        </div>
      ) : <p>Selecciona fotos o archivos. Máximo 100 MB de contenido por ZIP.</p>}
    </div>
  )
}

export function ConfirmarBorrado({ cantidad, cancelar, confirmar }: {
  cantidad: number; cancelar: () => void; confirmar: () => void
}) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const titulo = useId()
  const descripcion = useId()
  useEffect(() => {
    const nodo = dialogo.current
    nodo?.showModal()
    return () => nodo?.close()
  }, [])
  return (
    <dialog ref={dialogo} className="seleccion-dialogo" aria-labelledby={titulo} aria-describedby={descripcion} onCancel={cancelar}>
      <h2 id={titulo}>¿Eliminar {cantidad === 1 ? 'este archivo' : `estos ${cantidad} archivos`}?</h2>
      <p id={descripcion}>Se borrarán los envíos y los archivos almacenados, incluidos los fijados. No se puede deshacer.</p>
      <div className="seleccion-dialogo-acciones">
        <button type="button" className="button button-quiet" onClick={cancelar} autoFocus>Cancelar</button>
        <button type="button" className="button button-danger" disabled={!cantidad} onClick={confirmar}>Eliminar {cantidad} {cantidad === 1 ? 'archivo' : 'archivos'}</button>
      </div>
    </dialog>
  )
}
