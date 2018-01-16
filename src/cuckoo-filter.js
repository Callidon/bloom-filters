/* file : cuckoo-filter.js
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

const murmur = require('murmurhash3js')
const Bucket = require('./bucket.js')
const Exportable = require('./exportable.js')
const utils = require('./utils.js')

/**
 * Cuckoo filters improve on Bloom filters by supporting deletion, limited counting,
 * and bounded False positive rate with similar storage efficiency as a standard Bloom filter.
 *
 * Reference: Fan, B., Andersen, D. G., Kaminsky, M., & Mitzenmacher, M. D. (2014, December). Cuckoo filter: Practically better than bloom.
 * In Proceedings of the 10th ACM International on Conference on emerging Networking Experiments and Technologies (pp. 75-88). ACM.
 * @see {@link https://www.cs.cmu.edu/~dga/papers/cuckoo-conext2014.pdf} for more details about Cuckoo filters
 * @extends Exportable
 * @author Thomas Minier
 * @example
 * const CuckooFilter = require('bloom-filters').CuckooFilter;
 *
 * // create a Cuckoo Filter with size = 15, fingerprint length = 3 and bucket size = 2
 * const filter = new CuckooFilter(15, 3, 2);
 * filter.add('alice');
 * filter.add('bob');
 *
 * // lookup for some data
 * console.log(filter.has('bob')); // output: true
 * console.log(filter.has('daniel')); // output: false
 *
 * // remove something
 * filter.remove('bob');
 * console.log(filter.has('bob')); // output: false
 */
class CuckooFilter extends Exportable {
  /**
   * Constructor
   * @param {int} size - The filter size
   * @param {int} fLength - The length of the fingerprints
   * @param {int} bucketSize - The size of the buckets in the filter
   * @param {int} [maxKicks=1] - (optional) The max number of kicks when resolving collision at insertion, default to 1
   */
  constructor (size, fLength, bucketSize, maxKicks = 1) {
    super()
    this._filter = utils.allocateArray(size, () => new Bucket(bucketSize))
    this._size = size
    this._fingerprintLength = fLength
    this._length = 0
    this._maxKicks = maxKicks
  }

  /**
   * Get the filter size
   * @return {integer} The filter size
   */
  get size () {
    return this._size
  }

  /**
   * Get the filter length, i.e. the current number of elements in the filter
   * @return {integer} The filter length
   */
  get length () {
    return this._length
  }

  /**
   * Get the length of the fingerprints in the filter
   * @return {integer} The length of the fingerprints
   */
  get fingerprintLength () {
    return this._fingerprintLength
  }

  /**
   * Get the size of the buckets in the filter
   * @return {integer} The size of the buckets in the filter
   */
  get bucketSize () {
    return this._bucketSize
  }

  /**
   * Get the max number of kicks when resolving collision at insertion
   * @return {integer} The max number of kicks when resolving collision at insertion
   */
  get maxKicks () {
    return this._maxKicks
  }

  /**
   * Build a new Cuckoo Filter from an existing array with a fixed error rate
   * @param {Array} array - The array used to build the filter
   * @param {number} errorRate - The error rate, i.e. 'false positive' rate, targetted by the filter
   * @return {CuckooFilter} A new Cuckoo Filter filled with iterable's elements
   * @example
   * // create a filter with a false positive rate of 0.1
   * const filter = CuckooFilter.from(['alice', 'bob', 'carl'], 0.1);
   */
  // static from (array, fLength, bucketSize, maxKicks) {
  //   const length = array.length; // TODO: need to find the good formula for this
  //   const filter = new CuckooFilter(length, errorRate);
  //   array.forEach(element => filter.add(element));
  //   return filter;
  // }

  /**
   * Create a new Cuckoo Filter from a JSON export
   * @param  {Object} json - A JSON export of a Cuckoo Filter
   * @return {CuckooFilter} A new Cuckoo Filter
   */
  static fromJSON (json) {
    if ((json.type !== 'CuckooFilter') || !('_size' in json) || !('_fingerprintLength' in json) || !('_length' in json) || !('_maxKicks' in json) || !('_filter' in json)) { throw new Error('Cannot create a CuckooFilter from a JSON export which does not represent a cuckoo filter') }
    const filter = new CuckooFilter(json._size, json._fingerprintLength, json._bucketSize, json._maxKicks)
    filter._length = json._length
    filter._filter = json._filter.map(json => Bucket.fromJSON(json))
    return filter
  }

