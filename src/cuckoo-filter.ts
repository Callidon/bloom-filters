/* file : cuckoo-filter.ts
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

import Bucket from './bucket'
import Exportable from './exportable'
import * as utils from './utils'
import { assertFields, cloneObject } from './export-import-specs'
import BaseFilter from './base-filter'

/**
 * Cuckoo filters improve on Bloom filters by supporting deletion, limited counting,
 * and bounded False positive rate with similar storage efficiency as a standard Bloom filter.
 *
 * Reference: Fan, B., Andersen, D. G., Kaminsky, M., & Mitzenmacher, M. D. (2014, December). Cuckoo filter: Practically better than bloom.
 * In Proceedings of the 10th ACM International on Conference on emerging Networking Experiments and Technologies (pp. 75-88). ACM.
 * @see {@link https://www.cs.cmu.edu/~dga/papers/cuckoo-conext2014.pdf} for more details about Cuckoo filters
 * @author Thomas Minier & Arnaud Grall
 */
@Exportable({
  export: cloneObject('CuckooFilter', '_size', '_fingerprintLength', '_length', '_maxKicks', '_filter', '_seed'),
  import: (json: any) => {
    if ((json.type !== 'CuckooFilter') || !('_size' in json) || !('_fingerprintLength' in json) || !('_length' in json) || !('_maxKicks' in json) || !('_filter' in json) || !('_seed' in json)) { throw new Error('Cannot create a CuckooFilter from a JSON export which does not represent a cuckoo filter') }
    const filter = new CuckooFilter(json._size, json._fingerprintLength, json._bucketSize, json._maxKicks)
    filter._length = json._length
    filter._filter = json._filter.map(j => {
      const bucket = new Bucket<string>(j._size)
      j._elements.forEach((elt, i) => {
        if (elt !== null) {
          bucket._elements[i] = elt
          bucket._length++
        }
      })
      return bucket
    })
    filter.seed = json.seed
    return filter
  }
})
export default class CuckooFilter extends BaseFilter {
  private _filter: Array<Bucket<string>>
  private _size: number
  private _bucketSize: number
  private _fingerprintLength: number
  private _length: number
  private _maxKicks: number
  /**
   * Constructor
   * @param {int} size - The filter size
   * @param {int} fLength - The length of the fingerprints
   * @param {int} bucketSize - The size of the buckets in the filter
   * @param {int} [maxKicks=500] - (optional) The max number of kicks when resolving collision at insertion, default to 1
   */
  constructor (size = 15, fLength = 3, bucketSize = 2, maxKicks = 500) {
    super()
    this._filter = utils.allocateArray(size, () => new Bucket(bucketSize))
    this._size = size
    this._bucketSize = bucketSize
    this._fingerprintLength = fLength
    this._length = 0
    this._maxKicks = maxKicks
  }

  /**
   * Return a new optimal CuckooFilter given the number of maximum elements to store and the error rate desired and the bucket size
   * @param  {Number} items          The number of items to insert
   * @param  {Number} rate           The desired error rate
   * @param  {Number} [bucketSize=2] The number of buckets desired per cell
   * @param  {Number} [maxKicks=10]   the number of kicks done when a collision occurs
   * @return {CuckooFilter} The CuckoFilter constructed for 'items' items with a provided error rate.
   */
  static create (items, rate = 0.001, bucketSize = 4, maxKicks = 500, seed = utils.getDefaultSeed()) {
    const fl = CuckooFilter._computeFingerpintLength(bucketSize, rate)
    const capacity = Math.ceil(items / bucketSize / 0.955)
    // const capacity = utils.power2(items)
    const f = new CuckooFilter(capacity, fl, bucketSize, maxKicks)
    f.seed = seed
    return f
  }

