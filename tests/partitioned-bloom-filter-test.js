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

require('chai').should()
const {error} = require('console')
const {describe, it} = require('mocha')
const PartitionedBloomFilter =
  require('bloom-filters/bloom/partitioned-bloom-filter').default

describe('PartitionedBloomFilter', () => {
  const targetRate = 0.001

  describe('construction', () => {
    it('should add element to the filter', () => {
      const filter = PartitionedBloomFilter.create(15, targetRate)
      filter.add('alice')
      filter.add('bob')
    })

    it('should build a new filter using #from', () => {
      const data = ['alice', 'bob', 'carl']
      const filter = PartitionedBloomFilter.from(data, targetRate)
      filter.has('alice').should.equal(true)
      filter.has('bob').should.equal(true)
      filter.has('carl').should.equal(true)
      filter.rate().should.be.closeTo(targetRate, 0.1)
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

    it('should return false for elements that are definitively not in the set', () => {
      const filter = getFilter()
      filter.has('daniel').should.equal(false)
      filter.has('al').should.equal(false)
    })

    it('should return true for elements that might be in the set', () => {
      const filter = getFilter()
      filter.has('alice').should.equal(true)
      filter.has('bob').should.equal(true)
      filter.has('carl').should.equal(true)
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

    it('should export a partitioned bloom filter to a JSON object', () => {
      const filter = getFilter()
      const exported = filter.saveAsJSON()
      exported._bits.should.equal(filter._bits)
      exported._k.should.equal(filter._k)
      exported._m.should.equal(filter._m)
      exported._errorRate.should.equal(filter._errorRate)
      exported._filter.should.deep.equal(filter._filter.map(f => f.export()))
    })

    it('should create a partitioned bloom filter from a JSON export', () => {
      const filter = getFilter()
      const exported = filter.saveAsJSON()
      const newFilter = PartitionedBloomFilter.fromJSON(exported)
      newFilter.seed.should.equal(filter.seed)
      newFilter._bits.should.equal(filter._bits)
      newFilter._errorRate.should.equal(filter._errorRate)
      newFilter._m.should.equal(filter._m)
      newFilter._k.should.equal(filter._k)
      newFilter._filter.should.deep.equal(filter._filter)
    })

    it('should reject imports from invalid JSON objects', () => {
      const invalids = [
        {type: 'something'},
        {type: 'PartitionedBloomFilter'},
        {type: 'PartitionedBloomFilter', _capacity: 1},
        {type: 'PartitionedBloomFilter', _capacity: 1, _errorRate: 1},
      ]

      invalids.forEach(json => {
        ;(() => PartitionedBloomFilter.fromJSON(json)).should.throw(Error)
      })
    })
  })
  describe('Performance test', () => {
    const max = 10000
    it(`should not return an error when inserting and querying for ${max} elements`, () => {
      const filter = PartitionedBloomFilter.create(max, targetRate)
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
      currentrate.should.be.closeTo(targetRate, targetRate)
    })
  })
})
