/* file : partitioned-bloom-filter-test.js
MIT License

Copyright (c) 2017 Thomas Minier & Arnaud Grall

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { expect, describe, test } from '@jest/globals'
import { PartitionedBloomFilter } from '../src/api'

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
            expect(filter.has('alice')).toBe(true)
            expect(filter.has('bob')).toBe(true)
            expect(filter.has('carl')).toBe(true)
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
            expect(filter.has('daniel')).toBe(false)
            expect(filter.has('al')).toBe(false)
        })

        test('should return true for elements that might be in the set', () => {
            const filter = getFilter()
            expect(filter.has('alice')).toBe(true)
            expect(filter.has('bob')).toBe(true)
            expect(filter.has('carl')).toBe(true)
        })
    })

    describe('#equals', () => {
        test('should returns True when two filters are equals', () => {
            const first = PartitionedBloomFilter.from(
                ['alice', 'bob', 'carol'],
                targetRate,
                0.5
            )
            const other = PartitionedBloomFilter.from(
                ['alice', 'bob', 'carol'],
                targetRate,
                0.5
            )
            expect(first.equals(other)).toBe(true)
        })

        test('should returns False when two filters have different sizes', () => {
            const first = new PartitionedBloomFilter(15, 4, 0.5)
            const other = new PartitionedBloomFilter(10, 4, 0.5)
            expect(first.equals(other)).toBe(false)
        })

        test('should returns False when two filters have different nb. of hash functions', () => {
            const first = new PartitionedBloomFilter(15, 4, 0.5)
            const other = new PartitionedBloomFilter(15, 2, 0.5)
            expect(first.equals(other)).toBe(false)
        })

        test('should returns False when two filters have different load factor', () => {
            const first = new PartitionedBloomFilter(15, 4, 0.5)
            const other = new PartitionedBloomFilter(15, 2, 0.4)
            expect(first.equals(other)).toBe(false)
        })

        test('should returns False when two filters have different content', () => {
            const first = PartitionedBloomFilter.from(
                ['alice', 'bob', 'carol'],
                targetRate,
                0.5
            )
            const other = PartitionedBloomFilter.from(
                ['alice', 'bob', 'daniel'],
                targetRate,
                0.5
            )
            expect(first.equals(other)).toBe(false)
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
            expect(exported._capacity).toEqual(15)
            expect(exported._size).toEqual(filter._size)
            expect(exported._loadFactor).toEqual(filter._loadFactor)
            expect(exported._nbHashes).toEqual(filter._nbHashes)
            expect(exported._filter).toEqual(
                filter._filter.map(f => f.export())
            )
        })

        test('should create a partitioned bloom filter from a JSON export', () => {
            const filter = getFilter()
            const exported = filter.saveAsJSON()
            const newFilter = PartitionedBloomFilter.fromJSON(exported)
            expect(newFilter.seed).toEqual(filter.seed)
            expect(newFilter._capacity).toEqual(filter._capacity)
            expect(newFilter._size).toEqual(filter._size)
            expect(newFilter._loadFactor).toEqual(filter._loadFactor)
            expect(newFilter._m).toEqual(filter._m)
            expect(newFilter._nbHashes).toEqual(filter._nbHashes)
            expect(newFilter._filter).toEqual(filter._filter)
        })
    })
    describe('Performance test', () => {
        const max = 1000
        test(`should not return an error when inserting and querying for ${max} elements`, () => {
            const filter = PartitionedBloomFilter.create(max, targetRate, 0.5)
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
            const currentrate = falsePositive / tries
            expect(currentrate).toBeCloseTo(targetRate, targetRate)
        })
    })
})
