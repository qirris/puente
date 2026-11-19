import { describe, expect, it } from 'vitest'
import {
  domainOf,
  formatBytes,
  fullDate,
  kindLabel,
  remainingLabel,
  relativeTime,
} from './format'

describe('formatBytes', () => {
  it('devuelve una raya para valores ausentes', () => {
    expect(formatBytes(null)).toBe('—')
    expect(formatBytes(undefined)).toBe('—')
    expect(formatBytes(Number.NaN)).toBe('—')
  })

  it('formatea bytes, kilobytes y megabytes con coma decimal', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(1536)).toBe('1,5 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB')
  })
})

describe('relativeTime', () => {
  const ahora = new Date('2026-11-19T12:00:00Z').getTime()

  it('describe los minutos y las horas', () => {
    expect(relativeTime('2026-11-19T11:59:30Z', ahora)).toBe('ahora mismo')
    expect(relativeTime('2026-11-19T11:58:00Z', ahora)).toBe('hace 2 min')
    expect(relativeTime('2026-11-19T10:00:00Z', ahora)).toBe('hace 2 h')
  })

  it('describe ayer y los días', () => {
    expect(relativeTime('2026-11-18T12:00:00Z', ahora)).toBe('ayer')
    expect(relativeTime('2026-11-16T12:00:00Z', ahora)).toBe('hace 3 días')
  })
})

describe('remainingLabel', () => {
  const ahora = new Date('2026-11-19T12:00:00Z').getTime()

  it('respeta los envíos fijados y sin caducidad', () => {
    expect(remainingLabel(null, true, ahora)).toBe('Sin caducidad')
    expect(remainingLabel(null, false, ahora)).toBe('Sin caducidad')
  })

  it('avisa de los caducados', () => {
    expect(remainingLabel('2026-11-19T11:00:00Z', false, ahora)).toBe('Caducado')
  })

  it('muestra minutos, horas y días', () => {
    expect(remainingLabel('2026-11-19T12:30:00Z', false, ahora)).toBe('Quedan 30 min')
    expect(remainingLabel('2026-11-19T14:00:00Z', false, ahora)).toBe('Quedan 2 h')
    expect(remainingLabel('2026-11-21T12:00:00Z', false, ahora)).toBe('Quedan 2 días')
  })
})

describe('kindLabel y domainOf', () => {
  it('devuelve etiquetas en español', () => {
    expect(kindLabel('link')).toBe('Enlace')
    expect(kindLabel('image')).toBe('Foto')
    expect(kindLabel('text')).toBe('Texto')
    expect(kindLabel('file', 'application/pdf')).toBe('PDF')
    expect(kindLabel('file')).toBe('Archivo')
  })

  it('quita el prefijo www del dominio', () => {
    expect(domainOf('https://www.ejemplo.com/ruta')).toBe('ejemplo.com')
    expect(domainOf('no es una url')).toBe('no es una url')
  })

  it('formatea una fecha completa en español', () => {
    const texto = fullDate('2026-11-19T12:00:00Z')
    expect(texto).toContain('2026')
    expect(texto).toContain('19')
  })
})
