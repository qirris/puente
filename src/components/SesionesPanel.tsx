import { useCallback, useEffect, useState } from 'react'
import { fullDate } from '../lib/format'
import { cerrarSesionActiva, listarSesiones } from '../lib/sesiones'
import type { SesionActiva, ToastTone } from '../lib/types'
import { IconDevices, IconRefresh, IconX } from './Icons'

interface SesionesPanelProps {
  onClose: () => void
  onCerrarActual: () => Promise<void>
  notify: (mensaje: string, tono?: ToastTone) => void
}

export function SesionesPanel({ onClose, onCerrarActual, notify }: SesionesPanelProps) {
  const [sesiones, setSesiones] = useState<SesionActiva[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cerrando, setCerrando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      setSesiones(await listarSesiones())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las sesiones.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const alPulsar = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', alPulsar)
    return () => {
      document.body.style.overflow = anterior
      document.removeEventListener('keydown', alPulsar)
    }
  }, [onClose])

  const cerrar = async (sesion: SesionActiva) => {
    if (sesion.actual) {
      await onCerrarActual()
      onClose()
      return
    }

    setCerrando(sesion.id)
    try {
      await cerrarSesionActiva(sesion.id)
      setSesiones((actuales) => actuales.filter((entrada) => entrada.id !== sesion.id))
      notify('Sesión cerrada en el otro dispositivo.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo cerrar la sesión.', 'error')
    } finally {
      setCerrando(null)
    }
  }

  const cerrarOtras = async () => {
    const otras = sesiones.filter((sesion) => !sesion.actual)
    if (otras.length === 0) return
    setCerrando('otras')
    try {
      const resultados = await Promise.allSettled(
        otras.map((sesion) => cerrarSesionActiva(sesion.id)),
      )
      const fallidas = resultados.filter((resultado) => resultado.status === 'rejected').length
      await cargar()
      if (fallidas > 0) {
        notify(`No se pudieron cerrar ${fallidas} sesiones.`, 'error')
      } else {
        notify(`${otras.length} ${otras.length === 1 ? 'sesión cerrada' : 'sesiones cerradas'}.`)
      }
    } finally {
      setCerrando(null)
    }
  }

  return (
    <div className="panel-backdrop" onClick={onClose}>
      <section
        className="panel-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sesiones-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="panel-head">
          <div>
            <p className="eyebrow">Seguridad</p>
            <h2 id="sesiones-titulo">Sesiones activas</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Cerrar panel de sesiones"
          >
            <IconX size={20} />
          </button>
        </header>

        <p className="panel-intro">
          Estos dispositivos tienen acceso a tu bandeja. Cierra los que no reconozcas.
        </p>

        {error ? <div className="form-message error">{error}</div> : null}

        {loading ? (
          <div className="sesiones-cargando">
            <span className="spinner" /> Cargando sesiones…
          </div>
        ) : sesiones.length === 0 ? (
          <p className="panel-empty">No hay sesiones activas.</p>
        ) : (
          <ul className="sesiones-lista">
            {sesiones.map((sesion) => (
              <li
                key={sesion.id}
                className={`sesion-fila${sesion.actual ? ' actual' : ''}`}
              >
                <span className="sesion-icono" aria-hidden="true">
                  <IconDevices size={19} />
                </span>
                <div className="sesion-info">
                  <strong>{sesion.actual ? 'Este dispositivo' : 'Otro dispositivo'}</strong>
                  <span>Iniciada el {fullDate(sesion.creada)}</span>
                  <span>Caduca el {fullDate(sesion.caduca)}</span>
                </div>
                {sesion.actual ? (
                  <span className="sesion-etiqueta">Actual</span>
                ) : (
                  <button
                    type="button"
                    className="button button-small button-quiet"
                    onClick={() => void cerrar(sesion)}
                    disabled={cerrando !== null}
                  >
                    Cerrar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <footer className="panel-foot">
          <button
            type="button"
            className="button button-small button-quiet"
            onClick={() => void cargar()}
            disabled={loading}
          >
            <IconRefresh size={14} /> Actualizar
          </button>
          {sesiones.length > 1 ? (
            <button
              type="button"
              className="button button-small button-quiet"
              onClick={() => void cerrarOtras()}
              disabled={cerrando !== null}
            >
              {cerrando === 'otras' ? (
                <span className="spinner spinner-small spinner-inline" aria-hidden="true" />
              ) : null}
              Cerrar las demás
            </button>
          ) : null}
        </footer>

        <p className="panel-note">
          Cerrar una sesión no borra tus envíos. Si cierras la actual, tendrás que volver a
          iniciar sesión.
        </p>
      </section>
    </div>
  )
}
