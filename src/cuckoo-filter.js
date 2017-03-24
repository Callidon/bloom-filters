/* file : cuckoo-filter.js
MIT License

Copyright (c) 2016 Thomas Minier & Arnaud Grall

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

'use strict';

const murmur = require('murmurhash3js');
const Bucket = require('./bucket.js');
const utils = require('./utils.js');

/**
 * Cuckoo filters improve on Bloom filters by supporting deletion, limited counting,
 * and bounded False positive rate with similar storage efficiency as a standard Bloom filter.
 *
 * Reference: Fan, B., Andersen, D. G., Kaminsky, M., & Mitzenmacher, M. D. (2014, December). Cuckoo filter: Practically better than bloom.
 * In Proceedings of the 10th ACM International on Conference on emerging Networking Experiments and Technologies (pp. 75-88). ACM.
 * @author Thomas Minier
 * @see {@link https://www.cs.cmu.edu/~dga/papers/cuckoo-conext2014.pdf} for more details about Cuckoo filters
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
class CuckooFilter {
  /**
   * Constructor
   * @param {int} size - The filter size
   * @param {int} fLength - The length of the fingerprints
   * @param {int} bucketSize - The size of the buckets in the filter
   * @param {int|undefined} maxKicks - (optional) The max number of kicks when resolving collision at insertion, default to 1
   */
  constructor (size, fLength, bucketSize, maxKicks) {
    this.filter = utils.allocateArray(size, () => new Bucket(bucketSize));
    this.size = size;
    this.fingerprintLength = fLength;
    this.length = 0;
    this.maxKicks = maxKicks || 1;
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
   * Add an element to the filter
   * @param {*} element - The element to add
   * @return {boolean} True if the insertion is a success, False if the filter is full
   * @example
   * const filter = new CuckooFilter(15, 3, 2);
   * filter.add('alice');
   * filter.add('bob');
   */
  add (element) {
    const locations = this._locations(element);
    // store fingerprint in an available empty bucket
    if (this.filter[locations.firstIndex].isFree()) {
      this.filter[locations.firstIndex].add(locations.fingerprint);
    } else if (this.filter[locations.secondIndex].isFree()) {
      this.filter[locations.secondIndex].add(locations.fingerprint);
    } else {
      // buckets are full, we must relocate one of them
      let index = Math.random() < 0.5 ? locations.firstIndex : locations.secondIndex;
      let movedElement = locations.fingerprint;
      for (let nbTry = 0; nbTry < this.maxKicks; nbTry++) {
        movedElement = this.filter[index].swapRandom(movedElement);
        index = Math.abs(index ^ Math.abs(murmur.x86.hash32(movedElement))) % this.size;
        // add the moved element to the bucket if possible
        if (this.filter[index].isFree()) {
          this.filter[index].add(movedElement);
          this.length++;
          return true;
        }
      }
      return false;
    }
    this.length++;
    return true;
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
    const locations = this._locations(element);
    if (this.filter[locations.firstIndex].has(locations.fingerprint)) {
      this.filter[locations.firstIndex].remove(locations.fingerprint);
      this.length--;
      return true;
    } else if (this.filter[locations.secondIndex].has(locations.fingerprint)) {
      this.filter[locations.secondIndex].remove(locations.fingerprint);
      this.length--;
      return true;
    }
    return false;
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
    const locations = this._locations(element);
    return this.filter[locations.firstIndex].has(locations.fingerprint) || this.filter[locations.secondIndex].has(locations.fingerprint);
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
    const length = Math.ceil(Math.log(2 * size / rate)) / 8;
    if(length <= 0) return 1;
    return length;
  }

  /**
   * For a element, compute its fingerprint and the index of its two buckets
   * @param {*} element - The element to hash
   * @return {locations} The fingerprint of the element and the index of its two buckets
   * @private
   */
  _locations (element) {
    const hash = murmur.x86.hash32(element);
    const fingerprint = hash.toString(16).substring(0, this.fingerprintLength);
    const firstIndex = Math.abs(hash);
    const secondIndex = Math.abs(firstIndex ^ Math.abs(murmur.x86.hash32(fingerprint)));
    return {
      fingerprint,
      firstIndex: firstIndex % this.size,
      secondIndex: secondIndex % this.size
    };
  }
}

module.exports = CuckooFilter;
