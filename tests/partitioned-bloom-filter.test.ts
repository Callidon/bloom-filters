import {expect, test, describe} from '@jest/globals'
import PartitionedBloomFilter from 'bloom-filters/bloom/partitioned-bloom-filter'

describe('PartitionedBloomFilter', () => {
  const targetRate = 0.001

  describe('construction', () => {
    test('should add element to the filter', () => {
      const filter = PartitionedBloomFilter.create(15, targetRate)
      filter.add('alice')
      filter.add('bob')
    })

    test('should build a new filter using #from', () => {
      const data = ['alice', 'bob', 'carl']
      const filter = PartitionedBloomFilter.from(data, targetRate)
      expect(filter.has('alice')).toEqual(true)
      expect(filter.has('bob')).toEqual(true)
      expect(filter.has('carl')).toEqual(true)
      expect(filter.rate()).toBeCloseTo(targetRate, 0.1)
    })
  })

  describe('#has', () => {
    const getFilter = () => {
      const filter = PartitionedBloomFilter.create(15, targetRate)
      filter.add('alice')
      filter.add('bob')
      filter.add('carl')
      return filter
    }

    test('should return false for elements that are definitively not in the set', () => {
      const filter = getFilter()
      expect(filter.has('daniel')).toEqual(false)
      expect(filter.has('al')).toEqual(false)
    })

    test('should return true for elements that might be in the set', () => {
      const filter = getFilter()
      expect(filter.has('alice')).toEqual(true)
      expect(filter.has('bob')).toEqual(true)
      expect(filter.has('carl')).toEqual(true)
    })
  })

  describe('#saveAsJSON', () => {
    const getFilter = () => {
      const filter = PartitionedBloomFilter.create(15, targetRate)
      filter.add('alice')
      filter.add('bob')
      filter.add('carl')
      return filter
    }

    test('should export a partitioned bloom filter to a JSON object', () => {
      const filter = getFilter()
      const exported = filter.saveAsJSON()
      expect(exported._bits).toEqual(filter._bits)
      expect(exported._k).toEqual(filter._k)
      expect(exported._m).toEqual(filter._m)
      expect(exported._errorRate).toEqual(filter._errorRate)
      expect(exported._filter).toEqual(filter._filter.map(f => f.export()))
    })

    test('should create a partitioned bloom filter from a JSON export', () => {
      const filter = getFilter()
      const exported = filter.saveAsJSON()
      const newFilter = PartitionedBloomFilter.fromJSON(exported)
      expect(newFilter.seed).toEqual(filter.seed)
      expect(newFilter._bits).toEqual(filter._bits)
      expect(newFilter._errorRate).toEqual(filter._errorRate)
      expect(newFilter._m).toEqual(filter._m)
      expect(newFilter._k).toEqual(filter._k)
      expect(newFilter._filter).toEqual(filter._filter)
    })
  })
  describe('Performance test', () => {
    const max = 10000
    test(`should not return an error when inserting and querying for ${max} elements`, () => {
      const filter = PartitionedBloomFilter.create(max, targetRate)
      for (let i = 0; i < max; ++i) filter.add('' + i)
      for (let i = 0; i < max; ++i) {
        expect(filter.has('' + i)).toEqual(true)
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
      const currentrate = falsePositive / tries
      expect(currentrate).toBeCloseTo(targetRate, targetRate)
    })
  })
})
