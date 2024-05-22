import { expect, test } from '@jest/globals'
import { CuckooFilter, randomInt } from '../src/index'

const seed = BigInt(randomInt(0, Number.MAX_SAFE_INTEGER))
// console.log('Cuckoo seed: ', seed)

test('should compute the fingerprint and indexes for an element', () => {
    const filter = new CuckooFilter(15, 3, 2, 1)
    const nextP2 = 16
    filter.seed = seed
    const element = 'foo'
    const hash = filter._hashing._lib.xxh64(element, filter.seed)
    const fingerprint = hash
        .toString(2)
        .padStart(64, '0')
        .substring(64 - 3)
    expect(fingerprint.length).toEqual(3)

    const firstIndex = hash
    const secondIndex = firstIndex ^ filter.hash(fingerprint)

    const locations = filter._locations(element)
    expect(fingerprint).toEqual(locations.fingerprint)
    expect(Number(BigInt.asUintN(32, firstIndex)) % nextP2).toEqual(locations.firstIndex)
    expect(Number(BigInt.asUintN(32, secondIndex)) % nextP2).toEqual(locations.secondIndex)
})

test('should add element to the filter with #add', () => {
    const filter = CuckooFilter.create(15, 0.01)
    filter.seed = seed
    let nbElements = 0
    filter.add('alice')
    filter.add('bob')
    expect(filter.length).toEqual(2)
    filter._filter.forEach(bucket => {
        nbElements += bucket.length
    })
    expect(nbElements).toEqual(2)
})

test('should store ane element accross two different buckets', () => {
    const filter = CuckooFilter.create(15, 0.01, 2)
    filter.seed = seed
    const element = 'foo'
    let nbElements = 0

    const locations = filter._locations(element)
    // fill up all buckets (needs 4 insertions since bucket size = 2)
    filter.add(element)
    filter.add(element)
    filter.add(element)
    filter.add(element)

    // assert that buckets are full
    expect(filter._filter[locations.firstIndex].isFree()).toBe(false)
    expect(filter._filter[locations.secondIndex].isFree()).toEqual(false)

    nbElements +=
        filter._filter[locations.firstIndex].length + filter._filter[locations.secondIndex].length
    expect(nbElements).toEqual(4)
})

test('should perform random kicks when both buckets are full', () => {
    const filter = new CuckooFilter(15, 3, 1)
    filter.seed = seed
    const element = 'foo'
    const locations = filter._locations(element)
    // artificially fills up the two possible buckets with dumb values
    filter._filter[locations.firstIndex].add('xyz')
    filter._filter[locations.secondIndex].add('lol')
    filter._length += 2
    expect(filter.add(element)).toBe(true)

    // xyz or lol should have been swapped elsewhere
    expect(
        filter._filter[locations.firstIndex].has(locations.fingerprint) ||
            filter._filter[locations.secondIndex].has(locations.fingerprint),
    ).toBe(true)
    const i1 = filter._filter.findIndex(b => b.has('xyz'))
    const i2 = filter._filter.findIndex(b => b.has('lol'))
    // at least one should have been swapped
    expect(i1 !== -1 || i2 !== -1).toBe(true)
    if (i1 !== -1) expect(i1 !== locations.firstIndex)
    if (i2 !== -1) expect(i2 !== locations.secondIndex)
})

test("should reject elements that can't be inserted when filter is full", () => {
    const filter = new CuckooFilter(1, 3, 1)
    filter.seed = seed
    const element = 'foo'
    filter.add(element)
    expect(filter.add(element, false, true)).toBe(false)
})

test('should not rollback to its initial state in case the filter is full with option add(x, false, true)', () => {
    const filter = CuckooFilter.create(32, 0.01)
    filter.seed = seed
    let tested = false
    for (let i = 0; i < 1000; i++) {
        if (!filter.add(i.toString())) {
            const snapshot = JSON.stringify(filter.saveAsJSON())
            expect(() => filter.add(i.toString(), true, true)).toThrow(Error)
            expect(filter.add(i.toString(), false, true)).toBe(false)
            expect(JSON.stringify(filter.saveAsJSON())).not.toEqual(snapshot)
            tested = true
            break
        }
    }
    expect(tested).toBe(true)
})

test('should rollback to its initial state in case the filter is full', () => {
    const filter = new CuckooFilter(10, 3, 1)
    filter.seed = seed
    // add some keys until it gets full
    let snapshot = filter.saveAsJSON()
    for (let i = 0; i < 1000; i++) {
        if (!filter.add(i.toString())) {
            const snapshot2 = filter.saveAsJSON()
            expect(snapshot).toEqual(snapshot2)
            break
        } else {
            snapshot = filter.saveAsJSON()
        }
    }
})

test('should remove exisiting elements from the filter', () => {
    const filter = new CuckooFilter(15, 3, 1)
    filter.seed = seed
    const element = 'foo'
    const locations = filter._locations(element)

    filter.add(element)
    expect(filter.remove(element)).toBe(true)
    expect(filter._filter[locations.firstIndex].length).toEqual(0)
})

test('should fail to remove elements that are not in the filter', () => {
    const filter = new CuckooFilter(15, 3, 1)
    filter.seed = seed
    filter.add('foo')
    expect(filter.remove('moo')).toBe(false)
})

