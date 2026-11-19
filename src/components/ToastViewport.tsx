import type { ToastMessage } from '../lib/types'
import { IconAlert, IconCheck, IconX } from './Icons'

interface ToastViewportProps {
  toasts: ToastMessage[]
  onDismiss: (id: number) => void
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          <span className="toast-icon">
            {toast.tone === 'error' ? <IconAlert size={18} /> : <IconCheck size={18} />}
          </span>
          <span>{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Cerrar aviso"
          >
            <IconX size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
