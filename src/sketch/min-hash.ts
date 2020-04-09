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
import { intersection, random } from 'lodash'

type HashFunction = (elt: number) => number

/**
 * An exception throw when we try to ingest numbers into a MinHash whose signature
 * has already been computed.
 * @author Thomas Minier
 */
class NonWritableMinHashError extends Error {}

/**
 * Test if a number is a prime number
 * @param x - Number to test
 * @return True if the input is a prime number, False otherwise
 */
function isPrime (x: number): boolean {
  if (x !== 2 && x % 2 === 0) {
    return false
  }
  for (let i = 2; i < Math.sqrt(x); i++) {
    if (x % i === 0) {
      return false
    }
  }
  return true
}

/**
 * Find the fist prime number superior to a number
 * @param x - Input number
 * @return The fist prime number superior to the input number
 */
function closestPrime (x: number): number {
  let i = 0
  while (true) {
    if (isPrime(x + i)) {
      return x + i
    }
    i++
  }
}

/**
 * MinHash (or the min-wise independent permutations locality sensitive hashing scheme) is a technique for quickly estimating how similar two sets are.
 * It is able to estimate the Jaccard similarity between two large sets of numbers using random hashing.
 * 
 * @see "On the resemblance and containment of documents", by Andrei Z. Broder, in Compression and Complexity of Sequences: Proceedings, Positano, Amalfitan Coast, Salerno, Italy, June 11-13, 1997.
 * @author Thomas Minier
 */
export default class MinHash extends BaseFilter {
  private _nbHashes: number
  private _maxValue: number
  private _hashFunctions: HashFunction[]
  private _signature: number[]

  /**
   * Constructor
   * @param nbHashes - Number of hash functions to use for comouting the MinHash signature
   * @param maxValue - The maximum integer value in the set
   */
  constructor (nbHashes: number, maxValue: number) {
    super()
    this._nbHashes = nbHashes
    this._maxValue = maxValue
    this._hashFunctions = []
    this._signature = []
    // generate hash functions
    const c = closestPrime(this._maxValue)
    for (let i = 0; i < this._nbHashes; i++) {
      const a = random(0, this._maxValue, false)
      const b = random(0, this._maxValue, false)
      this._hashFunctions.push((x: number) => (a * x + b) % c)
    }
  }

  /**
   * Get the number of hash functions used by the MinHash
   */
  get nbHashes (): number {
    return this._nbHashes
  }

  /**
   * Test if the MinHash can be modified, i.e., its signature has not been computed yet
   */
  get isWritable (): boolean {
    return this._signature.length === 0
  }

  /**
   * Ingest a set of integers/floats into the Minhash and compute its signaure.
   * 
   * **WARNING:** After calling this method, the MinHash **cannot be modified** any further.
   * @param values - Values to ingest in order to compute the MinHash signature
   */
  ingestNumbers (values: number[]): void {
    if (!this.isWritable) {
      throw new NonWritableMinHashError('The MinHash has already been populated with items and cannot be modified furthermore.')
    }
    // generate the signature
    for(let hashFunction of this._hashFunctions) {
      const candidateSignatures = values.map((value: number) => hashFunction(value))
      this._signature.push(Math.min(...candidateSignatures))
    }
  }

  /**
   * Estimate the Jaccard similarity with another MinHash signature
   * @param other - MinHash to compare with
   * @return The estimated Jaccard similarity between the two sets
   */
  estimateSimilary (other: MinHash): number {
    return intersection(this._signature, other._signature).length
  }

}