  /**
   * Return the full size, aka the total number of cells
   * @return {Number}
   */
  get fullSize () {
    return this.size * this.bucketSize
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
   * @todo do the recovery if return false or throw error because we altered values
   * Add an element to the filter, if false is returned, it means that the filter is considered as full.
   * @param {*} element - The element to add
   * @return {boolean} True if the insertion is a success, False if the filter is full
   * @example
   * const filter = new CuckooFilter(15, 3, 2);
   * filter.add('alice');
   * filter.add('bob');
   */
  add (element, throwError = false, destructive = false) {
    const locations = this._locations(element)
    // store fingerprint in an available empty bucket
    if (this._filter[locations.firstIndex].isFree()) {
      this._filter[locations.firstIndex].add(locations.fingerprint)
    } else if (this._filter[locations.secondIndex].isFree()) {
      this._filter[locations.secondIndex].add(locations.fingerprint)
    } else {
      // buckets are full, we must relocate one of them
      let index = this.random() < 0.5 ? locations.firstIndex : locations.secondIndex
      let movedElement = locations.fingerprint
      const logs = []
      for (let nbTry = 0; nbTry < this._maxKicks; nbTry++) {
        const rndIndex = utils.randomInt(0, this._filter[index].length - 1, this.random)
        const tmp = this._filter[index].at(rndIndex)
        logs.push([index, rndIndex, tmp])
        this._filter[index].set(rndIndex, movedElement)
        movedElement = tmp
        // movedElement = this._filter[index].set(rndswapRandom(movedElement, this._rng)
        const newHash = utils.hashAsInt(movedElement, this.seed, 64)
        index = Math.abs((index ^ Math.abs(newHash))) % this._filter.length
        // add the moved element to the bucket if possible
        if (this._filter[index].isFree()) {
          this._filter[index].add(movedElement)
          this._length++
          return true
        }
      }
      if (!destructive) {
        // rollback all modified entries to their initial states
        for (let i = logs.length - 1; i >= 0; i--) {
          const log = logs[i]
          this._filter[log[0]].set(log[1], log[2])
        }
      }
      // considered full
      if (throwError) {
        // rollback all operations
        throw new Error('[CuckooFilter] The filter is considered as full')
      } else {
        return false
      }
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
   * @param  {int} size - The filter bucket size
   * @param  {int} rate - The error rate, i.e. 'false positive' rate, targetted by the filter
   * @return {int} The optimal fingerprint length in bytes
   * @private
   */
  static _computeFingerpintLength (size, rate) {
    const f = Math.ceil(Math.log2(1 / rate) + Math.log2(2 * size))
    return Math.ceil(f / 4) // because we use base 16 64-bits hashes
  }

  /**
   * Return the false positive rate for this cuckoo filter
   * @return {Number} The false positive rate
   */
  rate () {
    const load = this._computeHashTableLoad()
    const c = this._fingerprintLength / load.load
    return Math.pow(2, Math.log2(2 * this._bucketSize) - (load.load * c))
  }

  /**
   * Return the load of this filter
   * @return {Object} load: is the load, size is the number of entries, free is the free number of entries, used is the number of entry used
   */
  _computeHashTableLoad () {
    const max = this._filter.length * this._bucketSize
    const used = this._filter.reduce((acc, val) => acc + val.length, 0)
    return {
      used,
      free: max - used,
      size: max,
      load: used / max
    }
  }

  /**
   * For a element, compute its fingerprint and the index of its two buckets
   * @param {*} element - The element to hash
   * @return {locations} The fingerprint of the element and the index of its two buckets
   * @private
   */
  _locations (element) {
    const hashes = utils.hashIntAndString(element, this.seed, 16, 64)
    const hash = hashes.int
    if (this._fingerprintLength > hashes.string.length) {
      throw new Error('the fingerprint length (' + this._fingerprintLength + ') is higher than the hash length (' + hashes.string.length + '), please reduce the fingerprint length or report if this is an unexpected behavior.')
    }
    const fingerprint = hashes.string.substring(0, this._fingerprintLength)
    const firstIndex = Math.abs(hash)
    const secondHash = Math.abs(utils.hashAsInt(fingerprint, this.seed, 64))
    const secondIndex = Math.abs(firstIndex ^ secondHash)
    const res = {
      fingerprint,
      firstIndex: firstIndex % this._size,
      secondIndex: secondIndex % this._size
    }
    return res
  }

  /**
   * Check if another cuckoo filter is equal to this one
   * @param  {CuckooFilter} filter the cuckoo filter to compare to this one
   * @return {Boolean} True if they are equal, false otherwise
   */
  equals (filter = undefined) {
    if (!filter) return false
    let i = 0
    let res = true
    while (res && i < this._filter.length) {
      const bucket = this._filter[i]
      if (!filter._filter[i].equals(bucket)) {
        res = false
      }
      i++
    }
    return res
  }
}
