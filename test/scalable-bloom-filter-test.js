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

require('chai').should()
const {expect} = require('chai')
const {ScalableBloomFilter} = require('../dist/api.js')

describe('ScalableBloomFilter', () => {
  const targetRate = 0.1
  const seed = Math.random()

  describe('construction', () => {
    it('should #add add elements without error', () => {
      const filter = ScalableBloomFilter.create(3, targetRate)
      filter.seed = seed
      filter.add('alice')
      filter.add('bob')
      filter.add('carl')
      expect(filter.seed, 'the seed should be defined').to.exist
    })
    it('should #has return correct values with added values', () => {
      const filter = ScalableBloomFilter.create(3, targetRate)
      filter.seed = seed
      filter.add('alice')
      filter.add('bob')
      filter.add('carl')
      filter.has('alice').should.equal(true)
      filter.has('bob').should.equal(true)
      filter.has('carl').should.equal(true)
      filter.has('somethingwhichdoesnotexist').should.equal(false)
    })

    it('should scale Partitioned Bloom Filter', () => {
      const filter = ScalableBloomFilter.create(1, targetRate)
      filter.seed = seed
      filter.add('alice')
      filter.add('bob')
      filter.add('carl')
      filter._filters.length.should.equal(2)
      for (let i = 0; i < 1024; i++) {
        filter.add('elem:' + i)
      }
      filter.has('alice').should.equal(true)
      filter.has('bob').should.equal(true)
      filter.has('carl').should.equal(true)
      for (let i = 0; i < 1024; i++) {
        filter.has('elem:' + i).should.equal(true)
      }
      filter.has('elem:' + 1025).should.equal(false)
      expect(filter.seed, 'the seed should be defined').to.exist
      filter._filters.forEach(
        f => expect(f.seed, 'the seed should be defined').to.exist
      )
      filter._filters.length.should.equal(10)
    })

    it('should import/export correctly', () => {
      const filter = ScalableBloomFilter.create(1, targetRate)
      filter.seed = seed
      for (let i = 0; i < 50; i++) {
        filter.add('elem:' + i)
      }
      const exported = filter.saveAsJSON()
      const imported = ScalableBloomFilter.fromJSON(exported)
      imported.equals(filter).should.equal(true)
      for (let i = 0; i < 50; i++) {
        imported.has('elem:' + i).should.equal(true)
      }
    })
  })
  describe('Performance test', () => {
    const max = 1000
    const targetedRate = 0.01
    it(`should not return an error when inserting ${max} elements`, () => {
      const filter = ScalableBloomFilter.create(max, targetedRate)
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
      const currentRate = falsePositive / tries
      currentRate.should.be.closeTo(targetedRate, targetedRate)
    })
  })
})
