import type { InboxItem, ItemKind } from './types'

export type FiltroTipo = 'todos' | ItemKind

export interface CriterioBusqueda {
  texto: string
  tipo: FiltroTipo
}

export const FILTROS: { id: FiltroTipo; etiqueta: string }[] = [
  { id: 'todos', etiqueta: 'Todo' },
  { id: 'link', etiqueta: 'Enlaces' },
  { id: 'text', etiqueta: 'Notas' },
  { id: 'image', etiqueta: 'Fotos' },
  { id: 'file', etiqueta: 'Archivos' },
]

/** Quita los acentos y normaliza la caja para buscar sin depender de la entrada. */
function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
}

/** Campos por los que se puede buscar dentro de un envío. */
export function textoBuscable(item: InboxItem): string {
  return normalizar([item.content ?? '', item.file_name ?? '', item.mime_type ?? ''].join(' '))
}

/**
 * Filtra la bandeja por tipo y por palabras sueltas. Todas las palabras tienen
 * que aparecer en algún campo del envío; el orden no importa.
 */
export function filtrarEnvios(items: InboxItem[], criterio: CriterioBusqueda): InboxItem[] {
  const terminos = normalizar(criterio.texto).trim().split(/\s+/).filter(Boolean)

  return items.filter((item) => {
    if (criterio.tipo !== 'todos' && item.kind !== criterio.tipo) return false
    if (terminos.length === 0) return true
    const texto = textoBuscable(item)
    return terminos.every((termino) => texto.includes(termino))
  })
}
