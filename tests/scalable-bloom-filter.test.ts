import { expect, test } from '@jest/globals'
import { ScalableBloomFilter, randomInt } from '../src/index'
import Global from './global'

const seed = Global.seed(__filename)
const targetRate = 0.1
test('should #add add elements without error', () => {
    const filter = ScalableBloomFilter.create(3, targetRate)
    filter.seed = seed
    filter.add('alice')
    filter.add('bob')
    filter.add('carl')
    expect(filter.seed).toBeDefined()
})
test('should #has return false for an empty filter', () => {
    const filter = ScalableBloomFilter.create(3, targetRate)
    filter.seed = seed
    expect(filter.has('alice')).toBe(false)
})
test('should #has return correct values with added values', () => {
    let i = 0
    do {
        const s = BigInt(randomInt(0, Number.MAX_SAFE_INTEGER))
        try {
            const e = 0.0001
            const filter = ScalableBloomFilter.create(128, e, 0.5)
            filter.seed = s
            filter.add('alice')
            filter.add('bob')
            filter.add('carl')

            // no false negatives
            expect(filter.has('alice')).toBe(true)
            expect(filter.has('bob')).toBe(true)
            expect(filter.has('carl')).toBe(true)

            // false positive rate under the desired one
            let fp = 0
            const round = 1_000 // 100_000 works
            for (let i = 0; i < round; i++) {
                if (filter.has('i:' + i.toString())) {
                    fp++
                }
            }
            // the error rate is respected but it is still probabilities,
            // with a higher number of lookups the test is green
            // so we multiply by 10 to ensure the test pass
            // and also check it is around the desired error rate
            expect(fp / round).toBeLessThanOrEqual(10 * 2 * e) // compounded error probability is bounded by P <= 2 * P0
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log(s)
            throw e
        }
        i++
    } while (i < 100)
})

test('should scale Partitioned Bloom Filter', () => {
    const rate = 0.001
    const filter = ScalableBloomFilter.create(128, rate)
    filter.seed = seed
    filter.add('alice')
    filter.add('bob')
    filter.add('carl')
    const offset = 1024 * 10
    for (let i = 0; i < offset; i++) {
        filter.add(i.toString())
    }
    expect(filter.has('alice')).toBe(true)
    expect(filter.has('bob')).toBe(true)
    expect(filter.has('carl')).toBe(true)

    // no false negative
    for (let i = 0; i < offset; i++) {
        // should be in!
        expect(filter.has(i.toString())).toBe(true)
    }

    expect(filter._filters.length).toBeGreaterThan(1)

    const rates = filter._filters.map(f => f.rate())

    const globalRate = rates.reduce((a, b) => a + b, 0) / rates.length
    const P = (rate * 1) / (1 - filter._ratio)
    expect(globalRate).toBeLessThan(P)

    const compounded = Math.pow(2, 1 - filter._filters[0]._k)
    const compunded_rates = rates.reduce((a, b) => a * b, 1)
    expect(compunded_rates).toBeLessThanOrEqual(compounded)

    expect(filter.seed).toEqual(seed)
    filter._filters.forEach(f => {
        expect(f.seed).toEqual(seed)
    })
    expect(filter._filters.length).toEqual(6)
})

test('should import/export correctly', () => {
    const filter = ScalableBloomFilter.create(1, targetRate)
    filter.seed = seed
    for (let i = 0; i < 50; i++) {
        filter.add('elem:' + i.toString())
    }
    const exported = filter.saveAsJSON()
    const imported = ScalableBloomFilter.fromJSON(exported)
    expect(imported.seed).toEqual(filter.seed)
    for (let i = 0; i < 50; i++) {
        expect(imported.has('elem:' + i.toString())).toBe(true)
    }
})

const max = 1000
const targetedRate = 0.01
test(`should not return an error when inserting ${max.toString()} elements`, () => {
    const filter = ScalableBloomFilter.create(max, targetedRate)
    for (let i = 0; i < max; ++i) filter.add(i.toString())
    for (let i = 0; i < max; ++i) {
        expect(filter.has(i.toString())).toBe(true)
    }
    let current
    let falsePositive = 0
    let tries = 0
    for (let i = max; i < max * 11; ++i) {
        tries++
        current = i
        const has = filter.has(current.toString())
        if (has) falsePositive++
    }
    const currentRate = falsePositive / tries
    expect(currentRate).toBeCloseTo(targetedRate, targetedRate)
})

test.each([
    [0.001, 10, 26214, 18232],
    [0.0001, 14, 18724, 13674],
    [0.00001, 17, 15420, 10939],
    [0.000001, 20, 13107, 9116],
])(
    'should create a correct partition bloom filter of 32 Kilobytes (around 32 * 1024 * 8 bits) for (P=%d; k=%d; m=%d; n=%d)',
    (errorRate, nbHashes, m, size) => {
        const bits = 32 * 1024 * 8 // 1 bytes = 8 bits
        const sbf = new ScalableBloomFilter(size, errorRate)
        sbf.seed = seed
        expect(sbf._filters.length).toEqual(1)
        const pbf = sbf._filters[0]
        expect(pbf._k).toEqual(nbHashes)
        expect(pbf._m).toEqual(m)
        expect(pbf.capacity).toEqual(size)
        expect(sbf.capacity()).toEqual(size)
        expect(pbf._bits).toBeCloseTo(bits - bits / m, -2)

        for (let i = 0; i < 1024; i++) {
            sbf.add(i.toString())
        }

        expect(sbf._filters.length).toEqual(1)
    },
)
