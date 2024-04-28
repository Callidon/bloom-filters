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
const {PartitionedBloomFilter} = require('../dist/api.js')

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

  describe('#equals', () => {
    it('should returns True when two filters are equals', () => {
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
      first.equals(other).should.equal(true)
    })

    it('should returns False when two filters have different sizes', () => {
      const first = new PartitionedBloomFilter(15, 4, 0.5)
      const other = new PartitionedBloomFilter(10, 4, 0.5)
      first.equals(other).should.equal(false)
    })

    it('should returns False when two filters have different nb. of hash functions', () => {
      const first = new PartitionedBloomFilter(15, 4, 0.5)
      const other = new PartitionedBloomFilter(15, 2, 0.5)
      first.equals(other).should.equal(false)
    })

    it('should returns False when two filters have different load factor', () => {
      const first = new PartitionedBloomFilter(15, 4, 0.5)
      const other = new PartitionedBloomFilter(15, 2, 0.4)
      first.equals(other).should.equal(false)
    })

    it('should returns False when two filters have different content', () => {
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
      first.equals(other).should.equal(false)
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
      exported.type.should.equal('PartitionedBloomFilter')
      exported._capacity.should.equal(15)
      exported._size.should.equal(filter._size)
      exported._loadFactor.should.equal(filter._loadFactor)
      exported._nbHashes.should.equal(filter._nbHashes)
      exported._filter.should.deep.equal(filter._filter.map(f => f.export()))
    })

    it('should create a partitioned bloom filter from a JSON export', () => {
      const filter = getFilter()
      const exported = filter.saveAsJSON()
      const newFilter = PartitionedBloomFilter.fromJSON(exported)
      newFilter.seed.should.equal(filter.seed)
      newFilter._capacity.should.equal(filter._capacity)
      newFilter._size.should.equal(filter._size)
      newFilter._loadFactor.should.equal(filter._loadFactor)
      newFilter._m.should.equal(filter._m)
      newFilter._nbHashes.should.equal(filter._nbHashes)
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
    const max = 1000
    it(`should not return an error when inserting and querying for ${max} elements`, () => {
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
      currentrate.should.be.closeTo(targetRate, targetRate)
    })
  })
})
