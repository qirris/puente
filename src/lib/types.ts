export const MAX_FILE_BYTES = 20 * 1024 * 1024
export const MAX_TEXT_LENGTH = 10_000
export const EXPIRY_HOURS = 24

export type ItemKind = 'text' | 'link' | 'image' | 'file'

export interface Item {
  id: string
  user_id: string
  kind: ItemKind
  content: string | null
  storage_path: string | null
  file_name: string | null
  mime_type: string | null
  size_bytes: number | null
  pinned: boolean
  created_at: string
  expires_at: string | null
}

export interface InboxItem extends Item {
  previewUrl?: string
}

/** Sesión propia de Puente (sustituye al Session de Supabase). */
export interface Sesion {
  token: string
  user: {
    id: string
    email: string
  }
}

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: number
  message: string
  tone: ToastTone
}
