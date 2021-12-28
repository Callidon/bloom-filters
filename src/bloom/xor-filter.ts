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

// Code inspired by the java implementation (https://github.com/FastFilter/fastfilter_java/blob/master/fastfilter/src/main/java/org/fastfilter/xor/Xor8.java)

import BaseFilter from '../base-filter'
import {AutoExportable, Field} from '../exportable'
import {HashableInput, allocateArray} from '../utils'
import XXH from 'xxhashjs'
import Long from 'long'

/**
 * 64-Bits Version of the XOR-Filter.
 * To use for fixed sets of elements only
 * Inspired from @see https://github.com/FastFilter/fastfilter_java/blob/master/fastfilter/src/main/java/org/fastfilter/xor/Xor8.java
 */
@AutoExportable<XorFilter>('XorFilter', ['_seed'])
export default class XorFilter extends BaseFilter {
  private readonly HASHES = 3
  private readonly OFFSET = 64
  private readonly FACTOR_TIMES_100 = 123

  /**
   * Array<UInt8> of fingerprints
   */
  @Field()
  public filter: Buffer[]

  /**
   * Number of bits per fingerprint
   */
  @Field()
  public BITS_PER_FINGERPRINT = 8

  /**
   * Number of elements inserted in the filter
   */
  @Field()
  public size: number

  /**
   * Size of each block (filter size / HASHES)
   */
  @Field()
  public blockLength: number

  /**
   * Return the filter size
   */
  public get filterSize() {
    return this.filter.length
  }

  private getOptimalFilterSize(size: number): number {
    // optimal size
    const s = Long.ONE.multiply(this.FACTOR_TIMES_100)
      .multiply(size)
      .divide(100)
      .add(this.OFFSET)
    // return a size which is a multiple of hashes for optimal blocklength
    return s.add(-s.mod(this.HASHES)).toInt()
  }

  constructor(elements: HashableInput[], bits_per_fingerprint?: number) {
    super()
    if (bits_per_fingerprint) {
      if (
        bits_per_fingerprint % 8 !== 0 &&
        bits_per_fingerprint <= 64 &&
        bits_per_fingerprint >= 8
      ) {
        throw new Error(
          'BITS_PER_FINGERPRINT must be a multiple of 8 between 8 and 64'
        )
      }
      this.BITS_PER_FINGERPRINT = bits_per_fingerprint
    }
    if (elements.length <= 0 || !elements || !elements.length) {
      throw new Error(
        'a XorFilter must be calibrated for a given number of elements'
      )
    }
    this.size = elements.length
    const arrayLength = this.getOptimalFilterSize(this.size)
    this.blockLength = arrayLength / this.HASHES
    this.filter = allocateArray(arrayLength, () =>
      Buffer.from(allocateArray(this.BITS_PER_FINGERPRINT / 8, 0))
    )
    const elementsAsLong: Long[] = elements.map(k => {
      if (k instanceof Long) {
        return k
      } else {
        return this._hashable_to_long(k, this.seed)
      }
    })
    this._create(elementsAsLong, arrayLength)
  }

  /**
   * Return False if the element is not in the filter, True if it might be in the set with certain probability.
   * @param element
   * @returns
   */
  public has(element: HashableInput | Long): boolean {
    const hash = this._hash64(
      element instanceof Long ? element : this._hashable_to_long(element, this.seed),
      this.seed
    )
    const fingerprint = this._fingerprint(hash)
    const r0 = hash
    const r1 = hash.rotl(21)
    const r2 = hash.rotl(42)
    const h0 = this._reduce(r0, this.blockLength)
    const h1 = this._reduce(r1, this.blockLength)
    const h2 = this._reduce(r2, this.blockLength)
    const xor: Long = fingerprint
      .xor(this._buf2Long(this.filter[h0]))
      .xor(this._buf2Long(this.filter[h1]))
      .xor(this._buf2Long(this.filter[h2]))
    const bf = this._long2buff(fingerprint)
    const bxor = this._long2buff(xor)
    return bf.equals(bxor)
  }
  
  /**
   * Return a Buffer of size (8 - this.BITS_PER_FINGERPRINT / 8) bytes representing the provided Long
   * @param elem 
   * @returns 
   */
  _long2buff(elem: Long) {
    return Buffer.from(elem.toBytes()).slice(8 - this.BITS_PER_FINGERPRINT / 8)
  }

