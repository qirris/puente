import { FILTROS, type FiltroTipo } from '../lib/filtrado'
import { IconSearch, IconX } from './Icons'

interface InboxFiltersProps {
  texto: string
  tipo: FiltroTipo
  total: number
  visibles: number
  onTexto: (valor: string) => void
  onTipo: (valor: FiltroTipo) => void
  disabled?: boolean
}

export function InboxFilters({
  texto,
  tipo,
  total,
  visibles,
  onTexto,
  onTipo,
  disabled = false,
}: InboxFiltersProps) {
  const filtrando = texto.trim().length > 0 || tipo !== 'todos'

  return (
    <div className="inbox-toolbar">
      <label className="search-field">
        <IconSearch size={17} />
        <span className="sr-only">Buscar en la bandeja</span>
        <input
          type="search"
          disabled={disabled}
          value={texto}
          onChange={(event) => onTexto(event.target.value)}
          placeholder="Buscar enlaces, notas o archivos…"
          autoComplete="off"
        />
        {texto ? (
          <button
            type="button"
            className="search-clear"
            onClick={() => onTexto('')}
            aria-label="Borrar búsqueda"
            disabled={disabled}
          >
            <IconX size={15} />
          </button>
        ) : null}
      </label>

      <div className="filter-chips" role="group" aria-label="Filtrar por tipo">
        {FILTROS.map((filtro) => (
          <button
            key={filtro.id}
            type="button"
            className={`filter-chip${tipo === filtro.id ? ' active' : ''}`}
            aria-pressed={tipo === filtro.id}
            disabled={disabled}
            onClick={() => onTipo(filtro.id)}
          >
            {filtro.etiqueta}
          </button>
        ))}
      </div>

      {filtrando ? (
        <p className="filter-summary" role="status">
          {visibles} de {total} envíos
        </p>
      ) : null}
    </div>
  )
}
