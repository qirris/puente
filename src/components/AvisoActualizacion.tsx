import { useState, useSyncExternalStore } from 'react'
import { aplicarActualizacion, hayActualizacion, suscribirActualizaciones } from '../lib/actualizaciones'
import { IconRefresh } from './Icons'

export function AvisoActualizacion() {
  const pendiente = useSyncExternalStore(suscribirActualizaciones, hayActualizacion)
  const [actualizando, setActualizando] = useState(false)
  if (!pendiente) return null

  return (
    <aside className="aviso-actualizacion" aria-label="Actualización de Puente">
      <div role="status">
        <strong>Actualización pendiente</strong>
        <p>Hay una nueva versión de Puente. Termina tus envíos antes de actualizar: la app se recargará.</p>
      </div>
      <button
        type="button"
        className="button button-primary button-small"
        disabled={actualizando}
        onClick={() => {
          setActualizando(true)
          aplicarActualizacion()
        }}
      >
        <IconRefresh size={16} />
        {actualizando ? 'Actualizando…' : 'Actualizar ahora'}
      </button>
    </aside>
  )
}
