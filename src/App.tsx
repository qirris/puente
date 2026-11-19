import { useCallback, useEffect, useRef, useState } from 'react'
import {
  deleteItem,
  downloadItem,
  setPinned,
  subscribeToInbox,
} from './lib/inbox'
import type { InboxItem, Sesion, ToastMessage, ToastTone } from './lib/types'
import { useAuth } from './hooks/useAuth'
import { useInbox } from './hooks/useInbox'
import { AuthScreen } from './components/AuthScreen'
import { Composer } from './components/Composer'
import { EmptyState, InboxSkeleton, Lightbox } from './components/EmptyState'
import { Header } from './components/Header'
import { Splash } from './components/Splash'
import { ToastViewport } from './components/ToastViewport'
import { IconAlert, IconLock, IconRefresh, IconWifiOff } from './components/Icons'
import { ItemCard } from './components/ItemCard'

interface PantryProps {
  session: Sesion
  signOut: () => Promise<void>
}

function Pantry({ session, signOut }: PantryProps) {
  const {
    items,
    loading,
    refreshing,
    error,
    refresh,
    refreshSilent,
    addItem,
    updateItem,
    removeItem,
  } = useInbox(session.user.id)

  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [preview, setPreview] = useState<InboxItem | null>(null)
  const [downloadingPreview, setDownloadingPreview] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)
  const toastTimers = useRef<number[]>([])
  const toastId = useRef(0)

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = (toastId.current += 1)
      setToasts((current) => [...current.slice(-2), { id, message, tone }])
      const timer = window.setTimeout(
        () => dismissToast(id),
        tone === 'error' ? 6500 : 4000,
      )
      toastTimers.current.push(timer)
    },
    [dismissToast],
  )

  useEffect(() => {
    const timers = toastTimers.current
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(tick)
  }, [])

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let debounce: number | undefined

    const schedule = () => {
      if (debounce) window.clearTimeout(debounce)
      debounce = window.setTimeout(() => {
        void refreshSilent()
      }, 450)
    }

    try {
      unsubscribe = subscribeToInbox(schedule)
    } catch {
      // Sin Realtime seguimos actualizando por foco y sondeo.
    }

    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshSilent()
    }, 60_000)

    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now())
        void refreshSilent()
      }
    }
    const handleFocus = () => {
      void refreshSilent()
    }

    document.addEventListener('visibilitychange', handleVisible)
    window.addEventListener('focus', handleFocus)

    return () => {
      if (debounce) window.clearTimeout(debounce)
      window.clearInterval(poll)
      document.removeEventListener('visibilitychange', handleVisible)
      window.removeEventListener('focus', handleFocus)
      unsubscribe?.()
    }
  }, [refreshSilent])

  const handleSent = useCallback(
    (item: InboxItem) => {
      addItem(item)
      setNow(Date.now())
      void refreshSilent()
    },
    [addItem, refreshSilent],
  )

  const handlePin = useCallback(
    async (item: InboxItem) => {
      const nextPinned = !item.pinned
      const updated = await setPinned(item.id, nextPinned)
      updateItem({
        ...item,
        pinned: updated.pinned,
        expires_at: updated.expires_at,
      })
      notify(
        nextPinned ? 'Fijado. Este envío ya no caduca.' : 'Desfijado. Caducará en 24 horas.',
      )
    },
    [notify, updateItem],
  )

  const handleDelete = useCallback(
    async (item: InboxItem) => {
      await deleteItem(item)
      removeItem(item.id)
      setPreview((current) => (current?.id === item.id ? null : current))
      notify('Envío eliminado. El archivo también se ha borrado.')
    },
    [notify, removeItem],
  )

  const closePreview = useCallback(() => setPreview(null), [])

  const handlePreviewDownload = useCallback(async () => {
    if (!preview || downloadingPreview) return
    setDownloadingPreview(true)
    try {
      await downloadItem(preview)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo descargar la imagen.', 'error')
    } finally {
      setDownloadingPreview(false)
    }
  }, [downloadingPreview, notify, preview])

  return (
    <div className="app-shell">
      <Header
        session={session}
        onSignOut={signOut}
        onRefresh={() => void refresh()}
        refreshing={refreshing}
      />

      {!online ? (
        <div className="offline-banner" role="status">
          <IconWifiOff size={16} /> Sin conexión. Puedes leer lo cargado; para enviar o
          descargar necesitas red.
        </div>
      ) : null}

      <main className="layout">
        <aside className="composer-column">
          <Composer onSent={handleSent} notify={notify} />
          <div className="private-note">
            <IconLock size={15} />
            <span>
              Solo tu cuenta ve esta bandeja. Los archivos viven en un espacio privado y se
              eliminan cuando borras el envío o cuando caduca.
            </span>
          </div>
        </aside>

        <section className="inbox-column" aria-labelledby="inbox-heading">
          <div className="inbox-head">
            <div>
              <p className="eyebrow">Tu bandeja</p>
              <h1 id="inbox-heading">Bandeja</h1>
              <p className="inbox-subtitle">
                Lo más reciente primero. Todo caduca a las 24 h salvo que lo fijes.
              </p>
            </div>
            <span className="count-pill" aria-label={`${items.length} envíos`}>
              {loading ? '—' : items.length}
            </span>
          </div>

          {error ? (
            <div className="error-banner" role="alert">
              <IconAlert size={18} />
              <span>{error}</span>
              <button
                type="button"
                className="button button-small button-quiet"
                onClick={() => void refresh()}
              >
                <IconRefresh size={15} /> Reintentar
              </button>
            </div>
          ) : null}

          {loading ? (
            <InboxSkeleton />
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="inbox-list">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  now={now}
                  onPreview={setPreview}
                  onPin={handlePin}
                  onDelete={handleDelete}
                  notify={notify}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <span>Puente</span>
        <span aria-hidden="true">·</span>
        <span>Diseñado para ir y volver</span>
      </footer>

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />

      {preview?.previewUrl ? (
        <Lightbox
          imageUrl={preview.previewUrl}
          fileName={preview.file_name ?? 'Imagen'}
          onClose={closePreview}
          onDownload={() => void handlePreviewDownload()}
          downloading={downloadingPreview}
        />
      ) : null}
    </div>
  )
}

export default function App() {
  const { session, loading, signOut } = useAuth()

  if (loading) return <Splash />
  if (!session) return <AuthScreen />

  return <Pantry session={session} signOut={signOut} />
}
