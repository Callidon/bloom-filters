/* file : bloom-filter-test.js
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
require('chai').expect()
const Buffer = require('buffer/').Buffer
const InvertibleBloomFilter = require('../src/invertible-bloom-lookup-tables.js').InvertibleBloomFilter

describe('Invertible Bloom Lookup Tables', () => {
  const alpha = 2
  const differences = 100
  const hashCount = 3
  const size = alpha * differences
  const toInsert = [Buffer.from('help'), Buffer.from('meow'), Buffer.from(JSON.stringify({
    data: 'hello world'
  }))]
  const toCompare = [Buffer.from('meow'), Buffer.from('balloon')]
  const diffA = [Buffer.from('balloon')]
  const diffB = [Buffer.from('help'), Buffer.from(JSON.stringify({
    data: 'hello world'
  }))]

  describe('Encoding: #add', () => {
    it('should add element to the filter with #add', () => {
      const iblt = new InvertibleBloomFilter(size, hashCount)
      iblt._hashCount.should.equal(hashCount)
      iblt.size.should.equal(size)
      iblt.length.should.equal(0)
      iblt._elements.length.should.equal(size)
      toInsert.forEach(e => {
        iblt.add(e)
      })
      iblt.length.should.equal(toInsert.length)
    })
  })

  describe('Substracting (#substract) and Decoding (#decode)', () => {
    it('should substract and decode two arrays correctly', () => {
      const iblt = new InvertibleBloomFilter(size, hashCount)
      const iblt2 = new InvertibleBloomFilter(size, hashCount)
      toInsert.forEach(e => {
        iblt.add(e)
      })
      toCompare.forEach(e => {
        iblt2.add(e)
      })
      // should receive an iblt with 42 and car as elements in
      const sub = iblt.substract(iblt2)
      const result = InvertibleBloomFilter.decode(sub)
      result.missing.sort().should.eql(diffA.sort())
      result.additional.sort().should.eql(diffB.sort())
    })
  })

  describe('#saveAsJSON', () => {
    const iblt = InvertibleBloomFilter.from([Buffer.from('meow'), Buffer.from('car')], 100, 4)

    it('should export an Invertible Bloom Filter to a JSON object', () => {
      const exported = iblt.saveAsJSON()
      exported.type.should.equal('InvertibleBloomFilter')
      exported._size.should.equal(iblt.size)
      exported._hashCount.should.equal(iblt.hashCount)
      exported._elements.should.deep.equal(iblt._elements)
    })

    it('should create an Invertible Bloom Filter from a JSON export', () => {
      const exported = iblt.saveAsJSON()
      const newIblt = InvertibleBloomFilter.fromJSON(exported)
      newIblt.size.should.equal(iblt._size)
      newIblt.hashCount.should.equal(iblt._hashCount)
      newIblt.elements.should.deep.equal(iblt._elements)
    })

    it('should reject imports from invalid JSON objects', () => {
      const invalids = [
        { type: 'something' },
        { type: 'InvertibleBloomFilter' },
        { type: 'InvertibleBloomFilter', size: 10 },
        { type: 'InvertibleBloomFilter', size: 10, hashCount: 2 },
        { type: 'InvertibleBloomFilter', size: 10, hashCount: 4 },
        { type: 'InvertibleBloomFilter', size: 10, hashCount: 4, invalid: 4 }
      ]

      invalids.forEach(json => {
        (function () {
          InvertibleBloomFilter.fromJSON(json)
        }).should.throw(Error, 'Cannot create an InvertibleBloomFilter from a JSON export which does not represent an Invertible Bloom Filter')
      })
    })

    it('should accept import from a valid JSON object', () => {
      (function () {
        InvertibleBloomFilter.fromJSON({
          type: 'InvertibleBloomFilter', _size: 10, _hashCount: 4, _elements: []
        })
      }).should.not.throw(Error, 'Cannot create an InvertibleBloomFilter from a JSON export which does not represent an Invertible Bloom Filter')
    })
  })
})
