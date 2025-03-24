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

require('chai').should()
const {describe, it} = require('mocha')
const {
  allocateArray,
  randomInt,
  xorUint8Array,
  getDefaultSeed,
} = require('../dist/utils')
const {BloomFilter, BaseFilter} = require('../dist/api.js')
const XXH = require('xxhashjs')
const range = require('lodash/range')
const seed = getDefaultSeed()
const {Hashing} = require('../dist/api')

describe('Utils', () => {
  describe('#allocateArray', () => {
    it('should allocate an array with the given size and a default value', () => {
      const array = allocateArray(15, 1)
      array.length.should.equal(15)
      array.forEach(value => value.should.equal(1))
    })

    it('should allow the use of a function to set the default value', () => {
      const array = allocateArray(15, () => 'foo')
      array.length.should.equal(15)
      array.forEach(value => value.should.equal('foo'))
    })
  })

  describe('#doubleHashing', () => {
    it('should perform a double hashing', () => {
      const hashing = new Hashing()
      const hashA = Math.random(Number.MIN_VALUE, Number.MAX_VALUE / 2)
      const hashB = Math.random(Number.MAX_VALUE / 2, Number.MAX_VALUE)
      const size = 1000
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      values.forEach(n => {
        hashing
          .doubleHashing(n, hashA, hashB, size)
          .should.equal((hashA + n * hashB + (n ** 3 - n) / 6) % size)
      })
    })
  })

  describe('#randomInt', () => {
    it('should generate a random int in an interval', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      randomInt(values[0], values[9]).should.be.oneOf(values)
    })
  })

  describe('#xorBuffer', () => {
    it('should xor correctly 2 Buffers', () => {
      const a = new Uint8Array(10).fill(0)
      const b = new Uint8Array(1).fill(1)
      const res = new Uint8Array(10).fill(0)
      res[res.length - 1] = 1
      // xor(a, b) = <Buffer 00 00 00 00 00 00 00 00 00 01>
      xorUint8Array(a, b).toString().should.equal(b.toString())
      // xor(xor(a, b), b) === a <Buffer 00 00 00 00 00 00 00 00 00 00> === <Buffer />
      console.log(xorUint8Array(xorUint8Array(a, b), b))
      xorUint8Array(xorUint8Array(a, b), b)
        .toString()
        .should.equal(Uint8Array.from(0).toString())
      // xor(xor(a, b), a) === b
      xorUint8Array(xorUint8Array(a, b), a)
        .toString()
        .should.equal(b.toString())
      // xor(xor(a, a), a) === a
      xorUint8Array(xorUint8Array(a, a), a)
        .toString()
        .should.equal(Uint8Array.from(0).toString())
      // xor(xor(b, b), b) === a
      xorUint8Array(xorUint8Array(b, b), b)
        .toString()
        .should.equal(b.toString())
    })
    it('should xor correctly', () => {
      const max = 100
      let a = new Uint8Array(max).fill(0)
      let b = new Uint8Array(max).fill(0)
      let last
      for (let i = 0; i < max; i++) {
        const s = XXH.h64('' + i, seed).toString(16)
        const x = Buffer.from(s)
        const buf = new Uint8Array(x.buffer, x.byteOffset, x.byteLength)
        a = xorUint8Array(a, buf)
        if (i !== max - 1) {
          b = xorUint8Array(buf, b)
        } else {
          last = buf
        }
      }
      xorUint8Array(a, b).toString().should.equal(last.toString())
      xorUint8Array(a, a)
        .toString()
        .should.equal(Uint8Array.from(10).fill(0).toString())
      xorUint8Array(b, b)
        .toString()
        .should.equal(Uint8Array.from(10).fill(0).toString())
    })
  })

  describe('Use different hash functions', () => {
    it('overriding serialize function by always returning Number(1)', () => {
      class CustomHashing extends Hashing {
        serialize(_element, _seed = undefined) {
          return Number(1)
        }
      }
      const bl = BloomFilter.create(2, 0.01)
      bl._hashing = new CustomHashing()
      bl.add('a')
      const bl2 = BloomFilter.create(2, 0.01)
      bl2._hashing = new CustomHashing()
      bl2.add('b')
      // 2 bloom filters with a hash functions returning everytime the same thing must be equal
      bl.equals(bl2).should.be.true
    })
  })
})
