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

import * as utils from './utils'
import * as fm from './formulas'
import { AutoExportable, Field, Parameter } from './exportable'
import BaseFilter from './base-filter'
import Cell from './cell'

/**
 * Exports an Invertible Bloom Lookup Table.
 *
 * An Invertible Bloom Lookup Table is a space-efficient and probabilistic data-structure for solving the set-difference problem efficiently without the use of logs or other prior context. It computes the set difference with communication proportional to the size of the difference between the sets being compared.
 * They can simultaneously calculate D(A−B) and D(B−A) using O(d) space. This data structure encodes sets in a fashion that is similar in spirit to Tornado codes’ construction [6], in that it randomly combines elements using the XOR function
 * Reference: Eppstein, D., Goodrich, M. T., Uyeda, F., & Varghese, G. (2011). What's the difference?: efficient set reconciliation without prior context. ACM SIGCOMM Computer Communication Review, 41(4), 218-229.
 * @see {@link http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.220.6282&rep=rep1&type=pdf} for more details about Invertible Bloom Lookup Tables
 * @type {InvertibleBloomFilter}
 * @author Arnaud Grall
 */
@AutoExportable('InvertibleBloomFilter', ['_seed'])
export class InvertibleBloomFilter extends BaseFilter {
  @Field()
  private _size: number

  @Field()
  private _hashCount: number

  @Field<Array<Cell>>(undefined, json => {
    return json.map(elt => {
      const c = new Cell(Buffer.from(elt._idSum), Buffer.from(elt._hashSum), elt._count)
      c.seed = elt._seed
      return c
    })
  })
  private _elements: Array<Cell>

  /**
   * Construct an Invertible Bloom Lookup Table
   * @param {Number} [size=1000] Number of cells in the InvertibleBloomFilter, should be set to d * alpha where d is the number of difference and alpha a constant
   * @param {Number} [hashCount=3] The number of hash functions used, empirically studied to be 3 or 4 in most cases
   * @param {Boolean} [verbose] default true, print a warning if size is less than the hashcount
   */
  constructor (@Parameter('_size') size = 1000, @Parameter('_hashCount') hashCount = 3, verbose = false) {
    super()
    if (Buffer === undefined) throw new Error('No native Buffer implementation in the browser please require the buffer package feross/buffer: require("buffer/").Buffer')
    if (typeof hashCount !== 'number' || hashCount <= 0) throw new Error('hashCount need to be a number and higher than 0')
    if (typeof size !== 'number') throw new Error('The size need to be a number')
    this._size = size
    this._hashCount = hashCount
    // the number of elements in the array is n = alpha * size
    this._elements = utils.allocateArray(this._size, () => Cell.empty())
  }

  /**
   * Create an Invertible Bloom filter like a classic Bloom Filter.
   * Dont forget that it creates an optimal filter for the specified size.
   * The classic contructor of the filter already create an optimal IBLT, which can decode at most of its capacity.
   * If you plan to only use the set difference, use the classic constructor.
   * If you want to list all entries of the filter, use this one.
   * @param  {Number} [items=1000]  [description]
   * @param  {Number} [rate=0.001] [description]
   * @return {InvertibleBloomFilter}
   */
  static create (items = 1000, rate = 0.001, verbose = false) {
    const size = fm.optimalFilterSize(items, rate)
    const hashes = fm.optimalHashes(size, items)
    return new InvertibleBloomFilter(size, hashes, verbose)
  }

  /**
   * Expose the Cell constructor as statis class of the Invertible Bloom Filter
   * @type {Array}
   */
  static get Cell () {
    return Cell
  }

  get count () {
    return this._hashCount
  }

  /**
   * Return an InvertibleBloomFilter of size 'size' and a number of hash functions used 'hashCount' with a set of inputs already inserted
   * @param  array  - The elements to insert
   * @param  {Number} [size=1000]   The size of the InvertibleBloomFilter
   * @param  {Number} [hashCount=4] the number of hash functions used
   * @param {Number} seed set the seed for the filter
   * @return {InvertibleBloomFilter}
   */
  static from (array: Array<Buffer>, size = 1000, hashCount = 4, verbose = false) {
    const iblt = new InvertibleBloomFilter(size, hashCount, verbose)
    array.forEach(e => iblt.add(e))
    return iblt
  }

  /**
   * Return the number of cells of the InvertibleBloomFilter
   * @return {Number} The number of differences allowed
   */
  get size () {
    return this._size
  }

  /**
   * Return the number of elements added in the InvertibleBloomFilter
   * Complexity in time: O(alpha*d)
   * @return {Number} the number of elements in the InvertibleBloomFilter
   */
  get length () {
    return this._elements.reduce((a, b) => a + b.count, 0) / this._hashCount
  }

  /**
   * Return the number of hash functions used
   * @return {Number}
   */
  get hashCount () {
    return this._hashCount
  }

  /**
   * Return cells that store elements in this InvertibleBloomFilter
   * @return {Cell[]}
   */
  get elements () {
    return this._elements
  }

  /**
   * Add a Buffer to the InvertibleBloomFilter
   * If the element is not a Buffer it will convert it into a Buffer object
   * @param element - Element to add
   */
  add (element: Buffer) {
    const hashes = utils.allInOneHashTwice(JSON.stringify(element.toJSON()), this.seed)
    const indexes = utils.getDistinctIndices(hashes.string.first, this._size, this._hashCount, this.seed)
    for (let i = 0; i < this._hashCount; ++i) {
      this._elements[indexes[i]].add(element, Buffer.from(hashes.string.first))
    }
  }

