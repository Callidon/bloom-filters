import BaseFilter from '../base-filter.mjs'
import ClassicFilter from '../interfaces/classic-filter.mjs'
import { HashableInput, allocateArray } from '../utils.mjs'
import BitSet, { ExportedBitSet } from './bit-set.mjs'

/**
 * Return the optimal number of hashes needed for a given error rate and load factor
 * P = p^k <=> k = ln(P)/ln(p)
 * @param  errorRate - The provided error rate
 * @param  loadFactor - The load factor, ideally 0.5
 * @return The number of hash function to use
 */
function computeOptimalNumberOfhashes(
    errorRate: number,
    loadFactor: number
): number {
    // P = p^k <=> k = ln(P)/ln(p)
    return Math.ceil(Math.log(errorRate) / Math.log(loadFactor))
}

/**
 * Return the total number of bits needed for this filter
 * n = M*(ln(p)ln(1-p))/(-ln(P)) <=> M = (n*-ln(P)/(ln(p)ln(1-p))
 * @param  size - The number of desired items
 * @param  rate - The error rate desired
 * @param  loadFactor - The load factor desired
 * @return The total number of cells this filter will have
 */
function computeOptimalNumberOfCells(
    size: number,
    rate: number,
    loadFactor: number
): number {
    // n=M*(ln(p)ln(1-p))/(-ln(P)) <=> M=(n*-ln(P)/(ln(p)ln(1-p))
    return Math.ceil(
        (size * -Math.log(rate)) /
            (Math.log(loadFactor) * Math.log(1 - loadFactor))
    )
}

/**
 * Return the maximum number of items this filter can store
 * @param  totalBits - The total number of cells in the filter
 * @param  loadFactor - The load factor desired
 * @param  nbHashes - The number of hash functions used
 * @return The maximum number of items this filter store
 */
function computeNumberOfItems(
    totalBits: number,
    loadFactor: number,
    nbHashes: number
): number {
    return Math.ceil(
        (totalBits * (Math.log(loadFactor) * Math.log(1 - loadFactor))) /
            -(nbHashes * Math.log(loadFactor))
    )
}

export interface ExportedPartitionedBloomFilter {
    _seed: number
    _size: number
    _nbHashes: number
    _loadFactor: number
    _m: number
    _filter: ExportedBitSet[]
    _capacity: number
}

/**
 * A Partitioned Bloom Filter is a variation of a classic Bloom filter.
 *
 * This filter works by partitioning the M-sized bit array into k slices of size m = M/k bits, k = nb of hash functions in the filter.
 * Each hash function produces an index over m for its respective slice.
 * Thus, each element is described by exactly k bits, meaning the distribution of false positives is uniform across all elements.
 *
 * Be careful, as a Partitioned Bloom Filter have much higher collison risks that a classic Bloom Filter on small sets of data.
 *
 * Reference: Chang, F., Feng, W. C., & Li, K. (2004, March). Approximate caches for packet classification. In INFOCOM 2004. Twenty-third AnnualJoint Conference of the IEEE Computer and Communications Societies (Vol. 4, pp. 2196-2207). IEEE.
 * @see {@link https://pdfs.semanticscholar.org/0e18/e24b37a1f4196fddf8c9ff8e4368b74cfd88.pdf} for more details about Partitioned Bloom Filters
 * @author Thomas Minier & Arnaud Grall
 */
