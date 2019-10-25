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

'use strict'

require('chai').should()
const CountingBloomFilter = require('../src/counting-bloom-filter.js')

describe('CountingBloomFilter', () => {
  const targetRate = 0.1
  const seed = Math.random()

  describe('construction', () => {
    it('should add element to the filter with #add', () => {
      const filter = CountingBloomFilter.create(15, targetRate)
      filter.seed = seed
      filter.add('alice')
      filter.add('bob')
      filter.length.should.equal(2)
    })

    it('should build a new filter using #from', () => {
      const data = ['alice', 'bob', 'carl']
      const expectedSize = Math.ceil(-((data.length * Math.log(targetRate)) / Math.pow(Math.log(2), 2)))
      const expectedHashes = Math.ceil((expectedSize / data.length) * Math.log(2))
      const filter = CountingBloomFilter.from(data, targetRate, seed)
      filter.size.should.equal(expectedSize)
      filter._nbHashes.should.equal(expectedHashes)
      filter.length.should.equal(data.length)
      filter.rate().should.be.closeTo(targetRate, 0.1)
    })
  })

  describe('#has', () => {
    const filter = CountingBloomFilter.from(['alice', 'bob', 'carl'], targetRate, seed)
    it('should return false for elements that are definitively not in the set', () => {
      filter.has('daniel').should.equal(false)
      filter.has('al').should.equal(false)
    })

    it('should return true for elements that might be in the set', () => {
      filter.has('alice').should.equal(true)
      filter.has('bob').should.equal(true)
      filter.has('carl').should.equal(true)
    })
  })

  describe('#delete', () => {
    it('should allow deletion of items', () => {
      const filter = CountingBloomFilter.from(['alice', 'bob', 'carl'], targetRate, seed)
      filter.delete('bob')
      filter.has('alice').should.equal(true)
      filter.has('bob').should.equal(false)
      filter.has('carl').should.equal(true)
    })
  })

  describe('#saveAsJSON', () => {
    const filter = CountingBloomFilter.from(['alice', 'bob', 'carl'], targetRate, seed)
    it('should export a bloom filter to a JSON object', () => {
      const exported = filter.saveAsJSON()
      exported._seed.should.equal(filter.seed)
      exported.type.should.equal('CountingBloomFilter')
      exported._size.should.equal(filter.size)
      exported._length.should.equal(filter.length)
      exported._nbHashes.should.equal(filter._nbHashes)
      exported._filter.should.deep.equal(filter._filter)
    })

    it('should create a bloom filter from a JSON export', () => {
      const exported = filter.saveAsJSON()
      const newFilter = CountingBloomFilter.fromJSON(exported)
      newFilter.seed.should.equal(seed)
      newFilter.size.should.equal(filter._size)
      newFilter.length.should.equal(filter._length)
      newFilter._nbHashes.should.equal(filter._nbHashes)
      newFilter._filter.should.deep.equal(filter._filter)
    })

    it('should reject imports from invalid JSON objects', () => {
      const invalids = [
        { type: 'something' },
        { type: 'CountingBloomFilter' },
        { type: 'CountingBloomFilter', size: 1 },
        { type: 'CountingBloomFilter', size: 1, length: 1 },
        { type: 'CountingBloomFilter', size: 1, length: 1, nbHashes: 2 },
        { type: 'CountingBloomFilter', size: 1, length: 1, nbHashes: 2, seed: 1 }
      ]

      invalids.forEach(json => {
        (() => CountingBloomFilter.fromJSON(json)).should.throw(Error, 'Cannot create a CountingBloomFilter from a JSON export which does not represent a bloom filter')
      })
    })
  })

  describe('Performance test', () => {
    const max = 1000
    const targetedRate = 0.01
    it('should not return an error when inserting ' + max + ' elements', () => {
      const filter = CountingBloomFilter.create(max, targetedRate)
      for (let i = 0; i < max; ++i) filter.add('' + i)
      for (let i = 0; i < max; ++i) {
        filter.has('' + i).should.equal(true)
      }
      let current
      let falsePositive = 0
      let tries = 0
      for (let i = max; i < max * 11; ++i) {
        tries++
        current = i
        const has = filter.has('' + current, true)
        if (has) falsePositive++
      }
      const currentrate = falsePositive / tries
      console.log('CountingBloomFilter false positive rate on %d tests: ', tries, currentrate)
      currentrate.should.be.closeTo(targetedRate, targetedRate)
    })
  })
})
