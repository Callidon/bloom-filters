/* file : partitioned-bloom-filter.js
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

// const fm = require('./formulas.js')
const utils = require('./utils.js')
const Exportable = require('./exportable.js')

/**
 * A Partitioned Bloom Filter is a variation of a classic Bloom filter.
 *
 * This filter works by partitioning the M-sized bit array into k slices of size m = M/k bits, k = nb of hash functions in the filter.
 * Each hash function produces an index over m for its respective slice.
 * Thus, each element is described by exactly k bits, meaning the distribution of false positives is uniform across all elements.
 *
 * Be careful, as a Partitioned Bloom Filter have much higher collison risks that a classic Bloom Filter on small sets of data.
 *
 * Reference: Chang, F., Feng, W. C., & Li, K. (2004, March). Approximate caches for packet classification. In INFOCOM 2004. Twenty-third AnnualJoint Conference of the IEEE Computer and Communications Societies (Vol. 4, pp. 2196-2207). IEEE.
 * @see {@link https://pdfs.semanticscholar.org/0e18/e24b37a1f4196fddf8c9ff8e4368b74cfd88.pdf} for more details about Partitioned Bloom Filters
 * @extends Exportable
 * @author Thomas Minier & Arnaud Grall
 * @example
 * const PartitionedBloomFilter = require('bloom-filters').PartitionedBloomFilter;
 *
 * // create a Partitioned Bloom Filter with 15 bits, 3 hash functions, and a load factor of 0.5
 * // creating 3 buckets of 5 bits each. This filter will be considered full after inserting 3 elements
 * let filter = new PartitionedBloomFilter(15, 3, 0.5);
 *
 * // alternatively, create a Partitioned Bloom Filter from an array with 1% error rate
 * filter = PartitionedBloomFilter.from([ 'alice', 'bob' ], 0.1);
 *
 * // add some value in the filter
 * filter.add('alice');
 * filter.add('bob');
 *
 * // lookup for some data
 * console.log(filter.has('bob')); // output: true
 * console.log(filter.has('daniel')); // output: false
 *
 * // print false positive rate (around 0.1)
 * console.log(filter.rate());
 */
class PartitionedBloomFilter extends Exportable {
  constructor (totalBits = 15, nbHashes = 3, loadFactor = 0.5, capacity = 0) {
    super()
    this._size = totalBits
    this._nbHashes = nbHashes
    this._loadFactor = loadFactor
    this._m = Math.ceil(this._size / this._nbHashes)
    this._filter = utils.allocateArray(this._nbHashes, () => utils.allocateArray(this._m, 0))
    this._capacity = capacity || PartitionedBloomFilter._computeNumberOfItems(this._size, loadFactor, nbHashes)
    this._length = 0
  }

  /**
   * Return a PartitionedBloomFilter for a given number of elements and under a given error rate
   * @param  {Number} [desiredItem=100] the max allowable number of items to insert
   * @param  {Number} [errorRate=0.01]  the desired error rate
   * @return {PartitionedBloomFilter}
   */
  static create (desiredItem = 100, errorRate = 0.01, loadFactor = 0.5) {
    const capacity = PartitionedBloomFilter._computeOptimalNumberOfCells(desiredItem, errorRate, loadFactor)
    const nbHashes = PartitionedBloomFilter._computeOptimalNumberOfhashes(errorRate, loadFactor)
    return new PartitionedBloomFilter(capacity, nbHashes, loadFactor, desiredItem)
  }

  /**
   * Get the filter capacity, i.e. the maximum number of elements it will contains
   * @return {integer} The filter capacity, i.e. the maximum number of elements it will contains
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
   * Build a new Partitioned Bloom Filter from an existing array with a fixed error rate
   * @param {Array} array - The array used to build the filter
   * @param {number} errorRate - The error rate, i.e. 'false positive' rate, targetted by the filter
   * @param {Number} seed set the seed for the filter
   * @param  {Number} [loadFactor=0.5] the load factor desired
   * @return {BloomFilter} A new Bloom Filter filled with iterable's elements
   * @example
   * // create a filter with a false positive rate of 0.1
   * const filter = PartitionedBloomFilter.from(['alice', 'bob', 'carl'], 0.1);
   */
  static from (array, errorRate, seed = utils.getDefaultSeed(), loadFactor = 0.5) {
    const filter = PartitionedBloomFilter.create(array.length, errorRate, loadFactor, array.length)
    filter.seed = seed
    array.forEach(element => filter.add(element))
    return filter
  }