  /**
   * Delete an element from the Invertible Bloom Filter
   * @param  {Buffer} element the element to remove
   */
  delete (element: Buffer) {
    const hashes = utils.allInOneHashTwice(JSON.stringify(element.toJSON()), this.seed)
    const indexes = utils.getDistinctIndices(hashes.string.first, this.size, this._hashCount, this.seed)
    for (let i = 0; i < this._hashCount; ++i) {
      this._elements[indexes[i]] = this._elements[indexes[i]].xorm(new Cell(Buffer.from(element), Buffer.from(hashes.string.first), 1))
    }
  }

  /**
   * Return false if an element is not in the iblt, true if an element is in the iblt with an error rate
   * @param  {Buffer} element the element to get from the Iblt
   * @return {Boolean|Error|string} false if the element is not in the set, true if it is, 'perhaps', or an Error if an error appears.
   */
  has (element: Buffer) {
    const hashes = utils.allInOneHashTwice(JSON.stringify(element.toJSON()), this.seed)
    const indexes = utils.getDistinctIndices(hashes.string.first, this.size, this._hashCount, this.seed)
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
      return 'perhaps'
    }
  }

  /**
   * List all entries from the Iblt, without destruction
   * Do a copy of this Iblt before trying to list entries!!
   * Ref; As long as m is chosen so that m > (ck + epsilon )t for some epsilon >  0 LISTENTRIES fails with probability O(t
  −k+2) whenever n ≤ t.
   * @return {Buffer[]|Error} A list of all entries
   */
  // TODO FIX ME
  // listEntries () {
  //   const copy = InvertibleBloomFilter.fromJSON(this.saveAsJSON())
  //   let index
  //   const output = []
  //   let wrong = false
  //   while (!wrong && (index = copy._elements.findIndex(e => e.count === 1)) !== -1) {
  //     const elem = copy._elements[index].id
  //     if (copy.has(elem)) {
  //       output.push(elem)
  //       copy.delete(elem)
  //     } else {
  //       wrong = true
  //     }
  //   }
  //   return { output, success: !wrong }
  // }

  /**
   * XOR 2 Invertible Bloom Filters, local xor remote
   * @param  {InvertibleBloomFilter} remote The remote to substract
   * @return {InvertibleBloomFilter} a new InvertibleBloomFilter which is the XOR of the local and remote one
   */
  substract (remote) {
    if (this.size !== remote.size) throw new Error('they should be of the same size')
    const toReturn = new InvertibleBloomFilter(remote._size, remote._hashCount)
    toReturn.seed = this.seed
    for (let i = 0; i < this.size; ++i) {
      toReturn._elements[i] = this._elements[i].xorm(remote._elements[i])
    }
    return toReturn
  }

  /**
   * Check if two InvertibleBloomFilters are equal
   * @param  {InvertibleBloomFilter} InvertibleBloomFilter the remote InvertibleBloomFilter to compare with our
   * @return {Boolean} true if identical, false otherwise
   */
  equal (iblt) {
    if (iblt._size !== this._size || iblt._hashCount !== this._hashCount || iblt.seed !== this.seed) {
      return false
    } else {
      for (let i = 0; i < iblt._elements.length; ++i) {
        if (!iblt._elements[i].equal(this._elements[i])) return false
      }
      return true
    }
  }

  /**
   * Decode an InvertibleBloomFilter based on its substracted version
   * @param  {InvertibleBloomFilter} sub The Iblt to decode after being substracted
   * @return {Object}
   */
  static decode (sub, samb = [], sbma = []) {
    const pureList = []
    let cell: Cell
    // checking for all pure cells
    for (let i = 0; i < sub._elements.length; ++i) {
      cell = sub._elements[i]
      if (cell.isPure()) {
        pureList.push(i)
      }
    }
    while (pureList.length !== 0) {
      cell = sub._elements[pureList.pop()]
      const id = cell.idSum
      const c = cell.count
      if (cell.isPure()) {
        if (c === 1) {
          samb.push(id)
        } else if (c === -1) {
          sbma.push(id)
        } else {
          throw new Error('Please report, not possible')
        }
        const hashes = utils.allInOneHashTwice(JSON.stringify(id.toJSON()), sub.seed)
        const indexes = utils.getDistinctIndices(hashes.string.first, sub._size, sub._hashCount, sub.seed)
        for (let i = 0; i < indexes.length; ++i) {
          sub._elements[indexes[i]] = sub._elements[indexes[i]].xorm(new Cell(id, Buffer.from(hashes.string.first), c))
          if (sub._elements[indexes[i]].isPure(sub.seed)) {
            pureList.push(indexes[i])
          }
        }
      }
    }
    if (sub._elements.findIndex(e => {
      return !e.isEmpty()
    }) > -1) {
      // console.log('FALSE')
      return {
        success: false,
        reason: {
          cell,
          iblt: sub
        },
        additional: samb,
        missing: sbma
      }
    } else {
      // console.log('TRUE')
      return {
        success: true,
        additional: samb,
        missing: sbma
      }
    }
  }
}
