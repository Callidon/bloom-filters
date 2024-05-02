import './bootstrap'
import { BloomFilter } from '../src/api'
import { expect, describe, test } from '@jest/globals'

const targetRate = 0.1
const seed = Math.random()

test('should add element to the filter with #add', () => {
    const filter = BloomFilter.create(15, targetRate)
    filter.seed = seed
    filter.add('alice')
    filter.add('bob')
    filter.add('alice') // duplicate item
    expect(filter.length).toBeGreaterThan(0)
    expect(filter.length).toBeLessThanOrEqual(filter._nbHashes * 2)
})

test('should build a new filter using #from', () => {
    const data = ['alice', 'bob', 'carl']
    const expectedSize = Math.ceil(
        -((data.length * Math.log(targetRate)) / Math.pow(Math.log(2), 2))
    )
    const expectedHashes = Math.ceil((expectedSize / data.length) * Math.log(2))
    const filter = BloomFilter.from(data, targetRate)
    expect(filter.size).toEqual(expectedSize)
    expect(filter._nbHashes).toEqual(expectedHashes)
    expect(filter.length).toBeGreaterThan(0)
    expect(filter.length).toBeLessThanOrEqual(filter._nbHashes * data.length)
    expect(filter.rate()).toBeCloseTo(targetRate, 0.1)
    expect(filter.seed).toEqual(0x1234567890) // utils.getDefaultSeed()
})

const getFilter = () => BloomFilter.from(['alice', 'bob', 'carl'], targetRate)
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

test('should returns True when two filters are equals', () => {
    const first = BloomFilter.from(['alice', 'bob', 'carol'], targetRate)
    const other = BloomFilter.from(['alice', 'bob', 'carol'], targetRate)
    expect(first.equals(other)).toBe(true)
})

test('should returns False when two filters have different sizes', () => {
    const first = new BloomFilter(15, 4)
    const other = new BloomFilter(10, 4)
    expect(first.equals(other)).toBe(false)
})

test('should returns False when two filters have different nb. of hash functions', () => {
    const first = new BloomFilter(15, 4)
    const other = new BloomFilter(15, 2)
    expect(first.equals(other)).toBe(false)
})

test('should returns False when two filters have different content', () => {
    const first = BloomFilter.from(['alice', 'bob', 'carol'], targetRate)
    const other = BloomFilter.from(['alice', 'bob', 'daniel'], targetRate)
    expect(first.equals(other)).toBe(false)
})

function buildFilter() {
    return BloomFilter.from(['alice', 'bob', 'carl'], targetRate, seed)
}
test('should export a bloom filter to a JSON object', () => {
    const filter = buildFilter()
    const exported = filter.saveAsJSON()
    expect(exported._seed).toEqual(filter.seed)
    expect(exported._size).toEqual(filter.size)
    expect(exported._nbHashes).toEqual(filter._nbHashes)
    expect(exported._filter).toEqual(filter._filter.export())
})

test('should create a bloom filter from a JSON export', () => {
    const filter = buildFilter()
    const exported = filter.saveAsJSON()
    // simulate serialization
    const serialized = JSON.stringify(exported)
    // simulate deserialization
    const deserialized = JSON.parse(serialized)
    const newFilter = BloomFilter.fromJSON(deserialized)
    expect(newFilter.seed).toEqual(filter.seed)
    expect(newFilter.size).toEqual(filter._size)
    expect(newFilter._filter).toEqual(filter._filter)
})

const max = 1000
const targetedRate = 0.01
test(`should not return an error when inserting ${max} elements`, () => {
    const filter = BloomFilter.create(max, targetedRate)
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
