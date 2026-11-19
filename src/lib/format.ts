export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const decimals = value >= 10 ? 0 : 1
  const numero = Number(value.toFixed(decimals)).toString().replace('.', ',')
  return `${numero} ${units[unit]}`
}

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime()
  if (diff < 45_000) return 'ahora mismo'
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso))
}

export function fullDate(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function remainingLabel(
  expiresAt: string | null,
  pinned: boolean,
  now = Date.now(),
): string {
  if (pinned) return 'Sin caducidad'
  if (!expiresAt) return 'Sin caducidad'
  const diff = new Date(expiresAt).getTime() - now
  if (diff <= 0) return 'Caducado'
  const minutes = Math.ceil(diff / 60_000)
  if (minutes < 60) return `Quedan ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return rest > 0 ? `Quedan ${hours} h ${rest} min` : `Quedan ${hours} h`
  const days = Math.ceil(hours / 24)
  return `Quedan ${days} días`
}

export function kindLabel(kind: string, mimeType?: string | null): string {
  switch (kind) {
    case 'link':
      return 'Enlace'
    case 'image':
      return 'Foto'
    case 'text':
      return 'Texto'
    default:
      return mimeType === 'application/pdf' ? 'PDF' : 'Archivo'
  }
}

export function domainOf(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '')
  } catch {
    return rawUrl
  }
}
