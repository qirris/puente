import type { InboxItem } from '../src/lib/types'

export function archivoEjemplo(id: string, cambios: Partial<InboxItem> = {}): InboxItem {
  return {
    id, user_id: 'cuenta-demo', kind: 'image', content: null,
    storage_path: `archivos/${id}`, file_name: `${id}.png`, mime_type: 'image/png',
    size_bytes: 4, pinned: false, created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86_400_000).toISOString(), ...cambios,
  }
}
