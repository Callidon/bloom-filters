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
import {AutoExportable, Field, Parameter} from '../exportable'
import {HashableInput, allocateArray, BufferError} from '../utils'
import XXH from 'xxhashjs'
import Long from 'long'
import {encode, decode} from 'base64-arraybuffer'

const CONSTANTS = new Map<number, number>()
CONSTANTS.set(8, 0xff)
CONSTANTS.set(16, 0xffff)

/**
 * Extended HashableInput type adding the Long type from the long package for using plain 64-bits number.
 */
export type XorHashableInput = HashableInput | Long

/**
 * XOR-Filter for 8-bits and 16-bits fingerprint length.
 *
 * To use for fixed sets of elements only
 * Inspired from @see https://github.com/FastFilter/fastfilter_java
 * @author Arnaud GRALL
 * @example
 * ```js
 * const xor8 = new XorFilter(1) // default fingerprint of 8 bits
 * xor8.add(['a'])
 * xor8.has('a') // true
 * xor8.has('b') // false
 * const xor16 = new XorFilter(1, 16)
 * xor16.add(['a'])
 * xor16.has('a') // true
 * xor16.has('b') // false
 * ```
 */
@AutoExportable<XorFilter>('XorFilter', ['_seed'])
export default class XorFilter extends BaseFilter {
  public ALLOWED_FINGERPRINT_SIZES: number[] = [8, 16]
  public HASHES = 3
  public OFFSET = 32
  public FACTOR_TIMES_100 = 123

  /**
   * Buffer array of fingerprints
   */
  @Field<Buffer[]>(
    (d: Buffer[]) => d.map(encode),
    (d: string[]) => d.map((e: string) => Buffer.from(decode(e)))
  )
  public _filter: Buffer[]

  /**
   * Number of bits per fingerprint
   */
  @Field()
  public _bits = 8

  /**
   * Number of elements inserted in the filter
   */
  @Field()
  public _size: number

  /**
   * Size of each block (filter size / HASHES)
   */
  @Field()
  public _blockLength: number

  /**
   * Create an empty XorFilter for a number of `size` elements.
   * The fingerprint length can be choosen
   * @param size
   * @param bits_per_fingerprint
   */
  constructor(
    @Parameter('_size') size: number,
    @Parameter('_bits') bits_per_fingerprint?: 8 | 16
  ) {
    super()
    // try to use the Buffer class or reject by throwing an error
    if (!Buffer) {
      throw new Error(BufferError)
    }
    if (bits_per_fingerprint) {
      if (!this.ALLOWED_FINGERPRINT_SIZES.includes(bits_per_fingerprint)) {
        throw new Error(
          `bits_per_fingerprint parameter must be one of: [${this.ALLOWED_FINGERPRINT_SIZES.join(
            ','
          )}], got: ${bits_per_fingerprint}`
        )
      }
      this._bits = bits_per_fingerprint
    }
    if (size <= 0) {
      throw new Error(
        'a XorFilter must be calibrated for a given number of elements'
      )
    }
    this._size = size
    const arrayLength = this._getOptimalFilterSize(this._size)
    this._blockLength = arrayLength / this.HASHES
    this._filter = allocateArray(arrayLength, () =>
      Buffer.allocUnsafe(this._bits / 8).fill(0)
    )
  }

  /**
   * Return False if the element is not in the filter, True if it might be in the set with certain probability.
   * @param element
   * @returns
   */
  public has(element: XorHashableInput): boolean {
    const hash = this._hash64(
      element instanceof Long
        ? element
        : this._hashable_to_long(element, this.seed),
      this.seed
    )
    const fingerprint = this._fingerprint(hash).toInt()
    const r0 = Long.fromInt(hash.toInt())
    const r1 = Long.fromInt(hash.rotl(21).toInt())
    const r2 = Long.fromInt(hash.rotl(42).toInt())
    const h0 = this._reduce(r0, this._blockLength)
    const h1 = this._reduce(r1, this._blockLength) + this._blockLength
    const h2 = this._reduce(r2, this._blockLength) + 2 * this._blockLength
    const l0 = this._readBuffer(this._filter[h0])
    const l1 = this._readBuffer(this._filter[h1])
    const l2 = this._readBuffer(this._filter[h2])
    const xored = fingerprint ^ l0 ^ l1 ^ l2
    const constant = CONSTANTS.get(this._bits)! // eslint-disable-line @typescript-eslint/no-non-null-assertion
    return (xored & constant) === 0
  }

  /**
   * Add elements to the filter, modify the filter in place.
   * Warning: Another call will override the previously created filter.
   * @param elements
   * @example
   * ```js
   * const xor = new XorFilter(1, 8)
   * xor.add(['alice'])
   * xor.has('alice') // true
   * xor.has('bob') // false
   * ```
   */
  public add(elements: XorHashableInput[]) {
    if (elements.length !== this._size) {
      throw new Error(
        `This filter has been created for exactly ${this._size} elements`
      )
    } else {
      this._create(elements, this._filter.length)
    }
  }

