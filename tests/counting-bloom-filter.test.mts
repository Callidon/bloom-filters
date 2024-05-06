import { expect, test } from '@jest/globals'
import { CountingBloomFilter, exportBigInt } from '../src/index.mjs'

const targetRate = 0.1
test('should add element to the filter with #add', () => {
    const filter = CountingBloomFilter.create(15, targetRate)
    filter.add('alice')
    filter.add('bob')
    expect(filter.length).toEqual(2)
})

test('should build a new filter using #from', () => {
    const data = ['alice', 'bob', 'carl']
    const expectedSize = Math.ceil(
        -((data.length * Math.log(targetRate)) / Math.pow(Math.log(2), 2)),
    )
    const expectedHashes = Math.ceil((expectedSize / data.length) * Math.log(2))
    const filter = CountingBloomFilter.from(data, targetRate)
    expect(filter.size).toEqual(expectedSize)
    expect(filter._nbHashes).toEqual(expectedHashes)
    expect(filter.length).toEqual(data.length)
    expect(filter.rate()).toBeCloseTo(targetRate, 0.1)
})

const getFilter = () => CountingBloomFilter.from(['alice', 'bob', 'carl'], targetRate)
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

test('should allow deletion of items', () => {
    const filter = CountingBloomFilter.from(['alice', 'bob', 'carl'], targetRate)
    filter.remove('bob')
    expect(filter.has('alice')).toBe(true)
    expect(filter.has('bob')).toBe(false)
    expect(filter.has('carl')).toBe(true)
})

test('should returns True when two filters are equals', () => {
    const first = CountingBloomFilter.from(['alice', 'bob', 'carol'], targetRate)
    const other = CountingBloomFilter.from(['alice', 'bob', 'carol'], targetRate)
    expect(first.equals(other)).toBe(true)
})

test('should returns False when two filters have different sizes', () => {
    const first = new CountingBloomFilter(15, 4)
    const other = new CountingBloomFilter(10, 4)
    expect(first.equals(other)).toBe(false)
})

test('should returns False when two filters have different nb. of hash functions', () => {
    const first = new CountingBloomFilter(15, 4)
    const other = new CountingBloomFilter(15, 2)
    expect(first.equals(other)).toBe(false)
})

test('should returns False when two filters have different content', () => {
    const first = CountingBloomFilter.from(['alice', 'bob', 'carol'], targetRate)
    const other = CountingBloomFilter.from(['alice', 'bob', 'daniel'], targetRate)
    expect(first.equals(other)).toBe(false)
})

const getFilter2 = () => CountingBloomFilter.from(['alice', 'bob', 'carl'], targetRate)
test('should export a bloom filter to a JSON object', () => {
    const filter = getFilter2()
    const exported = filter.saveAsJSON()
    expect(exported._seed).toEqual(exportBigInt(filter.seed))
    expect(exported._size).toEqual(filter.size)
    expect(exported._length).toEqual(filter.length)
    expect(exported._nbHashes).toEqual(filter._nbHashes)
    expect(exported._filter).toEqual(filter._filter)
})

test('should create a bloom filter from a JSON export', () => {
    const filter = getFilter2()
    const exported = filter.saveAsJSON()
    const newFilter = CountingBloomFilter.fromJSON(exported)
    expect(newFilter.seed).toEqual(filter.seed)
    expect(newFilter.size).toEqual(filter._size)
    expect(newFilter.length).toEqual(filter._length)
    expect(newFilter._nbHashes).toEqual(filter._nbHashes)
    expect(newFilter._filter).toEqual(filter._filter)
})

const max = 1000
const targetedRate = 0.01
test(`should not return an error when inserting ${max.toString()} elements`, () => {
    const filter = CountingBloomFilter.create(max, targetedRate)
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
    expect(currentrate).toBeCloseTo(targetedRate, targetedRate)
})
