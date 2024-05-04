import BaseFilter from '../base-filter.mjs'
import WritableFilter from '../interfaces/writable-filter.mjs'
import Cell, { ExportedCell } from './cell.mjs'
import {
    BufferError,
    ExportedBigInt,
    allocateArray,
    exportBigInt,
    importBigInt,
} from '../utils.mjs'
import { optimalFilterSize, optimalHashes } from '../formulas.mjs'

/**
 * The reason why an Invertible Bloom Lookup Table decoding operation has failed
 */
export interface IBLTDecodingErrorReason {
    cell: Cell | null
    iblt: InvertibleBloomFilter
}

/**
 * The results of decoding an Invertible Bloom Lookup Table
 */
export interface IBLTDecodingResults {
    success: boolean
    reason?: IBLTDecodingErrorReason
    additional: Buffer[]
    missing: Buffer[]
}

export interface ExportedInvertibleBloomFilter {
    _size: number
    _hashCount: number
    _elements: ExportedCell[]
    _seed: ExportedBigInt
}

/**
 * An Invertible Bloom Lookup Table is a space-efficient and probabilistic data-structure for solving the set-difference problem efficiently without the use of logs or other prior context. It computes the set difference with communication proportional to the size of the difference between the sets being compared.
 * They can simultaneously calculate D(A−B) and D(B−A) using O(d) space. This data structure encodes sets in a fashion that is similar in spirit to Tornado codes’ construction [6], in that it randomly combines elements using the XOR function
 * Reference: Eppstein, D., Goodrich, M. T., Uyeda, F., & Varghese, G. (2011). What's the difference?: efficient set reconciliation without prior context. ACM SIGCOMM Computer Communication Review, 41(4), 218-229.
 * @see {@link http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.220.6282&rep=rep1&type=pdf} for more details about Invertible Bloom Lookup Tables
 * @author Arnaud Grall
 * @author Thomas Minier
 */
