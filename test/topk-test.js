/* file : topk-test.js
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
const { TopK } = require('../dist/api.js')

describe('TopK', () => {
  const expectedTop = ['alice', 'bob', 'carol']

  describe('#values', () => {
    it('should produce valid TopK estimations', () => {
      const topk = new TopK(3, 0.001, 0.999)
      topk.add('alice')
      topk.add('bob')
      topk.add('alice')
      topk.add('carol')
      topk.add('bob')
      topk.add('alice')

      let i = 0
      let prev = { frequency: Infinity }
      for (let current of topk.iterator()) {
        current.value.should.equal(expectedTop[i])
        current.frequency.should.be.below(prev.frequency)
        current.rank.should.equal(i + 1)
        prev = current
        i++
      }
    })

    it('should produce valid estimations when there are more than K items', () => {
      const topk = new TopK(3, 0.001, 0.999)
      topk.add('alice')
      topk.add('daniel')
      topk.add('esther')
      topk.add('bob')
      topk.add('alice')
      topk.add('bob')
      topk.add('alice')
      topk.add('carol')
      topk.add('carol')
      topk.add('alice')

      let prev = { frequency: Infinity }
      let i = 0
      for (let current of topk.values()) {
        current.should.have.all.keys('value', 'rank', 'frequency')
        current.value.should.equal(expectedTop[i])
        current.frequency.should.be.below(prev.frequency)
        current.rank.should.equal(i + 1)
        prev = current
        i++
      }
    })
  })

  describe('#iterator', () => {
    it('should produce valid TopK estimations', () => {
      const topk = new TopK(3, 0.001, 0.999)
      topk.add('alice')
      topk.add('bob')
      topk.add('alice')
      topk.add('carol')
      topk.add('bob')
      topk.add('alice')

      let i = 0
      let prev = { frequency: Infinity }
      for (let current of topk.iterator()) {
        current.should.have.all.keys('value', 'rank', 'frequency')
        current.value.should.equal(expectedTop[i])
        current.frequency.should.be.below(prev.frequency)
        current.rank.should.equal(i + 1)
        prev = current
        i++
      }
    })

    it('should produce valid estimations when there are more than K items', () => {
      const topk = new TopK(3, 0.001, 0.999)
      topk.add('alice')
      topk.add('daniel')
      topk.add('esther')
      topk.add('bob')
      topk.add('alice')
      topk.add('bob')
      topk.add('alice')
      topk.add('carol')
      topk.add('carol')
      topk.add('alice')

      let i = 0
      let prev = { frequency: Infinity }
      for (let current of topk.iterator()) {
        current.should.have.all.keys('value', 'rank', 'frequency')
        current.value.should.equal(expectedTop[i])
        current.frequency.should.be.below(prev.frequency)
        current.rank.should.equal(i + 1)
        prev = current
        i++
      }
    })
  })

  describe('#saveAsJSON', () => {
    const topk = new TopK(3, 0.001, 0.999)
    topk.add('alice')
    topk.add('bob')
    topk.add('alice')
    topk.add('carol')
    topk.add('bob')
    topk.add('alice')

    it('should export a TopK to a JSON object', () => {
      const exported = topk.saveAsJSON()

      exported.type.should.equal('TopK')
      exported._k.should.equal(topk._k)
      exported._errorRate.should.equal(topk._errorRate)
      exported._accuracy.should.equal(topk._accuracy)
      exported._seed.should.equal(topk._seed)
      // inner count min sketch
      exported._sketch.type.should.equal('CountMinSketch')
      exported._sketch._columns.should.equal(topk._sketch._columns)
      exported._sketch._rows.should.equal(topk._sketch._rows)
      exported._sketch._allSums.should.equal(topk._sketch._allSums)
      exported._sketch._seed.should.equal(topk._sketch._seed)
      exported._sketch._matrix.should.deep.equal(topk._sketch._matrix)
      // inner MinHeap
      exported._heap.should.deep.equal(topk._heap._content)
    })

    it('should create a TopK from a JSON export', () => {
      const exported = topk.saveAsJSON()
      const newSketch = TopK.fromJSON(exported)

      newSketch._k.should.equal(topk._k)
      newSketch._errorRate.should.equal(topk._errorRate)
      newSketch._accuracy.should.equal(topk._accuracy)
      newSketch._seed.should.equal(topk._seed)
      // inner count min sketch
      newSketch._sketch._columns.should.equal(topk._sketch._columns)
      newSketch._sketch._rows.should.equal(topk._sketch._rows)
      newSketch._sketch._allSums.should.equal(topk._sketch._allSums)
      newSketch._sketch._seed.should.equal(topk._sketch._seed)
      newSketch._sketch._matrix.should.deep.equal(topk._sketch._matrix)
      // inner MinHeap
      newSketch._heap._content.should.deep.equal(topk._heap._content)
    })

    it('should reject imports from invalid JSON objects', () => {
      const invalids = [
        { type: 'something' },
        { type: 'TopK' },
        { type: 'TopK', _k: 1 },
        { type: 'TopK', _k: 1, _errorRate: 1 },
        { type: 'TopK', _k: 1, _errorRate: 1, _accuracy: 1 },
        { type: 'TopK', _k: 1, _errorRate: 1, _accuracy: 1, _content: [] }
      ]

      invalids.forEach(json => {
        (() => TopK.fromJSON(json)).should.throw(Error)
      })
    })
  })
})
