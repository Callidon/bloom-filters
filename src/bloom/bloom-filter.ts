/* file : bloom-filter.ts
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

import ClassicFilter from '../interfaces/classic-filter'
import BaseFilter from '../base-filter'
import { AutoExportable, Field, Parameter } from '../exportable'
import { optimalFilterSize, optimalHashes } from '../formulas'
import { HashableInput, allocateArray, getDistinctIndices } from '../utils'

/**
 * A Bloom filter is a space-efficient probabilistic data structure, conceived by Burton Howard Bloom in 1970,
 * that is used to test whether an element is a member of a set. False positive matches are possible, but false negatives are not.
 *
 * Reference: Bloom, B. H. (1970). Space/time trade-offs in hash coding with allowable errors. Communications of the ACM, 13(7), 422-426.
 * @see {@link http://crystal.uta.edu/~mcguigan/cse6350/papers/Bloom.pdf} for more details about classic Bloom Filters.
 * @author Thomas Minier
 * @author Arnaud Grall
 */
@AutoExportable<BloomFilter>('BloomFilter', ['_seed'])
export default class BloomFilter extends BaseFilter implements ClassicFilter<HashableInput> {
  @Field()
  private _size: number

  @Field()
  private _nbHashes: number

  @Field()
  private _filter: Array<number>

  @Field()
  private _length: number

  /**
   * Constructor
   * @param size - The number of cells
   * @param nbHashes - The number of hash functions used
   */
  constructor (@Parameter('_size') size: number, @Parameter('_nbHashes') nbHashes: number) {
    super()
    if (nbHashes < 1) {
      throw new Error(`A BloomFilter cannot uses less than one hash function, while you tried to use ${nbHashes}.`)
    }
    this._size = size
    this._nbHashes = nbHashes
    this._filter = allocateArray(this._size, 0)
    this._length = 0
  }

  /**
   * Create an optimal bloom filter providing the maximum of elements stored and the error rate desired
   * @param  items      - The maximum nuber of item to store
   * @param  errorRate  - The error rate desired for a maximum of items inserted
   * @return A new {@link BloomFilter}
   */
  static create (nbItems: number, errorRate: number): BloomFilter {
    const size = optimalFilterSize(nbItems, errorRate)
    const hashes = optimalHashes(size, nbItems)
    return new BloomFilter(size, hashes)
  }

  /**
   * Build a new Bloom Filter from an existing iterable with a fixed error rate
   * @param items - The iterable used to populate the filter
   * @param errorRate - The error rate, i.e. 'false positive' rate, targetted by the filter
   * @return A new Bloom Filter filled with the iterable's elements
   * @example
   * // create a filter with a false positive rate of 0.1
   * const filter = BloomFilter.from(['alice', 'bob', 'carl'], 0.1);
   */
  static from (items: Iterable<HashableInput>, errorRate: number): BloomFilter {
    const array = Array.from(items)
    const filter = BloomFilter.create(array.length, errorRate)
    array.forEach(element => filter.add(element))
    return filter
  }

  /**
   * Get the optimal size of the filter
   * @return The size of the filter
   */
  get size (): number {
    return this._size
  }

  /**
   * Get the number of elements currently in the filter
   * @return The filter length
   */
  get length (): number {
    return this._length
  }

  /**
   * Add an element to the filter
   * @param element - The element to add
   * @example
   * const filter = new BloomFilter(15, 0.1);
   * filter.add('foo');
   */
  add (element: HashableInput): void {
    const indexes = getDistinctIndices(element, this._size, this._nbHashes, this.seed)
    for (let i = 0; i < indexes.length; i++) {
      this._filter[indexes[i]] = 1
    }
    this._length++
  }

  /**
   * Test an element for membership
   * @param element - The element to look for in the filter
   * @return False if the element is definitively not in the filter, True is the element might be in the filter
   * @example
   * const filter = new BloomFilter(15, 0.1);
   * filter.add('foo');
   * console.log(filter.has('foo')); // output: true
   * console.log(filter.has('bar')); // output: false
   */
  has (element: HashableInput): boolean {
    const indexes = getDistinctIndices(element, this._size, this._nbHashes, this.seed)
    for (let i = 0; i < indexes.length; i++) {
      if (!this._filter[indexes[i]]) {
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
   * Check if another Bloom Filter is equal to this one
   * @param  filter - The filter to compare to this one
   * @return True if they are equal, false otherwise
   */
  equals (other: BloomFilter): boolean {
    if (this._size !== other._size || this._nbHashes !== other._nbHashes || this._length !== other._length) {
      return false
    }
    return this._filter.every((value, index) => other._filter[index] === value)
  }
}