test('should return True when an element may be in the filter', () => {
    const filter = new CuckooFilter(15, 3, 1)
    filter.seed = seed
    filter.add('foo')
    expect(filter.has('foo')).toBe(true)
})

test('should return False when an element is definitively not in the filter', () => {
    const filter = new CuckooFilter(15, 3, 1)
    filter.seed = seed
    filter.add('foo')
    expect(filter.has('moo')).toBe(false)
})

test('should remove works correctly', () => {
    const filter = new CuckooFilter(15, 3, 1)
    filter.seed = seed
    expect(filter.add('foo')).toBe(true)
    expect(filter.has('foo')).toBe(true)
    filter.remove('foo')
    expect(filter.has('foo')).toBe(false)
})

test('issue#(https://github.com/Callidon/bloom-filters/issues/9)', () => {
    const elems = ['alice', 'andrew', 'bob', 'sam']
    const rate = 0.01
    const filter = CuckooFilter.from(elems, rate, undefined, undefined, seed)
    // no false negative
    elems.forEach(e => {
        expect(filter.has(e)).toBe(true)
    })

    // false positive rate should stay under the desired one
    let fp = 0
    let round = 10000
    for (let i = 0; i < round; i++) {
        elems.forEach(e => {
            // should return false
            if (filter.has(e + '-' + i.toString())) {
                fp++
            }
        })
    }
    expect(fp / (round * elems.length)).toBeLessThan(rate)
})

function buildCuckooFilter() {
    const filter = new CuckooFilter(15, 3, 2)
    filter.seed = seed
    filter.add('alice')
    filter.add('bob')
    return filter
}

test('should export a cuckoo filter to a JSON object', () => {
    const filter = buildCuckooFilter()
    const exported = filter.saveAsJSON()
    expect(exported._size).toEqual(filter.size)
    expect(exported._fingerprintLength).toEqual(filter.fingerprintLength)
    expect(exported._length).toEqual(filter.length)
    expect(exported._maxKicks).toEqual(filter.maxKicks)
    expect(exported._filter).toEqual(filter._filter.map(b => b.saveAsJSON()))
})

test('should create a cuckoo filter from a JSON export', () => {
    const filter = buildCuckooFilter()
    const exported = filter.saveAsJSON()
    const newFilter = CuckooFilter.fromJSON(exported)
    expect(newFilter.seed).toEqual(filter.seed)
    expect(newFilter.size).toEqual(filter.size)
    expect(newFilter.fingerprintLength).toEqual(filter.fingerprintLength)
    expect(newFilter.length).toEqual(filter.length)
    expect(newFilter.maxKicks).toEqual(filter.maxKicks)
    expect(newFilter._filter.every((b, index) => filter._filter[index].equals(b))).toBe(true)
})

const max = 20
const rate = 0.00001
const bucketSize = 4
test(`should not return an error when inserting and asking for ${max.toString()} elements, rate = ${rate.toString()}; bucketSize = ${bucketSize.toString()};`, () => {
    const filter = CuckooFilter.create(max, rate, bucketSize)
    filter.seed = seed
    for (let i = 0; i < max; i++) {
        expect(filter.add(i.toString())).toBe(true)
    }
    let current: number
    let falsePositive = 0
    let tries = 0
    for (let i = max; i < max * 11; ++i) {
        tries++
        current = i
        const has = filter.has(current.toString())
        if (has) falsePositive++
    }
    const currentrate = falsePositive / tries
    expect(currentrate).toBeCloseTo(rate, rate)
})

test('issue#(https://github.com/Callidon/bloom-filters/issues/68)', () => {
    let i = 0
    const round = 100
    do {
        const s = BigInt(randomInt(0, Number.MAX_SAFE_INTEGER))
        const items = [
            'https://www.youtube.com/watch?v=HJjxN05ewEc',
            'https://www.youtube.com/watch?v=BZNUo7orS3k',
            'https://www.youtube.com/watch?v=SD-McWZz_pk',
            'https://www.youtube.com/watch?v=De4QjH9fpgo',
            'https://www.youtube.com/watch?v=Hzko-cjHhTg',
            'https://www.youtube.com/watch?v=vqR-8lgOmBE',
            'https://www.youtube.com/watch?v=j6u0LH67YLk',
            'https://www.youtube.com/watch?v=B2z8ikGLRh8',
            'https://www.youtube.com/watch?v=N3ftBeP16TA',
            'https://www.youtube.com/watch?v=38RBRPwODUk',
            'https://www.youtube.com/watch?v=Ry8nSUfX6fY',
            'https://www.youtube.com/watch?v=-KrYohUJvYw',
            'https://www.youtube.com/watch?v=zRpl7Pr0fs4',
            'https://www.youtube.com/watch?v=uYYiypp6WaY',
            'https://www.youtube.com/watch?v=EPap21FBGbE',
            'https://www.youtube.com/watch?v=zN2_0WC7UfU',
            'https://www.youtube.com/watch?v=DNVwnkgTzbY',
        ]

        const errorRate = 0.04 // 4 % error rate
        let false_negative = 0
        const filter = CuckooFilter.from(items, errorRate, undefined, undefined, s)
        for (let i = 0; i < round; i++) {
            items.forEach(e => {
                if (!filter.has(e)) {
                    false_negative++
                }
            })
        }
        try {
            expect(false_negative).toEqual(0)
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log(s)
            throw e
        }

        i++
    } while (i < round)
})
