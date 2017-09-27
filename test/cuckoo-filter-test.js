/* file : cuckoo-filter-test.js
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
const murmur = require('murmurhash3js')
const CuckooFilter = require('../src/cuckoo-filter.js')

describe('CuckooFilter', () => {
  describe('#_locations', () => {
    it('should compute the fingerprint and indexes for an element', () => {
      const filter = new CuckooFilter(15, 3, 2)
      const element = 'foo'
      const hash = murmur.x86.hash32(element)
      const fingerprint = hash.toString(16).substring(0, 3)
      const firstIndex = Math.abs(hash)
      const secondIndex = Math.abs(firstIndex ^ Math.abs(murmur.x86.hash32(fingerprint)))

      const locations = filter._locations(element)
      locations.fingerprint.should.equal(fingerprint)
      locations.firstIndex.should.equal(firstIndex % filter.size)
      locations.secondIndex.should.equal(secondIndex % filter.size)
    })
  })

  describe('#add', () => {
    it('should add element to the filter with #add', () => {
      const filter = new CuckooFilter(15, 3, 2)
      let nbElements = 0
      filter.add('alice')
      filter.add('bob')
      filter.length.should.equal(2)
      filter._filter.forEach(bucket => {
        nbElements += bucket.length
      })
      nbElements.should.equal(2)
    })

    it('should should store ane element accross two different buckets', () => {
      const filter = new CuckooFilter(15, 3, 2)
      const element = 'foo'
      let nbElements = 0

      const locations = filter._locations(element)
      // fill up all buckets (needs 4 insertions since bucket size = 2)
      filter.add(element)
      filter.add(element)
      filter.add(element)
      filter.add(element)

      // assert that buckets are full
      filter._filter[locations.firstIndex].isFree().should.equal(false)
      filter._filter[locations.secondIndex].isFree().should.equal(false)

      nbElements += filter._filter[locations.firstIndex].length + filter._filter[locations.secondIndex].length
      nbElements.should.equal(4)
    })

    it('should perform random kicks when both buckets are full', () => {
      const filter = new CuckooFilter(15, 3, 1)
      const element = 'foo'
      let nbElements = 0
      const locations = filter._locations(element)
      // artificially fills up the two possible buckets with dumb values
      filter._filter[locations.firstIndex].add('001')
      filter._filter[locations.secondIndex].add('002')
      filter._length += 2

      filter.add(element).should.equal(true)

      filter._filter.forEach(bucket => {
        if (bucket.length > 0) {
          bucket._elements[0].should.be.oneOf([ '001', '002', locations.fingerprint ])
          nbElements += bucket.length
        }
      })
      filter.length.should.equal(3)
      nbElements.should.equal(3)
    })

    it('should reject elements that can\'t be inserted when filter is full', () => {
      const filter = new CuckooFilter(1, 3, 1)
      const element = 'foo'
      filter.add(element)
      filter.add(element).should.equal(false)
    })
  })

  describe('#remove', () => {
    it('should remove exisiting elements from the filter', () => {
      const filter = new CuckooFilter(15, 3, 1)
      const element = 'foo'
      const locations = filter._locations(element)

      filter.add(element)
      filter.remove(element).should.equal(true)
      filter._filter[locations.firstIndex].length.should.equal(0)
    })

    it('should look inside every possible bucket', () => {
      const filter = new CuckooFilter(15, 3, 1)
      const element = 'foo'
      const locations = filter._locations(element)

      filter.add(element)
      filter.add(element)
      filter.remove(element).should.equal(true)
      filter._filter[locations.firstIndex].length.should.equal(0)
      filter.remove(element).should.equal(true)
      filter._filter[locations.secondIndex].length.should.equal(0)
    })

    it('should fail to remove elements that are not in the filter', () => {
      const filter = new CuckooFilter(15, 3, 1)
      filter.add('foo')
      filter.remove('moo').should.equal(false)
    })
  })

  describe('#has', () => {
    it('should return True when an element may be in the filter', () => {
      const filter = new CuckooFilter(15, 3, 1)
      filter.add('foo')
      filter.has('foo').should.equal(true)
    })

    it('should return False when an element is definitively not in the filter', () => {
      const filter = new CuckooFilter(15, 3, 1)
      filter.add('foo')
      filter.has('moo').should.equal(false)
    })

    it('should look inside every possible bucket', () => {
      const filter = new CuckooFilter(15, 3, 1)
      filter.add('foo')
      filter.add('foo')
      filter.remove('foo')
      filter.has('foo').should.equal(true)
    })
  })

  describe('#saveAsJSON', () => {
    const filter = new CuckooFilter(15, 3, 2)
    filter.add('alice')
    filter.add('bob')

    it('should export a cuckoo filter to a JSON object', () => {
      const exported = filter.saveAsJSON()
      exported.type.should.equal('CuckooFilter')
      exported._size.should.equal(filter.size)
      exported._fingerprintLength.should.equal(filter.fingerprintLength)
      exported._length.should.equal(filter.length)
      exported._maxKicks.should.deep.equal(filter.maxKicks)
      exported._filter.should.deep.equal(filter._filter.map(b => b.saveAsJSON()))
    })

    it('should create a cuckoo filter from a JSON export', () => {
      const exported = filter.saveAsJSON()
      const newFilter = CuckooFilter.fromJSON(exported)
      newFilter.size.should.equal(filter.size)
      newFilter.fingerprintLength.should.equal(filter.fingerprintLength)
      newFilter.length.should.equal(filter.length)
      newFilter.maxKicks.should.deep.equal(filter.maxKicks)
      newFilter._filter.every((b, index) => filter._filter[index].equals(b)).should.equal(true)
    })

    it('should reject imports from invalid JSON objects', () => {
      const invalids = [
        { type: 'something' },
        { type: 'CuckooFilter' },
        { type: 'CuckooFilter', size: 1 },
        { type: 'CuckooFilter', size: 1, fingerprintLength: 1 },
        { type: 'CuckooFilter', size: 1, fingerprintLength: 1, length: 2 },
        { type: 'CuckooFilter', size: 1, fingerprintLength: 1, length: 2, maxKicks: 1 }
      ]

      invalids.forEach(json => {
        (() => CuckooFilter.fromJSON(json)).should.throw(Error, 'Cannot create a CuckooFilter from a JSON export which does not represent a cuckoo filter')
      })
    })
  })
})
