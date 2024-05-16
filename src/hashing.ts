import { xxh3 } from '@node-rs/xxhash'
import { bigIntToNumber, getBigIntAbs, numberToHex } from './utils'
// import { getBigIntAbs, numberToHex } from './utils'
import {
    TwoHashes,
    TwoHashesIntAndString,
    TwoHashesTemplated,
    type HashableInput,
    SeedType,
} from './types'

export default class Hashing {
    /**
     * The hashing library to use.
     * One place to rule them all; available everywhere.
     * You can override this directly if you want to use your own 32/64bits hashing function.
     */
    static lib = {
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
        return getBigIntAbs((hashA + bigN * hashB + (bigN ** 3n - bigN) / 6n) % BigInt(size))
    }

    /**
     * Generate N indexes on range [0, size)
     * It uses the double hashing technique to generate the indexes.
     * It hash twice the value only once before generating the indexes.
     * Warning: you can have a lot of modulo collisions.
     * @param  element    - The element to hash
     * @param  size       - The range on which we can generate the index, exclusive
     * @param  hashCount  - The number of indexes we want
     * @param  seed       - The seed to use
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
            arr.push(bigIntToNumber(this.doubleHashing(i, hashes.first, hashes.second, size)))
        }
        if (arr.length !== hashCount) {
            throw new Error('Please report: wrong number of indexes')
        }
        return arr
    }

    /**
     * (64-bits only) Hash a value into two values (in hex or integer format)
     * @param  value - The value to hash
     * @param seed - The seed used for hashing
     * @return The results of the hash functions applied to the value (in hex or integer)
     * @author Arnaud Grall & Thomas Minier
     */
    public hashTwice(value: HashableInput, seed: SeedType): TwoHashes {
        return {
            first: this._lib.xxh128(value, seed),
            second: this._lib.xxh64(value, seed),
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
        const { first, second } = this.hashTwice(val, seed)
        return {
            int: {
                first: first,
                second: second,
            },
            string: {
                first: numberToHex(first),
                second: numberToHex(second),
            },
        }
    }

    /**
     * Hash an item and return its number and HEX string representation
     * @param  elem - Element to hash
     * @param  seed - The hash seed.
     * @return The item hased as an int and a string
     * @author Arnaud Grall
     */
    public hashIntAndString(elem: HashableInput, seed: SeedType) {
        const hash = this._lib.xxh64(elem, seed)
        return { int: hash, string: numberToHex(hash) }
    }
}
