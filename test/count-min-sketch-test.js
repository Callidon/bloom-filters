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
const CountMinSketch = require('../src/count-min-sketch.js')

describe('CountMinSketch', () => {
  it('should support update and point query (count) operations', () => {
    const sketch = new CountMinSketch(0.001, 0.99)
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
    const sketch = new CountMinSketch(0.001, 0.99)
    const otherSketch = new CountMinSketch(0.001, 0.99)

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
    const sketch = new CountMinSketch(0.001, 0.99)
    const otherSketch = new CountMinSketch(0.001, 0.99)

    otherSketch._columns++;
    (() => sketch.merge(otherSketch)).should.throw(Error)

    otherSketch._columns--
    otherSketch._rows--;
    (() => sketch.merge(otherSketch)).should.throw(Error)
  })

  it('should the clone operation', () => {
    const sketch = new CountMinSketch(0.001, 0.99)
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
    const sketch = new CountMinSketch(0.001, 0.99)
    sketch.update('foo')
    sketch.update('foo')
    sketch.update('foo')
    sketch.update('bar')

    it('should export a count-min sketch to a JSON object', () => {
      const exported = sketch.saveAsJSON()
      exported.type.should.equal('CountMinSketch')
      exported._epsilon.should.equal(sketch.epsilon)
      exported._delta.should.equal(sketch.delta)
      exported._matrix.should.deep.equal(sketch._matrix)
    })

    it('should create a count-min sketch from a JSON export', () => {
      const exported = sketch.saveAsJSON()
      const newSketch = CountMinSketch.fromJSON(exported)
      newSketch.epsilon.should.equal(sketch.epsilon)
      newSketch.delta.should.equal(sketch.delta)
      newSketch._columns.should.equal(sketch._columns)
      newSketch._rows.should.equal(sketch._rows)
      newSketch._matrix.should.deep.equal(sketch._matrix)
    })

    it('should reject imports from invalid JSON objects', () => {
      const invalids = [
        { type: 'something' },
        { type: 'CountMinSketch' },
        { type: 'CountMinSketch', epsilon: 1 },
        { type: 'CountMinSketch', epsilon: 1, delta: 1 }
      ]

      invalids.forEach(json => {
        (() => CountMinSketch.fromJSON(json)).should.throw(Error, 'Cannot create a CountMinSketch from a JSON export which does not represent a count-min sketch')
      })
    })
  })
})
