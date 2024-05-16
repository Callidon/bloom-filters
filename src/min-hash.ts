import BaseFilter from './base-filter.js'
import { ExportedBigInt, allocateArray, exportBigInt, importBigInt } from './utils.js'

/**
 * An error thrown when we try to compute the Jaccard Similarity with an empty MinHash
 * @author Thomas Minier
 */
class EmptyMinHashError extends Error {}

/**
 * The parameters of a Hash function used in the MinHash algorithm
 * @author Thomas Minier
 */
export interface HashFunction {
    a: number
    b: number
    c: number
}

/**
 * Apply a hash function to a number to produce a hash
 * @param x - Value to hash
 * @param fn - HashFunction to apply
 * @return The hashed value
 */
function applyHashFunction(x: number, fn: HashFunction): number {
    return (fn.a * x + fn.b) % fn.c
}

export interface ExportedMinHash {
    _seed: ExportedBigInt
    _nbHashes: number
    _hashFunctions: HashFunction[]
    _signature: number[]
}

/**
 * MinHash (or the min-wise independent permutations locality sensitive hashing scheme) is a technique for quickly estimating how similar two sets are.
 * It is able to estimate the Jaccard similarity between two large sets of numbers using random hashing.
 *
 * **WARNING**: Only the MinHash produced by the same {@link MinHashFactory} can be compared between them.
 *
 * @see "On the resemblance and containment of documents", by Andrei Z. Broder, in Compression and Complexity of Sequences: Proceedings, Positano, Amalfitan Coast, Salerno, Italy, June 11-13, 1997.
 * @author Thomas Minier
 */
export default class MinHash extends BaseFilter {
    public _nbHashes: number
    public _hashFunctions: HashFunction[]
    public _signature: number[]

    /**
     * Constructor
     * @param nbHashes - Number of hash functions to use for comouting the MinHash signature
     * @param hashFunctions - Hash functions used to compute the signature
     */
    constructor(nbHashes: number, hashFunctions: HashFunction[]) {
        super()
        this._nbHashes = nbHashes
        this._hashFunctions = hashFunctions
        this._signature = allocateArray(this._nbHashes, Infinity)
    }

    /**
     * Get the number of hash functions used by the MinHash
     */
    public get nbHashes(): number {
        return this._nbHashes
    }

    /**
     * Test if the signature of the MinHash is empty
     * @return True if the MinHash is empty, False otherwise
     */
    public isEmpty(): boolean {
        return this._signature[0] === Infinity
    }

    /**
     * Insert a value into the MinHash and update its signature.
     * @param value - Value to insert
     */
    public add(value: number): void {
        for (let i = 0; i < this._nbHashes; i++) {
            const hash = applyHashFunction(value, this._hashFunctions[i])
            this._signature[i] = Math.min(this._signature[i], hash)
        }
    }

    /**
     * Ingest a set of values into the MinHash, in an efficient manner, and update its signature.
     * @param values - Set of values to load
     */
    public bulkLoad(values: number[]): void {
        for (let i = 0; i < this._nbHashes; i++) {
            let min: number = Infinity
            values.forEach((value: number, idx: number) => {
                const hash = applyHashFunction(value, this._hashFunctions[i])
                if (idx === 0) {
                    min = hash
                }
                // get the minimum of the candidate Signatures
                // dont supply too much parameters to Math.min or Math.max with risk of getting stack error
                // so we compute an iterative minimum
                if (min > hash) {
                    min = hash
                }
            })
            this._signature[i] = Math.min(this._signature[i], min)
        }
    }

    /**
     * Estimate the Jaccard similarity coefficient with another MinHash signature
     * @param other - MinHash to compare with
     * @return The estimated Jaccard similarity coefficient between the two sets
     */
    public compareWith(other: MinHash): number {
        if (this.isEmpty() || other.isEmpty()) {
            throw new EmptyMinHashError(
                'Cannot compute a Jaccard similairty with a MinHash that contains no values',
            )
        }
        // fix: we need to check for the number of equal signatures, not uniq equal signatures
        // lodash intersection ends with a uniq set of values
        let count = 0
        for (let i = 0; i < this._nbHashes; i++) {
            if (this._signature[i] === other._signature[i]) {
                count++
            }
        }
        return count / this._nbHashes
    }

    public saveAsJSON(): ExportedMinHash {
        return {
            _hashFunctions: this._hashFunctions,
            _nbHashes: this._nbHashes,
            _signature: this._signature,
            _seed: exportBigInt(this._seed),
        }
    }

    public static fromJSON(element: ExportedMinHash): MinHash {
        const filter = new MinHash(element._nbHashes, element._hashFunctions)
        filter.seed = importBigInt(element._seed)
        filter._signature = element._signature
        return filter
    }
}
