import { useState } from 'react'

interface CodigoUnicoProps {
  codigo: string
  titulo?: string
}

/** Muestra un código de un solo uso con opción de copiarlo. */
export function CodigoUnico({
  codigo,
  titulo = 'Tu código de recuperación',
}: CodigoUnicoProps) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
    } catch {
      // Si el navegador bloquea el portapapeles, el código se puede seleccionar.
      setCopiado(false)
    }
  }

  return (
    <div className="codigo-unico" role="status">
      <p className="codigo-titulo">{titulo}</p>
      <code className="codigo-valor">{codigo}</code>
      <p className="codigo-aviso">
        Guárdalo en un lugar seguro. Solo se muestra ahora, caduca en 1 hora y
        sirve para una sola contraseña nueva.
      </p>
      <button
        type="button"
        className="button button-small button-quiet"
        onClick={() => void copiar()}
      >
        {copiado ? 'Copiado' : 'Copiar código'}
      </button>
    </div>
  )
}
