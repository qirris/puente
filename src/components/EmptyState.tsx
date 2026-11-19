import { useEffect } from 'react'
import { IconArrowUp, IconDownload, IconX } from './Icons'

export function EmptyState() {
  return (
    <div className="empty-state">
      <svg className="empty-art" viewBox="0 0 240 150" aria-hidden="true">
        <path
          d="M18 112c0-56 46-102 102-102s102 46 102 102"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeDasharray="4 7"
        />
        <path d="M8 112h224" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <rect x="52" y="38" width="70" height="46" rx="9" fill="var(--surface-raised)" stroke="var(--line-strong)" />
        <path d="M64 52h46M64 61h32M64 70h38" stroke="var(--line-strong)" strokeWidth="3" strokeLinecap="round" />
        <rect x="126" y="62" width="62" height="40" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" strokeOpacity=".35" />
        <path d="M138 76h36M138 85h22" stroke="var(--accent)" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" />
        <circle cx="197" cy="47" r="16" fill="var(--green-soft)" stroke="var(--green)" strokeOpacity=".3" />
        <path d="m190 47 5 5 9-10" fill="none" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h3>El puente está despejado</h3>
      <p>
        Manda algo desde el otro dispositivo o empieza aquí mismo. Lo que dejes aparecerá
        al otro lado en cuanto abras Puente.
      </p>
      <span className="empty-hint">
        <IconArrowUp size={15} /> Tu primer envío aparecerá aquí
      </span>
    </div>
  )
}

export function InboxSkeleton() {
  return (
    <div className="inbox-skeleton" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton-row">
            <span className="skeleton-block skeleton-badge" />
            <span className="skeleton-block skeleton-time" />
          </div>
          <span className="skeleton-block skeleton-line" />
          <span className="skeleton-block skeleton-line short" />
          <div className="skeleton-row bottom">
            <span className="skeleton-block skeleton-small" />
            <span className="skeleton-block skeleton-button" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface LightboxProps {
  imageUrl: string
  fileName: string
  onClose: () => void
  onDownload: () => void
  downloading: boolean
}

export function Lightbox({
  imageUrl,
  fileName,
  onClose,
  onDownload,
  downloading,
}: LightboxProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Vista previa de ${fileName}`}
      onClick={onClose}
    >
      <div className="lightbox-inner" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="lightbox-close" onClick={onClose} aria-label="Cerrar vista previa" autoFocus>
          <IconX size={22} />
        </button>
        <img src={imageUrl} alt={fileName} className="lightbox-image" />
        <div className="lightbox-bar">
          <span className="lightbox-name" title={fileName}>
            {fileName}
          </span>
          <button
            type="button"
            className="button button-small button-light"
            onClick={onDownload}
            disabled={downloading}
          >
            {downloading ? (
              <span className="spinner spinner-small" aria-hidden="true" />
            ) : (
              <IconDownload size={16} />
            )}
            Descargar
          </button>
        </div>
      </div>
    </div>
  )
}
