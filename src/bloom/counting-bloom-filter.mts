import BaseFilter from '../base-filter.mjs'
import WritableFilter from '../interfaces/writable-filter.mjs'
import { optimalFilterSize, optimalHashes } from '../formulas.mjs'
import { allocateArray } from '../utils.mjs'
import { HashableInput, SeedType } from "../types.mjs"

export interface ExportedCountingBloomFilter {
    _seed: SeedType
    _size: number
    _nbHashes: number
    _filter: number[][]
    _length: number
}

/**
 * A Counting Bloom filter works in a similar manner as a regular Bloom filter; however, it is able to keep track of insertions and deletions. In a counting Bloom filter, each entry in the Bloom filter is a small counter associated with a basic Bloom filter bit.
 *
 * Reference: F. Bonomi, M. Mitzenmacher, R. Panigrahy, S. Singh, and G. Varghese, “An Improved Construction for Counting Bloom Filters,” in 14th Annual European Symposium on Algorithms, LNCS 4168, 2006, pp.
684–695.
 * @author Thomas Minier & Arnaud Grall
 */
export default class CountingBloomFilter
    extends BaseFilter
    implements WritableFilter<HashableInput>
{
    public _size: number
    public _nbHashes: number
    public _filter: number[][]
    public _length: number
    /**
     * Constructor
     * @param size - The size of the filter
     * @param nbHashes - The number of hash functions
     */
    constructor(size: number, nbHashes: number) {
        super()
        if (nbHashes < 1) {
            throw new Error(
                `A CountingBloomFilter must used at least one hash function, but you tried to use ${nbHashes.toString()} functions. Consider increasing it.`
            )
        }
        this._size = size // fm.optimalFilterSize(capacity, errorRate)
        this._nbHashes = nbHashes // fm.optimalHashes(this._size, capacity)
        // the filter contains tuples [bit, counter]
        this._filter = allocateArray(this._size, () => [0, 0])
        this._length = 0
    }

    /**
     * Allocate a CountingBloomFilter with a target maximum capacity and error rate
     * @param  capacity - The maximum capacity of the filter
     * @param  errorRate - The error rate of the filter
     * @return A new {@link CountingBloomFilter}
     */
    public static create(
        capacity: number,
        errorRate: number
    ): CountingBloomFilter {
        const s = optimalFilterSize(capacity, errorRate)
        return new CountingBloomFilter(s, optimalHashes(s, capacity))
    }

    /**
     * Build a new Bloom Filter from an iterable with a fixed error rate
     * @param items - Iterable used to populate the filter
     * @param errorRate - The error rate of the filter
     * @return A new Bloom Filter filled with the iterable's elements
     * @example
     * ```js
     * // create a filter with a false positive rate of 0.1
     * const filter = CountingBloomFilter.from(['alice', 'bob', 'carl'], 0.1);
     * ```
     */
    public static from(
        items: Iterable<HashableInput>,
        errorRate: number
    ): CountingBloomFilter {
        const array = Array.from(items)
        const filter = CountingBloomFilter.create(array.length, errorRate)
        array.forEach(element => {
            filter.add(element)
        })
        return filter
    }

    /**
     * Get the optimal size of the filter
     */
    public get size(): number {
        return this._size
    }

    /**
     * Get the number of elements currently in the filter
     */
    public get length(): number {
        return this._length
    }

    /**
     * Add an element to the filter
     * @param element - The element to add
     * @example
     * ```js
     * const filter = new CountingBloomFilter(15, 0.1);
     * filter.add('foo');
     * ```
     */
    public add(element: HashableInput): void {
        const indexes = this._hashing.getIndexes(
            element,
            this._size,
            this._nbHashes,
            this.seed
        )
        for (const value of indexes) {
            // increment counter
            this._filter[value][1] += 1
            // set bit if necessary
            if (this._filter[value][1] > 0) {
                this._filter[value][0] = 1
            }
        }
        this._length++
    }

    /**
     * Remove an element from the filter
     * @param element - The element to delete
     * @example
     * ```js
     * const filter = new CountingBloomFilter(15, 0.1);
     * filter.remove('foo');
     * ```
     */
    public remove(element: HashableInput): boolean {
        const indexes = this._hashing.getIndexes(
            element,
            this._size,
            this._nbHashes,
            this.seed
        )
        const success = true
        for (const value of indexes) {
            // decrement counter
            this._filter[value][1] -= 1
            // set bit if necessary
            if (this._filter[value][1] <= 0) {
                this._filter[value][0] = 0
            }
        }
        this._length--
        return success
    }

    /**
     * Test an element for membership
     * @param element - The element to look for in the filter
     * @return False if the element is definitively not in the filter, True is the element might be in the filter
     * @example
     * ```js
     * const filter = new CountingBloomFilter(15, 0.1);
     * filter.add('foo');
     * console.log(filter.has('foo')); // output: true
     * console.log(filter.has('bar')); // output: false
     * ```
     */
    public has(element: HashableInput): boolean {
        const indexes = this._hashing.getIndexes(
            element,
            this._size,
            this._nbHashes,
            this.seed
        )
        for (const value of indexes) {
            if (!this._filter[value][0]) {
                return false
            }
        }
        return true
    }

    /**
     * Get the current false positive rate (or error rate) of the filter
     * @return The current false positive rate of the filter
     * @example
     * ```js
     * const filter = new BloomFilter(15, 0.1);
     * console.log(filter.rate()); // output: something around 0.1
     * ```
     */
    public rate(): number {
        return Math.pow(
            1 - Math.exp((-this._nbHashes * this._length) / this._size),
            this._nbHashes
        )
    }

    /**
     * Check if another Counting Bloom Filter is equal to this one
     * @param  filter - The filter to compare to this one
     * @return True if they are equal, false otherwise
     */
    public equals(other: CountingBloomFilter): boolean {
        if (
            this._size !== other._size ||
            this._nbHashes !== other._nbHashes ||
            this._length !== other._length
        ) {
            return false
        }
        return this._filter.every(
            (value, index) =>
                other._filter[index][0] === value[0] &&
                other._filter[index][1] === value[1]
        )
    }

    public saveAsJSON(): ExportedCountingBloomFilter {
        return {
            _length: this._length,
            _size: this._size,
            _nbHashes: this._nbHashes,
            _filter: this._filter,
            _seed: this._seed,
        }
    }

    public static fromJSON(
        element: ExportedCountingBloomFilter
    ): CountingBloomFilter {
        const bl = new CountingBloomFilter(element._size, element._nbHashes)
        bl.seed = element._seed
        bl._length = element._length
        bl._filter = element._filter
        return bl
    }
}
