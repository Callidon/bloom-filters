/* file: topk.ts
MIT License

Copyright (c) 2019-2020 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import BaseFilter from '../base-filter'
import CountMinSketch from './count-min-sketch'
import {AutoExportable, Field, Parameter} from '../exportable'
import {sortedIndexBy} from 'lodash'

/**
 * An element in a MinHeap
 * @author Thomas Minier
 */
interface HeapElement {
  value: string
  frequency: number
}

/**
 * An element in a TopK
 * @author Thomas Minier
 */
interface TopkElement extends HeapElement {
  rank: number
}

/**
 * A MinHeap stores items sorted by ascending frequency
 * @author Thomas Minier
 */
class MinHeap {
  public _content: HeapElement[]

  constructor() {
    this._content = []
  }

  /**
   * Get the number of items in the heap
   */
  public get length() {
    return this._content.length
  }

  public get content() {
    return this._content
  }

  public set content(value: HeapElement[]) {
    this._content = value
  }

  /**
   * Access an item at a given index
   * @param index - Index of the item
   * @return The item or `undefined` if the index is out of the array
   */
  public get(index: number): HeapElement | undefined {
    return this._content[index]
  }

  /**
   * Add a new element to the heap and keep items sorted by ascending frequency
   * @param element - Element to insert
   */
  public add(element: HeapElement) {
    // kepp items sorted by frequency
    const index = sortedIndexBy(
      this._content,
      element,
      heapElement => heapElement.frequency
    )
    this._content.splice(index, 0, element)
  }

  /**
   * Remove an item at a given index and keep items sorted by ascending frequency
   * @param index - Index of the item to remove
   */
  public remove(index: number): void {
    this._content.splice(index, 1)
  }

  /**
   * Remove and returns the element with the smallest frequency in the heap
   * @return The element with the smallest frequency in the heap
   */
  public popMin(): HeapElement | undefined {
    return this._content.shift()
  }

  /**
   * Get the index of an element by its value
   * @param value - Value of the element to search for
   * @return Index of the element or -1 if it is not in the heap
   */
  public indexOf(value: string): number {
    // TODO optimize
    return this._content.findIndex(heapElement => heapElement.value === value)
    // const index = sortedIndexBy(this._content, {value, frequency: 0}, heapElement => heapElement.value)
    // if (this._content[index] !== undefined && this._content[index].value === value) {
    //   return index
    // }
    // return -1
  }

  /**
   * Clear the content of the heap
   */
  public clear() {
    this._content = []
  }
}

/**
 * A TopK computes the ranking of elements in a multiset (by an arbitrary score) and returns the `k` results with the highest scores.
 * This implementation of the TopK problem sorts items based on their estimated cardinality in the multiset.
 * It is based on a Count Min Sketch, for estimating the cardinality of items, and a MinHeap, for implementing a sliding window over the `k` results with the highest scores.
 * @author Thomas Minier
 * @author Arnaud Grall
 */
@AutoExportable('TopK', ['_seed'])
export default class TopK extends BaseFilter {
  @Field()
  public _k: number

  @Field()
  public _errorRate: number

  @Field()
  public _accuracy: number

  @Field<CountMinSketch>(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    (sketch: CountMinSketch) => sketch.saveAsJSON(),
    (json: JSON) => CountMinSketch.fromJSON(json) as CountMinSketch
  )
  public _sketch: CountMinSketch

  @Field<MinHeap>(
    (heap: MinHeap) => heap.content,
    (json: HeapElement[]) => {
      const heap = new MinHeap()
      heap.content = json
      return heap
    }
  )
  public _heap: MinHeap

  /**
   * Constructor
   * @param k - How many elements to store
   * @param errorRate - The error rate
   * @param accuracy  - The probability of accuracy
   */
  constructor(
    @Parameter('_k') k: number,
    @Parameter('_errorRate') errorRate: number,
    @Parameter('_accuracy') accuracy: number
  ) {
    super()
    this._k = k
    this._errorRate = errorRate
    this._accuracy = accuracy
    this._sketch = CountMinSketch.create(errorRate, accuracy)
    this._heap = new MinHeap()
  }

  /**
   * Add an element to the TopK
   * @param element - Element to add
   */
  public add(element: string, count = 1): void {
    if (0 >= count) {
      throw `count must be > 0 (was ${count})`
    }
    this._sketch.update(element, count)
    const frequency = this._sketch.count(element)

    if (
      this._heap.length < this._k ||
      frequency >= this._heap.get(0)!.frequency // eslint-disable-line @typescript-eslint/no-non-null-assertion
    ) {
      const index = this._heap.indexOf(element)
      // remove the entry if it is already in the MinHeap
      if (index > -1) {
        this._heap.remove(index)
      }
      // add the new entry
      this._heap.add({
        value: element,
        frequency,
      })
      // if there is more items than K, then remove the smallest item in the heap
      if (this._heap.length > this._k) {
        this._heap.popMin()
      }
    }
  }

  /**
   * Clear the content of the TopK
   */
  public clear(): void {
    this._sketch = CountMinSketch.create(this._errorRate, this._accuracy)
    this._heap.clear()
  }

  /**
   * Get the top-k values as an array of objects {value: string, frequency: number, rank: number}
   * @return The top-k values as an array of objects {value: string, frequency: number, rank: number}
   */
  public values(): TopkElement[] {
    const res = []
    for (let i = this._heap.length - 1; i >= 0; i--) {
      const elt = this._heap.get(i)! // eslint-disable-line @typescript-eslint/no-non-null-assertion
      res.push({
        value: elt.value,
        frequency: elt.frequency,
        rank: this._heap.length - i,
      })
    }
    return res
  }

  /**
   * Get the top-k values as an iterator that yields objects {value: string, frequency: number, rank: number}.
   * WARNING: With this method, values are produced on-the-fly, hence you should not modify the TopK
   * while the iteration is not completed, otherwise the generated values may not respect the TopK properties.
   * @return The top-k values as an iterator of object {value: string, frequency: number, rank: number}
   */
  public iterator(): Iterator<TopkElement> {
    const heap = this._heap
    return (function* () {
      for (let i = heap.length - 1; i >= 0; i--) {
        const elt = heap.get(i)! // eslint-disable-line @typescript-eslint/no-non-null-assertion
        yield {
          value: elt.value,
          frequency: elt.frequency,
          rank: heap.length - i,
        }
      }
    })()
  }
}
