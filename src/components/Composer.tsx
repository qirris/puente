import { useEffect, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { sendFile, sendText } from '../lib/inbox'
import { formatBytes } from '../lib/format'
import {
  DURACIONES,
  DURACION_POR_DEFECTO,
  MAX_TEXT_LENGTH,
  type HorasDuracion,
  type InboxItem,
  type ToastTone,
} from '../lib/types'
import { composeText, validateFile } from '../lib/validation'
import {
  IconArrowUp,
  IconFile,
  IconPaperclip,
  IconX,
} from './Icons'

interface ComposerProps {
  onSent: (item: InboxItem) => void
  notify: (message: string, tone?: ToastTone) => void
}

export function Composer({ onSent, notify }: ComposerProps) {
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'uploading' | 'saving'>('uploading')
  const [dragging, setDragging] = useState(false)
  const [duracion, setDuracion] = useState<HorasDuracion>(DURACION_POR_DEFECTO)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setFilePreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setFilePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (file) return
    const node = textareaRef.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = `${Math.min(node.scrollHeight, 240)}px`
  }, [text, file])

  function resetFile() {
    setFile(null)
    setProgress(0)
    setPhase('uploading')
    if (inputRef.current) inputRef.current.value = ''
  }

  function pickFile(nextFile: File | undefined) {
    if (!nextFile) return
    const problem = validateFile(nextFile)
    if (problem) {
      notify(problem, 'error')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setFile(nextFile)
    setProgress(0)
    setPhase('uploading')
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setDragging(false)
    if (sending) return
    const dropped = event.dataTransfer.files?.[0]
    pickFile(dropped)
  }

  const etiquetaDuracion =
    DURACIONES.find((opcion) => opcion.horas === duracion)?.etiqueta ?? '24 horas'

  async function submitText() {
    const composed = composeText(text)
    if (!composed) {
      if (text.trim().length > MAX_TEXT_LENGTH) {
        notify(`El texto supera los ${MAX_TEXT_LENGTH.toLocaleString('es-ES')} caracteres.`, 'error')
      } else {
        notify('Escribe algo o pega un enlace antes de enviar.', 'error')
      }
      return
    }

    setSending(true)
    try {
      const item = await sendText({ ...composed, duracion })
      setText('')
      onSent(item)
      notify(`Guardado en tu bandeja. Caduca en ${etiquetaDuracion}.`, 'success')
      textareaRef.current?.focus()
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo guardar el envío.', 'error')
    } finally {
      setSending(false)
    }
  }

  async function submitFile(currentFile: File) {
    const problem = validateFile(currentFile)
    if (problem) {
      notify(problem, 'error')
      return
    }

    setSending(true)
    setProgress(0)
    setPhase('uploading')
    try {
      const item = await sendFile(
        currentFile,
        (percent) => {
          setProgress(percent)
          if (percent >= 100) setPhase('saving')
        },
        duracion,
      )
      resetFile()
      onSent(item)
      notify(`Archivo guardado. Caduca en ${etiquetaDuracion}.`, 'success')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo subir el archivo.', 'error')
    } finally {
      setSending(false)
    }
  }

  async function submitCurrent() {
    if (sending) return
    if (file) {
      await submitFile(file)
    } else {
      await submitText()
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await submitCurrent()
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      void submitCurrent()
    }
  }

  const canSend = file ? true : text.trim().length > 0

  return (
    <section
      className={`composer${dragging ? ' is-dragging' : ''}${file ? ' has-file' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        if (!sending) setDragging(true)
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
        setDragging(false)
      }}
      onDrop={handleDrop}
      aria-label="Nuevo envío"
    >
      <div className="composer-head">
        <div>
          <p className="eyebrow">Nuevo envío</p>
          <h2>Deja algo en el puente</h2>
        </div>
        <span className="instant-badge">Se guarda al instante</span>
      </div>

      <form onSubmit={handleSubmit}>
        {file ? (
          <div className="file-draft">
            <button
              type="button"
              className="file-remove"
              onClick={resetFile}
              disabled={sending}
              aria-label="Quitar archivo"
            >
              <IconX size={16} />
            </button>
            {filePreview ? (
              <img className="file-draft-image" src={filePreview} alt="Vista previa del archivo" />
            ) : (
              <div className="file-draft-icon">
                <IconFile size={30} />
                <span>{file.name.split('.').pop()?.toUpperCase().slice(0, 4) || 'FILE'}</span>
              </div>
            )}
            <div className="file-draft-meta">
              <strong title={file.name}>{file.name}</strong>
              <span>
                {formatBytes(file.size)} · {file.type || 'Tipo desconocido'}
              </span>
            </div>

            {sending ? (
              <div className="upload-progress">
                <div className="upload-progress-head">
                  <span>{phase === 'saving' ? 'Guardando en tu bandeja…' : 'Subiendo…'}</span>
                  <span>{progress}%</span>
                </div>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  aria-label="Progreso de la subida"
                >
                  <span
                    className="progress-fill"
                    style={{ width: `${phase === 'saving' ? 100 : progress}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <label className="sr-only" htmlFor="composer-text">
              Texto o enlace para enviar
            </label>
            <textarea
              id="composer-text"
              ref={textareaRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pega un enlace, escribe una nota o arrastra un archivo…"
              maxLength={MAX_TEXT_LENGTH}
              rows={4}
              disabled={sending}
            />
            <div className="composer-under">
              <span className="composer-tip">
                Enlaces, notas, capturas y archivos de hasta 20 MB
              </span>
              {text.length > MAX_TEXT_LENGTH * 0.8 ? (
                <span className="char-count">
                  {text.length.toLocaleString('es-ES')} /{' '}
                  {MAX_TEXT_LENGTH.toLocaleString('es-ES')}
                </span>
              ) : null}
            </div>
          </>
        )}

        <fieldset className="duracion-campo" disabled={sending}>
          <legend>Caducidad</legend>
          <div className="duracion-opciones">
            {DURACIONES.map((opcion) => (
              <label
                key={opcion.horas}
                className={`duracion-opcion${duracion === opcion.horas ? ' activa' : ''}`}
              >
                <input
                  type="radio"
                  name="duracion"
                  value={opcion.horas}
                  checked={duracion === opcion.horas}
                  onChange={() => setDuracion(opcion.horas)}
                />
                <span>{opcion.etiqueta}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="composer-actions">
          {!file ? (
            <label className={`attach-button${sending ? ' is-disabled' : ''}`}>
              <input
                ref={inputRef}
                type="file"
                onChange={(event) => pickFile(event.target.files?.[0])}
                disabled={sending}
              />
              <IconPaperclip size={18} />
              <span>Adjuntar</span>
            </label>
          ) : (
            <span className="attach-hint">El archivo se envía solo</span>
          )}

          <button
            type="submit"
            className="button button-primary send-button"
            disabled={!canSend || sending}
          >
            {sending ? (
              <span className="spinner spinner-inline" aria-hidden="true" />
            ) : (
              <IconArrowUp size={18} />
            )}
            {sending
              ? file
                ? phase === 'saving'
                  ? 'Guardando…'
                  : `${progress}%`
                : 'Guardando…'
              : file
                ? 'Enviar archivo'
                : 'Enviar'}
          </button>
        </div>
      </form>

      {dragging ? (
        <div className="drop-overlay" aria-hidden="true">
          <IconPaperclip size={28} />
          <strong>Suelta el archivo aquí</strong>
          <span>Máximo 20 MB</span>
        </div>
      ) : null}
    </section>
  )
}
