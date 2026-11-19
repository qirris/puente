import { describe, expect, it } from 'vitest'
import {
  composeText,
  extensionOf,
  isPdf,
  isPreviewableImage,
  normalizeUrl,
  safeStorageName,
  validateFile,
} from './validation'

describe('normalizeUrl', () => {
  it('acepta enlaces http(s) y los deja igual', () => {
    expect(normalizeUrl('https://ejemplo.com/ruta?a=1')).toBe(
      'https://ejemplo.com/ruta?a=1',
    )
  })

  it('añade https:// a dominios y a www', () => {
    expect(normalizeUrl('ejemplo.com')).toBe('https://ejemplo.com/')
    expect(normalizeUrl('www.ejemplo.com/ruta')).toBe(
      'https://www.ejemplo.com/ruta',
    )
  })

  it('rechaza texto, espacios y protocolos que no son http(s)', () => {
    expect(normalizeUrl('')).toBeNull()
    expect(normalizeUrl('hola mundo')).toBeNull()
    expect(normalizeUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeUrl('ftp://ejemplo.com')).toBeNull()
  })
})

describe('composeText', () => {
  it('clasifica los enlaces como link', () => {
    expect(composeText('  https://ejemplo.com  ')).toEqual({
      kind: 'link',
      content: 'https://ejemplo.com/',
    })
  })

  it('clasifica el resto como texto y recorta los extremos', () => {
    expect(composeText('  recuerda comprar leche  ')).toEqual({
      kind: 'text',
      content: 'recuerda comprar leche',
    })
  })

  it('rechaza el texto vacío y el demasiado largo', () => {
    expect(composeText('   ')).toBeNull()
    expect(composeText('a'.repeat(10_001))).toBeNull()
  })
})

describe('validateFile', () => {
  it('acepta un archivo pequeño', () => {
    const archivo = new File(['abc'], 'nota.txt', { type: 'text/plain' })
    expect(validateFile(archivo)).toBeNull()
  })

  it('rechaza un archivo vacío', () => {
    const archivo = new File([], 'vacio.txt')
    expect(validateFile(archivo)).toBe('El archivo está vacío.')
  })

  it('rechaza un archivo mayor de 20 MB con el mensaje en español', () => {
    const archivo = new File(['x'], 'grande.bin')
    Object.defineProperty(archivo, 'size', { value: 21 * 1024 * 1024 })
    expect(validateFile(archivo)).toContain('el máximo es 20 MB')
  })
})

describe('utilidades de archivo', () => {
  it('limpia los nombres para almacenarlos', () => {
    expect(safeStorageName('Mi foto verano.PNG')).toBe('Mi-foto-verano.PNG')
    expect(safeStorageName('///')).toBe('archivo')
  })

  it('reconoce imágenes y PDF', () => {
    expect(isPreviewableImage('image/png')).toBe(true)
    expect(isPreviewableImage('application/pdf')).toBe(false)
    expect(isPdf('application/pdf')).toBe(true)
  })

  it('extrae la extensión sin puntos raros', () => {
    expect(extensionOf('foto.JPG')).toBe('JPG')
    expect(extensionOf('sin_extension')).toBe('')
    expect(extensionOf('archivo.')).toBe('')
  })
})
