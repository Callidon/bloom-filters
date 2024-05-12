import { expect, test } from '@jest/globals'
import { Hashing, BloomFilter, allocateArray, randomInt, xorUint8Array } from '../src/index.mjs'

const seed = BigInt(randomInt(1, Number.MAX_SAFE_INTEGER))

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
            (hashA + BigInt(n) * hashB + BigInt((n ** 3 - n) / 6)) % BigInt(size),
        )
    })
})

test('should generate a random int in an interval', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(values).toContain(randomInt(values[0], values[9]))
})

test('should xor correctly 2 Uint8Array', () => {
    const a = new Uint8Array(10).fill(0)
    const b = new Uint8Array([1])
    const res = new Uint8Array(10).fill(0)
    res[res.length - 1] = 1
    expect(xorUint8Array(Uint8Array.from(a), Uint8Array.from(b)).toString()).toEqual(b.toString())
    expect(
        xorUint8Array(
            xorUint8Array(Uint8Array.from(a), Uint8Array.from(b)),
            Uint8Array.from(b),
        ).toString(),
    ).toEqual(Uint8Array.from([]).toString())
    expect(
        xorUint8Array(
            xorUint8Array(Uint8Array.from(a), Uint8Array.from(b)),
            Uint8Array.from(a),
        ).toString(),
    ).toEqual(Uint8Array.from(b).toString())
    expect(
        xorUint8Array(
            xorUint8Array(Uint8Array.from(a), Uint8Array.from(a)),
            Uint8Array.from(a),
        ).toString(),
    ).toEqual(Uint8Array.from([]).toString())
    expect(
        xorUint8Array(
            xorUint8Array(Uint8Array.from(b), Uint8Array.from(b)),
            Uint8Array.from(b),
        ).toString(),
    ).toEqual(Uint8Array.from(b).toString())
})

test('should xor resize correctly', () => {
    expect(xorUint8Array(Uint8Array.from([0, 1]), Uint8Array.from([1, 1, 1, 1, 1]))).toEqual(
        Uint8Array.from([1, 1, 1, 1, 0]),
    )
    expect(xorUint8Array(Uint8Array.from([1, 1, 1, 1, 1]), Uint8Array.from([0, 1]))).toEqual(
        Uint8Array.from([1, 1, 1, 1, 0]),
    )
})

test('should xor correctly', () => {
    const encoder = new TextEncoder()
    let a = new Uint8Array([1])
    let b = new Uint8Array([1])
    const max = 100
    let last: Uint8Array = new Uint8Array([])
    for (let i = 0; i < max; i++) {
        const s = Hashing.lib.xxh64(i.toString(), seed).toString(16)
        const buf = Uint8Array.from(encoder.encode(s))
        a = xorUint8Array(a, buf)
        if (i !== max - 1) {
            b = xorUint8Array(buf, b)
        } else {
            last = buf
        }
    }
    expect(xorUint8Array(a, b)).toEqual(last)
    expect(xorUint8Array(a, b).toString()).toEqual(last.toString())
    expect(xorUint8Array(a, a)).toEqual(new Uint8Array([]))
    expect(xorUint8Array(b, b)).toEqual(new Uint8Array([]))
})

test('overriding serialize function by always returning Number(1)', () => {
    class CustomHashing extends Hashing {
        static lib = {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            xxh128: (input: string | Uint8Array, seed?: bigint | null | undefined) => BigInt(1),
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            xxh64: (input: string | Uint8Array, seed?: bigint | null | undefined) => BigInt(1),
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            xxh32: (input: string | Uint8Array, seed?: number | null | undefined) => Number(1),
        }

        _lib = CustomHashing.lib
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
