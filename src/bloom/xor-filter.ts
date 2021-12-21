/* file : xor-filter.ts
MIT License

Copyright (c) 2017 Arnaud Grall

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

// Code inspired by the go implementation (https://github.com/FastFilter/xorfilter/blob/master/xorfilter.go)

import BaseFilter from '../base-filter'
import {AutoExportable, Field} from '../exportable'
import {HashableInput, allocateArray} from '../utils'
import rotl32 from '@stdlib/number-uint32-base-rotl'
import XXH from 'xxhashjs'

/**
 * @internal
 * Structure defining a xor of elements with the number of elements XORed.
 */
export class XorSet {
  mask = 0
  count = 0
}

/**
 * @internal
 */
export class KeyIndex {
  index = 0
  hash = 0
}

@AutoExportable<XorFilter>('XorFilter', ['_seed'])
export default class XorFilter extends BaseFilter {
  private static readonly MAX_ITERATION = 10

  /**
   * Array of fingerprints
   */
  @Field()
  public filter: number[]

  /**
   * Return the current bucketSize, based on the filter size
   */
  public get bucketSize() {
    return this.filterSize / 3
  }

  /**
   * Return the filter size
   */
  public get filterSize() {
    return this.filter.length
  }

  constructor(elements: HashableInput[]) {
    super()
    if (elements.length <= 0 || !elements || !elements.length) {
      throw new Error(
        'a XorFilter must be calibrated for a given number of elements'
      )
    }

    this.filter = allocateArray(
      Math.round((32 + Math.ceil(1.23 * elements.length)) / 3) * 3,
      () => 0
    )
    this._create(elements)
  }

  /**
   * Return False if the element is not in the filter, True if it might be in the set with certain probability.
   * @param element
   * @returns
   */
  public has(element: HashableInput): boolean {
    const hashes = this._geth0h1h2(element, this.seed)
    const fprint = this._fingerprint(hashes.hash)
    const fh0 = this.filter[hashes.h0]
    const fh1 = this.filter[hashes.h1 + this.bucketSize]
    const fh2 = this.filter[hashes.h2 + 2 * this.bucketSize]
    return fprint === (fh0 ^ fh1 ^ fh2)
  }

  /**
   * Return a XorFilter for a specified set of elements
   * Just an alias to the constructor.
   * @param elements
   * @returns
   */
  public static create(elements: HashableInput[]): XorFilter {
    return new XorFilter(elements)
  }

  /**
   * @internal
   * @private
   * Generate the fingerprint of the hash of the element
   * Because we hash an element using XXH.h64 and return a hash on 64 bits then we use this hash
   * @param hash hash of the element as a number
   * @returns
   */
  private _fingerprint(hash: number): number {
    return hash
  }

  /**
   * Hash the element to its 64 bits version Number XXH.h64
   * @param element
   * @param seed
   * @returns
   */
  private _serialize(element: HashableInput, seed: number) {
    return XXH.h32(element, seed).toNumber()
  }

  /**
   * @internal
   * @private
   * Bitwise left-rotation
   * @param n the number to rotate
   * @param c the number of rotation
   * @returns
   */
  private _rotl(n: number, c: number): number {
    return rotl32(n, c)
  }

  /**
   * @internal
   * @private
   * Return the modulo reduction for h0, h1 and h2 on the hash of the element
   * @param hash
   * @param seed
   * @returns
   */
  private _geth0h1h2(element: HashableInput, seed: number) {
    const hash = this._serialize(element, seed)
    return {
      hash,
      h0: this._geth0(hash),
      h1: this._geth1(hash),
      h2: this._geth2(hash),
    }
  }

  /**
   * @internal
   * @private
   * Modulo reduction
   * @param hash
   * @param n
   * @returns
   */
  private _reduce(hash: number, n: number): number {
    return hash % n
  }

  /**
   * @internal
   * @private
   * Return the h0 index of the provided hash on the interval [0, size)
   * @param hash
   * @param size
   * @returns
   */
  private _geth0(hash: number, size: number = this.bucketSize): number {
    return this._reduce(hash, size)
  }
  /**
   * @internal
   * @private
   * Return the h1 index of the provided hash on the interval [0, size)
   * @param hash
   * @param size
   * @returns
   */
  private _geth1(hash: number, size: number = this.bucketSize): number {
    return this._reduce(this._rotl(hash, 10), size)
  }
  /**
   * @internal
   * @private
   * Return the h2 index of the provided hash on the interval [0, size)
   * @param hash
   * @param size
   * @returns
   */
  private _geth2(hash: number, size: number = this.bucketSize): number {
    return this._reduce(this._rotl(hash, 21), size)
  }

  /**
   * @internal
   * @private
   * Scan for pure values aka sets of count 1
   * @param set
   * @returns KeyIndex[]
   */
  private _scanCount(sets: XorSet[]): {values: KeyIndex[]; size: number} {
    const values: KeyIndex[] = []
    let size = 0
    sets.forEach((set, index) => {
      if (set.count === 1) {
        const keyindex = new KeyIndex()
        keyindex.index = index
        keyindex.hash = set.mask
        values.push(keyindex)
        size++
      }
    })
    return {values, size}
  }

