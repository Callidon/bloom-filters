import './bootstrap.mjs'
import { expect, test } from '@jest/globals'
import { ScalableBloomFilter } from '../src/api.mjs'
const targetRate = 0.1
const seed = Math.random()
test('should #add add elements without error', () => {
    const filter = ScalableBloomFilter.create(3, targetRate)
    filter.seed = seed
    filter.add('alice')
    filter.add('bob')
    filter.add('carl')
    expect(filter.seed).toBeDefined()
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
    const filter = ScalableBloomFilter.create(1, targetRate)
    filter.seed = seed
    filter.add('alice')
    filter.add('bob')
    filter.add('carl')
    expect(filter._filters.length).toEqual(2)
    for (let i = 0; i < 1024; i++) {
        filter.add('elem:' + i.toString())
    }
    expect(filter.has('alice')).toBe(true)
    expect(filter.has('bob')).toBe(true)
    expect(filter.has('carl')).toBe(true)
    for (let i = 0; i < 1024; i++) {
        expect(filter.has('elem:' + i.toString())).toBe(true)
    }
    expect(filter.has('elem:1025')).toBe(false)
    expect(filter.seed).toBeDefined()
    filter._filters.forEach(f => {
        expect(f.seed).toBeDefined()
    })
    expect(filter._filters.length).toEqual(10)
})

test('should import/export correctly', () => {
    const filter = ScalableBloomFilter.create(1, targetRate)
    filter.seed = seed
    for (let i = 0; i < 50; i++) {
        filter.add('elem:' + i.toString())
    }
    const exported = filter.saveAsJSON()
    const imported = ScalableBloomFilter.fromJSON(exported)
    expect(imported.seed).toEqual(filter.seed)
    expect(imported.equals(filter)).toBe(true)
    for (let i = 0; i < 50; i++) {
        expect(imported.has('elem:' + i.toString())).toBe(true)
    }
})

const max = 1000
const targetedRate = 0.01
test(`should not return an error when inserting ${max.toString()} elements`, () => {
    const filter = ScalableBloomFilter.create(max, targetedRate)
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
    const currentRate = falsePositive / tries
    expect(currentRate).toBeCloseTo(targetedRate, targetedRate)
})