  /**
   * Return True if the other XorFilter is equal
   * @param filter
   * @returns
   */
  public equals(filter: XorFilter) {
    // first check the seed
    if (this.seed !== filter.seed) {
      return false
    }
    // check the number of bits per fingerprint used
    if (this._bits !== filter._bits) {
      return false
    }
    // check the number of elements inserted
    if (this._size !== filter._size) {
      return false
    }
    // now check each entry of the filter
    let broken = true
    let i = 0
    while (broken && i < this._filter.length) {
      if (!filter._filter[i].equals(this._filter[i])) {
        broken = false
      } else {
        i++
      }
    }
    return broken
  }

  /**
   * Return a XorFilter for a specified set of elements
   * @param elements
   * @returns
   */
  public static create(
    elements: XorHashableInput[],
    bits_per_fingerprint?: 8 | 16
  ): XorFilter {
    const a = new XorFilter(elements.length, bits_per_fingerprint)
    a.add(elements)
    return a
  }

  // ===================================
  // ==== PRIVATE METHODS/FUNCTIONS ====
  // ===================================

  /**
   * @internal
   * @private
   * Return the optimal xor filter size
   * @param size
   * @returns
   */
  public _getOptimalFilterSize(size: number): number {
    // optimal size
    const s = Long.ONE.multiply(this.FACTOR_TIMES_100)
      .multiply(size)
      .divide(100)
      .add(this.OFFSET)
    // return a size which is a multiple of hashes for optimal blocklength
    return s.add(-s.mod(this.HASHES)).toInt()
  }

  /**
   * @internal
   * @private
   * Read the buffer provided as int8, int16 or int32le based on the size of the finger prints
   * @param buffer
   * @returns
   */
  public _readBuffer(buffer: Buffer): number {
    let val: number
    switch (this._bits) {
      case 16:
        val = buffer.readInt16LE()
        break
      case 8:
      default:
        val = buffer.readInt8()
        break
    }
    return val
  }

  /**
   * @internal
   * @private
   * Generate the fingerprint of the hash
   * @param hash hash of the element
   * @returns
   */
  public _fingerprint(hash: Long): Long {
    return hash.and((1 << this._bits) - 1)
  }

  /**
   * @internal
   * @private
   * Transform any HashableInput into its Long representation
   * @param element
   * @param seed
   * @returns
   */
  public _hashable_to_long(element: HashableInput, seed: number) {
    return Long.fromString(XXH.h64(element, seed).toString(10), 10)
  }

  /**
   * @internal
   * @private
   * Hash a long into a Long
   * @param element
   * @returns
   */
  public _hash64(element: Long, seed: number): Long {
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

  /**
   * Perform a modulo reduction using an optimiaze technique
   * @param hash
   * @param size
   * @returns
   */
  public _reduce(hash: Long, size: number): number {
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
  public _getHash(element: Long, seed: number, index: number): number {
    const hash: Long = this._hash64(element, seed)
    const r: Long = hash.rotl(21 * index)
    const rn = this._reduce(r, this._blockLength)
    const sum = rn + index * this._blockLength
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
  public _create(elements: XorHashableInput[], arrayLength: number) {
    const reverseOrder: Long[] = allocateArray(this._size, Long.ZERO)
    const reverseH: number[] = allocateArray(this._size, 0)
    let reverseOrderPos
    do {
      this.seed = this.nextInt32()
      const t2count = allocateArray(arrayLength, 0)
      const t2 = allocateArray(arrayLength, Long.ZERO)
      elements
        .map(k => {
          if (k instanceof Long) {
            return k
          } else {
            return this._hashable_to_long(k, this.seed)
          }
        })
        .forEach(k => {
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
        allocateArray(this._blockLength, 0)
      )
      const alonePos: number[] = allocateArray(this.HASHES, 0)
      for (let nextAlone = 0; nextAlone < this.HASHES; nextAlone++) {
        for (let i = 0; i < this._blockLength; i++) {
          if (t2count[nextAlone * this._blockLength + i] === 1) {
            alone[nextAlone][alonePos[nextAlone]++] =
              nextAlone * this._blockLength + i
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
    } while (reverseOrderPos !== this._size)

    for (let i = reverseOrderPos - 1; i >= 0; i--) {
      const k = reverseOrder[i]
      const found = reverseH[i]
      let change = -1
      const hash = this._hash64(k, this.seed)
      let xor = this._fingerprint(hash).toInt()
      for (let hi = 0; hi < this.HASHES; hi++) {
        const h = this._getHash(k, this.seed, hi)
        if (found === hi) {
          change = h
        } else {
          xor ^= this._readBuffer(this._filter[h])
        }
      }
      // the value is in 32 bits format, so we must cast it to the desired number of bytes
      const buf = Buffer.from(allocateArray(4, 0))
      buf.writeInt32LE(xor)
      this._filter[change] = buf.slice(0, this._bits / 8)
    }
  }
}
