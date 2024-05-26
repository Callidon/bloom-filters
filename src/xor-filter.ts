import BaseFilter from './base-filter.js'
import { allocateArray, exportBigInt, ExportedBigInt, importBigInt } from './utils.js'
import { HashableInput, SeedType } from './types.js'

export type XorSize = 8 | 16 | 32 | 64
export interface ExportedXorFilter {
    _filter: ExportedBigInt[]
    _bits: XorSize
    _size: number
    _blockLength: number
    _seed: ExportedBigInt
}

/**
 * XOR-Filter for 8/16/32/64-bits fingerprint length.
 * To use for fixed sets of elements only
 * Inspired by java impl.
 * @see https://github.com/FastFilter/fastfilter_java/blob/master/fastfilter/src/main/java/org/fastfilter/xor/Xor8.java
 * @author Arnaud GRALL
 * @example
 * ```js
 * let xor = new XorFilter(1) // store by default 8-bits fingerprints
 * xor = new XorFilter(1, 16) // store 16-bits fingerprints
 * xor = new XorFilter(1, 32) // store 3é-bits fingerprints
 * xor = new XorFilter(1, 64) // store 64-bits fingerprints
 * xor.add(['a'])
 * xor.has('a') // true
 * xor.has('b') // false
 * ```
 */
export default class XorFilter extends BaseFilter {
    public ALLOWED_FINGERPRINT_SIZES: XorSize[] = [8, 16, 32, 64]
    public HASHES = 3
    public OFFSET = 32
    public FACTOR_TIMES_100 = 123
    public MAX_ITERATIONS = 100 // 2 ** 10 // 1024

    /**
     * Buffer array of fingerprints
     */
    public _filter: bigint[]

    /**
     * Number of bits per fingerprint
     */
    public _bits: XorSize = 8

    /**
     * Number of elements inserted in the filter
     */
    public _size: number

    /**
     * Size of each block (filter size / HASHES)
     */
    public _blockLength: number

    /**
     * Create an empty XorFilter for a number of `size` elements.
     * The fingerprint length can be choosen
     * @param size
     * @param bits_per_fingerprint
     */
    constructor(size: number, bits_per_fingerprint: XorSize = 8) {
        super()
        if (!this.ALLOWED_FINGERPRINT_SIZES.includes(bits_per_fingerprint)) {
            throw new Error(
                `bits_per_fingerprint parameter must be one of: [${this.ALLOWED_FINGERPRINT_SIZES.join(
                    ',',
                )}], got: ${bits_per_fingerprint.toString()}`,
            )
        }
        this._bits = bits_per_fingerprint
        if (size <= 0) {
            throw new Error('a XorFilter must be calibrated for a given number of elements')
        }
        this._size = size
        const arrayLength = this._getOptimalFilterSize(this._size)
        this._blockLength = arrayLength / this.HASHES
        this._filter = allocateArray(arrayLength, 0n)
    }

    /**
     * Return False if the element is not in the filter, True if it might be in the set with certain probability.
     * @param element
     * @returns
     */
    public has(element: HashableInput): boolean {
        const hash = this._hash64(element, this.seed)
        const hashes = new Array(this.HASHES)
            .fill(0)
            .map((_, i) => this._createHx(i, hash, this._blockLength))
        const fp = this._fingerprint(hash)

        let xor
        for (let i = 0; i < this.HASHES; i++) {
            const hi = hashes[i]
            if (!xor) {
                xor = this._filter[hi + i * this._blockLength]
            } else {
                xor ^= this._filter[hi + i * this._blockLength]
            }
        }
        return fp === xor
    }

    /**
     * Add elements to the filter, modify the filter in place.
     * Warning: Another call will override the previously created filter.
     * @param elements
     */
    public add(elements: HashableInput[]) {
        if (elements.length !== this._size) {
            throw new Error(
                `This filter has been created for exactly ${this._size.toString()} elements`,
            )
        } else {
            // check for unicity
            if (new Set(elements).size === elements.length) this._create(elements)
            else
                throw new Error(
                    'This filter has duplicate values; remove them and recreate the filter before proceeding.',
                )
        }
        return this
    }

    /**
     * @internal
     * @private
     */
    public _hash64(element: HashableInput, seed: SeedType): bigint {
        return this._hashing._lib.xxh64(element, seed)
    }

    /**
     * @internal
     * @private
     */
    public _createHx(index: number, hash: bigint, blockLength: number): number {
        return Number(BigInt.asUintN(32, (hash >> (BigInt(index) * 21n)) % BigInt(blockLength)))
    }

