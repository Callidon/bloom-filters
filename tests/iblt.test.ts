import {expect, test, describe} from '@jest/globals'
import InvertibleBloomFilter from 'bloom-filters/iblt/invertible-bloom-lookup-tables'
import {randomInt} from 'bloom-filters/utils'
import random from 'random'
import range from 'lodash/range'
import seedrandom from 'seedrandom'

describe('Invertible Bloom Lookup Tables', () => {
  const keys = 1000
  const hashCount = 3
  const alpha = 1.5
  const d = 100
  let size = Math.ceil(alpha * d)
  size = size + (hashCount - (size % hashCount))
  const seed = 0x1234567890
  random.use(seedrandom('' + seed))
  const toInsert = [
    'help',
    'meow',
    JSON.stringify({
      data: 'hello world',
    }),
  ]

  describe('#add', () => {
    test('should add element to the filter with #add', () => {
      const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
      expect(iblt._hashCount).toEqual(hashCount)
      expect(iblt._size).toEqual(size)
      expect(iblt.length).toEqual(0)
      expect(iblt._elements.length).toEqual(size)
      toInsert.forEach(e => {
        iblt.add(e)
      })
      expect(iblt.length).toEqual(toInsert.length)
    })
    test('adding one element should be a pure cell', () => {
      const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
      iblt.add('meow')
      const cell = iblt._elements.find(c => c._count !== 0)
      expect(cell).toBeDefined()
      expect(iblt.isCellPure(cell!)).toBe(true)
    })
  })

  describe('#remove', () => {
    test('should remove element from the iblt', () => {
      const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
      expect(iblt._hashCount).toEqual(hashCount)
      expect(iblt._size).toEqual(size)
      expect(iblt.length).toEqual(0)
      expect(iblt._elements.length).toEqual(size)
      toInsert.forEach(e => {
        iblt.add(e)
      })
      expect(iblt.length).toEqual(toInsert.length)
      toInsert.forEach(e => {
        iblt.remove(e)
      })
      expect(iblt.length).toEqual(0)
    })
  })

  describe('#has', () => {
    test('should get an element from the iblt with #has', () => {
      const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
      toInsert.forEach(e => {
        iblt.add(e)
      })
      toInsert.forEach(e => {
        const query = iblt.has(e)
        expect(query).toEqual(true)
      })
    })
  })

  describe('#listEntries', () => {
    test('should get all element from the filter', () => {
      const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
      toInsert.forEach(e => {
        iblt.add(e)
      })
      const output = iblt.listEntries()
      expect(output.length).toEqual(toInsert.length)
      expect(output.sort()).toEqual(toInsert.sort())
    })
  })

  describe('#create', () => {
    test('should create correctly an IBLT', () => {
      const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
      toInsert.forEach(e => {
        iblt.add(e)
      })
      const output = iblt.listEntries()
      expect(output.length).toEqual(toInsert.length)
      expect(output.sort()).toEqual(toInsert.sort())
    })
  })

  test('should export an Invertible Bloom Filter to a JSON object', () => {
    const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
    toInsert.forEach(e => {
      iblt.add(e)
    })
    const exported = iblt.saveAsJSON()
    expect(exported._seed).toEqual(seed)
    expect(exported._size).toEqual(iblt._size)
    expect(exported._hashCount).toEqual(iblt._hashCount)
    expect(exported._alpha).toEqual(iblt._alpha)
    expect(exported._differences).toEqual(iblt._differences)
    exported._elements.forEach((item, index) => {
      expect(JSON.stringify(item)).toEqual(
        JSON.stringify(iblt._elements[index].saveAsJSON())
      )
    })
  })

  describe(`Multiple run with different seeds for d=${d}`, () => {
    range(0, 10)
      .map(r => [r, randomInt(1, Number.MAX_SAFE_INTEGER)])
      .forEach(([r, seed]) => {
        test(`should decodes correctly elements (run ${r} with seed ${seed})`, () => {
          const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
          const setDiffplus: string[] = []
          const setDiffminus: string[] = []
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
          expect(remote.length).toEqual(keys - setDiffplus.length)
          expect(iblt.length).toEqual(keys - setDiffminus.length)
          const diff = setDiffplus.length + setDiffminus.length
          expect(diff).toEqual(d)

          // substract
          const sub = iblt.substract(remote)
          // if no pure = no decode; we must have at least one pure cell
          expect(sub._elements.some(c => sub.isCellPure(c))).toEqual(true)

          const res = sub.decode()
          expect(res.success).toEqual(true)

          expect(JSON.stringify(res.additional.sort())).toEqual(
            JSON.stringify(setDiffplus.sort())
          )
          expect(JSON.stringify(res.missing.sort())).toEqual(
            JSON.stringify(setDiffminus.sort())
          )
        })
      })
  })
})
