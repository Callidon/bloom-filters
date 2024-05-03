import { expect, test } from '@jest/globals'
import { InvertibleBloomFilter } from '../src/index.mjs'

const keys = 1000
const hashCount = 3
const alpha = 1.5
const d = 100
const size = alpha * d
const step = 10
const seed = 0x1234567890

const toInsert = [
    Buffer.from('help'),
    Buffer.from('meow'),
    Buffer.from(
        JSON.stringify({
            data: 'hello world',
        })
    ),
]
test('should add element to the filter with #add', () => {
    const iblt = new InvertibleBloomFilter(size, hashCount)
    iblt.seed = seed
    expect(iblt._hashCount).toEqual(hashCount)
    expect(iblt.size).toEqual(size)
    expect(iblt.length).toEqual(0)
    expect(iblt._elements.length).toEqual(size)
    toInsert.forEach(e => {
        iblt.add(e)
    })
    expect(iblt.length).toEqual(toInsert.length)
})

test('should remove element from the iblt', () => {
    const iblt = new InvertibleBloomFilter(size, hashCount)
    iblt.seed = seed
    expect(iblt._hashCount).toEqual(hashCount)
    expect(iblt.size).toEqual(size)
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
    const iblt = new InvertibleBloomFilter(size, hashCount)
    toInsert.forEach(e => {
        iblt.add(e)
    })
    toInsert.forEach(e => {
        const query = iblt.has(e)
        expect(query).toBe(true)
    })
})

test('should get all element from the filter', () => {
    const iblt = new InvertibleBloomFilter(size, hashCount)
    toInsert.forEach(e => {
        iblt.add(e)
    })
    const iterator = iblt.listEntries()
    const output: Buffer[] = []
    let elt = iterator.next()
    while (!elt.done) {
        output.push(elt.value)
        elt = iterator.next()
    }
    expect(output.length).toEqual(toInsert.length)
    expect(output.sort()).toEqual(toInsert.sort())
})

test('should create correctly an IBLT', () => {
    const iblt = InvertibleBloomFilter.create(size, 0.001)
    toInsert.forEach(e => {
        iblt.add(e)
    })
    const iterator = iblt.listEntries()
    const output: Buffer[] = []
    let elt = iterator.next()
    while (!elt.done) {
        output.push(elt.value)
        elt = iterator.next()
    }
    expect(output.length).toEqual(toInsert.length)
    expect(output.sort()).toEqual(toInsert.sort())
})

function buildIblt() {
    return InvertibleBloomFilter.from(
        [Buffer.from('meow'), Buffer.from('car')],
        0.001
    )
}

test('should export an Invertible Bloom Filter to a JSON object', () => {
    const iblt = buildIblt()
    const exported = iblt.saveAsJSON()
    expect(exported._seed).toEqual(seed)
    expect(exported._size).toEqual(iblt.size)
    expect(exported._hashCount).toEqual(iblt.hashCount)
    expect(exported._elements).toEqual(iblt._elements.map(e => e.saveAsJSON()))
})

test('should create an Invertible Bloom Filter from a JSON export', () => {
    const iblt = buildIblt()
    const exported = iblt.saveAsJSON()
    const newIblt = InvertibleBloomFilter.fromJSON(exported)
    expect(iblt.equals(newIblt)).toBe(true)
    expect(newIblt.seed).toEqual(iblt.seed)
})

let values: number[] = []
for (let i = step; i <= d; i += step) {
    values.push(i)
}
test.each(values)(
    `should decodes correctly element for a set difference of %i with ${keys.toString()} keys, ${hashCount.toString()} hash functions, [alpha = ${alpha.toString()}, d = ${d.toString()}]`,
    differences => {
        commonTest(size, hashCount, keys, '', differences)
    }
)

values = []
for (let k = keys; k < 100000; k = k * 10) {
    values.push(k)
}
test.each(values)(
    `should decodes correctly element for a set difference of ${d.toString()} with %i keys, ${hashCount.toString()} hash functions, [alpha = ${alpha.toString()}, d = ${d.toString()}]`,
    k => {
        commonTest(size, hashCount, k, '', d)
    }
)

function commonTest(
    size: number,
    hashCount: number,
    keys: number,
    prefix: string,
    differences: number
) {
    const iblt = new InvertibleBloomFilter(size, hashCount)
    iblt.seed = seed
    const setDiffplus: Buffer[] = []
    const setDiffminus: Buffer[] = []
    const remote = new InvertibleBloomFilter(size, hashCount)
    remote.seed = seed
    for (let i = 1; i <= keys; ++i) {
        const hash = prefix + i.toString() // XXH.h64(prefix + i, seed).toString(16)
        if (i <= keys - differences) {
            iblt.add(Buffer.from(hash, 'utf8'))
            remote.add(Buffer.from(hash, 'utf8'))
        } else {
            // randomly allocate the element one of plus or minus set
            if (iblt.random() < 0.5) {
                setDiffplus.push(Buffer.from(hash, 'utf8'))
                iblt.add(Buffer.from(hash, 'utf8'))
            } else {
                setDiffminus.push(Buffer.from(hash, 'utf8'))
                remote.add(Buffer.from(hash, 'utf8'))
            }
        }
    }
    expect(remote.length).toEqual(keys - setDiffplus.length)
    expect(iblt.length).toEqual(keys - setDiffminus.length)
    const sub = iblt.substract(remote)
    const res = sub.decode()

    expect(res.success).toBe(true)

    const sum = res.additional.length + res.missing.length
    expect(sum).toEqual(differences)

    expect(res.additional.map(e => e.toString()).sort()).toEqual(
        setDiffplus.map(e => e.toString()).sort()
    )
    expect(res.missing.map(e => e.toString()).sort()).toEqual(
        setDiffminus.map(e => e.toString()).sort()
    )
}