  /**
   * Add an element to the filter
   * @param {*} element - The element to add
   * @return {boolean} True if the insertion is a success, False if the filter is full
   * @example
   * const filter = new CuckooFilter(15, 3, 2);
   * filter.add('alice');
   * filter.add('bob');
   */
  add (element) {
    const locations = this._locations(element)
    // store fingerprint in an available empty bucket
    if (this._filter[locations.firstIndex].isFree()) {
      this._filter[locations.firstIndex].add(locations.fingerprint)
    } else if (this._filter[locations.secondIndex].isFree()) {
      this._filter[locations.secondIndex].add(locations.fingerprint)
    } else {
      // buckets are full, we must relocate one of them
      let index = Math.random() < 0.5 ? locations.firstIndex : locations.secondIndex
      let movedElement = locations.fingerprint
      for (let nbTry = 0; nbTry < this._maxKicks; nbTry++) {
        movedElement = this._filter[index].swapRandom(movedElement)
        index = Math.abs(index ^ Math.abs(murmur.x86.hash32(movedElement))) % this._size
        // add the moved element to the bucket if possible
        if (this._filter[index].isFree()) {
          this._filter[index].add(movedElement)
          this._length++
          return true
        }
      }
      return false
    }
    this._length++
    return true
  }

  /**
   * Remove an element from the filter
   * @param {*} element - The element to remove
   * @return {boolean} True if the element has been removed from the filter, False if it wasn't in the filter
   * @example
   * const filter = new CuckooFilter(15, 3, 2);
   * filter.add('alice');
   * filter.add('bob');
   *
   * // remove an element
   * filter.remove('bob');
   */
  remove (element) {
    const locations = this._locations(element)
    if (this._filter[locations.firstIndex].has(locations.fingerprint)) {
      this._filter[locations.firstIndex].remove(locations.fingerprint)
      this._length--
      return true
    } else if (this._filter[locations.secondIndex].has(locations.fingerprint)) {
      this._filter[locations.secondIndex].remove(locations.fingerprint)
      this._length--
      return true
    }
    return false
  }

  /**
   * Test an element for membership
   * @param {*} element - The element to look for in the filter
   * @return {boolean} False if the element is definitively not in the filter, True is the element might be in the filter
   * @example
   * const filter = new CuckooFilter(15, 3, 2);
   * filter.add('alice');
   *
   * console.log(filter.has('alice')); // output: true
   * console.log(filter.has('bob')); // output: false
   */
  has (element) {
    const locations = this._locations(element)
    return this._filter[locations.firstIndex].has(locations.fingerprint) || this._filter[locations.secondIndex].has(locations.fingerprint)
  }

  /**
   * Compute the optimal fingerprint length in bytes for a given bucket size
   * and a false positive rate.
   * @warning seems to have problem with / 8, need to assert that formula
   * @param  {int} size - The filter size
   * @param  {int} rate - The error rate, i.e. 'false positive' rate, targetted by the filter
   * @return {int} The optimal fingerprint length in bytes
   * @private
   */
  _computeFingerpintLength (size, rate) {
    const length = Math.ceil(Math.log(2 * size / rate)) / 8
    if (length <= 0) return 1
    return length
  }

  /**
   * For a element, compute its fingerprint and the index of its two buckets
   * @param {*} element - The element to hash
   * @return {locations} The fingerprint of the element and the index of its two buckets
   * @private
   */
  _locations (element) {
    const hash = murmur.x86.hash32(element)
    const fingerprint = hash.toString(16).substring(0, this._fingerprintLength)
    const firstIndex = Math.abs(hash)
    const secondIndex = Math.abs(firstIndex ^ Math.abs(murmur.x86.hash32(fingerprint)))
    return {
      fingerprint,
      firstIndex: firstIndex % this._size,
      secondIndex: secondIndex % this._size
    }
  }
}

module.exports = CuckooFilter
