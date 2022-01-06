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

require('chai').should()
const {BitSet} = require('../dist/api')

describe('BitSet', () => {
  it('is initially clear', () => {
    const set = new BitSet(50)
    set.size.should.equal(56)
    for (let i = 0; i < set.size; i++) {
      set.has(i).should.equal(false)
    }
  })

  it('#add', () => {
    const set = new BitSet(50)
    set.size.should.equal(56)
    for (let i = 0; i < set.size; i++) {
      set.has(i).should.equal(false)
      set.add(i)
      set.has(i).should.equal(true)
    }
  })

  describe('#max', () => {
    it('finds the high bit', () => {
      const set = new BitSet(150)
      set.size.should.equal(152)
      for (let i = 0; i < set.size; i++) {
        set.add(i)
        set.max().should.equal(i)
      }
    })
  })

  describe('#import, #export', () => {
    it('imports what it exports', () => {
      const set = new BitSet(50)
      for (let i = 0; i < set.size; i += 3) {
        // 3 is relatively prime to 8, so should hit all edge cases
        set.add(i)
      }
      const exported = set.export()
      const imported = BitSet.import(exported)
      imported.size.should.equal(set.size)
      for (let i = 0; i < set.size; i++) {
        const expected = i % 3 === 0
        set.has(i).should.equal(expected)
      }
    })

    describe('#import', () => {
      it('Throws an Error on bad data', () => {
        ;[{size: 1}, {content: 'Ag=='}, {size: 'cow', content: 'Ag=='}].forEach(
          json => (() => BitSet.import(json)).should.throw(Error)
        )
      })
    })
  })

  describe('#equals', () => {
    it('returns true on identical size and data', () => {
      const a = new BitSet(50)
      const b = new BitSet(50)
      a.equals(b).should.equal(true)
      for (let i = 0; i < a.size; i += 3) {
        // 3 is relatively prime to 8, so should hit all edge cases
        a.add(i)
        b.add(i)
        a.equals(b).should.equal(true)
      }
    })

    it('returns false on different size', () => {
      new BitSet(50).equals(new BitSet(150)).should.equal(false)
    })

    it('returns false on different data', () => {
      let a = new BitSet(50)
      const b = new BitSet(50)
      a.add(3)
      a.equals(b).should.equal(false)
      a = new BitSet(50)
      a.equals(b).should.equal(true)
      a.add(49)
      a.equals(b).should.equal(false)
    })
  })

  describe('#bitCount', () => {
    it('counts the number of bits', () => {
      const set = new BitSet(50)
      let expectedCount = 0
      set.bitCount().should.equal(expectedCount)
      for (let i = 0; i < set.size; i += 3) {
        set.add(i)
        expectedCount++
        set.bitCount().should.equal(expectedCount)
      }
    })
  })
})
