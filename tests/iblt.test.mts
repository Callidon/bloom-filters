import { expect, test } from '@jest/globals'
import { InvertibleBloomFilter, exportBigInt, randomInt } from '../src/index.mjs'
import range from 'lodash.range'

const keys = 10000
const hashCount = 6
const alpha = 2 // for the purpose of the tests we use an extremely large filter
const d = 1000
let size = Math.ceil(alpha * d)
size = size + (hashCount - (size % hashCount))
const seed = BigInt(randomInt(1, Number.MAX_SAFE_INTEGER))

const toInsert = [
    'help',
    'meow',
    JSON.stringify({
        data: 'hello world',
    }),
]
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

test('should remove element from the iblt', () => {
    const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
    iblt.seed = seed
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

test('should get an element from the iblt with #has', () => {
    const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
    toInsert.forEach(e => {
        iblt.add(e)
    })
    toInsert.forEach(e => {
        const query = iblt.has(e)
        expect(query).toBe(true)
    })
})

test('should get all element from the filter', () => {
    const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
    toInsert.forEach(e => {
        iblt.add(e)
    })
    const output = iblt.listEntries()
    expect(output.length).toEqual(toInsert.length)
    expect(output.sort()).toEqual(toInsert.sort())
})

function buildIblt() {
    const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed)
    ;['meow', 'car'].forEach(e => {
        iblt.add(e)
    })
    return iblt
}

test('should export an Invertible Bloom Filter to a JSON object', () => {
    const iblt = buildIblt()
    const exported = iblt.saveAsJSON()
    expect(exported._seed).toEqual(exportBigInt(seed))
    expect(exported._size).toEqual(iblt._size)
    expect(exported._hashCount).toEqual(iblt._hashCount)
    expect(exported._alpha).toEqual(iblt._alpha)
    expect(exported._differences).toEqual(iblt._differences)
    expect(exported._elements).toEqual(iblt._elements.map(e => e.saveAsJSON()))
})

test('should create an Invertible Bloom Filter from a JSON export', () => {
    const iblt = buildIblt()
    const exported = iblt.saveAsJSON()
    const newIblt = InvertibleBloomFilter.fromJSON(exported)
    expect(iblt.equals(newIblt)).toBe(true)
    expect(newIblt.seed).toEqual(iblt.seed)
})

test.each(range(0, 10).map(r => [r, BigInt(randomInt(1, Number.MAX_SAFE_INTEGER))]))(
    'should decodes correctly elements (run %d with seed %d)',
    (_, seed) => {
        const iblt = new InvertibleBloomFilter(d, alpha, hashCount, seed as bigint)
        const setDiffplus: string[] = []
        const setDiffminus: string[] = []
        const remote = new InvertibleBloomFilter(d, alpha, hashCount, seed as bigint)
        for (let i = 0; i < keys; ++i) {
            // const hash = encoder.encode(i.toString())
            const hash = i.toString()
            if (i < keys - d) {
                iblt.add(hash)
                remote.add(hash)
            } else {
                // randomly allocate the element one of plus or minus set
                const rn = iblt.random()
                if (rn < 0.3) {
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
        expect(setDiffplus.length + setDiffminus.length).toEqual(d)

        // we should have at least one pure cell in order to decode it
        expect(iblt._elements.some(c => iblt.isCellPure(c)))
        expect(remote._elements.some(c => remote.isCellPure(c)))

        // substract
        const sub = iblt.substract(remote)
        // if no pure = no decode; we must have at least one pure cell
        expect(sub._elements.some(c => sub.isCellPure(c)))

        const res = sub.decode()
        if (!res.success) {
            const decoder = new TextDecoder()
        }
        expect(res.success).toBe(true)

        expect(res.additional.sort()).toEqual(setDiffplus.sort())
        expect(res.missing.sort()).toEqual(setDiffminus.sort())
    },
)
