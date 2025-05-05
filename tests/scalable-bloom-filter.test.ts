import {expect, test, describe} from '@jest/globals'
import ScalableBloomFilter from 'bloom-filters/bloom/scalable-bloom-filter'
import {getNewSeed} from './common'

describe('ScalableBloomFilter', () => {
  const targetRate = 0.1
  const seed = getNewSeed()

  describe('construction', () => {
    test('should #add add elements without error', () => {
      const filter = ScalableBloomFilter.create(3, targetRate)
      filter.seed = seed
      filter.add('alice')
      filter.add('bob')
      filter.add('carl')
    })
    test('should #has return correct values with added values', () => {
      const filter = ScalableBloomFilter.create(3, targetRate)
      filter.seed = seed
      filter.add('alice')
      filter.add('bob')
      filter.add('carl')
      expect(filter.has('alice')).toBe(true)
      expect(filter.has('bob')).toBe(true)
      expect(filter.has('carl')).toBe(true)
      expect(filter.has('somethingwhichdoesnotexist')).toBe(false)
    })

    test('should scale Partitioned Bloom Filter', () => {
      const rate = 0.0001
      const filter = ScalableBloomFilter.create(128, rate)
      filter.seed = seed
      filter.add('alice')
      filter.add('bob')
      filter.add('carl')
      const offset = 1024 * 10
      for (let i = 0; i < offset; i++) {
        filter.add(i.toString())
      }
      expect(filter.has('alice')).toBe(true)
      expect(filter.has('bob')).toBe(true)
      expect(filter.has('carl')).toBe(true)

      // no false negative
      for (let i = 0; i < offset; i++) {
        // should be in!
        expect(filter.has(i.toString())).toBe(true)
      }

      expect(filter._filters.length).toBeGreaterThan(1)

      const rates = filter._filters.map(f => f.rate())

      const globalRate = rates.reduce((a, b) => a + b, 0) / rates.length
      const P = (rate * 1) / (1 - filter._ratio)
      expect(globalRate).toBeLessThan(P)

      const compounded = Math.pow(2, 1 - filter._filters[0]._k)
      const compunded_rates = rates.reduce((a, b) => a * b, 1)
      expect(compunded_rates).toBeLessThanOrEqual(compounded)

      expect(filter.seed).toEqual(seed)
      filter._filters.forEach(f => {
        expect(f.seed).toEqual(seed)
      })
      expect(filter._filters.length).toEqual(6)
    })

    test('should import/export correctly', () => {
      const filter = ScalableBloomFilter.create(1, targetRate)
      filter.seed = seed
      for (let i = 0; i < 50; i++) {
        filter.add('elem:' + i)
      }
      const exported = filter.saveAsJSON()
      const imported = ScalableBloomFilter.fromJSON(exported)
      expect(imported.seed).toEqual(seed)
      for (let i = 0; i < 50; i++) {
        expect(imported.has('elem:' + i)).toBe(true)
      }
    })
  })
  describe('Performance test', () => {
    const max = 1000
    const targetedRate = 0.01
    test(`should not return an error when inserting ${max} elements`, () => {
      const filter = ScalableBloomFilter.create(max, targetedRate)
      for (let i = 0; i < max; ++i) filter.add('' + i)
      for (let i = 0; i < max; ++i) {
        expect(filter.has('' + i)).toBe(true)
      }
      let current
      let falsePositive = 0
      let tries = 0
      for (let i = max; i < max * 11; ++i) {
        tries++
        current = i
        const has = filter.has('' + current)
        if (has) falsePositive++
      }
      const currentRate = falsePositive / tries
      expect(currentRate).toBeCloseTo(targetedRate, targetedRate)
    })
  })
})
