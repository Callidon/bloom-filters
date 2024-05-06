import { xxh3, xxh32 } from '@node-rs/xxhash'
import { numberToHex } from './utils.mjs'
// import { getBigIntAbs, numberToHex } from './utils.mjs'
import {
    TwoHashes,
    TwoHashesIntAndString,
    TwoHashesTemplated,
    type HashableInput,
    SeedType,
} from './types.mjs'

const BIG_ZERO = BigInt(0)
const BIG_ONE = BigInt(1)
const BIG_THREE = BigInt(3)
const BIG_SIX = BigInt(6)

export default class Hashing {
    /**
     * The hashing library to use.
     * One place to rule them all; available everywhere.
     * You can override this directly if you want to use your own 32/64bits hashing function.
     */
    static lib = {
        xxh32,
        xxh64: xxh3.xxh64,
        xxh128: xxh3.xxh128,
    }

    // alias
    _lib = Hashing.lib

    /**
     * Apply enhanced Double Hashing to produce a n-hash
     * @see {@link http://peterd.org/pcd-diss.pdf} s6.5.4
     * @param  n - The indice of the hash function we want to produce
     * @param  hashA - The result of the first hash function applied to a value.
     * @param  hashB - The result of the second hash function applied to a value.
     * @param  size - The size of the datastructures associated to the hash context (ex: the size of a Bloom Filter)
     * @return The result of hash_n applied to a value.
     * @memberof Hashing
     * @author Thomas Minier
     * @author Arnaud Grall
     */
    public doubleHashing(n: number, hashA: bigint, hashB: bigint, size: number): bigint {
        const bigN = BigInt(n)
        const f = (i: bigint) => (i ** BIG_THREE - bigN) / BIG_SIX
        return (hashA + bigN * hashB + f(bigN)) % BigInt(size)
    }

    /**
     * Generate a set of distinct indexes on interval [0, size) using the double hashing technique
     * For generating efficiently distinct indexes we re-hash after detecting a cycle by changing slightly the seed.
     * It has the effect of generating faster distinct indexes without loosing entirely the utility of the double hashing.
     * For small number of indexes it will work perfectly. For a number close to the size, and size very large
     * Advise: do not generate `size` indexes for a large interval. In practice, size should be equal
     * to the number of hash functions used and is often low.
     *
     * @param  element  - The element to hash
     * @param  size     - the range on which we can generate an index [0, size) = size
     * @param  number   - The number of indexes desired
     * @param  seed     - The seed used
     * @return Array<number>
     * @author Arnaud Grall
     * @author Simon Woolf (SimonWoolf)
     */
    public getDistinctIndexes(
        element: HashableInput,
        size: number,
        count: number,
        seed: bigint,
    ): number[] {
        let n = BIG_ZERO
        const indexes = new Set<number>()
        let hashes = this.hashTwice(element, seed)
        const BIG_SIZE = BigInt(size)
        // let cycle = 0
        while (indexes.size < count) {
            const ind = hashes.first % BIG_SIZE
            hashes.first = (hashes.first + hashes.second) % BIG_SIZE
            hashes.second = (hashes.second + n) % BIG_SIZE
            // cast as number, indices should be practically small
            indexes.add(Number(ind))
            n++

            if (n > size) {
                // Enhanced double hashing stops cycles of length less than `size` in the case where
                // size is coprime with the second hash. But you still get cycles of length `size`.
                // So if we reach there and haven't finished, append a prime to the input and
                // rehash.
                seed = BIG_ONE + seed
                hashes = this.hashTwice(element, seed)
                // trick is to always reset this number after we found a cycle
                n = BIG_ZERO
            }
        }
        return [...indexes.values()]
    }

    /**
     * Generate N indexes on range [0, size)
     * It uses the double hashing technique to generate the indexes.
     * It hash twice the value only once before generating the indexes.
     * Warning: you can have a lot of modulo collisions.
     * @param  element    - The element to hash
     * @param  size       - The range on which we can generate the index, exclusive
     * @param  hashCount  - The number of indexes we want
     * @return An array of indexes on range [0, size)
     */
    public getIndexes(
        element: HashableInput,
        size: number,
        hashCount: number,
        seed: SeedType,
    ): number[] {
        const arr = []
        const hashes = this.hashTwice(element, seed)
        for (let i = 0; i < hashCount; i++) {
            arr.push(Number(this.doubleHashing(i, hashes.first, hashes.second, size)))
        }
        if (arr.length !== hashCount) {
            throw new Error('Please report: wrong number of indexes')
        }
        return arr
    }

    /**
     * (64-bits only) Hash a value into two values (in hex or integer format)
     * @param  value - The value to hash
     * @param seed the seed used for hashing
     * @return The results of the hash functions applied to the value (in hex or integer)
     * @author Arnaud Grall & Thomas Minier
     */
    public hashTwice(value: HashableInput, seed: SeedType): TwoHashes {
        return {
            first: this._lib.xxh128(value, seed + BIG_ONE),
            second: this._lib.xxh64(value, seed + BIG_THREE),
        }
    }

    /**
     * Hash twice an element into their HEX string representations
     * @param value
     * @param seed
     * @returns TwoHashesTemplated<string>
     */
    public hashTwiceAsString(value: HashableInput, seed: SeedType): TwoHashesTemplated<string> {
        const { first, second } = this.hashTwice(value, seed)
        return {
            first: numberToHex(first),
            second: numberToHex(second),
        }
    }

    /**
     * (64-bits only) Same as hashTwice but return Numbers and String equivalent
     * @param  val the value to hash
     * @param  seed the seed to change when hashing
     * @return TwoHashesIntAndString
     * @author Arnaud Grall
     */
    public hashTwiceIntAndString(val: HashableInput, seed: SeedType): TwoHashesIntAndString {
        const one = this.hashIntAndString(val, seed)
        const two = this.hashIntAndString(val, seed)
        return {
            int: {
                first: one.int,
                second: two.int,
            },
            string: {
                first: one.string,
                second: two.string,
            },
        }
    }

    /**
     * Hash an item as an unsigned int
     * @param  elem - Element to hash
     * @param  seed - The hash seed.
     * @param  length - The length of hashes (defaults to 32 bits)
     * @return The hash value as an unsigned int
     * @author Arnaud Grall
     */
    public hashAsInt(elem: HashableInput, seed: SeedType): bigint {
        return this._lib.xxh128(elem, seed)
    }

    /**
     * Hash an item and return its number and HEX string representation
     * @param  elem - Element to hash
     * @param  seed - The hash seed.
     * @param  base - The base in which the string will be returned, default: 16
     * @param  length - The length of hashes (defaults to 32 bits)
     * @return The item hased as an int and a string
     * @author Arnaud Grall
     */
    public hashIntAndString(elem: HashableInput, seed: SeedType) {
        const hash = this.hashAsInt(elem, seed)
        return { int: hash, string: numberToHex(hash) }
    }
}
