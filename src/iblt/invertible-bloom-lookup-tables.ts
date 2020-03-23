/* file : invertible-bloom-lookup-tables.ts
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

import BaseFilter from '../base-filter'
import WritableFilter from '../interfaces/writable-filter'
import Cell from './cell'
import { AutoExportable, Field, Parameter } from '../exportable'
import { allInOneHashTwice, allocateArray, getDistinctIndices } from '../utils'
import { optimalFilterSize, optimalHashes } from '../formulas'

/**
 * The reason why an Invertible Bloom Lookup Table decoding operation has failed
 */
export interface IBLTDecodingErrorReason {
  cell: Cell | null,
  iblt: InvertibleBloomFilter
}

/**
 * The results of decoding an Invertible Bloom Lookup Table
 */
export interface IBLTDecodingResults {
  success: boolean,
  reason?: IBLTDecodingErrorReason,
  additional: Buffer[],
  missing: Buffer[]
}

/**
 * An Invertible Bloom Lookup Table is a space-efficient and probabilistic data-structure for solving the set-difference problem efficiently without the use of logs or other prior context. It computes the set difference with communication proportional to the size of the difference between the sets being compared.
 * They can simultaneously calculate D(A−B) and D(B−A) using O(d) space. This data structure encodes sets in a fashion that is similar in spirit to Tornado codes’ construction [6], in that it randomly combines elements using the XOR function
 * Reference: Eppstein, D., Goodrich, M. T., Uyeda, F., & Varghese, G. (2011). What's the difference?: efficient set reconciliation without prior context. ACM SIGCOMM Computer Communication Review, 41(4), 218-229.
 * @see {@link http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.220.6282&rep=rep1&type=pdf} for more details about Invertible Bloom Lookup Tables
 * @author Arnaud Grall
 * @author Thomas Minier
 */
@AutoExportable('InvertibleBloomFilter', ['_seed'])
export default class InvertibleBloomFilter extends BaseFilter implements WritableFilter<Buffer> {
  @Field()
  private _size: number

  @Field()
  private _hashCount: number

  @Field<Array<Cell>>(undefined, json => {
    return json.map((elt: any) => {
      const c = new Cell(Buffer.from(elt._idSum), Buffer.from(elt._hashSum), elt._count)
      c.seed = elt._seed
      return c
    })
  })
  private _elements: Array<Cell>

  /**
   * Construct an Invertible Bloom Lookup Table
   * @param size - The number of cells in the InvertibleBloomFilter. It should be set to d * alpha, where d is the number of difference and alpha is a constant
   * @param hashCount - The number of hash functions used (empirically studied to be 3 or 4 in most cases)
   */
  constructor (@Parameter('_size') size: number, @Parameter('_hashCount') hashCount: number = 3) {
    super()
    if (Buffer === undefined) {
      throw new Error('No native Buffer implementation bound in your JavaScript env. If you are in a Web browser, consider importing the polyfill "feross/buffer" (https://github.com/feross/buffer).')
    }
    if (hashCount <= 0) {
      throw new Error('The hashCount must be a non-zero, positive integer')
    }
    this._size = size
    this._hashCount = hashCount
    // the number of elements in the array is n = alpha * size
    this._elements = allocateArray(this._size, () => Cell.empty())
  }

  /**
   * Create an Invertible Bloom filter optimal for an expected size and error rate.
   * @param nbItems - Number of items expected to insert into the IBLT
   * @param errorRate - Expected error rate
   * @return A new Invertible Bloom filter optimal for the given parameters.
   */
  static create (nbItems: number, errorRate: number): InvertibleBloomFilter {
    const size = optimalFilterSize(nbItems, errorRate)
    const nbHashes = optimalHashes(size, nbItems)
    return new InvertibleBloomFilter(size, nbHashes)
  }

  /**
   * Create an Invertible Bloom filter from a set of Buffer and optimal for an error rate.
   * @param items - An iterable to yield Buffers to be inserted into the filter
   * @param errorRate - Expected error rate
   * @return A new Invertible Bloom filter filled with the iterable's items.
   */
  static from (items: Iterable<Buffer>, errorRate: number): InvertibleBloomFilter {
    const array = Array.from(items)
    const filter = InvertibleBloomFilter.create(array.length, errorRate)
    array.forEach(item => filter.add(item))
    return filter
  }

  /**
   * Return the number of hash functions used
   * @return {Number}
   */
  get hashCount () {
    return this._hashCount
  }

  /**
   * Get the number of cells of the filter
   */
  get size (): number {
    return this._size
  }

  /**
   * Get the number of elements added in the filter
   * Complexity in time: O(alpha*d)
   */
  get length (): number {
    return this._elements.reduce((a, b) => a + b.count, 0) / this._hashCount
  }

  /**
   * Return the cells used to store elements in this InvertibleBloomFilter
   */
  get elements (): Cell[] {
    return this._elements
  }

  /**
   * Add an element to the InvertibleBloomFilter
   * @param element - The element to insert
   */
  add (element: Buffer): void {
    const hashes = allInOneHashTwice(JSON.stringify(element.toJSON()), this.seed)
    const indexes = getDistinctIndices(hashes.string.first, this._size, this._hashCount, this.seed)
    for (let i = 0; i < this._hashCount; ++i) {
      this._elements[indexes[i]].add(element, Buffer.from(hashes.string.first))
    }
  }

