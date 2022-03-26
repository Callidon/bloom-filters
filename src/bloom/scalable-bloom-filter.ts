/* file : scalable-bloom-filter.ts
MIT License

Copyright (c) 2022 Thomas Minier & Arnaud Grall

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

import ClassicFilter from '../interfaces/classic-filter'
import BaseFilter, {prng} from '../base-filter'
import {AutoExportable, Field, Parameter} from '../exportable'
import {HashableInput} from '../utils'
import PartitionBloomFilter from './partitioned-bloom-filter'
import seedrandom from 'seedrandom'

/**
 * A Scalable Bloom Filter is a variant of Bloom Filters that can adapt dynamically to the
number of elements stored, while assuring a maximum false positive probability
 *
 * Reference: ALMEIDA, Paulo Sérgio, BAQUERO, Carlos, PREGUIÇA, Nuno, et al. Scalable bloom filters. Information Processing Letters, 2007, vol. 101, no 6, p. 255-261.
 * @see {@link https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.725.390&rep=rep1&type=pdf}
 * @author Thomas Minier & Arnaud Grall
 */
@AutoExportable<ScalableBloomFilter>('ScalableBloomFilter', ['_seed'])
export default class ScalableBloomFilter
  extends BaseFilter
  implements ClassicFilter<HashableInput>
{
  /**
   * Static value, will power the size of the new set, by default we will follow a power of 2.
   */
  public static _s = 2

  /**
   * The initial size of this filter in number of elements, not in bytes.
   */
  @Field()
  public _initial_size: number

  /**
   * The error rate desired.
   */
  @Field()
  public _error_rate: number

  /**
   * The load factor of each filter, By default: 0.5 half of the set
   */
  @Field()
  public _ratio: number

  /**
   * Internal Partition Bloom Filters
   */
  @Field(
    (filters: PartitionBloomFilter[]) =>
      filters.map(filter => filter.saveAsJSON()), // eslint-disable-line @typescript-eslint/no-unsafe-return
    (array: []) =>
      array.map(
        data => PartitionBloomFilter.fromJSON(data) as PartitionBloomFilter
      )
  )
  public _filters: PartitionBloomFilter[] = []

  constructor(
    @Parameter('_initial_size')
    _initial_size = 8,
    @Parameter('_error_rate')
    _error_rate = 0.01,
    @Parameter('_ratio')
    _ratio = 0.5
  ) {
    super()
    this._initial_size = _initial_size
    this._error_rate = _error_rate
    this._ratio = _ratio
    this._filters.push(
      PartitionBloomFilter.create(
        this._initial_size,
        this._error_rate,
        this._ratio
      )
    )
    this._filters[this._filters.length - 1].seed = this.seed
  }

  /**
   * @override
   * Return the current seed.
   * For obscure reason we must code this function...
   */
  public get seed() {
    return this._seed
  }

  /**
   * @override
   * Set the seed for this structure. If you override the seed after adding data,
   * all the filters will be updated and you may get wrong indexes for already indexed data
   * due to the seed change. So only change it once before adding data.
   * @param  seed the new seed that will be used in this structure
   */
  public set seed(seed: number) {
    this._seed = seed
    this._rng = seedrandom(`${this._seed}`) as prng
    this._filters.forEach((filter: PartitionBloomFilter) => {
      filter.seed = this.seed
    })
  }

  /**
   * Add a new element to the filter
   * @param element
   */
  public add(element: HashableInput) {
    // determine if we need to create a new filter
    const currentFilter = this._filters[this._filters.length - 1]
    if (currentFilter._currentload() > currentFilter._loadFactor) {
      // create a new filter
      const newSize =
        this._initial_size *
        Math.pow(ScalableBloomFilter._s, this._filters.length + 1) *
        Math.LN2
      const newErrorRate =
        this._error_rate * Math.pow(this._ratio, this._filters.length)
      this._filters.push(
        PartitionBloomFilter.create(newSize, newErrorRate, this._ratio)
      )
      this._filters[this._filters.length - 1].seed = this.seed
    }
    // get the newly created filter
    this._filters[this._filters.length - 1].add(element)
  }

  /**
   * Return True if the element has been found, false otherwise.
   * Check until we found the value in a filter otherwise stop on the first value found.
   * @param element
   * @returns
   */
  public has(element: HashableInput) {
    return this._filters.some(filter => filter.has(element))
  }

  /**
   * Return the current capacity (number of elements) of this filter
   * @returns
   */
  public capacity(): number {
    return this._filters.map(f => f._capacity).reduce((p, c) => p + c, 0)
  }

  /**
   * Return the current false positive rate of this structure
   * @returns
   */
  public rate(): number {
    return this._filters[this._filters.length - 1].rate()
  }

  /**
   * Check if two ScalableBloomFilter are equal
   * @param filter
   * @returns
   */
  public equals(filter: ScalableBloomFilter) {
    // assert the seed, the ratio and the capacity are equals
    if (
      this.seed !== filter.seed ||
      this._ratio !== filter._ratio ||
      this.capacity() !== filter.capacity()
    ) {
      return false
    }
    return this._filters.every((currentFilter: PartitionBloomFilter, index) =>
      filter._filters[index].equals(currentFilter)
    )
  }

  /**
   * Create a Scalable Bloom Filter based on Partitionned Bloom Filter.
   * @param _size the starting size of the filter
   * @param _error_rate ther error rate desired of the filter
   * @param _ratio the load factor desired
   * @returns
   */
  public static create(_size: number, _error_rate: number, _ratio = 0.5) {
    return new ScalableBloomFilter(_size, _error_rate, _ratio)
  }
}
