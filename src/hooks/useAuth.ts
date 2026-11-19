import { useCallback, useEffect, useState } from 'react'
import { cerrarSesion, sesionActual } from '../lib/auth'
import { EVENTO_SESION } from '../lib/sesion'
import type { Sesion } from '../lib/types'

interface AuthState {
  session: Sesion | null
  loading: boolean
  signOut: () => Promise<void>
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Sesion | null>(() => sesionActual())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const actualizar = () => {
      setSession(sesionActual())
      setLoading(false)
    }
    actualizar()
    window.addEventListener(EVENTO_SESION, actualizar)
    window.addEventListener('storage', actualizar)
    return () => {
      window.removeEventListener(EVENTO_SESION, actualizar)
      window.removeEventListener('storage', actualizar)
    }
  }, [])

  const signOut = useCallback(async () => {
    await cerrarSesion()
  }, [])

  return { session, loading, signOut }
}
