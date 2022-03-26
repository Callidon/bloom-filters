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
const {
  allocateArray,
  randomInt,
  xorBuffer,
  getDefaultSeed,
  isEmptyBuffer,
} = require('../dist/utils')
const {BloomFilter, BaseFilter} = require('../dist/api.js')
const XXH = require('xxhashjs')
const {range} = require('lodash')
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
      const a = Buffer.allocUnsafe(10).fill(0)
      const b = Buffer.alloc(1, 1)
      const res = Buffer.allocUnsafe(10).fill(0)
      res[res.length - 1] = 1
      // xor(a, b) = <Buffer 00 00 00 00 00 00 00 00 00 01>
      xorBuffer(Buffer.from(a), Buffer.from(b))
        .toString()
        .should.equal(b.toString())
      // xor(xor(a, b), b) === a <Buffer 00 00 00 00 00 00 00 00 00 00> === <Buffer />
      xorBuffer(xorBuffer(Buffer.from(a), Buffer.from(b)), Buffer.from(b))
        .toString()
        .should.equal(Buffer.from('').toString())
      // xor(xor(a, b), a) === b
      xorBuffer(xorBuffer(Buffer.from(a), Buffer.from(b)), Buffer.from(a))
        .toString()
        .should.equal(Buffer.from(b).toString())
      // xor(xor(a, a), a) === a
      xorBuffer(xorBuffer(Buffer.from(a), Buffer.from(a)), Buffer.from(a))
        .toString()
        .should.equal(Buffer.from('').toString())
      // xor(xor(b, b), b) === a
      xorBuffer(xorBuffer(Buffer.from(b), Buffer.from(b)), Buffer.from(b))
        .toString()
        .should.equal(Buffer.from(b).toString())
    })
    it('should xor correctly', () => {
      let a = Buffer.allocUnsafe(1).fill(1)
      let b = Buffer.allocUnsafe(1).fill(1)
      const max = 100
      let last
      for (let i = 0; i < max; i++) {
        const s = XXH.h64('' + i, seed).toString(16)
        const buf = Buffer.from(s)
        a = xorBuffer(a, buf)
        if (i !== max - 1) {
          b = xorBuffer(buf, b)
        } else {
          last = buf
        }
      }
      xorBuffer(a, b).equals(last).should.equal(true)
      xorBuffer(a, b).toString().should.equal(last.toString())
      xorBuffer(a, a).equals(Buffer.allocUnsafe(0)).should.equal(true)
      xorBuffer(b, b).equals(Buffer.allocUnsafe(0)).should.equal(true)
    })
  })

  describe('#isBufferEmpty', () => {
    it('should return true if a buffer is empty', () => {
      isEmptyBuffer(Buffer.allocUnsafe(10).fill(0)).should.equal(true)
      isEmptyBuffer(Buffer.allocUnsafe(0).fill(0)).should.equal(true)
    })
    it('should return false if a buffer is not empty', () => {
      isEmptyBuffer(Buffer.allocUnsafe(10).fill(1)).should.equal(false)
    })
  })

  describe('#getDistinctIndexes', () => {
    const key =
      'da5e21f8a67c4163f1a53ef43515bd027967da305ecfc741b2c3f40f832b7f82'
    const desiredIndices = 10000
    const result = range(0, desiredIndices, 1)
    it(`should return ${desiredIndices} distinct indices on the interval [0, ${desiredIndices})`, () => {
      try {
        const obj = new (class extends BaseFilter {})()
        const start = new Date().getTime()
        const indices = obj._hashing
          .getDistinctIndexes(key, desiredIndices, desiredIndices)
          .sort((a, b) => a - b)
        indices.should.deep.equal(result)
        console.log(
          `Generated ${
            indices.length
          } distinct indices on the interval [0, ${desiredIndices}) in ${
            new Date().getTime() - start
          } ms`
        )
      } catch (e) {
        throw Error('it should not throw: ' + e)
      }
    })
    it('should the issue be fixed', () => {
      try {
        const filter = new BloomFilter(39, 28)
        filter.add(key)
        filter.has(key).should.be.true
      } catch (e) {
        throw Error('it should not throw: ' + e)
      }
    })
  })

  describe('Use different hash functions', () => {
    it('overriding serialize function by always returning Number(1)', () => {
      class CustomHashing extends Hashing {
        serialize(_element, _seed = undefined) {
          // eslint-disable-line
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