  /**
   * Remove an element from the filter
   * @param element - The element to remove
   * @return True if the element has been removed, False otheriwse
   */
  remove (element: Buffer): boolean {
    const hashes = allInOneHashTwice(JSON.stringify(element.toJSON()), this.seed)
    const indexes = getDistinctIndices(hashes.string.first, this.size, this._hashCount, this.seed)
    for (let i = 0; i < this._hashCount; ++i) {
      this._elements[indexes[i]] = this._elements[indexes[i]].xorm(new Cell(Buffer.from(element), Buffer.from(hashes.string.first), 1))
    }
    return true
  }

  /**
   * Test if an item is in the filter.
   * @param  element - The element to test
   * @return False if the element is not in the filter, true if "may be" in the filter.
   */
  has (element: Buffer): boolean {
    const hashes = allInOneHashTwice(JSON.stringify(element.toJSON()), this.seed)
    const indexes = getDistinctIndices(hashes.string.first, this.size, this._hashCount, this.seed)
    for (let i = 0; i < this._hashCount; ++i) {
      if (this._elements[indexes[i]].count === 0) {
        return false
      } else if (this._elements[indexes[i]].count === 1) {
        if (this._elements[indexes[i]].idSum.equals(element)) {
          return true
        } else {
          return false
        }
      }
    }
    return true
  }
  
  /**
   * List all entries from the filter using a Generator.
   * The generator ends with True if the operation has not failed, False otheriwse.
   * It is not recommended to modify an IBLT while listing its entries!
   * @return A generator that yields all filter's entries.
   */
  listEntries (): Generator<Buffer, boolean> {
    const that = this
    const seenBefore: Buffer[] = []
    return function * () {
      for(let index = 0; index < that._elements.length - 1; index++) {
        const localCell = that._elements[index]
        if (localCell.count > 0 && seenBefore.findIndex((b: Buffer) => b.equals(localCell.idSum)) === -1) {
          if (that.has(localCell.idSum)) {
            seenBefore.push(localCell.idSum)
            yield localCell.idSum
          } else {
            return false
          }
        }
      }
      return true
    }()
  }

  /**
   * Substract the filter with another {@link InvertibleBloomFilter}, and returns the resulting filter.
   * @param  remote - The filter to substract with
   * @return A new InvertibleBloomFilter which is the XOR of the local and remote one
   */
  substract (iblt: InvertibleBloomFilter): InvertibleBloomFilter {
    if (this.size !== iblt.size) {
      throw new Error('The two Invertible Bloom Filters must be of the same size')
    }
    const res = new InvertibleBloomFilter(iblt._size, iblt._hashCount)
    res.seed = this.seed
    for (let i = 0; i < this.size; ++i) {
      res._elements[i] = this._elements[i].xorm(iblt._elements[i])
    }
    return res
  }

  /**
   * Test if two InvertibleBloomFilters are equals
   * @param iblt - The filter to compare with
   * @return True if the two filters are equals, False otherwise
   */
  equals (iblt: InvertibleBloomFilter): boolean {
    if (iblt._size !== this._size || iblt._hashCount !== this._hashCount || iblt.seed !== this.seed) {
      return false
    } else {
      for (let i = 0; i < iblt._elements.length; ++i) {
        if (!iblt._elements[i].equals(this._elements[i])) {
          return false
        }
      }
      return true
    }
  }

  /**
   * Decode an InvertibleBloomFilter based on its substracted version
   * @return The results of the deconding process
   */
  decode (additional: Buffer[] = [], missing: Buffer[] = []): IBLTDecodingResults {
    const pureList: number[] = []
    let cell: Cell | null = null
    // checking for all pure cells
    for (let i = 0; i < this._elements.length; ++i) {
      cell = this._elements[i]
      if (cell.isPure()) {
        pureList.push(i)
      }
    }
    while (pureList.length !== 0) {
      cell = this._elements[pureList.pop()!]
      const id = cell.idSum
      const c = cell.count
      if (cell.isPure()) {
        if (c === 1) {
          additional.push(id)
        } else if (c === -1) {
          missing.push(id)
        } else {
          throw new Error('Please report, not possible')
        }
        const hashes = allInOneHashTwice(JSON.stringify(id.toJSON()), this.seed)
        const indexes = getDistinctIndices(hashes.string.first, this._size, this._hashCount, this.seed)
        for (let i = 0; i < indexes.length; ++i) {
          this._elements[indexes[i]] = this._elements[indexes[i]].xorm(new Cell(id, Buffer.from(hashes.string.first), c))
          if (this._elements[indexes[i]].isPure()) {
            pureList.push(indexes[i])
          }
        }
      }
    }
    if (this._elements.findIndex(e => !e.isEmpty()) > -1) {
      return {
        success: false,
        reason: {
          cell: cell,
          iblt: this
        },
        additional,
        missing
      }
    } else {
      return {
        success: true,
        additional,
        missing
      }
    }
  }
}
