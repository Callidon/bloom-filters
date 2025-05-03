import {expect, test, describe} from '@jest/globals'
import {
  allocateArray,
  randomInt,
  xorUint8Array,
  getDefaultSeed,
} from 'bloom-filters/utils'
import BloomFilter from 'bloom-filters/bloom/bloom-filter'
import XXH from 'xxhashjs'
import Hashing from 'bloom-filters/hashing'

const seed = getDefaultSeed()

describe('Utils', () => {
  describe('#allocateArray', () => {
    test('should allocate an array with the given size and a default value', () => {
      const array = allocateArray(15, 1)
      expect(array.length).toEqual(15)
      array.forEach(value => {
        expect(value).toEqual(1)
      })
    })

    test('should allow the use of a function to set the default value', () => {
      const array = allocateArray(15, () => 'foo')
      expect(array.length).toEqual(15)
      array.forEach(value => {
        expect(value).toEqual('foo')
      })
    })
  })

  describe('#doubleHashing', () => {
    test('should perform a double hashing', () => {
      const hashing = new Hashing()
      const hashA = randomInt(Number.MIN_VALUE, Number.MAX_VALUE / 2)
      const hashB = randomInt(Number.MAX_VALUE / 2, Number.MAX_VALUE)
      const size = 1000
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      values.forEach(n => {
        expect(hashing.doubleHashing(n, hashA, hashB, size)).toEqual(
          (hashA + n * hashB + (n ** 3 - n) / 6) % size
        )
      })
    })
  })

  describe('#randomInt', () => {
    test('should generate a random int in an interval', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      expect(values).toContain(randomInt(values[0], values[9]))
    })
  })

  describe('#xorBuffer', () => {
    test('should xor correctly 2 Buffers', () => {
      const a = new Uint8Array(10).fill(0)
      const b = new Uint8Array(1).fill(1)
      const res = new Uint8Array(10).fill(0)
      res[res.length - 1] = 1
      // xor(a, b) = <Buffer 00 00 00 00 00 00 00 00 00 01>
      expect(xorUint8Array(a, b).toString()).toEqual(b.toString())
      // xor(xor(a, b), b) === a <Buffer 00 00 00 00 00 00 00 00 00 00> === <Buffer />
      expect(xorUint8Array(xorUint8Array(a, b), b).toString()).toEqual(
        new Uint8Array(0).fill(0).toString()
      )
      // xor(xor(a, b), a) === b
      expect(xorUint8Array(xorUint8Array(a, b), a).toString()).toEqual(
        b.toString()
      )
      // xor(xor(a, a), a) === a
      expect(xorUint8Array(xorUint8Array(a, a), a).toString()).toEqual(
        Uint8Array.from({length: 0}).toString()
      )
      // xor(xor(b, b), b) === a
      expect(xorUint8Array(xorUint8Array(b, b), b).toString()).toEqual(
        b.toString()
      )
    })
    test('should xor correctly', () => {
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
      expect(last).toBeDefined()
      expect(xorUint8Array(a, b).toString()).toEqual(last!.toString())
      expect(xorUint8Array(a, a).toString()).toEqual(
        Uint8Array.from({length: 0}).fill(0).toString()
      )
      expect(xorUint8Array(b, b).toString()).toEqual(
        Uint8Array.from({length: 0}).fill(0).toString()
      )
    })
  })

  describe('Use different hash functions', () => {
    test('overriding serialize function by always returning Number(1)', () => {
      class CustomHashing extends Hashing {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        serialize(_element: string, _seed = undefined) {
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
      expect(bl.equals(bl2)).toBe(true)
    })
  })
})
