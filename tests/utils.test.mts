import { expect, test } from '@jest/globals'
import {
    Hashing,
    BloomFilter,
    BaseFilter,
    allocateArray,
    randomInt,
    xorBuffer,
    getDefaultSeed,
    isEmptyBuffer,
} from '../src/index.mjs'
import range from 'lodash.range'

const seed = getDefaultSeed()

test('should allocate an array with the given size and a default value', () => {
    const array = allocateArray(15, 1)
    expect(array.length).toEqual(15)
    array.forEach(value => {
        expect(value).toEqual(1)
    })
})

test('should allow the use of a function to set the default value', () => {
    const array = allocateArray(15, () => 'foo')
    expect(array.length).toEqual(15)
    array.forEach(value => {
        expect(value).toEqual('foo')
    })
})

test('should perform a double hashing', () => {
    const hashing = new Hashing()
    function getRandomInt(min: number, max: number) {
        // The maximum is exclusive and the minimum is inclusive
        const minCeiled = Math.ceil(min)
        const maxFloored = Math.floor(max)
        return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled)
    }
    const hashA = BigInt(getRandomInt(Number.MIN_VALUE, Number.MAX_VALUE / 2))
    const hashB = BigInt(getRandomInt(Number.MAX_VALUE / 2, Number.MAX_VALUE))
    const size = 1000
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    values.forEach(n => {
        expect(hashing.doubleHashing(n, hashA, hashB, size)).toEqual(
            (hashA + BigInt(n) * hashB + BigInt((n ** 3 - n) / 6)) %
                BigInt(size)
        )
    })
})

test('should generate a random int in an interval', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(values).toContain(randomInt(values[0], values[9]))
})

test('should xor correctly 2 Buffers', () => {
    const a = Buffer.allocUnsafe(10).fill(0)
    const b = Buffer.alloc(1, 1)
    const res = Buffer.allocUnsafe(10).fill(0)
    res[res.length - 1] = 1
    // xor(a, b) = <Buffer 00 00 00 00 00 00 00 00 00 01>
    expect(xorBuffer(Buffer.from(a), Buffer.from(b)).toString()).toEqual(
        b.toString()
    )
    // xor(xor(a, b), b) === a <Buffer 00 00 00 00 00 00 00 00 00 00> === <Buffer />
    expect(
        xorBuffer(
            xorBuffer(Buffer.from(a), Buffer.from(b)),
            Buffer.from(b)
        ).toString()
    ).toEqual(Buffer.from('').toString())
    // xor(xor(a, b), a) === b
    expect(
        xorBuffer(
            xorBuffer(Buffer.from(a), Buffer.from(b)),
            Buffer.from(a)
        ).toString()
    ).toEqual(Buffer.from(b).toString())
    // xor(xor(a, a), a) === a
    expect(
        xorBuffer(
            xorBuffer(Buffer.from(a), Buffer.from(a)),
            Buffer.from(a)
        ).toString()
    ).toEqual(Buffer.from('').toString())
    // xor(xor(b, b), b) === a
    expect(
        xorBuffer(
            xorBuffer(Buffer.from(b), Buffer.from(b)),
            Buffer.from(b)
        ).toString()
    ).toEqual(Buffer.from(b).toString())
})
test('should xor correctly', () => {
    let a = Buffer.allocUnsafe(1).fill(1)
    let b = Buffer.allocUnsafe(1).fill(1)
    const max = 100
    let last: Buffer = Buffer.allocUnsafe(0)
    for (let i = 0; i < max; i++) {
        const s = Hashing.lib.xxh64(i.toString(), seed).toString(16)
        const buf = Buffer.from(s)
        a = xorBuffer(a, buf)
        if (i !== max - 1) {
            b = xorBuffer(buf, b)
        } else {
            last = buf
        }
    }
    expect(xorBuffer(a, b).equals(last)).toBe(true)
    expect(xorBuffer(a, b).toString()).toEqual(last.toString())
    expect(xorBuffer(a, a).equals(Buffer.allocUnsafe(0))).toBe(true)
    expect(xorBuffer(b, b).equals(Buffer.allocUnsafe(0))).toBe(true)
})

test('should return true if a buffer is empty', () => {
    expect(isEmptyBuffer(Buffer.allocUnsafe(10).fill(0))).toBe(true)
    expect(isEmptyBuffer(Buffer.allocUnsafe(0).fill(0))).toBe(true)
})
test('should return false if a buffer is not empty', () => {
    expect(isEmptyBuffer(Buffer.allocUnsafe(10).fill(1))).toBe(false)
})

const key = 'da5e21f8a67c4163f1a53ef43515bd027967da305ecfc741b2c3f40f832b7f82'
const desiredIndices = 10000
const result = range(0, desiredIndices, 1)
test(`should return ${desiredIndices.toString()} distinct indices on the interval [0, ${desiredIndices.toString()})`, () => {
    try {
        const obj = new (class extends BaseFilter {})()
        const start = new Date().getTime()
        const indices = obj._hashing
            .getDistinctIndexes(key, desiredIndices, desiredIndices, seed)
            .sort((a, b) => a - b)
        expect(indices).toEqual(result)
        console.log(
            `Generated ${indices.length.toString()} distinct indices on the interval [0, ${desiredIndices.toString()}) in ${(
                new Date().getTime() - start
            ).toString()} ms`
        )
    } catch (e) {
        throw e
    }
})

test('should not be endlessly recurive the (Issue: #34)', () => {
    try {
        const filter = new BloomFilter(39, 28)
        filter.add(key)
        expect(filter.has(key)).toBe(true)
    } catch (e) {
        throw e
    }
})

test('overriding serialize function by always returning Number(1)', () => {
    class CustomHashing extends Hashing {
        serialize() {
            return BigInt(1)
        }
    }
    const bl = BloomFilter.create(2, 0.01)
    bl._hashing = new CustomHashing()
    bl.add('a')
    const bl2 = BloomFilter.create(2, 0.01)
    bl2._hashing = new CustomHashing()
    bl2.add('b')
    // 2 bloom filters with a hash functions returning everytime the same thing must be equal
    expect(bl.equals(bl2)).toBe(true)
})