  /**
   * Create the filter representing the elements to store.
   * We eliminate all duplicated entries before creating the array.
   * Follow the algorithm 2 and 3 of the paper (@see https://arxiv.org/pdf/1912.08258.pdf)
   * Inspired by Go impl from (@see https://github.com/FastFilter/xorfilter/blob/master/xorfilter.go)
   * @param elements HashableInput[]
   * @returns
   */
  private _create(elements: HashableInput[]) {
    // get a new seed seed
    // this.seed = this._splitmix64(this.seed)
    // create the constructor function of a xorset array
    const iXorset = () => allocateArray(this.bucketSize, () => new XorSet())
    // create all the array xorsets
    const s0: XorSet[] = iXorset(),
      s1: XorSet[] = iXorset(),
      s2: XorSet[] = iXorset()

    let iteration = 0
    let finished = false
    const stack = allocateArray(elements.length, () => new KeyIndex())
    let stacksize = 0
    while (!finished) {
      iteration++
      if (iteration > XorFilter.MAX_ITERATION) {
        throw new Error('You might have duplicated keys')
      }

      elements.forEach(elem => {
        const hashes = this._geth0h1h2(elem, this.seed)
        s0[hashes.h0].mask ^= hashes.hash
        s0[hashes.h0].count++
        s1[hashes.h1].mask ^= hashes.hash
        s1[hashes.h1].count++
        s2[hashes.h2].mask ^= hashes.hash
        s2[hashes.h2].count++
      })

      // scan for pure-cells, just like IBLTs
      // aka: if count==1 then we this is a value hashed,
      // then we can xor all other sets to remove this value from those sets
      // until there is no value anymore
      const zero = this._scanCount(s0),
        one = this._scanCount(s1),
        two = this._scanCount(s2)
      const q0 = zero.values,
        q1 = one.values,
        q2 = two.values
      let q0Size = zero.size,
        q1Size = one.size,
        q2Size = two.size

      stacksize = 0
      while (q0Size + q1Size + q2Size > 0) {
        while (q0Size > 0) {
          q0Size--
          const keyindexvalue = q0[q0Size]
          const index = keyindexvalue.index
          if (s0[index].count === 0) {
            continue
          }
          const hash = keyindexvalue.hash
          const h1 = this._geth1(hash)
          const h2 = this._geth2(hash)

          stack[stacksize] = keyindexvalue
          stacksize++

          // ##### H1 #####
          s1[h1].mask ^= hash
          s1[h1].count--
          if (s1[h1].count === 1) {
            q1[q1Size].index = h1
            q1[q1Size].hash = s1[h1].mask
            q1Size++
          }

          // ##### H2 #####
          s2[h2].mask ^= hash
          s2[h2].count--
          if (s2[h2].count === 1) {
            q2[q2Size].index = h2
            q2[q2Size].hash = s2[h2].mask
            q2Size++
          }
        }

        while (q1Size > 0) {
          q1Size--
          const keyindexvalue = q1[q1Size]
          const index = keyindexvalue.index
          if (s1[index].count === 0) {
            continue
          }
          const hash = keyindexvalue.hash
          const h0 = this._geth0(hash)
          const h2 = this._geth2(hash)

          // increase the blocklength
          keyindexvalue.index += this.bucketSize

          stack[stacksize] = keyindexvalue
          stacksize++

          // ##### H0 #####
          s0[h0].mask ^= hash
          s0[h0].count--
          if (s0[h0].count === 1) {
            q0[q0Size].index = h0
            q0[q0Size].hash = s0[h0].mask
            q0Size++
          }

          // ##### H2 #####
          s2[h2].mask ^= hash
          s2[h2].count--
          if (s2[h2].count === 1) {
            q2[q2Size].index = h2
            q2[q2Size].hash = s2[h2].mask
            q2Size++
          }
        }

        while (q2Size > 0) {
          q2Size--
          const keyindexvalue = q2[q2Size]
          const index = keyindexvalue.index
          if (s2[index].count === 0) {
            continue
          }
          const hash = keyindexvalue.hash
          const h0 = this._geth0(hash)
          const h1 = this._geth1(hash)

          // increase the blocklength
          keyindexvalue.index += 2 * this.bucketSize

          stack[stacksize] = keyindexvalue
          stacksize++

          // ##### H0 #####
          s0[h0].mask ^= hash
          s0[h0].count--
          if (s0[h0].count === 1) {
            q0[q0Size].index = h0
            q0[q0Size].hash = s0[h0].mask
            q0Size++
          }

          // ##### H1 #####
          s1[h1].mask ^= hash
          s1[h1].count--
          if (s1[h1].count === 1) {
            q1[q1Size].index = h1
            q1[q1Size].hash = s1[h1].mask
            q1Size++
          }
        }
      }

      if (stacksize === elements.length) {
        finished = true
      }
    }

    // next part will definitively create the filter
    stack.forEach(({hash, index}) => {
      let val = this._fingerprint(hash)
      if (index < this.bucketSize) {
        val ^=
          this.filter[this._geth1(hash) + this.bucketSize] ^
          this.filter[this._geth2(hash) + 2 * this.bucketSize]
      } else if (index < 2 * this.bucketSize) {
        val ^=
          this.filter[this._geth0(hash)] ^
          this.filter[this._geth2(hash) + 2 * this.bucketSize]
      } else {
        val ^=
          this.filter[this._geth0(hash)] ^
          this.filter[this._geth1(hash) + this.bucketSize]
      }
      this.filter[index] = val
    })
  }
}
