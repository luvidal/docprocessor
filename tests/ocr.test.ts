import { describe, it, expect } from 'vitest'
import { parseRawDocs, normalizeDoc } from '../src/ocr'

describe('ocr', () => {
  describe('parseRawDocs', () => {
    it('parses standard documents wrapper', () => {
      const result = parseRawDocs('{"documents": [{"id": "cedula-identidad", "data": {}}]}')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('cedula-identidad')
    })

    it('parses raw array', () => {
      const result = parseRawDocs('[{"id": "cedula-identidad"}, {"id": "liquidacion-sueldo"}]')
      expect(result).toHaveLength(2)
    })

    it('parses nested documents pattern', () => {
      const result = parseRawDocs('[{"documents": [{"id": "a"}]}, {"documents": [{"id": "b"}]}]')
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('a')
      expect(result[1].id).toBe('b')
    })

    it('parses single object with id', () => {
      const result = parseRawDocs('{"id": "cedula-identidad", "data": {"rut": "12.345.678-9"}}')
      expect(result).toHaveLength(1)
    })

    it('parses single object with doctypeid', () => {
      const result = parseRawDocs('{"doctypeid": "cedula-identidad"}')
      expect(result).toHaveLength(1)
    })

    it('strips markdown fences', () => {
      const result = parseRawDocs('```json\n{"documents": [{"id": "test"}]}\n```')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('test')
    })

    it('returns empty array for empty input', () => {
      expect(parseRawDocs('')).toEqual([])
    })

    it('returns empty array for non-document JSON', () => {
      expect(parseRawDocs('{"key": "value"}')).toEqual([])
    })

    it('recovers complete objects from truncated JSON', () => {
      // Simulate truncated response: first object complete, second cut off
      const result = parseRawDocs('[{"id": "cedula-identidad", "data": {"rut": "123"}}, {"id": "liquidacion-sueldo", "dat')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('cedula-identidad')
    })

    it('recovers from completely broken JSON with valid objects inside', () => {
      const result = parseRawDocs('some garbage {"id": "test-doc", "data": {}} more garbage')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('test-doc')
    })
  })

  describe('normalizeDoc', () => {
    it('extracts id from various fields', () => {
      expect(normalizeDoc({ id: 'test' }).id).toBe('test')
      expect(normalizeDoc({ doctypeid: 'test' }).id).toBe('test')
    })

    it('extracts data from data field', () => {
      const result = normalizeDoc({ id: 'test', data: { rut: '123' } })
      expect(result.data).toEqual({ rut: '123' })
    })

    it('extracts flat data when no data field', () => {
      const result = normalizeDoc({ id: 'test', rut: '123', nombre: 'Juan' })
      expect(result.data).toEqual({ rut: '123', nombre: 'Juan' })
    })

    it('extracts docdate from various fields', () => {
      expect(normalizeDoc({ id: 'test', docdate: '2024-01-15' }).docdate).toBe('2024-01-15')
      expect(normalizeDoc({ id: 'test', document_date: '2024-01-15' }).docdate).toBe('2024-01-15')
      expect(normalizeDoc({ id: 'test', documentDate: '2024-01-15' }).docdate).toBe('2024-01-15')
    })

    it('extracts page numbers', () => {
      const result = normalizeDoc({ id: 'test', start: 1, end: 3 })
      expect(result.start).toBe(1)
      expect(result.end).toBe(3)
    })

    it('parses string page numbers', () => {
      const result = normalizeDoc({ id: 'test', start: '2', end: '5' })
      expect(result.start).toBe(2)
      expect(result.end).toBe(5)
    })

    it('extracts partId from various fields', () => {
      expect(normalizeDoc({ id: 'test', partId: 'front' }).partId).toBe('front')
      expect(normalizeDoc({ id: 'test', part_id: 'back' }).partId).toBe('back')
      expect(normalizeDoc({ id: 'test', partid: 'front' }).partId).toBe('front')
    })

    it('handles null/undefined input', () => {
      const result = normalizeDoc(null)
      expect(result.id).toBeNull()
      expect(result.data).toEqual({})
    })

    it('excludes meta keys from flat data', () => {
      const result = normalizeDoc({
        id: 'test',
        label: 'Test',
        start: 1,
        end: 1,
        rut: '123',
      })
      expect(result.data).toEqual({ rut: '123' })
      expect(result.data).not.toHaveProperty('label')
      expect(result.data).not.toHaveProperty('start')
    })
  })
})
