import { expect, test } from '@jest/globals'
import { CuckooFilter, ExportedCuckooFilter, getBigIntAbs } from '../src/index.mjs'

test('should compute the fingerprint and indexes for an element', () => {
    const filter = new CuckooFilter(15, 3, 2, 1)
    const element = 'foo'
    const hashes = filter._hashing.hashIntAndString(element, filter.seed)
    const hash = hashes.int
    const fingerprint = hashes.string.substring(0, 3)

    const firstIndex = getBigIntAbs(hash)
    const secondIndex = firstIndex ^ getBigIntAbs(filter.hash(fingerprint))

    const locations = filter._locations(element)
    expect(fingerprint).toEqual(locations.fingerprint)
    expect(Number(firstIndex % BigInt(filter.size))).toEqual(locations.firstIndex)
    expect(Number(secondIndex % BigInt(filter.size))).toEqual(locations.secondIndex)
})

test('should add element to the filter with #add', () => {
    const filter = CuckooFilter.create(15, 0.01)
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
    const filter = new CuckooFilter(15, 3, 1, 1)
    const element = 'foo'
    let nbElements = 0
    const locations = filter._locations(element)
    // artificially fills up the two possible buckets with dumb values
    filter._filter[locations.firstIndex].add('xyz')
    filter._filter[locations.secondIndex].add('lol')
    filter._length += 2
    expect(filter.add(element)).toBe(true)

    filter._filter.forEach(bucket => {
        if (bucket.length > 0) {
            expect(['xyz', 'lol', locations.fingerprint]).toContainEqual(bucket._elements[0])
            nbElements += bucket.length
        }
    })
    expect(filter.length).toEqual(3)
    expect(nbElements).toEqual(3)
})

test("should reject elements that can't be inserted when filter is full", () => {
    const filter = new CuckooFilter(1, 3, 1)
    const element = 'foo'
    filter.add(element)
    expect(filter.add(element, false, true)).toBe(false)
})

test('should not rollback to its initial state in case the filter is full with option add(x, false, true)', () => {
    const filter = new CuckooFilter(10, 3, 1)
    expect(filter.add('a')).toBe(true)
    expect(filter.add('b')).toBe(true)
    expect(filter.add('c')).toBe(true)
    expect(filter.add('d')).toBe(true)
    expect(filter.add('e')).toBe(true)
    expect(filter.add('f')).toBe(true)
    expect(filter.add('h')).toBe(true)
    expect(filter.add('i')).toBe(true)
    expect(filter.add('j')).toBe(true)
    expect(filter.add('k')).toBe(true)
    const snapshot = JSON.stringify(filter.saveAsJSON())
    // if true should throw
    expect(() => filter.add('l', true, true)).toThrow(Error)
    // if false, true should be destructive and should have changed
    expect(filter.add('m', false, true)).toBe(false)
    const snapshot2 = JSON.stringify(filter.saveAsJSON())
    expect(snapshot2).not.toEqual(snapshot)
    const imported = CuckooFilter.fromJSON(JSON.parse(snapshot) as ExportedCuckooFilter)
    expect(filter.equals(imported)).toBe(false)
})

test('should rollback to its initial state in case the filter is full', () => {
    const filter = new CuckooFilter(10, 3, 1)
    expect(filter.add('a')).toBe(true)
    expect(filter.add('b')).toBe(true)
    expect(filter.add('c')).toBe(true)
    expect(filter.add('d')).toBe(true)
    expect(filter.add('e')).toBe(true)
    expect(filter.add('f')).toBe(true)
    expect(filter.add('h')).toBe(true)
    expect(filter.add('i')).toBe(true)
    expect(filter.add('j')).toBe(true)
    expect(filter.add('k')).toBe(true)
    const snapshot = filter.saveAsJSON()
    expect(filter.add('l')).toBe(false)
    const snapshot2 = filter.saveAsJSON()
    expect(snapshot).toEqual(snapshot2)
})

test('should remove exisiting elements from the filter', () => {
    const filter = new CuckooFilter(15, 3, 1)
    const element = 'foo'
    const locations = filter._locations(element)

    filter.add(element)
    expect(filter.remove(element)).toBe(true)
    expect(filter._filter[locations.firstIndex].length).toEqual(0)
})

test('should look inside every possible bucket', () => {
    const filter = new CuckooFilter(15, 3, 1)
    const element = 'foo'
    const locations = filter._locations(element)

    filter.add(element)
    filter.add(element)
    expect(filter.remove(element)).toBe(true)
    expect(filter._filter[locations.firstIndex].length).toEqual(0)
    expect(filter.remove(element)).toBe(true)
    expect(filter._filter[locations.secondIndex].length).toEqual(0)
})

test('should fail to remove elements that are not in the filter', () => {
    const filter = new CuckooFilter(15, 3, 1)
    filter.add('foo')
    expect(filter.remove('moo')).toBe(false)
})

test('should return True when an element may be in the filter', () => {
    const filter = new CuckooFilter(15, 3, 1)
    filter.add('foo')
    expect(filter.has('foo')).toBe(true)
})

test('should return False when an element is definitively not in the filter', () => {
    const filter = new CuckooFilter(15, 3, 1)
    filter.add('foo')
    expect(filter.has('moo')).toBe(false)
})

test('should look inside every possible bucket', () => {
    const filter = new CuckooFilter(15, 3, 1)
    filter.add('foo')
    filter.add('foo')
    filter.remove('foo')
    expect(filter.has('foo')).toBe(true)
})

test('issue#(https://github.com/Callidon/bloom-filters/issues/9)', () => {
    const filter = CuckooFilter.create(15, 0.01)
    filter.add('alice')
    filter.add('andrew')
    filter.add('bob')
    filter.add('sam')

    filter.add('alice')
    filter.add('andrew')
    filter.add('bob')
    filter.add('sam')
    // lookup for some data
    const one = filter.has('samx') // output: false [ok]
    expect(one).toBe(false)
    const two = filter.has('samy') // output: true [?]
    expect(two).toBe(false)
    const three = filter.has('alice') // output: true [ok]
    expect(three).toBe(true)
    const four = filter.has('joe') // output: true [?]
    expect(four).toBe(false)
    const five = filter.has('joe') // output: true [?]
    expect(five).toBe(false)
})

function buildCuckooFilter() {
    const filter = new CuckooFilter(15, 3, 2)
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
const rate = 0.000000000000000001
const bucketSize = 1
test(`should not return an error when inserting and asking for ${max.toString()} elements, rate = ${rate.toString()}; bucketSize = ${bucketSize.toString()};`, () => {
    const filter = CuckooFilter.create(max, rate, bucketSize, 500)
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
