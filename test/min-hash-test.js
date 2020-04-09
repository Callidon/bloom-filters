/* file : min-hash-test.js
MIT License

Copyright (c) 2017-2020 Thomas Minier & Arnaud Grall

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
const { MinHashFactory } = require('../dist/api.js')
const { range, intersection, union } = require('lodash')

// Compute the exact Jaccard similairty between two sets
function jaccard(a, b) {
  return intersection(a, b).length / union(a, b).length
}

describe('MinHash', () => {
  const setA = range(1, 500)
  const setB = range(1, 500).map(x => x % 2 === 0 ? x : x * 2)
  const maxValue = Math.max(...setA, ...setB)
  const nbHashes = 10
  const factory = new MinHashFactory(nbHashes, maxValue)

  describe('#isEmpty', () => {

  })

  describe('#add', () => {
    it('should insert values and compute the Jaccard similarity between two sets', () => {
      const firstSet = factory.create()
      const secondSet = factory.create()
      setA.forEach(value => firstSet.add(value))
      setB.forEach(value => secondSet.add(value))
      firstSet.compareWith(secondSet).should.be.closeTo(jaccard(setA, setB), 0.1)
    })
  })

  describe('#bulkLoad', () => {
    it('should ingest a set of numbers and compute the Jaccard similarity between two sets', () => {
      const firstSet = factory.create()
      const secondSet = factory.create()
      firstSet.bulkLoad(setA)
      secondSet.bulkLoad(setB)
      firstSet.compareWith(secondSet).should.be.closeTo(jaccard(setA, setB), 0.1)      
    })
  })

  describe('#compareWith', () => {

  })
})
