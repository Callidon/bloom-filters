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
import { AutoExportable, Field, Parameter } from '../exportable'
import { sortedIndexBy } from 'lodash'

/**
 * An element in a MinHeap
 * @author Thomas Minier
 */
interface HeapElement {
  value: string,
  frequency: number
}

/**
 * A Minheap stores items sorted by ascending frequency
 * @author Thomas Minier
 */
class MinHeap {
  private _content: HeapElement[]

  constructor () {
    this._content = []
  }

  /**
   * Get the number of items in the heap
   */
  get length () {
    return this._content.length
  }

  get content () {
    return this._content
  }

  set content (value: HeapElement[]) {
    this._content = value
  }

  /**
   * Access an item at a given index
   * @param index - Index of the item
   * @return The item or `undefined` if the index is out of the array
   */
  get (index: number): HeapElement | undefined {
    return this._content[index]
  }

  /**
   * Add a new element to the heap and keep items sorted by ascending frequency
   * @param element - Element to insert
   */
  add (element: HeapElement) {
    // kepp items sorted by frequency
    const index = sortedIndexBy(this._content, element, heapElement => heapElement.frequency)
    this._content.splice(index, 0, element)
  }

  /**
   * Remove an item at a given index and keep items sorted by ascending frequency
   * @param index - Index of the item to remove
   */
  remove (index: number): void {
    this._content.splice(index, 1)
  }

  /**
   * Remove and returns the element with the smallest frequency in the heap
   * @return The element with the smallest frequency in the heap 
   */
  popMin (): HeapElement | undefined {
    return this._content.shift()
  }
  
  /**
   * Get the index of an element by its value
   * @param value - Value of the element to search for
   * @return Index of the element or -1 if it is not in the heap
   */
  indexOf (value: string): number {
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
  clear () {
    this._content = []
  }
}

/**
 * A TopK uses a Count-Min Sketch to calculate the top-K frequent elements in a stream.
 * @author Thomas Minier
 */
@AutoExportable('TopK', ['_seed'])
export default class TopK extends BaseFilter {
  @Field()
  private _k: number

  @Field()
  private _errorRate: number

  @Field()
  private _accuracy: number

  @Field()
  private _sketch: CountMinSketch

  @Field<MinHeap>((heap: MinHeap) => heap.content, (json: any) => {
    const heap = new MinHeap()
    heap.content = json
    return heap
  })
  private _heap: MinHeap

  /**
   * Constructor
   * @param k - How many elements to store
   * @param errorRate - The error rate
   * @param accuracy  - The probability of accuracy
   */
  constructor (@Parameter('_k') k: number, @Parameter('_errorRate') errorRate: number, @Parameter('_accuracy') accuracy: number) {
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
  add (element: string): void {
    this._sketch.update(element)
    const frequency = this._sketch.count(element)

    if (this._heap.length < this._k || frequency >= this._heap.get(0)!.frequency) {
      const index = this._heap.indexOf(element)
      // remove the entry if it is already in the MinHeap
      if (index > -1) {
        this._heap.remove(index)
      }
      // add the new entry
      this._heap.add({
        value: element,
        frequency
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
  clear (): void {
    this._sketch = CountMinSketch.create(this._errorRate, this._accuracy)
    this._heap.clear()
  }

  /**
   * Get the top-k values as an array of object {value: string, frequency: number}
   * @return The top-k values as an array of object {value: string, frequency: number}
   */
  values (): HeapElement[] {
    const res = []
    for (let i = this._heap.length - 1; i > 0; i--) {
      res.push(this._heap.get(i)!)
    }
    return res
  }
  
  /**
   * Get the top-k values as an iterator of object {value: string, frequency: number}.
   * WARNING: With this method, values are produced on-the-fly, hence you should not modify the TopK
   * while the iteration is not done, otherwise the generated values may not respect the TopK properties.
   * @return The top-k values as an iterator of object {value: string, frequency: number}
   */
  iterator (): Iterator<HeapElement> {
    const heap = this._heap
    return function *() {
      for (let i = heap.length - 1; i > 0; i--) {
        yield heap.get(i)!
      }
    }()
  }
}
