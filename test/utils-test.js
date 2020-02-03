/* file : utils-test.js
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
const utils = require('../dist/utils.js')
const XXH = require('xxhashjs')
const seed = utils.getDefaultSeed()

describe('Utils', () => {
  describe('#allocateArray', () => {
    it('should allocate an array with the given size and a default value', () => {
      const array = utils.allocateArray(15, 1)
      array.length.should.equal(15)
      array.forEach(value => value.should.equal(1))
    })

    it('should allow the use of a function to set the default value', () => {
      const array = utils.allocateArray(15, () => 'foo')
      array.length.should.equal(15)
      array.forEach(value => value.should.equal('foo'))
    })
  })

  describe('#doubleHashing', () => {
    it('should perform a double hashing', () => {
      const hashA = Math.random(Number.MIN_VALUE, Number.MAX_VALUE / 2)
      const hashB = Math.random(Number.MAX_VALUE / 2, Number.MAX_VALUE)
      const size = 1000
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      values.forEach(n => {
        utils.doubleHashing(n, hashA, hashB, size).should.equal((hashA + n * hashB) % size)
      })
    })
  })

  describe('#randomInt', () => {
    it('should generate a random int in an interval', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      utils.randomInt(values[0], values[9]).should.be.oneOf(values)
    })
  })

  describe('#xorBuffer', () => {
    it('should xor correctly 2 Buffers', () => {
      const a = Buffer.allocUnsafe(10).fill(0)
      const b = Buffer.alloc(1, 1)
      const res = Buffer.allocUnsafe(10).fill(0)
      res[res.length - 1] = 1
      // xor(a, b) = <Buffer 00 00 00 00 00 00 00 00 00 01>
      utils.xorBuffer(Buffer.from(a), Buffer.from(b)).toString().should.equal(b.toString())
      // xor(xor(a, b), b) === a <Buffer 00 00 00 00 00 00 00 00 00 00> === <Buffer />
      utils.xorBuffer(utils.xorBuffer(Buffer.from(a), Buffer.from(b)), Buffer.from(b)).toString().should.equal(Buffer.from('').toString())
      // xor(xor(a, b), a) === b
      utils.xorBuffer(utils.xorBuffer(Buffer.from(a), Buffer.from(b)), Buffer.from(a)).toString().should.equal(Buffer.from(b).toString())
      // xor(xor(a, a), a) === a
      utils.xorBuffer(utils.xorBuffer(Buffer.from(a), Buffer.from(a)), Buffer.from(a)).toString().should.equal(Buffer.from('').toString())
      // xor(xor(b, b), b) === a
      utils.xorBuffer(utils.xorBuffer(Buffer.from(b), Buffer.from(b)), Buffer.from(b)).toString().should.equal(Buffer.from(b).toString())
    })
    it('should xor correctly', () => {
      let a = Buffer.allocUnsafe(1).fill(1)
      let b = Buffer.allocUnsafe(1).fill(1)
      const max = 100
      let last
      for (let i = 0; i < max; i++) {
        const s = XXH.h64('' + i, seed).toString(16)
        const buf = Buffer.from(s)
        a = utils.xorBuffer(a, buf)
        if (i !== (max - 1)) {
          b = utils.xorBuffer(buf, b)
        } else {
          last = buf
        }
      }
      utils.xorBuffer(a, b).equals(last).should.equal(true)
      utils.xorBuffer(a, b).toString().should.equal(last.toString())
      utils.xorBuffer(a, a).equals(Buffer.allocUnsafe(0)).should.equal(true)
      utils.xorBuffer(b, b).equals(Buffer.allocUnsafe(0)).should.equal(true)
    })
  })

  describe('#isBufferEmpty', () => {
    it('should return true if a buffer is empty', () => {
      utils.isEmptyBuffer(Buffer.allocUnsafe(10).fill(0)).should.equal(true)
      utils.isEmptyBuffer(Buffer.allocUnsafe(0).fill(0)).should.equal(true)
    })
    it('should return false if a buffer is not empty', () => {
      utils.isEmptyBuffer(Buffer.allocUnsafe(10).fill(1)).should.equal(false)
    })
  })
})