  /**
   * Convert a Buffer to its Long representation
   * @param buffer 
   * @returns 
   */
  _buf2Long(buffer: Buffer): Long {
    return Long.fromBytes([...buffer.values()])
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
   * Generate the fingerprint of the hash
   * @param hash hash of the element
   * @returns
   */
  private _fingerprint(hash: Long): Long {
    return hash.and((1 << this.BITS_PER_FINGERPRINT) - 1)
  }

  /**
   * Transform any HashableInput into its Long representation
   * @param element
   * @param seed
   * @returns
   */
  _hashable_to_long(element: HashableInput, seed: number) {
    return Long.fromString(XXH.h64(element, seed).toString(10), 10)
  }

  /**
   * Hash a long into a Long
   * @param element
   * @returns
   */
  _hash64(element: Long, seed: number): Long {
    let h = element.add(seed)
    h = h
      .xor(h.shiftRightUnsigned(33))
      .multiply(Long.fromString('0xff51afd7ed558ccd', 16))
    h = h = h
      .xor(h.shiftRightUnsigned(33))
      .multiply(Long.fromString('0xc4ceb9fe1a85ec53', 16))
    h = h.xor(h.shiftRightUnsigned(33))
    return h
  }

  _reduce(hash: Long, size: number): number {
    // http://lemire.me/blog/2016/06/27/a-fast-alternative-to-the-modulo-reduction/
    return hash
      .and(Long.fromString('0xffffffff', 16))
      .multiply(size)
      .shiftRightUnsigned(32)
      .toInt()
  }

  /**
   * Hash the element
   * @param element
   * @param seed
   * @returns
   */
  private _getHash(element: Long, seed: number, index: number): number {
    const hash: Long = this._hash64(element, seed)
    const r: Long = hash.rotl(21 * index)
    const rn = this._reduce(r, this.blockLength)
    const sum = rn + index * this.blockLength
    return sum
  }

  /**
   * Create the filter representing the elements to store.
   * We eliminate all duplicated entries before creating the array.
   * Follow the algorithm 2 and 3 of the paper (@see https://arxiv.org/pdf/1912.08258.pdf)
   * Inspired by Go impl from (@see https://github.com/FastFilter/xorfilter/blob/master/xorfilter.go)
   * @param elements array of elements to add in the filter
   * @param arraylength length of the filter
   * @returns
   */
  private _create(elements: Long[], arrayLength: number) {
    const m = arrayLength
    const reverseOrder: Long[] = allocateArray(this.size, Long.ZERO)
    const reverseH: number[] = allocateArray(this.size, 0)
    let reverseOrderPos
    let seed = 1
    do {
      seed = (this.random as any).int32()
      const t2count = allocateArray(m, 0)
      const t2 = allocateArray(m, Long.ZERO)
      elements.forEach((k) => {
        for (let hi = 0; hi < this.HASHES; hi++) {
          const h = this._getHash(k, this.seed, hi)
          t2[h] = t2[h].xor(k)
          if (t2count[h] > 120) {
            // probably something wrong with the hash function
            throw new Error(
              `Probably something wrong with the hash function, t2count[${h}]=${t2count[h]}`
            )
          }
          t2count[h]++
        }
      })
      reverseOrderPos = 0
      const alone: number[][] = allocateArray(this.HASHES, () =>
        allocateArray(this.blockLength, 0)
      )
      const alonePos: number[] = allocateArray(this.HASHES, 0)
      for (let nextAlone = 0; nextAlone < this.HASHES; nextAlone++) {
        for (let i = 0; i < this.blockLength; i++) {
          if (t2count[nextAlone * this.blockLength + i] === 1) {
            alone[nextAlone][alonePos[nextAlone]++] =
              nextAlone * this.blockLength + i
          }
        }
      }
      let found = -1
      let i = 0
      while (i !== -1) {
        i = -1
        for (let hi = 0; hi < this.HASHES; hi++) {
          if (alonePos[hi] > 0) {
            i = alone[hi][--alonePos[hi]]
            found = hi
            break
          }
        }
        if (i === -1) {
          // no entry found
          break
        }
        if (t2count[i] <= 0) {
          continue
        }
        const k = t2[i]
        if (t2count[i] !== 1) {
          throw new Error('At this step, the count must not be different of 1')
        }
        --t2count[i]
        for (let hi = 0; hi < this.HASHES; hi++) {
          if (hi !== found) {
            const h = this._getHash(k, this.seed, hi)
            const newCount = --t2count[h]
            if (newCount === 1) {
              alone[hi][alonePos[hi]++] = h
            }
            t2[h] = t2[h].xor(k)
          }
        }
        reverseOrder[reverseOrderPos] = k
        reverseH[reverseOrderPos] = found
        reverseOrderPos++
      }
    } while (reverseOrderPos !== this.size)

    this.seed = seed
    for (let i = reverseOrderPos - 1; i >= 0; i--) {
      const k = reverseOrder[i]
      const found = reverseH[i]
      let change = -1
      const hash = this._hash64(k, seed)
      let xor = this._fingerprint(hash)
      for (let hi = 0; hi < this.HASHES; hi++) {
        const h = this._getHash(k, seed, hi)
        if (found === hi) {
          change = h
        } else {
          xor = xor.xor(this._buf2Long(this.filter[h]))
        }
      }
      const buf = Buffer.from(xor.toBytes())
      // a Long is always 8 bytes
      this.filter[change] = buf.slice(8 - this.BITS_PER_FINGERPRINT / 8)
    }
  }
}
