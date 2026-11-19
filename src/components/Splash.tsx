import { BridgeMark } from './Icons'

export function Splash() {
  return (
    <div className="splash">
      <BridgeMark size={52} className="brand-mark" />
      <p className="splash-text">Abriendo el puente…</p>
      <span className="spinner" aria-hidden="true" />
    </div>
  )
}
