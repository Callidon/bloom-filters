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

require('chai').should()
require('chai').expect()
const {describe, it} = require('mocha')
const {InvertibleBloomFilter} = require('../dist/api.js')
const {randomInt} = require('../dist/utils.js')
const random = require('random').default
const range = require('lodash/range')
const seedrandom = require('seedrandom')

describe('Invertible Bloom Lookup Tables', () => {
  const keys = 1000
  const hashCount = 3
  const alpha = 1.5
  const d = 100
  let size = Math.ceil(alpha * d)
  size = size + (hashCount - (size % hashCount))
  const step = 10
  const seed = 0x1234567890
  random.use(seedrandom(seed))
  const toInsert = [
    'help',
    'meow',
    JSON.stringify({
      data: 'hello world',
    }),
  ]

  describe('#add', () => {
    it('should add element to the filter with #add', () => {
      const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
      iblt._hashCount.should.equal(hashCount)
      iblt._size.should.equal(size)
      iblt.length.should.equal(0)
      iblt._elements.length.should.equal(size)
      toInsert.forEach(e => {
        iblt.add(e)
      })
      iblt.length.should.equal(toInsert.length)
    })
    it('adding one element should be a pure cell', () => {
      const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
      iblt.add('meow')
      const cell = iblt._elements.find(c => c._count !== 0)
      iblt.isCellPure(cell).should.equal(true)
    })
  })

  describe('#remove', () => {
    it('should remove element from the iblt', () => {
      const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
      iblt._hashCount.should.equal(hashCount)
      iblt._size.should.equal(size)
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
      const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
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
      const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
      toInsert.forEach(e => {
        iblt.add(e)
      })
      const output = iblt.listEntries()
      output.length.should.equals(toInsert.length)
      output.sort().should.eqls(toInsert.sort())
    })
  })

  describe('#create', () => {
    it('should create correctly an IBLT', () => {
      const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
      toInsert.forEach(e => {
        iblt.add(e)
      })
      const output = iblt.listEntries()
      output.length.should.equals(toInsert.length)
      output.sort().should.eqls(toInsert.sort())
    })
  })

  it('should export an Invertible Bloom Filter to a JSON object', () => {
    const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
    toInsert.forEach(e => {
      iblt.add(e)
    })
    const exported = iblt.saveAsJSON()
    exported._seed.should.equals(seed)
    exported._size.should.equals(iblt._size)
    exported._hashCount.should.equals(iblt._hashCount)
    exported._alpha.should.equals(iblt._alpha)
    exported._differences.should.equals(iblt._differences)
    exported._elements.forEach((item, index) => {
      JSON.stringify(item).should.equals(
        JSON.stringify(iblt._elements[index].saveAsJSON())
      )
    })
  })

  describe(`Multiple run with different seeds for d=${d}`, () => {
    range(0, 10)
      .map(r => [r, randomInt(1, Number.MAX_SAFE_INTEGER)])
      .forEach(([r, seed]) => {
        it(`should decodes correctly elements (run ${r} with seed ${seed})`, () => {
          const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
          const setDiffplus = []
          const setDiffminus = []
          const remote = new InvertibleBloomFilter(d, alpha, hashCount, seed)
          for (let i = 0; i < keys; ++i) {
            const hash = i.toString()
            if (i < keys - d) {
              iblt.add(hash)
              remote.add(hash)
            } else {
              // randomly allocate the element one of plus or minus set
              const rn = iblt.random()
              if (rn < 0.5) {
                setDiffplus.push(hash)
                iblt.add(hash)
              } else {
                setDiffminus.push(hash)
                remote.add(hash)
              }
            }
          }
          remote.length.should.equals(keys - setDiffplus.length)
          iblt.length.should.equals(keys - setDiffminus.length)
          const diff = setDiffplus.length + setDiffminus.length
          diff.should.equals(d)

          // substract
          const sub = iblt.substract(remote)
          // if no pure = no decode; we must have at least one pure cell
          sub._elements.some(c => sub.isCellPure(c)).should.equals(true)

          const res = sub.decode()
          res.success.should.equals(true, JSON.stringify(res))

          JSON.stringify(res.additional.sort()).should.equals(
            JSON.stringify(setDiffplus.sort())
          )
          JSON.stringify(res.missing.sort()).should.equals(
            JSON.stringify(setDiffminus.sort())
          )
        })
      })
  })
})
