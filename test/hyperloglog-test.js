/* file : hyperloglog-test.js
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
const { HyperLogLog } = require('../dist/api.js')

describe('HyperLogLog', () => {

  describe('#update', () => {
    it('should support update and cardinality estimations (count) operations', () => {
      const nbDistinct = 100
      const sketch = new HyperLogLog(110)
      // populate the sketch with some values
      for(let i = 0; i < 10e5; i++) {
        sketch.update(`${i % nbDistinct}`)
      }
      sketch.count(true).should.be.closeTo(nbDistinct, nbDistinct * sketch.accuracy())
    })
  })

  describe('#merge', () => {
    it('should peforms the union of two HyperLogLog sketches', () => {
      const first = new HyperLogLog(10)
      const second = new HyperLogLog(10)
      first.update('alice')
      first.update('bob')
      second.update('carol')
      second.update('daniel')

      const merged = first.merge(second)
      merged.nbRegisters.should.equals(first.nbRegisters)
      for(let i = 0; i < merged.nbRegisters; i++) {
        merged._registers[i].should.equal(Math.max(first._registers[i], second._registers[i]))
      }
    })

    it('should reject the union of two sketches with different number of registers', done => {
      const first = new HyperLogLog(10)
      const second = new HyperLogLog(20)
      try {
        first.merge(second)
        done(new Error('The two sketches cannot be merged, as they have different number of registers'))
      } catch (error) {
        done()
      }
    })
  })

  describe('#equals', () => {
    it('should returns True when two HyperLogLog sketches are equals', () => {
      const first = new HyperLogLog(10)
      const second = new HyperLogLog(10)
      first.update('alice')
      first.update('bob')
      second.update('alice')
      second.update('bob')
      first.equals(second).should.equal(true)
    })

    it('should returns False when two sketches have different number of registers', () => {
      const first = new HyperLogLog(10)
      const second = new HyperLogLog(11)
      first.equals(second).should.equal(false)
    })

    it('should returns False when two sketches have different content in their registers', () => {
      const first = new HyperLogLog(10)
      const second = new HyperLogLog(11)
      first.update('alice')
      first.update('bob')
      second.update('carol')
      second.update('daniel')
      first.equals(second).should.equal(false)
    })
  })

  describe('#saveAsJSON', () => {
    const sketch = new HyperLogLog(10)
    sketch.update('alice')
    sketch.update('bob')

    it('should export an HyperLogLog to a JSON object', () => {
      const exported = sketch.saveAsJSON()
      exported.type.should.equal('HyperLogLog')
      exported._nbRegisters.should.equal(sketch._nbRegisters)
      exported._nbBytesPerHash.should.equal(sketch._nbBytesPerHash)
      exported._correctionBias.should.equal(sketch._correctionBias)
      exported._registers.should.deep.equal(sketch._registers)
    })

    it('should create an HyperLogLog from a JSON export', () => {
      const exported = sketch.saveAsJSON()
      const newFilter = HyperLogLog.fromJSON(exported)
      newFilter._nbRegisters.should.equal(sketch._nbRegisters)
      newFilter._nbBytesPerHash.should.equal(sketch._nbBytesPerHash)
      newFilter._correctionBias.should.equal(sketch._correctionBias)
      newFilter._registers.should.deep.equal(sketch._registers)
    })

    it('should reject imports from invalid JSON objects', () => {
      const invalids = [
        { type: 'something' },
        { type: 'HyperLogLog' },
        { type: 'HyperLogLog', _nbRegisters: 1 },
        { type: 'HyperLogLog', _nbRegisters: 1, _nbBytesPerHash: 1 },
        { type: 'HyperLogLog', _nbRegisters: 1, _nbBytesPerHash: 1, _correctionBias: 2 }
      ]

      invalids.forEach(json => {
        (() => HyperLogLog.fromJSON(json)).should.throw(Error)
      })
    })
  })
})
