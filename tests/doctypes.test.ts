import { describe, it, expect } from 'vitest'
import {
  getDoctypesMap,
  getDoctypes,
  getDoctype,
  getDoctypeIds,
  isDoctypeValid,
  getDoctypesByCategory,
  getCategories,
  getVisibleFieldKeys,
  getDocumentDefaults,
  isRecurring,
  isMultiInstanceDocType,
  applyDefaults,
  getDoctypesLegacyFormat,
} from '../src/doctypes'

describe('doctypes', () => {
  describe('getDoctypesMap', () => {
    it('returns an object with doctype IDs as keys', () => {
      const map = getDoctypesMap()
      expect(typeof map).toBe('object')
      expect(Object.keys(map).length).toBeGreaterThan(0)
    })

    it('each doctype has required properties', () => {
      const map = getDoctypesMap()
      const firstDoctype = Object.values(map)[0]
      expect(firstDoctype).toHaveProperty('label')
      expect(firstDoctype).toHaveProperty('category')
      expect(firstDoctype).toHaveProperty('definition')
      expect(firstDoctype).toHaveProperty('instructions')
      expect(firstDoctype).toHaveProperty('fields')
      expect(firstDoctype).toHaveProperty('fieldDefs')
      expect(firstDoctype).toHaveProperty('visibleFields')
      expect(firstDoctype).toHaveProperty('freq')
      expect(firstDoctype).toHaveProperty('count')
    })

    it('cedula-identidad exists and has parts', () => {
      const map = getDoctypesMap()
      expect(map['cedula-identidad']).toBeDefined()
      expect(map['cedula-identidad'].parts).toEqual(['Frente', 'Revés'])
    })
  })

  describe('getDoctypes', () => {
    it('returns sorted array with ID included', () => {
      const doctypes = getDoctypes()
      expect(Array.isArray(doctypes)).toBe(true)
      expect(doctypes.length).toBeGreaterThan(0)
      expect(doctypes[0]).toHaveProperty('id')

      // Verify sorted by label
      for (let i = 1; i < doctypes.length; i++) {
        expect(doctypes[i].label.localeCompare(doctypes[i - 1].label)).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('getDoctype', () => {
    it('returns doctype by ID', () => {
      const doctype = getDoctype('cedula-identidad')
      expect(doctype).not.toBeNull()
      expect(doctype?.id).toBe('cedula-identidad')
      expect(doctype?.label).toBeDefined()
    })

    it('returns null for non-existent ID', () => {
      expect(getDoctype('non-existent-id')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(getDoctype('')).toBeNull()
    })
  })

  describe('getDoctypeIds', () => {
    it('returns array of non-empty string IDs', () => {
      const ids = getDoctypeIds()
      expect(Array.isArray(ids)).toBe(true)
      expect(ids.length).toBeGreaterThan(0)
      ids.forEach(id => {
        expect(typeof id).toBe('string')
        expect(id.length).toBeGreaterThan(0)
      })
    })
  })

  describe('isDoctypeValid', () => {
    it('returns true for valid doctype ID', () => {
      expect(isDoctypeValid('cedula-identidad')).toBe(true)
    })

    it('returns false for invalid doctype ID', () => {
      expect(isDoctypeValid('invalid-doctype-id')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isDoctypeValid('')).toBe(false)
    })
  })

  describe('getDoctypesByCategory', () => {
    it('returns doctypes filtered by category', () => {
      const categories = getCategories()
      if (categories.length > 0) {
        const filtered = getDoctypesByCategory(categories[0])
        expect(Array.isArray(filtered)).toBe(true)
        filtered.forEach(dt => {
          expect(dt.category).toBe(categories[0])
        })
      }
    })

    it('returns empty array for non-existent category', () => {
      expect(getDoctypesByCategory('non-existent-category')).toEqual([])
    })
  })

  describe('getCategories', () => {
    it('returns unique categories', () => {
      const categories = getCategories()
      expect(Array.isArray(categories)).toBe(true)
      const unique = new Set(categories)
      expect(categories.length).toBe(unique.size)
    })
  })

  describe('getVisibleFieldKeys', () => {
    it('returns visible fields for valid doctype', () => {
      const keys = getVisibleFieldKeys('cedula-identidad')
      expect(Array.isArray(keys)).toBe(true)
    })

    it('returns empty array for non-existent doctype', () => {
      expect(getVisibleFieldKeys('non-existent')).toEqual([])
    })
  })

  describe('getDocumentDefaults', () => {
    it('returns freq and count for valid doctype', () => {
      const defaults = getDocumentDefaults('cedula-identidad')
      expect(defaults).toHaveProperty('freq')
      expect(defaults).toHaveProperty('count')
    })

    it('returns once/1 for non-existent doctype', () => {
      const defaults = getDocumentDefaults('non-existent')
      expect(defaults).toEqual({ freq: 'once', count: 1 })
    })
  })

  describe('isRecurring', () => {
    it('returns false for once-type doctypes', () => {
      expect(isRecurring('cedula-identidad')).toBe(false)
    })
  })

  describe('isMultiInstanceDocType', () => {
    it('returns false for non-multi-instance types', () => {
      expect(isMultiInstanceDocType('cedula-identidad')).toBe(false)
    })
  })

  describe('applyDefaults', () => {
    it('applies defaults for missing values', () => {
      const result = applyDefaults({
        'cedula-identidad': {},
      })
      expect(result['cedula-identidad'].freq).toBeDefined()
      expect(result['cedula-identidad'].count).toBeGreaterThan(0)
    })

    it('preserves valid overrides', () => {
      const result = applyDefaults({
        'cedula-identidad': { freq: 'monthly', count: 3 },
      })
      expect(result['cedula-identidad'].freq).toBe('monthly')
      expect(result['cedula-identidad'].count).toBe(3)
    })

    it('passes through periodstart unchanged', () => {
      const result = applyDefaults({
        'periodstart': { freq: 'once', count: 1 } as any,
      })
      expect(result['periodstart']).toBeDefined()
    })
  })

  describe('getDoctypesLegacyFormat', () => {
    it('returns array with required fields', () => {
      const legacy = getDoctypesLegacyFormat()
      expect(Array.isArray(legacy)).toBe(true)
      expect(legacy.length).toBeGreaterThan(0)
      const first = legacy[0]
      expect(first).toHaveProperty('id')
      expect(first).toHaveProperty('label')
      expect(first).toHaveProperty('definition')
      expect(first).toHaveProperty('instructions')
      expect(first).toHaveProperty('fields')
    })
  })
})
