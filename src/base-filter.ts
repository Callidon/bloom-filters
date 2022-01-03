/* file : base-filter.ts
MIT License

Copyright (c) 2017-2020 Thomas Minier & Arnaud Grall

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict'

import seedrandom from 'seedrandom'
import XXH from 'xxhashjs'
import {
  doubleHashing,
  getDefaultSeed,
  HashableInput,
  numberToHex,
  TwoHashes,
  TwoHashesIntAndString,
  TwoHashesTemplated,
} from './utils'

/**
 * Exported prng type because it is not from seedrandom
 * Orignal type can be found in: @types/seedrandom
 */
export interface prng {
  (): number
  double(): number
  int32(): number
  quick(): number
  state(): seedrandom.State
}

/**
 * A base class for implementing probailistic filters
 * @author Thomas Minier
 * @author Arnaud Grall
 */
export default abstract class BaseFilter {
  private _seed: number
  private _rng: prng

  constructor() {
    this._seed = getDefaultSeed()
    this._rng = seedrandom(`${this._seed}`) as prng
  }

  /**
   * Get the seed used in this structure
   */
  public get seed(): number {
    return this._seed
  }

  /**
   * Set the seed for this structure
   * @param  seed the new seed that will be used in this structure
   */
  public set seed(seed: number) {
    this._seed = seed
    this._rng = seedrandom(`${this._seed}`) as prng
  }

  /**
   * Get a function used to draw random number
   * @return A factory function used to draw random integer
   */
  public get random(): prng {
    return this._rng
  }

  /**
   * Return a next random seeded int32 integer
   * @returns
   */
  public nextInt32(): number {
    return this._rng.int32()
  }

  /**
   * Save the current structure as a JSON object
   */
  public saveAsJSON(): Object {
    throw new Error('not-implemented')
  }

  /**
   * Load an Object from a provided JSON object
   * @param json the JSON object to load
   * @return Return the Object loaded from the provided JSON object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static fromJSON(json: JSON): any {
    throw new Error(`not-implemented: ${json}`)
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
  protected _getDistinctIndexes(
    element: HashableInput,
    size: number,
    number: number,
    seed?: number
  ): Array<number> {
    if (seed === undefined) {
      seed = getDefaultSeed()
    }
    let n = 0
    const indexes: Set<number> = new Set()
    let hashes = this._hashTwice(element, seed)
    // let cycle = 0
    while (indexes.size < number) {
      const ind = hashes.first % size
      if (!indexes.has(ind)) {
        indexes.add(ind)
      }
      hashes.first = (hashes.first + hashes.second) % size
      hashes.second = (hashes.second + n) % size
      n++

      if (n > size) {
        // Enhanced double hashing stops cycles of length less than `size` in the case where
        // size is coprime with the second hash. But you still get cycles of length `size`.
        // So if we reach there and haven't finished, append a prime to the input and
        // rehash.
        seed++
        hashes = this._hashTwice(element, seed)
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
  protected _getIndexes(
    element: HashableInput,
    size: number,
    hashCount: number,
    seed?: number
  ): Array<number> {
    if (seed === undefined) {
      seed = getDefaultSeed()
    }
    const arr = []
    const hashes = this._hashTwice(element, seed)
    for (let i = 0; i < hashCount; i++) {
      arr.push(doubleHashing(i, hashes.first, hashes.second, size))
    }
    return arr
  }

  /**
   * @public
   * @internal
   * Hash an element of type {@link HashableInput} into {@link Number}
   * Can be overrided as long as you return a value of type {@link Number}
   * Don't forget to use the seed when hashing, otherwise if some kind of randomness is in the process
   * you may have inconsistent behaviors between 2 runs.
   * @param element
   * @param seed
   * @returns A 64bits floating point {@link Number}
   */
  protected _serialize(element: HashableInput, seed?: number) {
    if (!seed) {
      seed = getDefaultSeed()
    }
    return Number(XXH.h64(element, seed).toNumber())
  }

  /**
   * @private
   * @internal
   * (64-bits only) Hash a value into two values (in hex or integer format)
   * @param  value - The value to hash
   * @param  asInt - (optional) If True, the values will be returned as an integer. Otherwise, as hexadecimal values.
   * @param seed the seed used for hashing
   * @return The results of the hash functions applied to the value (in hex or integer)
   * @author Arnaud Grall & Thomas Minier
   */
  protected _hashTwice(value: HashableInput, seed?: number): TwoHashes {
    if (seed === undefined) {
      seed = getDefaultSeed()
    }
    return {
      first: this._serialize(value, seed + 1),
      second: this._serialize(value, seed + 2),
    }
  }

  /**
   * Hash twice an element into their HEX string representations
   * @param value
   * @param seed
   * @returns TwoHashesTemplated<string>
   */
  protected _hashTwiceAsString(
    value: HashableInput,
    seed?: number
  ): TwoHashesTemplated<string> {
    const {first, second} = this._hashTwice(value, seed)
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
  protected _hashTwiceIntAndString(
    val: HashableInput,
    seed?: number
  ): TwoHashesIntAndString {
    if (seed === undefined) {
      seed = getDefaultSeed()
    }
    const one = this._hashIntAndString(val, seed + 1)
    const two = this._hashIntAndString(val, seed + 2)
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
   * @param  seed - The hash seed. If its is UINT32 make sure to set the length to 32
   * @param  length - The length of hashes (defaults to 32 bits)
   * @return The hash value as an unsigned int
   * @author Arnaud Grall
   */
  protected _hashAsInt(elem: HashableInput, seed?: number): number {
    if (seed === undefined) {
      seed = getDefaultSeed()
    }
    return this._serialize(elem, seed)
  }

  /**
   * Hash an item and return its number and HEX string representation
   * @param  elem - Element to hash
   * @param  seed - The hash seed. If its is UINT32 make sure to set the length to 32
   * @param  base - The base in which the string will be returned, default: 16
   * @param  length - The length of hashes (defaults to 32 bits)
   * @return The item hased as an int and a string
   * @author Arnaud Grall
   */
  protected _hashIntAndString(elem: HashableInput, seed?: number) {
    const hash = this._hashAsInt(elem, seed)
    return {int: hash, string: numberToHex(hash)}
  }
}
