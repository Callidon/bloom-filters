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
const { MinHash } = require('../dist/api.js')
const { range, intersection, union } = require('lodash')

// Compute the exact Jaccard similairty between two sets
function jaccard(a, b) {
  return intersection(a, b).length / union(a, b).length
}

describe('MinHash', () => {
  describe('#isWritable', () => {
    it('should returns True when the MinHash has no signature', () => {
      const firstSet = new MinHash(10, 1)
      firstSet.isWritable.should.equal(true)
    })
    it('should returns False when the MinHash has a signature', () => {
      const firstSet = new MinHash(10, 1)
      firstSet.ingestNumbers([1, 2, 3])
      firstSet.isWritable.should.equal(false)
    })
  })

  describe('#ingestNumbers', () => {
    it('should ingest numbers and compute the Jaccard similarity between two sets', () => {
      const setA = range(1, 500)
      const setB = range(1, 500).map(x => x % 2 === 0 ? x : x * 2)
      const maxValue = Math.max(...setA, ...setB)
      const nbHashes = 10
      const firstSet = new MinHash(nbHashes, maxValue)
      firstSet.ingestNumbers(setA)
      const secondSet = new MinHash(nbHashes, maxValue)
      secondSet.ingestNumbers(setB)
      firstSet.compareWith(secondSet).should.be.closeTo(jaccard(setA, setB), 0.5)      
    })

    it('should reject ingestion into a MinHash that is no longer writable', done => {
      const firstSet = new MinHash(10, 1)
      firstSet.ingestNumbers([1, 2, 3])
      try {
        firstSet.ingestNumbers([1, 2, 3])
        done(new Error('You shouldn\'t be able to ingest numbers twice with the same MinHash'))
      } catch (error) {
        done()
      }
    })
  })
})
