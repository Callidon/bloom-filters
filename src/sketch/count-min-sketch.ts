import BaseFilter from '../base-filter'
import CountingFilter from '../interfaces/counting-filter'
import {allocateArray, HashableInput} from '../utils'

export type ExportedCountMinSketch = {
  _seed: number
  _columns: number
  _rows: number
  _matrix: number[][]
  _allSums: number
}

/**
 * The count–min sketch (CM sketch) is a probabilistic data structure that serves as a frequency table of events in a stream of data.
 * It uses hash functions to map events to frequencies, but unlike a hash table uses only sub-linear space, at the expense of overcounting some events due to collisions.
 *
 * Reference: Cormode, G., & Muthukrishnan, S. (2005). An improved data stream summary: the count-min sketch and its applications. Journal of Algorithms, 55(1), 58-75.
 * @see {@link http://vaffanculo.twiki.di.uniroma1.it/pub/Ing_algo/WebHome/p14_Cormode_JAl_05.pdf} for more details on Count Min Sketch
 * @extends Exportable
 * @author Thomas Minier & Arnaud Grall
 */
export default class CountMinSketch
  extends BaseFilter
  implements CountingFilter<HashableInput>
{
  public _columns: number
  public _rows: number
  public _matrix: Array<Array<number>>
  public _allSums: number

  /**
   * Constructor
   * @param columns - Number of columns
   * @param rows - Number of rows
   */
  constructor(columns: number, rows: number) {
    super()
    this._columns = columns
    this._rows = rows
    this._matrix = allocateArray(this._rows, () =>
      allocateArray(this._columns, 0)
    )
    this._allSums = 0
  }

  /**
   * Create a count-min sketch, with a target error rate and probability of accuracy
   * @param  errorRate - The error rate
   * @param  accuracy  - The probability of accuracy
   * @return A new Count Min Sketch optimal for the input parameters
   */
  public static create(errorRate: number, accuracy = 0.999): CountMinSketch {
    // columns = Math.ceil(Math.E / epsilon) and rows = Math.ceil(Math.log(1 / delta))
    const columns = Math.ceil(Math.E / errorRate)
    const rows = Math.ceil(Math.log(1 / accuracy))
    return new CountMinSketch(columns, rows)
  }

  /**
   * Create a Count Min Sketch from a set of items, with a target error rate and probability of accuracy
   * @param items - An iterable to yield items to be inserted into the filter
   * @param  errorRate - The error rate
   * @param  accuracy  - The probability of accuracy
   * @return A new Count Min Sketch filled with the iterable's items.
   */
  public static from(
    items: Iterable<HashableInput>,
    errorRate: number,
    accuracy = 0.999
  ): CountMinSketch {
    const filter = CountMinSketch.create(errorRate, accuracy)
    for (const item of items) {
      filter.update(item)
    }
    return filter
  }

  /**
   * Return the number of columns in the sketch
   */
  public get columns(): number {
    return this._columns
  }

  /**
   * Return the number of rows in the sketch
   */
  public get rows(): number {
    return this._rows
  }

  /**
   * Get the sum of all counts in the sketch
   */
  public get sum(): number {
    return this._allSums
  }

  /**
   * Update the count min sketch with a new occurrence of an element
   * @param element - The new element
   * @param count - Number of occurences of the elemnt (defauls to one)
   */
  public update(element: HashableInput, count = 1): void {
    this._allSums += count
    const indexes = this._hashing.getIndexes(
      element,
      this._columns,
      this._rows,
      this.seed
    )
    for (let i = 0; i < this._rows; i++) {
      this._matrix[i][indexes[i]] += count
    }
  }

  /**
   * Perform a point query: estimate the number of occurence of an element
   * @param element - The element we want to count
   * @return The estimate number of occurence of the element
   */
  public count(element: HashableInput): number {
    let min = Infinity
    const indexes = this._hashing.getIndexes(
      element,
      this._columns,
      this._rows,
      this.seed
    )
    for (let i = 0; i < this._rows; i++) {
      const v = this._matrix[i][indexes[i]]
      min = Math.min(v, min)
    }
    return min
  }

  /**
   * Check if another Count Min Sketch is equal to this one
   * @param  other - The filter to compare to this one
   * @return True if they are equal, false otherwise
   */
  public equals(other: CountMinSketch): boolean {
    if (this._columns !== other._columns || this._rows !== other._rows) {
      return false
    }
    for (let i = 0; i < this._rows; i++) {
      for (let j = 0; j < this._columns; j++) {
        if (this._matrix[i][j] !== other._matrix[i][j]) {
          return false
        }
      }
    }
    return true
  }

  /**
   * Merge (in place) this sketch with another sketch, if they have the same number of columns and rows.
   * @param sketch - The sketch to merge with
   */
  public merge(sketch: CountMinSketch): void {
    if (this._columns !== sketch._columns) {
      throw new Error(
        'Cannot merge two sketches with different number of columns'
      )
    }
    if (this._rows !== sketch._rows) {
      throw new Error('Cannot merge two sketches with different number of rows')
    }

    for (let i = 0; i < this._rows; i++) {
      for (let j = 0; j < this._columns; j++) {
        this._matrix[i][j] += sketch._matrix[i][j]
      }
    }
  }

  /**
   * Clone the sketch
   * @return A new cloned sketch
   */
  public clone(): CountMinSketch {
    const sketch = new CountMinSketch(this._columns, this._rows)
    sketch.merge(this)
    sketch.seed = this.seed
    return sketch
  }

  public saveAsJSON(): ExportedCountMinSketch {
    return {
      _allSums: this._allSums,
      _matrix: this._matrix,
      _rows: this._rows,
      _columns: this._columns,
      _seed: this._seed,
    }
  }

  public static fromJSON(element: ExportedCountMinSketch): CountMinSketch {
    const filter = new CountMinSketch(element._columns, element._rows)
    filter.seed = element._seed
    filter._matrix = element._matrix
    filter._allSums = element._allSums
    return filter
  }
}