export default class PartitionedBloomFilter
    extends BaseFilter
    implements ClassicFilter<HashableInput>
{
    public _size: number
    public _nbHashes: number
    public _loadFactor: number
    public _m: number
    public _filter: BitSet[]
    public _capacity: number

    /**
     * Constructor
     * @param size - The total number of cells
     * @param nbHashes - The number of hash functions
     * @param loadFactor - The load factor
     * @param capacity - The filter capacity
     */
    constructor(
        size: number,
        nbHashes: number,
        loadFactor: number,
        capacity?: number
    ) {
        super()
        this._size = size
        this._nbHashes = nbHashes
        this._loadFactor = loadFactor
        this._m = Math.ceil(this._size / this._nbHashes)
        this._filter = allocateArray(this._nbHashes, () => new BitSet(this._m))
        this._capacity =
            capacity ?? computeNumberOfItems(this._size, loadFactor, nbHashes)
    }

    /**
     * Return a PartitionedBloomFilter for a given number of elements and under a given error rate
     * @param  size - The max allowable number of items to insert
     * @param  errorRate - The desired error rate
     * @return A new PartitionedBloomFilter optimal for the given parameters
     */
    public static create(
        size: number,
        errorRate: number,
        loadFactor = 0.5
    ): PartitionedBloomFilter {
        const capacity = computeOptimalNumberOfCells(
            size,
            errorRate,
            loadFactor
        )
        const nbHashes = computeOptimalNumberOfhashes(errorRate, loadFactor)
        return new PartitionedBloomFilter(capacity, nbHashes, loadFactor, size)
    }

    /**
     * Build a new Partitioned Bloom Filter from an existing iterable with a fixed error rate
     * @param items - The iterable used to populate the filter
     * @param errorRate - The error rate, i.e. 'false positive' rate, targetted by the filter
     * @param loadFactor - The filter's load factor
     * @return A new Bloom Filter filled with the iterable's elements
     * @example
     * ```js
     * // create a filter with a false positive rate of 0.1
     * const filter = PartitionedBloomFilter.from(['alice', 'bob', 'carl'], 0.1);
     * ```
     */
    public static from(
        items: Iterable<HashableInput>,
        errorRate: number,
        loadFactor = 0.5
    ): PartitionedBloomFilter {
        const array = Array.from(items)
        const filter = PartitionedBloomFilter.create(
            array.length,
            errorRate,
            loadFactor
        )
        array.forEach(element => {
            filter.add(element)
        })
        return filter
    }

    /**
     * Get the filter capacity, i.e. the maximum number of elements it will contains
     */
    public get capacity(): number {
        return this._capacity
    }

    /**
     * Get the size of the filter
     */
    public get size(): number {
        return this._size
    }

    /**
     * Get the filter's load factor
     */
    public get loadFactor(): number {
        return this._loadFactor
    }

    /**
     * Add an element to the filter
     * @param element - The element to add
     * @example
     * ```js
     * const filter = new PartitionedBloomFilter(15, 0.1);
     * filter.add('foo');
     * ```
     */
    public add(element: HashableInput): void {
        const indexes = this._hashing.getIndexes(
            element,
            this._m,
            this._nbHashes,
            this.seed
        )
        for (let i = 0; i < this._nbHashes; i++) {
            this._filter[i].add(indexes[i])
        }
    }

    /**
     * Test an element for membership
     * @param element - The element to look for in the filter
     * @return False if the element is definitively not in the filter, True is the element might be in the filter
     * @example
     * ```js
     * const filter = new PartitionedBloomFilter(15, 0.1);
     * filter.add('foo');
     * console.log(filter.has('foo')); // output: true
     * console.log(filter.has('bar')); // output: false
     * ```
     */
    public has(element: HashableInput): boolean {
        const indexes = this._hashing.getIndexes(
            element,
            this._m,
            this._nbHashes,
            this.seed
        )
        for (let i = 0; i < this._nbHashes; i++) {
            if (!this._filter[i].has(indexes[i])) {
                return false
            }
        }
        return true
    }

    /**
     * Compute the current false positive rate (or error rate) of the filter
     * @return The current false positive rate of the filter
     * @example
     * ```js
     * const filter = PartitionedBloomFilter.create(15, 0.1);
     * console.log(filter.rate()); // output: something around 0.1
     * ```
     */
    public rate(): number {
        // get the error rate for the first bucket (1 - (1 - 1/m)^n), where m is the size of a slice and n is the number of inserted elements
        const p = this._currentload()
        // P = p^k
        return Math.pow(p, this._nbHashes)
    }

    /**
     * Check if another Partitioned Bloom Filter is equal to this one
     * @param  filter - The filter to compare to this one
     * @return True if they are equal, false otherwise
     */
    public equals(other: PartitionedBloomFilter): boolean {
        if (
            this._size !== other._size ||
            this._nbHashes !== other._nbHashes ||
            this._loadFactor !== other._loadFactor
        ) {
            return false
        }
        return this._filter.every((array, outerIndex) =>
            other._filter[outerIndex].equals(array)
        )
    }

    /**
     * Return the current load of this filter, iterate on all buckets
     * @return An integer between 0 and 1, where 0 = filter empty and 1 = filter full
     */
    public _currentload(): number {
        const values = this._filter.map(bucket => {
            return bucket.bitCount()
        })
        const used = values.reduce((a, b) => a + b, 0)
        return used / this._size
    }

    public saveAsJSON(): ExportedPartitionedBloomFilter {
        return {
            _size: this._size,
            _nbHashes: this._nbHashes,
            _filter: this._filter.map(m => m.export()),
            _seed: this._seed,
            _capacity: this._capacity,
            _loadFactor: this._loadFactor,
            _m: this._m,
        }
    }

    public static fromJSON(
        element: ExportedPartitionedBloomFilter
    ): PartitionedBloomFilter {
        const bl = new PartitionedBloomFilter(
            element._size,
            element._nbHashes,
            element._loadFactor,
            element._capacity
        )
        bl._m = element._m
        bl.seed = element._seed
        bl._filter = element._filter.map(b => BitSet.import(b))
        return bl
    }
}