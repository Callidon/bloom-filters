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

import WritableFilter from '../interfaces/writable-filter'
import BaseFilter from '../base-filter'
import Bucket from './bucket'
import { Exportable, cloneObject } from '../exportable'
import { HashableInput, allocateArray, hashAsInt, hashIntAndString, randomInt } from '../utils'

/**
 * Compute the optimal fingerprint length in bytes for a given bucket size
 * and a false positive rate.
 * @param  {int} size - The filter bucket size
 * @param  {int} rate - The error rate, i.e. 'false positive' rate, targetted by the filter
 * @return {int} The optimal fingerprint length in bytes
 * @private
 */
function computeFingerpintLength (size: number, rate: number): number {
  const f = Math.ceil(Math.log2(1 / rate) + Math.log2(2 * size))
  return Math.ceil(f / 4) // because we use base 16 64-bits hashes
}

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
    filter._filter = json._filter.map((j: any) => {
      const bucket = new Bucket<string>(j._size)
      j._elements.forEach((elt: any, i: number) => {
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
export default class CuckooFilter extends BaseFilter implements WritableFilter<HashableInput> {
  private _filter: Array<Bucket<string>>
  private _size: number
  private _bucketSize: number
  private _fingerprintLength: number
  private _length: number
  private _maxKicks: number
  /**
   * Constructor
   * @param size - The filter size
   * @param fLength - The length of the fingerprints
   * @param bucketSize - The size of the buckets in the filter
   * @param maxKicks - (optional) The max number of kicks when resolving collision at insertion, default to 1
   */
  constructor (size: number, fLength: number, bucketSize: number, maxKicks: number = 500) {
    super()
    this._filter = allocateArray(size, () => new Bucket(bucketSize))
    this._size = size
    this._bucketSize = bucketSize
    this._fingerprintLength = fLength
    this._length = 0
    this._maxKicks = maxKicks
  }

  /**
   * Return a new optimal CuckooFilter given the number of maximum elements to store and the error rate desired
   * @param  size - The number of items to store
   * @param  errorRate - The desired error rate
   * @param  bucketSize - The number of buckets desired per cell
   * @param  maxKicks - The number of kicks done when a collision occurs
   * @return A Cuckoo Filter optimal for these parameters
   */
  static create (size: number, errorRate: number, bucketSize: number = 4, maxKicks: number = 500): CuckooFilter {
    const fl = computeFingerpintLength(bucketSize, errorRate)
    const capacity = Math.ceil(size / bucketSize / 0.955)
    // const capacity = utils.power2(items)
    return new CuckooFilter(capacity, fl, bucketSize, maxKicks)
  }

  /**
   * Build a new optimal CuckooFilter from an iterable with a fixed error rate
   * @param items - Iterable used to populate the filter
   * @param errorRate - The error rate of the filter
   * @param  bucketSize - The number of buckets desired per cell
   * @param  maxKicks - The number of kicks done when a collision occurs
   * @return A new Cuckoo Filter filled with the iterable's elements
   */
  static from (items: Iterable<HashableInput>, errorRate: number, bucketSize: number = 4, maxKicks: number = 500): CuckooFilter {
    const array = Array.from(items)
    const filter = CuckooFilter.create(array.length, errorRate, bucketSize, maxKicks)
    array.forEach(item => filter.add(item))
    return filter
  }

  /**
   * Get the filter size
   */
  get size (): number {
    return this._size
  }

  /**
   * Get the filter full size, i.e., the total number of cells
   */
  get fullSize (): number {
    return this.size * this.bucketSize
  }

  /**
   * Get the filter length, i.e. the current number of elements in the filter
   */
  get length (): number {
    return this._length
  }

  /**
   * Get the length of the fingerprints in the filter
   */
  get fingerprintLength (): number {
    return this._fingerprintLength
  }

  /**
   * Get the size of the buckets in the filter
   */
  get bucketSize (): number {
    return this._bucketSize
  }

  /**
   * Get the max number of kicks when resolving collision at insertion
   */
  get maxKicks (): number {
    return this._maxKicks
  }

  /**
   * Add an element to the filter, if false is returned, it means that the filter is considered as full.
   * @param element - The element to add
   * @return True if the insertion is a success, False if the filter is full
   * @example
   * const filter = new CuckooFilter(15, 3, 2);
   * filter.add('alice');
   * filter.add('bob');
   */
  add (element: HashableInput, throwError: boolean = false, destructive: boolean = false): boolean {
    // TODO do the recovery if return false or throw error because we altered values
    const locations = this._locations(element)
    // store fingerprint in an available empty bucket
    if (this._filter[locations.firstIndex].isFree()) {
      this._filter[locations.firstIndex].add(locations.fingerprint)
    } else if (this._filter[locations.secondIndex].isFree()) {
      this._filter[locations.secondIndex].add(locations.fingerprint)
    } else {
      // buckets are full, we must relocate one of them
      let index = this.random() < 0.5 ? locations.firstIndex : locations.secondIndex
      let movedElement: string = locations.fingerprint
      const logs: Array<[number, number, string | null]> = []
      for (let nbTry = 0; nbTry < this._maxKicks; nbTry++) {
        const rndIndex = randomInt(0, this._filter[index].length - 1, this.random)
        const tmp = this._filter[index].at(rndIndex)
        logs.push([index, rndIndex, tmp])
        this._filter[index].set(rndIndex, movedElement)
        movedElement = tmp!
        // movedElement = this._filter[index].set(rndswapRandom(movedElement, this._rng)
        const newHash = hashAsInt(movedElement!, this.seed, 64)
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
        throw new Error(`The Cuckoo Filter is full, cannot insert element "${element}"`)
      } else {
        return false
      }
    }
    this._length++
    return true
  }

  /**
   * Remove an element from the filter
   * @param element - The element to remove
   * @return True if the element has been removed from the filter, False if it wasn't in the filter
   * @example
   * const filter = new CuckooFilter(15, 3, 2);
   * filter.add('alice');
   * filter.add('bob');
   *
   * // remove an element
   * filter.remove('bob');
   */
  remove (element: HashableInput): boolean {
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
   * @param element - The element to look for in the filter
   * @return False if the element is definitively not in the filter, True is the element might be in the filter
   * @example
   * const filter = new CuckooFilter(15, 3, 2);
   * filter.add('alice');
   *
   * console.log(filter.has('alice')); // output: true
   * console.log(filter.has('bob')); // output: false
   */
  has (element: HashableInput): boolean {
    const locations = this._locations(element)
    return this._filter[locations.firstIndex].has(locations.fingerprint) || this._filter[locations.secondIndex].has(locations.fingerprint)
  }

  /**
   * Return the false positive rate for this cuckoo filter
   * @return The false positive rate
   */
  rate (): number {
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
   * @param element - The element to hash
   * @return The fingerprint of the element and the index of its two buckets
   * @private
   */
  _locations (element: HashableInput) {
    const hashes = hashIntAndString(element, this.seed, 16, 64)
    const hash = hashes.int
    if (this._fingerprintLength > hashes.string.length) {
      throw new Error(`The fingerprint length (${this._fingerprintLength}) is higher than the hash length (${hashes.string.length}). Please reduce the fingerprint length or report if it is an unexpected behavior.`)
    }
    const fingerprint = hashes.string.substring(0, this._fingerprintLength)
    const firstIndex = Math.abs(hash)
    const secondHash = Math.abs(hashAsInt(fingerprint, this.seed, 64))
    const secondIndex = Math.abs(firstIndex ^ secondHash)
    const res = {
      fingerprint,
      firstIndex: firstIndex % this._size,
      secondIndex: secondIndex % this._size
    }
    return res
  }

  /**
   * Check if another Cuckoo filter is equal to this one
   * @param  filter - The cuckoo filter to compare to this one
   * @return True if they are equal, false otherwise
   */
  equals (filter: CuckooFilter): boolean {
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
