import { describe, expect, it } from 'vitest'
import { filtrarEnvios } from './filtrado'
import type { InboxItem } from './types'

function envio(id: string, cambios: Partial<InboxItem> = {}): InboxItem {
  return {
    id,
    user_id: 'u1',
    kind: 'text',
    content: null,
    storage_path: null,
    file_name: null,
    mime_type: null,
    size_bytes: null,
    pinned: false,
    created_at: '2026-11-19T10:00:00.000Z',
    expires_at: null,
    ...cambios,
  }
}

const envios: InboxItem[] = [
  envio('1', { kind: 'text', content: 'Comprar café en la panadería' }),
  envio('2', { kind: 'link', content: 'https://www.ejemplo.es/noticias' }),
  envio('3', { kind: 'image', content: null, file_name: 'foto de la_playa.jpg', mime_type: 'image/jpeg' }),
  envio('4', { kind: 'file', file_name: 'informe.pdf', mime_type: 'application/pdf' }),
]

describe('filtrarEnvios', () => {
  it('devuelve todos los envíos cuando no hay criterio y no muta la lista', () => {
    const copia = [...envios]
    const resultado = filtrarEnvios(envios, { texto: '', tipo: 'todos' })

    expect(resultado).toHaveLength(4)
    expect(envios).toEqual(copia)
  })

  it('filtra por tipo de envío', () => {
    const resultado = filtrarEnvios(envios, { texto: '', tipo: 'link' })

    expect(resultado.map((item) => item.id)).toEqual(['2'])
  })

  it('encuentra notas sabiendo que su tipo interno es text', () => {
    const resultado = filtrarEnvios(envios, { texto: '', tipo: 'text' })

    expect(resultado.map((item) => item.id)).toEqual(['1'])
  })

  it('busca ignorando mayúsculas y acentos', () => {
    const resultado = filtrarEnvios(envios, { texto: 'CAFE PANADERIA', tipo: 'todos' })

    expect(resultado.map((item) => item.id)).toEqual(['1'])
  })

  it('busca por el nombre del archivo y por su tipo MIME', () => {
    expect(filtrarEnvios(envios, { texto: 'playa', tipo: 'todos' }).map((item) => item.id)).toEqual([
      '3',
    ])
    expect(filtrarEnvios(envios, { texto: 'application/pdf', tipo: 'todos' }).map((item) => item.id)).toEqual([
      '4',
    ])
  })

  it('exige todas las palabras aunque estén en campos distintos', () => {
    const archivo = envio('5', {
      kind: 'file',
      content: 'Reunión del equipo',
      file_name: 'actas.pdf',
    })
    const resultado = filtrarEnvios([...envios, archivo], {
      texto: 'equipo actas',
      tipo: 'todos',
    })

    expect(resultado.map((item) => item.id)).toEqual(['5'])
  })

  it('combina el tipo y el texto de búsqueda', () => {
    const resultado = filtrarEnvios(envios, { texto: 'ejemplo', tipo: 'image' })

    expect(resultado).toEqual([])
    expect(filtrarEnvios(envios, { texto: 'ejemplo', tipo: 'link' }).map((item) => item.id)).toEqual([
      '2',
    ])
  })

  it('devuelve una lista vacía cuando no hay coincidencias', () => {
    expect(filtrarEnvios(envios, { texto: 'inexistente', tipo: 'todos' })).toEqual([])
  })
})
