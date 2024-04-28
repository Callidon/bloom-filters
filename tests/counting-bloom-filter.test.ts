/* file : counting-bloom-filter-test.js
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

import CountingBloomFilter from '../src/bloom/counting-bloom-filter'
import {expect, describe, test} from '@jest/globals'

describe('CountingBloomFilter', () => {
    const targetRate = 0.1

    describe('construction', () => {
        test('should add element to the filter with #add', () => {
            const filter = CountingBloomFilter.create(15, targetRate)
            filter.add('alice')
            filter.add('bob')
            expect(filter.length).toEqual(2)
        })

        test('should build a new filter using #from', () => {
            const data = ['alice', 'bob', 'carl']
            const expectedSize = Math.ceil(
                -(
                    (data.length * Math.log(targetRate)) /
                    Math.pow(Math.log(2), 2)
                )
            )
            const expectedHashes = Math.ceil(
                (expectedSize / data.length) * Math.log(2)
            )
            const filter = CountingBloomFilter.from(data, targetRate)
            expect(filter.size).toEqual(expectedSize)
            expect(filter._nbHashes).toEqual(expectedHashes)
            expect(filter.length).toEqual(data.length)
            expect(filter.rate()).toBeCloseTo(targetRate, 0.1)
        })
    })

    describe('#has', () => {
        const getFilter = () =>
            CountingBloomFilter.from(['alice', 'bob', 'carl'], targetRate)
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

    describe('#remove', () => {
        test('should allow deletion of items', () => {
            const filter = CountingBloomFilter.from(
                ['alice', 'bob', 'carl'],
                targetRate
            )
            filter.remove('bob')
            expect(filter.has('alice')).toEqual(true)
            expect(filter.has('bob')).toEqual(false)
            expect(filter.has('carl')).toEqual(true)
        })
    })

    describe('#equals', () => {
        test('should returns True when two filters are equals', () => {
            const first = CountingBloomFilter.from(
                ['alice', 'bob', 'carol'],
                targetRate
            )
            const other = CountingBloomFilter.from(
                ['alice', 'bob', 'carol'],
                targetRate
            )
            expect(first.equals(other)).toEqual(true)
        })

        test('should returns False when two filters have different sizes', () => {
            const first = new CountingBloomFilter(15, 4)
            const other = new CountingBloomFilter(10, 4)
            expect(first.equals(other)).toEqual(false)
        })

        test('should returns False when two filters have different nb. of hash functions', () => {
            const first = new CountingBloomFilter(15, 4)
            const other = new CountingBloomFilter(15, 2)
            expect(first.equals(other)).toEqual(false)
        })

        test('should returns False when two filters have different content', () => {
            const first = CountingBloomFilter.from(
                ['alice', 'bob', 'carol'],
                targetRate
            )
            const other = CountingBloomFilter.from(
                ['alice', 'bob', 'daniel'],
                targetRate
            )
            expect(first.equals(other)).toEqual(false)
        })
    })

    describe('#saveAsJSON', () => {
        const getFilter = () =>
            CountingBloomFilter.from(['alice', 'bob', 'carl'], targetRate)
        test('should export a bloom filter to a JSON object', () => {
            const filter = getFilter()
            const exported = filter.saveAsJSON()
            expect(exported._seed).toEqual(filter.seed)
            expect(exported._size).toEqual(filter.size)
            expect(exported._length).toEqual(filter.length)
            expect(exported._nbHashes).toEqual(filter._nbHashes)
            expect(exported._filter).toEqual(filter._filter)
        })

        test('should create a bloom filter from a JSON export', () => {
            const filter = getFilter()
            const exported = filter.saveAsJSON()
            const newFilter = CountingBloomFilter.fromJSON(exported)
            expect(newFilter.seed).toEqual(filter.seed)
            expect(newFilter.size).toEqual(filter._size)
            expect(newFilter.length).toEqual(filter._length)
            expect(newFilter._nbHashes).toEqual(filter._nbHashes)
            expect(newFilter._filter).toEqual(filter._filter)
        })
    })

    describe('Performance test', () => {
        const max = 1000
        const targetedRate = 0.01
        test(
            'should not return an error when inserting ' + max + ' elements',
            () => {
                const filter = CountingBloomFilter.create(max, targetedRate)
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
                expect(currentrate).toBeCloseTo(targetedRate, targetedRate)
            }
        )
    })
})