export default class InvertibleBloomFilter
    extends BaseFilter
    implements WritableFilter<Buffer>
{
    public _size: number
    public _hashCount: number
    public _elements: Cell[]

    /**
     * Construct an Invertible Bloom Lookup Table
     * @param size - The number of cells in the InvertibleBloomFilter. It should be set to d * alpha, where d is the number of difference and alpha is a constant
     * @param hashCount - The number of hash functions used (empirically studied to be 3 or 4 in most cases)
     */
    constructor(size: number, hashCount = 3) {
        super()
        // Goody
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!Buffer) {
            throw new Error(BufferError)
        }
        if (hashCount <= 0) {
            throw new Error(
                'The hashCount must be a non-zero, positive integer'
            )
        }
        this._size = size
        this._hashCount = hashCount
        // the number of elements in the array is n = alpha * size
        this._elements = allocateArray(this._size, () => Cell.empty())
    }

    /**
     * Create an Invertible Bloom filter optimal for an expected size and error rate.
     * @param nbItems - Number of items expected to insert into the IBLT
     * @param errorRate - Expected error rate
     * @return A new Invertible Bloom filter optimal for the given parameters.
     */
    public static create(
        nbItems: number,
        errorRate: number
    ): InvertibleBloomFilter {
        const size = optimalFilterSize(nbItems, errorRate)
        const nbHashes = optimalHashes(size, nbItems)
        return new InvertibleBloomFilter(size, nbHashes)
    }

    /**
     * Create an Invertible Bloom filter from a set of Buffer and optimal for an error rate.
     * @param items - An iterable to yield Buffers to be inserted into the filter
     * @param errorRate - Expected error rate
     * @return A new Invertible Bloom filter filled with the iterable's items.
     */
    public static from(
        items: Iterable<Buffer>,
        errorRate: number
    ): InvertibleBloomFilter {
        const array = Array.from(items)
        const filter = InvertibleBloomFilter.create(array.length, errorRate)
        array.forEach(item => {
            filter.add(item)
        })
        return filter
    }

    /**
     * Return the number of hash functions used
     * @return {Number}
     */
    public get hashCount() {
        return this._hashCount
    }

    /**
     * Get the number of cells of the filter
     */
    public get size(): number {
        return this._size
    }

    /**
     * Get the number of elements added in the filter
     * Complexity in time: O(alpha*d)
     */
    public get length(): number {
        return this._elements.reduce((a, b) => a + b.count, 0) / this._hashCount
    }

    /**
     * Return the cells used to store elements in this InvertibleBloomFilter
     */
    public get elements(): Cell[] {
        return this._elements
    }

    /**
     * Add an element to the InvertibleBloomFilter
     * @param element - The element to insert
     */
    public add(element: Buffer): void {
        const hashes = this._hashing.hashTwiceAsString(
            JSON.stringify(element.toJSON()),
            this.seed
        )
        const indexes = this._hashing.getDistinctIndexes(
            hashes.first,
            this._size,
            this._hashCount,
            this.seed
        )
        for (let i = 0; i < this._hashCount; ++i) {
            this._elements[indexes[i]].add(element, Buffer.from(hashes.first))
        }
    }

    /**
     * Remove an element from the filter
     * @param element - The element to remove
     * @return True if the element has been removed, False otheriwse
     */
    public remove(element: Buffer): boolean {
        const hashes = this._hashing.hashTwiceAsString(
            JSON.stringify(element.toJSON()),
            this.seed
        )
        const indexes = this._hashing.getDistinctIndexes(
            hashes.first,
            this._size,
            this._hashCount,
            this.seed
        )
        for (let i = 0; i < this._hashCount; ++i) {
            this._elements[indexes[i]] = this._elements[indexes[i]].xorm(
                new Cell(Buffer.from(element), Buffer.from(hashes.first), 1)
            )
        }
        return true
    }

    /**
     * Test if an item is in the filter.
     * @param  element - The element to test
     * @return False if the element is not in the filter, true if "may be" in the filter.
     */
    public has(element: Buffer): boolean {
        const hashes = this._hashing.hashTwiceAsString(
            JSON.stringify(element.toJSON()),
            this.seed
        )
        const indexes = this._hashing.getDistinctIndexes(
            hashes.first,
            this._size,
            this._hashCount,
            this.seed
        )
        for (let i = 0; i < this._hashCount; ++i) {
            if (this._elements[indexes[i]].count === 0) {
                return false
            } else if (this._elements[indexes[i]].count === 1) {
                if (this._elements[indexes[i]].idSum.equals(element)) {
                    return true
                } else {
                    return false
                }
            }
        }
        return true
    }

    /**
     * List all entries from the filter using a Generator.
     * The generator ends with True if the operation has not failed, False otheriwse.
     * It is not recommended to modify an IBLT while listing its entries!
     * @return A generator that yields all filter's entries.
     */
    public listEntries(): Generator<Buffer, boolean> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const that = this
        const seenBefore: Buffer[] = []
        return (function* () {
            for (let index = 0; index < that._elements.length - 1; index++) {
                const localCell = that._elements[index]
                if (
                    localCell.count > 0 &&
                    seenBefore.findIndex((b: Buffer) =>
                        b.equals(localCell.idSum)
                    ) === -1
                ) {
                    if (that.has(localCell.idSum)) {
                        seenBefore.push(localCell.idSum)
                        yield localCell.idSum
                    } else {
                        return false
                    }
                }
            }
            return true
        })()
    }

    /**
     * Substract the filter with another {@link InvertibleBloomFilter}, and returns the resulting filter.
     * @param  remote - The filter to substract with
     * @return A new InvertibleBloomFilter which is the XOR of the local and remote one
     */
    public substract(iblt: InvertibleBloomFilter): InvertibleBloomFilter {
        if (this.size !== iblt.size) {
            throw new Error(
                'The two Invertible Bloom Filters must be of the same size'
            )
        }
        const res = new InvertibleBloomFilter(iblt._size, iblt._hashCount)
        res.seed = this.seed
        for (let i = 0; i < this.size; ++i) {
            res._elements[i] = this._elements[i].xorm(iblt._elements[i])
        }
        return res
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
            iblt.seed !== this.seed
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
    public decode(
        additional: Buffer[] = [],
        missing: Buffer[] = []
    ): IBLTDecodingResults {
        const pureList: number[] = []
        let cell: Cell | null = null
        // checking for all pure cells
        for (let i = 0; i < this._elements.length; ++i) {
            cell = this._elements[i]
            if (cell.isPure()) {
                pureList.push(i)
            }
        }
        while (pureList.length !== 0) {
            cell = this._elements[pureList.pop()!] // eslint-disable-line @typescript-eslint/no-non-null-assertion
            const id = cell.idSum
            const c = cell.count
            if (cell.isPure()) {
                if (c === 1) {
                    additional.push(id)
                } else if (c === -1) {
                    missing.push(id)
                } else {
                    throw new Error('Please report, not possible')
                }
                const hashes = this._hashing.hashTwiceAsString(
                    JSON.stringify(id.toJSON()),
                    this.seed
                )
                const indexes = this._hashing.getDistinctIndexes(
                    hashes.first,
                    this._size,
                    this._hashCount,
                    this.seed
                )
                for (const value of indexes) {
                    this._elements[value] = this._elements[value].xorm(
                        new Cell(id, Buffer.from(hashes.first), c)
                    )
                    if (this._elements[value].isPure()) {
                        pureList.push(value)
                    }
                }
            }
        }
        if (this._elements.findIndex(e => !e.isEmpty()) > -1) {
            return {
                success: false,
                reason: {
                    cell: cell,
                    iblt: this,
                },
                additional,
                missing,
            }
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
            _elements: this._elements.map(e => e.saveAsJSON()),
            _size: this._size,
            _hashCount: this._hashCount,
            _seed: exportBigInt(this._seed),
        }
    }

    public static fromJSON(
        element: ExportedInvertibleBloomFilter
    ): InvertibleBloomFilter {
        const filter = new InvertibleBloomFilter(
            element._size,
            element._hashCount
        )
        filter.seed = importBigInt(element._seed)
        filter._elements = element._elements.map(e => Cell.fromJSON(e))
        return filter
    }
}