    /**
     * Create the filter representing the elements to store.
     * @param elements array of elements to add in the filter
     * @returns
     */
    public _create(elements: HashableInput[]) {
        // work only on bigint(s)
        this.seed = 0n

        const reverseOrder: bigint[] = allocateArray(this._size, 0n)
        const reverseH: number[] = allocateArray(this._size, 0)
        let reverseOrderPos
        do {
            this.seed = BigInt(this.nextInt32())
            const t2count = allocateArray(this._filter.length, 0)
            const t2 = allocateArray(this._filter.length, 0n)
            elements.forEach(k => {
                const hash = this._hash64(k, this.seed)
                for (let hi = 0; hi < this.HASHES; hi++) {
                    const h = this._createHx(hi, hash, this._blockLength) + hi * this._blockLength
                    t2[h] = t2[h] ^ hash
                    if (t2count[h] > 120) {
                        // probably something wrong with the hash function
                        throw new Error(
                            `Probably something wrong with the hash function, t2count[${h.toString()}]=${t2count[h].toString()}`,
                        )
                    }
                    t2count[h]++
                }
            })
            reverseOrderPos = 0
            const alone: number[][] = allocateArray(this.HASHES, () =>
                allocateArray(this._blockLength, 0),
            )
            const alonePos: number[] = allocateArray(this.HASHES, 0)
            for (let nextAlone = 0; nextAlone < this.HASHES; nextAlone++) {
                for (let i = 0; i < this._blockLength; i++) {
                    if (t2count[nextAlone * this._blockLength + i] === 1) {
                        alone[nextAlone][alonePos[nextAlone]++] = nextAlone * this._blockLength + i
                    }
                }
            }
            let found = -1
            let i = 0
            while (i !== -1) {
                i = -1
                for (let hi = 0; hi < this.HASHES; hi++) {
                    if (alonePos[hi] > 0) {
                        i = alone[hi][--alonePos[hi]]
                        found = hi
                        break
                    }
                }
                if (i === -1) {
                    // no entry found
                    break
                }
                if (t2count[i] <= 0) {
                    continue
                }
                const k = t2[i]
                if (t2count[i] !== 1) {
                    throw new Error('At this step, the count must not be different of 1')
                }
                --t2count[i]
                for (let hi = 0; hi < this.HASHES; hi++) {
                    if (hi !== found) {
                        const h = this._createHx(hi, k, this._blockLength) + hi * this._blockLength
                        const newCount = --t2count[h]
                        if (newCount === 1) {
                            alone[hi][alonePos[hi]++] = h
                        }
                        t2[h] = t2[h] ^ k
                    }
                }
                reverseOrder[reverseOrderPos] = k
                reverseH[reverseOrderPos] = found
                reverseOrderPos++
            }
        } while (reverseOrderPos !== this._size)

        for (let i = reverseOrderPos - 1; i >= 0; i--) {
            const k = reverseOrder[i]
            const found = reverseH[i]
            let change = -1
            let xor = this._fingerprint(k)
            for (let hi = 0; hi < this.HASHES; hi++) {
                const h = this._createHx(hi, k, this._blockLength) + hi * this._blockLength
                if (found === hi) {
                    change = h
                } else {
                    xor ^= this._filter[h]
                }
            }
            this._filter[change] = BigInt.asUintN(this._bits, xor)
        }
    }

    /**
     * Return a XorFilter for a specified set of elements
     * @param elements
     * @param bits_per_fingerprint
     * @returns
     */
    public static create(elements: HashableInput[], bits_per_fingerprint: XorSize = 8): XorFilter {
        return new XorFilter(elements.length, bits_per_fingerprint).add(elements)
    }

    /**
     * @internal
     * @private
     * Return the optimal xor filter size
     * @param size
     * @returns
     */
    public _getOptimalFilterSize(size: number): number {
        // optimal size
        const s = (1 * this.FACTOR_TIMES_100 * size) / 100 + this.OFFSET
        // return a size which is a multiple of hashes for optimal blocklength
        return s + (-s % this.HASHES)
    }

    /**
     * @internal
     * @private
     * Generate the fingerprint of the hash
     * @param hash hash of the element
     * @returns
     */
    public _fingerprint(hash: bigint): bigint {
        return BigInt.asUintN(this._bits, hash ^ (hash >> 32n))
    }

    /**
     * Return this filter as in JSON
     * @returns
     */
    public saveAsJSON(): ExportedXorFilter {
        return {
            _size: this._size,
            _bits: this._bits,
            _blockLength: this._blockLength,
            _filter: this._filter.map(e => exportBigInt(e)),
            _seed: exportBigInt(this._seed),
        }
    }

    /**
     * Import this filter from JSON
     * @returns
     */
    public static fromJSON(element: ExportedXorFilter): XorFilter {
        const bl = new XorFilter(element._size, element._bits)
        bl.seed = importBigInt(element._seed)
        bl._size = element._size
        bl._blockLength = element._blockLength
        bl._filter = element._filter.map(e => importBigInt(e))
        return bl
    }
}
