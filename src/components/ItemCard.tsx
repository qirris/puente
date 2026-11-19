import { useState } from 'react'
import { downloadItem, getOpenUrl } from '../lib/inbox'
import {
  domainOf,
  formatBytes,
  fullDate,
  kindLabel,
  relativeTime,
  remainingLabel,
} from '../lib/format'
import type { InboxItem, ToastTone } from '../lib/types'
import { extensionOf, isPdf } from '../lib/validation'
import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconExternal,
  IconEye,
  IconFile,
  IconImage,
  IconLink,
  IconPin,
  IconPinFilled,
  IconText,
  IconTrash,
} from './Icons'

interface ItemCardProps {
  item: InboxItem
  now: number
  onPreview: (item: InboxItem) => void
  onPin: (item: InboxItem) => Promise<void>
  onDelete: (item: InboxItem) => Promise<void>
  notify: (message: string, tone?: ToastTone) => void
}

function safeHttpUrl(raw: string | null): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

async function copyToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  const area = document.createElement('textarea')
  area.value = value
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.append(area)
  area.select()
  document.execCommand('copy')
  area.remove()
}

export function ItemCard({
  item,
  now,
  onPreview,
  onPin,
  onDelete,
  notify,
}: ItemCardProps) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pinning, setPinning] = useState(false)
  const [busyAction, setBusyAction] = useState<'open' | 'download' | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  const label = kindLabel(item.kind, item.mime_type)
  const expiry = remainingLabel(item.expires_at, item.pinned, now)
  const expired = !item.pinned && expiry === 'Caducado'
  const urgent = !item.pinned && !expired && /min/.test(expiry)
  const link = item.kind === 'link' ? safeHttpUrl(item.content) : null
  const isLongText = item.kind === 'text' && (item.content?.length ?? 0) > 480
  const hasActions = item.kind === 'text' || item.kind === 'link' || item.storage_path

  async function handleCopy() {
    if (!item.content) return
    try {
      await copyToClipboard(item.content)
      notify(item.kind === 'link' ? 'Enlace copiado.' : 'Texto copiado.')
    } catch {
      notify('No se pudo copiar. Selecciona el texto y cópialo a mano.', 'error')
    }
  }

  async function handlePin() {
    if (pinning) return
    setPinning(true)
    try {
      await onPin(item)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo cambiar el fijado.', 'error')
    } finally {
      setPinning(false)
    }
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    try {
      await onDelete(item)
      setConfirming(false)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo eliminar el envío.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function handleOpen() {
    if (busyAction) return
    setBusyAction('open')
    const tab = window.open('about:blank', '_blank')
    if (tab) tab.opener = null
    try {
      const url = await getOpenUrl(item)
      if (tab) {
        tab.location.replace(url)
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      tab?.close()
      notify(err instanceof Error ? err.message : 'No se pudo abrir el archivo.', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDownload() {
    if (busyAction) return
    setBusyAction('download')
    try {
      await downloadItem(item)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo descargar el archivo.', 'error')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <article
      className={`item-card item-${item.kind}${item.pinned ? ' is-pinned' : ''}`}
      aria-label={`${label}: ${item.file_name ?? item.content?.slice(0, 80) ?? ''}`}
    >
      <header className="item-head">
        <span className={`kind-badge kind-${item.kind}`}>
          {item.kind === 'text' ? <IconText size={15} /> : null}
          {item.kind === 'link' ? <IconLink size={15} /> : null}
          {item.kind === 'image' ? <IconImage size={15} /> : null}
          {item.kind === 'file' ? <IconFile size={15} /> : null}
          {label}
        </span>

        <div className="item-status">
          {item.pinned ? (
            <span className="pinned-flag">
              <IconPinFilled size={12} /> Fijado
            </span>
          ) : null}
          <time dateTime={item.created_at} title={fullDate(item.created_at)}>
            {relativeTime(item.created_at, now)}
          </time>
        </div>

        <div className="item-tools">
          <button
            type="button"
            className={`icon-button pin-button${item.pinned ? ' active' : ''}`}
            onClick={handlePin}
            disabled={pinning}
            aria-pressed={item.pinned}
            aria-label={item.pinned ? 'Dejar de fijar este envío' : 'Fijar este envío para que no caduque'}
            title={item.pinned ? 'Dejar de fijar' : 'Fijar (no caduca)'}
          >
            {pinning ? (
              <span className="spinner spinner-small" aria-hidden="true" />
            ) : item.pinned ? (
              <IconPinFilled size={18} />
            ) : (
              <IconPin size={18} />
            )}
          </button>
          <button
            type="button"
            className="icon-button danger-hover"
            onClick={() => setConfirming(true)}
            aria-label="Eliminar este envío"
            title="Eliminar"
          >
            <IconTrash size={18} />
          </button>
        </div>
      </header>

      <div className="item-body">
        {item.kind === 'text' ? (
          <>
            <p className={`item-text${isLongText && !expanded ? ' is-clamped' : ''}`}>
              {item.content}
            </p>
            {isLongText ? (
              <button
                type="button"
                className="link-button show-more"
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? 'Mostrar menos' : 'Mostrar todo'}
              </button>
            ) : null}
          </>
        ) : null}

        {item.kind === 'link' && link ? (
          <a className="link-preview" href={link} target="_blank" rel="noopener noreferrer">
            <span className="link-glyph">
              <IconLink size={20} />
            </span>
            <span className="link-copy">
              <strong>{domainOf(link)}</strong>
              <span>{link}</span>
            </span>
            <IconExternal size={18} className="link-external" />
          </a>
        ) : null}

        {item.kind === 'link' && !link ? (
          <p className="item-text">{item.content}</p>
        ) : null}

        {item.kind === 'image' && item.storage_path ? (
          <button
            type="button"
            className="image-button"
            onClick={() => onPreview(item)}
            disabled={!item.previewUrl || imageFailed}
            aria-label={`Previsualizar ${item.file_name ?? 'la imagen'}`}
          >
            {item.previewUrl && !imageFailed ? (
              <img
                src={item.previewUrl}
                alt={item.file_name ?? 'Imagen enviada'}
                loading="lazy"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <span className="image-fallback">
                <IconImage size={30} />
                Vista previa no disponible
              </span>
            )}
            {item.previewUrl && !imageFailed ? (
              <span className="image-zoom">
                <IconEye size={16} /> Ver
              </span>
            ) : null}
          </button>
        ) : null}

        {item.kind === 'image' && item.storage_path ? (
          <p className="image-caption">
            <span title={item.file_name ?? undefined}>{item.file_name}</span>
            <span>{formatBytes(item.size_bytes)}</span>
          </p>
        ) : null}

        {item.kind === 'file' ? (
          <div className="file-row">
            <div className={`file-glyph${isPdf(item.mime_type) ? ' is-pdf' : ''}`}>
              <IconFile size={24} />
              <span>{extensionOf(item.file_name) || 'FILE'}</span>
            </div>
            <div className="file-meta">
              <strong title={item.file_name ?? undefined}>{item.file_name ?? 'Archivo'}</strong>
              <span>
                {formatBytes(item.size_bytes)}
                {isPdf(item.mime_type) ? ' · PDF' : ''}
              </span>
            </div>
            <div className="file-quick-actions">
              <button
                type="button"
                className="button button-small button-quiet"
                onClick={handleOpen}
                disabled={busyAction !== null}
              >
                {busyAction === 'open' ? (
                  <span className="spinner spinner-small" aria-hidden="true" />
                ) : (
                  <IconExternal size={15} />
                )}
                Abrir
              </button>
              <button
                type="button"
                className="button button-small button-quiet"
                onClick={handleDownload}
                disabled={busyAction !== null}
              >
                {busyAction === 'download' ? (
                  <span className="spinner spinner-small" aria-hidden="true" />
                ) : (
                  <IconDownload size={15} />
                )}
                Descargar
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <footer className="item-foot">
        <span
          className={`expiry${urgent ? ' is-urgent' : ''}${expired ? ' is-expired' : ''}`}
          title={item.expires_at ? `Caduca: ${fullDate(item.expires_at)}` : 'Sin caducidad'}
        >
          <span className="expiry-dot" aria-hidden="true" />
          {expiry}
        </span>

        {hasActions ? (
          <div className="item-actions">
            {(item.kind === 'text' || item.kind === 'link') ? (
              <button type="button" className="button button-small button-quiet" onClick={handleCopy}>
                <IconCopy size={15} /> Copiar
              </button>
            ) : null}

            {item.kind === 'link' && link ? (
              <a
                className="button button-small button-quiet"
                href={link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconExternal size={15} /> Abrir enlace
              </a>
            ) : null}

            {item.kind === 'image' && item.storage_path ? (
              <button
                type="button"
                className="button button-small button-quiet"
                onClick={handleDownload}
                disabled={busyAction !== null}
              >
                {busyAction === 'download' ? (
                  <span className="spinner spinner-small" aria-hidden="true" />
                ) : (
                  <IconDownload size={15} />
                )}
                Descargar
              </button>
            ) : null}

            {item.kind === 'file' ? (
              <span className="saved-mark">
                <IconCheck size={13} /> Guardado
              </span>
            ) : null}
          </div>
        ) : null}
      </footer>

      {confirming ? (
        <div className="confirm-delete" role="alertdialog" aria-label="Confirmar eliminación">
          <div>
            <strong>¿Eliminar este envío?</strong>
            <span>Se borrará el registro y el archivo. No se puede deshacer.</span>
          </div>
          <div className="confirm-actions">
            <button
              type="button"
              className="button button-small button-quiet"
              onClick={() => setConfirming(false)}
              disabled={deleting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="button button-small button-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <span className="spinner spinner-small" aria-hidden="true" /> : <IconTrash size={15} />}
              Eliminar
            </button>
          </div>
        </div>
      ) : null}
    </article>
  )
}
