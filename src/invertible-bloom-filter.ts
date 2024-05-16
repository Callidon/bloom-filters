import BaseFilter from './base-filter.js'
import WritableFilter from './interfaces/writable-filter.js'
import Cell, { ExportedCell } from './cell.js'
import { ExportedBigInt, allocateArray, exportBigInt, importBigInt, numberToHex } from './utils.js'
import { SeedType } from './types.js'

/**
 * The reason why an Invertible Bloom Lookup Table decoding operation has failed
 */
export interface IBLTDecodingErrorReason {
    cells: Cell[]
    iblt: InvertibleBloomFilter
    decoded: number
}

/**
 * The results of decoding an Invertible Bloom Lookup Table
 */
export interface IBLTDecodingResults {
    success: boolean
    reason?: IBLTDecodingErrorReason
    additional: string[]
    missing: string[]
}

export interface ExportedInvertibleBloomFilter {
    _size: number
    _hashCount: number
    _elements: ExportedCell[]
    _differences: number
    _alpha: number
    _seed: ExportedBigInt
}

/**
 * An Invertible Bloom Lookup Table is a space-efficient and probabilistic data-structure for solving the set-difference problem efficiently without the use of logs or other prior context. It computes the set difference with communication proportional to the size of the difference between the sets being compared.
 * They can simultaneously calculate D(A−B) and D(B−A) using O(d) space. This data structure encodes sets in a fashion that is similar in spirit to Tornado codes’ construction [6], in that it randomly combines elements using the XOR function
 * Reference: Eppstein, D., Goodrich, M. T., Uyeda, F., & Varghese, G. (2011). What's the difference? Efficient set reconciliation without prior context. ACM SIGCOMM Computer Communication Review, 41(4), 218-229.
 * @see {@link https://conferences.sigcomm.org/sigcomm/2011/papers/sigcomm/p218.pdf} for more details about Invertible Bloom Lookup Tables
 * @author Arnaud Grall
 * @author Thomas Minier
 */
export default class InvertibleBloomFilter extends BaseFilter implements WritableFilter<string> {
    public _size: number
    public _differences: number
    public _alpha: number
    public _hashCount: number
    public _elements: Cell[]

    public static encoder = new TextEncoder()
    public static decoder = new TextDecoder()

    /**
     * Construct an Invertible Bloom Lookup Table
     * @param differences the expected number of differences
     * @param alpha the ratio used for determining the number of cells in the IBLT
     * @param hashCount the number of hash functions used
     * @param seed (Optional) the seed to assign to the IBLT and its cells
     */
    constructor(differences: number, alpha = 2, hashCount = 6, seed?: SeedType) {
        super()
        if (seed) {
            this.seed = seed
        }
        this._differences = differences
        this._alpha = alpha
        this._hashCount = hashCount
        this._size = Math.ceil(differences * alpha)
        this._size = this._size + (this._hashCount - (this._size % this._hashCount))
        this._elements = allocateArray(this._size, () => Cell.empty())
    }

    /**
     * Get the number of elements added in the filter
     * Complexity in time: O(alpha*d)
     */
    public get length(): number {
        return this._elements.reduce((a, b) => a + b._count, 0) / this._hashCount
    }

    /**
     * Add an element to the InvertibleBloomFilter
     * @param element - The element to insert
     */
    public add(element: string): void {
        const value = InvertibleBloomFilter.encoder.encode(element)
        const hash = this.genHash(element)
        for (const index of this.genIndexes(element)) {
            this._elements[index].add(value, hash)
        }
    }

    /**
     * Remove an element from the filter
     * @param element - The element to remove
     * @return True if the element has been removed, False otheriwse
     */
    public remove(element: string): boolean {
        const value = InvertibleBloomFilter.encoder.encode(element)
        const hash = this.genHash(element)
        for (const index of this.genIndexes(element)) {
            const cell = new Cell(value, hash, 1)
            this._elements[index] = this._elements[index].xorm(cell)
        }
        return true
    }

    /**
     * Test if an item is in the filter.
     * @param  element - The element to test
     * @return False if the element is not in the filter, true if "may be" in the filter.
     */
    public has(element: string): boolean {
        const indexes = this.genIndexes(element)
        for (const index of indexes) {
            if (this._elements[index]._count === 0) {
                return false
            }
        }
        return true
    }

    /**
     * List all entries from the filter
     * @return A list of entries in this filter
     */
    public listEntries(): string[] {
        const copy = InvertibleBloomFilter.fromJSON(this.saveAsJSON())
        const result: string[] = []

        let cell: Cell | undefined
        while ((cell = copy._elements.find(c => c._count === 1))) {
            const value = InvertibleBloomFilter.decoder.decode(cell._idSum)
            result.push(value)
            copy.remove(value)
        }
        return result
    }

