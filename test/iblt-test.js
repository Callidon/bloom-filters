/* file : bloom-filter-test.js
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
require('chai').expect()
const InvertibleBloomFilter = require('../src/invertible-bloom-lookup-tables.js').InvertibleBloomFilter
const utils = require('../src/utils')
const random = require('random')
const seedrandom = require('seedrandom')

const XXH = require('xxhashjs')

describe('Invertible Bloom Lookup Tables', () => {
  // const alpha = 2
  // const differences = 100
  // const hashCount = 3
  // const size = alpha * differences
  // const toInsert = [Buffer.from('help'), Buffer.from('meow'), Buffer.from(JSON.stringify({
  //   data: 'hello world'
  // }))]
  // const toCompare = [Buffer.from('meow'), Buffer.from('balloon')]
  // const diffA = [Buffer.from('balloon')]
  // const diffB = [Buffer.from('help'), Buffer.from(JSON.stringify({
  //   data: 'hello world'
  // }))]
  //
  // describe('#add', () => {
  //   it('should add element to the filter with #add', () => {
  //     const iblt = new InvertibleBloomFilter(size, hashCount)
  //     iblt._hashCount.should.equal(hashCount)
  //     iblt.size.should.equal(size)
  //     iblt.length.should.equal(0)
  //     iblt._elements.length.should.equal(size)
  //     toInsert.forEach(e => {
  //       iblt.add(e)
  //     })
  //     iblt.length.should.equal(toInsert.length)
  //   })
  // })
  //
  // describe('#delete', () => {
  //   it('should delete element from the iblt with #delete', () => {
  //     const iblt = new InvertibleBloomFilter(size, hashCount)
  //     iblt._hashCount.should.equal(hashCount)
  //     iblt.size.should.equal(size)
  //     iblt.length.should.equal(0)
  //     iblt._elements.length.should.equal(size)
  //     toInsert.forEach(e => {
  //       iblt.add(e)
  //     })
  //     iblt.length.should.equal(toInsert.length)
  //     toInsert.forEach(e => {
  //       iblt.delete(e)
  //     })
  //     iblt.length.should.equal(0)
  //   })
  // })
  //
  // describe('#has', () => {
  //   it('should get an element from the iblt with #has', () => {
  //     const iblt = new InvertibleBloomFilter(size, hashCount)
  //     iblt._hashCount.should.equal(hashCount)
  //     iblt.size.should.equal(size)
  //     iblt.length.should.equal(0)
  //     iblt._elements.length.should.equal(size)
  //     toInsert.forEach(e => {
  //       iblt.add(e)
  //       iblt.has(e).should.equal(true)
  //     })
  //   })
  // })
  //
  // describe('#listEntries', () => {
  //   it('should get all element from the iblt with #listEntries', () => {
  //     const iblt = new InvertibleBloomFilter(size, hashCount)
  //     iblt._hashCount.should.equal(hashCount)
  //     iblt.size.should.equal(size)
  //     iblt.length.should.equal(0)
  //     iblt._elements.length.should.equal(size)
  //     toInsert.forEach(e => {
  //       iblt.add(e)
  //     })
  //     const res = iblt.listEntries()
  //     res.success.should.equal(true)
  //     res.output.sort().should.eql(toInsert.sort())
  //   })
  // })
  //
  // describe('Substracting (#substract) and Decoding (#decode)', () => {
  //   it('should substract and decode two arrays correctly', () => {
  //     const iblt = new InvertibleBloomFilter(size, hashCount)
  //     const iblt2 = new InvertibleBloomFilter(size, hashCount)
  //     toInsert.forEach(e => {
  //       iblt.add(e)
  //     })
  //     toCompare.forEach(e => {
  //       iblt2.add(e)
  //     })
  //     // should receive an iblt with 42 and car as elements in
  //     const sub = iblt.substract(iblt2)
  //     const result = InvertibleBloomFilter.decode(sub)
  //     result.missing.sort().should.eql(diffA.sort())
  //     result.additional.sort().should.eql(diffB.sort())
  //   })
  // })
  //
  // describe('#saveAsJSON', () => {
  //   const iblt = InvertibleBloomFilter.from([Buffer.from('meow'), Buffer.from('car')], 100, 4)
  //
  //   it('should export an Invertible Bloom Filter to a JSON object', () => {
  //     const exported = iblt.saveAsJSON()
  //     exported.type.should.equal('InvertibleBloomFilter')
  //     exported._size.should.equal(iblt.size)
  //     exported._hashCount.should.equal(iblt.hashCount)
  //     exported._elements.should.deep.equal(iblt._elements)
  //   })
  //
  //   it('should create an Invertible Bloom Filter from a JSON export', () => {
  //     const exported = iblt.saveAsJSON()
  //     const newIblt = InvertibleBloomFilter.fromJSON(exported)
  //     newIblt.size.should.equal(iblt._size)
  //     newIblt.hashCount.should.equal(iblt._hashCount)
  //     newIblt.elements.should.deep.equal(iblt._elements)
  //   })
  //
  //   it('should reject imports from invalid JSON objects', () => {
  //     const invalids = [
  //       { type: 'something' },
  //       { type: 'InvertibleBloomFilter' },
  //       { type: 'InvertibleBloomFilter', size: 10 },
  //       { type: 'InvertibleBloomFilter', size: 10, hashCount: 2 },
  //       { type: 'InvertibleBloomFilter', size: 10, hashCount: 4 },
  //       { type: 'InvertibleBloomFilter', size: 10, hashCount: 4, invalid: 4 }
  //     ]
  //
  //     invalids.forEach(json => {
  //       (function () {
  //         InvertibleBloomFilter.fromJSON(json)
  //       }).should.throw(Error, 'Cannot create an InvertibleBloomFilter from a JSON export which does not represent an Invertible Bloom Filter')
  //     })
  //   })
  //
  //   it('should accept import from a valid JSON object', () => {
  //     (function () {
  //       InvertibleBloomFilter.fromJSON({
  //         type: 'InvertibleBloomFilter', _size: 10, _hashCount: 4, _elements: []
  //       })
  //     }).should.not.throw(Error, 'Cannot create an InvertibleBloomFilter from a JSON export which does not represent an Invertible Bloom Filter')
  //   })
  // })
  const keys = 500
  const hashCount = 3
  const alpha = 1.5
  const d = 100
  const step = 10
  const seed = 123453
  random.use(seedrandom(seed))
  describe(`Set differences of [10 to ${d}] with ${keys} keys, ${hashCount} hash functions, [alpha = ${alpha}, d = ${d}]=${alpha * d} cells`, () => {
    const set = []
    const prefix = ''
    const size = alpha * d
    for (let i = 1; i <= keys; ++i) {
      const hash = prefix + i
      if (set.includes(hash)) throw new Error('collision')
      set.push(hash)
    }

    for (let i = step; i <= d; i += step) {
      it('should decodes correctly element for a set difference of ' + i, () => {
        let differences = i
        commonTest(size, hashCount, keys, prefix, differences)
      })
    }

    function commonTest (size, hashCount, keys, prefix, differences) {
      const iblt = new InvertibleBloomFilter(size, hashCount)
      const setDiffplus = []
      const setDiffminus = []
      const remote = new InvertibleBloomFilter(size, hashCount)
      for (let i = 1; i <= keys; ++i) {
        const hash = prefix + i // XXH.h64(prefix + i, seed).toString(16)
        if (i <= (keys - differences)) {
          iblt.add(Buffer.from(hash, 'utf8'))
          remote.add(Buffer.from(hash, 'utf8'))
        } else {
          // randomly allocate the element one of plus or minus set
          if (random.float() < 0.5) {
            setDiffplus.push(Buffer.from(hash, 'utf8'))
            iblt.add(Buffer.from(hash, 'utf8'))
          } else {
            setDiffminus.push(Buffer.from(hash, 'utf8'))
            remote.add(Buffer.from(hash, 'utf8'))
          }
        }
      }
      remote.length.should.equal(keys - setDiffplus.length)
      iblt.length.should.equal(keys - setDiffminus.length)
      const sub = iblt.substract(remote)
      const res = InvertibleBloomFilter.decode(sub)
      try {
        res.success.should.equal(true)
      } catch (e) {
        console.log('Additional: ', res.additional, ' Missing: ', res.missing)
        console.log('Additional: ', res.additional.map(e => e.toString()), ' Missing: ', res.missing.map(e => e.toString()))
        console.log('Additional: ', res.additional.map(e => e.toString()).length, ' Missing: ', res.missing.map(e => e.toString()).length)
        console.log('Number of differences found: ', res.additional.length + res.missing.length)
        console.log('Should have: ', setDiffplus.length, setDiffminus.length, setDiffminus.length + setDiffplus.length)
        throw e
      }
      let sum = res.additional.length + res.missing.length
      sum.should.equal(differences)
      // console.log('Set diff A:', setDiffplus.map(e => e.toString()))
      // console.log('Set diff B:', setDiffminus.map(e => e.toString()))
      // console.log('Additional: ', res.additional.map(e => e.toString()), ' Missing: ', res.missing.map(e => e.toString()))
      res.additional.map(e => e.toString()).sort().should.eql(setDiffplus.map(e => e.toString()).sort())
      res.missing.map(e => e.toString()).sort().should.eql(setDiffminus.map(e => e.toString()).sort())
    }
  })

  describe('xorBuffer', () => {
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
        const s = XXH.h64('' + i, 0).toString(16)
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
})