  /**
   * Add an element to the filter
   * @param {string|Buffer} element - The element to add
   * @return {void}
   * @example
   * const filter = new PartitionedBloomFilter(15, 0.1);
   * filter.add('foo');
   */
  add (element) {
    const indexes = utils.getIndices(element, this._m, this._nbHashes, this._seed)
    for (let i = 0; i < this._nbHashes; i++) {
      this._filter[i][indexes[i]] = 1
    }
    this._length++
  }

  /**
   * Test an element for membership
   * @param {string|Buffer} element - The element to look for in the filter
   * @return {boolean} False if the element is definitively not in the filter, True is the element might be in the filter
   * @example
   * const filter = new PartitionedBloomFilter(15, 0.1);
   * filter.add('foo');
   * console.log(filter.has('foo')); // output: true
   * console.log(filter.has('bar')); // output: false
   */
  has (element) {
    const indexes = utils.getIndices(element, this._m, this._nbHashes, this._seed)
    for (let i = 0; i < this._nbHashes; i++) {
      if (!this._filter[i][indexes[i]]) {
        return false
      }
    }
    return true
  }

  /**
   * Get the current false positive rate (or error rate) of the filter
   * @return {int} The current false positive rate of the filter
   * @example
   * const filter = PartitionedBloomFilter.create(15, 0.1);
   * console.log(filter.rate()); // output: something around 0.1
   */
  rate () {
    try {
      // get the error rate for the first bucket (1 - (1 - 1/m)^n), where m is the size of a slice and n is the number of inserted elements
      const p = this._currentload()
      // P = p^k
      return Math.pow(p, this._nbHashes)
    } catch (e) {
      throw new Error('it should have at least one slice', e)
    }
  }

  /**
   * Return the current load of this filter, iterate on all buckets
   * @return {Number} 0 to 1, 0 is free, 1 is full
   */
  _currentload () {
    const values = this._filter.map(bucket => {
      return bucket.reduce((a, b) => a + b, 0)
    })
    const used = values.reduce((a, b) => a + b, 0)
    return used / this._size
  }

  /**
   * Return the optimal number of hashes needed for a given error rate and load factor
   * P = p^k <=> k = ln(P)/ln(p)
   * @param  {Number} errorRate  the provided error rate
   * @param  {Number} [loadFactor=0.5] the load factor, ideally 0.5
   * @return {Number} the number of hash function to use
   */
  static _computeOptimalNumberOfhashes (errorRate, loadFactor = 0.5) {
    // P = p^k <=> k = ln(P)/ln(p)
    return Math.ceil(Math.log(errorRate) / Math.log(loadFactor))
  }

  /**
   * Return the total number of bits needed for this filter
   * n = M*(ln(p)ln(1-p))/(-ln(P)) <=> M = (n*-ln(P)/(ln(p)ln(1-p))
   * @param  {Number} items the number of desired items
   * @param  {Number} rate the error rate desired
   * @param  {Number} [loadFactor=0.5] the load factor desired
   * @return {Number} the total number of cells this filter will have
   */
  static _computeOptimalNumberOfCells (items, rate, loadFactor = 0.5) {
    // n=M*(ln(p)ln(1-p))/(-ln(P)) <=> M=(n*-ln(P)/(ln(p)ln(1-p))
    return Math.ceil((items * -Math.log(rate)) / (Math.log(loadFactor) * Math.log(1 - loadFactor)))
  }

  /**
   * Return the maximum number of items this filter can store
   * @param  {Number} totalBits  the total number of cells in the filter
   * @param  {Number} [loadFactor=0.5] the load factor desired
   * @param  {Number} nbHashes   the number of hash functions used
   * @return {Number} the maximum number of items this filter store
   */
  static _computeNumberOfItems (totalBits, loadFactor, nbHashes) {
    return Math.ceil(totalBits * (Math.log(loadFactor) * Math.log(1 - loadFactor)) / (-(nbHashes * Math.log(loadFactor))))
  }
}

module.exports = PartitionedBloomFilter
