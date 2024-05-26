import { expect, test } from '@jest/globals'
import { PartitionedBloomFilter } from '../src/index'
import Global from './global'

const seed = 6764197776779098n // Global.seed(__filename)

const targetRate = 0.001
test('should add element to the filter', () => {
    const filter = PartitionedBloomFilter.create(15, targetRate)
    filter.seed = seed
    filter.add('alice')
    filter.add('bob')
})

test('should build a new filter using #from', () => {
    const data = ['alice', 'bob', 'carl']
    const filter = PartitionedBloomFilter.from(data, targetRate, seed)
    expect(filter.has('alice')).toBe(true)
    expect(filter.has('bob')).toBe(true)
    expect(filter.has('carl')).toBe(true)
    expect(filter.rate()).toBeCloseTo(targetRate, 0.1)
})
const getFilter = () => {
    const filter = PartitionedBloomFilter.create(15, targetRate)
    filter.seed = seed
    filter.add('alice')
    filter.add('bob')
    filter.add('carl')
    return filter
}

test('should return false for elements that are definitively not in the set', () => {
    const filter = getFilter()
    expect(filter.has('daniel')).toBe(false)
    expect(filter.has('al')).toBe(false)
})

test('should return true for elements that might be in the set', () => {
    const filter = getFilter()
    expect(filter.has('alice')).toBe(true)
    expect(filter.has('bob')).toBe(true)
    expect(filter.has('carl')).toBe(true)
})

const getFilter2 = () => {
    const filter = PartitionedBloomFilter.create(15, targetRate)
    filter.seed = seed
    filter.add('alice')
    filter.add('bob')
    filter.add('carl')
    return filter
}

test('should export a partitioned bloom filter to a JSON object', () => {
    const filter = getFilter2()
    const exported = filter.saveAsJSON()
    expect(exported._bits).toEqual(filter._bits)
    expect(exported._nbHashes).toEqual(filter._k)
    expect(exported._filter).toEqual(filter._filter.map(f => f.export()))
})

test('should create a partitioned bloom filter from a JSON export', () => {
    const filter = getFilter2()
    const exported = filter.saveAsJSON()
    const newFilter = PartitionedBloomFilter.fromJSON(exported)
    expect(newFilter.seed).toEqual(filter.seed)
    expect(newFilter._bits).toEqual(filter._bits)
    expect(newFilter._m).toEqual(filter._m)
    expect(newFilter._k).toEqual(filter._k)
    expect(newFilter._filter).toEqual(filter._filter)
})

const max = 1000
test(`should not return an error when inserting and querying for ${max.toString()} elements`, () => {
    const filter = PartitionedBloomFilter.create(max, targetRate)
    filter.seed = seed
    for (let i = 0; i < max; ++i) filter.add(i.toString())
    for (let i = 0; i < max; ++i) {
        expect(filter.has(i.toString())).toBe(true)
    }
    let current
    let falsePositive = 0
    let tries = 0
    for (let i = max; i < max * 11; ++i) {
        tries++
        current = i
        const has = filter.has(current.toString())
        if (has) falsePositive++
    }
    const currentrate = falsePositive / tries
    expect(currentrate).toBeCloseTo(targetRate, targetRate)
})
