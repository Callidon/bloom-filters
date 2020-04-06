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
        current.value.should.equal(expectedTop[i])
        current.frequency.should.be.below(prev.frequency)
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
        current.value.should.equal(expectedTop[i])
        current.frequency.should.be.below(prev.frequency)
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
        current.value.should.equal(expectedTop[i])
        current.frequency.should.be.below(prev.frequency)
        prev = current
        i++
      }
    })
  })

  // describe('#saveAsJSON', () => {
  //   const sketch = CountMinSketch.create(0.001, delta)
  //   sketch.update('foo')
  //   sketch.update('foo')
  //   sketch.update('foo')
  //   sketch.update('bar')

  //   it('should export a TopK to a JSON object', () => {
  //     const exported = sketch.saveAsJSON()
  //     exported.type.should.equal('CountMinSketch')
  //     exported._rows.should.equal(sketch._rows)
  //     exported._columns.should.equal(sketch._columns)
  //     exported._allSums.should.be.equal(sketch._allSums)
  //     exported._matrix.should.deep.equal(sketch._matrix)
  //   })

  //   it('should create a TopK from a JSON export', () => {
  //     const exported = sketch.saveAsJSON()
  //     const newSketch = CountMinSketch.fromJSON(exported)
  //     newSketch.columns.should.equal(sketch.columns)
  //     newSketch.rows.should.equal(sketch.rows)
  //     newSketch.sum.should.be.equal(sketch.sum)
  //     newSketch._matrix.should.deep.equal(sketch._matrix)
  //   })

  //   it('should reject imports from invalid JSON objects', () => {
  //     const invalids = [
  //       { type: 'something' },
  //       { type: 'CountMinSketch' },
  //       { type: 'CountMinSketch', _columns: 1 },
  //       { type: 'CountMinSketch', _columns: 1, _rows: 1 },
  //       { type: 'CountMinSketch', _columns: 1, _rows: 1, seed: 1 }
  //     ]

  //     invalids.forEach(json => {
  //       (() => CountMinSketch.fromJSON(json)).should.throw(Error)
  //     })
  //   })
  // })
})
