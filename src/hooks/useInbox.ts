import { useCallback, useEffect, useRef, useState } from 'react'
import { listItems, sweepExpired } from '../lib/inbox'
import type { InboxItem } from '../lib/types'

interface UseInboxResult {
  items: InboxItem[]
  loading: boolean
  refreshing: boolean
  error: string | null
  refresh: () => Promise<void>
  refreshSilent: () => Promise<void>
  replaceItems: (next: InboxItem[]) => void
  addItem: (item: InboxItem) => void
  updateItem: (item: InboxItem) => void
  removeItem: (id: string) => void
}

export function useInbox(userId: string | null): UseInboxResult {
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const queued = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const load = useCallback(
    async (mode: 'initial' | 'silent' | 'manual') => {
      if (!userId) return
      if (inFlight.current) {
        queued.current = true
        return
      }

      inFlight.current = true
      if (mode === 'manual') setRefreshing(true)
      if (mode === 'initial') setLoading(true)

      try {
        await sweepExpired().catch(() => {
          // La limpieza es best-effort en cliente; la función programada es la principal.
        })
        const next = await listItems()
        if (!mounted.current) return
        setItems(next)
        setError(null)
      } catch (err) {
        if (!mounted.current) return
        setError(err instanceof Error ? err.message : 'No se pudo cargar la bandeja.')
      } finally {
        inFlight.current = false
        if (mounted.current) {
          setLoading(false)
          setRefreshing(false)
        }
        if (queued.current) {
          queued.current = false
          void load('silent')
        }
      }
    },
    [userId],
  )

  useEffect(() => {
    setItems([])
    setLoading(true)
    void load('initial')
  }, [load])

  const refresh = useCallback(() => load('manual'), [load])
  const refreshSilent = useCallback(() => load('silent'), [load])

  const replaceItems = useCallback((next: InboxItem[]) => setItems(next), [])

  const addItem = useCallback((item: InboxItem) => {
    setItems((current) => {
      if (current.some((entry) => entry.id === item.id)) return current
      return [item, ...current]
    })
  }, [])

  const updateItem = useCallback((item: InboxItem) => {
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, ...item } : entry)),
    )
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((entry) => entry.id !== id))
  }, [])

  return {
    items,
    loading,
    refreshing,
    error,
    refresh,
    refreshSilent,
    replaceItems,
    addItem,
    updateItem,
    removeItem,
  }
}
