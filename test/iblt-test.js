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
const { InvertibleBloomFilter } = require('../dist/api.js')
const random = require('random')
const seedrandom = require('seedrandom')

describe('Invertible Bloom Lookup Tables', () => {
  const keys = 1000
  const hashCount = 3
  const alpha = 1.5
  const d = 100
  const size = alpha * d
  const step = 10
  const seed = 0x1234567890
  random.use(seedrandom(seed))
  const toInsert = [Buffer.from('help'), Buffer.from('meow'), Buffer.from(JSON.stringify({
    data: 'hello world'
  }))]

  describe('#add', () => {
    it('should add element to the filter with #add', () => {
      const iblt = new InvertibleBloomFilter(size, hashCount)
      iblt.seed = seed
      iblt._hashCount.should.equal(hashCount)
      iblt.size.should.equal(size)
      iblt.length.should.equal(0)
      iblt._elements.length.should.equal(size)
      toInsert.forEach(e => {
        iblt.add(e)
      })
      iblt.length.should.equal(toInsert.length)
    })
  })

  describe('#remove', () => {
    it('should remove element from the iblt', () => {
      const iblt = new InvertibleBloomFilter(size, hashCount)
      iblt.seed = seed
      iblt._hashCount.should.equal(hashCount)
      iblt.size.should.equal(size)
      iblt.length.should.equal(0)
      iblt._elements.length.should.equal(size)
      toInsert.forEach(e => {
        iblt.add(e)
      })
      iblt.length.should.equal(toInsert.length)
      toInsert.forEach(e => {
        iblt.remove(e)
      })
      iblt.length.should.equal(0)
    })
  })

  describe('#has', () => {
    it('should get an element from the iblt with #has', () => {
      const iblt = new InvertibleBloomFilter(size, hashCount)
      toInsert.forEach(e => {
        iblt.add(e)
      })
      toInsert.forEach(e => {
        const query = iblt.has(e)
        query.should.equal(true)
      })
    })
  })

  describe('#listEntries', () => {
    it('should get all element from the filter', () => {
      const iblt = new InvertibleBloomFilter(size, hashCount)
      toInsert.forEach(e => {
        iblt.add(e)
      })
      const iterator = iblt.listEntries()
      const output = []
      let elt = iterator.next()
      while(!elt.done) {
        output.push(elt.value)
        elt = iterator.next()
      }
      elt.value.should.equal(true)
      output.length.should.equals(toInsert.length)
      output.sort().should.eqls(toInsert.sort())
    })
  })

  describe('#create', () => {
    it('should create correctly an IBLT', () => {
      const iblt = InvertibleBloomFilter.create(size, 0.001)
      toInsert.forEach(e => {
        iblt.add(e)
      })
      const iterator = iblt.listEntries()
      const output = []
      let elt = iterator.next()
      while(!elt.done) {
        output.push(elt.value)
        elt = iterator.next()
      }
      elt.value.should.equal(true)
      output.length.should.equals(toInsert.length)
      output.sort().should.eqls(toInsert.sort())
    })
  })

  describe('#saveAsJSON', () => {
    const iblt = InvertibleBloomFilter.from([Buffer.from('meow'), Buffer.from('car')], 0.001)

    it('should export an Invertible Bloom Filter to a JSON object', () => {
      const exported = iblt.saveAsJSON()      
      exported._seed.should.equal(seed)
      exported.type.should.equal('InvertibleBloomFilter')
      exported._size.should.equal(iblt.size)
      exported._hashCount.should.equal(iblt.hashCount)
      exported._elements.should.deep.equal(iblt._elements.map(e => e.saveAsJSON()))
    })

    it('should create an Invertible Bloom Filter from a JSON export', () => {
      const exported = iblt.saveAsJSON()
      const newIblt = InvertibleBloomFilter.fromJSON(exported)
      iblt.equals(newIblt).should.equals(true)
    })

    it('should reject imports from invalid JSON objects', () => {
      const invalids = [
        { type: 'something' },
        { type: 'InvertibleBloomFilter' },
        { type: 'InvertibleBloomFilter', size: 10 },
        { type: 'InvertibleBloomFilter', size: 10, hashCount: 2 },
        { type: 'InvertibleBloomFilter', size: 10, hashCount: 4 },
        { type: 'InvertibleBloomFilter', size: 10, hashCount: 4, invalid: 4 },
        { type: 'InvertibleBloomFilter', size: 10, hashCount: 4, invalid: 4, seed: 1 }
      ]

      invalids.forEach(json => {
        (function () {
          InvertibleBloomFilter.fromJSON(json)
        }).should.throw(Error)
      })
    })

    it('should accept import from a valid JSON object', () => {
      (function () {
        InvertibleBloomFilter.fromJSON({
          type: 'InvertibleBloomFilter', _size: 10, _hashCount: 4, _elements: [], _seed: 1
        })
      }).should.not.throw(Error)
    })
  })

  describe(`Set differences of [10 to ${d}] with ${keys} keys, ${hashCount} hash functions, [alpha = ${alpha}, d = ${d}]=${alpha * d} cells`, () => {
    for (let i = step; i <= d; i += step) {
      it('should decodes correctly element for a set difference of ' + i, () => {
        const differences = i
        commonTest(size, hashCount, keys, '', differences)
      }).timeout(0)
    }
  })
  for (let k = keys; k < 100000; k = k * 10) {
    describe(`[Performance] Set differences of [10 to ${d}] with ${k} keys, ${hashCount} hash functions, [alpha = ${alpha}, d = ${d}]=${alpha * d} cells`, () => {
      it('should decodes correctly element for a set difference of ' + d, () => {
        commonTest(size, hashCount, k, '', d)
      }).timeout(0)
    })
  }

  function commonTest (size, hashCount, keys, prefix, differences) {
    const iblt = new InvertibleBloomFilter(size, hashCount, seed)
    iblt.seed = seed
    const setDiffplus = []
    const setDiffminus = []
    const remote = new InvertibleBloomFilter(size, hashCount, seed)
    remote.seed = seed
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
    const res = sub.decode()
    try {
      res.success.should.equal(true)
    } catch (e) {
      // console.log('Additional: ', res.additional, ' Missing: ', res.missing)
      // console.log('Additional: ', res.additional.map(e => e.toString()), ' Missing: ', res.missing.map(e => e.toString()))
      // console.log('Additional: ', res.additional.map(e => e.toString()).length, ' Missing: ', res.missing.map(e => e.toString()).length)
      // console.log('Number of differences found: ', res.additional.length + res.missing.length)
      // console.log('Should have: ', setDiffplus.length, setDiffminus.length, setDiffminus.length + setDiffplus.length)
      throw e
    }
    const sum = res.additional.length + res.missing.length
    sum.should.equal(differences)
    // console.log('Set diff A:', setDiffplus.map(e => e.toString()))
    // console.log('Set diff B:', setDiffminus.map(e => e.toString()))
    // console.log('Additional: ', res.additional.map(e => e.toString()), ' Missing: ', res.missing.map(e => e.toString()))
    res.additional.map(e => e.toString()).sort().should.eql(setDiffplus.map(e => e.toString()).sort())
    res.missing.map(e => e.toString()).sort().should.eql(setDiffminus.map(e => e.toString()).sort())
  }
})
