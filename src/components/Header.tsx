import type { Sesion } from '../lib/types'
import { BridgeMark, IconDevices, IconLogout, IconRefresh } from './Icons'

interface HeaderProps {
  session: Sesion
  onSignOut: () => Promise<void>
  onRefresh: () => void
  refreshing: boolean
  onSesiones: () => void
}

export function Header({
  session,
  onSignOut,
  onRefresh,
  refreshing,
  onSesiones,
}: HeaderProps) {
  const email = session.user.email ?? 'Cuenta de Puente'

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand-row">
          <BridgeMark size={38} className="brand-mark" />
          <div className="brand-copy">
            <span className="wordmark">Puente</span>
            <span className="tagline">Móvil ↔ ordenador</span>
          </div>
        </div>

        <div className="topbar-actions">
          <span className="account-chip" title={email}>
            <span className="account-dot" aria-hidden="true" />
            <span className="account-email">{email}</span>
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={onSesiones}
            aria-label="Ver sesiones activas"
            title="Sesiones activas"
          >
            <IconDevices size={19} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onRefresh}
            aria-label="Actualizar bandeja"
            title="Actualizar bandeja"
            disabled={refreshing}
          >
            <IconRefresh size={19} className={refreshing ? 'spin' : undefined} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => void onSignOut()}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <IconLogout size={19} />
          </button>
        </div>
      </div>
    </header>
  )
}
