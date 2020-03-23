/* file : count-min-sketch-test.js
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
const { CountMinSketch } = require('../dist/api.js')

describe('CountMinSketch', () => {
  const delta = 0.999

  it('should support update and point query (count) operations', () => {
    const sketch = CountMinSketch.create(0.001, delta)
    // populate the sketch with some values
    sketch.update('foo')
    sketch.update('foo')
    sketch.update('foo')
    sketch.update('bar')
    // assert point queries results
    sketch.count('foo').should.equal(3)
    sketch.count('bar').should.equal(1)
    sketch.count('moo').should.equal(0)
  })

  it('should support a merge between two sketches', () => {
    const sketch = CountMinSketch.create(0.001, delta)
    const otherSketch = CountMinSketch.create(0.001, delta)

    // populate the sketches with some values
    sketch.update('foo')
    sketch.update('foo')
    sketch.update('foo')
    sketch.update('bar')

    otherSketch.update('foo')
    otherSketch.update('bar')
    otherSketch.update('moo')
    otherSketch.update('moo')

    // merge sketches
    sketch.merge(otherSketch)
    sketch.count('foo').should.equal(4)
    sketch.count('bar').should.equal(2)
    sketch.count('moo').should.equal(2)
  })

  it('should reject an impossible merge', () => {
    const sketch = CountMinSketch.create(0.001, delta)
    const otherSketch = CountMinSketch.create(0.001, delta)

    otherSketch._columns++;
    (() => sketch.merge(otherSketch)).should.throw(Error)

    otherSketch._columns--
    otherSketch._rows--;
    (() => sketch.merge(otherSketch)).should.throw(Error)
  })

  it('should the clone operation', () => {
    const sketch = CountMinSketch.create(0.001, delta)
    // populate the sketches with some values
    sketch.update('foo')
    sketch.update('foo')
    sketch.update('foo')
    sketch.update('bar')

    // clone it
    const clone = sketch.clone()
    clone.count('foo').should.equal(3)
    clone.count('bar').should.equal(1)
    clone.count('moo').should.equal(0)
  })

  describe('#saveAsJSON', () => {
    const sketch = CountMinSketch.create(0.001, delta)
    sketch.update('foo')
    sketch.update('foo')
    sketch.update('foo')
    sketch.update('bar')

    it('should export a count-min sketch to a JSON object', () => {
      const exported = sketch.saveAsJSON()
      exported.type.should.equal('CountMinSketch')
      exported._rows.should.equal(sketch._rows)
      exported._columns.should.equal(sketch._columns)
      exported._allSums.should.be.equal(sketch._allSums)
      exported._matrix.should.deep.equal(sketch._matrix)
    })

    it('should create a count-min sketch from a JSON export', () => {
      const exported = sketch.saveAsJSON()
      const newSketch = CountMinSketch.fromJSON(exported)
      newSketch.columns.should.equal(sketch.columns)
      newSketch.rows.should.equal(sketch.rows)
      newSketch.sum.should.be.equal(sketch.sum)
      newSketch._matrix.should.deep.equal(sketch._matrix)
    })

    it('should reject imports from invalid JSON objects', () => {
      const invalids = [
        { type: 'something' },
        { type: 'CountMinSketch' },
        { type: 'CountMinSketch', _columns: 1 },
        { type: 'CountMinSketch', _columns: 1, _rows: 1 },
        { type: 'CountMinSketch', _columns: 1, _rows: 1, seed: 1 }
      ]

      invalids.forEach(json => {
        (() => CountMinSketch.fromJSON(json)).should.throw(Error)
      })
    })
  })
  describe.skip('Performance test', () => {
    // setup an finite stream of 100 000 elements between [0; 1000)
    const max = 1000000
    const rate = 0.00001
    const range = 10000
    const random = () => {
      return Math.floor(Math.random() * range)
    }
    it('should not return an error when inserting ' + max + ' elements', () => {
      const filter = CountMinSketch.create(rate, delta)
      // error rate 0.001, probability of wrong answer: 0.001
      // console.log('number of rows:', filter._rows)
      // console.log('number of columns:', filter._columns)
      // console.log('Probability: ', 1 - delta)
      // console.log('Error rate: ', errorRate)
      // console.log('Relative accuracy is: ', 1 + errorRate * max, ' with probability: ', 1 - delta)
      // add n times max elements so we got a frequency of 10 for each elements
      let error = 0
      const map = new Map()
      for (let i = 0; i < max; ++i) {
        const item = random()
        // update
        filter.update('' + item)
        if (!map.has(item)) {
          map.set(item, 1)
        } else {
          map.set(item, map.get(item) + 1)
        }

        // check the item
        const count = filter.count('' + item)
        const est = map.get(item) + rate * filter.sum
        if (count > est) {
          error += 1
          // console.log('[%d] => â: %d, a: %d', item, count, map.get(item), est)
        }
      }

      const errorRate = error / max
      const errorProb = 1 - Math.pow(Math.E, -filter.rows)
      errorRate.should.be.at.most(errorProb)
    })
  })
})
