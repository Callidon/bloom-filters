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

'use strict'

require('chai').should()
const PartitionedBloomFilter = require('../src/partitioned-bloom-filter.js')

describe('PartitionedBloomFilter', () => {
  const targetRate = 0.001

  describe('construction', () => {
    it('should add element to the filter with #add', () => {
      const filter = PartitionedBloomFilter.create(15, targetRate)
      filter.add('alice')
      filter.add('bob')
      filter.length.should.equal(2)
    })

    it('should build a new filter using #from', () => {
      const data = ['alice', 'bob', 'carl']
      const expectedSize = PartitionedBloomFilter._computeOptimalNumberOfCells(data.length, targetRate)
      const expectedHashes = PartitionedBloomFilter._computeOptimalNumberOfhashes(targetRate)
      const filter = PartitionedBloomFilter.from(data, targetRate)
      filter.size.should.equal(expectedSize)
      filter._nbHashes.should.equal(expectedHashes)
      filter.length.should.equal(data.length)
      filter.rate().should.be.closeTo(targetRate, 0.1)
    })
  })

  describe('#has', () => {
    const filter = PartitionedBloomFilter.create(15, targetRate)
    filter.add('alice')
    filter.add('bob')
    filter.add('carl')

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

  describe('#saveAsJSON', () => {
    const filter = PartitionedBloomFilter.create(15, targetRate)
    filter.add('alice')
    filter.add('bob')
    filter.add('carl')

    it('should export a partitioned bloom filter to a JSON object', () => {
      const exported = filter.saveAsJSON()
      exported.type.should.equal('PartitionedBloomFilter')
      exported._capacity.should.equal(15)
      exported._size.should.equal(filter._size)
      exported._loadFactor.should.equal(filter._loadFactor)
      exported._m.should.equal(filter._m)
      exported._nbHashes.should.equal(filter._nbHashes)
      exported._filter.should.deep.equal(filter._filter)
    })

    it('should create a partitioned bloom filter from a JSON export', () => {
      const exported = filter.saveAsJSON()
      const newFilter = PartitionedBloomFilter.fromJSON(exported)
      newFilter._capacity.should.equal(filter._capacity)
      newFilter._size.should.equal(filter._size)
      newFilter._loadFactor.should.equal(filter._loadFactor)
      newFilter._m.should.equal(filter._m)
      newFilter._nbHashes.should.equal(filter._nbHashes)
      newFilter._filter.should.deep.equal(filter._filter)
    })

    it('should reject imports from invalid JSON objects', () => {
      const invalids = [
        { type: 'something' },
        { type: 'PartitionedBloomFilter' },
        { type: 'PartitionedBloomFilter', capacity: 1 },
        { type: 'PartitionedBloomFilter', capacity: 1, errorRate: 1 }
      ]

      invalids.forEach(json => {
        (() => PartitionedBloomFilter.fromJSON(json)).should.throw(Error, 'Cannot create a PartitionedBloomFilter from a JSON export which does not represent a Partitioned Bloom Filter')
      })
    })
  })
  describe('Performance test', () => {
    const max = 1000
    it('should not return an error when inserting and querying for ' + max + ' elements', () => {
      const filter = PartitionedBloomFilter.create(max, targetRate, 0.5)
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
        const has = filter.has('' + current)
        if (has) falsePositive++
      }
      const currentrate = falsePositive / tries
      console.log('PartitionedBloomFilter false positive rate on %d tests = %d (targeted = %d)', tries, currentrate, targetRate)
      currentrate.should.be.closeTo(targetRate, targetRate)
    })
  })
})
