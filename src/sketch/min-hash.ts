/* file: min-hash.ts
MIT License

Copyright (c) 2019-2020 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import BaseFilter from '../base-filter'
import { AutoExportable, Field, Parameter } from '../exportable'
import { allocateArray } from '../utils'
import { intersection } from 'lodash'

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
  a: number,
  b: number,
  c: number
}

/**
 * Apply a hash function to a number to produce a hash
 * @param x - Value to hash
 * @param fn - HashFunction to apply
 * @return The hashed value
 */
function applyHashFunction (x: number, fn: HashFunction): number {
  return (fn.a * x + fn.b) % fn.c
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
@AutoExportable('MinHash', ['_seed'])
export class MinHash extends BaseFilter {
  @Field()
  private _nbHashes: number

  @Field()
  private _hashFunctions: HashFunction[]

  @Field()
  private _signature: number[]

  /**
   * Constructor
   * @param nbHashes - Number of hash functions to use for comouting the MinHash signature
   * @param hashFunctions - Hash functions used to compute the signature
   */
  constructor (@Parameter('_nbHashes') nbHashes: number, @Parameter('_hashFunctions') hashFunctions: HashFunction[]) {
    super()
    this._nbHashes = nbHashes
    this._hashFunctions = hashFunctions
    this._signature = allocateArray(this._nbHashes, Infinity)
  }

  /**
   * Get the number of hash functions used by the MinHash
   */
  get nbHashes (): number {
    return this._nbHashes
  }

  /**
   * Test if the signature of the MinHash is empty
   * @return True if the MinHash is empty, False otherwise
   */
  isEmpty (): boolean {
    return this._signature[0] === Infinity
  }

  /**
   * Insert a value into the MinHash and update its signature.
   * @param value - Value to insert
   */
  add (value: number): void {
    for(let i = 0; i < this._nbHashes; i++) {
      this._signature[i] = Math.min(this._signature[i], applyHashFunction(value, this._hashFunctions[i]))
    }
  }

  /**
   * Ingest a set of values into the MinHash, in an efficient manner, and update its signature.
   * @param values - Set of values to load
   */
  bulkLoad (values: number[]): void {
    for(let i = 0; i < this._nbHashes; i++) {
      const candidateSignatures = values.map((value: number) => applyHashFunction(value, this._hashFunctions[i]))
      this._signature[i] = Math.min(this._signature[i], ...candidateSignatures)
    }
  }

  /**
   * Estimate the Jaccard similarity coefficient with another MinHash signature
   * @param other - MinHash to compare with
   * @return The estimated Jaccard similarity coefficient between the two sets
   */
  compareWith (other: MinHash): number {
    if (this.isEmpty() || other.isEmpty()) {
      throw new EmptyMinHashError('Cannot compute a Jaccard similairty with a MinHash that contains no values')
    }
    return intersection(this._signature, other._signature).length / this._nbHashes
  }

}
