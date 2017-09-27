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
const fs = require('fs')
const PartitionedBloomFilter = require('../src/partitioned-bloom-filter.js')

describe('PartitionedBloomFilter', () => {
  const targetRate = 0.1

  describe('construction', () => {
    it('should add element to the filter with #add', () => {
      const filter = new PartitionedBloomFilter(15, targetRate)
      filter.add('alice')
      filter.add('bob')
      filter.length.should.equal(2)
    })

    it('should build a new filter using #from', () => {
      const data = [ 'alice', 'bob', 'carl' ]
      const expectedSize = Math.ceil(-((data.length * Math.log(targetRate)) / Math.pow(Math.log(2), 2)))
      const expectedHashes = Math.ceil((expectedSize / data.length) * Math.log(2))
      const filter = PartitionedBloomFilter.from(data, targetRate)

      filter.size.should.equal(expectedSize)
      filter._nbHashes.should.equal(expectedHashes)
      filter.length.should.equal(data.length)
      filter.rate().should.be.closeTo(targetRate, 0.1)
    })
  })

  describe('#has', () => {
    const filter = new PartitionedBloomFilter(15, targetRate)
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

  describe('#benchmark', () => {
    it('should handle decent volume of data', done => {
      fs.readFile('/usr/share/dict/american-english', (err, file) => {
        if (err) done(err)
        const lines = file.toString('utf-8').split('\n')
        const alphabet = PartitionedBloomFilter.from(lines, targetRate)
        alphabet.rate().should.be.closeTo(0.1, 0.1)
        alphabet.has('1').should.equal(false)
        alphabet.has('hello').should.equal(true)
        done()
      })
    })
  })

  describe('#saveAsJSON', () => {
    const filter = new PartitionedBloomFilter(15, targetRate)
    filter.add('alice')
    filter.add('bob')
    filter.add('carl')

    it('should export a partitioned bloom filter to a JSON object', () => {
      const exported = filter.saveAsJSON()
      exported.type.should.equal('PartitionedBloomFilter')
      exported._capacity.should.equal(15)
      exported._errorRate.should.equal(targetRate)
      exported._filter.should.deep.equal(filter._filter)
    })

    it('should create a partitioned bloom filter from a JSON export', () => {
      const exported = filter.saveAsJSON()
      const newFilter = PartitionedBloomFilter.fromJSON(exported)
      newFilter.size.should.equal(filter.size)
      newFilter._nbHashes.should.equal(filter._nbHashes)
      newFilter._subarraySize.should.equal(filter._subarraySize)
      newFilter.length.should.equal(filter.length)
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
})
