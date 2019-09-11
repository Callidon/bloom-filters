/* file : counting-bloom-filter.js
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

const fm = require('./formulas.js')
const utils = require('./utils.js')
const Exportable = require('./exportable.js')

/**
 * A Counting Bloom filter works in a similar manner as a regular Bloom filter; however, it is able to keep track of insertions and deletions. In a counting Bloom filter, each entry in the Bloom filter is a small counter associated with a basic Bloom filter bit.
 *
 * Reference: F. Bonomi, M. Mitzenmacher, R. Panigrahy, S. Singh, and G. Varghese, “An Improved Construction for Counting Bloom Filters,” in 14th Annual European Symposium on Algorithms, LNCS 4168, 2006, pp.
684–695.
 * @extends Exportable
 * @author Thomas Minier & Arnaud Grall
 * @example
 * const CountingBloomFilter = require('bloom-filters').CountingBloomFilter;
 *
 * // create a Bloom Filter with capacity = 15 and 1% error rate
 * let filter = new CountingBloomFilter(15, 0.1);
 *
 * // alternatively, create a Counting Bloom Filter from an array with 1% error rate
 * filter = CountingBloomFilter.from([ 'alice', 'bob' ], 0.1);
 *
 * // add some value in the filter
 * filter.add('alice');
 * filter.add('bob');
 * filter.add('carole');
 *
 * // remove some value
 * filter.remove('carole');
 *
 * // lookup for some data
 * console.log(filter.has('bob')); // output: true
 * console.log(filter.has('carole')); // output: false
 * console.log(filter.has('daniel')); // output: false
 *
 * // print false positive rate (around 0.1)
 * console.log(filter.rate());
 */
class CountingBloomFilter extends Exportable {
  /**
   * Constructor
   * @param {int} capacity - The filter capacity, i.e. the maximum number of elements it will contains
   * @param {number} errorRate - The error rate, i.e. 'false positive' rate, targeted by the filter
   */
  constructor (capacity, errorRate) {
    super()
    this._capacity = capacity
    this._errorRate = errorRate
    this._size = fm.optimalFilterSize(capacity, errorRate)
    this._nbHashes = fm.optimalHashes(this._size, capacity)
    // the filter contains tuples [bit, counter]
    this._filter = utils.allocateArray(this._size, () => [0, 0])
    this._length = 0
  }

  /**
   * Build a new Bloom Filter from an existing array with a fixed error rate
   * @param {Array} array - The array used to build the filter
   * @param {number} errorRate - The error rate, i.e. 'false positive' rate, targetted by the filter
   * @param {Number} seed set the seed for the filter
   * @return {BloomFilter} A new Bloom Filter filled with iterable's elements
   * @example
   * // create a filter with a false positive rate of 0.1
   * const filter = CountingBloomFilter.from(['alice', 'bob', 'carl'], 0.1);
   */
  static from (array, errorRate, seed = utils.getDefaultSeed()) {
    const filter = new CountingBloomFilter(array.length, errorRate)
    filter.seed = seed
    array.forEach(element => filter.add(element))
    return filter
  }

  /**
   * Get the filter capacity, i.e. the maximum number of elements it will contains
   * @return {integer} The filter capacity
   */
  get capacity () {
    return this._capacity
  }

  /**
   * Get the optimal size of the filter
   * @return {integer} The size of the filter
   */
  get size () {
    return this._size
  }

  /**
   * Get the number of elements currently in the filter
   * @return {integer} The filter length
   */
  get length () {
    return this._length
  }

  /**
   * Add an element to the filter
   * @param {*} element - The element to add
   * @return {void}
   * @example
   * const filter = new CountingBloomFilter(15, 0.1);
   * filter.add('foo');
   */
  add (element) {
    const indexes = utils.getDistinctIndices(element, this._size, this._nbHashes, this.seed)
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
   * Delete an element from the filter
   * @param {*} element - The element to delete
   * @return {void}
   * @example
   * const filter = new CountingBloomFilter(15, 0.1);
   * filter.delete('foo');
   */
  delete (element) {
    const indexes = utils.getDistinctIndices(element, this._size, this._nbHashes, this.seed)
    for (let i = 0; i < indexes.length; i++) {
      // decrement counter
      this._filter[indexes[i]][1] -= 1
      // set bit if necessary
      if (this._filter[indexes[i]][1] <= 0) {
        this._filter[indexes[i]][0] = 0
      }
    }
    this._length++
  }

  /**
   * Test an element for membership
   * @param {*} element - The element to look for in the filter
   * @return {boolean} False if the element is definitively not in the filter, True is the element might be in the filter
   * @example
   * const filter = new CountingBloomFilter(15, 0.1);
   * filter.add('foo');
   * console.log(filter.has('foo')); // output: true
   * console.log(filter.has('bar')); // output: false
   */
  has (element) {
    const indexes = utils.getDistinctIndices(element, this._size, this._nbHashes, this.seed)
    for (let i = 0; i < indexes.length; i++) {
      if (!this._filter[indexes[i]][0]) {
        return false
      }
    }
    return true
  }

  /**
   * Get the current false positive rate (or error rate) of the filter
   * @return {int} The current false positive rate of the filter
   * @example
   * const filter = new BloomFilter(15, 0.1);
   * console.log(filter.rate()); // output: something around 0.1
   */
  rate () {
    return Math.pow(1 - Math.exp((-this._nbHashes * this._length) / this._size), this._nbHashes)
  }
}

module.exports = CountingBloomFilter
