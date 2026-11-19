import { MAX_FILE_BYTES, MAX_TEXT_LENGTH, type ItemKind } from './types'

const URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i
const DOMAIN_PATTERN = /^[^\s/]+\.[^\s/]{2,}(\/.*)?$/i

/**
 * Devuelve una URL http(s) normalizada o null si el texto no es un enlace.
 * Acepta "https://…", "www.…" y dominios sueltos como "ejemplo.com/ruta".
 */
export function normalizeUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value || /\s/.test(value)) return null

  let candidate = value
  if (!URL_PATTERN.test(candidate)) {
    if (!DOMAIN_PATTERN.test(candidate)) return null
    candidate = `https://${candidate}`
  }

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname || (!url.hostname.includes('.') && url.hostname !== 'localhost')) {
      return null
    }
    return url.href
  } catch {
    return null
  }
}

export interface ComposedText {
  kind: Extract<ItemKind, 'text' | 'link'>
  content: string
}

export function composeText(raw: string): ComposedText | null {
  const value = raw.trim()
  if (!value) return null
  if (value.length > MAX_TEXT_LENGTH) return null
  const url = normalizeUrl(value)
  if (url) return { kind: 'link', content: url }
  return { kind: 'text', content: value }
}

/** Devuelve un mensaje de error en español, o null si el archivo es válido. */
export function validateFile(file: File): string | null {
  if (file.size === 0) return 'El archivo está vacío.'
  if (file.size > MAX_FILE_BYTES) {
    return `«${file.name}» pesa ${formatLimit(file.size)} y el máximo es 20 MB.`
  }
  return null
}

function formatLimit(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(mb >= 10 ? 0 : 1).replace('.', ',')} MB`
}

export function safeStorageName(name: string): string {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 96)
  return normalized || 'archivo'
}

export function isPreviewableImage(mimeType: string | null | undefined): boolean {
  return typeof mimeType === 'string' && mimeType.startsWith('image/')
}

export function isPdf(mimeType: string | null | undefined): boolean {
  return mimeType === 'application/pdf'
}

export function extensionOf(name: string | null | undefined): string {
  if (!name) return ''
  const dot = name.lastIndexOf('.')
  if (dot <= 0 || dot === name.length - 1) return ''
  return name.slice(dot + 1).toUpperCase().slice(0, 5)
}
