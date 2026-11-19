// Puente · configuración del cliente.
// Con Vite y Wrangler en local se usa el proxy de /api (VITE_API_URL vacío).
// En producción se sirve la interfaz desde el propio Worker (mismo origen).
const url = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')

export const config = {
  apiUrl: url,
  isConfigured: true,
} as const
