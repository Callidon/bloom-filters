/* file : counting-bloom-filter.ts
MIT License

Copyright (c) 2017 Thomas Minier & Arnaud Grall

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
import { AutoExportable, Field, Parameter } from '../exportable'
import { optimalFilterSize, optimalHashes } from '../formulas'
import { HashableInput, allocateArray, getDistinctIndices } from '../utils'

/**
 * A Counting Bloom filter works in a similar manner as a regular Bloom filter; however, it is able to keep track of insertions and deletions. In a counting Bloom filter, each entry in the Bloom filter is a small counter associated with a basic Bloom filter bit.
 *
 * Reference: F. Bonomi, M. Mitzenmacher, R. Panigrahy, S. Singh, and G. Varghese, “An Improved Construction for Counting Bloom Filters,” in 14th Annual European Symposium on Algorithms, LNCS 4168, 2006, pp.
684–695.
 * @author Thomas Minier & Arnaud Grall
 */
@AutoExportable('CountingBloomFilter', ['_seed'])
export default class CountingBloomFilter extends BaseFilter implements WritableFilter<HashableInput> {
  @Field()
  private _size: number
  @Field()
  private _nbHashes: number
  @Field()
  private _filter: Array<Array<number>>
  @Field()
  private _length: number
  /**
   * Constructor
   * @param size - The size of the filter
   * @param nbHashes - The number of hash functions
   */
  constructor (@Parameter('_size') size: number, @Parameter('_nbHashes') nbHashes: number) {
    super()
    if (nbHashes < 1) {
      throw new Error(`A CountingBloomFilter must used at least one hash function, but you tried to use ${nbHashes} functions. Consider increasing it.`)
    }
    this._size = size // fm.optimalFilterSize(capacity, errorRate)
    this._nbHashes = nbHashes // fm.optimalHashes(this._size, capacity)
    // the filter contains tuples [bit, counter]
    this._filter = allocateArray(this._size, () => [0, 0])
    this._length = 0
  }

  /**
   * Allocate a CountingBloomFilter with a target maximum capacity and error rate
   * @param  capacity - The maximum capacity of the filter
   * @param  errorRate - The error rate of the filter
   * @return A new {@link CountingBloomFilter}
   */
  static create (capacity: number, errorRate: number): CountingBloomFilter {
    const s = optimalFilterSize(capacity, errorRate)
    return new CountingBloomFilter(s, optimalHashes(s, capacity))
  }

  /**
   * Build a new Bloom Filter from an iterable with a fixed error rate
   * @param items - Iterable used to populate the filter
   * @param errorRate - The error rate of the filter
   * @return A new Bloom Filter filled with the iterable's elements
   * @example
   * // create a filter with a false positive rate of 0.1
   * const filter = CountingBloomFilter.from(['alice', 'bob', 'carl'], 0.1);
   */
  static from (items: Iterable<HashableInput>, errorRate: number): CountingBloomFilter {
    const array = Array.from(items)
    const filter = CountingBloomFilter.create(array.length, errorRate)
    array.forEach(element => filter.add(element))
    return filter
  }

  /**
   * Get the optimal size of the filter
   */
  get size (): number {
    return this._size
  }

  /**
   * Get the number of elements currently in the filter
   */
  get length (): number {
    return this._length
  }

  /**
   * Add an element to the filter
   * @param element - The element to add
   * @example
   * const filter = new CountingBloomFilter(15, 0.1);
   * filter.add('foo');
   */
  add (element: HashableInput): void {
    const indexes = getDistinctIndices(element, this._size, this._nbHashes, this.seed)
    for (let i = 0; i < indexes.length; i++) {
      // increment counter
      this._filter[indexes[i]][1] += 1
      // set bit if necessary
      if (this._filter[indexes[i]][1] > 0) {
        this._filter[indexes[i]][0] = 1
      }
    }
    this._length++
  }

  /**
   * Remove an element from the filter
   * @param element - The element to delete
   * @example
   * const filter = new CountingBloomFilter(15, 0.1);
   * filter.remove('foo');
   */
  remove (element: HashableInput): boolean {
    const indexes = getDistinctIndices(element, this._size, this._nbHashes, this.seed)
    let success = true
    for (let i = 0; i < indexes.length; i++) {
      // decrement counter
      this._filter[indexes[i]][1] -= 1
      // set bit if necessary
      if (this._filter[indexes[i]][1] <= 0) {
        this._filter[indexes[i]][0] = 0
      }
    }
    this._length--
    return success
  }

  /**
   * Test an element for membership
   * @param element - The element to look for in the filter
   * @return False if the element is definitively not in the filter, True is the element might be in the filter
   * @example
   * const filter = new CountingBloomFilter(15, 0.1);
   * filter.add('foo');
   * console.log(filter.has('foo')); // output: true
   * console.log(filter.has('bar')); // output: false
   */
  has (element: HashableInput): boolean {
    const indexes = getDistinctIndices(element, this._size, this._nbHashes, this.seed)
    for (let i = 0; i < indexes.length; i++) {
      if (!this._filter[indexes[i]][0]) {
        return false
      }
    }
    return true
  }

  /**
   * Get the current false positive rate (or error rate) of the filter
   * @return The current false positive rate of the filter
   * @example
   * const filter = new BloomFilter(15, 0.1);
   * console.log(filter.rate()); // output: something around 0.1
   */
  rate (): number {
    return Math.pow(1 - Math.exp((-this._nbHashes * this._length) / this._size), this._nbHashes)
  }

  /**
   * Check if another Counting Bloom Filter is equal to this one
   * @param  filter - The filter to compare to this one
   * @return True if they are equal, false otherwise
   */
  equals (other: CountingBloomFilter): boolean {
    if (this._size !== other._size || this._nbHashes !== other._nbHashes || this._length !== other._length) {
      return false
    }
    return this._filter.every((value, index) => other._filter[index][0] === value[0] && other._filter[index][1] === value[1])
  }
}