    /**
     * Substract the filter with another {@link InvertibleBloomFilter}, and returns the resulting filter.
     * @param  iblt - The filter to substract with
     * @return A new InvertibleBloomFilter which is the XOR of the local and remote one
     */
    public substract(iblt: InvertibleBloomFilter): InvertibleBloomFilter {
        if (this._size !== iblt._size) {
            throw new Error('The two Invertible Bloom Filters must be of the same size')
        }
        const res = new InvertibleBloomFilter(
            iblt._differences,
            iblt._alpha,
            iblt._hashCount,
            this.seed,
        )
        for (let i = 0; i < this._size; ++i) {
            res._elements[i] = this._elements[i].xorm(iblt._elements[i])
        }
        return res
    }

    public genHash(element: string): number {
        const value = InvertibleBloomFilter.encoder.encode(element)
        const hash = numberToHex(this._hashing._lib.xxh128(value, 125n))
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const match = hash.match(/../g)!
        const digest = new Uint8Array(match.map(h => parseInt(h, 16)))
        let h = 0
        for (let j = 0; j < 4; j++) {
            h <<= 8
            h |= digest[j] & 0xff
        }
        return h
    }

    public genIndexes(element: string): number[] {
        const value = InvertibleBloomFilter.encoder.encode(element)
        const indexes = new Array<number>(this._hashCount)
        let k = 0
        let salt = BigInt(0)
        while (k < this._hashCount) {
            const hash = numberToHex(this._hashing._lib.xxh128(value, salt))
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const match = hash.match(/../g)!
            const digest = new Uint8Array(match.map(h => parseInt(h, 16)))
            salt++

            for (let i = 0; i < digest.length / 4 && k < this._hashCount; i++) {
                let h = 0
                for (let j = i * 4; j < i * 4 + 4; j++) {
                    h <<= 8
                    h |= digest[j] & 0xff
                }
                indexes[k] = h
                k++
            }
        }
        return indexes.map(idx => Math.abs(idx % this._size))
    }

    /**
     * Test if the cell is "Pure".
     * A pure cell is a cell with a counter equal to 1 or -1, and the hash of the idSum is equal to the hashSum
     * @return True if the cell is pure, False otherwise
     */
    public isCellPure(cell: Cell): boolean {
        return (
            (cell._count === 1 || cell._count == -1) &&
            this.genHash(InvertibleBloomFilter.decoder.decode(cell._idSum)) === cell._hashSum
        )
    }

    /**
     * Test if two InvertibleBloomFilters are equals
     * @param iblt - The filter to compare with
     * @return True if the two filters are equals, False otherwise
     */
    public equals(iblt: InvertibleBloomFilter): boolean {
        if (
            iblt._size !== this._size ||
            iblt._hashCount !== this._hashCount ||
            iblt._seed !== this._seed ||
            iblt._differences !== this._differences ||
            iblt._alpha !== this._alpha
        ) {
            return false
        } else {
            for (let i = 0; i < iblt._elements.length; ++i) {
                if (!iblt._elements[i].equals(this._elements[i])) {
                    return false
                }
            }
            return true
        }
    }

    /**
     * Decode an InvertibleBloomFilter based on its substracted version
     * @return The results of the deconding process
     */
    public decode(additional: string[] = [], missing: string[] = []): IBLTDecodingResults {
        const pureCells = new Array<number>()
        for (let i = 0; i < this._elements.length; i++) {
            if (this.isCellPure(this._elements[i])) {
                pureCells.push(i)
            }
        }

        let cell: Cell | undefined
        while (pureCells.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const idx: number = pureCells.shift()!
            cell = this._elements[idx]
            if (!this.isCellPure(cell)) {
                continue
            }
            const id = cell._idSum
            const value = InvertibleBloomFilter.decoder.decode(id)
            const c = cell._count
            if (c > 0) {
                additional.push(value)
            } else {
                missing.push(value)
            }
            const hash = this.genHash(value)
            for (const index of this.genIndexes(value)) {
                this._elements[index] = this._elements[index].xorm(new Cell(id, hash, c))
                if (this.isCellPure(this._elements[index])) {
                    pureCells.push(index)
                }
            }
        }

        if (this._elements.some(c => this.isCellPure(c))) {
            throw new Error('Please report: should not have pure cells at this point')
        }

        if (this._elements.some(e => !e.isEmpty())) {
            const res = {
                success: false,
                reason: {
                    cells: this._elements.filter(e => !e.isEmpty()),
                    iblt: this,
                    decoded: missing.length + additional.length,
                },
                additional,
                missing,
            }
            return res
        } else {
            return {
                success: true,
                additional,
                missing,
            }
        }
    }

    public saveAsJSON(): ExportedInvertibleBloomFilter {
        return {
            _alpha: this._alpha,
            _differences: this._differences,
            _elements: this._elements.map(e => e.saveAsJSON()),
            _size: this._size,
            _hashCount: this._hashCount,
            _seed: exportBigInt(this._seed),
        }
    }

    public static fromJSON(element: ExportedInvertibleBloomFilter): InvertibleBloomFilter {
        const filter = new InvertibleBloomFilter(
            element._differences,
            element._alpha,
            element._hashCount,
            importBigInt(element._seed),
        )
        filter._elements = element._elements.map(e => Cell.fromJSON(e))
        return filter
    }
}
