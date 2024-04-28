/* file : bit-set-test.js
MIT License

Copyright (c) 2021 David Leppik

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

import {BitSet} from '../src/api'
import {expect, describe, test} from '@jest/globals'

describe('BitSet', () => {
  test('is initially clear', () => {
    const set = new BitSet(50)
    console.log(set)
    expect(set.size).toEqual(56)
    for (let i = 0; i < set.size; i++) {
      expect(set.has(i)).toEqual(false)
    }
  })

  test('#add', () => {
    const set = new BitSet(50)
    expect(set.size).toEqual(56)
    for (let i = 0; i < set.size; i++) {
      expect(set.has(i)).toEqual(false)
      set.add(i)
      expect(set.has(i)).toEqual(true)
    }
  })

  describe('#max', () => {
    test('finds the high bit', () => {
      const set = new BitSet(150)
      expect(set.size).toEqual(152)
      for (let i = 0; i < set.size; i++) {
        set.add(i)
        expect(set.max()).toEqual(i)
      }
    })
  })

  describe('#import, #export', () => {
    test('imports what it exports', () => {
      const set = new BitSet(50)
      for (let i = 0; i < set.size; i += 3) {
        // 3 is relatively prime to 8, so should hit all edge cases
        set.add(i)
      }
      const exported = set.export()
      const imported = BitSet.import(exported)
      expect(imported.size).toEqual(set.size)
      for (let i = 0; i < set.size; i++) {
        const expected = i % 3 === 0
        expect(set.has(i)).toEqual(expected)
      }
    })

    describe('#import', () => {
      test('Throws an Error on bad data', () => {
        ;[{size: 1}, {content: 'Ag=='}, {size: 'cow', content: 'Ag=='}].forEach(
          (json: any) => {
            expect(() => BitSet.import(json)).toThrow(Error)
          }
        )
      })
    })
  })

  describe('#equals', () => {
    test('returns true on identical size and data', () => {
      const a = new BitSet(50)
      const b = new BitSet(50)
      expect(a.equals(b)).toEqual(true)
      for (let i = 0; i < a.size; i += 3) {
        // 3 is relatively prime to 8, so should hit all edge cases
        a.add(i)
        b.add(i)
        expect(a.equals(b)).toEqual(true)
      }
    })

    test('returns false on different size', () => {
      expect(new BitSet(50).equals(new BitSet(150))).toEqual(false)
    })

    test('returns false on different data', () => {
      let a = new BitSet(50)
      const b = new BitSet(50)
      a.add(3)
      expect(a.equals(b)).toEqual(false)
      a = new BitSet(50)
      expect(a.equals(b)).toEqual(true)
      a.add(49)
      expect(a.equals(b)).toEqual(false)
    })
  })

  describe('#bitCount', () => {
    test('counts the number of bits', () => {
      const set = new BitSet(50)
      let expectedCount = 0
      expect(set.bitCount()).toEqual(expectedCount)
      for (let i = 0; i < set.size; i += 3) {
        set.add(i)
        expectedCount++
        expect(set.bitCount()).toEqual(expectedCount)
      }
    })
  })
})
