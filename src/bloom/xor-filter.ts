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
import XXH from 'xxhashjs'

/**
 * @internal
 * Structure defining a xor of elements with the number of elements XORed.
 */
export class XorSet {
  mask = BigInt(0)
  count = 0
}

/**
 * @internal
 */
export class KeyIndex {
  index = 0
  hash = BigInt(0)
}

@AutoExportable<XorFilter>('XorFilter', ['_seed'])
export default class XorFilter extends BaseFilter {
  private static readonly MAX_ITERATION = 1024

  /**
   * Array of fingerprints
   */
  @Field()
  public filter: number[]

  /**
   * The bucket size. filtersize / 3
   */
  @Field()
  public readonly bucketSize: number
  /**
   * Filter size Aka: (64 + ceil(1.23 * |S|)) / 3 * 3, where S is the set of elements to insert in the filter
   */
  @Field()
  public readonly filterSize: number

  constructor(elements: HashableInput[]) {
    super()
    if (elements.length <= 0 || !elements || !elements.length) {
      throw new Error(
        'a XorFilter must be calibrated for a given number of elements'
      )
    }
    this.filterSize =
      Math.round((64 + Math.ceil(1.23 * elements.length)) / 3) * 3
    this.bucketSize = this.filterSize / 3
    this.filter = this._create(elements)
  }

  /**
   * Return False if the element is not in the filter, True if it might be in the set with certain probability.
   * @param element
   * @returns
   */
  public has(element: HashableInput): boolean {
    const hashes = this._geth0h1h2(element, this.seed)
    const fprint = Number(BigInt.asUintN(8, this._fingerprint(hashes.hash)))
    return (
      fprint ===
      (hashes.h0 ^
        (hashes.h1 + this.bucketSize) ^
        (hashes.h2 + 2 * this.bucketSize))
    )
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
   * @returns bigint
   */
  private _fingerprint(hash: bigint): bigint {
    return hash * (hash >> BigInt(32)) // this._geth0(hash) ^ this._geth1(hash) ^ this._geth2(hash)
  }

  /**
   * Hash the element to its 64 bits version Number
   * @param element
   * @param seed
   * @returns bigint
   */
  private _serialize(element: HashableInput, seed: number) {
    return BigInt.asUintN(64, BigInt(XXH.h64(element, seed).toNumber()))
  }

  /**
   * @internal
   * @private
   * Bitwise left-rotation
   * @param n the number to rotate
   * @param c the number of rotation
   * @returns
   */
  private _rotl64(n: bigint, c: number) {
    return ((n << BigInt(c)) & BigInt(63)) | ((n >> -BigInt(c)) & BigInt(63))
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
  private _reduce(hash: bigint, n: number): bigint {
    const bign = BigInt.asUintN(64, BigInt(n))
    const big32 = BigInt(32)
    const bighash = BigInt.asUintN(64, hash)
    return BigInt.asUintN(32, (bighash * bign) >> big32)
  }

  /**
   * @internal
   * @private
   * Return the h0 index of the provided hash on the interval [0, size)
   * @param hash
   * @param size
   * @returns
   */
  private _geth0(hash: bigint, size: number = this.bucketSize): number {
    return Number(this._reduce(BigInt.asUintN(32, hash), size))
  }
  /**
   * @internal
   * @private
   * Return the h0 index of the provided hash on the interval [0, size)
   * @param hash
   * @param size
   * @returns
   */
  private _geth1(hash: bigint, size: number = this.bucketSize): number {
    return Number(
      this._reduce(BigInt.asUintN(32, this._rotl64(hash, 21)), size)
    )
  }
  /**
   * @internal
   * @private
   * Return the h0 index of the provided hash on the interval [0, size)
   * @param hash
   * @param size
   * @returns
   */
  private _geth2(hash: bigint, size: number = this.bucketSize): number {
    return Number(
      this._reduce(BigInt.asUintN(32, this._rotl64(hash, 42)), size)
    )
  }

  /**
   * Update the seed to a new one
   * @param seed
   * @returns
   */
  private _splitmix64(seed: number): number {
    let newSeed = BigInt(seed) + BigInt('0x9E3779B97F4A7C15')
    newSeed =
      (newSeed ^ (newSeed >> BigInt('30'))) * BigInt('0xBF58476D1CE4E5B9')
    newSeed =
      (newSeed ^ (newSeed >> BigInt('27'))) * BigInt('0x94D049BB133111EB')
    return Number(newSeed ^ (newSeed >> BigInt('31')))
  }

  /**
   * @internal
   * @private
   * Scan for pure values aka sets of count 1
   * @param set
   * @returns KeyIndex[]
   */
  private _scanCount(sets: XorSet[]): KeyIndex[] {
    const values: KeyIndex[] = allocateArray(this.bucketSize, () => new KeyIndex())
    sets.forEach((set, index) => {
      if (set.count === 1) {
        const keyindex = new KeyIndex()
        keyindex.index = index
        keyindex.hash = set.mask
        values[index] = keyindex
      }
    })
    return values
  }

  /**
   * Return an array of number representing the elements to store.
   * We eliminate all duplicated entries before creating the array.
   * Follow the algorithm 2 and 3 of the paper (@see https://arxiv.org/pdf/1912.08258.pdf)
   * Inspired by Go impl from (@see https://github.com/FastFilter/xorfilter/blob/master/xorfilter.go)
   * @param elements HashableInput[]
   * @returns number[]
   */
  private _create(elements: HashableInput[]): number[] {
    const filter: number[] = allocateArray(this.filterSize, () => 0)
    // get a new seed seed
    this.seed = this._splitmix64(this.seed)
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
      console.log(s0, s1, s2)

      // scan for pure-cells, just like IBLTs
      // aka: if count==1 then we this is a value hashed,
      // then we can xor all other sets to remove this value from those sets
      // until there is no value anymore
      const q0: KeyIndex[] = this._scanCount(s0)
      let q0Size = q0.length
      const q1: KeyIndex[] = this._scanCount(s1)
      let q1Size = q1.length
      const q2: KeyIndex[] = this._scanCount(s2)
      let q2Size = q2.length
      console.log(q0, q1, q2)
      console.log(q0Size, q1Size, q2Size)

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

          s1[h1].mask ^= hash
          s1[h1].count--
          if (s1[h1].count === 1) {
            q1[q1Size].index = h1
            q1[q1Size].hash = s1[h1].mask
            q1Size++
          }

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

          s0[h0].mask ^= hash
          s0[h0].count--
          if (s0[h0].count === 1) {
            q0[q0Size].index = h0
            q0[q0Size].hash = s0[h0].mask
            q0Size++
          }

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

          s0[h0].mask ^= hash
          s0[h0].count--
          if (s0[h0].count === 1) {
            q0[q0Size].index = h0
            q0[q0Size].hash = s0[h0].mask
            q0Size++
          }

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
      let val = Number(this._fingerprint(hash))
      if (index < this.bucketSize) {
        val ^=
          filter[this._geth1(hash) + this.bucketSize] ^
          filter[this._geth2(hash) + 2 * this.bucketSize]
      } else if (index < 2 * this.bucketSize) {
        val ^=
          filter[this._geth0(hash)] ^
          filter[this._geth2(hash) + 2 * this.bucketSize]
      } else {
        val ^=
          filter[this._geth0(hash)] ^
          filter[this._geth1(hash) + this.bucketSize]
      }
      filter[index] = val
    })
    return filter
  }
}
